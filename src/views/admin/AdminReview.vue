<template>
  <div class="admin-review">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">文章审核</span>
          <span class="card-subtitle">共 {{ total }} 篇待审核</span>
        </div>
      </template>

      <el-table :data="pending" v-loading="loading" border stripe>
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
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" :loading="actingId === row.id" @click="handleApprove(row)">
              通过
            </el-button>
            <el-button type="danger" size="small" :loading="actingId === row.id" @click="handleReject(row)">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPendingArticles, approveArticle, rejectArticle } from '@/api/article'
import type { ArticleListItem } from '@/types'

const loading = ref(false)
const actingId = ref<number | null>(null)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const pending = ref<ArticleListItem[]>([])

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
    await loadPending()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    actingId.value = null
  }
}

async function handleReject(row: ArticleListItem) {
  try {
    await ElMessageBox.confirm(`确定驳回「${row.title}」吗？文章将退回草稿。`, '审核', {
      type: 'warning',
      confirmButtonText: '驳回',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  actingId.value = row.id
  try {
    await rejectArticle(row.id)
    ElMessage.success('已驳回，文章退回草稿')
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
</style>
