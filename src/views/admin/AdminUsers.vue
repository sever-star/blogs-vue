<template>
  <div class="admin-users">
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-header">
          <span class="card-title">用户管理</span>
          <span class="card-subtitle">共 {{ total }} 名用户</span>
        </div>
      </template>

      <div class="toolbar">
        <el-input
          v-model="keyword"
          class="keyword-input"
          placeholder="按用户名/昵称/邮箱搜索"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <el-table :data="users" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="用户名" min-width="120" />
        <el-table-column prop="nickname" label="昵称" min-width="110" show-overflow-tooltip />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column label="角色" width="150">
          <template #default="{ row }">
            <!-- 账号禁用期间角色锁定：启用后才能调整 -->
            <el-select
              :model-value="row.role"
              :disabled="isSelf(row) || pendingId === row.id || row.status !== 1"
              size="small"
              @change="(val: UserRole) => handleRoleChange(row, val)"
            >
              <el-option label="管理员" value="ADMIN" />
              <el-option label="普通用户" value="USER" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 1"
              :before-change="() => beforeToggleStatus(row)"
              :disabled="isSelf(row) || pendingId === row.id"
              inline-prompt
              active-text="正常"
              inactive-text="禁用"
            />
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="180">
          <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="isSelf(row)" size="small" type="info">我</el-tag>
            <span v-else class="muted">—</span>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { getUsersPaged, updateUserRole, updateUserStatus } from "@/api/user";
import type { UserRole } from "@/api/user";
import type { User } from "@/types";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

const users = ref<User[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const keyword = ref("");
// 实际用于查询的关键词（输入但不查询时不影响列表）
const appliedKeyword = ref("");
// 正在提交的用户 id，请求期间禁用该行控件，防止重复提交
const pendingId = ref<number | null>(null);

/** 是否是自己（后端同样会拦截改自己，这里先禁用避免误导） */
function isSelf(row: User): boolean {
  return row.id === authStore.user?.id;
}

/** 加载当前页用户（删光当前页最后一行时自动回退一页） */
async function loadUsers() {
  loading.value = true;
  try {
    const res = await getUsersPaged({
      page: page.value,
      pageSize: pageSize.value,
      keyword: appliedKeyword.value || undefined,
    });
    users.value = res.data;
    total.value = res.total;
    // 删光当前页最后一行：页码回退并重载
    if (users.value.length === 0 && page.value > 1) {
      page.value -= 1;
      await loadUsers();
    }
  } catch (e: any) {
    ElMessage.error(e?.message || "加载用户失败");
  } finally {
    loading.value = false;
  }
}

function handlePageChange(p: number) {
  page.value = p;
  loadUsers();
}

function handleSizeChange(s: number) {
  pageSize.value = s;
  page.value = 1;
  loadUsers();
}

function handleSearch() {
  appliedKeyword.value = keyword.value.trim();
  page.value = 1;
  loadUsers();
}

function handleReset() {
  keyword.value = "";
  appliedKeyword.value = "";
  page.value = 1;
  loadUsers();
}

/**
 * 修改角色。el-select 用 :model-value 受控——确认并更新成功前
 * 显示不随选择变化，取消或失败无需回滚显示。
 */
async function handleRoleChange(row: User, newRole: UserRole) {
  if (newRole === row.role || pendingId.value !== null) return;
  const oldLabel = row.role === "ADMIN" ? "管理员" : "普通用户";
  const newLabel = newRole === "ADMIN" ? "管理员" : "普通用户";
  try {
    await ElMessageBox.confirm(
      `确定将用户「${row.username}」的角色从${oldLabel}改为${newLabel}吗？`,
      "提示",
      { type: "warning", confirmButtonText: "修改", cancelButtonText: "取消" }
    );
  } catch {
    return; // 取消：受控值未变
  }
  pendingId.value = row.id;
  try {
    await updateUserRole(row.id, newRole);
    ElMessage.success("角色已更新");
    await loadUsers();
  } catch (e: any) {
    ElMessage.error(e?.message || "角色更新失败");
  } finally {
    pendingId.value = null;
  }
}

/**
 * 启用/禁用（el-switch 的 before-change）：
 * 确认 + 接口成功才 resolve（开关翻转并刷新列表），取消或失败 reject，开关不动作。
 */
function beforeToggleStatus(row: User): Promise<boolean> {
  const disabling = row.status === 1;
  const tip = disabling
    ? `确定禁用用户「${row.username}」吗？禁用后其将无法登录，已有登录态会立即失效。`
    : `确定重新启用用户「${row.username}」吗？`;
  return ElMessageBox.confirm(tip, "提示", {
    type: "warning",
    confirmButtonText: disabling ? "禁用" : "启用",
    cancelButtonText: "取消",
  }).then(async () => {
    pendingId.value = row.id;
    try {
      await updateUserStatus(row.id, disabling ? 0 : 1);
      ElMessage.success(disabling ? "已禁用" : "已启用");
      await loadUsers();
      return true;
    } catch (e: any) {
      ElMessage.error(e?.message || "操作失败");
      return Promise.reject(e);
    } finally {
      pendingId.value = null;
    }
  });
}

function formatDate(date?: string | null): string {
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
  await loadUsers();
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

.card-subtitle {
  font-size: 13px;
  color: #6b7280;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.keyword-input {
  width: 260px;
}

.muted {
  color: #c0c4cc;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
