import client from './client'
import type { Article, ArticleListItem, Tag, Category, ArticleQueryParams, ArticlePayload, PageQuery, PaginatedResponse } from '@/types'

export type { ArticleQueryParams, ArticlePayload, PageQuery, PaginatedResponse }

/**
 * 获取所有分类
 * GET /categories
 */
export const getCategories = async (): Promise<Category[]> => {
  return client.get('/categories')
}

/**
 * 获取所有标签
 * GET /tags
 */
export const getTags = async (): Promise<Tag[]> => {
  return client.get('/tags')
}

/**
 * 获取文章列表（分页、筛选、搜索）
 * GET /posts
 */
export const getArticles = async (params?: ArticleQueryParams): Promise<PaginatedResponse<ArticleListItem>> => {
  return client.get('/posts', { params })
}

/**
 * 获取浏览量排行（按 viewCount 降序，返回前 N 条）
 * GET /posts/top?limit=10
 */
export const getTopArticles = async (limit = 10): Promise<ArticleListItem[]> => {
  return client.get('/posts/top', { params: { limit } })
}

/**
 * 获取单篇文章详情
 * GET /posts/{id}
 */
export const getArticleById = async (id: number): Promise<Article> => {
  return client.get(`/posts/${id}`)
}

/**
 * 创建新文章
 * POST /posts
 */
export const createArticle = async (payload: ArticlePayload): Promise<Article> => {
  return client.post('/posts', payload)
}

/**
 * 更新文章
 * PUT /posts/{id}
 */
export const updateArticle = async (id: number, payload: Partial<ArticlePayload>): Promise<Article> => {
  return client.put(`/posts/${id}`, payload)
}

/**
 * 删除文章
 * DELETE /posts/{id}
 */
export const deleteArticle = async (id: number): Promise<void> => {
  await client.delete(`/posts/${id}`)
}

/**
 * 获取待审核文章列表（status=2，分页）
 * GET /posts/pending?page=&pageSize=
 */
export const getPendingArticles = async (
  params?: PageQuery
): Promise<PaginatedResponse<ArticleListItem>> => {
  return client.get('/posts/pending', { params })
}

/**
 * 审核通过（status 2→1，文章发布）
 * PUT /posts/{id}/approve
 */
export const approveArticle = async (id: number): Promise<Article> => {
  return client.put(`/posts/${id}/approve`)
}

/**
 * 审核驳回（status 2→0，退回草稿）
 * PUT /posts/{id}/reject
 */
export const rejectArticle = async (id: number): Promise<Article> => {
  return client.put(`/posts/${id}/reject`)
}

/**
 * 点赞文章
 * POST /posts/{id}/like
 */
export const likeArticle = async (id: number): Promise<{ likeCount: number }> => {
  return client.post(`/posts/${id}/like`)
}

/**
 * 取消点赞文章
 * DELETE /posts/{id}/like
 */
export const unlikeArticle = async (id: number): Promise<{ likeCount: number }> => {
  return client.delete(`/posts/${id}/like`)
}

/**
 * 收藏文章
 * POST /posts/{id}/favorite
 */
export const favoriteArticle = async (id: number): Promise<{ favCount: number }> => {
  return client.post(`/posts/${id}/favorite`)
}

/**
 * 取消收藏文章
 * DELETE /posts/{id}/favorite
 */
export const unfavoriteArticle = async (id: number): Promise<{ favCount: number }> => {
  return client.delete(`/posts/${id}/favorite`)
}
