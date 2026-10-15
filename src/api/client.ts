import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthResponse } from '@/types'
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from '@/utils/token'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8081/api')

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ---- Mock 拦截器（仅 VITE_USE_MOCK=true 时启用） ----
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  import('./mock').then(({ matchMock }) => {
    client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const mockResponse = matchMock(
        config.method?.toUpperCase() || 'GET',
        config.url || '',
        config.data,
        config.params as Record<string, unknown> | undefined
      )
      if (mockResponse) {
        config.adapter = () =>
          Promise.resolve({
            data: mockResponse.data,
            status: mockResponse.status,
            statusText: mockResponse.statusText || 'OK',
            headers: mockResponse.headers || {},
            config,
          })
      }
      return config
    })
  })
}

// ---- 请求拦截器：Token 注入 ----
client.interceptors.request.use(
  (config) => {
    // 刷新请求靠 httpOnly cookie，不应携带（可能已过期的）accessToken
    if (config.url !== '/auth/refresh') {
      const token = getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ---- 静默刷新（双 token 机制） ----

// 是否正在刷新（避免并发请求同时触发多次刷新）
let isRefreshing = false
// 刷新期间挂起的请求队列，刷新成功后统一用新 token 重试
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

/**
 * 用新 token 重试一个请求（标记 _retry 避免再次失败时死循环）。
 * 刷新请求走 client（而非裸 axios），这样 mock 拦截器也能覆盖到。
 * 失败时（refresh token 无效）会再次进入响应拦截器，靠 `config.url === '/auth/refresh'`
 * 分支识别并强制登出，避免死循环。
 */
async function refreshAccessToken(): Promise<AuthResponse> {
  return client.post('/auth/refresh', null, { withCredentials: true })
}

function retryWithToken(config: RetryableConfig, token: string) {
  config._retry = true
  config.headers.Authorization = `Bearer ${token}`
  return client(config)
}

function forceLogout(reason?: string) {
  removeAccessToken()
  // 标记「需要重新登录」，全量刷新回首页后由 auth store 初始化时自动弹出登录框
  sessionStorage.setItem('auth:require-login', '1')
  // 整页跳转会冲掉即时 toast，故把原因暂存到 sessionStorage，由 auth store 在 reload 后弹出
  if (reason) sessionStorage.setItem('auth:logout-reason', reason)
  window.location.href = '/'
}

// ---- 响应拦截器：统一解包 + 401 静默刷新 ----
client.interceptors.response.use(
  (response) => {
    const body = response.data

    // 标准 { code, message, data } 格式
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0 || body.code === 200) {
        return body.data
      }
      return Promise.reject({
        code: body.code,
        message: body.message || '请求失败',
        data: body.data,
      })
    }

    // 直接返回数据（无 code 包装）
    return body
  },
  async (error: AxiosError) => {
    const status = error.response?.status
    const config = error.config as RetryableConfig | undefined

    // 后端在 accessToken 过期时返回 HTTP 401 + body `{ code: 401001 }`。
    // 这里以 HTTP 401 为刷新触发信号（不强制校验 code），
    // 刷新失败或重试后仍 401 再强制登出，保证「未登录/无 cookie」也能正确收敛。
    if (status !== 401 || !config) {
      return Promise.reject(error.response?.data || error.message)
    }

    // /auth/login、/auth/register 的 401 是「用户名或密码错误」这类业务失败，
    // 不是 accessToken 过期。若落入下面的刷新分支：刷新失败 → forceLogout 整页刷新，
    // 登录弹窗和失败提示会被一起刷掉（表现为「登录失败没有任何提示」）。
    if (config.url === '/auth/login' || config.url === '/auth/register') {
      return Promise.reject(error.response?.data || error.message)
    }

    // 刷新请求本身失败 → refresh token 也无效/过期，强制登出
    if (config.url === '/auth/refresh') {
      forceLogout('登录已过期，请重新登录')
      return Promise.reject(error)
    }

    // 已经重试过一次仍 401 → 新 token 也被拒。
    // 这条路径几乎只在「账号被禁用」时出现：refresh 接口不查状态会成功发新 token，
    // 但过滤器按 status=0 拦掉重试请求 → 命中此分支。给一个明确的提示而非静默登出。
    if (config._retry) {
      forceLogout('账号已被禁用或登录状态已失效，请重新登录')
      return Promise.reject(error)
    }

    // 已有刷新在进行 → 挂起当前请求，等新 token 到了再重试
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => resolve(retryWithToken(config, token)),
          reject,
        })
      })
    }

    // 发起刷新
    isRefreshing = true
    try {
      const res = await refreshAccessToken()
      setAccessToken(res.accessToken)
      const newToken = res.accessToken

      // 释放挂起队列
      pendingQueue.forEach(({ resolve }) => resolve(newToken))
      pendingQueue = []
      isRefreshing = false

      // 重试当前请求
      return retryWithToken(config, newToken)
    } catch (refreshError) {
      pendingQueue.forEach(({ reject }) => reject(refreshError))
      pendingQueue = []
      isRefreshing = false
      forceLogout('登录已失效，请重新登录')
      return Promise.reject(refreshError)
    }
  }
)

export default client
