<template>
  <div class="comment-section" :class="`comment-section--${variant}`">
    <h3 class="section-title">评论区 ({{ comments.length }})</h3>

    <!-- 评论表单 -->
    <div class="comment-form" v-if="authStore.isLoggedIn">
      <textarea
        v-model="newComment"
        placeholder="说说你的想法..."
        class="comment-input"
        rows="4"
      ></textarea>
      <button @click="submitComment" :disabled="!newComment.trim() || submitting" class="submit-btn">
        {{ submitting ? '发布中...' : '发布评论' }}
      </button>
    </div>

    <!-- 未登录提示 -->
    <div v-else class="login-prompt">
      <p>请 <el-button link @click="handleLogin">登录</el-button> 后发表评论</p>
    </div>

    <!-- 评论列表 -->
    <div class="comments-list">
      <div
        v-for="comment in visibleComments"
        :key="comment.id"
        :id="`comment-${comment.id}`"
        class="comment-item"
        :class="{ 'comment-highlight': highlightId === comment.id }"
      >
        <img :src="comment.avatar" :alt="comment.nickname" class="user-avatar" />
        <div class="comment-content">
          <div class="comment-header">
            <span class="username">
              {{ comment.nickname }}
              <el-tag v-if="comment.isAdmin === 1" size="small" type="danger" class="admin-badge">博主</el-tag>
            </span>
            <span class="comment-time">{{ formatCommentDate(comment.createdAt) }}</span>
          </div>
          <p class="comment-text">{{ comment.content }}</p>
          <div class="comment-footer">
            <span
              class="like-btn"
              :class="{ 'is-liked': comment.liked }"
              @click="handleLike(comment)"
            >
              <!-- 与文章点赞同款大拇指 SVG：fill=currentColor 跟随 is-liked 金色/默认灰 -->
              <svg class="thumb-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
              </svg>
              {{ comment.likeCount }}
            </span>
            <span class="reply-action" @click="startReplyToComment(comment)">回复</span>
            <span v-if="comment.replies && comment.replies.length > 0" class="reply-count">
              回复 ({{ comment.replies.length }})
            </span>
            <span v-if="canDelete(comment)" class="delete-action" @click="handleDelete(comment)">删除</span>
          </div>
          <!-- 行内回复表单：点该评论的「回复」才出现，提交即子评论 -->
          <div v-if="replyTarget?.key === `t${comment.id}`" class="reply-form">
            <textarea
              v-model="replyContent"
              :placeholder="`回复 @${replyTarget?.nickname}...`"
              class="comment-input reply-input"
              rows="3"
            ></textarea>
            <div class="reply-form-actions">
              <el-button size="small" @click="cancelReply">取消</el-button>
              <el-button size="small" type="primary" :disabled="!replyContent.trim() || submittingReply" @click="submitReply">
                {{ submittingReply ? '回复中...' : '回复' }}
              </el-button>
            </div>
          </div>
          <!-- 嵌套回复 -->
          <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
            <div
              v-for="reply in comment.replies"
              :key="reply.id"
              :id="`comment-${reply.id}`"
              class="reply-item"
              :class="{ 'comment-highlight': highlightId === reply.id }"
            >
              <img :src="reply.avatar" :alt="reply.nickname" class="reply-avatar" />
              <div class="reply-content">
                <div class="reply-header">
                  <span class="reply-username">
                    {{ reply.nickname }}
                    <el-tag v-if="reply.isAdmin === 1" size="small" type="danger" class="admin-badge">博主</el-tag>
                  </span>
                  <span class="reply-time">{{ formatCommentDate(reply.createdAt) }}</span>
                </div>
                <p class="reply-text">
                  <!-- 子评论回复的是同一条顶级评论下的另一条回复时，正文前标注被回复用户 -->
                  <span v-if="replyTargetName(comment, reply)" class="reply-to">
                    回复 @{{ replyTargetName(comment, reply) }}：
                  </span>
                  {{ reply.content }}
                </p>
                <div class="reply-actions">
                  <span
                    class="like-btn"
                    :class="{ 'is-liked': reply.liked }"
                    @click="handleLike(reply)"
                  >
                    <svg class="thumb-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
                    </svg>
                    {{ reply.likeCount }}
                  </span>
                  <span class="reply-action" @click="startReplyToReply(comment, reply)">回复</span>
                  <span v-if="canDelete(reply)" class="delete-action" @click="handleDelete(reply)">删除</span>
                </div>
                <div v-if="replyTarget?.key === `r${reply.id}`" class="reply-form">
                  <textarea
                    v-model="replyContent"
                    :placeholder="`回复 @${replyTarget?.nickname}...`"
                    class="comment-input reply-input"
                    rows="3"
                  ></textarea>
                  <div class="reply-form-actions">
                    <el-button size="small" @click="cancelReply">取消</el-button>
                    <el-button size="small" type="primary" :disabled="!replyContent.trim() || submittingReply" @click="submitReply">
                      {{ submittingReply ? '回复中...' : '回复' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!--
      文章下方评论区（inline）：首页文章列表同款交互——
      默认只展示 PREVIEW_COUNT 条顶级评论，点「查看全部评论」后切到
      「加载更多 + 无限滚动」模式，按 BATCH 逐步铺开，不再一次性全量渲染。
      评论浮窗（drawer）则全量展示、容器内滚动，不需要这个入口。
    -->
    <div v-if="showEntryButton" class="show-all">
      <el-button link type="primary" @click="expandToList">
        查看全部评论（共 {{ comments.length }} 条）
      </el-button>
    </div>
    <template v-if="expanded && hasMore">
      <div class="load-more">
        <el-button :loading="loadingMore" @click="loadMore">加载更多</el-button>
      </div>
      <!-- 无限滚动触发器：滚入视口即加载下一批（与 Home.vue 一致） -->
      <div ref="scrollTrigger" class="scroll-trigger"></div>
    </template>

    <!-- 暂无评论 -->
    <div v-if="comments.length === 0" class="no-comments">
      <el-empty description="暂无评论" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCommentStore } from '@/stores/comment'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Comment } from '@/types'

const props = withDefaults(
  defineProps<{
    articleId: number
    /** drawer=评论浮窗（全量展示、容器内滚动、无加载更多）；inline=文章下方（首页风格分批+无限滚动） */
    variant?: 'drawer' | 'inline'
    /** 文章作者 id：与登录用户比对，决定是否展示评论删除按钮 */
    authorId?: number | null
  }>(),
  { variant: 'inline', authorId: null }
)

const commentStore = useCommentStore()
const authStore = useAuthStore()
const route = useRoute()

const newComment = ref('')
const submitting = ref(false)

// 顶级评论（已含各自嵌套 replies）
const comments = computed(() => commentStore.getArticleComments(props.articleId))

// inline 模式的分批加载状态
const PREVIEW_COUNT = 5
const BATCH = 10
const expanded = ref(false)
const displayCount = ref(PREVIEW_COUNT)
const loadingMore = ref(false)

// drawer：全量展示；inline：按 displayCount 分批
const visibleComments = computed(() =>
  props.variant === 'drawer' ? comments.value : comments.value.slice(0, displayCount.value)
)
const hasMore = computed(() => displayCount.value < comments.value.length)
// 仅 inline 且未展开且超过预览数时显示「查看全部评论」入口
const showEntryButton = computed(
  () => props.variant === 'inline' && !expanded.value && comments.value.length > PREVIEW_COUNT
)

onMounted(async () => {
  await commentStore.fetchComments(props.articleId)
  await scrollToCommentIfAny()
})

// 已在文章页时又点了一条指向同文不同评论的通知：URL 只变 hash、组件不重挂载，
// 必须监听 route.hash 再触发一次定位
watch(() => route.hash, async () => {
  await scrollToCommentIfAny()
})

// ---- 站内通知跳转定位：/article/{id}#comment-{commentId} ----
/** 当前高亮的评论 id（黄色背景闪烁，帮用户找到目标） */
const highlightId = ref<number | null>(null)

/** 从路由 hash 里解析目标评论 id（#comment-123 → 123） */
function anchorCommentIdFromHash(): number | null {
  const m = route.hash.match(/^#comment-(\d+)$/)
  return m ? Number(m[1]) : null
}

/**
 * 通知跳转过来后滚动到目标评论。
 * 时序：路由到达时评论还在异步加载/未展开，必须等 fetchComments 完成、
 * 目标所在顶级评论进入展示批次、DOM 渲染出来之后再滚。
 * 仅 inline（文章下方评论区）执行；drawer 变体懒加载，不做自动滚动。
 */
async function scrollToCommentIfAny() {
  if (props.variant !== 'inline') return
  const targetId = anchorCommentIdFromHash()
  if (!targetId) return
  const all = comments.value
  const topIdx = all.findIndex(
    (c: Comment) => c.id === targetId || c.replies?.some((r: Comment) => r.id === targetId)
  )
  if (topIdx === -1) return // 评论不存在（已删除或不属于本文）
  // 目标在未展示的批次里：展开列表并把展示条数扩到包含它
  if (!expanded.value && topIdx >= PREVIEW_COUNT) expandToList()
  if (topIdx >= displayCount.value) displayCount.value = topIdx + 1
  // 等 DOM 渲染；保险起见重试几轮
  for (let i = 0; i < 10; i++) {
    await nextTick()
    const el = document.getElementById(`comment-${targetId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightId.value = targetId
      setTimeout(() => {
        if (highlightId.value === targetId) highlightId.value = null
      }, 2500)
      return
    }
    await new Promise(r => setTimeout(r, 200))
  }
}

// 切换文章时重置分批加载状态
watch(
  () => props.articleId,
  () => {
    expanded.value = false
    displayCount.value = PREVIEW_COUNT
    observer?.disconnect()
  }
)

async function submitComment() {
  // 硬拦截：评论必须登录（表单虽然只对登录用户渲染，这里再兜一层防状态过期）
  if (!authStore.isLoggedIn) {
    ElMessage.warning('评论需要登录')
    authStore.openLoginModal()
    return
  }
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }

  submitting.value = true
  try {
    await commentStore.addComment({
      articleId: props.articleId,
      content: newComment.value,
    })
    newComment.value = ''
    ElMessage.success('评论发布成功')
  } catch (error: any) {
    // 透出后端原因（401 未登录 / 内容过长 / 文章不允许评论等）
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message ?? '')
        : ''
    ElMessage.error(message || '评论失败，请重试')
    console.error('评论失败:', error)
  } finally {
    submitting.value = false
  }
}

// 正在点赞的评论 id，请求期间禁用该条点赞按钮，防重复提交触发「您已点赞/未点赞」
const likingId = ref<number | null>(null)

/** 点赞/取消点赞（顶级评论与子评论共用）：按当前 liked 状态切换，失败透出原因 */
async function handleLike(comment: Comment) {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    authStore.openLoginModal()
    return
  }
  if (likingId.value !== null) return
  likingId.value = comment.id
  try {
    await commentStore.toggleLike(props.articleId, comment.id)
  } catch (error: any) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message ?? '')
        : ''
    ElMessage.error(message || '操作失败，请重试')
    console.error('评论点赞失败:', error)
  } finally {
    likingId.value = null
  }
}

/**
 * 当前用户能否删除这条评论：管理员 / 文章作者 / 评论作者本人
 * （与后端 deleteComment 的校验规则一致，按钮只做展示层控制，真正权限在后端）
 */
function canDelete(comment: Comment): boolean {
  const uid = authStore.user?.id
  if (!authStore.isLoggedIn || !uid) return false
  if (authStore.isAdmin) return true
  if (props.authorId != null && props.authorId === uid) return true
  return comment.userId === uid
}

/** 删除评论（含子评论）：确认后调接口，成功后本地列表移除 */
async function handleDelete(comment: Comment) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，连同其下回复一并删除，确定吗？', '删除评论', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return // 用户取消
  }
  try {
    await commentStore.deleteComment(props.articleId, comment.id)
    ElMessage.success('评论已删除')
  } catch (error: any) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message ?? '')
        : ''
    ElMessage.error(message || '删除失败，请重试')
    console.error('删除评论失败:', error)
  }
}

/**
 * 取一条子评论「回复的是谁」的昵称，用于正文前展示「回复 @X：」。
 * - replyToId 指向顶级评论本身（直接回复顶级）时不显示，因为位置已隐含；
 * - 指向同一条顶级评论下的另一条回复时，在该回复列表里查 nickname。
 * 被回复对象就在已加载的本条评论的 replies 里，前端本地即可解析，无需后端字段。
 */
function replyTargetName(comment: Comment, reply: Comment): string | null {
  const targetId = reply.replyToId
  if (!targetId || targetId === comment.id) return null
  const target = comment.replies?.find((r: Comment) => r.id === targetId)
  return target ? target.nickname : null
}

function handleLogin() {
  authStore.openLoginModal()
}

// ---- 行内回复（子评论）----
// 主表单「发布评论」始终发顶级评论（不带 parentId）；
// 点评论/回复上的「回复」才进入此模式，提交的 parentId 指向被回复的顶级评论 → 子评论。
interface ReplyTarget {
  /** 唯一标识当前回复表单挂在哪条上：`t{id}`=顶级评论、`r{id}`=某条回复 */
  key: string
  /** 子评论挂到哪条顶级评论下（parentId 永远是顶级评论 id） */
  parentId: number
  /** 被回复的那条评论 id（replyToId） */
  replyToId: number
  nickname: string
}
const replyTarget = ref<ReplyTarget | null>(null)
const replyContent = ref('')
const submittingReply = ref(false)

function startReply(comment: Comment, reply?: Comment) {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('回复需要登录')
    authStore.openLoginModal()
    return
  }
  // 二级回复也挂在所属顶级评论下：parentId 取顶级 comment.id，replyToId 取被点的那条
  replyTarget.value = reply
    ? { key: `r${reply.id}`, parentId: comment.id, replyToId: reply.id, nickname: reply.nickname }
    : { key: `t${comment.id}`, parentId: comment.id, replyToId: comment.id, nickname: comment.nickname }
  replyContent.value = ''
}

function startReplyToComment(comment: Comment) {
  startReply(comment)
}

function startReplyToReply(comment: Comment, reply: Comment) {
  startReply(comment, reply)
}

function cancelReply() {
  replyTarget.value = null
  replyContent.value = ''
}

async function submitReply() {
  const target = replyTarget.value
  if (!target || !replyContent.value.trim()) return
  submittingReply.value = true
  try {
    await commentStore.addComment({
      articleId: props.articleId,
      content: replyContent.value,
      parentId: target.parentId,
      replyToId: target.replyToId,
    })
    replyContent.value = ''
    replyTarget.value = null
    ElMessage.success('回复成功')
  } catch (error: any) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String(error.message ?? '')
        : ''
    ElMessage.error(message || '回复失败，请重试')
    console.error('回复失败:', error)
  } finally {
    submittingReply.value = false
  }
}

/** 点击「查看全部评论」：进入无限加载模式，先放出第一批，再挂载滚动观察器 */
function expandToList() {
  expanded.value = true
  displayCount.value = Math.min(comments.value.length, PREVIEW_COUNT + BATCH)
  nextTick(setupObserver)
}

function loadMore() {
  loadingMore.value = true
  displayCount.value = Math.min(comments.value.length, displayCount.value + BATCH)
  loadingMore.value = false
  if (!hasMore.value) observer?.disconnect()
}

// 无限滚动观察器（root=视口，与首页文章列表一致）
let observer: IntersectionObserver | null = null
const scrollTrigger = ref<HTMLElement>()

function setupObserver() {
  observer?.disconnect()
  if (!scrollTrigger.value) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore.value) loadMore()
      })
    },
    { root: null, rootMargin: '100px', threshold: 0.01 }
  )
  observer.observe(scrollTrigger.value)
}

// 列表条数变化后（如新发评论、拉取完成）重排观察器
watch(
  () => comments.value.length,
  () => {
    nextTick(() => {
      if (expanded.value && hasMore.value && scrollTrigger.value) setupObserver()
      else if (!hasMore.value) observer?.disconnect()
    })
  }
)

onUnmounted(() => observer?.disconnect())

function formatCommentDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.comment-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-top: 24px;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.comment-form {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 15px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s;
}

.comment-input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
}

.submit-btn {
  align-self: flex-end;
  padding: 8px 24px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #40a9ff;
}

.submit-btn:disabled {
  background-color: #bfdbfe;
  cursor: not-allowed;
}

.login-prompt {
  text-align: center;
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 6px;
  color: #666;
  margin-bottom: 24px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  /* 下拉形式：内容超出后在容器内滚动，不把页面撑长 */
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
  /* 滚动照常，但隐藏右侧滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.comments-list::-webkit-scrollbar {
  display: none;
}

/* inline（文章下方，首页风格）：列表随页面增长，分批加载，不分页滚动 */
.comment-section--inline .comments-list {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

/* 查看全部/收起 */
.show-all {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  text-align: center;
}

/* 加载更多 + 无限滚动触发器（与 Home.vue 一致） */
.load-more {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.scroll-trigger {
  height: 1px;
  visibility: hidden;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

/* 从通知跳转定位到的目标评论：短暂高亮帮用户找到位置 */
.comment-item.comment-highlight,
.reply-item.comment-highlight {
  animation: comment-flash 2.5s ease;
  border-radius: 6px;
}

@keyframes comment-flash {
  0% {
    background-color: #fff7e6;
  }
  100% {
    background-color: transparent;
  }
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.username {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.comment-time {
  font-size: 13px;
  color: #999;
}

.comment-text {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 16px;
  line-height: 1.7;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #999;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.3s;
}

/* 大拇指图标：尺寸跟随 .like-btn 字号（1em），颜色走 currentColor */
.thumb-icon {
  width: 1em;
  height: 1em;
}

.like-btn:hover {
  color: #1890ff;
}

/* 已点赞：实心星标 + 金色强调 */
.like-btn.is-liked {
  color: #f7ba2a;
}

.like-btn.is-liked:hover {
  color: #f7ba2a;
}

.reply-count {
  cursor: default;
  font-size: 13px;
  color: #999;
}

/* 回复动作按钮（顶级评论 footer 与回复区共用） */
.reply-action {
  font-size: 13px;
  color: #999;
  cursor: pointer;
  transition: color 0.3s;
}

.reply-action:hover {
  color: #1890ff;
}

.reply-actions {
  display: flex;
  gap: 8px;
  margin: 4px 0 0;
}

/* 删除按钮：与「回复」同排，仅文章作者/管理员/评论作者可见 */
.delete-action {
  font-size: 13px;
  color: #999;
  cursor: pointer;
  transition: color 0.3s;
}

.delete-action:hover {
  color: #f56c6c;
}

/* 行内回复表单：挂在被回复评论/回复的下方 */
.reply-form {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-input {
  font-size: 14px;
}

.reply-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.admin-badge {
  margin-left: 4px;
  vertical-align: middle;
}

.replies-list {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #e5e7eb;
}

.reply-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
}

.reply-item + .reply-item {
  border-top: 1px solid #f5f5f5;
}

.reply-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.reply-content {
  flex: 1;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reply-username {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.reply-time {
  font-size: 12px;
  color: #999;
}

.reply-text {
  margin: 0;
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  word-break: break-word;
}

/* 子评论正文前的「回复 @X：」前缀 */
.reply-to {
  color: #1890ff;
  font-weight: 600;
  margin-right: 2px;
}

.no-comments {
  padding: 40px 20px;
}

.login-prompt :deep(.el-button--link) {
  color: #1890ff;
}
</style>
