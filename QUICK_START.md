# 🚀 快速开始指南

> 5 分钟内启动个人博客前端项目

## 1️⃣ 环境检查

确保你已安装：
```bash
node --version      # >= v16.0.0
npm --version       # >= v7.0.0
# 或使用 pnpm (推荐)
pnpm --version      # >= v8.0.0
```

## 2️⃣ 克隆/下载项目

```bash
# 方式一：如果是 Git 仓库
git clone <repository-url>
cd blog-frontend

# 方式二：直接使用当前项目
cd /path/to/project
```

## 3️⃣ 安装依赖

```bash
# 使用 pnpm (推荐，快速且可靠)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

## 4️⃣ 启动开发服务器

```bash
pnpm run dev
```

你会看到类似输出：
```
  VITE v5.4.21  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 5️⃣ 打开浏览器

访问 [http://localhost:5173](http://localhost:5173)

🎉 **恭喜！博客前端已启动！**

---

## 📝 快速操作指南

### 查看首页
- 自动显示首页
- 点击标签筛选文章
- 滚动加载更多文章

### 测试登录
```
用户名: user1
密码: (任意)
```

### 查看文章详情
- 点击任意文章卡片
- 查看 Markdown 渲染
- 查看评论区

### 写文章
- 点击导航栏「写文章」
- 先登录（点击登录按钮）
- 输入标题、标签、内容
- 点击「发布文章」

### 发表评论
- 进入文章详情
- 登录后在评论区输入
- 点击「发布评论」

---

## 🛑 遇到问题？

### 端口被占用
```bash
# 修改端口（编辑 vite.config.ts）
export default defineConfig({
  server: {
    port: 5174,  // 改为其他端口
  }
})
```

### 依赖安装失败
```bash
# 清除缓存重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 编辑后页面不更新
```bash
# 按 Ctrl+C 停止服务器
# 重新启动
pnpm run dev
```

---

## 📚 下一步

### 了解项目结构
📖 阅读 `README.md`

### 深入理解架构
📖 阅读 `ARCHITECTURE.md`

### 学习 API 规范
📖 阅读 `API_DOCUMENTATION.md`

### 准备部署
📖 阅读 `DEPLOYMENT_GUIDE.md`

### 查看完整清单
📖 阅读 `FILE_MANIFEST.md`

---

## 🎯 核心功能测试清单

- [ ] 首页加载 6 篇文章
- [ ] 点击标签筛选文章
- [ ] 滚动加载更多文章
- [ ] 点击文章进入详情页
- [ ] 点击登录按钮打开登录弹窗
- [ ] 使用 user1 登录
- [ ] 登录后导航栏显示用户头像
- [ ] 点击「写文章」进入编辑页
- [ ] 编写并发布新文章
- [ ] 在文章详情页发表评论
- [ ] 点击用户头像菜单进行退出登录
- [ ] 验证响应式设计（缩小浏览器窗口）

---

## 🔨 常用命令

```bash
# 启动开发服务器
pnpm run dev

# 构建生产版本
pnpm run build

# 预览生产构建
pnpm run preview

# 检查代码（如果配置了 lint）
pnpm run lint
```

---

## 📱 测试不同设备

在浏览器中打开开发者工具 (F12)，选择设备模式：

- 📱 iPhone 14
- 📱 iPhone SE
- 📱 Pixel 7
- 💻 iPad Air
- 🖥️ 1920x1080 (桌面)

---

## 🌍 环境变量

项目默认连接到 Mock 数据。当后端就位时：

1. 创建 `.env` 文件：
```env
VITE_API_BASE_URL=http://your-backend-api.com/api
```

2. 修改 API 文件：
   - `src/api/article.ts`
   - `src/api/comment.ts`

3. 将 Mock 调用替换为真实 HTTP 请求

---

## 🎓 学习资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 组件库](https://element-plus.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)

---

## 💡 技巧

### 快速编辑文件
在 VS Code 中使用快捷键：
- `Ctrl+P` - 打开文件搜索
- `Ctrl+F` - 查找内容
- `Ctrl+H` - 查找替换

### 热模块替换 (HMR)
- 修改代码自动刷新浏览器
- 无需手动刷新页面

### TypeScript 智能提示
- VS Code 会自动提示类型
- 避免运行时错误

---

## 📞 获取帮助

遇到问题？按以下顺序查找帮助：

1. **查看控制台错误**
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签

2. **检查服务器日志**
   - 查看终端中的错误信息

3. **查看项目文档**
   - README.md - 项目概览
   - ARCHITECTURE.md - 架构设计
   - API_DOCUMENTATION.md - API 规范

4. **检查代码注释**
   - 所有文件都有详细中文注释

---

## ✨ 项目亮点

✅ **开箱即用** - 无需额外配置，开发服务器立即启动
✅ **完整的 Mock 数据** - 无需后端即可开发测试
✅ **类型安全** - 完整的 TypeScript 支持
✅ **响应式设计** - 支持所有设备尺寸
✅ **清晰的代码结构** - 易于维护和扩展

---

## 🎉 完成了！

现在你已经：
- ✅ 安装了项目依赖
- ✅ 启动了开发服务器
- ✅ 打开了博客前端应用
- ✅ 了解了基本操作

**享受开发吧！** 🚀

---

## 📌 常见问题 (FAQ)

**Q: 如何修改博客名称？**
A: 编辑 `src/components/Header.vue` 中的 logo 文本

**Q: 如何添加新的标签？**
A: 发表包含新标签的文章即可自动添加

**Q: 如何修改主色调？**
A: 在 `src/App.vue` 或全局 CSS 中修改色彩变量

**Q: 如何集成真实后端？**
A: 详见 `API_DOCUMENTATION.md` 和 `DEPLOYMENT_GUIDE.md`

**Q: 如何部署到生产环境？**
A: 详见 `DEPLOYMENT_GUIDE.md`

---

**祝你使用愉快！** 🎊
