# 文件清单

## 📁 项目结构

```
/
├── src/                              # 源代码目录
│   ├── api/                         # API 接口层
│   │   ├── http.ts                  # HTTP 客户端配置（39 行）
│   │   ├── article.ts               # 文章 API 接口（173 行）
│   │   ├── comment.ts               # 评论 API 接口（103 行）
│   │   └── mock/                    # Mock 数据
│   │       ├── articles.ts          # 文章 Mock 数据（298 行）
│   │       └── comments.ts          # 评论 Mock 数据（79 行）
│   ├── components/                  # 公共组件层
│   │   ├── Header.vue               # 顶部导航栏（143 行）
│   │   ├── LoginModal.vue           # 登录/注册弹窗（235 行）
│   │   ├── ArticleCard.vue          # 文章卡片组件（192 行）
│   │   └── CommentSection.vue       # 评论区组件（252 行）
│   ├── stores/                      # Pinia 状态管理
│   │   ├── auth.ts                  # 认证状态（109 行）
│   │   ├── article.ts               # 文章状态（133 行）
│   │   └── comment.ts               # 评论状态（67 行）
│   ├── views/                       # 页面组件层
│   │   ├── Home.vue                 # 首页（213 行）
│   │   ├── WriteArticle.vue         # 写文章页（249 行）
│   │   └── ArticleDetail.vue        # 文章详情页（333 行）
│   ├── router/                      # 路由配置
│   │   └── index.ts                 # 路由定义（25 行）
│   ├── App.vue                      # 根组件（25 行）
│   └── main.ts                      # 应用入口（16 行）
│
├── 📖 文档文件
│   ├── README.md                    # 项目说明（256 行）
│   ├── API_DOCUMENTATION.md         # API 文档（797 行）
│   ├── ARCHITECTURE.md              # 架构设计（606 行）
│   ├── DEPLOYMENT_GUIDE.md          # 部署指南（379 行）
│   ├── PROJECT_SUMMARY.md           # 项目总结（414 行）
│   └── FILE_MANIFEST.md             # 文件清单（此文件）
│
├── 🔧 配置文件
│   ├── vite.config.ts               # Vite 构建配置
│   ├── tsconfig.json                # TypeScript 配置
│   ├── package.json                 # 项目依赖
│   ├── .env.example                 # 环境变量示例
│   └── index.html                   # HTML 入口文件
│
└── 📦 自动生成
    ├── dist/                        # 生产构建输出目录
    ├── node_modules/                # 依赖包
    └── .next/                       # Vite 缓存
```

---

## 📄 源代码文件详解

### API 层

#### `src/api/http.ts`
- 功能：HTTP 客户端配置
- 职责：请求拦截、响应处理、错误管理
- 关键特性：自动 Token 携带、统一错误处理、401 自动登出

#### `src/api/article.ts`
- 功能：文章相关 API 接口
- 接口：getArticles、getArticleById、createArticle 等 7 个
- 特点：详细的中文注释，接口文档齐全

#### `src/api/comment.ts`
- 功能：评论相关 API 接口
- 接口：getComments、createComment、deleteComment 等 4 个
- 特点：与 article.ts 保持一致的代码风格

#### `src/api/mock/articles.ts`
- 功能：文章 Mock 数据
- 包含：6 篇示例文章，完整的 Markdown 内容
- 功能函数：getMockArticles、getMockArticleById、createMockArticle

#### `src/api/mock/comments.ts`
- 功能：评论 Mock 数据
- 包含：2 篇文章的评论数据
- 功能函数：getMockComments、createMockComment

### 组件层

#### `src/components/Header.vue`
- 功能：顶部导航栏
- 包含：logo、导航菜单、登录/注册/用户菜单
- 特性：响应式、用户头像弹出菜单、登出功能

#### `src/components/LoginModal.vue`
- 功能：登录/注册弹窗
- 包含：登录表单、注册表单、模式切换
- 特性：表单验证、错误提示、自动获焦

#### `src/components/ArticleCard.vue`
- 功能：文章卡片显示
- 包含：标题、摘要、元信息、标签、统计数据
- 特性：鼠标悬停效果、标签点击事件

#### `src/components/CommentSection.vue`
- 功能：评论区组件
- 包含：评论表单、评论列表、登录提示
- 特性：评论提交、列表加载、未登录提示

### 状态管理层

#### `src/stores/auth.ts`
- Store：useAuthStore
- 状态：token、user、showLoginModal
- 方法：login、register、logout、openLoginModal、closeLoginModal
- 特点：Token localStorage 持久化

#### `src/stores/article.ts`
- Store：useArticleStore
- 状态：articles、selectedTag、currentPage
- 计算属性：filteredArticles、paginatedArticles、availableTags、hasMore
- 方法：fetchArticles、selectTag、loadMore 等 7 个

#### `src/stores/comment.ts`
- Store：useCommentStore
- 状态：comments（Map 结构按文章缓存）
- 方法：fetchComments、addComment、getArticleComments

### 页面层

#### `src/views/Home.vue`
- 页面：首页
- 功能：文章列表、标签筛选、无限滚动
- 特性：Intersection Observer 检测、分页显示

#### `src/views/WriteArticle.vue`
- 页面：写文章页
- 功能：文章编辑、标签选择、文章发布
- 特性：Markdown 编辑器集成、表单验证、登录检查

#### `src/views/ArticleDetail.vue`
- 页面：文章详情
- 功能：Markdown 渲染、评论显示、点赞功能
- 特性：评论区集成、美化的 Markdown 样式

### 核心文件

#### `src/App.vue`
- 功能：Vue 应用根组件
- 包含：Header、LoginModal、路由视图

#### `src/main.ts`
- 功能：应用入口
- 职责：创建 Vue 应用、初始化 Pinia、Vue Router、Element Plus

#### `src/router/index.ts`
- 功能：路由配置
- 路由：首页、写文章、文章详情（3 条）

---

## 📚 文档文件详解

### README.md
内容：项目总体介绍、快速开始、技术栈说明
目标读者：所有开发人员

### API_DOCUMENTATION.md
内容：前后端交互规范、所有接口文档、错误码说明、数据库设计
目标读者：前端开发者、后端开发者

### ARCHITECTURE.md
内容：系统架构、分层设计、数据流、扩展指南
目标读者：架构师、高级开发者

### DEPLOYMENT_GUIDE.md
内容：本地开发、生产构建、部署方案、性能优化
目标读者：运维、DevOps、全栈开发者

### PROJECT_SUMMARY.md
内容：项目总结、交付内容、功能详解、技术亮点
目标读者：项目经理、技术总监

### FILE_MANIFEST.md
内容：文件清单、目录结构、文件说明（此文件）
目标读者：所有开发人员

---

## 🔧 配置文件详解

### vite.config.ts
```typescript
- 配置 Vue 插件支持
- 设置路径别名 (@/)
- 配置开发服务器端口 (5173)
```

### tsconfig.json
```typescript
- 编译目标: ES2020
- 启用严格模式
- 配置 TypeScript 路径
- 支持 Vue 文件
```

### package.json
```json
- 依赖: Vue、Router、Pinia、Element Plus 等
- 脚本: dev、build、preview
- 开发依赖: Vite、TypeScript 等
```

### .env.example
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### index.html
```html
- 应用入口点
- 挂载点: <div id="app"></div>
- 引入主程序: /src/main.ts
```

---

## 📊 代码统计

### 源代码行数

| 模块 | 文件数 | 总行数 |
|------|--------|--------|
| API 接口层 | 5 | 692 |
| 公共组件 | 4 | 822 |
| 状态管理 | 3 | 309 |
| 页面视图 | 3 | 795 |
| 路由/主程序 | 2 | 66 |
| **总计** | **17** | **2684** |

### 文档行数

| 文档 | 行数 |
|------|------|
| README.md | 256 |
| API_DOCUMENTATION.md | 797 |
| ARCHITECTURE.md | 606 |
| DEPLOYMENT_GUIDE.md | 379 |
| PROJECT_SUMMARY.md | 414 |
| FILE_MANIFEST.md | 此文件 |
| **总计** | **2452** |

### 总体统计
- **源代码**: 2684 行（包括注释）
- **文档**: 2450+ 行
- **总计**: 5100+ 行
- **文件**: 23 个

---

## 🚀 快速导航

### 开始开发？
1. 查看 `README.md` 快速开始部分
2. 运行 `pnpm install && pnpm run dev`
3. 修改 `src/` 下的文件即时预览

### 了解架构？
1. 阅读 `ARCHITECTURE.md`
2. 查看 `src/stores/` 状态管理
3. 查看 `src/api/` 接口层

### 对接后端？
1. 查看 `API_DOCUMENTATION.md` 了解接口规范
2. 修改 `src/api/` 下的接口文件
3. 将 Mock 调用替换为真实 HTTP 请求

### 部署上线？
1. 查看 `DEPLOYMENT_GUIDE.md`
2. 运行 `pnpm run build` 构建
3. 选择合适的部署方案

---

## 💡 文件关系图

```
路由 (router/index.ts)
    ↓
页面视图 (views/)
    ├── Home.vue ─→ ArticleCard (components)
    ├── WriteArticle.vue
    └── ArticleDetail.vue ─→ CommentSection (components)

Header.vue ──→ LoginModal.vue (components)

所有页面和组件
    ↓
状态管理 (stores/)
    ├── useAuthStore
    ├── useArticleStore
    └── useCommentStore
    ↓
API 层 (api/)
    ├── article.ts ─→ mock/articles.ts
    └── comment.ts ─→ mock/comments.ts
    ↓
HTTP 客户端 (api/http.ts)
    ↓
后端 API / Mock 数据
```

---

## ✅ 文件检查清单

- [x] API 接口层完整（article、comment、http）
- [x] Mock 数据完整（articles、comments）
- [x] 公共组件完整（Header、LoginModal、ArticleCard、CommentSection）
- [x] 状态管理完整（auth、article、comment）
- [x] 页面视图完整（Home、WriteArticle、ArticleDetail）
- [x] 路由配置完整（3 条路由）
- [x] 应用入口完整（App.vue、main.ts）
- [x] 构建配置完整（vite.config.ts、tsconfig.json）
- [x] 项目配置完整（package.json）
- [x] 文档齐全（5 篇文档）

---

## 📝 文件编辑说明

### 修改 API
编辑 `src/api/article.ts` 和 `src/api/comment.ts`，后端就位时替换 Mock 调用。

### 添加新页面
1. 在 `src/views/` 创建新组件
2. 在 `src/router/index.ts` 添加路由
3. 在 `src/components/Header.vue` 添加菜单链接

### 添加新状态
1. 在 `src/stores/` 创建新 Store 文件
2. 使用 `defineStore` 定义状态
3. 在组件中导入使用

### 创建新组件
1. 在 `src/components/` 创建 `.vue` 文件
2. 编写模板、脚本、样式
3. 在需要的地方导入使用

---

## 🔐 重要文件保护

建议在版本控制中配置以下规则：
- ✓ `src/` 下的所有文件可修改
- ✗ `package.json` 谨慎修改（可能影响依赖）
- ✗ 文档文件仅作参考，不应删除

---

## 📞 文件问题排查

**问题**: 找不到某个类型？
→ 检查 `tsconfig.json` 中的 paths 配置

**问题**: 某个 API 无法工作？
→ 检查 `src/api/http.ts` 的拦截器

**问题**: 状态无法更新？
→ 检查 `src/stores/` 中的状态定义

**问题**: 路由无法访问？
→ 检查 `src/router/index.ts` 中的路由定义

---

**文件清单完成！** 所有文件已准备就绪。
