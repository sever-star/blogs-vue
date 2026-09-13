import client from './client'
import type { Tag, PageQuery, PaginatedResponse } from '@/types'

export type { Tag, PageQuery, PaginatedResponse }

/** 标签请求体 */
export interface TagPayload {
  name: string
}

/**
 * 创建标签
 * POST /tags
 */
export const createTag = async (payload: TagPayload): Promise<Tag> => {
  return client.post('/tags', payload)
}

/**
 * 获取所有标签
 * GET /tags
 *
 * 返回全量数组，供选择器（标签下拉）使用。管理表格分页请用 getTagsPaged。
 */
export const getTags = async (): Promise<Tag[]> => {
  return client.get('/tags')
}

/**
 * 分页获取标签（支持 keyword 模糊搜索）
 * GET /tags/page?page=&pageSize=&keyword=
 *
 * 与 getTags 拆分为独立 endpoint：本接口固定返回
 * PaginatedResponse<Tag>，管理表格使用；全量列表请用 getTags。
 */
export const getTagsPaged = async (
  params: PageQuery & { keyword?: string }
): Promise<PaginatedResponse<Tag>> => {
  return client.get('/tags/page', { params })
}

/**
 * 获取单个标签
 * GET /tags/{id}
 */
export const getTagById = async (id: number): Promise<Tag> => {
  return client.get(`/tags/${id}`)
}

/**
 * 更新标签
 * PUT /tags/{id}
 */
export const updateTag = async (id: number, payload: TagPayload): Promise<Tag> => {
  return client.put(`/tags/${id}`, payload)
}

/**
 * 删除标签
 * DELETE /tags/{id}
 */
export const deleteTag = async (id: number): Promise<void> => {
  await client.delete(`/tags/${id}`)
}