import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
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
    path: '/article/:id',
    name: 'ArticleDetail',
    component: () => import('@/views/ArticleDetail.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/components/AdminLayout.vue'),
    meta: { requiresAuth: true },
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
  next()
})

export default router
