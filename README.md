# 个人博客系统 - Vue3 前端

一个基于 **Vue3 + TypeScript + Element Plus + Pinia + Vue Router** 构建的现代化个人博客前端应用。采用分层架构设计，具有完整的认证系统、文章管理、评论功能和无限滚动加载。

## ✨ 核心功能

- 📝 文章发表、编辑、删除、Markdown 渲染
- 🏷️ 标签分类和筛选、无限滚动加载
- 💬 完整评论系统（发表、删除、点赞）、支持嵌套回复
- 👍 文章点赞和收藏功能
- 👤 完整用户认证系统（登录/注册/登出）
- 🎨 响应式设计，支持多设备、Element Plus UI 组件库
- 🔐 Token 认证、路由守卫保护
- 🏗️ 分层架构、完整的 TypeScript 类型检查
- 📡 Mock 数据层、便于前后端分离开发

## 技术栈

- **框架**: Vue 3.5.40
- **路由**: Vue Router 5.2.0
- **状态管理**: Pinia 4.0.2
- **UI 组件库**: Element Plus 2.14.3
- **Markdown 编辑器**: md-editor-v3 6.5.5
- **HTTP 请求**: Axios 1.19.0
- **构建工具**: Vite 5.4.21
- **语言**: TypeScript 5.7.3

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm run dev
```

应用将在 `http://localhost:5173` 启动

### 生产构建

```bash
pnpm run build
```

构建后的文件在 `dist` 目录中

### 预览生产构建

```bash
pnpm run preview
```

## 项目结构

```
src/
├── api/                    # API 接口层
│   ├── mock/              # Mock 数据
│   │   ├── articles.ts    # 文章 Mock 数据
│   │   └── comments.ts    # 评论 Mock 数据
│   ├── article.ts         # 文章 API 接口
│   ├── comment.ts         # 评论 API 接口
│   └── http.ts            # HTTP 客户端配置
├── components/            # 公共组件
│   ├── Header.vue         # 顶部导航栏
│   ├── LoginModal.vue     # 登录/注册弹窗
│   ├── ArticleCard.vue    # 文章卡片
│   └── CommentSection.vue # 评论区
├── stores/                # Pinia 状态管理
│   ├── auth.ts           # 认证状态
│   ├── article.ts        # 文章状态
│   └── comment.ts        # 评论状态
├── views/                 # 页面组件
│   ├── Home.vue          # 首页
│   ├── WriteArticle.vue  # 写文章页
│   └── ArticleDetail.vue # 文章详情页
├── router/               # 路由配置
│   └── index.ts
├── App.vue              # 根组件
└── main.ts              # 应用入口
```

## 核心功能说明

### 1. 页面导航
- 顶部导航栏展示博客名称、菜单和用户信息
- 未登录时显示登录/注册按钮
- 登录后显示用户头像和退出登录选项

### 2. 首页
- 标签分类栏，支持点击切换标签
- 文章列表展示，包含标题、摘要、发布时间、标签、统计信息
- 无限滚动加载，每页 10 条文章
- 点击标签进行文章筛选

### 3. 写文章
- 文章标题输入
- 标签选择和自定义
- 使用 Markdown 编辑器编写文章正文
- 发布前校验
- 登录状态检查

### 4. 文章详情
- 完整的 Markdown 渲染
- 文章信息展示（标题、作者、发布时间等）
- 点赞功能
- 评论区（需要登录才能评论）

### 5. 用户认证
- 登录弹窗（用户名/密码）
- 注册弹窗（用户名/邮箱/密码）
- Token 存储和自动携带
- 登录状态持久化

## 状态管理

### Auth Store (认证状态)
- `token`: 用户令牌
- `user`: 当前用户信息
- `isLoggedIn`: 是否已登录
- `login()`: 用户登录
- `register()`: 用户注册
- `logout()`: 用户登出

### Article Store (文章状态)
- `articles`: 文章列表
- `currentArticle`: 当前查看的文章
- `selectedTag`: 选中的标签
- `fetchArticles()`: 获取文章列表
- `fetchArticleById()`: 获取文章详情
- `publishArticle()`: 发布文章

### Comment Store (评论状态)
- `comments`: 评论映射表
- `fetchComments()`: 获取文章评论
- `addComment()`: 发表评论

## 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# 后端 API 地址
VITE_API_BASE_URL=http://localhost:3000/api
```

## API 接口

所有 API 接口详见 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### 主要接口分类

#### 认证相关
- `POST /auth/login` - 用户登录
- `POST /auth/register` - 用户注册
- `POST /auth/logout` - 用户登出

#### 文章相关
- `GET /articles` - 获取文章列表
- `GET /articles/{id}` - 获取文章详情
- `POST /articles` - 创建文章
- `PUT /articles/{id}` - 更新文章
- `DELETE /articles/{id}` - 删除文章
- `POST /articles/{id}/like` - 点赞文章

#### 评论相关
- `GET /articles/{articleId}/comments` - 获取评论列表
- `POST /articles/{articleId}/comments` - 发表评论
- `DELETE /comments/{commentId}` - 删除评论
- `POST /comments/{commentId}/like` - 点赞评论

## Mock 数据说明

当前项目使用 Mock 数据进行开发和演示。当后端接口就位时，只需修改 `src/api/` 下的接口文件，替换 Mock 调用为真实 HTTP 请求。

Mock 数据位置：
- 文章数据: `src/api/mock/articles.ts`
- 评论数据: `src/api/mock/comments.ts`

## 后端对接指南

当后端服务就位时，请按照以下步骤进行对接：

1. **修改 API 接口文件** (`src/api/article.ts` 和 `src/api/comment.ts`)
   - 取消注释真实 HTTP 请求代码
   - 注释 Mock 数据调用

2. **配置环境变量**
   - 设置 `VITE_API_BASE_URL` 为实际的后端 API 地址

3. **测试接口**
   - 验证所有接口的请求/响应格式
   - 测试错误处理逻辑

4. **处理认证**
   - 确保 token 被正确发送和使用
   - 实现 token 刷新机制（如需要）

## 开发指南

### 添加新功能
1. 在 `stores/` 中定义状态
2. 在 `api/` 中定义 API 接口
3. 在 `components/` 或 `views/` 中创建 UI 组件
4. 在 `router/` 中注册路由（如需要）

### 组件命名规范
- 公共组件使用 PascalCase，放在 `components/` 目录
- 页面组件使用 PascalCase，放在 `views/` 目录
- 使用 `.vue` 后缀

### 状态管理规范
- 使用 Pinia 进行状态管理
- Store 命名为 `useXxxStore`
- 在 `stores/` 目录下创建对应的 store 文件

## 浏览器支持

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 许可证

MIT

## 常见问题

### Q: 如何修改博客名称？
A: 修改 `src/components/Header.vue` 中 logo 的文本

### Q: 如何自定义主题色？
A: 修改 `src/main.ts` 中 Element Plus 的主题配置，或修改全局 CSS 变量

### Q: 如何添加新的标签？
A: 标签来自文章数据，发表包含新标签的文章即可自动添加

### Q: 如何实现用户头像上传？
A: 可使用 Vercel Blob 或其他文件存储服务，在注册/个人资料中添加上传功能

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。
