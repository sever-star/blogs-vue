import client from './client'
import type { Article, ArticleListItem, Tag, Category, ArticleQueryParams, ArticlePayload, PageQuery, PaginatedResponse, PostRevision, PostRevisionListItem, AiReviewAid } from '@/types'

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
 * 获取文章列表（筛选、搜索，不分页）
 * GET /posts
 */
export const getArticles = async (params?: ArticleQueryParams): Promise<ArticleListItem[]> => {
  return client.get('/posts', { params })
}

/**
 * 搜索文章（PostgreSQL 全文检索，按相关性排序）
 * GET /posts/search?keyword=
 * 后端用 ts_headline 生成高亮：highlightTitle / highlightSummary 以 <em> 包裹命中词，
 * 仅此接口返回；普通列表项这两个字段为空（后端 @JsonInclude(NON_NULL) 不序列化）。
 * 不分页，全量返回，前端自行渲染。
 */
export const searchArticles = async (keyword: string): Promise<ArticleListItem[]> => {
  return client.get('/posts/search', { params: { keyword } })
}

/**
 * 获取浏览量排行（按 viewCount 降序，返回前 N 条）
 * GET /posts/top?limit=10
 * limit 由后端 SQL LIMIT 截断，默认 10
 */
export const getTopArticles = async (limit = 10): Promise<ArticleListItem[]> => {
  return client.get('/posts/top', { params: { limit } })
}

/**
 * 我的文章（本人全部稿件，仅自己可见）
 * status：0=草稿 1=已发布 2=已下架；reviewStatus：0=待审核 1=通过 2=拒绝
 * GET /posts/mine
 */
export const getMyArticles = async (): Promise<ArticleListItem[]> => {
  return client.get('/posts/mine')
}

/**
 * 我赞过的文章（当前用户的点赞记录，按点赞时间倒序）
 * 只含已发布且未软删；结构同 GET /posts 列表项；全量返回，前端自行分页
 * GET /posts/liked
 */
export const getLikedArticles = async (): Promise<ArticleListItem[]> => {
  return client.get('/posts/liked')
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
 * 获取待审核文章列表（review_status=0 待审核，分页）
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
 *
 * reason 会随请求发给后端，用于生成驳回通知告知作者具体原因。
 */
export const rejectArticle = async (id: number, reason: string): Promise<Article> => {
  return client.put(`/posts/${id}/reject`, { reason })
}

/**
 * 下架文章（作者本人或管理员；仅 status=1 已发布可下架）
 * PUT /posts/{id}/offline
 */
export const offlineArticle = async (id: number): Promise<void> => {
  await client.put(`/posts/${id}/offline`)
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

// ==================== 文章版本控制 ====================

/**
 * 获取文章历史版本列表（不含正文，按 versionNo 倒序）
 * 仅作者可访问；列表不含「当前版本」（当前态在文章本体）。
 * GET /posts/{id}/revisions
 */
export const getPostRevisions = async (id: number): Promise<PostRevisionListItem[]> => {
  return client.get(`/posts/${id}/revisions`)
}

/**
 * 获取单个历史版本完整内容（含正文快照）
 * GET /posts/{id}/revisions/{revId}
 */
export const getPostRevision = async (id: number, revId: number): Promise<PostRevision> => {
  return client.get(`/posts/${id}/revisions/${revId}`)
}

/**
 * 回滚文章到指定历史版本
 * 回滚前后端自动存「当前状态」快照保证可逆；回滚后 reviewStatus=0 重新审核，
 * 已发布的文章 status 置 2（下架待审），草稿保持 0。返回回滚后的完整文章对象。
 * POST /posts/{id}/revisions/{revId}/rollback
 */
export const rollbackPostRevision = async (id: number, revId: number): Promise<Article> => {
  return client.post(`/posts/${id}/revisions/${revId}/rollback`)
}

/**
 * 获取文章 AI 审核建议（仅管理员；作者提交审核时异步生成）
 * 返回结构：{ status, complianceScore, sensitiveWords, qualityScore,
 *            plagiarismHint, summary, suggestion }
 * status：0=生成中 1=成功 2=未生成/失败
 * GET /posts/reviews/{postId}/ai-aid
 */
export const getAiReviewAid = async (postId: number): Promise<AiReviewAid> => {
  return client.get(`/posts/reviews/${postId}/ai-aid`)
}
