<template>
  <el-dialog
    :model-value="authStore.showLoginModal"
    :title="authStore.loginMode === 'login' ? '登录' : '注册'"
    width="400px"
    :close-on-click-modal="false"
    :before-close="handleBeforeClose"
  >
    <!-- Login Form -->
    <el-form
      v-if="authStore.loginMode === 'login'"
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-width="0"
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
          placeholder="密码"
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

    <!-- Toggle mode -->
    <div class="toggle-mode">
      <span class="toggle-text">
        {{ authStore.loginMode === 'login' ? '没有账户？' : '已有账户？' }}
        <el-button link type="primary" @click="toggleMode">
          {{ authStore.loginMode === 'login' ? '去注册' : '去登录' }}
        </el-button>
      </span>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="loading"
        @click="authStore.loginMode === 'login' ? handleLogin() : handleRegister()"
      >
        {{ authStore.loginMode === 'login' ? '登录' : '注册' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const loading = ref(false)

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
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-form-item) {
  margin-bottom: 16px;
}
.toggle-mode {
  margin-top: 8px;
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
}
</style>
