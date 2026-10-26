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

// 进行中的刷新 Promise（全应用单例）：同一时刻只发一次 /auth/refresh，
// 并发调用复用同一个 Promise，避免 refresh token 轮换策略下「多个并发刷新
// 互相把对方手里的 token 轮换掉」（详见 P2 笔记）。axios 响应拦截器与
// streamAiChat 的裸 fetch 共用这一把锁。
let refreshPromise: Promise<string> | null = null

// 刷新期间挂起的【axios】请求队列，刷新成功后统一用新 token 重试。
// streamAiChat 走裸 fetch，不进此队列——它自己 await refreshAccessToken()。
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

/**
 * 实际发起一次 /auth/refresh（走 client 让 mock 拦截器也能覆盖到）。
 * 走 httpOnly cookie，不携带 accessToken；成功后存新 token 并返回。
 * 失败（refresh token 也无效）时，响应拦截器的 `/auth/refresh` 分支会 forceLogout，
 * 这里只需把错误向上抛。
 */
async function doRefresh(): Promise<string> {
  const res = await client.post('/auth/refresh', null, { withCredentials: true }) as unknown as AuthResponse
  setAccessToken(res.accessToken)
  return res.accessToken
}

/**
 * 全应用共享的「刷新并拿新 accessToken」入口（单例去重）。
 * 进行中只发一次，并发调用拿到同一个 Promise → 同一把新 token，
 * 杜绝并发刷新撞 refresh token 轮换。供 axios 响应拦截器与 streamAiChat 共用。
 *
 * 队列释放也在这里做：无论刷新由谁发起（axios 拦截器还是 streamAiChat 裸 fetch），
 * 成功后都要把刷新期间挂起的 axios 请求统一用新 token 重试，否则会永久挂起。
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh()
    .then((token) => {
      // 刷新成功：释放挂起的 axios 请求队列，统一用新 token 重试
      pendingQueue.forEach(({ resolve }) => resolve(token))
      pendingQueue = []
      return token
    })
    .catch((err) => {
      // 刷新失败：拒绝挂起队列（forceLogout 已由响应拦截器的 /auth/refresh 分支处理）
      pendingQueue.forEach(({ reject }) => reject(err))
      pendingQueue = []
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
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

    // 只有业务码 401001（accessToken 过期）才发起静默刷新；
    // 其余 401（401002 已吊销/被顶、401003 缺失、401005 在其他设备登录…）
    // 刷新救不回来——被顶设备拿着已吊销的 refreshToken 刷新只会白跑一趟，
    // 直接强制登出。这同时是单会话「顶掉旧会话」的前端收敛点。
    const body = error.response?.data as { code?: number; message?: string } | undefined
    const code = typeof body?.code === 'number' ? body.code : undefined
    if (code !== 401001) {
      forceLogout(
        code === 401005
          ? '账号已在其他设备登录，请重新登录'
          : body?.message || '登录已失效，请重新登录'
      )
      return Promise.reject(error.response?.data || error.message)
    }

    // 已经重试过一次仍是 401001 → 刚换的新 token 也过期（异常场景，如系统时间错乱），
    // 必须拦在这里，否则「刷新→重试→再刷新」会无限循环。
    if (config._retry) {
      forceLogout('登录状态已失效，请重新登录')
      return Promise.reject(error)
    }

    // 已有刷新在进行（全应用共享单例）→ 挂起当前请求，刷新成功后由
    // refreshAccessToken 内部统一用新 token 重试，失败则 reject
    if (refreshPromise) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token: string) => resolve(retryWithToken(config, token)),
          reject,
        })
      })
    }

    // 发起刷新（streamAiChat 裸 fetch 与本拦截器共用 refreshAccessToken 单例）。
    // 队列释放已在 refreshAccessToken 内部处理，这里只负责重试当前请求。
    try {
      const newToken = await refreshAccessToken()
      return retryWithToken(config, newToken)
    } catch (refreshError) {
      // doRefresh 走 client.post('/auth/refresh')，失败时响应拦截器的
      // /auth/refresh 分支已 forceLogout，这里不再重复跳转，仅向上抛错
      return Promise.reject(refreshError)
    }
  }
)

export default client
