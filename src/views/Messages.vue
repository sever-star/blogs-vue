<template>
  <main class="messages-page">
    <div class="messages-container">
      <!-- 左栏：会话列表 -->
      <aside class="conv-panel" v-loading="loadingConv">
        <div class="conv-header">
          <span class="conv-title">私信</span>
        </div>
        <div class="conv-list">
          <div
            v-for="c in conversations"
            :key="c.id"
            class="conv-item"
            :class="{ active: activeConversation?.id === c.id }"
            @click="selectConversation(c)"
          >
            <el-avatar :src="c.peerUser.avatar" :size="40" class="conv-avatar">
              {{ c.peerUser.nickname?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="conv-meta">
              <div class="conv-row">
                <span class="conv-name">{{ c.peerUser.nickname }}</span>
                <span class="conv-time">{{ formatConvTime(c.lastMessageAt) }}</span>
              </div>
              <div class="conv-row">
                <span class="conv-preview">{{ c.lastMessagePreview || '暂无消息' }}</span>
                <span v-if="c.unreadCount > 0" class="conv-badge">{{ c.unreadCount }}</span>
              </div>
            </div>
            <el-button
              class="conv-delete"
              link
              type="danger"
              size="small"
              title="删除会话"
              @click.stop="handleDelete(c)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-empty
            v-if="!loadingConv && conversations.length === 0"
            description="暂无会话"
            :image-size="80"
          />
        </div>
      </aside>

      <!-- 右栏：消息窗 -->
      <section class="chat-panel">
        <template v-if="activeConversation">
          <div class="chat-header">
            <span class="chat-peer-name">{{ activeConversation.peerUser.nickname }}</span>
          </div>

          <div class="chat-body" ref="chatBodyRef" v-loading="loadingMsg">
            <div
              v-for="m in messages"
              :key="m.id"
              class="bubble-row"
              :class="{ mine: m.senderId === currentUserId }"
            >
              <el-avatar :src="m.senderAvatar" :size="32" class="bubble-avatar">
                {{ m.senderNickname?.charAt(0) || 'U' }}
              </el-avatar>
              <div class="bubble-content">
                <span class="bubble-time">{{ formatTime(m.createdAt) }}</span>
                <div class="bubble">{{ m.content }}</div>
              </div>
            </div>
            <el-empty
              v-if="!loadingMsg && messages.length === 0"
              description="还没有消息，发条私信吧"
              :image-size="80"
            />
          </div>

          <div class="chat-input">
            <el-input
              v-model="messageText"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 4 }"
              placeholder="输入私信内容…"
              @keydown.enter.exact.prevent="handleSend"
              :disabled="sending"
            />
            <el-button
              type="primary"
              :loading="sending"
              :disabled="!messageText.trim()"
              @click="handleSend"
            >
              发送
            </el-button>
          </div>
        </template>
        <el-empty
          v-else
          description="选择一个会话开始聊天"
          class="chat-empty"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useMessageWsStore } from '@/stores/messageWs'
import {
  getConversations,
  getConversationMessages,
  markConversationRead,
  deleteConversation,
  type Conversation,
  type ChatMessage,
} from '@/api/message'

const route = useRoute()
const authStore = useAuthStore()
const notifStore = useNotificationStore()
const wsStore = useMessageWsStore()
const currentUserId = computed(() => authStore.user?.id)

const conversations = ref<Conversation[]>([])
const activeConversation = ref<Conversation | null>(null)
const messages = ref<ChatMessage[]>([])
const messageText = ref('')
const loadingConv = ref(false)
const loadingMsg = ref(false)
const sending = ref(false)
const chatBodyRef = ref<HTMLElement | null>(null)

let offMessage: (() => void) | null = null

onMounted(async () => {
  // 订阅 WS 收到的私信：当前正看该会话则追加气泡 + 标记已读并校正角标，
  // 否则返回 false 交给 messageWs store 弹桌面通知
  offMessage = wsStore.onMessage((m: ChatMessage) => {
    if (activeConversation.value?.id !== m.conversationId) return false
    if (messages.value.some((x: ChatMessage) => x.id === m.id)) return true // 去重（重连补推等）
    messages.value.push(m)
    scrollToBottom()
    markConversationRead(m.conversationId)
      .then(() => notifStore.fetchMessageUnread())
      .catch(() => {})
    return true
  })
  await loadConversations()
})

onUnmounted(() => {
  offMessage?.()
  offMessage = null
})

/** 拉取会话列表；若 URL 带 ?userId= 则打开与该用户的会话（已有则选中，无则进草稿态） */
async function loadConversations() {
  loadingConv.value = true
  try {
    const res = await getConversations(1, 50)
    conversations.value = res.data ?? []

    const peerIdQuery = route.query.userId
    if (peerIdQuery) {
      const peerId = Number(peerIdQuery)
      if (!Number.isNaN(peerId) && peerId !== currentUserId.value) {
        // 草稿头部需要对方昵称/头像，由发起页（ArticleDetail）通过 query 带入
        const peerInfo = {
          nickname: typeof route.query.nick === 'string' ? route.query.nick : '',
          avatar: typeof route.query.avatar === 'string' ? route.query.avatar : '',
        }
        await openConversationWith(peerId, peerInfo)
        return
      }
    }
    if (conversations.value.length > 0) {
      await selectConversation(conversations.value[0])
    }
  } catch (e: unknown) {
    ElMessage.error((e as { message?: string })?.message || '会话列表加载失败')
  } finally {
    loadingConv.value = false
  }
}

/**
 * 通过 ?userId= 进入：打开与某用户的私信。
 * 不再在点击时就建会话——若列表里已有与该用户的会话则直接选中；
 * 否则进入「草稿态」（id=0 占位），会话在首条消息发送时由后端 addMessage 创建。
 * peerInfo 来自发起页 query（昵称/头像），仅用于草稿头部展示。
 */
async function openConversationWith(
  peerId: number,
  peerInfo?: { nickname?: string; avatar?: string }
) {
  const existing = conversations.value.find((c: Conversation) => c.peerUser.id === peerId)
  if (existing) {
    await selectConversation(existing)
    return
  }
  const draft: Conversation = {
    id: 0,
    peerUser: {
      id: peerId,
      username: '',
      nickname: peerInfo?.nickname || '',
      avatar: peerInfo?.avatar || '',
    },
    lastMessagePreview: null,
    lastMessageAt: null,
    unreadCount: 0,
    createdAt: '',
    updatedAt: '',
  }
  // 草稿不进左栏列表——发送首条消息后才出现
  await selectConversation(draft)
}

async function selectConversation(conv: Conversation) {
  if (activeConversation.value?.id === conv.id) return
  activeConversation.value = conv
  // 草稿态（id=0）：会话尚未创建，无消息可拉、无未读可标记
  if (conv.id === 0) {
    messages.value = []
    return
  }
  await loadMessages(conv.id)
  // 有未读才标记，避免无意义请求；乐观清零角标，后端联动把 type=message 通知标已读后刷新铃铛
  if (conv.unreadCount > 0) {
    conv.unreadCount = 0
    try {
      await markConversationRead(conv.id)
      await notifStore.fetchUnreadCount()
      await notifStore.fetchMessageUnread()
    } catch {
      // 标记失败不影响查看消息，下次进入会话会重新拉取未读数
    }
  }
}

async function loadMessages(conversationId: number) {
  loadingMsg.value = true
  messages.value = []
  try {
    const res = await getConversationMessages(conversationId, 1, 50)
    // 后端按时间倒序返回，reverse 成正序（最新消息在底部）
    messages.value = [...(res.data ?? [])].reverse()
    await scrollToBottom()
  } catch (e: unknown) {
    ElMessage.error((e as { message?: string })?.message || '消息加载失败')
  } finally {
    loadingMsg.value = false
  }
}

async function handleSend() {
  const content = messageText.value.trim()
  if (!content || !activeConversation.value || sending.value) return
  const peerId = activeConversation.value.peerUser.id
  if (peerId === currentUserId.value) {
    ElMessage.warning('不能给自己发私信')
    return
  }
  sending.value = true
  try {
    // 走 WebSocket：等 send_ack 回执，拿到落库后的完整消息（含 id/createdAt）
    const msg = await wsStore.send({ receiverId: peerId, content })
    messageText.value = ''
    const conv = activeConversation.value
    if (conv.id === 0) {
      // 草稿态：首条消息发送后后端才建会话。拿到真实 conversationId 后刷新左栏列表
      // 并选中真实会话（loadMessages 会取回刚发的消息，含可能的对方并发消息）
      await refreshConversationList()
      const real = conversations.value.find((c: Conversation) => c.peerUser.id === peerId)
      if (real) {
        await selectConversation(real)
      } else {
        // 异常兜底：列表没找到新建会话，用 send_ack 数据就地转正
        conv.id = msg.conversationId
        conv.lastMessagePreview = msg.content
        conv.lastMessageAt = msg.createdAt
        messages.value.push(msg)
      }
    } else {
      // 已有会话：即时追加气泡，本地更新预览/时间
      messages.value.push(msg)
      conv.lastMessagePreview = msg.content
      conv.lastMessageAt = msg.createdAt
    }
    await scrollToBottom()
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '发送失败')
  } finally {
    sending.value = false
  }
}

/** 刷新左栏会话列表（首条消息发送后把新建会话合并进来），不改动当前激活态 */
async function refreshConversationList() {
  try {
    const res = await getConversations(1, 50)
    conversations.value = res.data ?? []
  } catch {
    // 刷新失败不影响已发送的消息
  }
}

async function handleDelete(conv: Conversation) {
  try {
    await ElMessageBox.confirm(
      `确定删除与「${conv.peerUser.nickname}」的会话吗？仅对你隐藏，对方不受影响；对方再发消息时会重新出现。`,
      '删除会话',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteConversation(conv.id)
    conversations.value = conversations.value.filter((c: Conversation) => c.id !== conv.id)
    if (activeConversation.value?.id === conv.id) {
      activeConversation.value = null
      messages.value = []
      if (conversations.value.length > 0) {
        await selectConversation(conversations.value[0])
      }
    }
    ElMessage.success('已删除')
    await notifStore.fetchMessageUnread()
  } catch (e: unknown) {
    ElMessage.error((e as { message?: string })?.message || '删除失败')
  }
}

async function scrollToBottom() {
  await nextTick()
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

function formatTime(time: string): string {
  return new Date(time).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 会话列表用更简短的时间：今天只显示时分，否则显示月日 */
function formatConvTime(time: string | null): string {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  return sameDay
    ? d.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

<style scoped>
.messages-page {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 24px 0;
}

.messages-container {
  max-width: 1000px;
  margin: 0 auto;
  height: calc(100vh - 118px);
  display: flex;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* ---- 左栏会话列表 ---- */
.conv-panel {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.conv-header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.conv-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.conv-list {
  flex: 1;
  overflow-y: auto;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.conv-item:hover {
  background: #f9fafb;
}

.conv-item.active {
  background: #ecf5ff;
}

.conv-avatar {
  flex-shrink: 0;
}

.conv-meta {
  flex: 1;
  min-width: 0;
}

.conv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.conv-row + .conv-row {
  margin-top: 4px;
}

.conv-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-time {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.conv-preview {
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-badge {
  flex-shrink: 0;
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

/* 删除按钮：默认隐藏，hover 会话项时出现，不挤占布局 */
.conv-delete {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.conv-item:hover .conv-delete {
  opacity: 1;
}

/* ---- 右栏消息窗 ---- */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.chat-peer-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bubble-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.bubble-row.mine {
  flex-direction: row-reverse;
}

.bubble-avatar {
  flex-shrink: 0;
}

.bubble-content {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.bubble-row.mine .bubble-content {
  align-items: flex-end;
}

.bubble-time {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 2px;
}

.bubble {
  padding: 8px 12px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.bubble-row.mine .bubble {
  background: #3b82f6;
  color: #fff;
}

.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f3f4f6;
  align-items: flex-end;
}

.chat-empty {
  margin: auto;
}

@media (max-width: 768px) {
  .messages-container {
    height: calc(100vh - 108px);
  }
  .conv-panel {
    width: 240px;
  }
}
</style>
