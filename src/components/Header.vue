<template>
  <header class="header-wrapper">
    <div class="header-container">
      <!-- Logo -->
      <router-link to="/" class="logo-section">
        <div class="logo-box">
          <span class="logo-text">Bo</span>
        </div>
        <span class="blog-name">我的博客</span>
      </router-link>

      <!-- Navigation -->
      <nav class="nav-section">
        <!-- Links for all users -->
        <router-link to="/" class="nav-link">首页</router-link>

        <!-- AI assistant link (open to guests as well) -->
        <router-link to="/ai" class="nav-link">AI 助手</router-link>

        <!-- Write article link (only when logged in) -->
        <router-link
          v-if="isLoggedIn"
          to="/write"
          class="nav-link"
        >
          写文章
        </router-link>

        <!-- Admin link (only visible to ADMIN role) -->
        <router-link
          v-if="isAdmin"
          to="/admin"
          class="nav-link"
        >
          管理
        </router-link>

        <!-- Auth section -->
        <div class="auth-section">
          <!-- 站内通知铃铛（仅登录）：进入页面拉一次未读数，点开再拉列表，不轮询 -->
          <el-popover
            v-if="isLoggedIn"
            v-model:visible="notifPopoverVisible"
            placement="bottom-end"
            trigger="click"
            :width="340"
            popper-class="notif-popper"
          >
            <template #reference>
              <el-badge
                :value="notifStore.unreadCount"
                :hidden="notifStore.unreadCount === 0"
                :max="99"
                class="notif-bell"
              >
                <el-button class="bell-btn" text circle @click="handleBellClick">
                  <el-icon :size="20"><Bell /></el-icon>
                </el-button>
              </el-badge>
            </template>

            <div class="notif-panel">
              <div class="notif-tabs">
                <span
                  v-for="tab in NOTIFICATION_TABS"
                  :key="tab.key"
                  class="notif-tab"
                  :class="{ active: notifStore.activeTab === tab.key }"
                  @click="notifStore.activeTab = tab.key"
                >
                  {{ tab.label }}
                </span>
              </div>

              <div class="notif-list" v-loading="notifStore.loading">
                <div
                  v-for="n in notifStore.visibleList()"
                  :key="n.id"
                  class="notif-item"
                  :class="{ unread: n.isRead === 0 }"
                  @click="handleNotifClick(n)"
                >
                  <span class="notif-dot" v-if="n.isRead === 0"></span>
                  <span class="notif-dot notif-dot--read" v-else></span>
                  <div class="notif-body">
                    <p class="notif-content">{{ n.content }}</p>
                    <span class="notif-time">{{ formatNotifTime(n.createdAt) }}</span>
                  </div>
                </div>

                <el-empty
                  v-if="!notifStore.loading && notifStore.visibleList().length === 0"
                  description="暂无通知"
                  :image-size="60"
                />
              </div>

              <div class="notif-footer">
                <el-button link type="primary" size="small" @click="handleMarkAllRead">
                  全部已读
                </el-button>
                <el-button link type="primary" size="small" @click="goNotifications">
                  查看全部
                </el-button>
              </div>
            </div>
          </el-popover>

          <template v-if="isLoggedIn">
            <!-- User avatar and dropdown menu -->
            <el-dropdown trigger="hover" @command="handleCommand" popper-class="user-dropdown-popper">
              <div class="user-menu-trigger">
                <el-avatar
                  :src="user?.avatar"
                  :size="36"
                  class="user-avatar"
                >
                  {{ user?.nickname?.charAt(0) || 'U' }}
                </el-avatar>
                <span class="user-nickname">{{ user?.nickname }}</span>
                <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <div class="dropdown-user-info">
                    <el-avatar :src="user?.avatar" :size="48">
                      {{ user?.nickname?.charAt(0) || 'U' }}
                    </el-avatar>
                    <div class="dropdown-user-detail">
                      <span class="dropdown-nickname">{{ user?.nickname }}</span>
                      <span class="dropdown-username">@{{ user?.username }}</span>
                    </div>
                  </div>
                  <el-divider style="margin: 4px 0" />
                  <el-dropdown-item command="profile">
                    <el-icon><User /></el-icon>
                    个人信息
                  </el-dropdown-item>
                  <el-dropdown-item command="my-articles">
                    <el-icon><Document /></el-icon>
                    我的文章
                  </el-dropdown-item>
                  <el-dropdown-item command="settings">
                    <el-icon><Setting /></el-icon>
                    账号设置
                  </el-dropdown-item>
                  <el-divider style="margin: 4px 0" />
                  <el-dropdown-item command="logout" divided>
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <template v-else>
            <!-- Login/Register buttons -->
            <el-button 
              @click="authStore.openLoginModal('login')" 
              text
            >
              登录
            </el-button>
            <el-button 
              type="primary" 
              @click="authStore.openLoginModal('register')"
              size="small"
            >
              注册
            </el-button>
          </template>
        </div>
      </nav>
    </div>

  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore, NOTIFICATION_TABS } from '@/stores/notification'
import type { Notification } from '@/types'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  User,
  Document,
  Setting,
  SwitchButton,
  Bell,
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
const { isLoggedIn, isAdmin, user, showLoginModal } = storeToRefs(authStore)

// ---- 站内通知铃铛 ----
const notifPopoverVisible = ref(false)

/** 点开铃铛才拉列表（未读数进入页面已拉过一次，这里不重复轮询） */
async function handleBellClick() {
  await notifStore.fetchList()
}

/** 点某条通知：标记已读并跳转到对应文章/评论位置 */
async function handleNotifClick(n: Notification) {
  await notifStore.markRead(n)
  notifPopoverVisible.value = false
  if (n.link) {
    router.push(n.link)
  }
}

async function handleMarkAllRead() {
  await notifStore.markAllRead()
}

function goNotifications() {
  notifPopoverVisible.value = false
  router.push('/notifications')
}

function formatNotifTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 进入页面拉一次未读数（登录态恢复后）；登出时清空
onMounted(async () => {
  if (isLoggedIn.value) {
    await notifStore.fetchUnreadCount()
  }
})
watch(isLoggedIn, async (val: boolean) => {
  if (val) {
    await notifStore.fetchUnreadCount()
  } else {
    notifStore.clear()
  }
})

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'my-articles':
      // 新标签页打开（resolve().href 自带路由 base，兼容 /proxy/xxx 部署）
      window.open(router.resolve({ name: 'MyArticles' }).href, '_blank')
      break
    case 'settings':
      ElMessage.info('账号设置页面开发中')
      break
    case 'logout':
      authStore.logout()
      ElMessage.success('已退出登录')
      router.push('/')
      break
  }
}
</script>

<style scoped>
.header-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.3s;
}

.logo-section:hover {
  opacity: 0.8;
}

.logo-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #9333ea);
}

.logo-text {
  color: #fff;
  font-weight: bold;
  font-size: 18px;
}

.blog-name {
  font-weight: bold;
  font-size: 16px;
  color: #1f2937;
}

.nav-section {
  display: flex;
  align-items: center;
  gap: 32px;
}

.nav-link {
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #3b82f6;
}

.nav-link.router-link-active {
  color: #3b82f6;
  border-bottom: 2px solid #3b82f6;
  padding-bottom: 2px;
}

.auth-section {
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 1px solid #e5e7eb;
  padding-left: 32px;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.user-menu-trigger:hover {
  background-color: #f3f4f6;
}

.user-avatar {
  flex-shrink: 0;
}

.user-nickname {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.dropdown-arrow {
  font-size: 12px;
  color: #9ca3af;
  transition: transform 0.3s;
}

/* ---- 通知铃铛 ---- */
.notif-bell {
  display: flex;
  align-items: center;
}

.bell-btn {
  color: #4b5563;
}

.bell-btn:hover {
  color: #3b82f6;
}

.notif-panel {
  display: flex;
  flex-direction: column;
  max-height: 420px;
}

.notif-tabs {
  display: flex;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}

.notif-tab {
  font-size: 13px;
  color: #6b7280;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}

.notif-tab:hover {
  background: #f3f4f6;
}

.notif-tab.active {
  background: #ecf5ff;
  color: #3b82f6;
  font-weight: 500;
}

.notif-list {
  flex: 1;
  overflow-y: auto;
  min-height: 80px;
  max-height: 300px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.notif-item:hover {
  background: #f9fafb;
}

.notif-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  margin-top: 7px;
  border-radius: 50%;
  background: #3b82f6;
}

.notif-dot--read {
  background: transparent;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-content {
  margin: 0;
  font-size: 13px;
  color: #1f2937;
  line-height: 1.5;
  /* 最多两行，超出省略 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notif-item.unread .notif-content {
  font-weight: 500;
}

.notif-time {
  font-size: 12px;
  color: #9ca3af;
}

.notif-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 4px;
  border-top: 1px solid #f3f4f6;
}

/* 下拉面板内的用户信息区 */
:deep(.dropdown-user-info) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 8px;
  min-width: 180px;
}

:deep(.dropdown-user-detail) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:deep(.dropdown-nickname) {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.dropdown-username) {
  font-size: 12px;
  color: #9ca3af;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

@media (max-width: 768px) {
  .header-container {
    height: 60px;
  }

  .blog-name {
    display: none;
  }

  .nav-section {
    gap: 16px;
  }

  .user-nickname {
    display: none;
  }

  .auth-section {
    padding-left: 16px;
  }
}
</style>
