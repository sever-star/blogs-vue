<template>
  <div class="comment-section">
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
      <div v-for="comment in comments" :key="comment.id" class="comment-item">
        <img :src="comment.avatar" :alt="comment.nickname" class="user-avatar" />
        <div class="comment-content">
          <div class="comment-header">
            <span class="username">
              {{ comment.nickname }}
              <el-tag v-if="comment.isAdmin" size="small" type="danger" class="admin-badge">博主</el-tag>
            </span>
            <span class="comment-time">{{ formatCommentDate(comment.createdAt) }}</span>
          </div>
          <p class="comment-text">{{ comment.content }}</p>
          <div class="comment-footer">
            <span class="like-btn" @click="handleLikeComment(comment.id)">
              <el-icon><Star /></el-icon>
              {{ comment.likeCount }}
            </span>
            <span v-if="comment.replies && comment.replies.length > 0" class="reply-count">
              回复 ({{ comment.replies.length }})
            </span>
          </div>
          <!-- 嵌套回复 -->
          <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
            <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <img :src="reply.avatar" :alt="reply.nickname" class="reply-avatar" />
              <div class="reply-content">
                <div class="reply-header">
                  <span class="reply-username">
                    {{ reply.nickname }}
                    <el-tag v-if="reply.isAdmin" size="small" type="danger" class="admin-badge">博主</el-tag>
                  </span>
                  <span class="reply-time">{{ formatCommentDate(reply.createdAt) }}</span>
                </div>
                <p class="reply-text">{{ reply.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 暂无评论 -->
    <div v-if="comments.length === 0" class="no-comments">
      <el-empty description="暂无评论" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCommentStore } from '@/stores/comment'
import { useAuthStore } from '@/stores/auth'
import { Star } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  articleId: number
}>()

const commentStore = useCommentStore()
const authStore = useAuthStore()

const newComment = ref('')
const submitting = ref(false)

const comments = computed(() => commentStore.getArticleComments(props.articleId))

onMounted(async () => {
  await commentStore.fetchComments(props.articleId)
})

async function submitComment() {
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
  } catch (error) {
    ElMessage.error('评论失败，请重试')
    console.error('评论失败:', error)
  } finally {
    submitting.value = false
  }
}

function handleLikeComment(commentId: number) {
  commentStore.likeComment(props.articleId, commentId)
}

function handleLogin() {
  authStore.openLoginModal()
}

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
  font-size: 14px;
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

.user-avatar {
  width: 36px;
  height: 36px;
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
  font-size: 14px;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-text {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.like-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.3s;
}

.like-btn:hover {
  color: #1890ff;
}

.reply-count {
  cursor: default;
  font-size: 12px;
  color: #999;
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
  width: 28px;
  height: 28px;
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
  font-size: 13px;
  color: #333;
}

.reply-time {
  font-size: 11px;
  color: #999;
}

.reply-text {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  word-break: break-word;
}

.no-comments {
  padding: 40px 20px;
}

.login-prompt :deep(.el-button--link) {
  color: #1890ff;
}
</style>
