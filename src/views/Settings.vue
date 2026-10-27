<template>
  <div class="settings-page">
    <div class="settings-container">
      <h2 class="page-title">账号设置</h2>

      <!-- 个人信息卡：原个人信息页迁入 -->
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">{{ isEditing ? '编辑资料' : '个人信息' }}</span>
            <div class="card-actions">
              <template v-if="isEditing">
                <el-button @click="cancelEdit">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
              </template>
              <el-button v-else type="primary" plain @click="startEdit">
                <el-icon style="margin-right: 4px"><Edit /></el-icon>
                编辑资料
              </el-button>
            </div>
          </div>
        </template>

        <!-- 展示模式 -->
        <template v-if="!isEditing">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="昵称">{{ user?.nickname || '—' }}</el-descriptions-item>
            <el-descriptions-item label="用户名">{{ user?.username || '—' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user?.email || '—' }}</el-descriptions-item>
            <el-descriptions-item label="个人简介">{{ user?.bio || '—' }}</el-descriptions-item>
            <el-descriptions-item label="个人网站">
              <el-link v-if="user?.website" :href="user.website" target="_blank" type="primary">
                {{ user.website }}
              </el-link>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="GitHub">
              <el-link v-if="user?.github" :href="user.github" target="_blank" type="primary">
                {{ user.github }}
              </el-link>
              <span v-else>—</span>
            </el-descriptions-item>
            <el-descriptions-item label="微博">
              <el-link v-if="user?.weibo" :href="user.weibo" target="_blank" type="primary">
                {{ user.weibo }}
              </el-link>
              <span v-else>—</span>
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 编辑模式 -->
        <el-form
          v-else
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="90px"
          class="profile-form"
        >
          <el-form-item label="头像">
            <div class="avatar-editor">
              <el-avatar :src="displayAvatar" :size="72" class="edit-avatar">
                {{ form.nickname?.charAt(0) || 'U' }}
              </el-avatar>
              <div class="avatar-actions">
                <el-upload
                  :show-file-list="false"
                  :auto-upload="false"
                  :on-change="onSelectFile"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                >
                  <el-button>
                    <el-icon style="margin-right: 4px"><Upload /></el-icon>
                    上传图片
                  </el-button>
                </el-upload>
                <el-button @click="regenerateAvatar">
                  <el-icon style="margin-right: 4px"><Refresh /></el-icon>
                  随机换一个
                </el-button>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="请输入昵称" maxlength="30" show-word-limit />
          </el-form-item>
          <el-form-item label="个人简介" prop="bio">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="3"
              placeholder="介绍一下自己吧"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="个人网站" prop="website">
            <el-input v-model="form.website" placeholder="https://example.com" clearable />
          </el-form-item>
          <el-form-item label="GitHub" prop="github">
            <el-input v-model="form.github" placeholder="https://github.com/xxx" clearable />
          </el-form-item>
          <el-form-item label="微博" prop="weibo">
            <el-input v-model="form.weibo" placeholder="https://weibo.com/xxx" clearable />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 修改密码卡片：与资料卡独立，改密成功后需重新登录（后端会撤销全部会话） -->
      <el-card shadow="never" class="settings-card password-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">修改密码</span>
          </div>
        </template>

        <el-form
          ref="pwdFormRef"
          :model="pwdForm"
          :rules="pwdRules"
          label-width="90px"
          class="profile-form"
        >
          <el-form-item label="原密码" prop="oldPassword">
            <el-input
              v-model="pwdForm.oldPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password
              autocomplete="current-password"
            />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input
              v-model="pwdForm.newPassword"
              type="password"
              placeholder="6-32 位字符"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input
              v-model="pwdForm.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password
              autocomplete="new-password"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="pwdSaving" @click="handleChangePassword">
              确认修改
            </el-button>
          </el-form-item>
        </el-form>
        <p class="password-hint">修改成功后，所有设备（包括当前）都需要重新登录。</p>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import type { FormInstance, UploadFile } from 'element-plus'
import { Edit, Refresh, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { randomAvatar } from '@/utils/avatar'
import { uploadAvatar } from '@/api/upload'
import { changePassword } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const isEditing = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  nickname: '',
  avatar: '',
  bio: '',
  website: '',
  github: '',
  weibo: '',
})

const rules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 30, message: '昵称长度为 1 到 30 个字符', trigger: 'blur' },
  ],
  website: [{ type: 'url', message: '请输入合法的网址，如 https://example.com', trigger: 'blur' }],
  github: [{ type: 'url', message: '请输入合法的网址，如 https://github.com/xxx', trigger: 'blur' }],
  weibo: [{ type: 'url', message: '请输入合法的网址，如 https://weibo.com/xxx', trigger: 'blur' }],
}

// 选中的待上传文件：选文件后先本地预览，点「保存」时才真正上传（避免 OSS 垃圾文件）
const pendingAvatarFile = ref<File | null>(null)
// 本地预览 URL（blob）：选文件后立即预览，不占 OSS
const previewUrl = ref<string | null>(null)

// 展示用头像：优先本地预览，否则用已保存的 URL
const displayAvatar = computed(() => previewUrl.value || form.avatar)

// 释放本地预览、清空待上传文件
function clearPendingAvatar() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  pendingAvatarFile.value = null
}

// 选择文件：生成本地预览并暂存文件，不立即上传
function onSelectFile(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  pendingAvatarFile.value = file
}

// 从默认头像列表中随机换一张（清空已选文件）
function regenerateAvatar() {
  clearPendingAvatar()
  form.avatar = randomAvatar()
}

function fillForm() {
  form.nickname = user.value?.nickname || ''
  form.avatar = user.value?.avatar || ''
  form.bio = user.value?.bio || ''
  form.website = user.value?.website || ''
  form.github = user.value?.github || ''
  form.weibo = user.value?.weibo || ''
}

function startEdit() {
  fillForm()
  clearPendingAvatar()
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  formRef.value?.clearValidate()
  clearPendingAvatar()
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    saving.value = true
    try {
      let avatar = form.avatar.trim()
      // 有选中的新头像文件：先上传到 OSS 拿 URL，再随资料一起保存
      if (pendingAvatarFile.value) {
        const { url } = await uploadAvatar(pendingAvatarFile.value)
        avatar = url
      }
      const ok = await authStore.updateProfile({
        nickname: form.nickname.trim(),
        avatar,
        bio: form.bio.trim(),
        website: form.website.trim(),
        github: form.github.trim(),
        weibo: form.weibo.trim(),
      })
      if (ok) {
        form.avatar = avatar
        clearPendingAvatar()
        ElMessage.success('资料已更新')
        isEditing.value = false
      } else {
        ElMessage.error('保存失败，请稍后重试')
      }
    } finally {
      saving.value = false
    }
  })
}

// ---- 修改密码 ----
const pwdFormRef = ref<FormInstance>()
const pwdSaving = ref(false)
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6 到 32 个字符', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (value && value === pwdForm.oldPassword) {
          callback(new Error('新密码不能与原密码相同'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (err?: Error) => void) => {
        if (value && value !== pwdForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

/**
 * 修改密码：成功后端会撤销该用户全部会话（含当前设备），
 * 因此本地登出清理 + 引导重新登录，避免带着已失效的凭证继续操作。
 */
async function handleChangePassword() {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    pwdSaving.value = true
    try {
      await changePassword(pwdForm.oldPassword, pwdForm.newPassword)
      ElMessage.success('密码修改成功，请重新登录')
      // 先本地登出（logout 内部会尽力通知后端清 cookie，失败也不影响本地清理）
      await authStore.logout()
      pwdForm.oldPassword = ''
      pwdForm.newPassword = ''
      pwdForm.confirmPassword = ''
      pwdFormRef.value?.clearValidate()
      router.push('/')
      authStore.openLoginModal('login')
    } catch (error: any) {
      // 透出后端原因（原密码错误/格式不合法等）
      const message =
        error && typeof error === 'object' && 'message' in error ? String(error.message ?? '') : ''
      ElMessage.error(message || '修改失败，请重试')
      console.error('修改密码失败:', error)
    } finally {
      pwdSaving.value = false
    }
  })
}

// 未登录时不允许进入（路由守卫兜底）
onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.replace('/')
  }
})
</script>

<style scoped>
.settings-page {
  min-height: calc(100vh - 70px);
  background-color: #f6f7f9;
  padding: 24px 0;
}

.settings-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-title {
  margin: 0 0 16px;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
}

.settings-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

/* 头像编辑区 */
.avatar-editor {
  display: flex;
  align-items: center;
  gap: 16px;
}

.edit-avatar {
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
}

.avatar-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-form {
  padding-top: 8px;
}

/* 修改密码卡片与资料卡片的间距 */
.password-card {
  margin-top: 24px;
}

.password-hint {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}
</style>
