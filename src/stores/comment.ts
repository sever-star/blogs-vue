import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Comment, CommentPayload } from '@/types'
import { getComments as getCommentsApi, submitComment as submitCommentApi } from '@/api/comment'

export type { Comment }

export const useCommentStore = defineStore('comment', () => {
  const comments = ref<Comment[]>([])
  const commentMap = ref<Map<number, Comment[]>>(new Map())
  const loading = ref(false)

  // ========== 方法 ==========

  /** 获取文章评论列表（从后端拉取全量嵌套数据，扁平化后存入缓存） */
  const fetchComments = async (articleId: number): Promise<Comment[]> => {
    loading.value = true
    try {
      const nested = await getCommentsApi(articleId)
      // 后端返回顶级评论（每条内嵌 replies）；扁平化以便点赞/删除等按 id 查找逻辑复用
      const flat: Comment[] = []
      for (const top of nested ?? []) {
        flat.push(top)
        if (top.replies?.length) flat.push(...top.replies)
      }
      commentMap.value.set(articleId, flat)
      comments.value = flat
      return flat
    } catch (error) {
      console.error('获取评论失败:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  /** 获取文章评论（按文章ID，返回嵌套结构） */
  const getArticleComments = (articleId: number): Comment[] => {
    const all = commentMap.value.get(articleId) || []
    // 构建嵌套结构：顶级评论 + replies
    // 后端顶级评论 parentId 可能为 null 或 0（DB 默认 NULL），两者都视为顶级
    const topLevel = all.filter(c => !c.parentId)
    return topLevel.map(comment => ({
      ...comment,
      replies: all.filter(c => c.parentId === comment.id),
    }))
  }

  /** 发表评论（调用后端 POST，成功后写入本地缓存） */
  const addComment = async (payload: CommentPayload & { articleId: number }): Promise<Comment | null> => {
    try {
      const created = await submitCommentApi(payload.articleId, {
        content: payload.content,
        parentId: payload.parentId,
        replyToId: payload.replyToId,
      })

      if (!commentMap.value.has(payload.articleId)) {
        commentMap.value.set(payload.articleId, [])
      }
      // 新评论插到顶级最前；回复（parentId 非 0）也先进扁平缓存，
      // 由 getArticleComments 按 parentId 重新组织嵌套
      commentMap.value.get(payload.articleId)!.unshift(created)
      return created
    } catch (error: any) {
      console.error('发表评论失败:', error)
      // 透出后端原因（401 未登录 / 内容过长 / 文章不允许评论等），交由组件提示
      throw error
    }
  }

  /** 点赞评论 */
  const likeComment = async (articleId: number, commentId: number) => {
    try {
      // TODO: 接入真实 API: POST /posts/{articleId}/comments/{commentId}/like
      const articleComments = commentMap.value.get(articleId) || []
      const comment = articleComments.find(c => c.id === commentId)
      if (comment) {
        comment.likeCount += 1
      }
    } catch (error) {
      console.error('点赞评论失败:', error)
    }
  }

  /** 取消点赞评论 */
  const unlikeComment = async (articleId: number, commentId: number) => {
    try {
      // TODO: 接入真实 API: DELETE /posts/{articleId}/comments/{commentId}/like
      const articleComments = commentMap.value.get(articleId) || []
      const comment = articleComments.find(c => c.id === commentId)
      if (comment && comment.likeCount > 0) {
        comment.likeCount -= 1
      }
    } catch (error) {
      console.error('取消点赞失败:', error)
    }
  }

  /** 删除评论 */
  const deleteComment = async (articleId: number, commentId: number) => {
    try {
      // TODO: 接入真实 API: DELETE /posts/{articleId}/comments/{commentId}
      const articleComments = commentMap.value.get(articleId)
      if (articleComments) {
        const index = articleComments.findIndex(c => c.id === commentId)
        if (index > -1) {
          articleComments.splice(index, 1)
        }
      }
    } catch (error) {
      console.error('删除评论失败:', error)
    }
  }

  /** 清空评论缓存 */
  const clearCommentCache = (articleId?: number) => {
    if (articleId) {
      commentMap.value.delete(articleId)
    } else {
      commentMap.value.clear()
    }
    comments.value = []
  }

  return {
    comments,
    loading,
    fetchComments,
    getArticleComments,
    addComment,
    likeComment,
    unlikeComment,
    deleteComment,
    clearCommentCache,
  }
})
