import client from './client'
import type { PaginatedResponse } from '@/types'

/**
 * 私信接口（前缀 /api/messages）
 *
 * 后端接口实现状态：
 *  - 会话列表 / 获取或创建会话 / 会话消息列表 / 发送私信：已实现
 *  - 标记会话已读 / 删除会话 / 全局未读数：后端 Controller 暂 return null，未实现，
 *    对应方法已声明但标注 TODO，待后端补齐后再启用。
 */

/** 会话中的对方用户（不含邮箱等敏感字段） */
export interface PeerUser {
  id: number
  username: string
  nickname: string
  avatar: string
}

/** 会话列表项（接口 1 返回） */
export interface Conversation {
  id: number
  peerUser: PeerUser
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

/** 单条私信消息（接口 3 返回） */
export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  receiverId: number
  senderNickname: string
  senderAvatar: string
  content: string
  /** 0=未读 1=已读（后端 Short） */
  isRead: number
  readAt: string | null
  createdAt: string
}

/** 发送私信请求体 */
export interface SendMessagePayload {
  receiverId: number
  content: string
}

/**
 * 我的会话列表（接口 1）
 * GET /messages/conversations?page=&pageSize=
 */
export const getConversations = async (
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Conversation>> => {
  return (await client.get('/messages/conversations', {
    params: { page, pageSize },
  })) as PaginatedResponse<Conversation>
}

/**
 * 获取或创建与某用户的会话（接口 2）
 * GET /messages/conversations/with/{userId}
 * 用于「发起私信」入口：点击用户头像旁的「私信」按钮，带 ?userId= 进入页面时调用。
 */
export const getOrCreateConversation = async (userId: number): Promise<Conversation> => {
  return (await client.get(`/messages/conversations/with/${userId}`)) as Conversation
}

/**
 * 会话中的消息列表（接口 3）
 * GET /messages/conversations/{conversationId}/messages?page=&pageSize=
 * 后端按时间倒序返回，前端展示时 reverse 成正序（最新在底部）。
 */
export const getConversationMessages = async (
  conversationId: number,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<ChatMessage>> => {
  return (await client.get(`/messages/conversations/${conversationId}/messages`, {
    params: { page, pageSize },
  })) as PaginatedResponse<ChatMessage>
}

/**
 * 发送私信（接口 4）
 * POST /messages  body: { receiverId, content }
 * 返回刚发送的那条消息。
 */
export const sendMessage = async (payload: SendMessagePayload): Promise<ChatMessage> => {
  return (await client.post('/messages', payload)) as ChatMessage
}

// ---- 以下接口后端 Controller 暂未实现（return null），待补齐后启用 ----

/**
 * 标记会话已读（接口 5）
 * PUT /messages/conversations/{conversationId}/read
 * TODO: 后端未实现，暂不调用——选中会话时未读角标不会清零。
 */
export const markConversationRead = async (conversationId: number): Promise<void> => {
  await client.put(`/messages/conversations/${conversationId}/read`)
}

/**
 * 删除会话（对自己隐藏）（接口 6）
 * DELETE /messages/conversations/{conversationId}
 * TODO: 后端未实现。
 */
export const deleteConversation = async (conversationId: number): Promise<void> => {
  await client.delete(`/messages/conversations/${conversationId}`)
}

/**
 * 全局未读私信数（接口 7）
 * GET /messages/unread-count
 * TODO: 后端未实现；Header 铃铛私信角标暂沿用 notifStore.byType.message。
 */
export const getUnreadMessageCount = async (): Promise<number> => {
  const data = (await client.get('/messages/unread-count')) as { count?: number } | null
  return data?.count ?? 0
}
