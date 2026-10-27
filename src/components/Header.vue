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
          <!-- 站内通知铃铛（仅登录）：悬浮弹出五个分类快捷入口，点击跳通知页对应模块；
               点铃铛本体默认进第一个分类「评论通知」。未读数进入页面拉一次，不轮询 -->
          <el-popover
            v-if="isLoggedIn"
            placement="bottom-end"
            trigger="hover"
            :width="190"
            :open-delay="150"
            :close-delay="200"
            popper-class="notif-popper"
          >
            <template #reference>
              <el-badge
                :value="notifStore.unreadCount"
                :hidden="notifStore.unreadCount === 0"
                :max="99"
                class="notif-bell"
              >
                <el-button class="bell-btn" text circle @click="goNotifications()">
                  <el-icon :size="20"><Bell /></el-icon>
                </el-button>
              </el-badge>
            </template>

            <div class="notif-quick-menu">
              <div
                v-for="entry in NOTIF_QUICK_ENTRIES"
                :key="entry.tab"
                class="notif-quick-item"
                @click="goNotifications(entry.tab)"
              >
                <el-icon><component :is="entry.icon" /></el-icon>
                <span>{{ entry.label }}</span>
                <span
                  v-if="notifStore.unreadByTab[entry.tab] > 0"
                  class="quick-badge"
                >{{ notifStore.unreadByTab[entry.tab] }}</span>
                <el-icon class="quick-arrow"><ArrowRight /></el-icon>
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
                    我的主页
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
import { onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import type { NotificationTab } from '@/stores/notification'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  ArrowRight,
  User,
  Document,
  Setting,
  SwitchButton,
  Bell,
  ChatDotRound,
  Star,
  Message,
  InfoFilled,
} from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
const { isLoggedIn, isAdmin, user, showLoginModal } = storeToRefs(authStore)

// ---- 站内通知铃铛 ----

/** 悬浮弹层的五个分类快捷入口 */
const NOTIF_QUICK_ENTRIES: Array<{ tab: NotificationTab; label: string; icon: unknown }> = [
  { tab: 'comment', label: '评论通知', icon: ChatDotRound },
  { tab: 'like', label: '点赞收藏', icon: Star },
  { tab: 'follow', label: '关注', icon: User },
  { tab: 'message', label: '私信', icon: Message },
  { tab: 'system', label: '系统', icon: InfoFilled },
]

/** 跳转通知页（点铃铛本体默认进第一个分类「评论通知」，点快捷入口进对应模块） */
function goNotifications(tab: NotificationTab = 'comment') {
  router.push({ name: 'Notifications', query: { tab } })
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
      // 账号设置独立页（个人信息 + 修改密码，自原个人信息页迁入）
      router.push('/settings')
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

/* 悬浮弹层：五个分类快捷入口 */
.notif-quick-menu {
  display: flex;
  flex-direction: column;
}

.notif-quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  font-size: 13px;
  color: #374151;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.notif-quick-item:hover {
  background: #f3f4f6;
  color: #3b82f6;
}

.quick-arrow {
  margin-left: auto;
  font-size: 12px;
  color: #9ca3af;
}

/* 快捷入口的未读数角标（紧贴标签右侧；箭头仍靠最右） */
.quick-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: #fff;
  background: #f56c6c;
  border-radius: 999px;
}

.notif-quick-item:hover .quick-arrow {
  color: #3b82f6;
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
