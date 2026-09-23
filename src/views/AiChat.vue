<template>
  <div class="ai-page">
    <!-- 左侧：会话列表 -->
    <aside class="session-panel" :class="{ 'is-open': sidebarOpen }">
      <div class="session-header">
        <el-button type="primary" class="new-chat-btn" @click="startNewSession">
          <el-icon><Plus /></el-icon>
          新建对话
        </el-button>
      </div>

      <div class="session-list">
        <div v-if="loadingSessions" class="session-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          加载中…
        </div>
        <template v-else>
          <div v-if="sessions.length === 0" class="session-empty">还没有对话记录</div>
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ active: session.id === currentSessionId }"
            @click="selectSession(session.id)"
          >
            <el-icon class="session-icon"><ChatDotRound /></el-icon>
            <span class="session-title" :title="session.title">{{ session.title }}</span>
            <el-icon class="session-delete" @click.stop="handleDeleteSession(session)"><Delete /></el-icon>
          </div>
        </template>
      </div>

      <div class="session-footer">
        <span class="model-tag">
          <el-icon><MagicStick /></el-icon>
          {{ aiConfig?.model || 'deepseek-chat' }}
        </span>
      </div>
    </aside>

    <!-- 右侧：对话区 -->
    <section class="chat-panel">
      <div class="chat-header">
        <el-button class="sidebar-toggle" text @click="sidebarOpen = !sidebarOpen">
          <el-icon><Fold v-if="sidebarOpen" /><Expand v-else /></el-icon>
        </el-button>
        <span class="chat-title">{{ currentTitle }}</span>
        <span v-if="sending" class="chat-status">正在生成…</span>
      </div>

      <el-alert
        v-if="aiConfig && !aiConfig.configured"
        class="config-alert"
        type="warning"
        :closable="false"
        show-icon
        title="AI 服务未配置"
        description="后端尚未配置模型 API Key，提问会直接失败。请设置环境变量 DEEPSEEK_API_KEY 后重启后端。"
      />

      <!-- 消息区 -->
      <div ref="scrollRef" class="message-area">
        <div v-if="messages.length === 0" class="welcome">
          <div class="welcome-logo"><el-icon><MagicStick /></el-icon></div>
          <h2>你好，我是博客站内的 AI 助手</h2>
          <p>可以问我技术问题、帮你梳理写作思路，也可以上传文件让我读一读。</p>
          <div class="prompt-list">
            <button
              v-for="prompt in examplePrompts"
              :key="prompt"
              class="prompt-chip"
              @click="draft = prompt"
            >
              {{ prompt }}
            </button>
          </div>
        </div>

        <div
          v-for="(message, index) in messages"
          :key="message.id || `pending-${index}`"
          class="message-row"
          :class="message.role"
        >
          <el-avatar class="message-avatar" :size="34" :src="message.role === 'user' ? userAvatar : undefined">
            <el-icon v-if="message.role === 'assistant'"><MagicStick /></el-icon>
            <template v-else>{{ userInitial }}</template>
          </el-avatar>

          <div class="message-body">
            <div class="message-bubble" :class="{ 'is-error': message.status === 2 }">
              <div
                v-if="message.role === 'assistant'"
                class="markdown-body"
                v-html="renderMarkdown(message.content)"
              />
              <p v-else class="plain-text">{{ message.content }}</p>

              <!-- 生成中且还没有内容的等待态 -->
              <span v-if="message.role === 'assistant' && message.status === 0 && !message.content" class="typing">
                <i /><i /><i />
              </span>
              <span v-else-if="message.status === 0" class="cursor" />
            </div>

            <div class="message-meta">
              <span v-if="message.status === 2" class="meta-error">生成中断</span>
              <span v-else-if="message.tokens" class="meta-tokens">{{ message.tokens }} tokens</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div
        class="composer"
        :class="{ 'is-dragging': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <div v-if="attachments.length > 0" class="attachment-list">
          <div v-for="(item, index) in attachments" :key="`${item.name}-${index}`" class="attachment-chip">
            <el-icon><Document /></el-icon>
            <span class="attachment-name" :title="item.name">{{ item.name }}</span>
            <span class="attachment-kind">{{ isTextAttachment(item) ? '文本' : '链接' }}</span>
            <el-icon class="attachment-remove" @click="removeAttachment(index)"><Close /></el-icon>
          </div>
        </div>

        <div class="composer-row">
          <el-tooltip content="上传附件（文本类会被读取内容，其他类型仅传链接）" placement="top">
            <el-button class="attach-btn" text :loading="uploading" @click="triggerFilePicker">
              <el-icon><Paperclip /></el-icon>
            </el-button>
          </el-tooltip>

          <textarea
            v-model="draft"
            class="composer-input"
            rows="1"
            placeholder="输入你的问题，Enter 发送，Shift + Enter 换行"
            :disabled="sending"
            @keydown.enter.exact.prevent="handleSend"
            @input="autoGrow"
            ref="inputRef"
          />

          <el-button
            v-if="sending"
            class="send-btn"
            type="danger"
            plain
            @click="stopGenerating"
          >
            停止
          </el-button>
          <el-button
            v-else
            class="send-btn"
            type="primary"
            :disabled="!canSend"
            @click="handleSend"
          >
            <el-icon><Promotion /></el-icon>
          </el-button>
        </div>

        <div class="composer-hint">
          <span v-if="dragging" class="drop-hint">松开即可添加附件</span>
          <span v-else>支持 txt / md / 代码等文本文件（读取内容）与图片等二进制文件（仅传链接），单个不超过 10MB</span>
        </div>

        <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          multiple
          @change="handleFilePicker"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Close,
  Delete,
  Document,
  Expand,
  Fold,
  Loading,
  MagicStick,
  Paperclip,
  Plus,
  Promotion,
} from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import {
  AiStreamError,
  createAiSession,
  deleteAiSession,
  getAiConfig,
  getAiMessages,
  getAiSessions,
  streamAiChat,
  uploadAiAttachment,
  type AiAttachment,
  type AiConfig,
  type AiMessage,
  type AiSession,
} from '@/api/ai'
import { useAuthStore } from '@/stores/auth'
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  TEXT_READ_MAX_BYTES,
  isTextAttachment,
  isTextFile,
  readTextFile,
  type PickedAttachment,
} from '@/utils/attachment'

/** html: false 关闭原始 HTML，避免模型输出被当作标签执行（XSS） */
const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })

const examplePrompts = [
  '帮我梳理一篇技术博客的大纲',
  '解释一下 JWT 双 token 无感刷新的原理',
  '把下面这段文字润色得更简洁',
]

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const sessions = ref<AiSession[]>([])
const messages = ref<AiMessage[]>([])
const currentSessionId = ref<number | null>(null)
const aiConfig = ref<AiConfig | null>(null)
const loadingSessions = ref(false)
const sending = ref(false)
const uploading = ref(false)
const sidebarOpen = ref(true)
const dragging = ref(false)

const draft = ref('')
const attachments = ref<PickedAttachment[]>([])

const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

/** 中断当前生成，用于「停止」按钮 */
let controller: AbortController | null = null

const canSend = computed(
  () => !sending.value && (draft.value.trim().length > 0 || attachments.value.length > 0)
)
const currentTitle = computed(() => {
  const session = sessions.value.find((item) => item.id === currentSessionId.value)
  return session?.title || 'AI 助手'
})
const userAvatar = computed(() => user.value?.avatar || undefined)
const userInitial = computed(() => user.value?.nickname?.charAt(0) || 'U')

const renderMarkdown = (text: string) => markdown.render(text || '')

// ============ 会话列表 ============

async function loadSessions() {
  loadingSessions.value = true
  try {
    sessions.value = await getAiSessions()
  } catch (error) {
    ElMessage.error(errorText(error, '加载会话列表失败'))
  } finally {
    loadingSessions.value = false
  }
}

function startNewSession() {
  if (sending.value) {
    ElMessage.warning('正在生成回复，请先停止或等待完成')
    return
  }
  currentSessionId.value = null
  messages.value = []
  attachments.value = []
  draft.value = ''
  sidebarOpen.value = false
  nextTick(() => inputRef.value?.focus())
}

async function selectSession(sessionId: number) {
  if (sending.value) {
    ElMessage.warning('正在生成回复，请先停止或等待完成')
    return
  }
  if (sessionId === currentSessionId.value) {
    sidebarOpen.value = false
    return
  }
  currentSessionId.value = sessionId
  sidebarOpen.value = false
  try {
    messages.value = await getAiMessages(sessionId)
    scrollToBottom()
  } catch (error) {
    ElMessage.error(errorText(error, '加载对话记录失败'))
  }
}

async function handleDeleteSession(session: AiSession) {
  try {
    await ElMessageBox.confirm(`确定删除对话「${session.title}」吗？`, '删除对话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }

  try {
    await deleteAiSession(session.id)
    sessions.value = sessions.value.filter((item) => item.id !== session.id)
    if (currentSessionId.value === session.id) {
      startNewSession()
    }
    ElMessage.success('已删除')
  } catch (error) {
    ElMessage.error(errorText(error, '删除失败'))
  }
}

// ============ 发送与流式接收 ============

async function handleSend() {
  if (!canSend.value) return

  const content = draft.value.trim()
  const sentAttachments: AiAttachment[] = attachments.value.map((item) => ({
    name: item.name,
    content: item.content,
    url: item.url,
  }))

  draft.value = ''
  attachments.value = []
  resetInputHeight()
  sending.value = true

  // 本地先渲染气泡，不必等 meta 回来才有反馈
  const now = new Date().toISOString()
  messages.value.push({
    id: 0,
    role: 'user',
    content: content || '（已上传附件）',
    tokens: null,
    status: 1,
    createdAt: now,
  })
  messages.value.push({
    id: 0,
    role: 'assistant',
    content: '',
    tokens: null,
    status: 0,
    createdAt: now,
  })
  // 数组是深度响应式的，持有该对象引用即可直接改内容驱动视图
  const assistantMessage = messages.value[messages.value.length - 1]
  scrollToBottom()

  controller = new AbortController()
  const isNewSession = currentSessionId.value === null

  try {
    await streamAiChat(
      { sessionId: currentSessionId.value, content, attachments: sentAttachments },
      {
        onMeta: (meta) => {
          assistantMessage.id = meta.messageId
          if (isNewSession) {
            currentSessionId.value = meta.sessionId
            // 会话标题由后端按首条提问生成，这里重新拉一次列表才能拿到
            void loadSessions()
          }
        },
        onContent: (delta) => {
          assistantMessage.content += delta
          scrollToBottom()
        },
        onDone: (info) => {
          assistantMessage.status = 1
          assistantMessage.tokens = info.tokens || null
        },
      },
      controller.signal
    )
    // 流正常结束但没收到 done 事件时（例如上游提前关闭），仍标记为完成
    if (assistantMessage.status === 0) {
      assistantMessage.status = 1
    }
  } catch (error) {
    assistantMessage.status = 2
    if (isAbortError(error)) {
      ElMessage.info('已停止生成')
    } else {
      ElMessage.error(errorText(error, 'AI 回复失败'))
    }
  } finally {
    sending.value = false
    controller = null
    scrollToBottom()
    nextTick(() => inputRef.value?.focus())
  }
}

function stopGenerating() {
  controller?.abort()
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

// ============ 附件 ============

function triggerFilePicker() {
  fileInputRef.value?.click()
}

async function handleFilePicker(event: Event) {
  const input = event.target as HTMLInputElement
  await addFiles(input.files)
  // 清空 value，否则连续选同一个文件不会触发 change
  input.value = ''
}

async function handleDrop(event: DragEvent) {
  dragging.value = false
  await addFiles(event.dataTransfer?.files ?? null)
}

async function addFiles(files: FileList | null) {
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    if (attachments.value.length >= ATTACHMENT_MAX_COUNT) {
      ElMessage.warning(`单次最多添加 ${ATTACHMENT_MAX_COUNT} 个附件`)
      return
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      ElMessage.warning(`${file.name} 超过 10MB，已跳过`)
      continue
    }

    if (isTextFile(file)) {
      if (file.size > TEXT_READ_MAX_BYTES) {
        ElMessage.warning(`${file.name} 超过 1MB，无法作为文本附件读取`)
        continue
      }
      try {
        attachments.value.push({ name: file.name, content: await readTextFile(file) })
      } catch {
        ElMessage.error(`${file.name} 读取失败`)
      }
    } else {
      // 二进制文件读不出内容，先传到 OSS，只把地址带给模型
      uploading.value = true
      try {
        const result = await uploadAiAttachment(file)
        attachments.value.push({ name: result.name || file.name, url: result.url })
      } catch (error) {
        ElMessage.error(errorText(error, `${file.name} 上传失败`))
      } finally {
        uploading.value = false
      }
    }
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}

// ============ 交互细节 ============

/** 输入框随内容增高（上限由 CSS max-height 控制） */
function autoGrow() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function resetInputHeight() {
  nextTick(() => {
    if (inputRef.value) inputRef.value.style.height = 'auto'
  })
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function errorText(error: unknown, fallback: string): string {
  if (error instanceof AiStreamError) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  if (typeof error === 'string' && error) return error
  return fallback
}

onMounted(async () => {
  // 窄屏默认收起侧栏，避免对话区被挤没
  sidebarOpen.value = window.innerWidth > 900
  inputRef.value?.focus()

  try {
    aiConfig.value = await getAiConfig()
  } catch {
    // 配置查询失败不阻塞使用，提问时后端仍会给出具体错误
  }
  await loadSessions()
})
</script>

<style scoped>
.ai-page {
  display: flex;
  max-width: 1200px;
  height: calc(100vh - 70px);
  min-height: 520px;
  margin: 0 auto;
  padding: 20px;
  gap: 16px;
}

/* ============ 会话列表 ============ */
.session-panel {
  display: flex;
  flex-direction: column;
  width: 240px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.session-header {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.new-chat-btn {
  width: 100%;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-loading,
.session-empty {
  padding: 16px 8px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.session-item:hover {
  background-color: #f3f4f6;
}

.session-item.active {
  background-color: #eff6ff;
}

.session-item.active .session-title {
  color: #3b82f6;
  font-weight: 500;
}

.session-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.session-item.active .session-icon {
  color: #3b82f6;
}

.session-title {
  flex: 1;
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-delete {
  color: #d1d5db;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  flex-shrink: 0;
}

.session-item:hover .session-delete {
  opacity: 1;
}

.session-delete:hover {
  color: #ef4444;
}

.session-footer {
  padding: 10px 12px;
  border-top: 1px solid #f3f4f6;
}

.model-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

/* ============ 对话区 ============ */
.chat-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.chat-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-status {
  margin-left: auto;
  font-size: 12px;
  color: #3b82f6;
}

.config-alert {
  margin: 12px 16px 0;
}

.message-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

/* 欢迎态 */
.welcome {
  max-width: 560px;
  margin: 40px auto 0;
  text-align: center;
}

.welcome-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  margin-bottom: 16px;
  border-radius: 14px;
  font-size: 24px;
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #9333ea);
}

.welcome h2 {
  font-size: 19px;
  color: #1f2937;
  margin-bottom: 8px;
}

.welcome p {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.7;
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 22px;
}

.prompt-chip {
  padding: 10px 14px;
  font-size: 13px;
  color: #4b5563;
  text-align: left;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  transition: all 0.2s;
}

.prompt-chip:hover {
  color: #3b82f6;
  border-color: #bfdbfe;
  background: #eff6ff;
}

/* 消息 */
.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #3b82f6, #9333ea);
  color: #fff;
}

.message-body {
  max-width: 78%;
  min-width: 0;
}

.message-row.user .message-body {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  background: #f3f4f6;
  font-size: 14px;
  line-height: 1.7;
  color: #1f2937;
  word-break: break-word;
}

.message-row.user .message-bubble {
  background: #3b82f6;
  color: #fff;
}

.message-bubble.is-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.plain-text {
  white-space: pre-wrap;
}

.message-meta {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
  min-height: 14px;
}

.meta-error {
  color: #ef4444;
}

/* 打字与光标动画 */
.typing {
  display: inline-flex;
  gap: 4px;
  padding: 2px 0;
}

.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: blink 1.2s infinite ease-in-out;
}

.typing i:nth-child(2) {
  animation-delay: 0.2s;
}

.typing i:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 2px;
  vertical-align: middle;
  background: #3b82f6;
  animation: blink 1s steps(2) infinite;
}

/* Markdown 渲染 */
.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 14px 0 8px;
  font-weight: 600;
  line-height: 1.4;
}

.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3) { font-size: 15px; }

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 3px 0;
}

.markdown-body :deep(code) {
  padding: 1px 5px;
  font-size: 13px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  background: #e5e7eb;
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  overflow-x: auto;
  background: #1f2937;
  border-radius: 8px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  color: #e5e7eb;
  background: transparent;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding-left: 12px;
  color: #6b7280;
  border-left: 3px solid #d1d5db;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  margin: 14px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

/* ============ 输入区 ============ */
.composer {
  padding: 12px 16px 10px;
  border-top: 1px solid #f3f4f6;
  transition: background-color 0.2s;
}

.composer.is-dragging {
  background: #eff6ff;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 240px;
  padding: 4px 8px;
  font-size: 12px;
  color: #374151;
  background: #f3f4f6;
  border-radius: 6px;
}

.attachment-name {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attachment-kind {
  padding: 0 4px;
  font-size: 11px;
  color: #3b82f6;
  background: #dbeafe;
  border-radius: 3px;
}

.attachment-remove {
  color: #9ca3af;
  cursor: pointer;
}

.attachment-remove:hover {
  color: #ef4444;
}

.composer-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.attach-btn {
  font-size: 18px;
  color: #6b7280;
  padding: 6px;
}

.attach-btn:hover {
  color: #3b82f6;
}

.composer-input {
  flex: 1;
  min-height: 38px;
  max-height: 160px;
  padding: 9px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  resize: none;
  transition: border-color 0.2s;
}

.composer-input:focus {
  border-color: #3b82f6;
  background: #fff;
}

.composer-input:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.send-btn {
  flex-shrink: 0;
}

.composer-hint {
  margin-top: 6px;
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
}

.drop-hint {
  color: #3b82f6;
  font-weight: 500;
}

.file-input {
  display: none;
}

/* ============ 响应式 ============ */
.sidebar-toggle {
  display: none;
}

@media (max-width: 900px) {
  .ai-page {
    padding: 12px;
    gap: 0;
    position: relative;
  }

  .sidebar-toggle {
    display: inline-flex;
  }

  .session-panel {
    position: absolute;
    top: 12px;
    bottom: 12px;
    left: 12px;
    z-index: 20;
    transform: translateX(-110%);
    transition: transform 0.25s;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .session-panel.is-open {
    transform: translateX(0);
  }

  .message-body {
    max-width: 88%;
  }
}
</style>
