import client from './client'
import type { Notification, PaginatedResponse } from '@/types'

/**
 * 通知列表（分页，可只看未读）
 * GET /notifications?page=&pageSize=&onlyUnread=
 */
export const getNotifications = async (
  page = 1,
  pageSize = 50,
  onlyUnread = false
): Promise<PaginatedResponse<Notification>> => {
  return client.get('/notifications', { params: { page, pageSize, onlyUnread } })
}

/** 未读数 GET /notifications/unread-count */
export const getUnreadCount = async (): Promise<{ count: number }> => {
  return client.get('/notifications/unread-count')
}

/** 标记单条已读 PUT /notifications/{id}/read */
export const markNotificationRead = async (id: number): Promise<void> => {
  await client.put(`/notifications/${id}/read`)
}

/** 全部标记已读 PUT /notifications/read-all */
export const markAllNotificationsRead = async (): Promise<void> => {
  await client.put('/notifications/read-all')
}
