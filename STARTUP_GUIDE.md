# 🚀 项目启动指南

## ✅ 已修复的问题

### 1. ESM 模块加载错误
**问题**: `"@vitejs/plugin-vue" resolved to an ESM file. ESM file cannot be loaded by require`

**解决方案**:
- 在 `package.json` 添加 `"type": "module"`
- 在 `vite.config.ts` 修复 `__dirname` 的 ESM 兼容性

### 2. PostCSS 配置错误
**问题**: `Cannot find module '@tailwindcss/postcss'`

**解决方案**:
- 修复 `postcss.config.mjs`，移除不需要的 Tailwind 配置（项目使用 Element Plus）

### 3. 路由文件名不匹配
**问题**: `ENOENT: no such file or directory, open '/vercel/share/v0-project/src/views/Write.vue'`

**解决方案**:
- 路由中的 `Write.vue` 改为 `WriteArticle.vue`

### 4. 缺少 Element Plus Icons
**问题**: `@element-plus/icons-vue` 依赖缺失

**解决方案**:
- 运行 `pnpm add @element-plus/icons-vue`

---

## 🎯 快速启动

### 方法1：本地启动（推荐）

```bash
# 进入项目目录
cd personal-blog

# 安装依赖（如果还未安装）
pnpm install

# 启动开发服务器
pnpm dev

# 访问：http://localhost:5173
```

### 方法2：查看日志

```bash
# 实时查看开发服务器日志
pnpm dev

# 输出示例：
# VITE v5.4.21  ready in 294 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://100.64.62.220:5173/
```

---

## 🧪 测试登录

使用以下测试账户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| user1  | 任意 | 普通用户 |
| user2  | 任意 | 普通用户 |

**所有功能都已使用 Mock 数据实现，可以完整测试。**

---

## 📦 依赖检查

如果启动后仍然有问题，检查依赖是否完整：

```bash
# 清理缓存并重新安装
pnpm install

# 检查依赖版本
pnpm list | grep -E "vue|vite|pinia|element-plus"

# 预期输出：
# vue@3.5.40
# vite@5.4.21
# pinia@4.0.2
# element-plus@2.14.3
```

---

## 🐛 常见问题排查

### 问题1：端口 5173 已被占用

```bash
# 查看占用进程
lsof -i :5173

# 或改用其他端口
pnpm dev -- --port 3000
```

### 问题2：Node.js 版本过低

```bash
# 检查 Node 版本（需要 14+）
node --version

# 升级 Node.js
# macOS: brew upgrade node
# Windows: 访问 nodejs.org 下载新版本
```

### 问题3：模块导入错误

```bash
# 清理 node_modules 和缓存
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 问题4：Vite 编译错误

```bash
# 检查 vite.config.ts 和 tsconfig.json
# 确保 vite.config.ts 有以下代码：

import { fileURLToPath } from 'url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
```

---

## 📚 后续步骤

1. **查看代码**
   - 打开 `/src` 目录浏览源代码
   - 查看 `stores/` 了解状态管理
   - 查看 `api/` 了解接口层

2. **修改 Mock 数据**
   - 编辑 `/src/stores/` 中的 Mock 数据
   - 编辑 `/src/api/` 中的接口定义

3. **连接真实后端**
   - 按 `API_DOCUMENTATION.md` 实现后端接口
   - 修改 `/src/api/` 中的接口调用（改为真实 API）

4. **构建生产版本**
   ```bash
   pnpm build
   pnpm preview
   ```

---

## 💡 开发技巧

### 热更新 (HMR)
- 代码修改后自动保存和刷新，无需手动重启

### 调试
- 打开浏览器开发者工具 (F12)
- 查看 Network 标签观察 API 调用
- 查看 Console 了解错误信息

### 状态调试
```bash
# 在浏览器控制台执行
const { useArticleStore } = await import('@/stores/article')
useArticleStore().articles  # 查看所有文章
```

---

## ✨ 项目已就绪！

一切就绪。现在可以：
- ✅ 本地开发和测试
- ✅ 修改 Mock 数据
- ✅ 查看完整功能演示
- ✅ 按 API 文档对接后端

祝您开发顺利！🎉
