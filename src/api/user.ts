import client from './client'
import type { User, PageQuery, PaginatedResponse } from '@/types'

export type { User, PageQuery, PaginatedResponse }

/** 用户角色 */
export type UserRole = 'ADMIN' | 'USER'

/**
 * 分页获取用户列表（仅管理员，支持 keyword 模糊搜索用户名/昵称/邮箱）
 * GET /users?page=&pageSize=&keyword=
 */
export const getUsersPaged = async (
  params: PageQuery & { keyword?: string }
): Promise<PaginatedResponse<User>> => {
  return client.get('/users', { params })
}

/**
 * 修改用户角色（仅管理员）
 * PUT /users/{id}/role
 */
export const updateUserRole = async (
  id: number,
  role: UserRole
): Promise<User> => {
  return client.put(`/users/${id}/role`, { role })
}

/**
 * 启用/禁用用户（仅管理员，status：1=正常 0=禁用）
 * PUT /users/{id}/status
 */
export const updateUserStatus = async (
  id: number,
  status: 0 | 1
): Promise<User> => {
  return client.put(`/users/${id}/status`, { status })
}
