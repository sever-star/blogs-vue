# 个人博客前端 - 架构设计文档

## 目录
1. [系统架构](#系统架构)
2. [分层设计](#分层设计)
3. [数据流](#数据流)
4. [核心模块](#核心模块)
5. [扩展指南](#扩展指南)

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Header  │  │   Home   │  │  Write   │  │ ArticleDetail    │ │
│  │(共用)    │  │ (首页)   │  │(写文章)  │  │  (文章详情)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Components Layer                             │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │LoginModal    │  │ArticleCard  │  │CommentSection           │  │
│  │(登录弹窗)   │  │(文章卡片)  │  │(评论区)                 │  │
│  └──────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layer                         │
│           (Pinia Store - 应用状态管理)                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────────────┐   │
│  │ AuthStore  │  │ArticleStore│  │ CommentStore            │   │
│  │• 登录状态  │  │• 文章数据  │  │ • 评论数据              │   │
│  │• 用户信息  │  │• 标签状态  │  │ • 加载状态              │   │
│  │• Token管理 │  │• 分页信息  │  │                         │   │
│  └────────────┘  └────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ article.ts   │  │ comment.ts   │  │ http.ts (HTTP客户端)  │  │
│  │(文章接口)   │  │(评论接口)   │  │                        │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Mock/Backend Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ articles.ts  │  │ comments.ts  │  │ 真实后端API           │  │
│  │(文章Mock)   │  │(评论Mock)   │  │ (替换Mock数据)        │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 分层设计

### 1. UI Layer (用户界面层)

**职责**: 展示用户界面，接收用户交互

**包含**:
- `views/`: 页面级组件
  - `Home.vue`: 首页
  - `WriteArticle.vue`: 写文章页
  - `ArticleDetail.vue`: 文章详情页
- `components/`: 公共组件
  - `Header.vue`: 顶部导航
  - `LoginModal.vue`: 登录/注册
  - `ArticleCard.vue`: 文章卡片
  - `CommentSection.vue`: 评论区

**数据流**:
```
用户交互 → Vue 事件处理 → 调用 Store Action → 更新 Store 状态 → UI 自动重新渲染
```

### 2. State Management Layer (状态管理层)

**职责**: 集中管理应用全局状态，响应式数据更新

**使用 Pinia**:
```typescript
// 定义 Store
export const useAuthStore = defineStore('auth', () => {
  // 状态
  const token = ref('')
  const user = ref(null)
  
  // 计算属性
  const isLoggedIn = computed(() => !!token.value)
  
  // 方法
  function login(username, password) {
    // 逻辑处理
  }
  
  return { token, user, isLoggedIn, login }
})

// 在组件中使用
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
// 自动响应式：当 authStore.token 改变时，UI 自动更新
```

**包含 Stores**:
| Store | 职责 |
|------|------|
| `auth.ts` | 用户认证、登录状态管理 |
| `article.ts` | 文章数据、分页、标签过滤 |
| `comment.ts` | 评论数据管理 |

### 3. API Layer (API 接口层)

**职责**: 封装所有与后端的通信

**分为两部分**:

#### a) HTTP 客户端 (`http.ts`)
```typescript
import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})

// 请求拦截器：自动添加 Token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理错误
http.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
)

export default http
```

#### b) 接口定义 (`article.ts`, `comment.ts`)
```typescript
// 返回 Promise，隐藏内部实现细节
export async function getArticles(): Promise<Article[]> {
  // 开发环境使用 Mock 数据
  // 生产环境调用真实 API
}
```

**核心设计模式**:
- 接口函数返回 Promise
- 内部切换 Mock/真实 API
- 统一的错误处理

### 4. Mock/Backend Layer (模拟/后端层)

**职责**: 模拟后端数据或连接真实后端

**Mock 数据** (`mock/`):
```typescript
// 模拟数据集
export const mockArticles: Article[] = [
  { id: 1, title: '...', ... },
  { id: 2, title: '...', ... },
]

// 模拟异步操作（延迟返回）
export function getMockArticles(): Promise<Article[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...mockArticles])
    }, 300)
  })
}
```

**后端替换**:
```typescript
// 当后端就位时，只需修改这里
export async function getArticles(): Promise<Article[]> {
  // 旧代码（注释）：
  // return await getMockArticles()
  
  // 新代码：
  const response = await http.get('/articles')
  return response.data
}
```

---

## 数据流

### 用户登录流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. 用户在 Header 中点击「登录」按钮                             │
│    Header.vue → handleLoginClick() → authStore.openLoginModal() │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. LoginModal 弹窗显示，用户输入账号密码                       │
│    LoginModal.vue → handleSubmit()                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 调用 API 进行登录                                            │
│    authStore.login() → http.post('/auth/login')               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. 更新状态和本地存储                                          │
│    authStore: token, user ← 响应数据                           │
│    localStorage: token 持久化                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. UI 自动更新                                                  │
│    Header 显示用户头像替代登录按钮                             │
│    写文章页面变为可用                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 获取文章列表流程

```
┌───────────────────────────────────────────────────────────────┐
│ Home.vue 挂载 (onMounted)                                      │
└───────────────────────────────────────────────────────────────┘
              ↓
┌───────────────────────────────────────────────────────────────┐
│ articleStore.fetchArticles()                                   │
│   ↓                                                            │
│ api/article.ts: getArticles()                                 │
│   ↓                                                            │
│ 选择数据源：                                                   │
│  • 开发环境: getMockArticles() (返回模拟数据)                 │
│  • 生产环境: http.get('/articles') (调用真实 API)           │
└───────────────────────────────────────────────────────────────┘
              ↓
┌───────────────────────────────────────────────────────────────┐
│ 更新 Store 状态:                                               │
│ articleStore.articles = 响应数据                              │
│ articleStore.loading = false                                  │
└───────────────────────────────────────────────────────────────┘
              ↓
┌───────────────────────────────────────────────────────────────┐
│ Vue 自动更新视图:                                              │
│ 文章列表渲染 (使用 paginatedArticles 计算属性)                 │
└───────────────────────────────────────────────────────────────┘
```

### 标签筛选流程

```
Home.vue 中标签点击:
  ↓
handleTagClick(tag)
  ↓
articleStore.selectTag(tag)
  ↓
Store 状态更新:
  • selectedTag = tag
  • currentPage = 1
  ↓
计算属性 filteredArticles 重新计算:
  • 过滤 articles 中与 selectedTag 匹配的项
  ↓
计算属性 paginatedArticles 重新计算:
  • 从 filteredArticles 中截取当前页数据
  ↓
UI 自动重新渲染
```

---

## 核心模块详解

### 1. 认证模块 (Auth)

**位置**: `stores/auth.ts`, `components/LoginModal.vue`

**职责**:
- 管理用户登录/注册
- 存储和维护 Token
- 提供用户信息

**核心代码**:
```typescript
export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function login(username: string, password: string) {
    // 调用 API 或 Mock 登录
    // 更新 token 和 user
    // 保存 token 到 localStorage
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }

  return { token, user, isLoggedIn, login, logout }
})
```

### 2. 文章模块 (Article)

**位置**: `stores/article.ts`, `views/Home.vue`, `views/ArticleDetail.vue`

**职责**:
- 管理文章数据
- 处理分页逻辑
- 处理标签过滤

**核心代码**:
```typescript
export const useArticleStore = defineStore('article', () => {
  const articles = ref<Article[]>([])
  const currentPage = ref(1)
  const selectedTag = ref('全部')
  const pageSize = 10

  // 计算属性：过滤后的文章
  const filteredArticles = computed(() => {
    if (selectedTag.value === '全部') return articles.value
    return articles.value.filter(a => a.tags.includes(selectedTag.value))
  })

  // 计算属性：当前页文章
  const paginatedArticles = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredArticles.value.slice(start, start + pageSize)
  })

  // 加载更多
  function loadMore() {
    if (hasMore.value) currentPage.value++
  }

  // 选择标签
  function selectTag(tag: string) {
    selectedTag.value = tag
    currentPage.value = 1 // 重置到第一页
  }

  return { articles, filteredArticles, paginatedArticles, selectTag, loadMore }
})
```

### 3. 评论模块 (Comment)

**位置**: `stores/comment.ts`, `components/CommentSection.vue`

**职责**:
- 管理评论数据
- 缓存各文章的评论

**核心代码**:
```typescript
export const useCommentStore = defineStore('comment', () => {
  // 使用 Map 缓存各文章的评论
  const comments = ref<Map<number, Comment[]>>(new Map())

  async function fetchComments(articleId: number) {
    if (!comments.value.has(articleId)) {
      const data = await getComments(articleId)
      comments.value.set(articleId, data)
    }
  }

  function getArticleComments(articleId: number): Comment[] {
    return comments.value.get(articleId) || []
  }

  return { comments, fetchComments, getArticleComments }
})
```

---

## 扩展指南

### 添加新的页面

**步骤 1: 创建页面组件**
```vue
<!-- src/views/NewPage.vue -->
<template>
  <main class="new-page">
    <!-- 页面内容 -->
  </main>
</template>

<script setup lang="ts">
// 组件逻辑
</script>

<style scoped>
/* 页面样式 */
</style>
```

**步骤 2: 添加路由**
```typescript
// src/router/index.ts
const routes: RouteRecordRaw[] = [
  // ... 其他路由
  {
    path: '/new-page',
    name: 'NewPage',
    component: () => import('@/views/NewPage.vue'),
  },
]
```

**步骤 3: 添加导航链接**
```vue
<!-- src/components/Header.vue -->
<router-link to="/new-page" class="nav-link">新页面</router-link>
```

### 添加新的 Store

**步骤 1: 创建 Store 文件**
```typescript
// src/stores/newModule.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNewModuleStore = defineStore('newModule', () => {
  const data = ref([])

  async function fetchData() {
    // 获取数据逻辑
  }

  return { data, fetchData }
})
```

**步骤 2: 在组件中使用**
```typescript
import { useNewModuleStore } from '@/stores/newModule'

const newModuleStore = useNewModuleStore()
```

### 添加新的 API 接口

**步骤 1: 创建接口文件**
```typescript
// src/api/newApi.ts
import http from './http'
import { getMockNewData } from './mock/newApi'

export async function getNewData() {
  try {
    // 生产环境
    // return await http.get('/new-endpoint')
    
    // 开发环境
    return await getMockNewData()
  } catch (error) {
    console.error('获取数据失败:', error)
    throw error
  }
}
```

**步骤 2: 创建 Mock 数据**
```typescript
// src/api/mock/newApi.ts
export const mockNewData = [
  // Mock 数据
]

export function getMockNewData() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([...mockNewData])
    }, 300)
  })
}
```

**步骤 3: 在 Store 中调用**
```typescript
// src/stores/newModule.ts
import { getNewData } from '@/api/newApi'

async function fetchData() {
  const data = await getNewData()
  // 处理数据
}
```

### 处理过滤和搜索

**在 Store 中添加计算属性**:
```typescript
const searchKeyword = ref('')

const filteredData = computed(() => {
  if (!searchKeyword.value) return data.value
  return data.value.filter(item =>
    item.title.includes(searchKeyword.value) ||
    item.content.includes(searchKeyword.value)
  )
})

function search(keyword: string) {
  searchKeyword.value = keyword
  currentPage.value = 1 // 重置分页
}
```

### 处理无限滚动

**使用 Intersection Observer**:
```typescript
let observer: IntersectionObserver | null = null

onMounted(() => {
  setupIntersectionObserver()
})

function setupIntersectionObserver() {
  if (!scrollTrigger.value) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore.value && !loading.value) {
          loadMore()
        }
      })
    },
    {
      root: null,
      rootMargin: '100px', // 距离底部 100px 时触发
      threshold: 0.01,
    }
  )

  observer.observe(scrollTrigger.value)
}

onUnmounted(() => {
  observer?.disconnect()
})
```

---

## 最佳实践

1. **状态管理**
   - 将全局状态放在 Store
   - 局部状态可在组件中用 ref/reactive
   - 避免在组件中直接修改其他组件的状态

2. **API 调用**
   - 所有 API 调用都通过 API 层
   - Store 中调用 API，组件中调用 Store
   - 使用 try-catch 处理错误

3. **组件设计**
   - 单一职责原则
   - Props down, Events up
   - 使用 TypeScript 进行类型检查

4. **性能优化**
   - 使用计算属性而非在模板中计算
   - 使用虚拟滚动处理大列表
   - 懒加载图片和路由

5. **错误处理**
   - 统一的错误处理
   - 用户友好的错误提示
   - 错误日志记录

---

## 总结

本博客前端采用分层架构设计，清晰的职责划分使代码易于维护和扩展。通过 Pinia 进行集中状态管理，通过 API 层抽象后端调用，使得前后端解耦，便于独立开发和测试。
