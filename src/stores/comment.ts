import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Comment, CommentPayload, PaginatedResponse } from '@/types'

export type { Comment }

export const useCommentStore = defineStore('comment', () => {
  const comments = ref<Comment[]>([])
  const commentMap = ref<Map<number, Comment[]>>(new Map())
  const loading = ref(false)

  // ========== Mock 数据 (开发阶段使用) ==========

  const generateMockComments = (articleId: number): Comment[] => {
    return [
      {
        id: 1,
        articleId: articleId,
        userId: 1,
        parentId: 0,
        replyToId: 0,
        nickname: '张三',
        email: 'zhangsan@example.com',
        avatar: 'https://ui-avatars.com/api/?name=zhangsan&background=0D8ABC&color=fff',
        content: '这是一篇很不错的文章，学到了很多东西，感谢分享！',
        likeCount: 5,
        isAdmin: false,
        status: 1,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        articleId: articleId,
        userId: 2,
        parentId: 0,
        replyToId: 0,
        nickname: '李四',
        email: 'lisi@example.com',
        avatar: 'https://ui-avatars.com/api/?name=lisi&background=FF9F43&color=fff',
        content: '期待更多相关的深入讲解，这方面的教程很稀缺。',
        likeCount: 2,
        isAdmin: false,
        status: 1,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        articleId: articleId,
        userId: null,
        parentId: 1,
        replyToId: 1,
        nickname: '游客',
        email: 'guest@example.com',
        avatar: 'https://ui-avatars.com/api/?name=guest&background=random&color=fff',
        content: '@张三 同意，受益匪浅！',
        likeCount: 1,
        isAdmin: false,
        status: 1,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        articleId: articleId,
        userId: null,
        parentId: 1,
        replyToId: 1,
        nickname: '博主',
        email: 'admin@example.com',
        avatar: 'https://ui-avatars.com/api/?name=admin&background=purple&color=fff',
        content: '@张三 感谢你的支持！后续会继续分享更多相关内容。',
        likeCount: 0,
        isAdmin: true,
        status: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ]
  }

  // ========== 方法 ==========

  /** 获取文章评论列表 */
  const fetchComments = async (articleId: number): Promise<Comment[]> => {
    loading.value = true
    try {
      // TODO: 接入真实 API: GET /posts/{articleId}/comments
      if (!commentMap.value.has(articleId)) {
        const mockComments = generateMockComments(articleId)
        commentMap.value.set(articleId, mockComments)
      }
      comments.value = commentMap.value.get(articleId) || []
      return comments.value
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
    const topLevel = all.filter(c => c.parentId === 0)
    return topLevel.map(comment => ({
      ...comment,
      replies: all.filter(c => c.parentId === comment.id),
    }))
  }

  /** 获取指定文章的平铺评论列表（分页） */
  const getCommentsByPost = (articleId: number, page: number = 1, pageSize: number = 10): PaginatedResponse<Comment> => {
    const allComments = commentMap.value.get(articleId) || []
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const data = allComments.slice(start, end)
    return {
      data,
      total: allComments.length,
      page,
      pageSize: pageSize,
      totalPages: Math.ceil(allComments.length / pageSize),
    }
  }

  /** 添加评论 */
  const addComment = async (payload: CommentPayload & { articleId: number }): Promise<Comment | null> => {
    try {
      // TODO: 接入真实 API: POST /posts/{articleId}/comments
      // return await submitCommentApi(payload)

      const newComment: Comment = {
        id: Math.floor(Math.random() * 100000),
        articleId: payload.articleId,
        userId: Math.random() > 0.5 ? 1 : null,
        parentId: payload.parentId || 0,
        replyToId: payload.replyToId || 0,
        nickname: payload.nickname || '游客',
        email: payload.email || '',
        avatar: `https://ui-avatars.com/api/?name=${payload.nickname || 'guest'}&background=random&color=fff`,
        content: payload.content,
        likeCount: 0,
        isAdmin: false,
        status: 0,
        createdAt: new Date().toISOString(),
      }

      if (!commentMap.value.has(payload.articleId)) {
        commentMap.value.set(payload.articleId, [])
      }
      const articleComments = commentMap.value.get(payload.articleId)!
      articleComments.unshift(newComment)

      return newComment
    } catch (error) {
      console.error('发表评论失败:', error)
      return null
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
    getCommentsByPost,
    addComment,
    likeComment,
    unlikeComment,
    deleteComment,
    clearCommentCache,
  }
})
