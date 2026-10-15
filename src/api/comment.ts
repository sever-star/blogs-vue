import client from './client'
import type { Comment, CommentPayload } from '@/types'

export type { CommentPayload }

/**
 * 获取文章评论列表（全量，不分页）
 * GET /posts/{articleId}/comments
 *
 * 后端返回顶级评论数组，每条在其 `replies` 内嵌套二级回复；
 * 前端 store 会将其扁平化存入缓存以便按 id 查找。
 */
export const getComments = async (articleId: number): Promise<Comment[]> => {
  return client.get(`/posts/${articleId}/comments`)
}

/**
 * 获取单条评论详情
 * GET /posts/{articleId}/comments/{commentId}
 */
export const getCommentById = async (articleId: number, commentId: number): Promise<Comment> => {
  return client.get(`/posts/${articleId}/comments/${commentId}`)
}

// 评论发布后不可修改，只保留删除：原 PUT /posts/{articleId}/comments/{commentId} 已移除。

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
