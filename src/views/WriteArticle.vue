<template>
  <main class="write-article">
    <div class="write-container">
      <!-- 顶部工具栏：保存草稿 / 提交审核 同一行 -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <h1 class="page-title">{{ isEdit ? '编辑文章' : '写文章' }}</h1>
          <div v-if="!authStore.isLoggedIn" class="login-required">
            请先 <el-button link @click="handleLogin">登录</el-button> 后发表文章
          </div>
        </div>
        <div class="toolbar-actions">
          <el-button v-if="!isEdit" :loading="publishing" @click="openMetaDialog('draft')">
            保存草稿
          </el-button>
          <el-button type="primary" :loading="publishing" @click="openMetaDialog('submit')">
            {{ isEdit ? '保存修改' : '提交审核' }}
          </el-button>
        </div>
      </div>

      <!-- 编辑区域占满整页余下空间；capture 拦截粘贴，富文本转 Markdown -->
      <div class="editor-area" @paste.capture="handlePaste">
        <MDEditor
          v-model="formData.content"
          preview="edit"
          :height="editorHeight"
          :plugins="[MDEditorMermaid, MDEditorCodeTheme]"
        />
      </div>
    </div>

    <!-- 信息悬浮窗口：点击「提交审核 / 保存草稿」后弹出，填写标题/分类/标签/封面 -->
    <el-dialog
      v-model="metaDialogVisible"
      :title="dialogTitle"
      width="560px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="90px">
        <!-- 文章标题 -->
        <el-form-item label="文章标题" required>
          <el-input
            v-model="formData.title"
            placeholder="请输入文章标题"
            clearable
            maxlength="100"
            show-word-limit
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
      </el-form>

      <template #footer>
        <el-button @click="metaDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="handleConfirm">
          {{ confirmLabel }}
        </el-button>
      </template>
    </el-dialog>
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
const publishing = ref(false)

// ---- 信息悬浮窗口（标题/分类/标签/封面在提交时才填写） ----

const metaDialogVisible = ref(false)
// draft = 保存草稿（status 0）；submit = 提交审核（status 2）
const dialogMode = ref<'draft' | 'submit'>('submit')
// 先存的草稿 id：之后点提交审核改为更新这篇草稿，避免产生重复文章
const draftId = ref<number | null>(null)

const dialogTitle = computed(() => {
  if (isEdit.value) return '编辑文章信息'
  return dialogMode.value === 'draft' ? '完善文章信息（保存草稿）' : '完善文章信息'
})

const confirmLabel = computed(() => {
  if (isEdit.value) return '保存修改'
  return dialogMode.value === 'draft' ? '保存草稿' : '提交审核'
})

// 编辑器高度：占满除站头(70)、页面内边距(24)、工具栏(32+12)以外的全部视口
const editorHeight = 'calc(100vh - 140px)'

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

/**
 * 点击工具栏按钮 → 弹出信息悬浮窗口。
 * 内容先写在编辑器里，标题/分类/标签/封面在弹窗里补全后一并提交。
 */
function openMetaDialog(mode: 'draft' | 'submit') {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    authStore.openLoginModal()
    return
  }
  // 内容不合格就不必弹窗了（弹窗里没有内容输入，校验放最后也没意义）
  if (formData.value.content.trim().length < 50) {
    ElMessage.warning('文章内容至少 50 个字符')
    return
  }
  dialogMode.value = mode
  metaDialogVisible.value = true
}

/** 弹窗确认：全量校验后按模式提交（草稿 status 0 / 提交审核 status 2） */
async function handleConfirm() {
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
      metaDialogVisible.value = false
      router.push(`/article/${editId.value}`)
      return
    }

    const status = dialogMode.value === 'draft' ? 0 : 2
    const payload = {
      title: formData.value.title,
      contentMd: formData.value.content,
      categoryId: formData.value.categoryId,
      tags: selectedTagIds,
      // 创建时留空不传字段，cover_image 保持 NULL 而非空串；编辑草稿时同编辑逻辑带空串
      coverImage: formData.value.coverImage.trim() || undefined,
      status,
    }

    if (draftId.value !== null) {
      // 已有草稿：后续操作（含提交审核）都更新同一篇，不重复建文章
      await articleStore.updateArticle(draftId.value, {
        ...payload,
        coverImage: formData.value.coverImage.trim(),
      })
    } else {
      const created = await articleStore.createArticle(payload)
      draftId.value = created?.id ?? null
    }

    metaDialogVisible.value = false

    if (status === 0) {
      // 存草稿：留在编辑页继续写
      ElMessage.success('草稿已保存')
      return
    }

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

// ---- 粘贴富文本 → Markdown ----
// 从 DeepSeek 等页面复制「渲染后」的文字时，text/plain 里没有 #/** 等标记（格式丢失），
// 但 text/html 里结构还在。这里拦截粘贴，把 HTML 转成 Markdown 插入编辑器。

/** 粘贴事件：编辑器内 textarea 专属，其余走默认行为 */
function handlePaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null
  if (!target || target.tagName !== 'TEXTAREA') return

  const clipboard = e.clipboardData
  if (!clipboard) return
  const html = clipboard.getData('text/html')
  if (!html) return // 纯文本粘贴（含 DeepSeek 复制按钮复制的 Markdown 源码）走默认

  const plain = clipboard.getData('text/plain')
  // 剪贴板纯文本本身已是 Markdown（如复制代码块里的源码）→ 原样粘贴，不要二次转换
  if (/^#{1,6}\s|^\s*[-*]\s|^\s*\d+\.\s|\*\*|```/m.test(plain)) return

  // 没有结构化标签的 HTML 不值得转换
  if (!/<(h[1-6]|strong|b|em|i|del|s|ul|ol|li|pre|blockquote|table|a)\b/i.test(html)) return

  e.preventDefault()
  const md = htmlToMarkdown(html)
  if (!md) return

  const textarea = target as HTMLTextAreaElement
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = textarea.value.slice(0, start)
  const after = textarea.value.slice(end)
  // 块级 Markdown 插到行中间时补空行，避免和上下文黏成一段
  const insert = `${before && !before.endsWith('\n') ? '\n\n' : ''}${md}${after && !after.startsWith('\n') ? '\n' : ''}`

  textarea.value = before + insert + after
  textarea.selectionStart = textarea.selectionEnd = start + insert.length
  // 触发 md-editor 的 v-model（它监听 textarea 的 input 事件）
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  ElMessage.success('已识别富文本并转换为 Markdown 格式')
}

/** 剪贴板 HTML → Markdown（覆盖 DeepSeek 常渲染的标签） */
function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return renderMdChildren(doc.body)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function renderMdChildren(node: Node): string {
  let out = ''
  node.childNodes.forEach((child) => {
    out += renderMdNode(child)
  })
  return out
}

function renderMdNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // 行内空白折叠成单个空格；块级标签自带 \n\n 分隔
    return (node.textContent || '').replace(/\s+/g, ' ')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  const inner = renderMdChildren(el).trim()

  switch (tag) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return `\n\n${'#'.repeat(Number(tag[1]))} ${inner}\n\n`
    case 'p': case 'div': case 'section': case 'article': case 'figure':
      return `\n\n${inner}\n\n`
    case 'strong': case 'b':
      return inner ? `**${inner}**` : ''
    case 'em': case 'i':
      return inner ? `*${inner}*` : ''
    case 'del': case 's': case 'strike':
      return inner ? `~~${inner}~~` : ''
    case 'code':
      // pre 里的 code 由 pre 分支处理，这里是行内代码
      return el.parentElement?.tagName.toLowerCase() === 'pre'
        ? (el.textContent ?? '')
        : `\`${el.textContent?.trim() ?? ''}\``
    case 'pre': {
      const codeEl = el.querySelector('code')
      const lang =
        (codeEl?.className || el.className || '').match(/language-([\w-]+)/)?.[1] ?? ''
      const body = (codeEl ?? el).textContent ?? ''
      return `\n\n\`\`\`${lang}\n${body.replace(/\n+$/, '')}\n\`\`\`\n\n`
    }
    case 'a': {
      const href = el.getAttribute('href') || ''
      return href ? `[${inner}](${href})` : inner
    }
    case 'br':
      return '\n'
    case 'hr':
      return '\n\n---\n\n'
    case 'blockquote':
      return `\n\n${inner.split('\n').map((line) => `> ${line}`).join('\n')}\n\n`
    case 'ul':
    case 'ol': {
      const ordered = tag === 'ol'
      const items = Array.from(el.children).filter(
        (c) => c.tagName.toLowerCase() === 'li'
      )
      const lines = items.map((li, i) => {
        const content = renderMdChildren(li).trim().replace(/\n+/g, '\n  ')
        return `${ordered ? `${i + 1}.` : '-'} ${content}`
      })
      return lines.length ? `\n\n${lines.join('\n')}\n\n` : ''
    }
    case 'li':
      return renderMdChildren(el)
    case 'table':
      return renderMdTable(el)
    case 'style': case 'script': case 'meta': case 'link': case 'title':
      return ''
    default:
      return inner || (el.textContent ?? '')
  }
}

/** 简易表格：首行当表头 */
function renderMdTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))
  if (!rows.length) return ''
  const lines: string[] = []
  rows.forEach((tr, rowIndex) => {
    const cells = Array.from(tr.children).map(
      (cell) => (cell.textContent || '').trim().replace(/\|/g, '\\|')
    )
    lines.push(`| ${cells.join(' | ')} |`)
    if (rowIndex === 0) {
      lines.push(`| ${cells.map(() => '---').join(' | ')} |`)
    }
  })
  return `\n\n${lines.join('\n')}\n\n`
}

function handleReset() {
  formData.value = {
    title: '',
    categoryId: undefined,
    tags: [],
    content: '',
    coverImage: '',
  }
  draftId.value = null
}

function handleLogin() {
  authStore.openLoginModal()
}
</script>

<style scoped>
/* 固定视口高度 + 不滚动：整页余下区域全部给编辑器，滚动发生在编辑器内部 */
.write-article {
  height: calc(100vh - 70px);
  background-color: #f5f5f5;
  padding: 12px 0;
  overflow: hidden;
  box-sizing: border-box;
}

.write-container {
  height: 100%;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 顶部工具栏：左侧标题/登录提示，右侧保存草稿 + 提交审核同一行 */
.editor-toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.login-required {
  font-size: 14px;
  color: #f56c6c;
}

.login-required :deep(.el-button--link) {
  color: #f56c6c;
}

/* 编辑区域：吃掉工具栏以外的全部剩余高度 */
.editor-area {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    font-size: 18px;
  }
}
</style>
