import client from './client'
import type { User } from '@/types'

/**
 * 关注关系接口（前缀 /api/follows）
 *
 * 注意：后端 `followed` 字段当前返回的是字符串 "true"/"false"（非布尔），
 * 这里统一归一化成 boolean，调用方无需关心。
 */
function toFlag(value: unknown): boolean {
  return value === true || value === 'true'
}

/**
 * 关注用户
 * POST /follows/{userId}
 * @returns 操作后的关注状态（true）
 */
export const followUser = async (userId: number): Promise<boolean> => {
  const data = (await client.post(`/follows/${userId}`)) as { followed?: unknown }
  return toFlag(data?.followed)
}

/**
 * 取消关注
 * DELETE /follows/{userId}
 * @returns 操作后的关注状态（false）
 */
export const unfollowUser = async (userId: number): Promise<boolean> => {
  const data = (await client.delete(`/follows/${userId}`)) as { followed?: unknown }
  return toFlag(data?.followed)
}

/**
 * 查询当前登录用户是否已关注某人（详情页「关注」按钮初始态）
 * GET /follows/{userId}/status
 */
export const getFollowStatus = async (userId: number): Promise<boolean> => {
  const data = (await client.get(`/follows/${userId}/status`)) as { followed?: unknown }
  return toFlag(data?.followed)
}

/**
 * 我关注的用户列表
 * GET /follows/mine
 * 仅含 id/username/nickname/avatar/bio/createdAt（无邮箱等敏感字段）
 */
export const getFollowing = async (): Promise<User[]> => {
  return client.get('/follows/mine')
}
