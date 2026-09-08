import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import {
  getCurrentUser as getCurrentUserApi,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
  updateProfile as updateProfileApi,
} from '@/api/auth'
import type { UpdateProfileParams } from '@/api/auth'
import { randomAvatar, defaultAvatar, hasAvatar } from '@/utils/avatar'
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from '@/utils/token'

export type { User }

/** 若用户没有头像，用 username 稳定取一张默认头像（保证界面始终有头像，且每次登录不变） */
function ensureAvatar(u: User | null): User | null {
  if (!u) return null
  if (!hasAvatar(u.avatar)) {
    return { ...u, avatar: defaultAvatar(u.username) }
  }
  return u
}

export const useAuthStore = defineStore('auth', () => {
  // ---- 状态 ----
  const accessToken = ref<string | null>(getAccessToken())
  const user = ref<User | null>(null)
  const showLoginModal = ref(false)
  const loginMode = ref<'login' | 'register'>('login')

  // ---- 计算属性 ----
  const isLoggedIn = computed(() => !!accessToken.value && !!user.value)

  // ---- 内部方法 ----
  async function fetchUser() {
    if (!accessToken.value) return
    try {
      user.value = ensureAvatar(await getCurrentUserApi())
    } catch {
      // Token 过期或无效
      accessToken.value = null
      user.value = null
      removeAccessToken()
    }
  }

  // ---- 公开方法 ----

  /** 登录。只负责发请求 + 存状态，不关闭弹窗。 */
  async function login(username: string, password: string): Promise<boolean> {
    try {
      const res = await loginApi(username, password)
      if (!res?.accessToken) {
        console.error('[auth] 登录响应缺少 accessToken:', res)
        return false
      }
      accessToken.value = res.accessToken
      setAccessToken(res.accessToken)
      user.value = ensureAvatar(res.user ?? null)

      // 如果登录接口没返回 user，主动请求
      if (!res.user) {
        await fetchUser()
      }

      // 验证 user 是否已设置
      if (!user.value) {
        console.error('[auth] 登录后未能获取用户信息')
        return false
      }

      return true
    } catch (error) {
      console.error('[auth] 登录失败:', error)
      return false
    }
  }

  /**
   * 注册。请求成功即视为注册成功（后端 code=0）。
   * 注册后不自动登录 —— 前端切回登录页，由用户重新登录。
   */
  async function register(username: string, email: string, password: string): Promise<boolean> {
    try {
      const avatar = randomAvatar()
      await registerApi({ username, email, password, avatar, nickname: username })
      return true
    } catch (error) {
      console.error('[auth] 注册失败:', error)
      return false
    }
  }

  /** 登出 */
  async function logout() {
    try {
      // 通知后端失效 refreshToken 并清除 cookie
      await logoutApi()
    } finally {
      accessToken.value = null
      user.value = null
      removeAccessToken()
    }
  }

  /** 更新当前用户资料。成功返回 true，并同步到本地 user 状态。 */
  async function updateProfile(params: UpdateProfileParams): Promise<boolean> {
    try {
      const updated = await updateProfileApi(params)
      user.value = ensureAvatar(updated ?? user.value)
      return true
    } catch (error) {
      console.error('[auth] 更新资料失败:', error)
      return false
    }
  }

  /** 打开登录弹窗 */
  function openLoginModal(mode: 'login' | 'register' = 'login') {
    loginMode.value = mode
    showLoginModal.value = true
  }

  /** 关闭登录弹窗 */
  function closeLoginModal() {
    showLoginModal.value = false
  }

  // ---- 初始化：有 token 则恢复用户 ----
  // 首次加载/刷新时 fetchUser() 是异步的，路由守卫必须等待其完成后再判断登录态，
  // 否则会在「有 token 但 user 尚未拉回」的窗口期被误判为未登录，从而弹出登录框。
  let readyResolve!: () => void
  const readyPromise = new Promise<void>((resolve) => {
    readyResolve = resolve
  })
  /** 等待首次用户态恢复完成（刷新场景用） */
  function ensureReady(): Promise<void> {
    return readyPromise
  }

  if (accessToken.value) {
    fetchUser().finally(readyResolve)
  } else {
    readyResolve()
  }

  // 被强制登出（accessToken 过期且刷新失败）后，自动弹出登录框
  if (sessionStorage.getItem('auth:require-login') === '1') {
    sessionStorage.removeItem('auth:require-login')
    showLoginModal.value = true
  }

  return {
    accessToken,
    user,
    isLoggedIn,
    showLoginModal,
    loginMode,
    login,
    register,
    logout,
    updateProfile,
    openLoginModal,
    closeLoginModal,
    ensureReady,
  }
})
