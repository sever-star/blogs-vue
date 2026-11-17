<template>
  <el-dialog
    :model-value="authStore.showLoginModal"
    width="640px"
    class="island-dialog"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    :show-close="false"
    :before-close="handleBeforeClose"
    modal-class="island-dialog-overlay"
    align-center
  >
    <div class="dialog-inner">
      <!-- 左侧：海洋品牌区 -->
      <div class="brand-panel">
        <!-- 装饰波浪 -->
        <svg class="brand-waves" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
          <path fill="rgba(255,255,255,0.16)" d="M0 95C45 70 78 70 120 92s72 22 120 2 60-16 60-16v42H0Z" />
          <path fill="rgba(255,255,255,0.10)" d="M0 118c50-18 88-18 136 2s80 14 120-2 44-8 44-8v10H0Z" />
        </svg>

        <!-- 岛屿剪影（从海面徐徐浮起） -->
        <div class="brand-land">
          <svg class="land-svg" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="rgba(255,255,255,0.92)" d="M4 15.2c1.6-2.4 3.8-3.4 8-3.4s6.4 1 8 3.4c.5.7.9 1.4 1 1.9 0 .4-.3.7-.7.7H3.7a.7.7 0 0 1-.7-.7c.1-.5.5-1.2 1-1.9Z" />
            <path fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="1.3" stroke-linecap="round" d="M12 12c0-.8-1.4-4.6-1.4-5.8 0-1-.8-1.4-1.2-.9" />
            <path fill="rgba(255,255,255,0.92)" d="M9.2 4.2c-1.8-.4-3.2.2-3 1.7.2 1.3 1.5 2 3 .9s2.2-2.1 0-2.6ZM10.4 7c-1.2 1.3-1.5 2.9-.4 3.9 1.1 1 2.7.4 3-1.1s-.7-3.4-2.6-2.8Z" />
            <path fill="rgba(255,255,255,0.92)" d="M13.6 4.6c1.8-.6 3.3-.1 3.2 1.4-.1 1.3-1.4 2.1-3 1.1s-2-2.3-.2-2.5Z" />
          </svg>
          <!-- 海面月光弧线 -->
          <span class="land-shine"></span>
        </div>

        <!-- 品牌文案 -->
        <div class="brand-text">
          <h2 class="brand-title">{{ isLogin ? '欢迎回岛' : '加入岛屿博客' }}</h2>
          <p class="brand-slogan">{{ isLogin ? '继续你的岛屿之旅' : '在这里造一座属于你的小岛' }}</p>
          <div class="brand-points">
            <span class="brand-point"><i></i> 记录学习与思考</span>
            <span class="brand-point"><i></i> 与同好相遇在海面</span>
            <span class="brand-point"><i></i> 星辰与海浪为伴</span>
          </div>
        </div>

        <!-- 海鸥点缀 -->
        <svg class="brand-seagull" viewBox="0 0 40 20" aria-hidden="true">
          <path d="M2 12c6-6 10-6 18 0-2-3-6-4-9-3-2 0-5-1-9 3Z" fill="rgba(255,255,255,0.65)" />
          <path d="M22 6c5-4 9-4 14 0" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="1.6" stroke-linecap="round" />
        </svg>
      </div>

      <!-- 右侧：表单区 -->
      <div class="form-panel">
        <span class="close-x" @click="close" aria-label="关闭">
          <el-icon :size="18"><Close /></el-icon>
        </span>

        <h3 class="form-heading">{{ isLogin ? '登 录' : '注 册' }}</h3>

        <!-- Login Form -->
        <el-form
          v-if="isLogin"
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          label-width="0"
          size="large"
          class="island-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="用户名"
              clearable
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              placeholder="密码"
              type="password"
              show-password
              clearable
              @keyup.enter="handleLogin"
            />
          </el-form-item>
        </el-form>

        <!-- Register Form -->
        <el-form
          v-else
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          label-width="0"
          size="large"
          class="island-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              placeholder="用户名"
              clearable
            />
          </el-form-item>
          <el-form-item prop="email">
            <el-input
              v-model="registerForm.email"
              placeholder="邮箱"
              type="email"
              clearable
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              placeholder="密码（至少 6 位）"
              type="password"
              show-password
              clearable
            />
          </el-form-item>
          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              placeholder="确认密码"
              type="password"
              show-password
              clearable
            />
          </el-form-item>
        </el-form>

        <!-- 提交 -->
        <el-button
          class="submit-btn"
          type="primary"
          :loading="loading"
          @click="isLogin ? handleLogin() : handleRegister()"
        >
          {{ isLogin ? '登录 · 登岛' : '注册 · 起航' }}
        </el-button>

        <!-- Toggle mode -->
        <div class="toggle-mode">
          <span class="toggle-text">
            {{ isLogin ? '还没有小岛？' : '已有小岛？' }}
            <el-button link type="primary" @click="toggleMode">
              {{ isLogin ? '去注册' : '去登录' }}
            </el-button>
          </span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)

/** 当前是否为登录模式（左侧品牌文案、主按钮文案联动） */
const isLogin = computed(() => authStore.loginMode === 'login')

// ---- 表单 ----

const loginFormRef = ref<FormInstance>()
const loginForm = reactive({ username: '', password: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  username: '', email: '', password: '', confirmPassword: '',
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (!value) return callback(new Error('请再次输入密码'))
  if (value !== registerForm.password) return callback(new Error('两次输入密码不一致'))
  callback()
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3 到 20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为 6 到 20 个字符', trigger: 'blur' },
  ],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }],
}

// ---- 弹窗关闭控制 ----

/**
 * 不可重入守卫：确保同一时刻只执行一次关闭。
 * beforeClose(done) 的回调和「取消」按钮都会调用 close()，
 * 用 closing 标记避免 Element Plus 的 beforeClose → done → 二次触发。
 */
let closing = false

function close() {
  if (closing) return
  closing = true
  authStore.closeLoginModal()
  clearForms()
  // 等关闭动画完成后再释放标记
  setTimeout(() => { closing = false }, 350)
}

/** before-close：仅用户操作（X / Esc / 遮罩）时触发，不走 @update:model-value */
function handleBeforeClose(done: () => void) {
  close()
  done()
}

function toggleMode() {
  authStore.loginMode = authStore.loginMode === 'login' ? 'register' : 'login'
  clearForms()
}

function clearForms() {
  loginFormRef.value?.clearValidate()
  registerFormRef.value?.clearValidate()
  loginForm.username = ''
  loginForm.password = ''
  registerForm.username = ''
  registerForm.email = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

// ---- 登录 / 注册 ----

async function handleLogin() {
  if (!loginFormRef.value) return
  await loginFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    loading.value = true
    try {
      const ok = await authStore.login(loginForm.username, loginForm.password)
      if (ok) {
        ElMessage.success('登录成功')
        close()
      } else {
        ElMessage.error('用户名或密码错误')
      }
    } catch (error) {
      // 拦截器已排除登录接口的 401 刷新分支，这里能正常弹出后端返回的失败原因
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : ''
      ElMessage.error(message || '登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  })
}

async function handleRegister() {
  if (!registerFormRef.value) return
  await registerFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    loading.value = true
    try {
      const ok = await authStore.register(registerForm.username, registerForm.email, registerForm.password)
      if (ok) {
        ElMessage.success('注册成功，请登录')
        // 切换到登录表单
        authStore.loginMode = 'login'
        clearForms()
      } else {
        ElMessage.error('注册失败，用户名或邮箱可能已被使用')
      }
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
/* ---- 弹窗本体：无头大圆角，左右分栏 ---- */
:deep(.island-dialog.el-dialog) {
  border-radius: 20px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(14, 165, 233, 0.25), 0 8px 24px rgba(0, 0, 0, 0.12);
}

:deep(.island-dialog .el-dialog__header) {
  display: none;
}

:deep(.island-dialog .el-dialog__body) {
  padding: 0;
  margin: 0;
}

/* 遮罩加深，聚焦对话框主体 */
:deep(.island-dialog-overlay) {
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(2px);
}

.dialog-inner {
  display: flex;
  min-height: 480px;
}

/* ============ 左侧品牌区（海洋渐变） ============ */
.brand-panel {
  position: relative;
  flex-shrink: 0;
  width: 248px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 28px 24px 34px;
  overflow: hidden;
  background: linear-gradient(165deg, #0ea5e9 0%, #14b8a6 78%, #10a38c 100%);
  color: #fff;
}

/* 海浪光影（缓慢浮动） */
.brand-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 110% -10%, rgba(255, 255, 255, 0.28) 0%, transparent 55%);
}

.brand-waves {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 90px;
  pointer-events: none;
}

/* 岛屿剪影：从海面浮起 */
.brand-land {
  position: relative;
  width: 84px;
  height: 84px;
  margin: 0 auto 6px;
  animation: land-rise 0.9s ease-out both;
}

.land-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 6px 14px rgba(2, 44, 34, 0.35));
}

/* 海面月光弧线 */
.land-shine {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 4px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  animation: shine-pulse 3.2s ease-in-out infinite;
}

@keyframes land-rise {
  0% { transform: translateY(24px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes shine-pulse {
  0%, 100% { opacity: 0.35; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1.05); }
}

.brand-text {
  position: relative;
  z-index: 1;
  animation: text-fade-in 0.7s ease-out 0.15s both;
}

@keyframes text-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
}

.brand-slogan {
  margin: 0 0 18px;
  font-size: 13px;
  opacity: 0.85;
}

.brand-points {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  opacity: 0.9;
}

.brand-point {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 小气泡点 */
.brand-point i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
}

/* 海鸥：缓缓滑过 */
.brand-seagull {
  position: absolute;
  top: 34px;
  left: -60px;
  width: 44px;
  height: 22px;
  animation: seagull-fly 14s linear infinite;
}

@keyframes seagull-fly {
  0% { transform: translateX(-20px) translateY(0); opacity: 0; }
  8% { opacity: 1; }
  45% { transform: translateX(260px) translateY(-14px); }
  55% { opacity: 1; }
  92% { transform: translateX(560px) translateY(-4px); opacity: 1; }
  100% { transform: translateX(600px) translateY(-4px); opacity: 0; }
}

/* ============ 右侧表单区 ============ */
.form-panel {
  position: relative;
  flex: 1;
  padding: 44px 40px 30px;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.close-x {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #9aa7b3;
  cursor: pointer;
  transition: all 0.2s;
}

.close-x:hover {
  background: #f0f7f9;
  color: var(--el-color-primary);
}

.form-heading {
  margin: 0 0 22px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 6px;
  text-align: center;
}

.form-heading::after {
  content: '';
  display: block;
  width: 44px;
  height: 3px;
  margin: 10px auto 0;
  border-radius: 999px;
  background: var(--island-gradient);
}

/* 大尺寸圆角输入框：去底色、focus 海蓝描边 */
.island-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.island-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  background: #f6fafc;
  box-shadow: 0 0 0 1px transparent inset;
  transition: all 0.25s;
}

.island-form :deep(.el-input__wrapper:hover) {
  background: #f0f8fb;
}

.island-form :deep(.el-input__wrapper.is-focus) {
  background: #fff;
  box-shadow: 0 0 0 1.5px var(--el-color-primary) inset, 0 6px 16px rgba(14, 165, 233, 0.12);
}

.island-form :deep(.el-input__inner) {
  caret-color: var(--el-color-primary);
}

/* 提交按钮：全宽 + 海洋渐变 */
.submit-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  border: none;
  border-radius: 22px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  background: var(--island-gradient);
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.35);
  transition: all 0.25s;
}

.submit-btn:hover {
  background: var(--island-gradient);
  filter: brightness(1.06);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(20, 184, 166, 0.42);
}

.submit-btn:active {
  transform: translateY(0);
}

.submit-btn.is-loading {
  background: var(--island-gradient);
}

.toggle-mode {
  margin-top: 16px;
  text-align: center;
}

.toggle-text {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
}

:deep(.toggle-text .el-button--link) {
  font-size: 13px;
  padding: 0;
  vertical-align: baseline;
  font-weight: 600;
}

/* ============ 响应式：窄屏隐藏品牌区 ============ */
@media (max-width: 640px) {
  .brand-panel {
    display: none;
  }
  .form-panel {
    padding: 40px 28px 28px;
  }
}
</style>
