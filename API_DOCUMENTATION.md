# 个人博客系统 - 前后端交互 API 文档

## 文档说明

本文档定义了个人博客前后端通信的所有 API 接口规范。前端已实现 Mock 数据层，后端只需按本规范实现相应接口即可无缝对接。

> **文档同步规范**：本文档是前后端交互的**唯一权威来源（single source of truth）**。
> 任何一次前后端交互的修改（新增/修改/删除接口、调整字段、变更认证方式等），
> **必须**同步更新本文档对应章节，保持文档、前端类型（`src/types/index.ts`）、
> 后端实现三者一致。修改后请检查：① 请求/返回字段名（camelCase）② 认证要求 ③ 错误码。

### 项目基础信息

- **基础 URL**: `http://localhost:8081/api` (开发环境，前端经 Vite 代理 `/api` 转发)
- **API 版本**: v1
- **数据格式**: JSON
- **字符编码**: UTF-8
- **认证方式**: 双 Token（accessToken + refreshToken）
  - `accessToken`：短期有效（15 分钟），放 `Authorization: Bearer {accessToken}` 请求头
  - `refreshToken`：长期有效（7 天），存 httpOnly cookie，用于无感刷新 accessToken
- **Token 存储**:
  - `accessToken`：浏览器 `localStorage` 的 `accessToken` 字段（前端不记录过期时间，靠后端 401001 被动刷新）
  - `refreshToken`：httpOnly cookie，名称 `refreshToken`，前端 JS 不可读
- **无感刷新**：accessToken 过期后，后端返回 HTTP 401 + body `{code: 401001}`，前端自动调用 `POST /auth/refresh`（携带 cookie）换新 accessToken，并重试原请求，用户无感知

---

## 通用响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

> **成功码约定**：后端 `Result.success()` 统一返回业务码 `200`、message `操作成功`（`ErrorCode.SUCCESS`）。前端 `src/api/client.ts` 同时把 `code === 0` 与 `code === 200` 视为成功（兼容历史 mock 层的历史返回值）。下文各接口示例统一采用后端实际值 `"code": 200` / `"message": "操作成功"`；前端无需区分 0 与 200。

### 错误响应

```json
{
  "code": 400,
  "message": "error message",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明                                          | 处理方式                                   |
| ------ | --------------------------------------------- | ------------------------------------------ |
| 200    | 成功（后端 `Result.success`；前端亦兼容 `0`） | -                                          |
| 400    | 请求参数错误 / 校验失败 / 重复命名等业务异常  | 客户端检查参数                             |
| 401    | 未授权（需要登录）                            | 跳转到登录页                               |
| 401001 | accessToken 过期（HTTP 401 + 此业务码）       | 前端自动刷新 accessToken；刷新失败则跳登录 |
| 401002 | accessToken 无效                              | 清除本地态并跳登录                         |
| 401003 | accessToken 缺失                              | 跳转到登录页                               |
| 401004 | 认证失败（账密错误等）                        | 提示账号或密码错误                         |
| 403    | 禁止访问（权限不足，如非作者编辑他人文章）    | 提示权限不足                               |
| 404    | 资源不存在                                    | 提示资源不存在                             |
| 500    | 服务器内部错误（兜底，不暴露堆栈）            | 提示稍后重试                               |

> **HTTP 状态映射**：`GlobalExceptionHandler` 将业务码映射为 HTTP 状态码——标准 HTTP 状态（100-599）原样使用，否则取业务码前三位（`401004 → 401`）。完整业务码仍保留在响应体 `Result.code` 中，供前端精确区分。

---

## 认证相关接口

### 1. 用户登录

**请求**

```
POST /auth/login
Content-Type: application/json
```

**入参**

```json
{
  "username": "string (3-20 字符)",
  "password": "string (6-32 字符)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "accessToken": "string (JWT，短期有效，15 分钟)",
    "user": {
      "id": 1,
      "username": "user1",
      "nickname": "张三",
      "email": "user1@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "热爱技术分享的前端开发者",
      "website": "https://example.com",
      "github": "https://github.com/user1",
      "weibo": "",
      "status": 1,
      "lastLoginAt": "2024-01-20T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-20T10:30:00Z"
    }
  }
}
```

**错误情况**

- 401: 用户名或密码错误
- 400: 参数校验失败

**备注**

- 登录成功后，后端通过 `Set-Cookie` 写入 `refreshToken`（httpOnly，7 天）
- 前端将 `accessToken` 保存至 `localStorage`（不记录过期时间，靠 401001 被动刷新）
- 后续所有需要认证的请求都需在 `Authorization` 头中带上 `Bearer ${accessToken}`
- accessToken 过期后，前端自动调用 `POST /auth/refresh` 无感刷新

---

### 2. 用户注册

**请求**

```
POST /auth/register
Content-Type: application/json
```

**入参**

```json
{
  "username": "string (3-20 字符，由字母数字下划线组成)",
  "email": "string (有效的邮箱地址)",
  "password": "string (6-32 字符)",
  "avatar": "string (头像URL，前端自动生成，可选)",
  "nickname": "string (昵称，默认与用户名一致，可选)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "accessToken": "string (JWT，短期有效，15 分钟)",
    "user": {
      "id": 2,
      "username": "newuser",
      "nickname": "newuser",
      "email": "newuser@example.com",
      "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=newuser",
      "bio": "",
      "website": "",
      "github": "",
      "weibo": "",
      "status": 1,
      "lastLoginAt": "2024-01-20T10:30:00Z",
      "createdAt": "2024-01-20T10:30:00Z",
      "updatedAt": "2024-01-20T10:30:00Z"
    }
  }
}
```

**错误情况**

- 400: 用户名已存在
- 400: 邮箱已存在
- 400: 参数校验失败

**备注**

- 注册成功后，后端同样下发 accessToken + refreshToken（cookie）
- 前端**不自动登录**：注册成功后切回登录表单，由用户手动登录
- 新用户默认头像由**前端从默认头像列表随机取一张**，随 `avatar` 字段提交（URL 形式，非文件上传）

---

### 3. 用户登出

**请求**

```
POST /auth/logout
Authorization: Bearer {accessToken} (可选)
Cookie: refreshToken=...
```

> 前端请求需带 `withCredentials: true`，确保 cookie 随请求发送。

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": "退出登录成功"
}
```

> 后端 `BlogUserController#logout` 返回 `Result.success("退出登录成功")`，`data` 为提示字符串（前端可忽略，本地强制登出即可）。

**备注**

- 后端删除该 `refreshToken` 对应的 DB 记录，并清除 `refreshToken` cookie（Set-Cookie 置空）
- 前端删除本地 `localStorage` 中的 `accessToken`
- 无论后端接口是否成功，前端本地都强制登出（try/finally 清状态）

---

### 4. 刷新 accessToken

**请求**

```
POST /auth/refresh
Cookie: refreshToken=...   (httpOnly，由浏览器自动携带，无需手动传)
```

> 前端请求需带 `withCredentials: true`。此接口不校验 accessToken（无需 Authorization 头）。

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "accessToken": "string (新的 JWT，15 分钟)"
  }
}
```

> **刷新只返回新 accessToken，不含 user**：后端 `BlogUserController#refresh` 仅返回 `AccessTokenDTO{accessToken}`。刷新只是轮换令牌，用户资料未变，前端应**保留内存/localStorage 中已有的 user 状态**，仅用新 `accessToken` 替换旧令牌并重试原请求。
>
> ⚠️ 当前前端 `types/index.ts` 的 `AuthResponse` 仍声明了 `user` 字段，且 `client.ts` 的刷新逻辑可能尝试读取 `data.user`。接入真实后端时需确认刷新分支**不要**覆盖已有 user（改为按需用 `GET /auth/me` 重新拉取，或干脆不复用 user 字段）。详见末尾「实现差异与字段映射」。

**错误情况**

- 401: refreshToken 无效或已过期（`code=401001`，前端跳登录）

**备注**

- **rotation 策略**：每次刷新都会作废旧 refreshToken 并签发新 refreshToken（新 cookie 覆盖旧 cookie）
- 前端在任意请求收到 401 时自动调用此接口，成功后重试原请求；多个并发 401 只触发一次刷新（请求队列合并）
- 刷新也失败（refreshToken 过期）时，前端清除本地状态并跳回首页

---

## 文章相关接口

### 1. 获取文章列表

**请求**

```
GET /posts?categoryId=1&tagId=1&keyword=vue
```

**Query 参数**
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| categoryId | number | 否 | 分类ID过滤（按分类筛选文章） |
| tagId | number | 否 | 标签ID过滤（多标签模型，可按单个标签筛选） |
| keyword | string | 否 | 标题/内容关键词搜索 |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "userId": 1,
      "title": "Vue 3 Composition API 完全指南",
      "summary": "深入了解 Vue 3 的 Composition API...",
      "contentMd": "# Vue 3 Composition API...",
      "coverImage": "https://picsum.photos/800/400?random=1",
      "readingTime": 15,
      "viewCount": 1250,
      "likeCount": 89,
      "favCount": 42,
      "commentCount": 12,
      "status": 1,
      "allowComment": true,
      "isTop": false,
      "publishedAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T14:30:00Z",
      "category": {
        "id": 1,
        "name": "技术"
      },
      "tags": [{ "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" }],
      "authorNickname": "张三",
      "authorAvatar": "https://example.com/avatar.jpg"
    }
  ]
}
```

**备注**

- 不需要认证即可访问
- 返回已发布的文章（status=1）
- 按 `publishedAt` 倒序排列
- 列表接口不返回 `contentMd` 和 `contentHtml` 完整内容，仅返回 `summary`
- 不支持分页（首页文章列表）；管理端文章审核列表的分页见 `GET /posts/pending`

---

### 2. 获取单篇文章详情

**请求**

```
GET /posts/{id}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "userId": 1,
    "title": "Vue 3 Composition API 完全指南",
    "summary": "深入了解 Vue 3 的 Composition API...",
    "contentMd": "# Vue 3 Composition API\n\nVue 3 引入了...",
    "contentHtml": "<h1>Vue 3 Composition API</h1><p>Vue 3 引入了...</p>",
    "coverImage": "https://picsum.photos/800/400?random=1",
    "readingTime": 15,
    "viewCount": 1250,
    "likeCount": 89,
    "favCount": 42,
    "commentCount": 12,
    "status": 1,
    "allowComment": true,
    "isTop": false,
    "publishedAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T14:30:00Z",
    "category": {
      "id": 1,
      "name": "技术"
    },
    "tags": [
      { "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" },
      { "id": 2, "name": "Frontend", "createdAt": "2024-01-01T00:00:00Z" }
    ],
    "authorNickname": "张三",
    "authorAvatar": "https://example.com/avatar.jpg",
    "liked": false,
    "favorited": true
  }
}
```

**错误情况**

- 404: 文章不存在

**备注**

- 返回完整的 Markdown 原文和渲染后的 HTML
- 访问时浏览量 (`viewCount`) 自动 +1
- 需要认证时返回 `liked` / `favorited` 字段表示当前用户的点赞/收藏状态

---

### 3. 创建文章

**请求**

```
POST /posts
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "title": "string (1-200 字符，必填)",
  "contentMd": "string (Markdown 格式，至少 50 字符，必填)",
  "summary": "string (文章摘要，可选，不填则自动截取)",
  "coverImage": "string (封面图URL，可选)",
  "categoryId": 1 (分类ID，可选),
  "tags": [1, 2] (标签ID数组，至少 1 个，最多 5 个),
  "readingTime": 15 (预估阅读时间（分钟），可选),
  "status": 0 (0=草稿, 1=已发布(审核通过), 2=待审核，可选，默认2),
  "allowComment": true (是否允许评论，可选，默认true)
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 51,
    "title": "新文章标题",
    "summary": "文章摘要...",
    "contentMd": "# 新文章...",
    "coverImage": null,
    "userId": 1,
    "authorNickname": "zhangsan",
    "readingTime": 15,
    "viewCount": 0,
    "likeCount": 0,
    "favCount": 0,
    "commentCount": 0,
    "status": 1,
    "allowComment": true,
    "isTop": false,
    "publishedAt": "2024-01-20T14:30:00Z",
    "createdAt": "2024-01-20T14:30:00Z",
    "updatedAt": "2024-01-20T14:30:00Z",
    "category": {
      "id": 1,
      "name": "技术"
    },
    "tags": [{ "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" }]
  }
}
```

**错误情况**

- 401: 未登录
- 400: 参数校验失败
- 400: 标签数量超过限制

**备注**

- 需要认证（登录）
- `summary` 不填时自动从 `contentMd` 截取前 150 个字符（去除 Markdown 标记）
- `tags` 传标签 ID 数组，标签需预先存在于 `tags` 表中
- `publishedAt` 在 status=1 时自动设为当前时间

---

### 4. 更新文章

**请求**

```
PUT /posts/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**入参**（与创建文章 `ArticlePayload` 一致，各字段均可选）

```json
{
  "title": "string (可选)",
  "contentMd": "string (可选，Markdown 正文)",
  "summary": "string (可选)",
  "coverImage": "string (可选)",
  "categoryId": "number (可选)",
  "tags": [1, 2] (可选，标签 ID 数组；传空数组 [] 表示清空标签)",
  "readingTime": "number (可选)",
  "status": "number (可选，0=草稿 1=已发布 2=待审核)",
  "allowComment": "boolean (可选)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 更新后的完整文章对象，结构同创建文章返回
  }
}
```

**错误情况**

- 401: 未登录
- 403: 只有文章作者或管理员可以编辑
- 404: 文章不存在
- 400: 参数校验失败

---

### 5. 删除文章

**请求**

```
DELETE /posts/{id}
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 403: 只有文章作者或管理员可以删除
- 404: 文章不存在

---

### 6. 文章审核相关

> 文章 `status` 为三态：`0=草稿`，`1=已发布(审核通过)`，`2=待审核`。
> 用户写文章点「提交审核」后 status=2；管理员在后台审核：通过 → status=1（发布），驳回 → status=0（退回草稿）。

#### 6.1 获取待审核文章列表

**请求**

```
GET /posts/pending?page=1&pageSize=10
Authorization: Bearer {accessToken}
```

**Query 参数**

| 参数     | 类型   | 必填 | 默认值 | 说明            |
| -------- | ------ | :--: | ------ | --------------- |
| page     | number |  否  | 1      | 页码，从 1 开始 |
| pageSize | number |  否  | 10     | 每页条数        |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 52,
        "title": "待审核文章标题",
        "userId": 1,
        "authorNickname": "zhangsan",
        "status": 2,
        "createdAt": "2024-01-20T14:30:00Z",
        "tags": [
          { "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**备注**

- 需要认证（登录）
- 分页返回所有 `status=2` 的文章，`data` 为 `PaginatedResponse<ArticleListItem>`

#### 6.2 审核通过（发布）

**请求**

```
PUT /posts/{id}/approve
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**（更新后的完整文章对象，结构与创建文章返回一致）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 52,
    "status": 1,
    "publishedAt": "2024-01-21T09:00:00Z",
    "...": "其余 Article 字段（title/summary/likeCount/viewCount 等）"
  }
}
```

> **字段映射**：`blog_posts` 实体**没有 `published_at` 列**，也无 `comment_count`。`publishedAt` 应在 VO 层派生——`status=1` 时取 `updated_at`（或首次转 1 的时间），否则 `null`；`commentCount` 由 `blog_comments` 聚合。详见末尾「实现差异与字段映射」。

**错误情况**

- 401: 未登录
- 400: 文章不在待审核状态（status ≠ 2）
- 404: 文章不存在

> **实现差异**：后端 `BlogPostController` 当前为 `PUT /api/posts/{id}/publish`（路径为 `/publish` 而非 `/approve`）。前端 `article.ts` 调用的是 `/approve`，需后端补齐别名或在接入层对齐。

#### 6.3 审核驳回（退回草稿）

**请求**

```
PUT /posts/{id}/reject
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**（更新后的完整文章对象，`status` 置为 `0`）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 52,
    "status": 0,
    "publishedAt": null,
    "...": "其余 Article 字段"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 文章不在待审核状态（status ≠ 2）
- 404: 文章不存在

---

### 7. 点赞文章

**请求**

```
POST /posts/{id}/like
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "likeCount": 12
  }
}
```

**错误情况**

- 401: 未登录
- 404: 文章不存在
- 400: 已点过赞

**备注**

- 需要认证
- 同一用户不能重复点赞
- 返回点赞后的最新 `likeCount`，供前端即时更新

---

### 8. 取消点赞文章

**请求**

```
DELETE /posts/{id}/like
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "likeCount": 11
  }
}
```

**错误情况**

- 401: 未登录
- 404: 文章不存在或未点赞

---

## 评论相关接口

### 1. 获取文章评论列表

**请求**

```
GET /posts/{articleId}/comments?page=1&pageSize=20
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |

**Query 参数**
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| page | number | 否 | 当前页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 20 |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 1,
        "articleId": 1,
        "userId": 2,
        "parentId": 0,
        "replyToId": 0,
        "nickname": "李四",
        "email": "lisi@example.com",
        "avatar": "https://ui-avatars.com/api/?name=lisi",
        "content": "很详细的讲解，感谢分享！",
        "likeCount": 5,
        "isAdmin": false,
        "status": 1,
        "createdAt": "2024-01-16T10:30:00Z",
        "replies": [
          {
            "id": 3,
            "articleId": 1,
            "userId": null,
            "parentId": 1,
            "replyToId": 1,
            "nickname": "游客",
            "email": "",
            "avatar": "https://ui-avatars.com/api/?name=guest",
            "content": "@李四 同意，受益匪浅！",
            "likeCount": 1,
            "isAdmin": false,
            "status": 1,
            "createdAt": "2024-01-16T14:00:00Z"
          }
        ],
        "liked": false
      }
    ],
    "total": 12,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

**备注**

- 不需要认证
- 按 `createdAt` 倒序排列
- `replies` 为嵌套的子回复（二级评论）
- 需要认证时返回 `liked` 字段

---

### 2. 发表评论

**请求**

```
POST /posts/{articleId}/comments
Authorization: Bearer {accessToken} (可选，游客也可评论)
Content-Type: application/json
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |

**入参**

```json
{
  "content": "string (1-1000 字符，必填)",
  "nickname": "string (游客评论时必填，登录用户可选)",
  "email": "string (游客评论时必填)",
  "parentId": 0 (父评论ID，0=顶级评论，可选),
  "replyToId": 0 (被回复评论ID，可选)
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 13,
    "articleId": 1,
    "userId": 1,
    "parentId": 0,
    "replyToId": 0,
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://ui-avatars.com/api/?name=张三",
    "content": "我的想法是...",
    "likeCount": 0,
    "isAdmin": false,
    "status": 0,
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 404: 文章不存在
- 400: 评论内容为空或过长
- 400: 游客评论缺少昵称或邮箱
- 400: 文章不允许评论 (`allowComment` = false)

**备注**

- 登录用户自动使用账户信息；游客需提供 `nickname` 和 `email`
- `parentId` 非 0 时表示回复某条评论
- 新评论 `status` 默认为 0（待审核）
- 评论发表成功后文章 `commentCount` +1

---

### 3. 获取单条评论

**请求**

```
GET /posts/{articleId}/comments/{commentId}
Authorization: Bearer {accessToken} (可选；游客可查看已审核评论)
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |
| commentId | number | 评论 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 100,
    "articleId": 52,
    "userId": 1,
    "parentId": 0,
    "replyToId": 0,
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://ui-avatars.com/api/?name=张三",
    "content": "我的想法是...",
    "likeCount": 3,
    "isAdmin": false,
    "status": 1,
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 404: 评论不存在

**备注**

- 用于编辑评论前回填内容，返回完整 `Comment` 对象

---

### 4. 更新评论

**请求**

```
PUT /posts/{articleId}/comments/{commentId}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |
| commentId | number | 评论 ID |

**入参**

```json
{
  "content": "string (新的评论内容)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 100,
    "articleId": 52,
    "content": "修改后的内容...",
    "...": "其余 Comment 字段"
  }
}
```

**错误情况**

- 401: 未登录
- 403: 只有评论作者或管理员可以编辑
- 404: 评论不存在
- 400: 内容为空或过长

**备注**

- 编辑后评论可能回到待审核状态（`status=0`），具体策略由后端决定
- `blog_comments` 实体**没有 `updated_at` 列**，无法记录编辑时间（见末尾「实现差异与字段映射」中的设计建议）

---

### 5. 删除评论

**请求**

```
DELETE /posts/{articleId}/comments/{commentId}
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |
| commentId | number | 评论 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 403: 只有评论作者或管理员可以删除
- 404: 评论不存在

**备注**

- 删除后文章 `commentCount` -1

---

### 6. 点赞评论

**请求**

```
POST /posts/{articleId}/comments/{commentId}/like
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |
| commentId | number | 评论 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "likeCount": 6
  }
}
```

**错误情况**

- 401: 未登录
- 404: 评论不存在
- 400: 已点过赞

**备注**

- 需要认证
- 同一用户不能重复点赞

---

### 7. 取消点赞评论

**请求**

```
DELETE /posts/{articleId}/comments/{commentId}/like
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |
| commentId | number | 评论 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "likeCount": 5
  }
}
```

**错误情况**

- 401: 未登录
- 404: 评论不存在或未点赞

---

## 分类相关接口

分类是文章的一级分类，如"技术"、"生活"、"教程"等。一个分类下可以有多篇文章。

> **结构说明**：分类为**扁平结构**，每个分类都是彼此独立的一级分类，不存在父子层级
> （原 `parentId` / `parent_id` 无限极设计已移除，与标签的定位一致）。
> 分类选择器与管理表格均基于同一份全量列表，无需 `/top` / `/sub/{parentId}` 之类接口。

> **数据源说明（前端）**
> 后端接口就绪前，前端使用 `src/constants/categories.ts` 中的固定分类数据兜底；
> 数据源由 `VITE_USE_MOCK` / `VITE_USE_BACKEND` 两个开关控制（见 `.env.example`）：
>
> - `VITE_USE_MOCK=true`：前端 mock 返回固定数据（开发默认）
> - `VITE_USE_BACKEND=true`：走下方真实后端接口（后端就绪后切换）
>   切换后无需改动前端代码，`GET /categories` 返回结构始终一致。

### 1. 创建分类

**请求**

```
POST /categories
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "name": "string (分类名，1-20 字符，必填，唯一)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "技术",
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 参数校验失败或分类名已存在

**备注**

- 需要认证（登录）

---

### 2. 获取分类列表

分类列表拆为两个独立接口：全量接口供「分类下拉选择器」使用，分页接口供「后台分类表格」使用。**两者响应类型固定、互不影响**——不再通过是否传分页参数切换同一接口的返回形态。

#### 2.1 获取全量分类

**请求**

```
GET /categories
GET /categories?keyword=技术
```

**Query 参数**

| 参数    | 类型   | 必填 | 默认值 | 说明                               |
| ------- | ------ | :--: | ------ | ---------------------------------- |
| keyword | string |  否  | -      | 分类名搜索关键词（模糊匹配），可选 |

**返回**

固定返回 `Category[]` 全量数组：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "技术",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "生活",
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

**备注**

- 不需要认证
- 供分类下拉选择器使用；支持可选 `keyword` 过滤

#### 2.2 分页获取分类

**请求**

```
GET /categories/page?page=1&pageSize=10&keyword=技术
```

**Query 参数**

| 参数     | 类型   | 必填 | 默认值 | 说明                         |
| -------- | ------ | :--: | ------ | ---------------------------- |
| page     | number |  否  | 1      | 页码，从 1 开始              |
| pageSize | number |  否  | 10     | 每页条数                     |
| keyword  | string |  否  | -      | 分类名搜索关键词（模糊匹配） |

**返回**

固定返回 `PaginatedResponse<Category>`：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "技术",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**备注**

- 供后台分类表格使用，固定返回分页结构
- 与 2.1 拆分为独立 endpoint，避免同一接口返回不同数据形态

---

### 3. 获取单个分类

**请求**

```
GET /categories/{id}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 分类 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "技术",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误情况**

- 404: 分类不存在

---

### 4. 更新分类

**请求**

```
PUT /categories/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 分类 ID |

**入参**

```json
{
  "name": "string (新分类名，1-20 字符，可选)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "前端技术",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 参数校验失败或分类名已存在
- 404: 分类不存在

---

### 5. 删除分类

**请求**

```
DELETE /categories/{id}
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 分类 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 404: 分类不存在

---

## 标签相关接口

标签是文章的具体标记，一篇文章可以有多个标签，如"Vue"、"JavaScript"、"教程"等。标签通过「文章-标签」中间表（`article_tags`）维护。

### 1. 创建标签

**请求**

```
POST /tags
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "name": "string (标签名，1-20 字符，必填，唯一)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 11,
    "name": "Vue3",
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 参数校验失败或标签名已存在

**备注**

- 需要认证（登录）
- 前端「写文章」页下拉开启 `allow-create`：用户输入的新标签名会先调用本接口创建、拿到 `id` 后再放入 `POST /posts` 的 `tags` 数组（`POST /posts` 只接受标签 ID，不接受名称），否则新标签会被静默丢弃、文章带上 0 个标签

---

### 2. 获取标签列表

标签列表拆为两个独立接口：全量接口供「标签下拉选择器」使用，分页接口供「后台标签表格」使用。**两者响应类型固定、互不影响**——不再通过是否传分页参数切换同一接口的返回形态。

#### 2.1 获取全量标签

**请求**

```
GET /tags
GET /tags?keyword=Vue
```

**Query 参数**

| 参数    | 类型   | 必填 | 默认值 | 说明                               |
| ------- | ------ | :--: | ------ | ---------------------------------- |
| keyword | string |  否  | -      | 标签名搜索关键词（模糊匹配），可选 |

**返回**

固定返回 `Tag[]` 全量数组：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "Vue",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "TypeScript",
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

**备注**

- 不需要认证
- 供标签下拉选择器使用；支持可选 `keyword` 过滤
- 前端调用方：首页标签筛选（`Home.vue`）、写文章页标签下拉（`WriteArticle.vue`，进页面即拉取，传 `force=true` 保证选项最新）、后台标签管理

#### 2.2 分页获取标签

**请求**

```
GET /tags/page?page=1&pageSize=10&keyword=Vue
```

**Query 参数**

| 参数     | 类型   | 必填 | 默认值 | 说明                         |
| -------- | ------ | :--: | ------ | ---------------------------- |
| page     | number |  否  | 1      | 页码，从 1 开始              |
| pageSize | number |  否  | 10     | 每页条数                     |
| keyword  | string |  否  | -      | 标签名搜索关键词（模糊匹配） |

**返回**

固定返回 `PaginatedResponse<Tag>`：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "Vue",
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "TypeScript",
        "createdAt": "2024-01-02T00:00:00Z"
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**备注**

- 供后台标签表格使用，固定返回分页结构
- 与 2.1 拆分为独立 endpoint，避免同一接口返回不同数据形态

---

### 3. 获取单个标签

**请求**

```
GET /tags/{id}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 标签 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "Vue",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误情况**

- 404: 标签不存在

---

### 4. 更新标签

**请求**

```
PUT /tags/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "name": "string (新标签名，1-20 字符，必填)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "Vue3",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 参数校验失败或标签名已存在
- 404: 标签不存在

---

### 5. 删除标签

**请求**

```
DELETE /tags/{id}
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 标签 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 404: 标签不存在

**备注**

- 删除标签会同步清理「文章-标签」关联，不影响已发布文章

---

## 收藏相关接口

### 1. 收藏文章

**请求**

```
POST /posts/{id}/favorite
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "favCount": 43
  }
}
```

**错误情况**

- 401: 未登录
- 404: 文章不存在
- 400: 已收藏过

---

### 2. 取消收藏文章

**请求**

```
DELETE /posts/{id}/favorite
Authorization: Bearer {accessToken}
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "favCount": 42
  }
}
```

**错误情况**

- 401: 未登录
- 404: 文章不存在或未收藏

---

## 用户相关接口

### 1. 获取当前用户信息

**请求**

```
GET /auth/me
Authorization: Bearer {accessToken}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "username": "zhangsan",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "热爱技术分享的前端开发者",
    "website": "",
    "github": "",
    "weibo": "",
    "status": 1,
    "lastLoginAt": "2024-01-20T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  }
}
```

**错误情况**

- 401: accessToken 无效或已过期

---

### 2. 更新当前用户资料

**请求**

```
PUT /auth/me
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**（均可选，只更新传入的字段）

```json
{
  "nickname": "string (昵称)",
  "avatar": "string (头像URL)",
  "bio": "string (个人简介)",
  "website": "string (个人网站)",
  "github": "string (GitHub主页)",
  "weibo": "string (微博主页)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "username": "zhangsan",
    "nickname": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "bio": "热爱技术分享的前端开发者",
    "website": "https://example.com",
    "github": "https://github.com/zhangsan",
    "weibo": "",
    "status": 1,
    "lastLoginAt": "2024-01-20T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  }
}
```

**错误情况**

- 401: accessToken 无效或已过期
- 400: 参数校验失败（如 URL 格式错误）

**备注**

- 需要认证
- 仅更新传入的非空字段，后端忽略未提供的字段
- 可更新的字段：nickname / avatar / bio / website / github / weibo
- 当 `avatar` 变化时，后端应删除旧的 OSS 头像文件（若旧 URL 指向本 OSS Bucket），避免每次换头像都堆积旧图

---

## 文件上传接口

### 1. 上传头像图片

**请求**

```
POST /upload/avatar
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**入参（multipart 字段）**
| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| file | file | 是 | 图片文件，支持 jpg/jpeg/png/gif/webp/bmp，建议 ≤ 2MB |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "url": "https://{bucket}.oss-{region}.aliyuncs.com/avatar/2026/08/22/uuid.png"
  }
}
```

**错误情况**

- 401: 未登录 / accessToken 无效
- 400: 文件为空、格式不支持、超过大小限制

**备注**

- 后端中转上传：后端接收 `file`，调用 OSS 客户端上传到 `avatar` 目录，返回公开访问 URL
- 前端采用「本地预览 + 保存时才上传」：选文件后先用 `URL.createObjectURL` 本地预览，**不立即调本接口**；用户点「保存」时才真正上传并随 `PUT /auth/me` 提交，避免产生「上传了但没保存」的 OSS 垃圾文件
- 上传接口本身只负责存文件并返回 URL，不修改用户资料

---

## 文章相关接口（补充）

### 9. 获取浏览量排行

**请求**

```
GET /posts/top?limit=10
```

**Query 参数**
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| limit | number | 否 | 返回条数，默认 10，最大 50 |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "title": "Vue 3 Composition API 完全指南",
      "summary": "深入了解 Vue 3 的 Composition API...",
      "coverImage": "https://picsum.photos/800/400?random=1",
      "viewCount": 1250,
      "authorNickname": "张三",
      "authorAvatar": "https://example.com/avatar.jpg"
    }
  ]
}
```

**错误情况**

- 无（公开接口，无需认证）

**备注**

- 不需要认证
- 按 `viewCount` 降序返回前 N 条（默认 10 条）
- 仅返回已发布文章（status=1）
- 用于首页右侧「热门排行」侧栏，仅在「全部」标签时展示
- 返回字段为 `ArticleListItem` 结构（不含 `contentMd` / `contentHtml`）

---

## 前端请求示例

### 使用 axios 发起请求

```typescript
import http from "@/api/client";
import { setAccessToken } from "@/utils/token";

// 登录
async function login() {
  try {
    // 响应拦截器已解包 { code, message, data }，直接拿到 data（AuthResponse）
    const response = await http.post(
      "/auth/login",
      {
        username: "user1",
        password: "password123",
      },
      { withCredentials: true },
    ); // 需带 withCredentials，接收 refreshToken cookie
    const { accessToken, user } = response;
    setAccessToken(accessToken); // 存 localStorage（不记录过期时间）
    console.log("登录成功:", user);
  } catch (error) {
    console.error("登录失败:", error);
  }
}

// 获取文章列表
async function getArticles() {
  try {
    const response = await http.get("/posts", {
      params: {
        page: 1,
        pageSize: 10,
        tag: "Vue",
      },
    });
    console.log(response);
  } catch (error) {
    console.error("获取文章失败:", error);
  }
}

// 创建文章（需要认证）
async function createArticle() {
  try {
    const response = await http.post("/posts", {
      title: "文章标题",
      contentMd: "# 文章内容（Markdown）",
      summary: "可选摘要",
      categoryId: 1,
      tags: [1, 2], // 标签 ID 数组，标签需预先存在
      status: 2, // 2=提交审核
      allowComment: true,
    });
    console.log("文章创建成功:", response);
  } catch (error) {
    console.error("创建失败:", error);
  }
}
```

---

## 核心业务流程

### 1. 登录/注册流程

```
用户输入账号密码 → 调用登录接口 → 获取 accessToken + refreshToken
  → accessToken 存 localStorage（含过期时间）
  → refreshToken 由后端 Set-Cookie 写入 httpOnly cookie
  → 跳转首页
```

### 1.1 无感刷新流程

```
accessToken 过期 → 任意请求返回 401
  → 前端调用 POST /auth/refresh（带 cookie）
  → 后端校验 refreshToken → 签发新 accessToken + 新 refreshToken（rotation）
  → 前端更新 localStorage 中的 accessToken → 重试原请求（用户无感知）
  → 若 refreshToken 也过期 → 前端清除本地状态 → 跳转首页
```

### 2. 浏览文章流程

```
打开首页 → 调用获取文章列表接口 → 显示文章卡片 → 点击标签筛选 → 无限滚动加载更多
```

### 3. 查看文章详情流程

```
点击文章 → 调用获取文章详情接口 → 渲染 Markdown → 加载评论列表
```

### 4. 发表文章流程

```
检查登录状态 → 填写标题、标签、内容 → 调用创建文章接口 → 返回首页
```

### 5. 发表评论流程

```
检查登录状态 → 输入评论内容 → 调用发表评论接口 → 评论展示在列表中
```

---

## 数据库表结构参考

> **数据来源**：后端无独立 `.sql` 建表脚本，全部表结构由 JPA 实体（`com.syt.blog.entity.*`）+ `spring.jpa.hibernate.ddl-auto=update` 自动生成。实体即数据库 schema 的唯一权威来源。以下 22 张表与 23 个实体一一对应（`BlogPostTagId` 仅作复合主键类，不生成表）。
>
> **命名映射**：数据库 `snake_case` ↔ 后端实体字段 `camelCase` ↔ 前端/API `camelCase`。JPA 默认 `CamelCase→snake_case` 命名策略；显式 `@Column(name=...)` 处特殊列名（如 `content_md`、`view_count`）。
>
> **类型映射**：`Integer`→`INT`/`TINYINT`，`Long`→`BIGINT`，`LocalDateTime`→`DATETIME`，`String`→`VARCHAR(n)`/`TEXT`/`LONGTEXT`/`JSON`，`Boolean`→`TINYINT(1)`。时间戳由实体 `@PrePersist`/`@PreUpdate`（手动赋值）或 `@CreatedDate`/`@LastModifiedDate`（仅 `RefreshToken`）维护，**非数据库 `DEFAULT CURRENT_TIMESTAMP`**。
>
> **⚠️ 重要字段差异**：API 返回的 `commentCount`（评论数）、`publishedAt`（发布时间）在 `blog_posts` 实体中**并不存在对应列**，需后端在 VO 层计算/派生（详见文末「实现差异与字段映射」）。

### 一、核心内容表

#### blog_users 表（用户）

```sql
CREATE TABLE blog_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL COMMENT '用户名',
  nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  password VARCHAR(255) NOT NULL COMMENT '加密密码',
  email VARCHAR(100) NOT NULL COMMENT '邮箱（未设唯一约束）',
  avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
  bio VARCHAR(200) DEFAULT NULL COMMENT '个人简介',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=正常, 0=禁用',
  website VARCHAR(255) DEFAULT NULL,
  github VARCHAR(255) DEFAULT NULL,
  weibo VARCHAR(255) DEFAULT NULL,
  last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间',
  created_at DATETIME NOT NULL COMMENT '注册时间（@PrePersist，不可更新）',
  updated_at DATETIME NOT NULL COMMENT '更新时间（@PreUpdate）',
  UNIQUE KEY uk_username (username)
  -- 注意：email 无唯一约束（设计缺陷，见文末）
);
```

#### blog_posts 表（文章）

```sql
CREATE TABLE blog_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '作者ID',
  category_id INT DEFAULT NULL COMMENT '分类ID',
  title VARCHAR(200) NOT NULL,
  content_md LONGTEXT NOT NULL COMMENT 'Markdown原文',
  content_html LONGTEXT DEFAULT NULL COMMENT '渲染HTML（冗余）',
  summary VARCHAR(500) DEFAULT NULL COMMENT '摘要',
  toc_html TEXT DEFAULT NULL COMMENT '自动目录HTML',
  cover_image VARCHAR(255) DEFAULT NULL COMMENT '封面图URL',
  view_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览量',
  like_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数（冗余计数）',
  fav_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '收藏数（冗余计数）',
  reading_time TINYINT UNSIGNED DEFAULT 0 COMMENT '阅读时长(分钟)',
  status TINYINT NOT NULL DEFAULT 2 COMMENT '0=草稿,1=已发布,2=待审核（列默认2，但@PrePersist置1）',
  is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=置顶,0=普通',
  allow_comment TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=允许评论,0=禁止',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间'
  -- 注意：无 comment_count、无 published_at 列（API 需派生，见文末）
  -- 注意：无 user_id/category_id 外键与索引（设计缺陷，见文末）
);
```

#### blog_categories 表（分类，扁平结构无层级）

```sql
CREATE TABLE blog_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '分类名（未设唯一约束）',
  -- parent_id 列已从实体移除，因 ddl-auto=update 不会自动删列，旧库需手动 DROP
  -- sort_order 列已从实体移除，因 ddl-auto=update 不会自动删列，旧库需手动 DROP
  created_at DATETIME NOT NULL
  -- 注意：无 updated_at；name 无唯一约束
);
```

#### blog_tags 表（标签）

```sql
CREATE TABLE blog_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL COMMENT '标签名（唯一）',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_name (name)
);
```

#### blog_post_tags 表（文章-标签关联，复合主键）

```sql
CREATE TABLE blog_post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id)
  -- 注意：无代理自增 id（@IdClass 复合主键）；无 created_at；
  --       无外键约束（JPA @IdClass 不自动生成 FK，孤儿记录风险，见文末）
);
```

### 二、评论表

#### blog_comments 表（评论，支持无限极盖楼、游客/会员双模式）

```sql
CREATE TABLE blog_comments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID（Long→BIGINT）',
  post_id INT NOT NULL COMMENT '文章ID（实体字段 postId；API 字段 articleId，需VO映射）',
  parent_id BIGINT UNSIGNED DEFAULT 0 COMMENT '父评论ID,0=对文章直接评论',
  reply_to_id BIGINT UNSIGNED DEFAULT 0 COMMENT '被回复评论ID,0=回复父评论',
  user_id INT DEFAULT NULL COMMENT '用户ID,NULL=游客',
  nickname VARCHAR(50) NOT NULL COMMENT '评论者昵称',
  email VARCHAR(100) DEFAULT NULL COMMENT '评论者邮箱',
  avatar VARCHAR(255) DEFAULT NULL COMMENT '评论者头像',
  content TEXT NOT NULL COMMENT '评论正文',
  is_admin TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=博主/管理员回复,0=否',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=待审核/默认不显示,1=通过/显示（仅二态，无拒绝态）',
  created_at DATETIME NOT NULL
  -- 注意：无 like_count 列（需从 blog_comment_likes 聚合计算）；
  --       无 updated_at（但 API 存在 PUT 更新评论，见文末）
);
```

### 三、点赞 / 收藏表（含游客 IP 防重）

#### blog_post_likes 表（文章点赞）

```sql
CREATE TABLE blog_post_likes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '注册用户ID（游客为NULL）',
  user_ip VARCHAR(45) DEFAULT NULL COMMENT '游客IP去重',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_post_user (post_id, user_id),
  UNIQUE KEY uk_post_ip (post_id, user_ip)
  -- 注意：双唯一约束同时支持登录用户与游客IP防重；
  --       但 API 文档要求点赞须登录（401），与游客防重设计矛盾，见文末
);
```

#### blog_comment_likes 表（评论点赞）

```sql
CREATE TABLE blog_comment_likes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  comment_id BIGINT NOT NULL,
  user_id INT DEFAULT NULL,
  user_ip VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_comment_user (comment_id, user_id),
  UNIQUE KEY uk_comment_ip (comment_id, user_ip)
);
```

#### blog_post_favorites 表（文章收藏，仅登录用户）

```sql
CREATE TABLE blog_post_favorites (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL COMMENT '收藏仅限登录用户，无 user_ip',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_post_user (post_id, user_id)
);
```

### 四、文章版本与定时发布

#### blog_post_versions 表（文章版本历史）

```sql
CREATE TABLE blog_post_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  version INT NOT NULL COMMENT '版本号,从1递增',
  title VARCHAR(200) NOT NULL,
  content_md LONGTEXT NOT NULL,
  content_html LONGTEXT DEFAULT NULL,
  change_note VARCHAR(200) DEFAULT NULL COMMENT '版本变更说明',
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_post_version (post_id, version)
);
```

#### blog_scheduled_posts 表（定时发布）

```sql
CREATE TABLE blog_scheduled_posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL COMMENT '草稿文章ID（唯一）',
  scheduled_at DATETIME NOT NULL COMMENT '计划发布时间',
  status TINYINT NOT NULL DEFAULT 0 COMMENT '0=待发布,1=已发布,2=已取消',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_post (post_id)
);
```

### 五、认证令牌

#### blog_refresh_tokens 表（刷新令牌）

```sql
CREATE TABLE blog_refresh_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  device_id VARCHAR(100) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  ip VARCHAR(45) DEFAULT NULL,
  expires_at DATETIME NOT NULL COMMENT 'java.util.Date（与全项目 LocalDateTime 不一致，见文末）',
  revoked TINYINT(1) DEFAULT 0 COMMENT '是否已吊销',
  created_at DATETIME DEFAULT NULL COMMENT '@CreatedDate',
  updated_at DATETIME DEFAULT NULL COMMENT '@LastModifiedDate'
  -- 注意：token 无唯一索引/普通索引（rotation 按 token 查询需全表扫描，见文末）
);
```

### 六、友链 / 通知

#### blog_links 表（友情链接）

```sql
CREATE TABLE blog_links (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  url VARCHAR(255) NOT NULL,
  logo VARCHAR(255) DEFAULT NULL,
  description VARCHAR(200) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0 COMMENT '数字越大越靠前',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=显示,0=隐藏',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

#### blog_notifications 表（站内通知）

```sql
CREATE TABLE blog_notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '接收用户ID',
  type VARCHAR(30) NOT NULL COMMENT 'comment_reply/post_like/comment_like/system',
  title VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL,
  link VARCHAR(255) DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=未读,1=已读',
  created_at DATETIME NOT NULL
);
```

### 七、日志统计

#### blog_login_logs 表（登录日志）

```sql
CREATE TABLE blog_login_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL COMMENT '冗余用户名',
  login_type TINYINT NOT NULL DEFAULT 1 COMMENT '1=账密,2=手机,3=第三方',
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=成功,0=失败',
  fail_reason VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL
);
```

#### blog_operation_logs 表（操作审计日志）

```sql
CREATE TABLE blog_operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL,
  username VARCHAR(50) DEFAULT NULL COMMENT '冗余用户名',
  action VARCHAR(50) NOT NULL COMMENT '如 create_post/delete_comment',
  target_type VARCHAR(30) NOT NULL COMMENT 'post/comment/user/category/tag',
  target_id VARCHAR(50) NOT NULL COMMENT '对象ID（字符串兼容）',
  detail JSON DEFAULT NULL COMMENT '变更前后JSON',
  ip VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL
);
```

#### blog_visit_logs 表（访问日志）

```sql
CREATE TABLE blog_visit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id INT DEFAULT NULL COMMENT '文章页则记录',
  user_id INT DEFAULT NULL,
  user_ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  referer VARCHAR(255) DEFAULT NULL,
  visit_url VARCHAR(255) NOT NULL,
  stay_duration INT UNSIGNED DEFAULT 0 COMMENT '停留秒数',
  created_at DATETIME NOT NULL
);
```

#### blog_search_keywords 表（搜索热词）

```sql
CREATE TABLE blog_search_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword VARCHAR(100) NOT NULL COMMENT '关键词（唯一）',
  search_count INT UNSIGNED NOT NULL DEFAULT 1,
  last_search_at DATETIME NOT NULL,
  UNIQUE KEY uk_keyword (keyword)
  -- 注意：无 created_at（首次即 last_search_at）
);
```

#### blog_statistics 表（站点统计缓存）

```sql
CREATE TABLE blog_statistics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  stat_key VARCHAR(50) NOT NULL COMMENT '如 total_posts/total_comments',
  stat_value BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_stat_key (stat_key)
  -- 注意：无 created_at
);
```

### 八、用户设置

#### blog_user_settings 表（用户个性化配置）

```sql
CREATE TABLE blog_user_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '唯一',
  theme VARCHAR(20) DEFAULT 'default',
  language VARCHAR(10) DEFAULT 'zh-CN',
  comment_notify TINYINT(1) NOT NULL DEFAULT 1 COMMENT '评论回复通知',
  like_notify TINYINT(1) NOT NULL DEFAULT 1 COMMENT '点赞通知',
  email_notify TINYINT(1) NOT NULL DEFAULT 1 COMMENT '邮件通知',
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_user (user_id)
  -- 注意：无 created_at
);
```

### 九、AI 对话

#### blog_ai_sessions 表（AI 会话窗口）

```sql
CREATE TABLE blog_ai_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT DEFAULT NULL COMMENT '注册用户',
  user_ip VARCHAR(45) NOT NULL COMMENT '游客标识',
  title VARCHAR(150) NOT NULL DEFAULT '新的对话',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);
```

#### blog_ai_messages 表（AI 消息流水）

```sql
CREATE TABLE blog_ai_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  session_id BIGINT NOT NULL,
  role VARCHAR(20) NOT NULL COMMENT 'user=用户提问,assistant=AI回复',
  content TEXT NOT NULL COMMENT 'Markdown',
  tokens INT UNSIGNED DEFAULT 0 COMMENT '消耗Token数',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=成功,0=生成中,2=失败/违规',
  created_at DATETIME NOT NULL
);
```

---

## 实现差异与字段映射

> 本节记录**后端实体/控制器现状**与**本文档（前端契约）**之间的差异，供前后端对齐时参照。文档保留前端契约作为目标设计；后端按下列条目补齐即可对接，无需改动前端类型。

### 1. 命名映射：`post` ↔ `article`

文档与前端统一用 **`article` / `articleId`** 作为对外命名，而后端实体/表用 **`post` / `post_id`**。映射关系：

| 前端/文档字段                    | 后端实体字段         | DB 列                   |
| -------------------------------- | -------------------- | ----------------------- |
| `articleId`（Comment.articleId） | `BlogComment.postId` | `blog_comments.post_id` |
| `articleId`（路径参数）          | `BlogPost.id`        | `blog_posts.id`         |

**对齐方式**：后端在 VO/DTO 层做映射（`postId`→`articleId`），或前端兼容 `postId`。推荐前者，保持对外 API 命名稳定。

### 2. 派生字段（实体中不存在，需 VO 层计算）

`blog_posts` 实体**没有**以下列，但前端 `Article` / `ArticleListItem` 类型需要，必须在 VO 层派生：

| 前端字段                          | 来源                                                                  |
| --------------------------------- | --------------------------------------------------------------------- |
| `commentCount`                    | 聚合 `blog_comments` 中 `post_id` 对应、`status=1` 的评论数           |
| `publishedAt`                     | `status=1` 时取 `updated_at`（或首次转 1 的时间），否则 `null`        |
| `liked` / `favorited`             | 查 `blog_post_likes` / `blog_post_favorites` 当前用户/IP 是否存在记录 |
| `authorNickname` / `authorAvatar` | 关联 `blog_users.nickname` / `blog_users.avatar`                      |
| `category`                        | 关联 `blog_categories`（仅 id+name）                                  |
| `tags`                            | 关联 `blog_post_tags` + `blog_tags`                                   |

> 当前 `BlogPostController` 直接返回 `BlogPost` 实体，**不含**上述派生字段。需新增 `PostVO` 封装后再返回。

### 3. 类型映射：`boolean` ↔ `TINYINT(1)`

| 前端类型（boolean）              | DB 列（TINYINT(1)）           |
| -------------------------------- | ----------------------------- |
| `allowComment`                   | `blog_posts.allow_comment`    |
| `isTop`                          | `blog_posts.is_top`           |
| `isAdmin`（Comment）             | `blog_comments.is_admin`      |
| `liked` / `favorited`（Article） | 派生，见上                    |
| `revoked`（后端 RefreshToken）   | `blog_refresh_tokens.revoked` |

JPA 默认 `Boolean` ↔ `TINYINT(1)`；前端需确保收到 `0/1` 时按布尔处理（`client.ts` 不自动转换，建议后端用 `@TableField`/VO 显式输出 `boolean`）。

### 4. 时间字段格式

- 实体多用 `LocalDateTime`（`@PrePersist`/`@PreUpdate` 手动赋值），DB 列为 `DATETIME`。
- **`RefreshToken` 用 `java.util.Date`**（配合 `@CreatedDate`/`@LastModifiedDate` + `AuditingEntityListener`），与其余实体不一致。
- **未发现全局 Jackson `LocalDateTime` 序列化配置**——默认输出可能为 `[2024,1,20,10,30,0]` 数组或 `2024-01-20T10:30:00` 形式，**前端期望 ISO-8601 字符串**（如 `2024-01-20T10:30:00Z`）。
- **建议**：后端统一配置 `jackson-datatype-jsr310` + `spring.jackson.serialization.write-dates-as-timestamps=false`，或加 `@JsonFormat(pattern="yyyy-MM-dd'T'HH:mm:ss", timezone="GMT+8")`。

### 5. 控制器路径与文档的差异（按控制器列举）

**BlogPostController（`/api/posts`）现状 vs 文档：**

| 文档路径                                           | 后端现状                                                                                | 差异说明                                                                                          |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GET /posts?categoryId&tagId&keyword`（列表）      | `GET /posts/published`、`GET /posts/category/{categoryId}`、`GET /posts/search?keyword` | 后端拆成多接口、**不支持组合筛选与分页**；前端 `getArticles` 期望单接口不分页返回全量             |
| `GET /posts/{id}`（详情含 category/tags/liked 等） | `GET /posts/{id}` 返回裸 `BlogPost`                                                     | 缺派生字段（见 §2）；**浏览量非自动+1**，需单独 `PUT /posts/{id}/view`                            |
| `POST /posts`（入参含 `tags:number[]`）            | `POST /posts` 入参是裸 `BlogPost`                                                       | **入参无 `tags` 字段**，标签需另存 `blog_post_tags`；`status` 默认 `@PrePersist` 置 1（绕过审核） |
| `PUT /posts/{id}/approve`                          | `PUT /posts/{id}/publish`                                                               | 路径不同；且**无 `/reject` 接口**                                                                 |
| `GET /posts/pending`（待审核分页）                 | 无                                                                                      | 未实现                                                                                            |
| `POST/DELETE /posts/{id}/like`、收藏接口           | 无                                                                                      | 未实现控制器                                                                                      |

**BlogUserController（`/api/auth`）现状 vs 文档：**

| 文档路径                                                                    | 后端现状                                                                 | 差异说明                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `POST /auth/refresh` 返回 `{accessToken, user}`                             | 仅返回 `{accessToken}`                                                   | 文档已对齐为只返回 `accessToken`；前端刷新分支不应依赖 `user`                               |
| `POST /auth/logout` 返回 `data:null`                                        | 返回 `data:"退出登录成功"`（字符串）                                     | 文档已对齐                                                                                  |
| `GET/PUT /auth/me` 返回 `User`（含 status/lastLoginAt/createdAt/updatedAt） | `UserVO` 仅含 id/username/nickname/email/avatar/bio/website/github/weibo | **`UserVO` 缺 status/lastLoginAt/createdAt/updatedAt**，前端 `User` 类型需要，后端需扩展 VO |
| `POST /auth/register` 入参含 avatar/nickname                                | `RegisterDTO` 仅 username/password/email                                 | 后端不支持注册时传 avatar/nickname                                                          |

**BlogTagController（`/api/tags`）现状 vs 文档：**

| 文档路径                        | 后端现状                                                                                     | 差异说明                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DELETE /tags/{id}`             | `@DeleteMapping("/{id}")`（已修复）                                                          | 原路径重复 bug（双重 `tags`）**已修复**，现实际路径为 `/api/tags/{id}`                                                                         |
| `GET /tags` 返回 `Tag[]` 或分页 | 已拆为 `GET /tags`→`Result<List<BlogTag>>` + `GET /tags/page`→`Result<PageResult>`（已修复） | 原 `Result<Object>` 分支返回不稳定，**已修复**：全量接口固定返回数组，分页接口固定返回 `PageResult`。前端 `getTagsPaged` URL 已改 `/tags/page` |
| `PUT /tags/{id}` 返回 `Tag`     | 返回 `TagResponse{id:int, name:String, createdAt:String}`                                    | `createdAt` 为 `String` 而非日期类型，且**无 id 之外的创建时间精度保证**                                                                       |

**BlogCategoryController（`/api/categories`）现状 vs 文档：**

| 文档路径                                   | 后端现状                                                                                                                                                          | 差异说明                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /categories` 返回 `Category[]` 或分页 | 已拆为 `GET /categories`→`Result<List<BlogCategory>>` + `GET /categories/page`→`Result<PageResult>`（已修复）                                                     | 与标签同步修复：原 `Result<Object>` 分支返回不稳定，**已修复**。前端 `getCategoriesPaged` URL 已改 `/categories/page` |
| 分类层级（`parentId` / `parent_id`）       | **已移除**：`BlogCategory`、`CategoryDTO` 不再含 `parentId`；`findByParentId`、`getTopCategories`、`getSubCategories`、`GET /top`、`GET /sub/{parentId}` 全部删除 | 分类改为扁平结构，每个分类都是独立的一级分类，与标签定位一致；前端 `AdminCategories` 的「父分类」选择器同步删除       |
| 删除分类的子分类校验                       | 已移除：`DELETE /categories/{id}` 不再检查 `parentId === id`                                                                                                      | 无层级后不存在子分类，删除即删；mock 层同步删除该校验                                                                 |

### 6. 缺失的控制器（文档有、后端无）

以下文档接口在后端**尚无控制器实现**，需补齐：

- 评论：`GET/POST /posts/{articleId}/comments`、`GET/PUT/DELETE /posts/{articleId}/comments/{commentId}`、`POST/DELETE .../like`
- 文章点赞：`POST/DELETE /posts/{id}/like`
- 文章收藏：`POST/DELETE /posts/{id}/favorite`
- 待审核列表：`GET /posts/pending`、审核 `PUT /posts/{id}/reject`
- 浏览量排行：`GET /posts/top`

### 7. 创建文章的标签保存

`POST /posts` 入参（裸 `BlogPost`）不含 `tags`。前端 `ArticlePayload.tags: number[]` 需后端：

- 方案 A（推荐）：新增 `PostCreateDTO{...,tags:number[]}`，service 内先存 `BlogPost` 再批量插 `blog_post_tags`；
- 方案 B：前端创建文章后单独调标签绑定接口（文档未定义，不推荐）。

### 8. 状态默认值矛盾

`BlogPost` 实体 `status` 列 `DEFAULT 2`（待审核），但 `@PrePersist` 强制置 `1`（已发布）。**实际新建文章始终是「已发布」，绕过审核**。应统一：要么去掉 `@PrePersist` 的覆盖让默认值生效，要么前端显式传 `status`（文档已要求传 `status`）。

---

## 注意事项

1. **Token 管理**：accessToken 存 localStorage，refreshToken 存 httpOnly cookie；accessToken 过期后由前端自动无感刷新（后端返回 HTTP 401 + `code: 401001` 触发）
2. **错误处理**：所有接口返回统一的错误格式，前端需判断 code 字段
3. **CORS**：因前端使用 `withCredentials: true`，后端 CORS 的 `Access-Control-Allow-Origin` 必须写死前端域名（不能用 `*`），并设置 `Access-Control-Allow-Credentials: true`
4. **速率限制**：建议后端对登录、刷新、发表评论等接口设置速率限制
5. **输入校验**：后端需对所有输入进行校验和过滤
6. **SQL 注入防护**：使用参数化查询防止 SQL 注入
7. **XSS 防护**：对用户输入的内容进行 HTML 转义
