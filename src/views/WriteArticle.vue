<template>
  <main class="write-article">
    <div class="write-container">
      <!-- 顶部工具栏：保存草稿 / 提交审核 同一行 -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <h1 class="page-title">{{ isEdit ? "编辑文章" : "写文章" }}</h1>
          <div v-if="!authStore.isLoggedIn" class="login-required">
            请先
            <el-button link @click="handleLogin">登录</el-button> 后发表文章
          </div>
        </div>
        <div class="toolbar-actions">
          <el-tooltip
            content="粘贴 HTML 源码，转换为 Markdown 插入编辑器光标处"
            placement="bottom"
          >
            <el-button @click="htmlConvertVisible = true">HTML 转 MD</el-button>
          </el-tooltip>
          <el-button
            v-if="!isEdit"
            :loading="publishing"
            @click="openMetaDialog('draft')"
          >
            保存草稿
          </el-button>
          <el-button
            type="primary"
            :loading="publishing"
            @click="openMetaDialog('submit')"
          >
            {{ isEdit ? "保存修改" : "提交审核" }}
          </el-button>
        </div>
      </div>

      <!-- 编辑区域占满整页余下空间；粘贴监听挂在 window 捕获阶段（见 script） -->
      <div class="editor-area">
        <MDEditor
          ref="mdEditorRef"
          v-model="formData.content"
          preview="edit"
          :on-html-changed="handleHtmlChanged"
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
          <div class="field-with-ai">
            <el-input
              v-model="formData.title"
              placeholder="请输入文章标题"
              clearable
              maxlength="100"
              show-word-limit
              class="field-with-ai__input"
            />
            <el-button
              class="ai-btn"
              :loading="generatingTitle"
              @click="handleGenerateTitle"
            >
              <el-icon v-if="!generatingTitle"><MagicStick /></el-icon>
              AI 生成
            </el-button>
          </div>
        </el-form-item>

        <!-- 文章摘要（可选）：可点 AI 生成后编辑，也可手写；随提交落库 -->
        <el-form-item label="文章摘要">
          <div class="field-with-ai">
            <el-input
              v-model="formData.summary"
              type="textarea"
              :rows="3"
              placeholder="可选；可点击 AI 生成后编辑，也可手动填写"
              maxlength="200"
              show-word-limit
              class="field-with-ai__input"
            />
            <el-button
              class="ai-btn ai-btn--align-top"
              :loading="generatingSummary"
              @click="handleGenerateSummary"
            >
              <el-icon v-if="!generatingSummary"><MagicStick /></el-icon>
              AI 生成
            </el-button>
          </div>
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
              <div
                class="cover-box"
                :class="{ 'is-empty': !formData.coverImage }"
              >
                <el-icon v-if="coverUploading" class="is-loading"
                  ><Loading
                /></el-icon>
                <span v-else-if="!formData.coverImage" class="cover-prompt"
                  >点击选择本地图片</span
                >
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

    <!-- HTML → Markdown 手动转换：粘贴富文本是隐式自动转换的，
         这里给显式入口，用于手头有 HTML 源码（DevTools 复制/保存的片段）的场景 -->
    <el-dialog
      v-model="htmlConvertVisible"
      title="HTML → Markdown"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="htmlInput"
        type="textarea"
        :rows="12"
        placeholder="粘贴 HTML 源码（如 <h2>标题</h2><p>正文</p>），转换为 Markdown 插入编辑器光标处"
      />
      <template #footer>
        <el-button @click="htmlConvertVisible = false">取消</el-button>
        <el-button type="primary" @click="handleHtmlConvert"
          >转换并插入</el-button
        >
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useArticleStore } from "@/stores/article";
import { useAuthStore } from "@/stores/auth";
import { useCategoryStore } from "@/stores/category";
import { createTag } from "@/api/tag";
import { uploadCover } from "@/api/upload";
import { generateArticleTitle, generateArticleSummary } from "@/api/ai";
import { ElMessage } from "element-plus";
import type { UploadFile } from "element-plus";
import { Loading, MagicStick } from "@element-plus/icons-vue";
import { MdEditor as MDEditor } from "md-editor-v3";
import type { ExposeParam } from "md-editor-v3";
import "md-editor-v3/lib/style.css";
import { htmlToMarkdown, hasStructuralHtml } from "@/utils/htmlToMarkdown";

// md-editor-v3 插件（可选）
const MDEditorMermaid = undefined;
const MDEditorCodeTheme = undefined;

const router = useRouter();
const route = useRoute();
const articleStore = useArticleStore();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();

const isEdit = computed(() => !!route.params.id);
const editId = computed(() => Number(route.params.id));
const publishing = ref(false);

// ---- 信息悬浮窗口（标题/分类/标签/封面在提交时才填写） ----

const metaDialogVisible = ref(false);
// draft = 保存草稿（status 0）；submit = 提交审核（status 2）
const dialogMode = ref<"draft" | "submit">("submit");
// 先存的草稿 id：之后点提交审核改为更新这篇草稿，避免产生重复文章
const draftId = ref<number | null>(null);

const dialogTitle = computed(() => {
  if (isEdit.value) return "编辑文章信息";
  return dialogMode.value === "draft"
    ? "完善文章信息（保存草稿）"
    : "完善文章信息";
});

const confirmLabel = computed(() => {
  if (isEdit.value) return "保存修改";
  return dialogMode.value === "draft" ? "保存草稿" : "提交审核";
});

const formData = ref({
  title: "",
  categoryId: undefined as number | undefined,
  tags: [] as string[],
  content: "",
  coverImage: "",
  summary: "",
});

// 编辑器渲染出的 HTML（onHtmlChanged 回调产出），随创建/更新提交给后端存 content_html
const contentHtml = ref("");

function handleHtmlChanged(html: string) {
  contentHtml.value = html;
}

const availableTags = computed(() => articleStore.tags.map((tag) => tag.name));

// ---- 封面上传 ----

const coverUploading = ref(false);

// ---- AI 生成标题/摘要（按钮在信息弹窗里，调用后端 /ai/generate-* 接口） ----

const generatingTitle = ref(false);
const generatingSummary = ref(false);

/** 正文太短时模型无意义，给个兜底提示而非空跑一次计费调用 */
function requireEnoughContent(): string | null {
  const content = formData.value.content.trim();
  if (content.length < 20) {
    ElMessage.warning("正文内容太少，请先写一些再生成");
    return null;
  }
  return content;
}

/** AI 生成标题：用正文作输入，结果填回标题框，用户可再编辑 */
async function handleGenerateTitle() {
  const content = requireEnoughContent();
  if (!content) return;
  generatingTitle.value = true;
  try {
    formData.value.title = await generateArticleTitle(content);
  } catch (error: any) {
    ElMessage.error(error?.message || "标题生成失败，请重试或手动填写");
  } finally {
    generatingTitle.value = false;
  }
}

/** AI 生成摘要：可带标题作上下文，结果填回摘要框 */
async function handleGenerateSummary() {
  const content = requireEnoughContent();
  if (!content) return;
  generatingSummary.value = true;
  try {
    formData.value.summary = await generateArticleSummary(
      content,
      formData.value.title
    );
  } catch (error: any) {
    ElMessage.error(error?.message || "摘要生成失败，请重试或手动填写");
  } finally {
    generatingSummary.value = false;
  }
}

/** 选中本地封面：立即上传 OSS，拿到 URL 写入表单，提交时随 coverImage 一起保存 */
async function handleCoverSelect(file: UploadFile) {
  const raw = file.raw;
  if (!raw || coverUploading.value) return;
  if (!raw.type.startsWith("image/")) {
    ElMessage.warning("请选择图片文件");
    return;
  }
  if (raw.size > 5 * 1024 * 1024) {
    ElMessage.warning("封面图片不能超过 5MB");
    return;
  }

  coverUploading.value = true;
  try {
    const { url } = await uploadCover(raw);
    formData.value.coverImage = url;
  } catch (error) {
    console.error("封面上传失败:", error);
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
    ElMessage.error(message || "封面上传失败，请重试");
  } finally {
    coverUploading.value = false;
  }
}

/** 移除封面：编辑时以空串提交（后端收到非 null 才覆盖），创建时不传字段 */
function handleCoverRemove() {
  formData.value.coverImage = "";
}

// 本次会话内新建标签的名称→id 缓存（allow-create 输入的标签尚未存在于标签列表中）
const createdTagCache = new Map<string, number>();

// 检查登录状态和加载分类
onMounted(() => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning("请先登录后才能发表文章");
  }
  // 加载分类与标签列表（标签下拉的数据源）
  categoryStore.fetchCategories();
  articleStore.fetchTags(true);
  loadArticleForEdit();
  // 粘贴监听挂 window 捕获阶段：先于 CodeMirror 自身的 handler 执行，
  // 且不依赖组件 DOM 结构（此前挂组件 div 上怀疑未生效）
  // paste 不在 WindowEventMap 里，TS 要求监听器签名是 EventListener，此处断言
  window.addEventListener("paste", handlePaste as EventListener, true);
});

onUnmounted(() => {
  window.removeEventListener("paste", handlePaste as EventListener, true);
});

function validateForm(): boolean {
  if (!formData.value.title.trim()) {
    ElMessage.warning("请输入文章标题");
    return false;
  }

  if (!formData.value.categoryId) {
    ElMessage.warning("请选择文章分类");
    return false;
  }

  if (formData.value.tags.length === 0) {
    ElMessage.warning("请至少选择一个标签");
    return false;
  }

  if (formData.value.content.trim().length < 50) {
    ElMessage.warning("文章内容至少 50 个字符");
    return false;
  }

  const coverImage = formData.value.coverImage.trim();
  if (coverImage && !/^https?:\/\//i.test(coverImage)) {
    ElMessage.warning("封面地址需以 http:// 或 https:// 开头");
    return false;
  }

  return true;
}

/**
 * 把选中的标签名解析成标签 id（后端 POST /posts 只接受 id）。
 * allow-create 允许输入新标签，需要先创建拿到 id 再关联，
 * 否则新建的标签名会被静默丢弃，文章最终带上 0 个标签。
 */
async function resolveTagIds(names: string[]): Promise<number[]> {
  const known = new Map(articleStore.tags.map((tag) => [tag.name, tag.id]));
  createdTagCache.forEach((id, name) => known.set(name, id));

  const ids: number[] = [];
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;

    const existingId = known.get(name);
    if (existingId !== undefined) {
      ids.push(existingId);
      continue;
    }

    try {
      const created = await createTag({ name });
      known.set(name, created.id);
      createdTagCache.set(name, created.id);
      ids.push(created.id);
    } catch (error) {
      console.error("创建标签失败:", error);
      throw error;
    }
  }
  return [...new Set(ids)];
}

/** 编辑模式：加载文章并预填表单 */
async function loadArticleForEdit() {
  if (!isEdit.value) return;
  const article =
    articleStore.currentArticle?.id === editId.value
      ? articleStore.currentArticle
      : await articleStore.fetchArticleById(editId.value);

  if (!article || article.id !== editId.value) {
    ElMessage.error("文章不存在");
    router.replace("/");
    return;
  }
  // 仅作者本人可编辑（后端 PUT /posts/{id} 也会校验）
  if (authStore.user?.id && article.userId !== authStore.user.id) {
    ElMessage.error("只能编辑自己的文章");
    router.replace(`/article/${editId.value}`);
    return;
  }
  formData.value.title = article.title;
  formData.value.categoryId = article.category?.id;
  formData.value.tags = article.tags.map((t) => t.name);
  formData.value.content = article.contentMd;
  formData.value.coverImage = article.coverImage || "";
  formData.value.summary = article.summary || "";
}

/**
 * 点击工具栏按钮 → 弹出信息悬浮窗口。
 * 内容先写在编辑器里，标题/分类/标签/封面在弹窗里补全后一并提交。
 */
function openMetaDialog(mode: "draft" | "submit") {
  if (!authStore.isLoggedIn) {
    ElMessage.warning("请先登录");
    authStore.openLoginModal();
    return;
  }
  // 内容不合格就不必弹窗了（弹窗里没有内容输入，校验放最后也没意义）
  if (formData.value.content.trim().length < 50) {
    ElMessage.warning("文章内容至少 50 个字符");
    return;
  }
  dialogMode.value = mode;
  metaDialogVisible.value = true;
}

/** 弹窗确认：全量校验后按模式提交（草稿 status 0 / 提交审核 status 2） */
async function handleConfirm() {
  if (!validateForm()) {
    return;
  }

  publishing.value = true;
  try {
    const selectedTagIds = await resolveTagIds(formData.value.tags);
    if (selectedTagIds.length === 0) {
      ElMessage.error("标签处理失败，请重试");
      return;
    }

    if (isEdit.value) {
      await articleStore.updateArticle(editId.value, {
        title: formData.value.title,
        contentMd: formData.value.content,
        // 编辑器 onHtmlChanged 产出的渲染结果，后端随正文一起更新 content_html
        contentHtml: contentHtml.value || undefined,
        categoryId: formData.value.categoryId,
        tags: selectedTagIds,
        // 编辑时始终带当前值：空串表示用户移除了封面（后端收到非 null 才覆盖）
        coverImage: formData.value.coverImage.trim(),
        // 摘要始终带当前值：空串表示用户清空了摘要（后端收到非 null 才覆盖）
        summary: formData.value.summary,
        // 占位：编辑的发布/审核状态由后端按新语义决定
        // （草稿保持草稿 0，已发布的编辑期间下架 2，同时 review_status 归 0 重审）
        status: 0,
      });
      // 保存修改后留在编辑页（文章已进入重审，跳详情页看到的是下架状态，没有意义）
      ElMessage.success("修改已保存，等待重新审核");
      metaDialogVisible.value = false;
      return;
    }

    // 新语义：提交审核不改发布状态——新建统一 status=0（草稿），
    // 待审核由 review_status 承载（新建默认 0，通过后 approve 置 status=1/review_status=1）；
    // status=2 表示「已下架」而非「待审核」
    const isDraft = dialogMode.value === "draft";
    const payload = {
      title: formData.value.title,
      contentMd: formData.value.content,
      // 渲染后的 HTML：编辑器 onHtmlChanged 回调产出，后端存 content_html 列
      contentHtml: contentHtml.value || undefined,
      categoryId: formData.value.categoryId,
      tags: selectedTagIds,
      // 创建时留空不传字段，cover_image 保持 NULL 而非空串；编辑草稿时同编辑逻辑带空串
      coverImage: formData.value.coverImage.trim() || undefined,
      // 摘要可选：留空不传保持 NULL；编辑草稿时同编辑逻辑带空串以便覆盖
      summary: formData.value.summary.trim() || undefined,
      status: 0,
    };

    if (draftId.value !== null) {
      // 已有草稿：后续操作（含提交审核）都更新同一篇，不重复建文章
      await articleStore.updateArticle(draftId.value, {
        ...payload,
        coverImage: formData.value.coverImage.trim(),
      });
    } else {
      const created = await articleStore.createArticle(payload);
      draftId.value = created?.id ?? null;
    }

    metaDialogVisible.value = false;

    if (isDraft) {
      // 存草稿：留在编辑页继续写
      ElMessage.success("草稿已保存");
      return;
    }

    ElMessage.success("已提交审核，等待管理员审核");
    handleReset();

    // 返回首页
    setTimeout(() => {
      router.push("/");
    }, 500);
  } catch (error: any) {
    ElMessage.error(
      error?.message || (isEdit.value ? "保存失败，请重试" : "发布失败，请重试")
    );
    console.error("提交失败:", error);
  } finally {
    publishing.value = false;
  }
}

// ---- 粘贴富文本 → Markdown ----
// 从 DeepSeek 等页面复制「渲染后」的文字时，text/plain 里没有 #/** 等标记（格式丢失），
// 但 text/html 里结构还在。这里拦截粘贴，把 HTML 转成 Markdown 插入编辑器。

/**
 * 粘贴事件（window 捕获阶段）：把 DeepSeek 等渲染页面复制的富文本转成 Markdown。
 * md-editor 内部（CodeMirror6）与它自己的 paste handler 都只读 text/plain，
 * 所以不阻止默认行为，直接把剪贴板纯文本替换成转换结果即可。
 * 带诊断提示：每次带 HTML 的粘贴都会告知走了哪条分支，方便定位。
 */
function handlePaste(e: ClipboardEvent) {
  const target = e.target as HTMLElement | null;
  if (!target || typeof target.closest !== "function") return;
  if (!target.closest(".cm-content")) return;

  const clipboard = e.clipboardData;
  const html = clipboard?.getData("text/html") ?? "";
  const plain = clipboard?.getData("text/plain") ?? "";

  // 分支1：没有html，普通纯文本，放行默认粘贴
  if (!html) return;

  // 分支2：html存在，判断是否需要转换
  if (!hasStructuralHtml(html)) {
    // 标签不在白名单，但是我们可以额外判断是否有样式加粗，或者直接放行原粘贴
    return;
  }

  const md = htmlToMarkdown(html);
  if (!md || md === plain.trim()) return;

  // ✅ VSCode Webview 关键改动：阻止默认粘贴，直接调用编辑器insert插入md
  e.preventDefault();
  mdEditorRef.value?.insert(() => ({
    targetValue: md,
    select: false,
  }));
  ElMessage.success("已识别富文本并转换为 Markdown 格式");
}

// ---- HTML → Markdown 手动转换（工具栏按钮） ----

/** MDEditor 实例：用其 expose 的 insert 在光标处插入内容 */
const mdEditorRef = ref<ExposeParam | null>(null);
const htmlConvertVisible = ref(false);
const htmlInput = ref("");

function handleHtmlConvert() {
  const raw = htmlInput.value.trim();
  if (!raw) {
    ElMessage.warning("请先粘贴 HTML 源码");
    return;
  }
  let md = "";
  try {
    md = htmlToMarkdown(raw);
  } catch (error) {
    console.error("[html2md] 转换失败:", error);
    ElMessage.error("转换失败，请确认粘贴的是 HTML");
    return;
  }
  if (!md) {
    ElMessage.warning("未从 HTML 中解析出内容");
    return;
  }
  if (mdEditorRef.value) {
    // 插入到编辑器当前光标处；generate 入参是当前选中内容，这里不需要
    mdEditorRef.value.insert(() => ({ targetValue: md, select: false }));
  } else {
    // 兜底：拿不到编辑器实例时直接追加到正文末尾
    formData.value.content = formData.value.content
      ? formData.value.content.replace(/\n*$/, "\n\n") + md
      : md;
  }
  htmlConvertVisible.value = false;
  htmlInput.value = "";
  ElMessage.success(`已转换并插入编辑器（${md.length} 字符）`);
}

function handleReset() {
  formData.value = {
    title: "",
    categoryId: undefined,
    tags: [],
    content: "",
    coverImage: "",
  };
  contentHtml.value = "";
  draftId.value = null;
}

function handleLogin() {
  authStore.openLoginModal();
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
  /* height 属性传 calc 不生效（组件内部按 px 处理），改用 CSS 强制撑满编辑区 */
  height: 100% !important;
}

/* 输入框 + AI 生成按钮：横排，按钮固定宽度不被挤压 */
.field-with-ai {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.field-with-ai__input {
  flex: 1;
  min-width: 0;
}

.ai-btn {
  flex-shrink: 0;
}

/* 摘要为多行文本域：按钮与首行顶对齐，不随文本域高度垂直居中 */
.ai-btn--align-top {
  align-self: flex-start;
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
