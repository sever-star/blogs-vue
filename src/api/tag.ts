import client from './client'
import type { Tag } from '@/types'

export type { Tag }

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
 */
export const getTags = async (): Promise<Tag[]> => {
  return client.get('/tags')
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