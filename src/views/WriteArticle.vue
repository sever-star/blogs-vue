<template>
  <main class="write-article">
    <div class="write-container">
      <h1 class="page-title">{{ isEdit ? '编辑文章' : '写文章' }}</h1>

      <el-card class="editor-card">
        <template #header>
          <div class="card-header">
            <span>文章编辑器</span>
            <div v-if="!authStore.isLoggedIn" class="login-required">
              请先 <el-button link @click="handleLogin">登录</el-button> 后发表文章
            </div>
          </div>
        </template>

        <el-form :model="formData" label-width="100px" @submit.prevent="handleSubmit">
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

          <!-- 文章封面（可选）：点击选择本地图片，选中即上传 OSS，URL 随文章提交 -->
          <el-form-item label="文章封面">
            <div class="cover-field">
              <el-upload
                class="cover-uploader"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :disabled="coverUploading"
                :on-change="handleCoverSelect"
              >
                <div class="cover-box" :class="{ 'is-empty': !formData.coverImage }">
                  <el-icon v-if="coverUploading" class="is-loading"><Loading /></el-icon>
                  <span v-else-if="!formData.coverImage" class="cover-prompt">点击选择本地图片</span>
                  <img v-else :src="formData.coverImage" alt="封面预览" />
                  <button
                    v-if="formData.coverImage && !coverUploading"
                    type="button"
                    class="cover-remove"
                    title="移除封面"
                    @click.stop="handleCoverRemove"
                  >
                    ×
                  </button>
                </div>
              </el-upload>
              <p v-if="!formData.coverImage" class="cover-hint">
                可选；选中后立即上传，封面 URL 随文章一起提交
              </p>
            </div>
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
              @click="handleSubmit"
              :loading="publishing"
            >
              {{ isEdit ? '保存修改' : '提交审核' }}
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
import { useRouter, useRoute } from 'vue-router'
import { useArticleStore } from '@/stores/article'
import { useAuthStore } from '@/stores/auth'
import { useCategoryStore } from '@/stores/category'
import { createTag } from '@/api/tag'
import { uploadCover } from '@/api/upload'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { MdEditor as MDEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

// md-editor-v3 插件（可选）
const MDEditorMermaid = undefined
const MDEditorCodeTheme = undefined

const router = useRouter()
const route = useRoute()
const articleStore = useArticleStore()
const authStore = useAuthStore()
const categoryStore = useCategoryStore()

const isEdit = computed(() => !!route.params.id)
const editId = computed(() => Number(route.params.id))
const focusedField = ref('')
const publishing = ref(false)

const formData = ref({
  title: '',
  categoryId: undefined as number | undefined,
  tags: [] as string[],
  content: '',
  coverImage: '',
})

const availableTags = computed(() => articleStore.tags.map((tag) => tag.name))

// ---- 封面上传 ----

const coverUploading = ref(false)

/** 选中本地封面：立即上传 OSS，拿到 URL 写入表单，提交时随 coverImage 一起保存 */
async function handleCoverSelect(file: UploadFile) {
  const raw = file.raw
  if (!raw || coverUploading.value) return
  if (!raw.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }
  if (raw.size > 5 * 1024 * 1024) {
    ElMessage.warning('封面图片不能超过 5MB')
    return
  }

  coverUploading.value = true
  try {
    const { url } = await uploadCover(raw)
    formData.value.coverImage = url
  } catch (error) {
    console.error('封面上传失败:', error)
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''
    ElMessage.error(message || '封面上传失败，请重试')
  } finally {
    coverUploading.value = false
  }
}

/** 移除封面：编辑时以空串提交（后端收到非 null 才覆盖），创建时不传字段 */
function handleCoverRemove() {
  formData.value.coverImage = ''
}

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
  loadArticleForEdit()
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

  const coverImage = formData.value.coverImage.trim()
  if (coverImage && !/^https?:\/\//i.test(coverImage)) {
    ElMessage.warning('封面地址需以 http:// 或 https:// 开头')
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

/** 编辑模式：加载文章并预填表单 */
async function loadArticleForEdit() {
  if (!isEdit.value) return
  const article = articleStore.currentArticle?.id === editId.value
    ? articleStore.currentArticle
    : await articleStore.fetchArticleById(editId.value)

  if (!article || article.id !== editId.value) {
    ElMessage.error('文章不存在')
    router.replace('/')
    return
  }
  // 仅作者本人可编辑（后端 PUT /posts/{id} 也会校验）
  if (authStore.user?.id && article.userId !== authStore.user.id) {
    ElMessage.error('只能编辑自己的文章')
    router.replace(`/article/${editId.value}`)
    return
  }
  formData.value.title = article.title
  formData.value.categoryId = article.category?.id
  formData.value.tags = article.tags.map((t) => t.name)
  formData.value.content = article.contentMd
  formData.value.coverImage = article.coverImage || ''
}

async function handleSubmit() {
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

    if (isEdit.value) {
      await articleStore.updateArticle(editId.value, {
        title: formData.value.title,
        contentMd: formData.value.content,
        categoryId: formData.value.categoryId,
        tags: selectedTagIds,
        // 编辑时始终带当前值：空串表示用户移除了封面（后端收到非 null 才覆盖）
        coverImage: formData.value.coverImage.trim(),
        status: 2, // 修改后重新提交审核
      })
      ElMessage.success('修改已保存，等待重新审核')
      router.push(`/article/${editId.value}`)
      return
    }

    await articleStore.createArticle({
      title: formData.value.title,
      contentMd: formData.value.content,
      categoryId: formData.value.categoryId,
      tags: selectedTagIds,
      // 创建时留空不传字段，cover_image 保持 NULL 而非空串
      coverImage: formData.value.coverImage.trim() || undefined,
      status: 2, // 提交审核
    })

    ElMessage.success('已提交审核，等待管理员审核')
    handleReset()

    // 返回首页
    setTimeout(() => {
      router.push('/')
    }, 500)
  } catch (error: any) {
    ElMessage.error(error?.message || (isEdit.value ? '保存失败，请重试' : '发布失败，请重试'))
    console.error('提交失败:', error)
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
    coverImage: '',
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

.cover-field {
  width: 100%;
}

.cover-uploader {
  width: 100%;
}

/* 点击选择本地文件的上传区 */
.cover-box {
  position: relative;
  width: 240px;
  height: 135px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cover-box:hover {
  border-color: #409eff;
}

.cover-box.is-empty {
  background: #fafafa;
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-prompt {
  color: #909399;
  font-size: 13px;
}

.cover-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.cover-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}

.cover-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
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
