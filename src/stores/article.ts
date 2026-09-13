import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article, ArticleListItem, Tag, Category } from '@/types'
import {
  getTags as getTagsApi,
  getCategories as getCategoriesApi,
  getArticles as getArticlesApi,
  getTopArticles as getTopArticlesApi,
  getPendingArticles as getPendingArticlesApi,
  approveArticle as approveArticleApi,
  rejectArticle as rejectArticleApi,
  getArticleById as getArticleByIdApi,
  createArticle as createArticleApi,
  updateArticle as updateArticleApi,
  deleteArticle as deleteArticleApi,
  likeArticle as likeArticleApi,
  favoriteArticle as favoriteArticleApi,
} from '@/api/article'
import type { ArticleQueryParams, ArticlePayload } from '@/types'

export type { Article, ArticleListItem, Tag, Category }

export const useArticleStore = defineStore('article', () => {
  const articles = ref<ArticleListItem[]>([])
  const tags = ref<Tag[]>([])
  const categories = ref<Category[]>([])
  const selectedTag = ref<number | null>(null)
  const selectedCategory = ref<number | null>(null)
  const currentArticle = ref<Article | null>(null)
  const currentPage = ref(1)
  const pageSize = 10
  const totalCount = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)

  // ========== Mock 数据 (开发阶段使用) ==========

  const mockCategories: Category[] = [
    { id: 1, name: '技术', sortOrder: 0, createdAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: '生活', sortOrder: 1, createdAt: '2024-01-02T00:00:00Z' },
    { id: 3, name: '教程', sortOrder: 2, createdAt: '2024-01-03T00:00:00Z' },
    { id: 4, name: '分享', sortOrder: 3, createdAt: '2024-01-04T00:00:00Z' },
  ]

  const mockTags: Tag[] = [
    { id: 1, name: 'Vue3', createdAt: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'TypeScript', createdAt: '2024-01-01T00:00:00Z' },
    { id: 3, name: 'Node.js', createdAt: '2024-01-01T00:00:00Z' },
    { id: 4, name: '前端', createdAt: '2024-01-01T00:00:00Z' },
    { id: 5, name: '后端', createdAt: '2024-01-01T00:00:00Z' },
    { id: 6, name: 'JavaScript', createdAt: '2024-01-01T00:00:00Z' },
    { id: 7, name: 'CSS', createdAt: '2024-01-01T00:00:00Z' },
    { id: 8, name: 'HTML', createdAt: '2024-01-01T00:00:00Z' },
  ]

  const generateMockArticles = (): ArticleListItem[] => {
    const mockData = [
      { title: 'Vue3 Composition API 完全指南', summary: '深入学习 Vue3 的 Composition API，掌握响应式系统的核心概念。', tagIndices: [0, 1], categoryIndex: 0, readingTime: 15 },
      { title: 'TypeScript 进阶技巧', summary: '探索 TypeScript 的高级特性，包括泛型、条件类型、装饰器等。', tagIndices: [1], categoryIndex: 0, readingTime: 12 },
      { title: 'Node.js 性能优化实战', summary: '分析 Node.js 性能瓶颈，学习内存管理、事件循环优化等高级技巧。', tagIndices: [2, 4], categoryIndex: 0, readingTime: 18 },
      { title: '前端工程化最佳实践', summary: '从项目结构、构建工具、代码规范到部署流程的完整解决方案。', tagIndices: [3, 1], categoryIndex: 0, readingTime: 20 },
      { title: 'CSS 布局深度解析', summary: '全面掌握 CSS 的各种布局方案，包括 Flexbox、Grid、定位等。', tagIndices: [6], categoryIndex: 0, readingTime: 14 },
      { title: 'JavaScript 异步编程指南', summary: '从 Callback 到 Promise 再到 Async/Await 的演进过程。', tagIndices: [5], categoryIndex: 1, readingTime: 16 },
      { title: 'Pinia 状态管理实战', summary: '学习如何使用 Pinia 进行状态管理，构建可维护的 Vue3 应用。', tagIndices: [0, 1], categoryIndex: 2, readingTime: 13 },
      { title: 'API 设计与最佳实践', summary: '设计高效、易维护的 REST API，提升系统的可用性和安全性。', tagIndices: [4, 2], categoryIndex: 0, readingTime: 17 },
      { title: '数据库性能优化技巧', summary: '深入探讨数据库查询优化、索引设计、缓存策略等。', tagIndices: [4], categoryIndex: 1, readingTime: 19 },
      { title: '微服务架构设计', summary: '了解微服务的核心概念，学习服务拆分、通信、部署等方法。', tagIndices: [4], categoryIndex: 0, readingTime: 21 },
      { title: 'HTML5 新特性探索', summary: 'HTML5 为现代web应用带来了许多强大的新特性。', tagIndices: [7], categoryIndex: 2, readingTime: 10 },
      { title: '前端安全最佳实践', summary: '学习如何防止 XSS、CSRF 等常见安全漏洞。', tagIndices: [3], categoryIndex: 3, readingTime: 15 },
    ]

    return mockData.map((item, index) => ({
      id: index + 1,
      userId: index % 2 === 0 ? 1 : 2,
      title: item.title,
      summary: item.summary,
      coverImage: `https://picsum.photos/800/400?random=${index}`,
      readingTime: item.readingTime,
      viewCount: Math.floor(Math.random() * 5000) + 100,
      likeCount: Math.floor(Math.random() * 500) + 10,
      favCount: Math.floor(Math.random() * 200) + 5,
      commentCount: Math.floor(Math.random() * 50) + 1,
      status: index < 3 ? 2 : 1, // 前 3 篇模拟为「待审核」
      allowComment: true,
      isTop: index >= 3 && index < 5, // 待审核文章不置顶，置顶顺延
      publishedAt: index < 3 ? null : new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      category: mockCategories[item.categoryIndex],
      tags: item.tagIndices.map(i => mockTags[i]),
      authorNickname: index % 2 === 0 ? '张三' : '李四',
      authorAvatar: `https://ui-avatars.com/api/?name=${index % 2 === 0 ? 'zhangsan' : 'lisi'}`,
    }))
  }

  const allArticles = ref<ArticleListItem[]>(generateMockArticles())

  // ========== 计算属性 ==========

  const filteredArticles = computed(() => {
    // 首页只展示已发布(status=1)文章；草稿/待审核走管理端
    let list = allArticles.value.filter(a => a.status === 1)
    if (selectedCategory.value) {
      list = list.filter(article => article.category?.id === selectedCategory.value)
    }
    if (selectedTag.value) {
      list = list.filter(article =>
        article.tags.some(tag => tag.id === selectedTag.value)
      )
    }
    return list
  })

  const paginatedArticles = computed(() => {
    // 无限滚动是「累积」展示：从第 1 条到当前页末尾，而不是只取当前页。
    // 否则加载更多后会用 slice(start,end) 覆盖掉之前页，列表反而变短，滚动异常。
    const end = currentPage.value * pageSize
    return filteredArticles.value.slice(0, end)
  })

  const totalArticles = computed(() => filteredArticles.value.length)

  const hasMore = computed(() => {
    return (currentPage.value * pageSize) < totalArticles.value
  })

  /** 浏览量排行（按 viewCount 降序，前 N 条，由 fetchTopArticles 填充） */
  const topViewedArticles = ref<ArticleListItem[]>([])

  // ========== 方法 ==========

  /** 获取标签列表 */
  const fetchTags = async () => {
    try {
      tags.value = await getTagsApi()
    } catch (error) {
      console.error('获取标签失败:', error)
    }
  }

  /** 获取文章列表（前端本地分页/滚动加载；服务端不分页） */
  const fetchArticles = async (page: number = 1, tagId?: number | null, categoryId?: number | null, params?: ArticleQueryParams) => {
    loading.value = true
    try {
      // TODO: 接入真实 API: GET /posts（不分页，返回全量数组）
      // articles.value = await getArticlesApi({ categoryId: categoryId ?? undefined, tagId: tagId ?? undefined, ...params })
      // totalCount.value = articles.value.length

      currentPage.value = page
      if (categoryId !== undefined) {
        selectedCategory.value = categoryId
      }
      if (tagId !== undefined) {
        selectedTag.value = tagId
      }
      totalCount.value = filteredArticles.value.length
    } catch (error) {
      console.error('获取文章列表失败:', error)
    } finally {
      loading.value = false
    }
  }

  const fetchCategories = async () => {
    try {
      // TODO: 接入真实 API: GET /categories
      // const res = await getCategoriesApi()
      // categories.value = res.data
      categories.value = mockCategories
    } catch (error) {
      console.error('获取分类列表失败:', error)
    }
  }

  /** 获取浏览量排行 */
  const fetchTopArticles = async (limit = 10) => {
    try {
      // TODO: 接入真实 API: GET /posts/top?limit=10
      // topViewedArticles.value = await getTopArticlesApi(limit)
      topViewedArticles.value = allArticles.value
        .filter(a => a.status === 1)
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, limit)
    } catch (error) {
      console.error('获取浏览量排行失败:', error)
    }
  }

  /** 待审核文章列表（status=2，由 fetchPendingArticles 填充） */
  const pendingArticles = ref<ArticleListItem[]>([])

  /** 获取待审核文章列表 */
  const fetchPendingArticles = async () => {
    try {
      // TODO: 接入真实 API: GET /posts/pending
      // pendingArticles.value = await getPendingArticlesApi()
      pendingArticles.value = allArticles.value.filter(a => a.status === 2)
    } catch (error) {
      console.error('获取待审核文章失败:', error)
    }
  }

  /** 审核通过（2→1，文章发布） */
  const approveArticle = async (id: number) => {
    try {
      // TODO: 接入真实 API: PUT /posts/{id}/approve
      // await approveArticleApi(id)
      const pending = allArticles.value.find(a => a.id === id)
      if (pending) {
        pending.status = 1
        pending.publishedAt = new Date().toISOString()
      }
      pendingArticles.value = pendingArticles.value.filter(a => a.id !== id)
    } catch (error) {
      console.error('审核通过失败:', error)
    }
  }

  /** 审核驳回（2→0，退回草稿） */
  const rejectArticle = async (id: number) => {
    try {
      // TODO: 接入真实 API: PUT /posts/{id}/reject
      // await rejectArticleApi(id)
      const pending = allArticles.value.find(a => a.id === id)
      if (pending) {
        pending.status = 0
      }
      pendingArticles.value = pendingArticles.value.filter(a => a.id !== id)
    } catch (error) {
      console.error('审核驳回失败:', error)
    }
  }

  /** 获取文章详情 */
  const fetchArticleById = async (id: number) => {
    loading.value = true
    try {
      // TODO: 接入真实 API: GET /posts/{id}
      // currentArticle.value = await getArticleByIdApi(id)

      const listItem = allArticles.value.find(a => a.id === id)
      if (listItem) {
        currentArticle.value = {
          ...listItem,
          contentMd: `# ${listItem.title}\n\n这是一篇关于 ${listItem.title} 的详细文章。\n\n## 章节1\n\n内容详情...\n\n## 章节2\n\n更多内容...`,
          contentHtml: `<h1>${listItem.title}</h1><p>这是一篇关于 ${listItem.title} 的详细文章。</p>`,
          liked: false,
          favorited: false,
          viewCount: listItem.viewCount + 1,
        }
        // 更新全局数据中的浏览数
        const idx = allArticles.value.findIndex(a => a.id === id)
        if (idx > -1) {
          allArticles.value[idx].viewCount += 1
        }
      }
    } catch (error) {
      console.error('获取文章详情失败:', error)
    } finally {
      loading.value = false
    }
    return currentArticle.value
  }

  /** 创建文章 */
  const createArticle = async (payload: ArticlePayload): Promise<Article | null> => {
    try {
      // TODO: 接入真实 API: POST /posts
      // return await createArticleApi(payload)

      const tagObjs = payload.tags
        .map(tagId => mockTags.find(t => t.id === tagId))
        .filter((t): t is Tag => !!t)

      const newArticle: Article = {
        id: Math.max(...allArticles.value.map(a => a.id), 0) + 1,
        userId: 1,
        title: payload.title,
        contentMd: payload.contentMd,
        contentHtml: '',
        summary: payload.summary || payload.contentMd.replace(/[#*`>\-\[\]()!|[\]{}]/g, '').substring(0, 150).trim(),
        coverImage: payload.coverImage || '',
        readingTime: payload.readingTime || 0,
        viewCount: 0,
        likeCount: 0,
        favCount: 0,
        commentCount: 0,
        status: payload.status ?? 1,
        allowComment: payload.allowComment ?? true,
        isTop: false,
        // 仅 status=1（已发布/审核通过）才设置发布时间；草稿/待审核不显示在首页
        publishedAt: payload.status === 1 ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: tagObjs,
        authorNickname: '当前用户',
        authorAvatar: '',
        liked: false,
        favorited: false,
      }
      allArticles.value.unshift(newArticle)
      return newArticle
    } catch (error) {
      console.error('创建文章失败:', error)
      return null
    }
  }

  /** 更新文章 */
  const updateArticle = async (id: number, payload: Partial<ArticlePayload>) => {
    try {
      // TODO: 接入真实 API: PUT /posts/{id}
      // return await updateArticleApi(id, payload)

      const index = allArticles.value.findIndex(a => a.id === id)
      if (index > -1) {
        allArticles.value[index] = {
          ...allArticles.value[index],
          ...(payload.title && { title: payload.title }),
          ...(payload.summary && { summary: payload.summary }),
          ...(payload.coverImage !== undefined && { coverImage: payload.coverImage }),
          updatedAt: new Date().toISOString(),
        }
      }
    } catch (error) {
      console.error('更新文章失败:', error)
    }
  }

  /** 删除文章 */
  const deleteArticle = async (id: number) => {
    try {
      // TODO: 接入真实 API: DELETE /posts/{id}
      // await deleteArticleApi(id)

      const index = allArticles.value.findIndex(a => a.id === id)
      if (index > -1) {
        allArticles.value.splice(index, 1)
      }
    } catch (error) {
      console.error('删除文章失败:', error)
    }
  }

  /** 点赞文章 */
  const likeArticle = async (id: number) => {
    try {
      // TODO: 接入真实 API: POST /posts/{id}/like
      // const { likeCount } = await likeArticleApi(id)
      // ...update local state

      const article = allArticles.value.find(a => a.id === id)
      if (article) {
        article.likeCount += 1
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  /** 收藏文章 */
  const favoriteArticle = async (id: number) => {
    try {
      // TODO: 接入真实 API: POST /posts/{id}/favorite
      // const { favCount } = await favoriteArticleApi(id)

      const article = allArticles.value.find(a => a.id === id)
      if (article) {
        article.favCount += 1
      }
    } catch (error) {
      console.error('收藏失败:', error)
    }
  }

  /** 重置筛选 */
  const resetSelection = () => {
    selectedTag.value = null
    currentPage.value = 1
  }

  /** 加载更多 */
  const loadMore = () => {
    if (hasMore.value) {
      currentPage.value += 1
    }
  }

  return {
    articles: allArticles,
    tags,
    categories,
    selectedTag,
    selectedCategory,
    currentArticle,
    currentPage,
    paginatedArticles,
    filteredArticles,
    totalCount,
    totalArticles,
    hasMore,
    topViewedArticles,
    pendingArticles,
    loading,
    fetchTags,
    fetchCategories,
    fetchArticles,
    fetchTopArticles,
    fetchPendingArticles,
    approveArticle,
    rejectArticle,
    fetchArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    likeArticle,
    favoriteArticle,
    resetSelection,
    loadMore,
  }
})