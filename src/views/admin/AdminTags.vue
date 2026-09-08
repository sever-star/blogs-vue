<template>
  <div class="admin-tags">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">标签管理</span>
          <el-button type="primary" @click="openCreate">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>
            新建标签
          </el-button>
        </div>
      </template>

      <el-table :data="tags" v-loading="loading" border stripe>
        <el-table-column prop="name" label="标签名" />
        <el-table-column label="创建时间" width="200">
          <template #default="{ row }">{{
            formatDate(row.createdAt)
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button link type="danger" @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建 / 重命名弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingTag ? '编辑标签' : '新建标签'"
      width="500px"
      @closed="resetDialog"
    >
      <el-form label-width="100px" @submit.prevent="handleSubmit">
        <el-form-item label="标签名" required>
          <el-input
            v-model="form.name"
            placeholder="请输入标签名"
            maxlength="20"
            show-word-limit
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit"
          >保存</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { getTags, createTag, updateTag, deleteTag } from "@/api/tag";
import type { Tag } from "@/types";

const tags = ref<Tag[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const form = ref({
  name: "",
});
const editingTag = ref<Tag | null>(null);

async function loadTags() {
  loading.value = true;
  try {
    tags.value = await getTags();
  } catch (e) {
    ElMessage.error("加载标签失败");
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingTag.value = null;
  form.value = { name: "" };
  dialogVisible.value = true;
}

function openEdit(tag: Tag) {
  editingTag.value = tag;
  form.value = {
    name: tag.name,
  };
  dialogVisible.value = true;
}

function resetDialog() {
  editingTag.value = null;
  form.value = { name: "" };
}

async function handleSubmit() {
  const trimmed = form.value.name.trim();
  if (!trimmed) {
    ElMessage.warning("请输入标签名");
    return;
  }
  // 重名校验：已存在同名标签时拒绝（编辑时排除自身）
  const existing = tags.value.find(
    (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase() && t.id !== editingTag.value?.id
  );
  if (existing) {
    ElMessage.warning(`标签「${existing.name}」已存在`);
    return;
  }
  saving.value = true;
  try {
    const payload = {
      name: trimmed,
    };

    if (editingTag.value) {
      await updateTag(editingTag.value.id, payload);
      ElMessage.success("标签已更新");
    } else {
      await createTag(payload);
      ElMessage.success("标签已创建");
    }
    dialogVisible.value = false;
    await refreshAndReload();
  } catch (e: any) {
    ElMessage.error(e?.message || "操作失败");
  } finally {
    saving.value = false;
  }
}

async function handleDelete(tag: Tag) {
  try {
    await ElMessageBox.confirm(`确定删除标签「${tag.name}」吗？`, "提示", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
    });
  } catch {
    return;
  }
  try {
    await deleteTag(tag.id);
    ElMessage.success("标签已删除");
    await refreshAndReload();
  } catch (e: any) {
    ElMessage.error(e?.message || "删除失败");
  }
}

/** 从后端重新拉取标签 */
async function refreshAndReload() {
  await loadTags();
}

function formatDate(date?: string): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(async () => {
  await loadTags();
});
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