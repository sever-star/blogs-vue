<template>
  <main class="article-detail">
    <div class="detail-container">
      <!-- 左栏：文章 -->
      <div class="detail-main">
        <!-- 加载状态 -->
        <div v-if="articleStore.loading && !articleStore.currentArticle" class="loading">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 文章不存在 -->
        <div v-else-if="!articleStore.currentArticle" class="not-found">
          <el-empty description="文章不存在" />
        </div>

        <!-- 文章内容 -->
        <article v-else>
          <!-- 文章头部 -->
          <header class="article-header">
            <div class="title-row">
              <h1 class="article-title">{{ articleStore.currentArticle.title }}</h1>
              <el-button v-if="isAuthor" type="primary" plain size="small" class="edit-btn" @click="handleEdit">
                <el-icon><Edit /></el-icon>
                编辑文章
              </el-button>
              <!-- 下架：作者本人或管理员，仅已发布（status=1）；重新上架走编辑→审核流程 -->
              <el-button
                v-if="canOffline"
                type="danger"
                plain
                size="small"
                class="offline-btn"
                @click="handleOffline"
              >
                下架
              </el-button>
            </div>

            <div class="article-info">
              <span class="author">
                <el-icon><User /></el-icon>
                {{ articleStore.currentArticle.authorNickname }}
                <el-tag v-if="isAuthor" type="primary" size="small" effect="light" class="author-badge">
                  我的文章
                </el-tag>
              </span>
              <span class="publish-time">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(articleStore.currentArticle.createdAt) }}
              </span>
              <span class="views">
                <el-icon><View /></el-icon>
                {{ articleStore.currentArticle.viewCount }} 次浏览
              </span>
            </div>

            <!-- 文章标签 -->
            <div class="article-tags">
              <el-tag
                v-for="tag in articleStore.currentArticle.tags"
                :key="tag.id"
                type="info"
                effect="plain"
                class="tag"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </header>

          <!-- 文章正文 -->
          <div class="article-content markdown-body">
            <!-- MdPreview 只认 modelValue，:text 不是合法 prop（会被忽略导致正文空白） -->
            <MDPreview :model-value="articleStore.currentArticle.contentMd" preview-only />
          </div>

          <!-- 文章下方评论区：首页文章列表同款（默认 5 条 + 查看全部评论后无限加载） -->
          <CommentSection :article-id="articleId" :author-id="articleStore.currentArticle?.userId ?? null" variant="inline" class="below-comments" />
        </article>
      </div>

      <!-- 左侧操作栏：点赞 / 收藏 / 评论 平铺（窄屏落到文章下方横排） -->
      <div v-if="articleStore.currentArticle" class="action-bar">
        <button
          type="button"
          class="action-item"
          :class="{ 'is-favorited': isFavorited }"
          @click="handleFavorite"
        >
          <el-icon>
            <StarFilled v-if="isFavorited" />
            <Star v-else />
          </el-icon>
          <span class="action-count">{{ articleStore.currentArticle.favCount ?? 0 }}</span>
          <span class="action-label">收藏</span>
        </button>
        <button
          type="button"
          class="action-item"
          :class="{ 'is-liked': isLiked }"
          @click="handleLike"
        >
          <!-- Element Plus 图标库无大拇指，用内联 SVG（fill=currentColor 跟随按钮悬停/高亮变色） -->
          <svg class="thumb-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
            />
          </svg>
          <span class="action-count">{{ articleStore.currentArticle.likeCount ?? 0 }}</span>
          <span class="action-label">点赞</span>
        </button>
        <button
          type="button"
          class="action-item"
          :class="{ 'is-comment': commentOpen }"
          @click="commentOpen = !commentOpen"
        >
          <el-icon><ChatDotRound /></el-icon>
          <span class="action-count">{{ articleStore.currentArticle.commentCount ?? 0 }}</span>
          <span class="action-label">评论</span>
        </button>
        <!-- 复制 Markdown 源码：一键拿全文 md，无需从渲染区复制再转格式 -->
        <button type="button" class="action-item" @click="handleCopyMd">
          <el-icon><DocumentCopy /></el-icon>
          <span class="action-label">复制MD</span>
        </button>
      </div>

      <!-- 右栏：作者信息（文章加载完成后展示，窄屏落到文章下方） -->
      <aside v-if="articleStore.currentArticle" class="author-sidebar">
        <el-card shadow="never" class="author-card">
          <div class="author-block">
            <el-avatar :size="56" :src="articleStore.currentArticle.authorAvatar || undefined">
              {{ (articleStore.currentArticle.authorNickname || '?').charAt(0) }}
            </el-avatar>
            <div class="author-meta">
              <span class="author-nickname">{{ articleStore.currentArticle.authorNickname }}</span>
              <span class="author-label">文章作者</span>
            </div>
          </div>
          <el-tag v-if="isAuthor" type="primary" size="small" effect="light">
            我的文章
          </el-tag>
          <!-- 关注/私信：看自己文章不展示；私信暂为占位 -->
          <div v-else class="author-actions">
            <el-button
              size="small"
              :type="followed ? 'info' : 'primary'"
              :plain="!followed"
              :loading="followLoading"
              @click="handleFollow"
            >
              {{ followed ? '已关注' : '关注' }}
            </el-button>
            <el-button size="small" plain @click="handleMessage">私信</el-button>
          </div>
        </el-card>
      </aside>
    </div>

    <!-- 右侧评论弹窗：贴视口右缘，宽 370px——≥1200px 视口下正好覆盖作者栏区域，不遮正文 -->
    <!-- 弹窗展开时主页罩一层半透明遮罩做亮度区分，点遮罩即收起 -->
    <transition name="comment-overlay">
      <div v-if="commentOpen" class="comment-overlay" @click="commentOpen = false"></div>
    </transition>
    <transition name="comment-drawer">
      <aside v-if="commentOpen && articleStore.currentArticle" class="comment-drawer">
        <div class="comment-drawer-header">
          <span class="comment-drawer-title">评论</span>
          <el-button link @click="commentOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="comment-drawer-body">
          <CommentSection :article-id="articleId" :author-id="articleStore.currentArticle?.userId ?? null" variant="drawer" />
        </div>
      </aside>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticleStore } from '@/stores/article'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MdPreview as MDPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { Star, StarFilled, ChatDotRound, User, Calendar, View, Edit, Close, DocumentCopy } from '@element-plus/icons-vue'
import CommentSection from '@/components/CommentSection.vue'
import { getFollowStatus, followUser, unfollowUser } from '@/api/follow'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()
const authStore = useAuthStore()

const articleId = computed(() => parseInt(route.params.id as string))

// 是否为当前登录用户自己的文章（用于展示身份标识与快捷编辑入口）
const isAuthor = computed(
  () =>
    !!authStore.user?.id &&
    articleStore.currentArticle?.userId === authStore.user.id
)

// 可下架：作者本人或管理员，且文章处于已发布状态
const canOffline = computed(
  () =>
    (isAuthor.value || authStore.isAdmin) &&
    articleStore.currentArticle?.status === 1
)

// 记录进入详情页前的标题：新标签页打开时是 index.html 的「个人博客」，
// 离开详情页（SPA 内返回）时恢复，避免文章标题残留到其他页面
const previousTitle = document.title

onMounted(async () => {
  try {
    await articleStore.fetchArticleById(articleId.value)
    // 标签页标题跟随文章标题（文章卡在新标签页打开时展示的就是它）
    if (articleStore.currentArticle) {
      document.title = articleStore.currentArticle.title
    }
    // 详情页是公开路由，守卫不会等 ensureReady；这里显式等用户态恢复完成，
    // 否则新标签页打开时 user 尚未拉回、isLoggedIn 为 false，关注状态会被跳过
    await authStore.ensureReady()
    // 登录且非作者本人时，拉一次关注状态决定按钮初始态（游客 / 自己文章不发请求，避免 401）
    await loadFollowStatus()
  } catch (error) {
    ElMessage.error('加载文章失败')
    console.error('加载文章失败:', error)
  }
})

// 在详情页登录（弹窗登录）后，登录态由 false→true，补拉一次关注状态
watch(
  () => authStore.isLoggedIn,
  (loggedIn: boolean) => {
    if (loggedIn && articleStore.currentArticle) {
      loadFollowStatus()
    }
  }
)

onUnmounted(() => {
  document.title = previousTitle
})

// 是否已点赞：详情接口仅在登录时返回 liked
const isLiked = computed(() => !!articleStore.currentArticle?.liked)

async function handleLike() {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后再点赞')
    return
  }
  try {
    if (isLiked.value) {
      await articleStore.unlikeArticle(articleId.value)
      ElMessage.success('已取消点赞')
    } else {
      await articleStore.likeArticle(articleId.value)
      ElMessage.success('已点赞')
    }
  } catch (error) {
    ElMessage.error(errorText(error, '点赞失败'))
  }
}

// 是否已收藏：详情接口仅在登录时返回 favorited，游客看到的是未收藏态
const isFavorited = computed(() => !!articleStore.currentArticle?.favorited)

// 右侧评论弹窗开关（点击左侧操作栏的评论按钮切换）
const commentOpen = ref(false)

async function handleFavorite() {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    return
  }
  try {
    if (isFavorited.value) {
      await articleStore.unfavoriteArticle(articleId.value)
      ElMessage.success('已取消收藏')
    } else {
      await articleStore.favoriteArticle(articleId.value)
      ElMessage.success('已收藏')
    }
  } catch (error) {
    ElMessage.error(errorText(error, '收藏失败'))
  }
}

// 与 AiChat 同款：API 错误可能是 { message } 对象或字符串
function errorText(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  if (typeof error === 'string' && error) return error
  return fallback
}

function handleEdit() {
  router.push(`/write/${articleId.value}`)
}

// ---- 关注作者 ----
// 当前用户是否已关注文章作者；仅登录且非作者本人时会查询/生效
const followed = ref(false)
const followLoading = ref(false)

/** 作者用户 ID（被关注对象） */
function authorId(): number | null {
  return articleStore.currentArticle?.userId ?? null
}

/** 详情页仅对「登录 + 非作者本人」拉关注状态；游客/作者本人保持默认未关注 */
async function loadFollowStatus() {
  const id = authorId()
  if (!authStore.isLoggedIn || id == null || isAuthor.value) return
  try {
    followed.value = await getFollowStatus(id)
  } catch {
    // 状态查询失败不打扰用户，按钮保持默认「关注」
    followed.value = false
  }
}

async function handleFollow() {
  const id = authorId()
  if (id == null) return
  if (!authStore.isLoggedIn) {
    authStore.openLoginModal('login')
    return
  }
  if (isAuthor.value) return // 看自己文章不展示按钮，双保险
  followLoading.value = true
  try {
    if (followed.value) {
      await unfollowUser(id)
      followed.value = false
      ElMessage.success('已取消关注')
    } else {
      await followUser(id)
      followed.value = true
      ElMessage.success('已关注')
    }
  } catch (error) {
    ElMessage.error(errorText(error, followed.value ? '取消关注失败' : '关注失败'))
  } finally {
    followLoading.value = false
  }
}

function handleMessage() {
  if (!authStore.isLoggedIn) {
    authStore.openLoginModal('login')
    return
  }
  const id = authorId()
  if (id == null) return
  if (isAuthor.value) return // 看自己文章不展示私信入口，双保险
  router.push({ path: '/messages', query: { userId: id } })
}

/** 下架文章（作者/管理员）：确认后调接口，store 同步 currentArticle.status，按钮随 canOffline 自动消失 */
async function handleOffline() {
  try {
    await ElMessageBox.confirm(
      '下架后文章将从首页和列表消失，需重新编辑并经管理员审核才能再次发布，确定下架吗？',
      '下架文章',
      {
        type: 'warning',
        confirmButtonText: '下架',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    )
  } catch {
    return // 用户取消
  }
  try {
    await articleStore.offlineArticle(articleId.value)
    ElMessage.success('文章已下架')
  } catch (error: any) {
    const message =
      error && typeof error === 'object' && 'message' in error ? String(error.message ?? '') : ''
    ElMessage.error(message || '下架失败，请重试')
    console.error('下架文章失败:', error)
  }
}

/** 复制文章 Markdown 源码到剪贴板：一键拿全文 md（替代从渲染区复制再转格式的绕路做法） */
async function handleCopyMd() {
  const md = articleStore.currentArticle?.contentMd
  if (!md) {
    ElMessage.warning('这篇文章没有 Markdown 源码')
    return
  }
  try {
    await navigator.clipboard.writeText(md)
    ElMessage.success('已复制 Markdown 源码，可直接粘贴到编辑器')
  } catch {
    // 非安全上下文或权限被拒的兜底：临时 textarea + execCommand
    const ta = document.createElement('textarea')
    ta.value = md
    ta.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    if (ok) {
      ElMessage.success('已复制 Markdown 源码，可直接粘贴到编辑器')
    } else {
      ElMessage.error('复制失败，请手动选择正文复制')
    }
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<style scoped>
.article-detail {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 20px 0;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 56px 1fr 300px; /* 操作栏 | 正文 | 作者栏 */
  gap: 20px;
  align-items: start;
}

/* 显式定位到第 1 行同一列宽：Grid 稀疏放置规则是「列号比光标小就换行」，
   正文（第 2 列）在 DOM 里排第一，不锁行的话左栏（第 1 列）会被挤到第 2 行、
   整体掉到文章下面。三栏必须同时锁定 grid-row: 1 才同行平齐。 */
.detail-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0; /* 防止 markdown 宽内容撑破网格 */
}

.author-sidebar {
  grid-column: 3;
  grid-row: 1;
  position: sticky;
  top: 90px;
}

/* ---- 左侧操作栏 ---- */

.action-bar {
  grid-column: 1;
  grid-row: 1;
  position: sticky;
  top: 90px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.action-item {
  width: 52px;
  padding: 10px 0 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  color: #4b5563;
  font-size: 20px;
  transition: all 0.2s;
}

/* 大拇指点赞图标：尺寸跟随按钮 font-size（1em），颜色走 currentColor */
.thumb-icon {
  width: 1em;
  height: 1em;
}

.action-item:hover {
  border-color: #409eff;
  color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.action-count {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.action-label {
  font-size: 11px;
  color: #9ca3af;
  line-height: 1.2;
}

.action-item:hover .action-count,
.action-item:hover .action-label {
  color: #409eff;
}

/* 已收藏：橙色强调 */
.action-item.is-favorited,
.action-item.is-favorited .action-count,
.action-item.is-favorited .action-label {
  border-color: #e6a23c;
  background: #fdf6ec;
  color: #e6a23c;
}

/* 评论弹窗展开中：蓝色强调 */
.action-item.is-comment,
.action-item.is-comment .action-count,
.action-item.is-comment .action-label {
  border-color: #409eff;
  background: #ecf5ff;
  color: #409eff;
}

/* 已点赞：红色强调 */
.action-item.is-liked,
.action-item.is-liked .action-count,
.action-item.is-liked .action-label {
  border-color: #f56c6c;
  background: #fef0f0;
  color: #f56c6c;
}

/* ---- 右侧评论弹窗 ---- */

/* 弹窗展开时罩在主页上的半透明遮罩：略微降低主页亮度做层次区分，点击即收起。
   从视口顶部起覆盖（含页头），与浮窗顶部对齐 */
.comment-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
  cursor: pointer;
}

.comment-overlay-enter-active,
.comment-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.comment-overlay-enter-from,
.comment-overlay-leave-to {
  opacity: 0;
}

.comment-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 370px;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.comment-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.comment-drawer-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

/* 弹窗内评论区铺满剩余高度，滚动交给评论列表自身（不在这里再套一层滚动） */
.comment-drawer-body {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 评论组件自带白卡样式，放进弹窗后去掉外层卡片感，并让它撑满弹窗体 */
:deep(.comment-section) {
  margin: 0;
  padding: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* 标题/表单/查看全部按钮固定不压缩，列表吃掉全部剩余高度并滚动 */
.comment-drawer-body :deep(.comment-section > *:not(.comments-list)) {
  flex-shrink: 0;
}

.comment-drawer-body :deep(.comments-list) {
  max-height: none; /* 覆盖组件默认 360px：弹窗里区域本来就该够高 */
  flex: 1;
  min-height: 0;
}

.comment-drawer-enter-active,
.comment-drawer-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.comment-drawer-enter-from,
.comment-drawer-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.author-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.author-block {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

/* 关注/私信按钮行：卡片底部，两枚等宽 */
.author-actions {
  display: flex;
  gap: 8px;
}

.author-actions .el-button {
  flex: 1;
  margin-left: 0;
}

.author-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.author-nickname {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-label {
  font-size: 12px;
  color: #9ca3af;
}

.loading {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.not-found {
  background: white;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
}

article {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.article-header {
  padding: 32px 24px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.article-title {
  margin: 0 0 16px 0;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.4;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.edit-btn {
  flex-shrink: 0;
}

.author-badge {
  margin-left: 2px;
}

.article-info {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
}

.article-info span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  cursor: pointer;
}

.article-content {
  padding: 24px;
  font-size: 15px;
  line-height: 1.8;
  color: #333;
}

/* 文章下方评论区：嵌在正文卡片底部。
   左右各留 24px——与正文(article-content padding 24)一致的边距,
   顶部分隔线也随之内缩,不贴卡片边缘 */
.below-comments.comment-section {
  margin: 16px 24px 0;
  padding: 16px 0 24px;
  border-radius: 0;
  border-top: 1px solid #e5e7eb;
}

.markdown-body {
  word-break: break-word;
}

:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3),
:deep(.markdown-body h4),
:deep(.markdown-body h5),
:deep(.markdown-body h6) {
  margin: 24px 0 16px 0;
  font-weight: 600;
  line-height: 1.4;
}

:deep(.markdown-body h1) {
  font-size: 28px;
}

:deep(.markdown-body h2) {
  font-size: 24px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 8px;
}

:deep(.markdown-body h3) {
  font-size: 20px;
}

:deep(.markdown-body h4) {
  font-size: 18px;
}

:deep(.markdown-body p) {
  margin: 12px 0;
}

:deep(.markdown-body code) {
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #d63384;
}

:deep(.markdown-body pre) {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

:deep(.markdown-body pre code) {
  background: none;
  color: inherit;
  padding: 0;
  border-radius: 0;
}

:deep(.markdown-body blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  background-color: #f9fafb;
  border-left: 4px solid #1890ff;
  color: #666;
}

:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  margin: 12px 0;
  padding-left: 24px;
}

:deep(.markdown-body li) {
  margin: 8px 0;
}

:deep(.markdown-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

:deep(.markdown-body th),
:deep(.markdown-body td) {
  border: 1px solid #e5e7eb;
  padding: 12px;
  text-align: left;
}

:deep(.markdown-body th) {
  background-color: #f9fafb;
  font-weight: 600;
}

/* 窄屏收起三栏：正文占满，操作栏变为横排落在文章下方，作者卡片最后 */
@media (max-width: 1024px) {
  .detail-container {
    grid-template-columns: 1fr;
  }

  /* 单列后必须回到第 1 列并解除行锁定，否则显式列/行号会撑出隐式格或互相重叠 */
  .detail-main,
  .action-bar,
  .author-sidebar {
    grid-column: 1;
    grid-row: auto;
  }

  .author-sidebar {
    position: static;
  }

  .action-bar {
    position: static;
    flex-direction: row;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .detail-container {
    padding: 0 12px;
  }

  .comment-drawer {
    width: min(370px, 85vw);
  }

  .article-header {
    padding: 20px 16px 16px;
  }

  .article-title {
    font-size: 24px;
  }

  .article-info {
    gap: 12px;
    font-size: 12px;
  }

  .article-content {
    padding: 16px;
    font-size: 14px;
  }
}
</style>
