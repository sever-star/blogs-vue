<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 左侧：头像卡片 -->
      <aside class="profile-sidebar">
        <div class="avatar-card">
          <el-avatar :src="form.avatar || user?.avatar" :size="96" class="profile-avatar">
            {{ user?.nickname?.charAt(0) || 'U' }}
          </el-avatar>
          <div class="nickname">{{ form.nickname || user?.nickname }}</div>
          <div class="username">@{{ user?.username }}</div>
          <div class="bio">{{ form.bio || user?.bio || '这个人很懒，什么都没写~' }}</div>
          <el-divider style="margin: 16px 0" />
          <div class="stat-row">
            <span class="stat">
              <b>—</b>
              文章
            </span>
            <span class="stat">
              <b>—</b>
              点赞
            </span>
          </div>
          <div class="member-since">
            加入于 {{ formatDate(user?.createdAt) }}
          </div>
        </div>
      </aside>

      <!-- 右侧：资料主卡片 -->
      <main class="profile-main">
        <el-card shadow="never" class="profile-card">
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
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import type { FormInstance, UploadFile } from 'element-plus'
import { Edit, Refresh, Upload } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { randomAvatar } from '@/utils/avatar'
import { uploadAvatar } from '@/api/upload'

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

function formatDate(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

// 未登录时不允许进入（路由守卫兜底）
if (!authStore.isLoggedIn) {
  router.replace('/')
}
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 70px);
  background-color: #f6f7f9;
  padding: 24px 0;
}

.profile-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* 左侧头像卡片 */
.avatar-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.profile-avatar {
  display: block;
  margin: 0 auto;
}

.nickname {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.username {
  margin-top: 4px;
  font-size: 14px;
  color: #9ca3af;
}

.bio {
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  min-height: 20px;
}

.stat-row {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.stat b {
  font-size: 16px;
  color: #1f2937;
}

.member-since {
  margin-top: 16px;
  font-size: 12px;
  color: #b0b6c0;
}

/* 右侧主卡片 */
.profile-card {
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

@media (max-width: 768px) {
  .profile-container {
    grid-template-columns: 1fr;
  }
}
</style>
