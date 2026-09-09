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
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "error message",
  "data": null
}
```

### 错误码说明

| 错误码 | 说明                                    | 处理方式                                   |
| ------ | --------------------------------------- | ------------------------------------------ |
| 0      | 成功                                    | -                                          |
| 400    | 请求参数错误                            | 客户端检查参数                             |
| 401    | 未授权（需要登录）                      | 跳转到登录页                               |
| 401001 | accessToken 过期（HTTP 401 + 此业务码） | 前端自动刷新 accessToken；刷新失败则跳登录 |
| 403    | 禁止访问                                | 提示权限不足                               |
| 404    | 资源不存在                              | 提示资源不存在                             |
| 500    | 服务器内部错误                          | 提示稍后重试                               |

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
  "code": 0,
  "message": "success",
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
      "lastLoginAt": "2024-01-20 10:30:00",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
  "data": null
}
```

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
  "code": 0,
  "message": "success",
  "data": {
    "accessToken": "string (新的 JWT，15 分钟)",
    "user": {
      "id": 1,
      "username": "user1",
      "nickname": "张三",
      "email": "user1@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "bio": "",
      "website": "",
      "github": "",
      "weibo": "",
      "status": 1,
      "lastLoginAt": "2024-01-20 10:30:00",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-20T10:30:00Z"
    }
  }
}
```

**错误情况**

- 401: refreshToken 无效或已过期

**备注**

- **rotation 策略**：每次刷新都会作废旧 refreshToken 并签发新 refreshToken（新 cookie 覆盖旧 cookie）
- 前端在任意请求收到 401 时自动调用此接口，成功后重试原请求；多个并发 401 只触发一次刷新（请求队列合并）
- 刷新也失败（refreshToken 过期）时，前端清除本地状态并跳回首页

---

## 文章相关接口

### 1. 获取文章列表

**请求**

```
GET /posts?page=1&pageSize=10&categoryId=1&tagId=1&keyword=vue
```

**Query 参数**
| 参数 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| page | number | 否 | 当前页码，默认 1 |
| pageSize | number | 否 | 每页数量，默认 10 |
| categoryId | number | 否 | 分类ID过滤（按分类筛选文章） |
| tagId | number | 否 | 标签ID过滤（多标签模型，可按单个标签筛选） |
| keyword | string | 否 | 标题/内容关键词搜索 |

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
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
        "tags": [
          { "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" }
        ],
        "authorNickname": "张三",
        "authorAvatar": "https://example.com/avatar.jpg"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

**备注**

- 不需要认证即可访问
- 返回已发布的文章（status=1）
- 按 `publishedAt` 倒序排列
- 列表接口不返回 `contentMd` 和 `contentHtml` 完整内容，仅返回 `summary`

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
  "code": 0,
  "message": "success",
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
  "status": 0 (0=草稿, 1=已发布(审核通过), 2=待审核，可选，默认1),
  "allowComment": true (是否允许评论，可选，默认true)
}
```

**返回**

```json
{
  "code": 0,
  "message": "success",
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

**入参**

```json
{
  "title": "string (可选)",
  "content": "string (可选)",
  "tags": ["string"] (可选)
}
```

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 更新后的文章对象
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
  "code": 0,
  "message": "success",
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

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|-------|------|
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 10 | 每页条数 |

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "data": [
      {
        "id": 52,
        "title": "待审核文章标题",
        "userId": 1,
        "authorNickname": "zhangsan",
        "status": 2,
        "createdAt": "2024-01-20T14:30:00Z",
        "tags": [{ "id": 1, "name": "Vue", "createdAt": "2024-01-01T00:00:00Z" }]
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

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 52,
    "status": 1,
    "publishedAt": "2024-01-21T09:00:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 文章不在待审核状态（status ≠ 2）
- 404: 文章不存在

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

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 52,
    "status": 0
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
  "code": 0,
  "message": "success",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 404: 文章不存在
- 400: 已点过赞

**备注**

- 需要认证
- 同一用户不能重复点赞

---

### 7. 取消点赞文章

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
  "code": 0,
  "message": "success",
  "data": null
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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

### 3. 删除评论

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
  "code": 0,
  "message": "success",
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

### 4. 点赞评论

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
  "code": 0,
  "message": "success",
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

### 5. 取消点赞评论

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
  "code": 0,
  "message": "success",
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
  "name": "string (分类名，1-20 字符，必填，唯一)",
  "description": "string (分类描述，可选)",
  "icon": "string (分类图标URL，可选)"
}
```

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "技术",
    "description": "技术相关文章",
    "icon": null,
    "articleCount": 0,
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

### 2. 获取所有分类

**请求**

```
GET /categories
GET /categories?page=1&pageSize=10
```

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|-------|------|
| page | number | 否 | - | 页码，从 1 开始。传入后启用分页 |
| pageSize | number | 否 | - | 每页条数，启用分页时生效 |

**返回**

响应形态由是否传入分页参数决定：

- **不传 `page`/`pageSize`**：返回全量数组（分类下拉选择器使用，向后兼容）。

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "技术",
      "description": "技术相关文章",
      "articleCount": 15,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "生活",
      "description": "生活感悟分享",
      "articleCount": 8,
      "createdAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

- **传入 `page`/`pageSize`**：返回 `PaginatedResponse<Category>`（管理后台分类表格使用）。

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "name": "技术",
        "description": "技术相关文章",
        "articleCount": 15,
        "createdAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": 2,
        "name": "生活",
        "description": "生活感悟分享",
        "articleCount": 8,
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

- 该接口同时服务于「分类下拉选择器」（需全量数组）与「后台分类表格」（需分页），通过是否传分页参数区分响应形态。

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
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "技术",
    "description": "技术相关文章",
    "articleCount": 15,
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
  "name": "string (新分类名，1-20 字符，可选)",
  "description": "string (新描述，可选)",
  "icon": "string (新图标URL，可选)"
}
```

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "前端技术",
    "description": "前端开发相关技术",
    "articleCount": 15,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
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
  "code": 0,
  "message": "success",
  "data": null
}
```

**错误情况**

- 401: 未登录
- 404: 分类不存在
- 400: 该分类下还有文章，无法删除

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
  "code": 0,
  "message": "success",
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

---

### 2. 获取所有标签

**请求**

```
GET /tags
GET /tags?page=1&pageSize=10&keyword=Vue
```

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|:----:|-------|------|
| keyword | string | 否 | - | 标签名搜索关键词（模糊匹配，仅在分页形态下生效） |
| page | number | 否 | - | 页码，从 1 开始。传入后启用分页 |
| pageSize | number | 否 | - | 每页条数，启用分页时生效 |

**返回**

响应形态由是否传入分页参数决定：

- **不传 `page`/`pageSize`**：返回全量数组（标签下拉选择器使用，向后兼容）。

```json
{
  "code": 0,
  "message": "success",
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

- **传入 `page`/`pageSize`**：返回 `PaginatedResponse<Tag>`（管理后台标签表格使用，支持 `keyword` 过滤）。

```json
{
  "code": 0,
  "message": "success",
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

- 不需要认证
- 该接口同时服务于「标签下拉选择器」（需全量数组）与「后台标签表格」（需分页 + 搜索），通过是否传分页参数区分响应形态

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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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
  "code": 0,
  "message": "success",
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

### 8. 取消点赞文章

**请求**

```
DELETE /posts/{id}/like
Authorization: Bearer {accessToken}
```

(同点赞接口的路径，使用 DELETE 方法)

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**返回**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "likeCount": 88
  }
}
```

---

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
  "code": 0,
  "message": "success",
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
      content: "# 文章内容",
      tags: ["Vue", "Frontend"],
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

> **命名规范**：数据库使用 `snake_case`，前后端 API 交互统一使用 `camelCase`（后端 JPA 负责二者映射，`@Column(name = "view_count")` ↔ `viewCount`）。以下为完整版表结构。

### users 表

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  bio VARCHAR(500) DEFAULT NULL COMMENT '个人简介',
  website VARCHAR(255) DEFAULT NULL COMMENT '个人网站',
  github VARCHAR(255) DEFAULT NULL COMMENT 'GitHub主页',
  weibo VARCHAR(255) DEFAULT NULL COMMENT '微博主页',
  status TINYINT DEFAULT 1 COMMENT '状态: 0=禁用, 1=正常',
  last_login_at TIMESTAMP NULL DEFAULT NULL COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email)
);
```

### articles 表

```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '作者用户ID',
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) DEFAULT NULL COMMENT '文章摘要',
  content_md LONGTEXT NOT NULL COMMENT 'Markdown原始内容',
  content_html LONGTEXT DEFAULT NULL COMMENT '渲染后的HTML',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图URL',
  reading_time INT DEFAULT 0 COMMENT '预估阅读时间(分钟)',
  view_count INT DEFAULT 0 COMMENT '浏览次数',
  like_count INT DEFAULT 0 COMMENT '点赞数',
  fav_count INT DEFAULT 0 COMMENT '收藏数',
  comment_count INT DEFAULT 0 COMMENT '评论数',
  status TINYINT DEFAULT 1 COMMENT '状态: 0=草稿, 1=已发布(审核通过), 2=待审核',
  allow_comment TINYINT DEFAULT 1 COMMENT '是否允许评论: 0=否, 1=是',
  is_top TINYINT DEFAULT 0 COMMENT '是否置顶: 0=否, 1=是',
  published_at TIMESTAMP NULL DEFAULT NULL COMMENT '发布时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_published_at (published_at),
  INDEX idx_status (status),
  FULLTEXT INDEX ft_title_content (title, content_md)
);
```

### tags 表

```sql
CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### article_tags 表

```sql
CREATE TABLE article_tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  tag_id INT NOT NULL,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE KEY uk_article_tag (article_id, tag_id)
);
```

### comments 表

```sql
CREATE TABLE comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  user_id INT DEFAULT NULL COMMENT '用户ID(NULL=游客)',
  parent_id INT DEFAULT 0 COMMENT '父评论ID(0=顶级评论)',
  reply_to_id INT DEFAULT 0 COMMENT '被回复评论ID',
  nickname VARCHAR(50) NOT NULL COMMENT '评论者昵称',
  email VARCHAR(100) DEFAULT NULL COMMENT '评论者邮箱',
  avatar VARCHAR(500) DEFAULT NULL COMMENT '评论者头像',
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  is_admin TINYINT DEFAULT 0 COMMENT '是否博主: 0=否, 1=是',
  status TINYINT DEFAULT 0 COMMENT '状态: 0=待审核, 1=已通过, 2=已拒绝',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id)
);
```

### article_likes 表（文章点赞记录）

```sql
CREATE TABLE article_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_article_user (article_id, user_id)
);
```

### article_favorites 表（文章收藏记录）

```sql
CREATE TABLE article_favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  article_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_article_user (article_id, user_id)
);
```

### comment_likes 表（评论点赞记录）

```sql
CREATE TABLE comment_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uk_comment_user (comment_id, user_id)
);
```

---

## 注意事项

1. **Token 管理**：accessToken 存 localStorage，refreshToken 存 httpOnly cookie；accessToken 过期后由前端自动无感刷新（后端返回 HTTP 401 + `code: 401001` 触发）
2. **错误处理**：所有接口返回统一的错误格式，前端需判断 code 字段
3. **CORS**：因前端使用 `withCredentials: true`，后端 CORS 的 `Access-Control-Allow-Origin` 必须写死前端域名（不能用 `*`），并设置 `Access-Control-Allow-Credentials: true`
4. **速率限制**：建议后端对登录、刷新、发表评论等接口设置速率限制
5. **输入校验**：后端需对所有输入进行校验和过滤
6. **SQL 注入防护**：使用参数化查询防止 SQL 注入
7. **XSS 防护**：对用户输入的内容进行 HTML 转义
