<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 左侧：头像卡片（身份信息） -->
      <aside class="profile-sidebar">
        <div class="avatar-card">
          <el-avatar :src="user?.avatar" :size="96" class="profile-avatar">
            {{ user?.nickname?.charAt(0) || 'U' }}
          </el-avatar>
          <div class="nickname">{{ user?.nickname }}</div>
          <div class="username">@{{ user?.username }}</div>
          <div class="bio">{{ user?.bio || '这个人很懒，什么都没写~' }}</div>
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

      <!-- 右侧：三个选择栏（赞过 / 收藏 / 关注） -->
      <main class="profile-main">
        <el-card shadow="never" class="profile-card">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="赞过的文章" name="liked">
              <el-empty description="赞过的文章会展示在这里" />
            </el-tab-pane>
            <el-tab-pane label="收藏的文章" name="favorites">
              <el-empty description="收藏的文章会展示在这里" />
            </el-tab-pane>
            <el-tab-pane label="关注的用户" name="following">
              <el-empty description="关注的用户会展示在这里" />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

// 三个选择栏：数据接口后续接入，先占位
const activeTab = ref<'liked' | 'favorites' | 'following'>('liked')

function formatDate(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

// 未登录时不允许进入（路由守卫兜底）
onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.replace('/')
  }
})
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

/* 右侧选择栏卡片 */
.profile-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

@media (max-width: 768px) {
  .profile-container {
    grid-template-columns: 1fr;
  }
}
</style>
