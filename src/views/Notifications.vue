<template>
  <main class="notifications-page">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">通知</span>
          <span class="card-subtitle">未读 {{ notifStore.unreadCount }} 条</span>
        </div>
      </template>

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
        <el-button
          class="mark-all"
          link
          type="primary"
          size="small"
          @click="notifStore.markAllRead()"
        >
          全部已读
        </el-button>
      </div>

      <div class="notif-list" v-loading="notifStore.loading">
        <div
          v-for="n in notifStore.visibleList()"
          :key="n.id"
          class="notif-item"
          :class="{ unread: n.isRead === 0 }"
          @click="handleClick(n)"
        >
          <span class="notif-dot" :class="{ 'notif-dot--read': n.isRead === 1 }"></span>
          <div class="notif-body">
            <div class="notif-row">
              <el-tag size="small" :type="tagType(n.type)" effect="light">{{ tagLabel(n.type) }}</el-tag>
              <span class="notif-time">{{ formatTime(n.createdAt) }}</span>
            </div>
            <p class="notif-content">{{ n.content }}</p>
          </div>
        </div>

        <el-empty
          v-if="!notifStore.loading && notifStore.visibleList().length === 0"
          description="暂无通知"
        />
      </div>

      <div class="pagination" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </el-card>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotificationStore, NOTIFICATION_TABS } from '@/stores/notification'
import type { NotificationTab } from '@/stores/notification'
import type { Notification, NotificationType } from '@/types'

const route = useRoute()
const router = useRouter()
const notifStore = useNotificationStore()

const page = ref(1)
const pageSize = 20
const total = ref(0)

/** 支持的 tab 名（不含 all 的 key 集合），用于校验 URL 上的 ?tab= */
const TAB_KEYS = NOTIFICATION_TABS.map(t => t.key as string)

async function load() {
  await notifStore.fetchList(page.value, pageSize)
  total.value = notifStore.total
}

/** 点通知：标记已读并跳转到对应文章/评论位置 */
async function handleClick(n: Notification) {
  await notifStore.markRead(n)
  if (n.link) router.push(n.link)
}

const TYPE_LABELS: Record<string, string> = {
  post_comment: '评论',
  comment_reply: '回复',
  comment_like: '点赞',
  like: '点赞',
  favorite: '收藏',
  follow: '关注',
  message: '私信',
  system: '系统',
}
function tagLabel(t: NotificationType): string {
  return TYPE_LABELS[t] ?? '通知'
}
function tagType(t: NotificationType): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  switch (t) {
    case 'post_comment':
    case 'comment_reply':
      return 'primary'
    case 'like':
    case 'comment_like':
    case 'favorite':
      return 'warning'
    case 'follow':
      return 'success'
    case 'message':
      return 'info'
    default:
      return 'info'
  }
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 切 tab 时回到第一页，并同步到 URL（刷新/分享保持当前模块）
watch(() => notifStore.activeTab, (tab) => {
  page.value = 1
  router.replace({ query: tab === 'all' ? {} : { tab } })
})

onMounted(async () => {
  // 从铃铛快捷入口进来时带上 ?tab=xxx，预选对应模块
  const tab = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (tab && TAB_KEYS.includes(tab)) {
    notifStore.activeTab = tab as NotificationTab
  }
  await notifStore.fetchUnreadCount()
  await load()
})
</script>

<style scoped>
.notifications-page {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 24px 0;
}

.card {
  max-width: 760px;
  margin: 0 auto;
  border: none;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.card-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.notif-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.notif-tab {
  font-size: 13px;
  color: #6b7280;
  padding: 4px 12px;
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

.mark-all {
  margin-left: auto;
}

.notif-list {
  min-height: 200px;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.notif-item + .notif-item {
  border-top: 1px solid #f3f4f6;
}

.notif-item:hover {
  background: #f9fafb;
}

.notif-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-top: 8px;
  border-radius: 50%;
  background: #3b82f6;
}

.notif-dot--read {
  background: #d1d5db;
}

.notif-body {
  flex: 1;
  min-width: 0;
}

.notif-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.notif-time {
  font-size: 12px;
  color: #9ca3af;
}

.notif-content {
  margin: 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
  word-break: break-word;
}

.notif-item.unread .notif-content {
  color: #1f2937;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
