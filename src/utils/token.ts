/**
 * accessToken 存储工具
 *
 * 双 token 机制：
 * - accessToken：短有效期，存 localStorage（前端可读，用于请求头注入）
 * - refreshToken：长有效期，存 httpOnly cookie（后端 Set-Cookie，前端 JS 不可读）
 *
 * 前端不记录 accessToken 的过期时间——后端在 accessToken 过期时返回
 * HTTP 401 + body `{ code: 401001 }`，由 client.ts 拦截并触发无感刷新（被动刷新）。
 *
 * 此文件统一管理 accessToken 的读写，避免在 auth.ts / client.ts 中散落裸 localStorage 调用。
 */

const ACCESS_KEY = 'accessToken'

/** 读取当前 accessToken */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

/** 写入 accessToken */
export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_KEY, token)
}

/** 清除 accessToken */
export function removeAccessToken(): void {
  localStorage.removeItem(ACCESS_KEY)
}
