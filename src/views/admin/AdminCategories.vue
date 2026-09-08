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
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="articleCount" label="文章数" width="100" align="center" />
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
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            placeholder="请输入分类描述（可选）"
            maxlength="200"
            show-word-limit
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="图标URL">
          <el-input
            v-model="form.icon"
            placeholder="请输入图标URL（可选）"
            @keyup.enter="handleSubmit"
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
import { createCategory, updateCategory, deleteCategory } from '@/api/category'
import type { Category } from '@/types'

const categoryStore = useCategoryStore()

const categories = ref<Category[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const form = ref({
  name: '',
  description: '',
  icon: ''
})
const editingCategory = ref<Category | null>(null)

async function loadCategories() {
  loading.value = true
  try {
    await categoryStore.fetchCategories(true)
    categories.value = [...categoryStore.categories]
  } catch (e) {
    ElMessage.error('加载分类失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingCategory.value = null
  form.value = { name: '', description: '', icon: '' }
  dialogVisible.value = true
}

function openEdit(category: Category) {
  editingCategory.value = category
  form.value = {
    name: category.name,
    description: category.description || '',
    icon: category.icon || ''
  }
  dialogVisible.value = true
}

function resetDialog() {
  editingCategory.value = null
  form.value = { name: '', description: '', icon: '' }
}

async function handleSubmit() {
  const trimmedName = form.value.name.trim()
  if (!trimmedName) {
    ElMessage.warning('请输入分类名')
    return
  }
  // 重名校验：已存在同名分类时拒绝（编辑时排除自身）
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
      name: trimmedName,
      description: form.value.description.trim() || undefined,
      icon: form.value.icon.trim() || undefined
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
  // 清空 store 缓存并重新加载
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
</style>