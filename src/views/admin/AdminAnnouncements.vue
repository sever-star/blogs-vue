<template>
  <div class="admin-announcements">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">公告管理</span>
          <el-button type="primary" @click="openCreate">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>
            发布公告
          </el-button>
        </div>
      </template>

      <el-table :data="list" v-loading="loading" border stripe>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
        <el-table-column label="发布时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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

    <!-- 发布 / 编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑公告' : '发布公告'"
      width="600px"
      @closed="resetDialog"
    >
      <el-form label-width="70px" @submit.prevent="handleSubmit">
        <el-form-item label="标题" required>
          <el-input
            v-model="form.title"
            placeholder="请输入公告标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="请输入公告内容"
            maxlength="450"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement } from '@/api/announcement'
import type { Announcement } from '@/types'

const list = ref<Announcement[]>([])
const loading = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const form = ref({ title: '', content: '' })
const editing = ref<Announcement | null>(null)

/** 加载当前页公告（删光当前页最后一行时自动回退一页） */
async function loadAnnouncements() {
  loading.value = true
  try {
    const res = await getAnnouncements(page.value, pageSize.value)
    list.value = res.data
    total.value = res.total
    if (list.value.length === 0 && page.value > 1) {
      page.value -= 1
      await loadAnnouncements()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载公告失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadAnnouncements()
}

function handleSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  loadAnnouncements()
}

function openCreate() {
  editing.value = null
  form.value = { title: '', content: '' }
  dialogVisible.value = true
}

function openEdit(row: Announcement) {
  editing.value = row
  form.value = { title: row.title, content: row.content }
  dialogVisible.value = true
}

function resetDialog() {
  editing.value = null
  form.value = { title: '', content: '' }
}

async function handleSubmit() {
  if (saving.value) return
  const title = form.value.title.trim()
  const content = form.value.content.trim()
  if (!title) {
    ElMessage.warning('请输入公告标题')
    return
  }
  if (!content) {
    ElMessage.warning('请输入公告内容')
    return
  }
  saving.value = true
  try {
    const payload = { title, content }
    if (editing.value) {
      await updateAnnouncement(editing.value.id, payload)
      ElMessage.success('公告已更新，已同步给所有用户')
    } else {
      await createAnnouncement(payload)
      ElMessage.success('公告已发布')
    }
    dialogVisible.value = false
    await loadAnnouncements()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Announcement) {
  try {
    await ElMessageBox.confirm(
      `确定删除公告「${row.title}」吗？所有用户通知里的该条公告副本将一并删除。`,
      '删除公告',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      }
    )
  } catch {
    return
  }
  try {
    await deleteAnnouncement(row.id)
    ElMessage.success('公告已删除')
    await loadAnnouncements()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function formatDate(date?: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(loadAnnouncements)
</script>

<style scoped>
.card {
  border-radius: 8px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
