<template>
  <div class="admin-review">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">文章审核</span>
          <span class="card-subtitle">共 {{ total }} 篇待审核</span>
        </div>
      </template>

      <el-table
        :data="pending"
        v-loading="loading"
        border
        stripe
        highlight-current-row
        class="review-table"
        @row-click="openDetail"
      >
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="authorNickname" label="作者" width="120" />
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <el-tag v-for="tag in row.tags" :key="tag.id" size="small" type="info" class="tag">
              {{ tag.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="250" align="center">
          <template #default="{ row }">
            <!-- .stop：防止触发整行的 openDetail（.detail 按钮自己会打开弹窗） -->
            <el-button link type="primary" size="small" @click.stop="openDetail(row)">详情</el-button>
            <el-button type="primary" size="small" :loading="actingId === row.id" @click.stop="handleApprove(row)">
              通过
            </el-button>
            <el-button type="danger" size="small" :loading="actingId === row.id" @click.stop="handleReject(row)">
              驳回
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && pending.length === 0" description="暂无待审核文章" />

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 文章详情弹窗：点击行或「详情」打开，拉取正文并以 Markdown 渲染 -->
    <el-dialog
      v-model="detailVisible"
      :title="detailRow?.title || '文章详情'"
      width="780px"
      top="6vh"
      @closed="resetDetail"
    >
      <div v-loading="detailLoading" class="detail-body">
        <div v-if="detailRow" class="detail-meta">
          <span class="meta-item">作者：{{ detailRow.authorNickname || '—' }}</span>
          <span v-if="detailRow.category" class="meta-item">分类：{{ detailRow.category.name }}</span>
          <span class="meta-item">提交时间：{{ formatDate(detailRow.createdAt) }}</span>
          <el-tag v-for="tag in detailRow.tags" :key="tag.id" size="small" type="info" class="tag">
            {{ tag.name }}
          </el-tag>
        </div>

        <!-- AI 审核参考面板：status 驱动三态展示（生成中/成功/不可用） -->
        <div v-if="aiAid" class="ai-review-box">
          <div class="ai-review-header">
            <span class="ai-review-title">🤖 AI 审核参考</span>
            <el-button
              v-if="aiAid.status === 0"
              size="small"
              link
              type="primary"
              :loading="aiLoading"
              @click="fetchAiReview(true)"
            >
              刷新
            </el-button>
          </div>

          <!-- 0 生成中：显示分析中 + 刷新按钮 -->
          <div v-if="aiAid.status === 0" class="ai-review-state">
            <el-icon class="is-loading" style="margin-right: 6px"><Loading /></el-icon>
            AI 正在分析中…（可点击右上角刷新）
          </div>

          <!-- 2 未生成/失败：不可用，无刷新按钮 -->
          <el-empty v-else-if="aiAid.status === 2" description="AI 辅助不可用" :image-size="48" class="ai-review-empty" />

          <!-- 1 成功：渲染完整建议 -->
          <template v-else>
            <div class="ai-review-scores">
              <div class="ai-score-item">
                <span class="score-label">合规分</span>
                <el-progress
                  :percentage="aiAid.complianceScore ?? 0"
                  :stroke-width="10"
                  :color="scoreColor(aiAid.complianceScore ?? 0)"
                />
              </div>
              <div class="ai-score-item">
                <span class="score-label">质量分</span>
                <el-progress
                  :percentage="aiAid.qualityScore ?? 0"
                  :stroke-width="10"
                  :color="scoreColor(aiAid.qualityScore ?? 0)"
                />
              </div>
            </div>

            <div v-if="sensitiveWordList.length" class="ai-review-line">
              <span class="line-label">敏感词</span>
              <el-tag
                v-for="w in sensitiveWordList"
                :key="w"
                size="small"
                type="danger"
                effect="plain"
                class="ai-tag"
              >
                {{ w }}
              </el-tag>
            </div>

            <div v-if="aiAid.plagiarismHint" class="ai-review-line ai-plagiarism">
              <span class="line-label">抄袭提示</span>
              <span class="line-text">{{ aiAid.plagiarismHint }}</span>
            </div>

            <div v-if="aiAid.summary" class="ai-review-summary">{{ aiAid.summary }}</div>

            <div v-if="aiAid.suggestion" class="ai-suggestion">
              <el-tag :type="suggestionMeta(aiAid.suggestion).type" size="small" effect="light">
                {{ suggestionMeta(aiAid.suggestion).label }}
              </el-tag>
            </div>
          </template>

          <div class="ai-review-warn">⚠ AI 建议仅供参考，最终由人工决定</div>
        </div>

        <div v-if="detailRow?.summary" class="detail-summary">{{ detailRow.summary }}</div>
        <!-- MdPreview 只认 modelValue，:text 不是合法 prop（会被忽略导致正文空白） -->
        <MDPreview v-if="detail?.contentMd" :model-value="detail.contentMd" preview-only />
        <el-empty v-else-if="!detailLoading" description="正文加载失败" />
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="detailRow"
          type="primary"
          :loading="actingId === detailRow.id"
          @click="handleApprove(detailRow)"
        >
          通过
        </el-button>
        <el-button
          v-if="detailRow"
          type="danger"
          :loading="actingId === detailRow.id"
          @click="handleReject(detailRow)"
        >
          驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { MdPreview as MDPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { getPendingArticles, getArticleById, approveArticle, rejectArticle, getAiReviewAid } from '@/api/article'
import type { Article, ArticleListItem, AiReviewAid } from '@/types'

const loading = ref(false)
const actingId = ref<number | null>(null)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const pending = ref<ArticleListItem[]>([])

// 详情弹窗
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRow = ref<ArticleListItem | null>(null)
const detail = ref<Article | null>(null)

// ---- AI 审核建议（status：0 生成中 / 1 成功 / 2 不可用） ----
const aiAid = ref<AiReviewAid | null>(null)
const aiLoading = ref(false)
let aiPollTimer: ReturnType<typeof setInterval> | null = null

/** 打开详情：列表行不含正文，需单独拉 GET /posts/{id} + AI 审核建议 */
function openDetail(row: ArticleListItem) {
  detailRow.value = row
  detail.value = null
  detailVisible.value = true
  // AI 面板：只拉一次当前状态（轮询由 status=0 触发）
  aiAid.value = null
  fetchAiReview()
  detailLoading.value = true
  getArticleById(row.id)
    .then((article) => {
      detail.value = article
    })
    .catch((e: any) => {
      ElMessage.error(e?.message || '加载文章详情失败')
    })
    .finally(() => {
      detailLoading.value = false
    })
}

/**
 * 拉取 AI 审核建议；status=0（生成中）时自动轮询直到非 0 或达到上限。
 * @param manual 手动点击刷新（重置计数）
 */
async function fetchAiReview(manual = false) {
  if (!detailRow.value) return
  if (manual) stopAiPoll()
  aiLoading.value = true
  try {
    const aid = await getAiReviewAid(detailRow.value.id)
    aiAid.value = aid
    if (aid.status === 0) {
      startAiPoll(detailRow.value.id)
    } else {
      stopAiPoll()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载 AI 审核建议失败')
  } finally {
    aiLoading.value = false
  }
}

/** 轮询：每 3s 一次，共 10 次；status 非 0 即停（switch 计数无需清 timer 计次） */
function startAiPoll(postId: number) {
  stopAiPoll()
  let count = 0
  aiPollTimer = setInterval(async () => {
    count++
    if (count > 10) {
      stopAiPoll()
      return
    }
    try {
      const aid = await getAiReviewAid(postId)
      aiAid.value = aid
      if (aid.status !== 0) {
        stopAiPoll()
      }
    } catch {
      stopAiPoll()
    }
  }, 3000)
}

function stopAiPoll() {
  if (aiPollTimer) {
    clearInterval(aiPollTimer)
    aiPollTimer = null
  }
}

function resetDetail() {
  detailRow.value = null
  detail.value = null
  aiAid.value = null
  stopAiPoll()
}

/** 敏感词可能由后端返回数组；NaN/缺省时兜底空数组 */
const sensitiveWordList = computed(() => aiAid.value?.sensitiveWords ?? [])

/** 分数 → 颜色（越高越合规/质量越好） */
function scoreColor(score: number) {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

/** 建议 → 标签（pass/reject/manual） */
function suggestionMeta(suggestion: string) {
  switch (suggestion) {
    case 'pass':
      return { label: '建议通过', type: 'success' as const }
    case 'reject':
      return { label: '建议驳回', type: 'danger' as const }
    case 'manual':
      return { label: '建议人工复核', type: 'warning' as const }
    default:
      return { label: '', type: 'info' as const }
  }
}

onBeforeUnmount(stopAiPoll)

/** 加载当前页待审核文章（审核最后一篇后自动回退一页） */
async function loadPending() {
  loading.value = true
  try {
    const res = await getPendingArticles({ page: page.value, pageSize: pageSize.value })
    pending.value = res.data
    total.value = res.total
    // 审核掉当前页最后一篇：页码回退并重载
    if (pending.value.length === 0 && page.value > 1) {
      page.value -= 1
      await loadPending()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载待审核文章失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadPending()
}

function handleSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  loadPending()
}

async function handleApprove(row: ArticleListItem) {
  try {
    await ElMessageBox.confirm(`确定通过「${row.title}」吗？通过后文章将发布。`, '审核', {
      type: 'success',
      confirmButtonText: '通过',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  actingId.value = row.id
  try {
    await approveArticle(row.id)
    ElMessage.success('已通过，文章已发布')
    detailVisible.value = false // 从弹窗内操作时同步关闭
    await loadPending()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

async function handleReject(row: ArticleListItem) {
  // 驳回必须给理由：会随请求发给后端，并通过审核结果通知告知作者
  let reason = ''
  try {
    const { value } = await ElMessageBox.prompt(
      `驳回「${row.title}」，文章将退回草稿。请填写驳回理由，将通知给作者：`,
      '审核驳回',
      {
        type: 'warning',
        confirmButtonText: '驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：第三段有错别字，封面图不清晰',
        inputValue: '',
        inputValidator: (v: string) => {
          const t = (v ?? '').trim()
          if (!t) return '请输入驳回理由'
          if (t.length > 200) return '驳回理由不能超过 200 个字符'
          return true
        },
      }
    )
    reason = String(value ?? '').trim()
  } catch {
    return // 用户取消
  }
  actingId.value = row.id
  try {
    await rejectArticle(row.id, reason)
    ElMessage.success('已驳回，文章退回草稿')
    detailVisible.value = false // 从弹窗内操作时同步关闭
    await loadPending()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

function formatDate(date?: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(loadPending)
</script>

<style scoped>
.card {
  border-radius: 8px;
  border: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.card-subtitle {
  font-size: 13px;
  color: #9ca3af;
}

.tag {
  margin-right: 4px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 行可点击提示 */
.review-table :deep(.el-table__row) {
  cursor: pointer;
}

.detail-body {
  min-height: 200px;
  max-height: 65vh;
  overflow-y: auto;
  padding-right: 4px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  font-size: 13px;
  color: #6b7280;
}

.meta-item {
  white-space: nowrap;
}

.detail-summary {
  padding: 10px 12px;
  margin-bottom: 14px;
  background: #f8fafc;
  border-left: 3px solid #94a3b8;
  border-radius: 0 4px 4px 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

/* ---- AI 审核参考面板 ---- */
.ai-review-box {
  margin-bottom: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  background: #fbfdff;
}

.ai-review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ai-review-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.ai-review-state {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #909399;
  padding: 6px 0;
}

.ai-review-empty {
  padding: 8px 0;
}

.ai-review-scores {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.ai-score-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-label {
  flex-shrink: 0;
  width: 44px;
  font-size: 12px;
  color: #6b7280;
}

.ai-review-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;
}

.line-label {
  flex-shrink: 0;
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.ai-tag {
  margin-right: 4px;
}

.ai-plagiarism .line-text {
  color: #b45309;
}

.ai-review-summary {
  margin-top: 8px;
  padding: 8px 10px;
  background: #fff;
  border-left: 3px solid #409eff;
  border-radius: 0 4px 4px 0;
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.ai-suggestion {
  margin-top: 8px;
}

.ai-review-warn {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  font-size: 12px;
  color: #f56c6c;
}
</style>
