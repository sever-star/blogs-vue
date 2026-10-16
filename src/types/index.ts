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
  /** 角色：ADMIN=管理员，USER=普通用户 */
  role: 'ADMIN' | 'USER'
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

// ============ 分类 ============

/** 分类（扁平结构，无层级；与标签一样每个分类都是独立模块） */
export interface Category {
  id: number
  name: string
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
  /** 发布状态：0=草稿 1=已发布 2=已下架 */
  status: number
  /** 审核状态：0=待审核 1=通过 2=拒绝（仅 GET /posts/mine 返回，其余接口为空） */
  reviewStatus?: number
  allowComment: boolean
  isTop: boolean
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
  parentId: number | null
  replyToId: number | null
  nickname: string
  email?: string
  avatar: string
  content: string
  likeCount: number
  isAdmin: number // 0=普通用户 1=博主（后端返回 short）
  status?: number
  createdAt: string
  replies?: Comment[]
  liked?: boolean
}

// ============ 通知 ============

/** 站内通知类型 */
export type NotificationType =
  | 'post_comment' // 有人评论你的文章
  | 'comment_reply' // 有人回复你的评论
  | 'comment_like' // 有人点赞你的评论
  | 'like' // 有人点赞你的文章
  | 'favorite' // 有人收藏你的文章
  | 'follow' // 有人关注你
  | 'message' // 收到私信
  | 'system' // 系统通知

/** 站内通知（content 已由后端拼好，直接展示） */
export interface Notification {
  id: number
  type: NotificationType
  title: string
  content: string
  /** 跳转链接，如 /article/5 或 /article/5#comment-12 */
  link: string
  /** 0=未读 1=已读（后端 short） */
  isRead: number
  createdAt: string
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
  /** 渲染后的 HTML（编辑器 onHtmlChanged 回调产出），随创建/更新一并提交 */
  contentHtml?: string
  summary?: string
  coverImage?: string
  categoryId?: number // 分类ID，可选
  tags: number[] // 标签 ID 数组
  readingTime?: number
  status?: number // 发布状态：0=草稿 1=已发布 2=已下架；审核状态看 review_status（0待审核/1通过/2拒绝）
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