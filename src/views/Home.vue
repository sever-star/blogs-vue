<template>
  <main class="home">
    <div class="home-container">
      <!-- 左栏：标签 + 文章列表 -->
      <div class="main-column">
        <!-- 分类选择栏 -->
        <div class="category-section">
          <div class="category-tabs">
            <el-radio-group v-model="selectedCategory" @change="handleCategoryChange">
              <el-radio-button label="all">
                <el-icon><Document /></el-icon> 全部
              </el-radio-button>
              <el-radio-button
                v-for="category in articleStore.categories"
                :key="category.id"
                :label="category.id"
              >
                {{ category.name }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <!-- 标签筛选栏 -->
          <div v-if="selectedCategory === 'all'" class="tags-section">
            <div class="tags-list">
              <el-tag
                v-for="tag in allTags"
                :key="tag.id"
                :type="articleStore.selectedTag === tag.id ? 'primary' : 'info'"
                :effect="articleStore.selectedTag === tag.id ? 'light' : 'plain'"
                class="tag-item"
                @click="handleTagClick(tag.id)"
              >
                {{ tag.name }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 文章列表 -->
        <div class="articles-section">
          <div v-if="articleStore.loading && articleStore.paginatedArticles.length === 0" class="loading">
            <el-skeleton :rows="5" animated />
          </div>

          <div v-else-if="articleStore.paginatedArticles.length === 0" class="no-articles">
            <el-empty description="暂无文章" />
          </div>

          <div v-else class="articles-list">
            <ArticleCard
              v-for="article in articleStore.paginatedArticles"
              :key="article.id"
              :article="article"
              @tag-click="handleArticleTagClick"
            />
          </div>

          <!-- 加载更多 -->
          <div v-if="articleStore.hasMore" class="load-more">
            <el-button @click="handleLoadMore" :loading="articleStore.loading">加载更多</el-button>
          </div>

          <!-- 无限滚动触发器 -->
          <div v-if="!articleStore.loading" ref="scrollTrigger" class="scroll-trigger"></div>
        </div>
      </div>

      <!-- 右栏：浏览量排行（仅「全部」时显示） -->
      <aside v-if="articleStore.selectedTag === null" class="ranking-sidebar">
        <el-card shadow="never" class="ranking-card">
          <template #header>
            <span class="ranking-title">热门排行</span>
          </template>
          <ol class="ranking-list">
            <li
              v-for="(a, i) in articleStore.topViewedArticles"
              :key="a.id"
              class="ranking-item"
            >
              <span class="rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
              <div class="rank-info">
                <span class="rank-title">{{ a.title }}</span>
                <span class="rank-views">{{ a.viewCount }} 次浏览</span>
              </div>
            </li>
          </ol>
        </el-card>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useArticleStore } from '@/stores/article'
import { ElMessage } from 'element-plus'
import ArticleCard from '@/components/ArticleCard.vue'
import { Document } from '@element-plus/icons-vue'

const articleStore = useArticleStore()
const scrollTrigger = ref<HTMLElement>()

// 计算所有标签，包括"全部"
const allTags = computed(() => {
  return [
    { id: null, name: '全部' },
    ...articleStore.tags,
  ]
})

// 当前选中的分类（'all' 表示全部，数字表示具体分类）
const selectedCategory = ref<'all' | number>('all')

// 初始化加载
onMounted(async () => {
  try {
    await articleStore.fetchCategories()
    await articleStore.fetchTags()
    await articleStore.fetchArticles()
    await articleStore.fetchTopArticles()
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
})

// 无限滚动监听
setupIntersectionObserver()

onUnmounted(() => {
  observer?.disconnect()
})

// Intersection Observer 用于无限滚动
let observer: IntersectionObserver | null = null

function setupIntersectionObserver() {
  if (!scrollTrigger.value) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && articleStore.hasMore && !articleStore.loading) {
          articleStore.loadMore()
        }
      })
    },
    {
      root: null,
      rootMargin: '100px',
      threshold: 0.01,
    }
  )

  observer.observe(scrollTrigger.value)
}

// 标签点击处理
// 处理分类选择
async function handleCategoryChange(categoryId: 'all' | number) {
  if (categoryId === 'all') {
    articleStore.selectedCategory = null
  } else {
    articleStore.selectedCategory = categoryId as number
  }
  articleStore.selectedTag = null  // 切换分类时重置标签选择
  articleStore.currentPage = 1
  await articleStore.fetchArticles(1, null, articleStore.selectedCategory)
}

// 处理标签点击
async function handleTagClick(tagId: number | null) {
  articleStore.selectedTag = tagId
  articleStore.currentPage = 1
  await articleStore.fetchArticles(1, articleStore.selectedTag, articleStore.selectedCategory)
}

// 从文章卡片点击标签
function handleArticleTagClick(tagName: string) {
  const tag = articleStore.tags.find(t => t.name === tagName)
  if (tag) {
    handleTagClick(tag.id)
  }
}

function handleLoadMore() {
  articleStore.loadMore()
}
</script>

<style scoped>
.home {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 20px 0;
}

.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 20px;
  align-items: start;
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.tags-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.tag-item {
  cursor: pointer;
  transition: all 0.3s;
}

.tag-item:hover {
  opacity: 0.8;
}

.articles-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading {
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.no-articles {
  background: white;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
}

.articles-list {
  display: flex;
  flex-direction: column;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 20px;
  margin-top: 20px;
}

.scroll-trigger {
  height: 100px;
  visibility: hidden;
}

/* 右栏排行 */
.ranking-sidebar {
  position: sticky;
  top: 90px;
}

.ranking-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ranking-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.ranking-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  background: #f3f4f6;
  border-radius: 4px;
}

.rank.top {
  color: #fff;
  background: linear-gradient(135deg, #3b82f6, #9333ea);
}

.rank-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.rank-title {
  font-size: 14px;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-views {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 1024px) {
  .home-container {
    grid-template-columns: 1fr;
  }

  .ranking-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .home-container {
    padding: 0 12px;
  }

  .tags-section {
    padding: 12px;
  }

  .tags-list {
    gap: 8px;
  }
}
</style>
