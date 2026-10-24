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

/** 未读数 GET /notifications/unread-count
 *  count：总未读数（铃铛徽标）；byType：按原始 type 分组的未读数（供 tab 角标聚合） */
export const getUnreadCount = async (): Promise<{ count: number; byType?: Record<string, number> }> => {
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

/**
 * 删除单条通知 DELETE /notifications/{id}
 * 仅能删自己；type='announcement' 会被后端拒绝（403，公告只能由管理员从源头删除）
 */
export const deleteNotification = async (id: number): Promise<void> => {
  await client.delete(`/notifications/${id}`)
}
