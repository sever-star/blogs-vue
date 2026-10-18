<template>
  <main class="my-articles-page">
    <div class="page-container">
      <!-- 页头 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">我的文章</h1>
          <span class="page-subtitle">共 {{ articles.length }} 篇</span>
        </div>
        <el-button type="primary" @click="router.push('/write')">
          <el-icon style="margin-right: 4px"><Edit /></el-icon>
          写文章
        </el-button>
      </div>

      <!-- 按发布状态（status）筛选：0=草稿 1=已发布 2=已下架 -->
      <el-tabs v-model="activeTab" class="status-tabs">
        <el-tab-pane :label="`全部 (${counts.all})`" name="all" />
        <el-tab-pane :label="`已发布 (${counts.published})`" name="published" />
        <el-tab-pane :label="`草稿 (${counts.draft})`" name="draft" />
        <el-tab-pane :label="`已下架 (${counts.offline})`" name="offline" />
      </el-tabs>

      <!-- 加载中 -->
      <div v-if="loading" class="panel">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- 加载失败 -->
      <div v-else-if="loadError" class="panel error-panel">
        <el-empty :description="loadError">
          <el-button type="primary" @click="load">重试</el-button>
        </el-empty>
      </div>

      <!-- 空列表 -->
      <div v-else-if="filteredArticles.length === 0" class="panel">
        <el-empty :description="emptyText" />
      </div>

      <!-- 文章列表 -->
      <div v-else class="article-list panel">
        <div v-for="article in filteredArticles" :key="article.id" class="article-row">
          <!-- 封面 -->
          <div class="row-cover">
            <img
              v-if="article.coverImage"
              :src="article.coverImage"
              :alt="article.title"
              loading="lazy"
            />
            <div v-else class="cover-placeholder">无封面</div>
          </div>

          <!-- 主体信息 -->
          <div class="row-main">
            <div class="row-title-line">
              <!-- 标题新标签页打开（与首页文章卡片一致） -->
              <a
                :href="detailHref(article.id)"
                target="_blank"
                rel="noopener"
                class="row-title"
              >
                {{ article.title }}
              </a>
              <!-- 发布状态：status -->
              <el-tag :type="statusMeta(article.status).type" size="small" effect="light">
                {{ statusMeta(article.status).label }}
              </el-tag>
              <!-- 审核状态：review_status（通过时不显示，已发布/已下架本身可推断） -->
              <el-tag
                v-if="reviewTag(article).label"
                :type="reviewTag(article).type"
                size="small"
                effect="plain"
              >
                {{ reviewTag(article).label }}
              </el-tag>
            </div>

            <p class="row-summary">{{ article.summary || '暂无摘要' }}</p>

            <div class="row-meta">
              <span v-if="article.category" class="meta-item">
                <el-icon><Folder /></el-icon>
                {{ article.category.name }}
              </span>
              <span class="meta-item">
                <el-icon><Calendar /></el-icon>
                更新于 {{ formatDate(article.updatedAt || article.createdAt) }}
              </span>
              <span class="meta-item">
                <el-icon><View /></el-icon>
                {{ article.viewCount ?? 0 }} 浏览
              </span>
              <span class="meta-item">
                <el-icon><Star /></el-icon>
                {{ article.likeCount ?? 0 }} 点赞
              </span>
            </div>
          </div>

          <!-- 操作 -->
          <div class="row-actions">
            <el-button size="small" @click="router.push(`/write/${article.id}`)">
              <el-icon style="margin-right: 4px"><Edit /></el-icon>
              编辑
            </el-button>
            <!-- 仅已发布可下架；下架后需重新编辑并经管理员审核才能再发布 -->
            <el-button
              v-if="article.status === 1"
              size="small"
              type="danger"
              plain
              @click="handleOffline(article)"
            >
              下架
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Calendar, View, Star, Folder } from '@element-plus/icons-vue'
import { getMyArticles, offlineArticle } from '@/api/article'
import type { ArticleListItem } from '@/types'

const router = useRouter()

const articles = ref<ArticleListItem[]>([])
const loading = ref(false)
const loadError = ref('')
// all | published | reviewing | draft
const activeTab = ref('all')

/** 发布状态标签（status）：0=草稿 1=已发布 2=已下架 */
function statusMeta(status: number) {
  switch (status) {
    case 1:
      return { label: '已发布', type: 'success' as const }
    case 2:
      return { label: '已下架', type: 'danger' as const }
    default:
      return { label: '草稿', type: 'info' as const }
  }
}

/**
 * 审核状态标签（review_status）：0=待审核 1=通过 2=拒绝。
 * 通过（1）不显示标签——已发布/已下架已能推断；缺字段时按 status 推导兜底。
 * 返回空 label 表示无需展示（模板用 v-if="label" 判断，避免模板里的非空断言）。
 */
function reviewTag(article: ArticleListItem) {
  const rs = article.reviewStatus ?? (article.status === 1 ? 1 : 0)
  if (rs === 2) return { label: '审核被拒', type: 'danger' as const }
  if (rs === 0) return { label: '待审核', type: 'warning' as const }
  return { label: '', type: 'info' as const }
}

const counts = computed(() => ({
  all: articles.value.length,
  published: articles.value.filter((a) => a.status === 1).length,
  draft: articles.value.filter((a) => a.status === 0).length,
  offline: articles.value.filter((a) => a.status === 2).length,
}))

const filteredArticles = computed(() => {
  switch (activeTab.value) {
    case 'published':
      return articles.value.filter((a) => a.status === 1)
    case 'draft':
      return articles.value.filter((a) => a.status === 0)
    case 'offline':
      return articles.value.filter((a) => a.status === 2)
    default:
      return articles.value
  }
})

const emptyText = computed(() => {
  switch (activeTab.value) {
    case 'published':
      return '还没有已发布的文章'
    case 'draft':
      return '没有草稿'
    case 'offline':
      return '没有已下架的文章'
    default:
      return '还没有写过文章，点击右上角开始创作'
  }
})

/** 下架：确认后调接口，成功后本地 status 置 2（行会随筛选/计数自动移到「已下架」） */
async function handleOffline(article: ArticleListItem) {
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
    await offlineArticle(article.id)
    article.status = 2
    ElMessage.success('文章已下架')
  } catch (error: any) {
    const message =
      error && typeof error === 'object' && 'message' in error ? String(error.message ?? '') : ''
    ElMessage.error(message || '下架失败，请重试')
    console.error('下架文章失败:', error)
  }
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    articles.value = await getMyArticles()
  } catch (e: any) {
    loadError.value = e?.message || '加载失败，请稍后重试'
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

/** 详情页地址（带路由 base），标题点击在新标签页打开 */
function detailHref(id: number): string {
  return router.resolve({ name: 'ArticleDetail', params: { id } }).href
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

onMounted(load)
</script>

<style scoped>
.my-articles-page {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 24px 0;
}

.page-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.page-subtitle {
  font-size: 13px;
  color: #9ca3af;
}

.status-tabs {
  background: #fff;
  border-radius: 8px;
  padding: 0 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.error-panel {
  text-align: center;
}

/* 列表行 */
.article-list {
  display: flex;
  flex-direction: column;
  padding: 8px 24px;
}

.article-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.article-row:last-child {
  border-bottom: none;
}

.row-cover {
  flex-shrink: 0;
}

.row-cover img {
  display: block;
  width: 132px;
  height: 84px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.cover-placeholder {
  width: 132px;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  border-radius: 6px;
  color: #c0c4cc;
  font-size: 12px;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.row-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.row-title:hover {
  color: #409eff;
}

.row-summary {
  margin: 6px 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #9ca3af;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row-actions {
  flex-shrink: 0;
  align-self: center;
}

@media (max-width: 768px) {
  .page-container {
    padding: 0 12px;
  }

  .article-row {
    flex-wrap: wrap;
  }

  .row-cover img,
  .cover-placeholder {
    width: 96px;
    height: 60px;
  }

  .row-actions {
    width: 100%;
    text-align: right;
  }
}
</style>
