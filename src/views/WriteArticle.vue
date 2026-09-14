<template>
  <main class="write-article">
    <div class="write-container">
      <h1 class="page-title">写文章</h1>

      <el-card class="editor-card">
        <template #header>
          <div class="card-header">
            <span>文章编辑器</span>
            <div v-if="!authStore.isLoggedIn" class="login-required">
              请先 <el-button link @click="handleLogin">登录</el-button> 后发表文章
            </div>
          </div>
        </template>

        <el-form :model="formData" label-width="100px" @submit.prevent="handlePublish">
          <!-- 文章标题 -->
          <el-form-item label="文章标题" required>
            <el-input
              v-model="formData.title"
              placeholder="请输入文章标题"
              clearable
              maxlength="100"
              show-word-limit
              @keyup.enter="focusedField = 'tags'"
            />
          </el-form-item>

          <!-- 文章分类 -->
          <el-form-item label="文章分类" required>
            <el-select
              v-model="formData.categoryId"
              placeholder="请选择文章分类"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="category in categoryStore.categoryOptions"
                :key="category.value"
                :label="category.label"
                :value="category.value"
              />
            </el-select>
          </el-form-item>

          <!-- 文章标签 -->
          <el-form-item label="文章标签" required>
            <el-select
              v-model="formData.tags"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或创建标签"
              style="width: 100%"
            >
              <el-option
                v-for="tag in availableTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>

          <!-- Markdown 编辑器 -->
          <el-form-item label="文章内容" required>
            <div class="editor-wrapper">
              <MDEditor
                v-model="formData.content"
                preview="edit"
                height="500px"
                :plugins="[MDEditorMermaid, MDEditorCodeTheme]"
              />
            </div>
          </el-form-item>

          <!-- 操作按钮 -->
          <el-form-item>
            <el-button
              v-if="authStore.isLoggedIn"
              type="primary"
              @click="handlePublish"
              :loading="publishing"
            >
              提交审核
            </el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button @click="handleCancel">取消</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useArticleStore } from '@/stores/article'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/category'
import { createTag } from '@/api/tag'
import { ElMessage } from 'element-plus'
import { MdEditor as MDEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

// md-editor-v3 插件（可选）
const MDEditorMermaid = undefined
const MDEditorCodeTheme = undefined

const router = useRouter()
const articleStore = useArticleStore()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const focusedField = ref('')
const publishing = ref(false)

const formData = ref({
  title: '',
  categoryId: undefined as number | undefined,
  tags: [] as string[],
  content: '',
})

const availableTags = computed(() => articleStore.tags.map((tag) => tag.name))

// 本次会话内新建标签的名称→id 缓存（allow-create 输入的标签尚未存在于标签列表中）
const createdTagCache = new Map<string, number>()

// 检查登录状态和加载分类
onMounted(() => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后才能发表文章')
  }
  // 加载分类与标签列表（标签下拉的数据源）
  categoryStore.fetchCategories()
  articleStore.fetchTags(true)
})

function validateForm(): boolean {
  if (!formData.value.title.trim()) {
    ElMessage.warning('请输入文章标题')
    return false
  }

  if (!formData.value.categoryId) {
    ElMessage.warning('请选择文章分类')
    return false
  }

  if (formData.value.tags.length === 0) {
    ElMessage.warning('请至少选择一个标签')
    return false
  }

  if (formData.value.content.trim().length < 50) {
    ElMessage.warning('文章内容至少 50 个字符')
    return false
  }

  return true
}

/**
 * 把选中的标签名解析成标签 id（后端 POST /posts 只接受 id）。
 * allow-create 允许输入新标签，需要先创建拿到 id 再关联，
 * 否则新建的标签名会被静默丢弃，文章最终带上 0 个标签。
 */
async function resolveTagIds(names: string[]): Promise<number[]> {
  const known = new Map(articleStore.tags.map((tag) => [tag.name, tag.id]))
  createdTagCache.forEach((id, name) => known.set(name, id))

  const ids: number[] = []
  for (const rawName of names) {
    const name = rawName.trim()
    if (!name) continue

    const existingId = known.get(name)
    if (existingId !== undefined) {
      ids.push(existingId)
      continue
    }

    try {
      const created = await createTag({ name })
      known.set(name, created.id)
      createdTagCache.set(name, created.id)
      ids.push(created.id)
    } catch (error) {
      console.error('创建标签失败:', error)
      throw error
    }
  }
  return [...new Set(ids)]
}

async function handlePublish() {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    authStore.openLoginModal()
    return
  }

  if (!validateForm()) {
    return
  }

  publishing.value = true
  try {
    const selectedTagIds = await resolveTagIds(formData.value.tags)
    if (selectedTagIds.length === 0) {
      ElMessage.error('标签处理失败，请重试')
      return
    }
    await articleStore.createArticle({
      title: formData.value.title,
      contentMd: formData.value.content,
      categoryId: formData.value.categoryId,
      tags: selectedTagIds,
      status: 2, // 提交审核
    })

    ElMessage.success('已提交审核，等待管理员审核')
    handleReset()
    
    // 返回首页
    setTimeout(() => {
      router.push('/')
    }, 500)
  } catch (error) {
    ElMessage.error('发布失败，请重试')
    console.error('发布失败:', error)
  } finally {
    publishing.value = false
  }
}

function handleReset() {
  formData.value = {
    title: '',
    categoryId: undefined,
    tags: [],
    content: '',
  }
}

function handleCancel() {
  router.back()
}

function handleLogin() {
  authStore.openLoginModal()
}
</script>

<style scoped>
.write-article {
  min-height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 20px 0;
}

.write-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-title {
  margin: 0 0 20px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.editor-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.login-required {
  font-size: 14px;
  color: #f56c6c;
}

.login-required :deep(.el-button--link) {
  color: #f56c6c;
}

.editor-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

:deep(.md-editor) {
  border: none !important;
}

@media (max-width: 768px) {
  .write-container {
    padding: 0 12px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
