import client from './client'
import type { Announcement, PaginatedResponse } from '@/types'

/** 发布/编辑公告的请求体（创建、编辑共用；后端校验 title 1-100、content 1-450） */
export interface AnnouncementPayload {
  title: string
  content: string
}

/**
 * 发布公告 POST /announcements（仅管理员）
 * 发布只写源表，用户拉取通知时按需物化到自己的通知列表。
 */
export const createAnnouncement = async (payload: AnnouncementPayload): Promise<Announcement> => {
  return client.post('/announcements', payload)
}

/**
 * 公告列表 GET /announcements?page=&pageSize=（仅管理员）
 */
export const getAnnouncements = async (
  page = 1,
  pageSize = 10
): Promise<PaginatedResponse<Announcement>> => {
  return client.get('/announcements', { params: { page, pageSize } })
}

/**
 * 编辑公告 PUT /announcements/{id}（仅管理员）
 * 会同步更新已物化到用户通知表的副本 title/content。
 */
export const updateAnnouncement = async (
  id: number,
  payload: AnnouncementPayload
): Promise<void> => {
  await client.put(`/announcements/${id}`, payload)
}

/**
 * 删除公告 DELETE /announcements/{id}（仅管理员）
 * 级联删除已物化的副本；未物化用户下次拉取时不再补齐。
 */
export const deleteAnnouncement = async (id: number): Promise<void> => {
  await client.delete(`/announcements/${id}`)
}
