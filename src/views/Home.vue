<template>
  <main class="home">
    <div class="home-container">
      <!-- 左栏：标签 + 文章列表 -->
      <div class="main-column">
        <!-- 分类选择栏 -->
        <div class="category-section">
          <div class="category-tabs-wrapper">
            <div
              ref="categoryTabsRef"
              class="category-tabs"
              @scroll="updateScrollState"
            >
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

            <!-- 左右滑动箭头（溢出且未到头时显示） -->
            <button
              v-show="canScrollLeft"
              class="scroll-arrow scroll-arrow--left"
              aria-label="向左滑动"
              @mousedown="startScroll(-1)"
              @mouseup="stopScroll"
              @mouseleave="stopScroll"
            >
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <button
              v-show="canScrollRight"
              class="scroll-arrow scroll-arrow--right"
              aria-label="向右滑动"
              @mousedown="startScroll(1)"
              @mouseup="stopScroll"
              @mouseleave="stopScroll"
            >
              <el-icon><ArrowRight /></el-icon>
            </button>
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
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useArticleStore } from '@/stores/article'
import { ElMessage } from 'element-plus'
import ArticleCard from '@/components/ArticleCard.vue'
import { Document, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

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

// 分类栏左右滑动箭头
const categoryTabsRef = ref<HTMLElement>()
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
let scrollTimer: number | undefined

function updateScrollState() {
  const el = categoryTabsRef.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 1
  canScrollRight.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
}

/** 按住箭头连续滚动；松开或移出即停 */
function startScroll(dir: number) {
  const el = categoryTabsRef.value
  if (!el) return
  stopScroll()
  scrollTimer = window.setInterval(() => {
    el.scrollBy({ left: dir * 20 })
    updateScrollState()
  }, 16)
}
function stopScroll() {
  if (scrollTimer !== undefined) {
    clearInterval(scrollTimer)
    scrollTimer = undefined
  }
}

// 分类数据变化后重新计算箭头显隐
watch(() => articleStore.categories.length, () => {
  nextTick(updateScrollState)
})

// 初始化加载
onMounted(async () => {
  try {
    await articleStore.fetchCategories()
    // 从其他页面返回时 watch（监听 length）不再触发，需显式重算箭头显隐
    await nextTick()
    updateScrollState()
    await articleStore.fetchTags()
    // 返回首页时重置为「全部」：显式传 null 清空 store 里的 selectedCategory/selectedTag，
    // 否则 fetchArticles 无参时保留上次选中的分类，导致按钮显示全部、数据却是旧分类
    await articleStore.fetchArticles(1, null, null)
    await articleStore.fetchTopArticles()
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
})

// 无限滚动监听
setupIntersectionObserver()

onUnmounted(() => {
  observer?.disconnect()
  stopScroll()
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

/* 分类栏：横向滚动 + 左右箭头滑动（仅电脑端） */
.category-tabs-wrapper {
  position: relative;
}

.category-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

/* el-radio-group 横向不换行，按钮不被压缩 */
.category-tabs :deep(.el-radio-group) {
  display: inline-flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.category-tabs :deep(.el-radio-button) {
  flex-shrink: 0;
}

/* 左右滑动箭头按钮 */
.scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  color: #4b5563;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.scroll-arrow:hover {
  background: #fff;
  color: #3b82f6;
  border-color: #3b82f6;
}

.scroll-arrow--left {
  left: -6px;
}

.scroll-arrow--right {
  right: -6px;
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
