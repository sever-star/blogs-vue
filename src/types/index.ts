/**
 * 博客系统 - 核心类型定义
 *
 * 命名规范：所有 API 交互字段使用 camelCase，与后端实体字段一致。
 * 此文件为整个前端的唯一类型来源。
 */

// ============ 用户 ============

/** 用户完整信息 */
export interface User {
  id: number
  username: string
  nickname: string
  email: string
  avatar: string
  bio: string
  website: string
  github: string
  weibo: string
  status: number
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

// ============ 分类 ============

/** 分类（扁平结构，无层级；与标签一样每个分类都是独立模块） */
export interface Category {
  id: number
  name: string
  /** 排序序号，越小越靠前 */
  sortOrder: number
  createdAt: string
}

// ============ 标签 ============

/** 标签 */
export interface Tag {
  id: number
  name: string
  createdAt: string
}

// ============ 文章 ============

/** 文章（列表用，不含正文） */
export interface ArticleListItem {
  id: number
  userId: number
  title: string
  summary: string
  coverImage: string
  readingTime: number
  viewCount: number
  likeCount: number
  favCount: number
  commentCount: number
  status: number
  allowComment: boolean
  isTop: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  category?: Category
  tags: Tag[]
  authorNickname: string
  authorAvatar: string
}

/** 文章详情（含正文） */
export interface Article extends ArticleListItem {
  contentMd: string
  contentHtml: string
  liked: boolean
  favorited: boolean
}

// ============ 评论 ============

/** 评论 */
export interface Comment {
  id: number
  articleId: number
  userId: number | null
  parentId: number
  replyToId: number
  nickname: string
  email: string
  avatar: string
  content: string
  likeCount: number
  isAdmin: boolean
  status: number
  createdAt: string
  replies?: Comment[]
  liked?: boolean
}

// ============ 请求体 ============

/** 登录请求 */
export interface LoginRequest {
  username: string
  password: string
}

/** 注册请求 */
export interface RegisterRequest {
  username: string
  email: string
  password: string
}

/** 认证响应（双 token） */
export interface AuthResponse {
  /** 短有效期 access token（登录/刷新返回，camelCase） */
  accessToken: string
  user: User
}

/** 创建/更新文章请求 */
export interface ArticlePayload {
  title: string
  contentMd: string
  summary?: string
  coverImage?: string
  categoryId?: number // 分类ID，可选
  tags: number[] // 标签 ID 数组
  readingTime?: number
  status?: number // 0=草稿, 1=已发布(审核通过), 2=待审核
  allowComment?: boolean
}

/** 文章查询参数（首页文章列表，不支持分页，仅支持筛选/搜索） */
export interface ArticleQueryParams {
  categoryId?: number
  tagId?: number
  keyword?: string
}

/** 发表评论请求 */
export interface CommentPayload {
  content: string
  nickname?: string
  email?: string
  parentId?: number
  replyToId?: number
}

/** 评论查询参数 */
export interface CommentQueryParams {
  page?: number
  pageSize?: number
}

// ============ 分页 ============

/** 通用分页请求参数 */
export interface PageQuery {
  page?: number
  pageSize?: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============ 通用 ============

/** API 统一响应格式 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}