<template>
  <el-container class="admin-layout">
    <!-- 左侧管理菜单 -->
    <el-aside width="200px" class="admin-aside">
      <div class="admin-brand">管理后台</div>
      <el-menu
        :default-active="activeMenu"
        router
        class="admin-menu"
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.65)"
        active-text-color="#fff"
      >
        <el-menu-item index="/admin/categories">
          <el-icon><Folder /></el-icon>
          <span>分类管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/tags">
          <el-icon><CollectionTag /></el-icon>
          <span>标签管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/review">
          <el-icon><DocumentChecked /></el-icon>
          <span>文章审核</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-main class="admin-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CollectionTag, DocumentChecked, Folder } from '@element-plus/icons-vue'

const route = useRoute()

// 高亮当前菜单项（精确到 /admin/* 子路径）
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.admin-layout {
  min-height: calc(100vh - 70px);
}

.admin-aside {
  background-color: #001529;
  color: #fff;
}

.admin-brand {
  height: 56px;
  line-height: 56px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.admin-menu {
  border-right: none;
}

.admin-menu :deep(.el-menu-item) {
  height: 46px;
  line-height: 46px;
}

.admin-main {
  background-color: #f5f5f5;
  padding: 20px;
}

@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-aside {
    width: 100% !important;
  }

  .admin-brand {
    height: 44px;
    line-height: 44px;
  }

  .admin-menu {
    display: flex;
  }

  .admin-menu :deep(.el-menu-item) {
    flex: 1;
  }
}
</style>
