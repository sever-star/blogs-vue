<template>
  <div class="article-card">
    <div class="card-content">
      <!-- 新标签页打开：普通 a + target=_blank（router-link 会拦截成当前页路由跳转） -->
      <a :href="articleHref" target="_blank" rel="noopener" class="title-link">
        <h2 class="article-title">{{ article.title }}</h2>
      </a>

      <p class="article-excerpt">{{ article.summary }}</p>

      <!-- 分类 + 时间 + 用户合并为一行（此前拆成两个 meta 块，时间/用户重复渲染了两次） -->
      <div class="article-meta">
        <span class="category" v-if="article.category">
          <el-tag type="success" size="small">
            {{ article.category.name }}
          </el-tag>
        </span>
        <span class="publish-time">
          <el-icon><Calendar /></el-icon>
          {{ formatDate(article.createdAt) }}
        </span>
        <span class="author">
          <el-icon><User /></el-icon>
          {{ article.authorNickname }}
        </span>
      </div>

      <div class="article-tags">
        <el-tag
          v-for="tag in article.tags"
          :key="tag.id"
          type="info"
          class="tag"
          @click="$emit('tag-click', tag.name)"
        >
          {{ tag.name }}
        </el-tag>
      </div>
    </div>

    <div class="card-stats">
      <div class="stat-item">
        <el-icon><View /></el-icon>
        <span class="stat-value">{{ article.viewCount }}</span>
        <span class="stat-label">浏览</span>
      </div>
      <div class="stat-item">
        <el-icon><Star /></el-icon>
        <span class="stat-value">{{ article.likeCount }}</span>
        <span class="stat-label">点赞</span>
      </div>
      <div class="stat-item">
        <el-icon><ChatDotRound /></el-icon>
        <span class="stat-value">{{ article.commentCount }}</span>
        <span class="stat-label">评论</span>
      </div>
    </div>

    <!-- 封面：卡片最右侧；后端未存封面时不占位 -->
    <div v-if="article.coverImage" class="card-cover">
      <img :src="article.coverImage" :alt="article.title" loading="lazy" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Article } from '@/stores/article'
import { Calendar, User, View, Star, ChatDotRound } from '@element-plus/icons-vue'

const props = defineProps<{
  article: Article
}>()

defineEmits<{
  'tag-click': [tag: string]
}>()

const router = useRouter()

// resolve().href 自带路由 base（部署在 /proxy/xxx 下时写死 /article/ 会 404）
const articleHref = computed(
  () => router.resolve({ name: 'ArticleDetail', params: { id: props.article.id } }).href
)

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<style scoped>
.article-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #bfdbfe;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.title-link {
  text-decoration: none;
}

.article-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  transition: color 0.3s;
  word-break: break-word;
}

.title-link:hover .article-title {
  color: #1890ff;
}

.article-excerpt {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #999;
  flex-wrap: wrap;
}

.article-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.category {
  margin-right: 8px;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  cursor: pointer;
  transition: all 0.3s;
}

.tag:hover {
  opacity: 0.7;
}

.card-stats {
  display: flex;
  gap: 24px;
  margin-left: 20px;
  min-width: 120px;
}

.card-cover {
  flex-shrink: 0;
  margin-left: 20px;
}

.card-cover img {
  display: block;
  width: 160px;
  height: 100px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.stat-label {
  font-size: 12px;
}

@media (max-width: 768px) {
  .article-card {
    flex-direction: column;
  }

  .card-stats {
    margin-left: 0;
    margin-top: 12px;
    justify-content: space-around;
    width: 100%;
  }

  .card-stats {
    gap: 12px;
  }

  /* 窄屏卡片纵向堆叠：封面改为整行宽度的横幅 */
  .card-cover {
    margin-left: 0;
    margin-top: 12px;
    width: 100%;
  }

  .card-cover img {
    width: 100%;
    height: 160px;
  }
}
</style>
