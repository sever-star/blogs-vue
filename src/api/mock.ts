/**
 * API Mock 数据层
 *
 * 拦截 axios 请求并返回模拟数据，用于前端独立开发。
 * 当后端就绪后，删除此文件并移除 client.ts 中的 mock 拦截器即可。
 *
 * 注意：所有 URL pattern 匹配的是 config.url（不含 baseURL 的相对路径），
 * 例如 client.post('/auth/login') → url = '/auth/login'
 */
import type { AxiosResponse } from 'axios'
import type {
  User,
  Tag,
  Category,
  Article,
  ArticleListItem,
  Comment,
  AuthResponse,
  PaginatedResponse,
} from '@/types'
import { getFixedCategories } from '@/constants/categories'

// ============ 辅助函数 ============

const ok = (data: unknown): AxiosResponse => ({
  data: { code: 0, message: 'success', data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
})

const err = (code: number, message: string): AxiosResponse => ({
  data: { code, message, data: null },
  status: code,
  statusText: message,
  headers: {},
  config: {} as any,
})

/** 从 URL 提取文章 ID */
const extractArticleId = (url: string, regex: RegExp): number =>
  parseInt(url.match(regex)![1])

/** 从 URL 提取文章 ID + 评论 ID */
const extractIds = (url: string, regex: RegExp): [number, number] => {
  const m = url.match(regex)!
  return [parseInt(m[1]), parseInt(m[2])]
}

// ============ Mock Data ============

const mockUsers: Record<string, { password: string; user: User }> = {
  admin: {
    password: '123456',
    user: {
      id: 1,
      username: 'admin',
      nickname: '博主小明',
      email: 'admin@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      bio: '热爱技术分享的全栈开发者，专注于 Vue 和 Node.js',
      website: 'https://example.com',
      github: 'https://github.com/admin',
      weibo: '',
      status: 1,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  },
  demo: {
    password: 'demo123',
    user: {
      id: 2,
      username: 'demo',
      nickname: '李四',
      email: 'demo@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      bio: '前端开发者，热爱开源',
      website: '',
      github: 'https://github.com/demo',
      weibo: '',
      status: 1,
      lastLoginAt: new Date().toISOString(),
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: new Date().toISOString(),
    },
  },
}

// 分类数据来自共享固定数据源 src/constants/categories.ts
// 这里克隆一份，便于 mock 内的增删改不影响常量本身
let mockCategories: Category[] = getFixedCategories()

let mockTags: Tag[] = [
  { id: 1, name: 'Vue3', createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'TypeScript', createdAt: '2024-01-01T00:00:00Z' },
  { id: 3, name: 'Node.js', createdAt: '2024-01-01T00:00:00Z' },
  { id: 4, name: '前端', createdAt: '2024-01-01T00:00:00Z' },
  { id: 5, name: '后端', createdAt: '2024-01-01T00:00:00Z' },
  { id: 6, name: 'JavaScript', createdAt: '2024-01-01T00:00:00Z' },
  { id: 7, name: 'CSS', createdAt: '2024-01-01T00:00:00Z' },
  { id: 8, name: 'HTML', createdAt: '2024-01-01T00:00:00Z' },
]

const articleDefs = [
  { title: 'Vue3 Composition API 完全指南', summary: '深入学习 Vue3 的 Composition API，掌握响应式系统的核心概念，打造高效的组件开发模式。', tagIds: [1, 2], rt: 15 },
  { title: 'TypeScript 进阶技巧', summary: '探索 TypeScript 的高级特性，包括泛型、条件类型、装饰器等，提升代码质量和开发效率。', tagIds: [2], rt: 12 },
  { title: 'Node.js 性能优化实战', summary: '通过分析 Node.js 性能瓶颈，学习内存管理、事件循环优化等高级技巧。', tagIds: [3, 5], rt: 18 },
  { title: '前端工程化最佳实践', summary: '从项目结构、构建工具、代码规范到部署流程，介绍现代前端工程化的完整解决方案。', tagIds: [4, 2], rt: 20 },
  { title: 'CSS 布局深度解析', summary: '全面掌握 CSS 的各种布局方案，包括 Flexbox、Grid、定位等，打造响应式页面设计。', tagIds: [7], rt: 14 },
  { title: 'JavaScript 异步编程指南', summary: '从 Callback 到 Promise 再到 Async/Await，深入理解 JavaScript 异步编程的演进过程。', tagIds: [6], rt: 16 },
  { title: 'Pinia 状态管理实战', summary: '学习如何使用 Pinia 进行状态管理，构建可维护和可扩展的 Vue3 应用程序。', tagIds: [1, 2], rt: 13 },
  { title: 'API 设计与最佳实践', summary: '设计高效、易维护的 REST API，遵循行业最佳实践，提升系统的可用性和安全性。', tagIds: [5, 3], rt: 17 },
  { title: '数据库性能优化技巧', summary: '深入探讨数据库查询优化、索引设计、缓存策略等，构建高效的数据存储系统。', tagIds: [5], rt: 19 },
  { title: '微服务架构设计', summary: '了解微服务的核心概念，学习服务拆分、通信、部署等实施方法，应对复杂业务需求。', tagIds: [5], rt: 21 },
  { title: 'HTML5 新特性探索', summary: 'HTML5 为现代web应用带来了许多强大的新特性，包括语义化标签、多媒体支持等。', tagIds: [8], rt: 10 },
  { title: '前端安全最佳实践', summary: '学习如何防止 XSS、CSRF 等常见安全漏洞，构建安全可靠的前端应用程序。', tagIds: [4], rt: 15 },
]

const makeArticleListItems = (): ArticleListItem[] =>
  articleDefs.map((def, i) => ({
    id: i + 1,
    userId: i % 2 === 0 ? 1 : 2,
    title: def.title,
    summary: def.summary,
    coverImage: `https://picsum.photos/800/400?random=${i}`,
    readingTime: def.rt,
    viewCount: Math.floor(Math.random() * 5000) + 100,
    likeCount: Math.floor(Math.random() * 500) + 10,
    favCount: Math.floor(Math.random() * 200) + 5,
    commentCount: Math.floor(Math.random() * 50) + 1,
    status: 1,
    allowComment: true,
    isTop: i < 2,
    publishedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    tags: def.tagIds.map(tid => mockTags.find(t => t.id === tid)!),
    authorNickname: i % 2 === 0 ? '博主小明' : '李四',
    authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i % 2 === 0 ? 'admin' : 'demo'}`,
  }))

const mockArticles: ArticleListItem[] = makeArticleListItems()

// 模拟待审核文章：把前 3 篇标记为 status=2（待审核），供审核页展示
mockArticles.slice(0, 3).forEach(a => {
  a.status = 2
  a.publishedAt = null
})

// 评论缓存（key: articleId）
const commentStore = new Map<number, Comment[]>()

function makeComments(articleId: number): Comment[] {
  return [
    {
      id: articleId * 100 + 1,
      articleId: articleId,
      userId: 2,
      parentId: 0,
      replyToId: 0,
      nickname: '李四',
      email: 'demo@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      content: '很详细的讲解，学到了很多东西，感谢分享！',
      likeCount: 5,
      isAdmin: false,
      status: 1,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: articleId * 100 + 2,
      articleId: articleId,
      userId: null,
      parentId: 0,
      replyToId: 0,
      nickname: '王五',
      email: 'wangwu@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu',
      content: '期待更多相关的深入讲解！',
      likeCount: 2,
      isAdmin: false,
      status: 1,
      createdAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: articleId * 100 + 3,
      articleId: articleId,
      userId: null,
      parentId: articleId * 100 + 1,
      replyToId: articleId * 100 + 1,
      nickname: '游客小明',
      email: 'guest@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
      content: '@李四 同感，受益匪浅！',
      likeCount: 1,
      isAdmin: false,
      status: 1,
      createdAt: new Date(Date.now() - 21600000).toISOString(),
    },
    {
      id: articleId * 100 + 4,
      articleId: articleId,
      userId: 1,
      parentId: articleId * 100 + 1,
      replyToId: articleId * 100 + 1,
      nickname: '博主小明',
      email: 'admin@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      content: '@李四 谢谢支持！后续会继续分享更多内容。',
      likeCount: 0,
      isAdmin: true,
      status: 1,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]
}

function getComments(articleId: number): Comment[] {
  if (!commentStore.has(articleId)) {
    commentStore.set(articleId, makeComments(articleId))
  }
  return commentStore.get(articleId)!
}

// refreshToken 内存存储（模拟 httpOnly cookie）
// key: refreshToken 字符串 → value: username
// 说明：mock 层无法读取真实 cookie，此表仅用于模拟「refresh token 的签发与存在」，
// 实际 refresh 处理因拿不到 cookie 而简化为「总是成功并返回 admin 的新 token」。
const mockRefreshTokens = new Map<string, string>()

function issueRefreshToken(username: string): string {
  const token = 'mock-refresh-token-' + username + '-' + Math.random().toString(36).slice(2)
  mockRefreshTokens.set(token, username)
  return token
}

// ============ 路由匹配 ============

// URL pattern → handler
// KEY: pattern string (method + ' ' + path regex source)
// VALUE: handler function

const R = (method: string, pattern: RegExp): string =>
  `${method.toUpperCase()} ${pattern.source}`

const routes: Record<string, (url: string, data?: any, params?: any) => AxiosResponse> = {
  // ---- 认证 ----
  [R('POST', /^\/auth\/login$/)]: (_, data) => {
    const account = mockUsers[data?.username]
    if (!account || account.password !== data?.password) return err(401, '用户名或密码错误')
    issueRefreshToken(data.username)
    return ok({
      accessToken: 'mock-access-token-' + data.username,
      user: account.user,
    } as AuthResponse)
  },

  [R('POST', /^\/auth\/register$/)]: (_, data) => {
    if (mockUsers[data?.username]) return err(400, '用户名已存在')
    const newUser: User = {
      id: Date.now(), username: data.username, nickname: data.nickname || data.username,
      email: data.email, avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
      bio: '', website: '', github: '', weibo: '', status: 1,
      lastLoginAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    mockUsers[data.username] = { password: data.password, user: newUser }
    issueRefreshToken(data.username)
    return ok({
      accessToken: 'mock-access-token-' + data.username,
      user: newUser,
    } as AuthResponse)
  },

  [R('GET', /^\/auth\/me$/)]: () => ok(mockUsers['admin']?.user ?? err(401, 'Token 无效')),

  // 刷新 accessToken（模拟：拿不到 cookie，总是成功，返回 admin）
  [R('POST', /^\/auth\/refresh$/)]: () => {
    const account = mockUsers['admin']
    if (!account) return err(401, 'Token 无效')
    return ok({
      accessToken: 'mock-access-token-admin',
      user: account.user,
    } as AuthResponse)
  },

  // 更新当前用户资料
  [R('PUT', /^\/auth\/me$/)]: (_, data) => {
    const account = mockUsers['admin']
    if (!account) return err(401, 'Token 无效')
    const allowed = ['nickname', 'avatar', 'bio', 'website', 'github', 'weibo']
    for (const key of allowed) {
      if (data?.[key] !== undefined) {
        ;(account.user as any)[key] = data[key]
      }
    }
    account.user.updatedAt = new Date().toISOString()
    return ok(account.user)
  },

  [R('POST', /^\/auth\/logout$/)]: () => ok(null),

  // 上传头像（模拟后端中转存 OSS，直接返回一个随机默认头像 URL）
  [R('POST', /^\/upload\/avatar$/)]: () => {
    const seeds = ['avatar-01', 'avatar-02', 'avatar-03', 'avatar-04', 'avatar-05', 'avatar-06']
    const seed = seeds[Math.floor(Math.random() * seeds.length)]
    return ok({ url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}` })
  },

  // ---- 分类 ----
  [R('GET', /^\/categories$/)]: (_, __, params) => {
    // 不传分页参数：返回全量数组（选择器用，向后兼容）
    if (params?.page === undefined) return ok(mockCategories)
    // 传分页参数：返回 PaginatedResponse（管理表格用）
    const page = Number(params.page) || 1
    const ps = Number(params.pageSize) || 10
    const total = mockCategories.length
    return ok({
      data: mockCategories.slice((page - 1) * ps, page * ps),
      total, page, pageSize: ps, totalPages: Math.ceil(total / ps),
    } as PaginatedResponse<Category>)
  },

  // 创建分类
  [R('POST', /^\/categories$/)]: (_, data) => {
    const name = String(data?.name || '').trim()
    if (!name) return err(400, '分类名不能为空')
    if (mockCategories.some(c => c.name === name)) return err(400, '分类名已存在')
    const category: Category = {
      id: Math.max(...mockCategories.map(c => c.id), 0) + 1,
      name,
      description: data?.description || '',
      icon: data?.icon || '',
      articleCount: 0,
      createdAt: new Date().toISOString(),
    }
    mockCategories.push(category)
    return ok(category)
  },

  // 获取单个分类
  [R('GET', /^\/categories\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/categories\/(\d+)$/)
    const category = mockCategories.find(c => c.id === id)
    if (!category) return err(404, '分类不存在')
    return ok(category)
  },

  // 更新分类
  [R('PUT', /^\/categories\/(\d+)$/)]: (url, data) => {
    const id = extractArticleId(url, /^\/categories\/(\d+)$/)
    const category = mockCategories.find(c => c.id === id)
    if (!category) return err(404, '分类不存在')
    const name = String(data?.name || '').trim()
    if (!name) return err(400, '分类名不能为空')
    if (mockCategories.some(c => c.id !== id && c.name === name)) return err(400, '分类名已存在')
    if (data?.name) category.name = name
    if (data?.description !== undefined) category.description = data.description
    if (data?.icon !== undefined) category.icon = data.icon
    return ok(category)
  },

  // 删除分类
  [R('DELETE', /^\/categories\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/categories\/(\d+)$/)
    const idx = mockCategories.findIndex(c => c.id === id)
    if (idx === -1) return err(404, '分类不存在')
    const category = mockCategories[idx]
    if (category.articleCount > 0) return err(400, '该分类下还有文章，无法删除')
    mockCategories.splice(idx, 1)
    return ok(null)
  },

  // ---- 标签 ----
  [R('GET', /^\/tags$/)]: (_, __, params) => {
    // 不传分页参数：返回全量数组（选择器用，向后兼容）
    if (params?.page === undefined) return ok(mockTags)
    // 传分页参数：返回 PaginatedResponse（管理表格用），支持 keyword 模糊搜索
    const page = Number(params.page) || 1
    const ps = Number(params.pageSize) || 10
    let list = [...mockTags]
    if (params?.keyword) {
      const kw = String(params.keyword).toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(kw))
    }
    const total = list.length
    return ok({
      data: list.slice((page - 1) * ps, page * ps),
      total, page, pageSize: ps, totalPages: Math.ceil(total / ps),
    } as PaginatedResponse<Tag>)
  },

  // 创建标签
  [R('POST', /^\/tags$/)]: (_, data) => {
    const name = String(data?.name || '').trim()
    if (!name) return err(400, '标签名不能为空')
    if (mockTags.some(t => t.name === name)) return err(400, '标签名已存在')
    const tag: Tag = {
      id: Math.max(...mockTags.map(t => t.id), 0) + 1,
      name,
      createdAt: new Date().toISOString(),
    }
    mockTags.push(tag)
    return ok(tag)
  },

  // 获取单个标签
  [R('GET', /^\/tags\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/tags\/(\d+)$/)
    const tag = mockTags.find(t => t.id === id)
    if (!tag) return err(404, '标签不存在')
    return ok(tag)
  },

  // 更新标签
  [R('PUT', /^\/tags\/(\d+)$/)]: (url, data) => {
    const id = extractArticleId(url, /^\/tags\/(\d+)$/)
    const tag = mockTags.find(t => t.id === id)
    if (!tag) return err(404, '标签不存在')
    const name = String(data?.name || '').trim()
    if (!name) return err(400, '标签名不能为空')
    if (mockTags.some(t => t.id !== id && t.name === name)) return err(400, '标签名已存在')
    tag.name = name
    return ok(tag)
  },

  // 删除标签（同步清理文章上的标签引用）
  [R('DELETE', /^\/tags\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/tags\/(\d+)$/)
    const idx = mockTags.findIndex(t => t.id === id)
    if (idx === -1) return err(404, '标签不存在')
    mockTags.splice(idx, 1)
    mockArticles.forEach(a => {
      a.tags = a.tags.filter(t => t.id !== id)
    })
    return ok(null)
  },

  // ---- 文章列表 ----
  [R('GET', /^\/posts$/)]: (_, __, params) => {
    let list = [...mockArticles]
    // 默认只返回已发布(status=1)；显式传 status 时按指定状态过滤（管理端查看）
    if (params?.status !== undefined) {
      list = list.filter(a => a.status === Number(params.status))
    } else {
      list = list.filter(a => a.status === 1)
    }
    if (params?.tagId) list = list.filter(a => a.tags.some(t => t.id === Number(params.tagId)))
    if (params?.keyword) {
      const kw = String(params.keyword).toLowerCase()
      list = list.filter(a => a.title.toLowerCase().includes(kw) || a.summary.toLowerCase().includes(kw))
    }
    const page = Number(params?.page) || 1
    const ps = Number(params?.pageSize) || 10
    const total = list.length
    return ok({
      data: list.slice((page - 1) * ps, page * ps),
      total, page, pageSize: ps, totalPages: Math.ceil(total / ps),
    } as PaginatedResponse<ArticleListItem>)
  },

  // ---- 待审核文章列表（status=2，分页）----
  [R('GET', /^\/posts\/pending$/)]: (_, __, params) => {
    const pending = mockArticles.filter(a => a.status === 2)
    const page = Number(params?.page) || 1
    const ps = Number(params?.pageSize) || 10
    const total = pending.length
    return ok({
      data: pending.slice((page - 1) * ps, page * ps),
      total, page, pageSize: ps, totalPages: Math.ceil(total / ps),
    } as PaginatedResponse<ArticleListItem>)
  },

  // ---- 审核通过（2→1）----
  [R('PUT', /^\/posts\/(\d+)\/approve$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/approve$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    if (a.status !== 2) return err(400, '该文章不在待审核状态')
    a.status = 1
    a.publishedAt = new Date().toISOString()
    return ok(a)
  },

  // ---- 审核驳回（2→0，退回草稿）----
  [R('PUT', /^\/posts\/(\d+)\/reject$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/reject$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    if (a.status !== 2) return err(400, '该文章不在待审核状态')
    a.status = 0
    return ok(a)
  },

  // ---- 文章详情 ----
  [R('GET', /^\/posts\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    a.viewCount += 1
    const title = a.title
    return ok({
      ...a,
      contentMd: `# ${title}\n\n这是一篇关于 **${title}** 的详细文章。\n\n## 引言\n\n在现代 Web 开发中，${title} 是一个非常重要的话题。\n\n## 核心概念\n\n### 基础知识\n\n\`\`\`typescript\nfunction hello(name: string): string {\n  return \`Hello, \${name}!\`\n}\n\`\`\`\n\n### 进阶技巧\n\n在掌握了基础之后，我们可以进一步探索更高级的用法。\n\n## 最佳实践\n\n1. **保持代码简洁**：遵循 KISS 原则\n2. **注重性能**：合理使用缓存和懒加载\n3. **编写测试**：确保代码的可靠性\n\n## 总结\n\n通过本文，我们深入了解了 ${title} 的核心概念和实践方法。`,
      contentHtml: `<h1>${title}</h1><p>这是一篇关于 <strong>${title}</strong> 的详细文章。</p><h2>引言</h2><h2>核心概念</h2><h3>基础知识</h3><h3>进阶技巧</h3><h2>最佳实践</h2><ol><li>保持代码简洁</li><li>注重性能</li><li>编写测试</li></ol><h2>总结</h2>`,
      liked: false,
      favorited: false,
    } as Article)
  },

  // ---- 创建文章 ----
  [R('POST', /^\/posts$/)]: (_, data) => {
    const tagObjs = (data?.tags || []).map((tid: number) => mockTags.find(t => t.id === tid)!).filter(Boolean)
    const a: Article = {
      id: Math.max(...mockArticles.map(x => x.id), 0) + 1,
      userId: 1, title: data?.title || '', contentMd: data?.contentMd || '', contentHtml: '',
      summary: data?.summary || '', coverImage: data?.coverImage || '',
      readingTime: data?.readingTime || 0, viewCount: 0, likeCount: 0, favCount: 0, commentCount: 0,
      status: data?.status ?? 1, allowComment: data?.allowComment ?? true, isTop: false,
      publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      tags: tagObjs, authorNickname: '博主小明',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      liked: false, favorited: false,
    }
    mockArticles.unshift(a)
    return ok(a)
  },

  // ---- 更新文章 ----
  [R('PUT', /^\/posts\/(\d+)$/)]: (url, data) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)$/)
    const a = mockArticles.find(x => x.id === id) as any
    if (!a) return err(404, '文章不存在')
    if (data) Object.assign(a, data, { updatedAt: new Date().toISOString() })
    return ok(a)
  },

  // ---- 删除文章 ----
  [R('DELETE', /^\/posts\/(\d+)$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)$/)
    const idx = mockArticles.findIndex(x => x.id === id)
    if (idx === -1) return err(404, '文章不存在')
    mockArticles.splice(idx, 1)
    return ok(null)
  },

  // ---- 文章点赞 ----
  [R('POST', /^\/posts\/(\d+)\/like$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/like$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    a.likeCount += 1
    return ok({ likeCount: a.likeCount })
  },

  [R('DELETE', /^\/posts\/(\d+)\/like$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/like$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    if (a.likeCount > 0) a.likeCount -= 1
    return ok({ likeCount: a.likeCount })
  },

  // ---- 文章收藏 ----
  [R('POST', /^\/posts\/(\d+)\/favorite$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/favorite$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    a.favCount += 1
    return ok({ favCount: a.favCount })
  },

  [R('DELETE', /^\/posts\/(\d+)\/favorite$/)]: (url) => {
    const id = extractArticleId(url, /^\/posts\/(\d+)\/favorite$/)
    const a = mockArticles.find(x => x.id === id)
    if (!a) return err(404, '文章不存在')
    if (a.favCount > 0) a.favCount -= 1
    return ok({ favCount: a.favCount })
  },

  // ---- 评论列表 ----
  [R('GET', /^\/posts\/(\d+)\/comments$/)]: (url, _, params) => {
    const articleId = extractArticleId(url, /^\/posts\/(\d+)\/comments$/)
    const all = getComments(articleId)
    const page = Number(params?.page) || 1
    const ps = Number(params?.pageSize) || 20
    const total = all.length
    return ok({
      data: all.slice((page - 1) * ps, page * ps),
      total, page, pageSize: ps, totalPages: Math.ceil(total / ps),
    } as PaginatedResponse<Comment>)
  },

  // ---- 发表评论 ----
  [R('POST', /^\/posts\/(\d+)\/comments$/)]: (url, data) => {
    const articleId = extractArticleId(url, /^\/posts\/(\d+)\/comments$/)
    const c: Comment = {
      id: Date.now(), articleId: articleId,
      userId: Math.random() > 0.5 ? 1 : null,
      parentId: data?.parentId || 0, replyToId: data?.replyToId || 0,
      nickname: data?.nickname || '游客', email: data?.email || '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data?.nickname || 'guest'}`,
      content: data?.content || '', likeCount: 0, isAdmin: false, status: 0,
      createdAt: new Date().toISOString(),
    }
    getComments(articleId).unshift(c)
    const a = mockArticles.find(x => x.id === articleId)
    if (a) a.commentCount += 1
    return ok(c)
  },

  // ---- 删除评论 ----
  [R('DELETE', /^\/posts\/(\d+)\/comments\/(\d+)$/)]: (url) => {
    const [articleId, commentId] = extractIds(url, /^\/posts\/(\d+)\/comments\/(\d+)$/)
    const comments = commentStore.get(articleId) || []
    const idx = comments.findIndex(c => c.id === commentId)
    if (idx === -1) return err(404, '评论不存在')
    comments.splice(idx, 1)
    const a = mockArticles.find(x => x.id === articleId)
    if (a && a.commentCount > 0) a.commentCount -= 1
    return ok(null)
  },

  // ---- 评论点赞 ----
  [R('POST', /^\/posts\/(\d+)\/comments\/(\d+)\/like$/)]: (url) => {
    const [articleId, commentId] = extractIds(url, /^\/posts\/(\d+)\/comments\/(\d+)\/like$/)
    const c = (commentStore.get(articleId) || []).find(x => x.id === commentId)
    if (!c) return err(404, '评论不存在')
    c.likeCount += 1
    return ok({ likeCount: c.likeCount })
  },

  [R('DELETE', /^\/posts\/(\d+)\/comments\/(\d+)\/like$/)]: (url) => {
    const [articleId, commentId] = extractIds(url, /^\/posts\/(\d+)\/comments\/(\d+)\/like$/)
    const c = (commentStore.get(articleId) || []).find(x => x.id === commentId)
    if (!c) return err(404, '评论不存在')
    if (c.likeCount > 0) c.likeCount -= 1
    return ok({ likeCount: c.likeCount })
  },
}

// ============ 导出 ============

export function matchMock(
  method: string,
  url: string,
  data?: unknown,
  params?: Record<string, unknown>
): AxiosResponse | null {
  const methodUpper = method.toUpperCase()

  // 精确匹配
  for (const [key, handler] of Object.entries(routes)) {
    const [m, patternSrc] = key.split(' ')
    if (m !== methodUpper) continue
    if (new RegExp(patternSrc).test(url)) {
      return handler(url, data, params)
    }
  }
  return null
}