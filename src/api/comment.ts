import client from './client'
import type { Comment, CommentPayload, CommentQueryParams, PaginatedResponse } from '@/types'

export type { CommentPayload, CommentQueryParams }

/**
 * 获取文章评论列表（分页）
 * GET /posts/{articleId}/comments
 */
export const getComments = async (
  articleId: number,
  params?: CommentQueryParams
): Promise<PaginatedResponse<Comment>> => {
  return client.get(`/posts/${articleId}/comments`, { params })
}

/**
 * 获取单条评论详情
 * GET /posts/{articleId}/comments/{commentId}
 */
export const getCommentById = async (articleId: number, commentId: number): Promise<Comment> => {
  return client.get(`/posts/${articleId}/comments/${commentId}`)
}

/**
 * 发表评论
 * POST /posts/{articleId}/comments
 */
export const submitComment = async (
  articleId: number,
  payload: CommentPayload
): Promise<Comment> => {
  return client.post(`/posts/${articleId}/comments`, payload)
}

/**
 * 更新评论
 * PUT /posts/{articleId}/comments/{commentId}
 */
export const updateComment = async (
  articleId: number,
  commentId: number,
  content: string
): Promise<Comment> => {
  return client.put(`/posts/${articleId}/comments/${commentId}`, { content })
}

/**
 * 删除评论
 * DELETE /posts/{articleId}/comments/{commentId}
 */
export const deleteComment = async (articleId: number, commentId: number): Promise<void> => {
  await client.delete(`/posts/${articleId}/comments/${commentId}`)
}

/**
 * 点赞评论
 * POST /posts/{articleId}/comments/{commentId}/like
 */
export const likeComment = async (
  articleId: number,
  commentId: number
): Promise<{ likeCount: number }> => {
  return client.post(`/posts/${articleId}/comments/${commentId}/like`)
}

/**
 * 取消点赞评论
 * DELETE /posts/{articleId}/comments/{commentId}/like
 */
export const unlikeComment = async (
  articleId: number,
  commentId: number
): Promise<{ likeCount: number }> => {
  return client.delete(`/posts/${articleId}/comments/${commentId}/like`)
}
