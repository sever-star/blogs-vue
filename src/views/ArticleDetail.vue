<template>
  <main class="article-detail" :class="{ 'with-drawer': commentOpen }">
    <div class="detail-container">
      <!-- 顶部信息条：作者在左、操作按钮在右，与文章同宽平齐；滚动时吸顶不动 -->
      <div v-if="articleStore.currentArticle" class="top-bar">
        <div class="top-author">
          <el-avatar :size="36" :src="articleStore.currentArticle.authorAvatar || undefined">
            {{ (articleStore.currentArticle.authorNickname || '?').charAt(0) }}
          </el-avatar>
          <span class="top-author-name">{{ articleStore.currentArticle.authorNickname }}</span>
          <span class="top-author-label">文章作者</span>
          <el-tag v-if="isAuthor" type="primary" size="small" effect="light">我的文章</el-tag>
        </div>
        <div class="top-actions">
          <button
            type="button"
            class="action-item"
            :class="{ 'is-favorited': isFavorited }"
            @click="handleFavorite"
          >
            <el-icon><Collection /></el-icon>
            <span class="action-label">收藏</span>
            <span class="action-count">{{ articleStore.currentArticle.favCount ?? 0 }}</span>
          </button>
          <button type="button" class="action-item" @click="handleLike">
            <el-icon><Star /></el-icon>
            <span class="action-label">点赞</span>
            <span class="action-count">{{ articleStore.currentArticle.likeCount ?? 0 }}</span>
          </button>
          <button
            type="button"
            class="action-item"
            :class="{ 'is-comment': commentOpen }"
            @click="commentOpen = !commentOpen"
          >
            <el-icon><ChatDotRound /></el-icon>
            <span class="action-label">评论</span>
            <span class="action-count">{{ articleStore.currentArticle.commentCount ?? 0 }}</span>
          </button>
        </div>
      </div>

      <!-- 文章 -->
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

        </article>
      </div>
    </div>

    <!-- 右侧评论弹窗：贴视口右缘，宽 320px；打开时正文整体左移让位，不遮文章 -->
    <transition name="comment-drawer">
      <aside v-if="commentOpen && articleStore.currentArticle" class="comment-drawer">
        <div class="comment-drawer-header">
          <span class="comment-drawer-title">评论</span>
          <el-button link @click="commentOpen = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="comment-drawer-body">
          <CommentSection :article-id="articleId" />
        </div>
      </aside>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticleStore } from '@/stores/article'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { MdPreview as MDPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { Star, ChatDotRound, User, Calendar, View, Edit, Collection, Close } from '@element-plus/icons-vue'
import CommentSection from '@/components/CommentSection.vue'

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
  } catch (error) {
    ElMessage.error('加载文章失败')
    console.error('加载文章失败:', error)
  }
})

onUnmounted(() => {
  document.title = previousTitle
})

function handleLike() {
  ElMessage.success('已点赞')
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
  transition: padding-right 0.25s ease;
}

/* 评论弹窗打开时正文整体左移让位（弹窗固定占右侧 340px），不遮文章主体 */
.article-detail.with-drawer {
  padding-right: 340px;
}

.detail-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-main {
  min-width: 0; /* 防止 markdown 宽内容撑破网格 */
}

/* ---- 顶部信息条：作者在左、操作按钮在右，与文章同宽平齐，吸顶不动 ---- */

.top-bar {
  position: sticky;
  top: 70px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 12px;
  padding: 10px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.top-author {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.top-author-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-author-label {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.top-actions {
  display: flex;
  gap: 10px;
}

/* ---- 操作按钮（顶部横排胶囊） ---- */

.action-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  cursor: pointer;
  color: #4b5563;
  font-size: 14px;
  transition: all 0.2s;
}

.action-item:hover {
  border-color: #409eff;
  color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.action-count {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.action-label {
  font-size: 13px;
  color: #6b7280;
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

/* ---- 右侧评论弹窗 ---- */

.comment-drawer {
  position: fixed;
  top: 70px;
  right: 0;
  bottom: 0;
  width: 320px;
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

.comment-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 评论组件自带白卡样式，放进弹窗后去掉外层卡片感 */
:deep(.comment-section) {
  margin: 0;
  padding: 0;
  background: transparent;
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

@media (max-width: 768px) {
  .detail-container {
    padding: 0 12px;
  }

  /* 窄屏顶部条换行：作者居中一行，操作按钮另起一行居中 */
  .top-bar {
    justify-content: center;
  }

  .top-author {
    width: 100%;
    justify-content: center;
  }

  .comment-drawer {
    width: min(320px, 85vw);
  }

  /* 手机上弹窗直接覆盖，不再挤占正文宽度 */
  .article-detail.with-drawer {
    padding-right: 0;
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
