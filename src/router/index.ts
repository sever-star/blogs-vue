import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    // AI 助手对游客开放（会话按 IP 归属），因此不加 requiresAuth
    path: '/ai',
    name: 'AiChat',
    component: () => import('@/views/AiChat.vue'),
  },
  {
    path: '/write',
    name: 'Write',
    component: () => import('@/views/WriteArticle.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/write/:id',
    name: 'WriteEdit',
    component: () => import('@/views/WriteArticle.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 我的文章（含草稿），从头像菜单以新标签页打开
    path: '/my-articles',
    name: 'MyArticles',
    component: () => import('@/views/MyArticles.vue'),
    meta: { requiresAuth: true }
  },
  {
    // 站内通知（从头像菜单/铃铛「查看全部」进入）
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import('@/views/ArticleDetail.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/components/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    redirect: '/admin/categories',
    children: [
      {
        path: 'categories',
        name: 'AdminCategories',
        component: () => import('@/views/admin/AdminCategories.vue'),
      },
      {
        path: 'tags',
        name: 'AdminTags',
        component: () => import('@/views/admin/AdminTags.vue'),
      },
      {
        path: 'review',
        name: 'AdminReview',
        component: () => import('@/views/admin/AdminReview.vue'),
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/AdminUsers.vue'),
      },
    ],
  },
]

function getRouterBase() {
  const proxyPrefix = window.location.pathname.match(/^\/proxy\/[^/]+\/?/)
  return proxyPrefix?.[0] || '/'
}

const router = createRouter({
  history: createWebHistory(getRouterBase()),
  routes,
  // 滚动行为：进入新页面回顶部；后退/前进（如从文章详情返回首页）恢复离开时的滚动位置。
  // 不配置时 SPA 切换沿用上一页的 scrollY：点进文章会停在页面中部，返回后位置也对不上。
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition || { top: 0 }
  },
})

// 路由守卫：检查是否需要认证
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    // 刷新进入受保护路由时，等待用户态恢复完成，
    // 避免「已登录但 user 尚未拉回」的窗口期被误判为未登录而弹出登录框。
    await authStore.ensureReady()
    if (!authStore.isLoggedIn) {
      authStore.showLoginModal = true
      next(false)
      return
    }
  }
  // 管理页面仅管理员可见（子路由通过 matched 继承 requiresAdmin）
  if (to.matched.some((record) => record.meta.requiresAdmin) && !authStore.isAdmin) {
    next('/')
    return
  }
  next()
})

export default router
