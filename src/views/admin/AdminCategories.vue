<template>
  <div class="admin-categories">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">分类管理</span>
          <el-button type="primary" @click="openCreate">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>
            新建分类
          </el-button>
        </div>
      </template>

      <el-table :data="categories" v-loading="loading" border stripe>
        <el-table-column prop="name" label="分类名" />
        <el-table-column label="创建时间" width="200">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
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

    <!-- 新建 / 编辑分类弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingCategory ? '编辑分类' : '新建分类'"
      width="500px"
      @closed="resetDialog"
    >
      <el-form label-width="100px" @submit.prevent="handleSubmit">
        <el-form-item label="分类名" required>
          <el-input
            v-model="form.name"
            placeholder="请输入分类名"
            maxlength="20"
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
import { useCategoryStore } from '@/stores/category'
import { createCategory, updateCategory, deleteCategory, getCategoriesPaged } from '@/api/category'
import type { Category } from '@/types'

const categoryStore = useCategoryStore()

const categories = ref<Category[]>([])
const loading = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const dialogVisible = ref(false)
const form = ref({
  name: ''
})
const editingCategory = ref<Category | null>(null)

/** 加载当前页分类（删光当前页最后一行时自动回退一页） */
async function loadCategories() {
  loading.value = true
  try {
    const res = await getCategoriesPaged({ page: page.value, pageSize: pageSize.value })
    categories.value = res.data
    total.value = res.total
    // 删光当前页最后一行：页码回退并重载
    if (categories.value.length === 0 && page.value > 1) {
      page.value -= 1
      await loadCategories()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '加载分类失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(p: number) {
  page.value = p
  loadCategories()
}

function handleSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  loadCategories()
}

function openCreate() {
  editingCategory.value = null
  form.value = { name: '' }
  dialogVisible.value = true
}

function openEdit(category: Category) {
  editingCategory.value = category
  form.value = {
    name: category.name
  }
  dialogVisible.value = true
}

function resetDialog() {
  editingCategory.value = null
  form.value = { name: '' }
}

async function handleSubmit() {
  if (saving.value) return
  const trimmedName = form.value.name.trim()
  if (!trimmedName) {
    ElMessage.warning('请输入分类名')
    return
  }
  // 重名校验：仅扫当前页（兜底提示，唯一性由后端 400 保证）
  const existing = categories.value.find(
    (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory.value?.id
  )
  if (existing) {
    ElMessage.warning(`分类「${existing.name}」已存在`)
    return
  }
  saving.value = true
  try {
    const payload = {
      name: trimmedName
    }

    if (editingCategory.value) {
      await updateCategory(editingCategory.value.id, payload)
      ElMessage.success('分类已更新')
    } else {
      await createCategory(payload)
      ElMessage.success('分类已创建')
    }
    dialogVisible.value = false
    await refreshAndReload()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(category: Category) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${category.name}」吗？`, '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteCategory(category.id)
    ElMessage.success('分类已删除')
    await refreshAndReload()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

async function refreshAndReload() {
  // 失效选择器缓存并重载当前页
  categoryStore.clearCategories()
  await loadCategories()
}

function formatDate(date?: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(async () => {
  await loadCategories()
})
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
