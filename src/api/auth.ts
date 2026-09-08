import client from './client'
import type { User, AuthResponse } from '@/types'

export type { AuthResponse }

/** 注册请求参数 */
export interface RegisterParams {
  username: string
  email: string
  password: string
  /** 自动生成的头像 URL（后端可保存） */
  avatar?: string
  /** 昵称，默认与用户名一致 */
  nickname?: string
}

/**
 * 用户登录
 * POST /auth/login
 * 带 withCredentials：登录响应会 Set-Cookie 写入 refreshToken（httpOnly），
 * 跨域时需此标记浏览器才会接收并保存 cookie。
 */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  return client.post('/auth/login', { username, password }, { withCredentials: true })
}

/**
 * 用户注册
 * POST /auth/register
 */
export const register = async (params: RegisterParams): Promise<AuthResponse> => {
  return client.post('/auth/register', params, { withCredentials: true })
}

/**
 * 获取当前用户信息
 * GET /auth/me
 */
export const getCurrentUser = async (): Promise<User> => {
  return client.get('/auth/me')
}

/** 可更新的用户资料字段 */
export interface UpdateProfileParams {
  nickname?: string
  avatar?: string
  bio?: string
  website?: string
  github?: string
  weibo?: string
}

/**
 * 更新当前用户资料
 * PUT /auth/me
 */
export const updateProfile = async (params: UpdateProfileParams): Promise<User> => {
  return client.put('/auth/me', params)
}

/**
 * 刷新 accessToken
 * POST /auth/refresh
 *
 * refreshToken 存在 httpOnly cookie 里，由浏览器自动附带。
 * 必须带 withCredentials，否则同源之外的请求不会携带 cookie。
 * 后端在 accessToken 过期时返回 HTTP 401 + body `{ code: 401001 }`，
 * 由 client.ts 拦截并调用本接口无感刷新。
 */
export const refreshToken = async (): Promise<AuthResponse> => {
  return client.post('/auth/refresh', null, { withCredentials: true })
}

/**
 * 用户登出
 * POST /auth/logout
 * 带 withCredentials，让后端清除 refreshToken cookie 并失效对应记录。
 */
export const logout = async (): Promise<void> => {
  await client.post('/auth/logout', null, { withCredentials: true })
}
