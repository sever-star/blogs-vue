<template>
  <main class="article-detail">
    <div class="detail-container">
      <!-- 返回按钮 -->
      <div class="back-button">
        <el-button link @click="handleBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>

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
          <h1 class="article-title">{{ articleStore.currentArticle.title }}</h1>

          <div class="article-info">
            <span class="author">
              <el-icon><User /></el-icon>
              {{ articleStore.currentArticle.authorNickname }}
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
          <MDPreview :text="articleStore.currentArticle.contentMd" preview-only />
        </div>

        <!-- 文章底部操作 -->
        <footer class="article-footer">
          <div class="article-actions">
            <el-button-group>
              <el-button @click="handleLike" type="primary">
                <el-icon><Star /></el-icon>
                点赞 ({{ articleStore.currentArticle.likeCount }})
              </el-button>
              <el-button>
                <el-icon><ChatDotRound /></el-icon>
                评论 ({{ articleStore.currentArticle.commentCount }})
              </el-button>
            </el-button-group>
          </div>
        </footer>

        <!-- 评论区 -->
        <CommentSection :article-id="articleId" />
      </article>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArticleStore } from '@/stores/article'
import { ElMessage } from 'element-plus'
import { MdPreview as MDPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { Star, ChatDotRound, User, Calendar, View, ArrowLeft } from '@element-plus/icons-vue'
import CommentSection from '@/components/CommentSection.vue'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()

const articleId = computed(() => parseInt(route.params.id as string))

onMounted(async () => {
  try {
    await articleStore.fetchArticleById(articleId.value)
  } catch (error) {
    ElMessage.error('加载文章失败')
    console.error('加载文章失败:', error)
  }
})

function handleLike() {
  ElMessage.success('已点赞')
}

function handleBack() {
  router.back()
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
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.back-button {
  margin-bottom: 16px;
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

.article-footer {
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.article-actions {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .detail-container {
    padding: 0 12px;
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
