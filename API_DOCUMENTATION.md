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
| 403001 | 权限不足（非管理员访问管理接口）              | 提示无权限；前端隐藏管理入口               |
| 403002 | 账号已被禁用                                  | 提示账号已禁用并退出登录                   |
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
  "password": "string (6-32 字符)",
  "force": false
}
```

> `force`（可选，默认 false）：该账号已有活跃会话时是否**强制下线其他设备并登录**。见「5. 单会话登录」。

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
      "role": "USER",
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
- 403: 账号已被禁用（业务码 403002）
- 409: 账号已在其他设备登录（业务码 409001，`force=true` 时跳过此检查；见「5. 单会话登录」）

**备注**

- 登录成功后，后端通过 `Set-Cookie` 写入 `refreshToken`（httpOnly，7 天）
- 前端将 `accessToken` 保存至 `localStorage`（不记录过期时间，靠 401001 被动刷新）
- 后续所有需要认证的请求都需在 `Authorization` 头中带上 `Bearer ${accessToken}`
- accessToken 过期后，前端自动调用 `POST /auth/refresh` 无感刷新
- **单会话约束**：该账号已有活跃会话（存在未吊销且未过期的 refreshToken）时，登录返回 409001 拒绝；前端可提示「已在其他设备登录」并提供「强制下线并登录」（重发请求带 `force: true`）

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

### 5. 单会话登录（拒绝重复登录 + token_version 立即失效）

> 目标：同一账号**同时只允许一个活跃会话**。核心是两件事——
> ① 登录时若已有活跃会话则**拒绝**（除非显式 `force: true` 强制下线旧会话）；
> ② 任何会话被终结（登出 / 改密 / 强制下线）时，**旧的 access token 立即失效**，
>    不依赖 15 分钟自然过期（access token 是无状态 JWT，单吊销 refresh token 做不到这一点）。

**机制：`blog_users.token_version` 会话版本号**

- `blog_users` 新增 `token_version BIGINT NOT NULL DEFAULT 0`（见「数据库表结构 · 五、认证令牌」）
- access token 签发时携带当前版本（JWT claim `tv`）
- `JwtAuthenticationFilter` 每请求已 `findById` 拉取用户行，**顺带比对** `user.tokenVersion` 与 token 的 `tv`：
  - 相等 → 正常放行（现在就有每请求查库，比对零额外查询）
  - 不相等 → 按 401 处理（`fail(...)` 记原因，交给 EntryPoint），前端走 401→refresh→refresh 被吊销→强制登出链路
- **版本 +1 的时机**：① 每次登录成功（含 `force` 强制登录）；② 登出；③ 修改密码。**`/refresh` 不 +1**——它是同会话续期，自己的浏览器正常刷新不能把自己的 access token 打死

**登录校验（改 `BlogUserService.login`）**

```
登录 → 校验账号密码 → 校验 status → 
  force==false 且存在活跃会话（SELECT EXISTS(refresh_tokens WHERE user_id=? AND revoked=0 AND expires_at>now)）
    → 抛 BusinessException(409001, "账号已在其他设备登录")
  force==true  → revokeAllByUserId(userId)（吊销全部旧 refresh token）
  token_version + 1 → 签发携带新版本的 access/refresh token → 保存 refresh token 行 → Set-Cookie
```

**各端点改动汇总**

| 端点 | 改动 |
|---|---|
| `POST /auth/login` | 加活跃会话校验（409001）；`force=true` 时先 `revokeAllByUserId`；登录成功 bump `token_version` |
| `POST /auth/refresh` | 不 bump 版本；签发新 access token 时**带上用户当前 `token_version`**（需查一次用户行） |
| `POST /auth/logout` | 吊销 refresh token（已有）+ bump `token_version`（旧 access token 立即失效） |
| `PUT /auth/me/password` | `revokeAllByUserId`（已有）+ bump `token_version` |
| `JwtAuthenticationFilter` | `findById` 后比对 `tokenVersion` 与 claim `tv`，不匹配 → 401 |

**前端接入约定**

- 登录失败 `code===409001`：`LoginModal` 提示「该账号已在其他设备登录」，提供「强制下线其他设备并登录」——用 `force: true` 重发登录请求（`api/auth.ts` 的 `login` 增加 `force` 参数）
- 被终结的旧设备：下一次请求 401 → 自动刷新 → refresh token 已被吊销 → 前端 `forceLogout('登录已失效，请重新登录')` 回首页弹登录框。现有 [client.ts](../src/api/client.ts) 链路无需改动
- 可选优化：版本不匹配的 401 可用独立业务码（如 `401004`「账号已在其他设备登录」）让被踢设备的提示更明确，需同步改 `client.ts` 的 `forceLogout` 文案

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
- 按 `createdAt` 倒序排列
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
- 访问时浏览量 (`viewCount`) 自动 +1，无单独计数接口。防刷规则（`ViewCountService`，基于 Redis）：
  - 爬虫 UA（bot/spider/curl 等）不计数
  - 文章作者本人浏览不计数
  - 同一访客（登录按 userId、匿名按 IP）对同一篇文章 30 分钟内只计 1 次
  - 单 IP 每分钟最多计 10 次，超出拉黑该 IP 10 分钟
  - Redis 故障时降级为直接计数（fail-open，详情接口不因计数挂掉）
- 返回的 `viewCount` 是**本次计数前的快照**：本次 +1 已在服务端落库，下次查询才能看到新值
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
  "contentHtml": "string (contentMd 渲染后的 HTML，可选；前端由编辑器 onHtmlChanged 回调产出后随创建提交，后端存 content_html 列)",
  "summary": "string (文章摘要，可选，不填则自动截取)",
  "coverImage": "string (封面图URL，可选)",
  "categoryId": 1 (分类ID，可选),
  "tags": [1, 2] (标签ID数组，至少 1 个，最多 5 个),
  "readingTime": 15 (预估阅读时间（分钟），可选),
  "status": 0 (发布状态:0=草稿, 1=已发布, 2=已下架，可选，默认0；审核状态由 review_status 表示:0=待审核, 1=通过, 2=拒绝),
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
  "contentHtml": "string (可选，渲染后的 HTML；提供时一并更新 content_html)",
  "summary": "string (可选)",
  "coverImage": "string (可选)",
  "categoryId": "number (可选)",
  "tags": [1, 2] (可选，标签 ID 数组；传空数组 [] 表示清空标签)",
  "readingTime": "number (可选)",
  "status": "number (可选，发布状态 0=草稿 1=已发布 2=已下架；实际状态由后端按编辑流程决定)",
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
- 403: 只有文章作者本人可以编辑（接口登录即可访问，作者校验在业务层；管理员也不能改他人稿）
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
- 403: 需管理员（管理员可删除任意文章）
- 404: 文章不存在

---

### 6. 文章审核相关

> 文章有**两个独立状态字段**：
> `status`（发布状态）：`0=草稿`，`1=已发布`，`2=已下架`；
> `review_status`（审核状态）：`0=待审核`，`1=通过`，`2=拒绝`。
> 用户点「提交审核」后 `review_status=0`（新建默认）；管理员审核：通过 → `status=1 + review_status=1`，驳回 → `status=0 + review_status=2`；编辑重新提交会把 `review_status` 归 0（已发布的文章编辑期间 `status=2` 下架待审）。

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
        "authorNick
        name": "zhangsan",
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
    "...": "其余 Article 字段（title/summary/likeCount/viewCount 等）"
  }
}
```

> **字段映射**：`blog_posts` 实体**没有 `comment_count` 列**，`commentCount` 由 `blog_comments` 聚合。详见末尾「实现差异与字段映射」。

**错误情况**

- 401: 未登录
- 400: 非待审核状态（review_status ≠ 0，已审核通过或已被拒绝）
- 404: 文章不存在

> **实现差异**：后端已提供 `PUT /api/posts/{id}/approve`（历史 `/publish` 路径差异已对齐）。

#### 6.3 审核驳回（退回草稿）

**请求**

```
PUT /posts/{id}/reject
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | number | 文章 ID |

**请求体**

```json
{
  "reason": "第三段有错别字，封面图不清晰"
}
```

| 参数   | 类型   | 说明                                                                         |
| ------ | ------ | ---------------------------------------------------------------------------- |
| reason | string | **驳回理由，必填**（前端强制非空，1-200 字符）；后端用于生成驳回通知告知作者 |

**返回**（更新后的完整文章对象，`status` 置为 `0`、`review_status` 置为 `2`）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 52,
    "status": 0,
    "...": "其余 Article 字段"
  }
}
```

**错误情况**

- 401: 未登录
- 400: 文章已是拒绝状态（review_status = 2）/ reason 缺失或超长
- 404: 文章不存在

**联动：驳回通知**

- 驳回成功后给文章作者生成一条 `type='system'` 的审核结果通知，`content` 含驳回理由（如「你的文章《标题》被驳回：{reason}」），link 指向文章（作者从通知直达 `/write/{id}` 修改亦可）
- 通过（approve）同样建议生成 `type='system'` 通知（「已通过审核并发布」），与驳回对称

**前端接入约定**

- 管理员审核页驳回按钮改为 `ElMessageBox.prompt`（textarea）：必填驳回理由（非空校验 + 200 字上限），确认后 `rejectArticle(id, reason)` 发送 `{ reason }`

---

#### 6.4 下架文章（作者本人或管理员）

**请求**

```
PUT /posts/{id}/offline
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

**权限与状态规则**

- 仅**文章作者本人**或**管理员**可下架（403 否则）
- 仅 `status=1`（已发布）可下架（400 否则：草稿无需下架、已下架重复下架报错）
- 只改 `status 1→2`，`review_status` 保持 1（区别于编辑重审：编辑会把 `review_status` 归 0）
- **不设直接重新上架接口**：下架后由作者编辑（`review_status` 归 0 进待审）→ 管理员审核通过（`approve` 置 `status=1 + review_status=1`）回到已发布

**联动**

- 管理员下架他人文章时给作者生成一条 `system` 通知（「下架了你的文章《标题》」，link 指向文章）；作者自己下架不发（防自扰）

**前端接入约定**

- 「我的文章」已发布行内有「下架」按钮；文章详情页作者/管理员在已发布文章标题旁有「下架」按钮（`canOffline`）；均先 `ElMessageBox` 二次确认，成功后本地 `status` 置 2（tab 分组/计数自动更新，详情页按钮随 `canOffline` 消失）

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
GET /posts/{articleId}/comments
```

**URL 参数**
| 参数 | 类型 | 说明 |
|-----|------|------|
| articleId | number | 文章 ID |

> **不分页**：无 `page` / `pageSize` 参数，接口一次性返回该文章的全部评论（前端评论区改为「默认 5 条 + 查看全部 / 容器内下拉滚动」的交互，需要全量数据）。

**返回**（`data` 直接是顶级评论数组，每条嵌套其二级回复）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "articleId": 1,
      "userId": 2,
      "parentId": 0,
      "replyToId": 0,
      "nickname": "李四",
      "avatar": "https://ui-avatars.com/api/?name=lisi",
      "content": "很详细的讲解，感谢分享！",
      "likeCount": 5,
      "isAdmin": 0,
      "createdAt": "2024-01-16T10:30:00Z",
      "replies": [
        {
          "id": 3,
          "articleId": 1,
          "userId": 7,
          "parentId": 1,
          "replyToId": 1,
          "nickname": "王五",
          "avatar": "https://ui-avatars.com/api/?name=wangwu",
          "content": "@李四 同意，受益匪浅！",
          "likeCount": 1,
          "isAdmin": 0,
          "createdAt": "2024-01-16T14:00:00Z"
        }
      ],
      "liked": false
    }
  ]
}
```

**备注**

- **不分页**：一次性返回全部评论，支撑前端「默认展示 5 条（含各自的嵌套回复）→ 查看全部 → 容器内滚动」以及评论弹窗内直接全量滚动的交互
- `data` 为**顶级评论**（`parentId=0`）数组；`replies` 为该评论下的二级回复（嵌套数据，回复中不再嵌套）
- 顶级评论按 `createdAt` 倒序（最新在前），`replies` 按 `createdAt` 正序（先回复先展示）
- **响应不含 `email` 与 `status` 字段**：邮箱属用户隐私不对外返回；服务端只回已审核评论（过滤条件 `status=1`），该字段对外冗余
- 未登录可读，登录时每条额外返回 `liked`（当前用户是否点赞该评论）
- **`isAdmin` 为后端 `short` 类型，不是布尔值**：`0` = 普通用户，`1` = 博主（文章作者）。前端据此渲染「博主」标签（`isAdmin === 1`）

---

### 2. 发表评论

**请求**

```
POST /posts/{articleId}/comments
Authorization: Bearer {accessToken} (必需，评论必须登录)
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
  "parentId": 0 (父评论ID，0=顶级评论，可选),
  "replyToId": 0 (被回复评论ID，可选)
}
```

> `nickname` / `email` 已废弃：评论必须登录，昵称/头像等身份信息取自 token 对应账户，不再接受入参传入。

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
    "avatar": "https://ui-avatars.com/api/?name=张三",
    "content": "我的想法是...",
    "likeCount": 0,
    "isAdmin": 0,
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 401: 未登录（评论必须登录，由前端强制；后端接口就绪后应同样校验）
- 404: 文章不存在
- 400: 评论内容为空或过长
- 400: 文章不允许评论 (`allowComment` = 0)

**备注**

- **必须登录才能评论**（游客仅可阅读评论列表）；身份信息取自 token 对应账户
- `parentId` 非 0 时表示回复某条评论
- 新评论 `status` 默认为 0（待审核）
- 评论发表成功后文章 `commentCount` +1
- **评论发布后不可修改，只能删除**（详见下方「删除评论」）；接口不返回 `updatedAt` 之类的编辑时间字段

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
    "avatar": "https://ui-avatars.com/api/?name=张三",
    "content": "我的想法是...",
    "likeCount": 3,
    "isAdmin": 0,
    "createdAt": "2024-01-20T14:30:00Z"
  }
}
```

**错误情况**

- 404: 评论不存在

**备注**

- 返回单条评论的完整 `Comment` 对象（顶级评论的 `replies` 为空）

---

> **没有「更新评论」接口**：评论发布后**不可修改，只能删除**。
> 原设计的 `PUT /posts/{articleId}/comments/{commentId}` 已废弃并从前后端移除
> （前端 `src/api/comment.ts` 中不再提供 `updateComment`）。
> `blog_comments` 实体没有 `updated_at` 列，本就不支持记录编辑时间。

---

### 4. 删除评论

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
- 403: 只有评论作者本人、当前文章作者或管理员可以删除（后端 `deleteComment` 三者取或）
- 404: 评论不存在

**备注**

- 删除后文章 `commentCount` -1
- **级联删除**：删除 `parent_id = commentId`（顶级评论的所有回复）**或** `reply_to_id = commentId`（回复该回复的二级回复）的行；前端本地缓存按同一规则同步移除
- **评论发布后不支持编辑**：用户对已发布评论只有「删除」这一个操作入口

**前端接入约定**

- `CommentSection.vue` 评论/回复操作栏有「删除」入口，**展示条件**：管理员 `isAdmin`、或当前用户是文章作者（`ArticleDetail` 传入 `:author-id`）、或当前用户是该评论作者；真正权限以后端校验为准
- 点删除先弹 `ElMessageBox` 二次确认，确认后 `DELETE /posts/{articleId}/comments/{commentId}`，成功后本地缓存移除该评论（顶级评论连带 replies，与后端级联一致）

---

### 5. 点赞评论

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

### 6. 取消点赞评论

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
- 404: 文章不存在或已下架（需未软删且审核通过才可收藏）
- 400: 已收藏过

**备注**

- `favCount` 是**操作后该文章的收藏总次数**（不是文章 ID，也不是 0/1 标记）
- 服务端以收藏明细表 `blog_post_favorites` 重算总数，并同步 `blog_posts.fav_count` 冗余列（文章列表读该列）

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

**备注**

- `favCount` 同上：操作后该文章的收藏总次数
- 普通登录用户即可调用（`SecurityConfig` 中该路径声明为 `authenticated()`，不走管理员 DELETE 规则）

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
    "role": "ADMIN",
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
    "role": "USER",
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
- 可更新的字段：nickname / avatar / bio / website / github / weibo（`role` / `status` 不可经此接口修改，需走「用户管理接口」）
- 当 `avatar` 变化时，后端应删除旧的 OSS 头像文件（若旧 URL 指向本 OSS Bucket），避免每次换头像都堆积旧图

---

### 3. 修改当前用户密码

> **状态**：前端已接入（`Profile.vue` 修改密码卡片 + `api/auth.ts#changePassword`），后端待实现。

**请求**

```
PUT /auth/me/password
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**（均必填）

```json
{
  "oldPassword": "string (原密码)",
  "newPassword": "string (新密码，6-32 位，与注册口径一致)"
}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 401: accessToken 无效或已过期
- 400: 原密码错误 / 新密码与原密码相同 / 新密码格式不合法（@NotBlank + @Size(6,32)）

**后端约定**

- 身份取自 SecurityContext（`SecurityUtils.currentUserId()`），不接受 userId 入参
- 新密码 BCrypt 加密后 UPDATE `blog_users.password`
- 成功后调 `revokeAllByUserId(userId)` 把该用户**全部** refreshToken 置 `revoked=1`（含当前设备）——改密即全员重新登录，不重发 token

**前端接入约定**

- 入口：`/profile` 页「修改密码」卡片（原密码/新密码/确认新密码）；头像菜单「账号设置」跳转此页
- 提交前本地校验：新密码 6-32 位、两次输入一致、新≠旧（后端为准）
- 成功后：提示「密码修改成功，请重新登录」→ `authStore.logout()` 本地清理 → 跳首页并弹出登录框

---

## 用户管理接口

> **仅管理员（role=ADMIN）可用**：非管理员访问一律返回 403（业务码 403001），
> 前端据此隐藏「管理」入口并拦截 `/admin/**` 路由。

### 1. 分页获取用户列表

**请求**

```
GET /users?page=1&pageSize=10&keyword=张
Authorization: Bearer {accessToken}
```

**Query 参数**

| 参数     | 类型   | 必填 | 说明                         |
| -------- | ------ | ---- | ---------------------------- |
| page     | int    | 否   | 页码，1 基，默认 1           |
| pageSize | int    | 否   | 每页大小，默认 10            |
| keyword  | string | 否   | 模糊匹配用户名 / 昵称 / 邮箱 |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 1,
        "username": "zhangsan",
        "nickname": "张三",
        "email": "zhangsan@example.com",
        "avatar": "https://example.com/avatar.jpg",
        "bio": "",
        "website": "",
        "github": "",
        "weibo": "",
        "status": 1,
        "role": "ADMIN",
        "lastLoginAt": "2024-01-20T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-20T10:30:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

**错误情况**

- 401: 未登录或 accessToken 失效
- 403: 非管理员（403001）

**备注**

- 仅 ADMIN；列表含邮箱等信息，GET 同样受限

---

### 2. 修改用户角色

**请求**

```
PUT /users/{id}/role
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "role": "USER"
}
```

`role` 只能是 `ADMIN`（管理员）或 `USER`（普通用户）。

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 2,
    "username": "lisi",
    "nickname": "李四",
    "email": "lisi@example.com",
    "avatar": "",
    "bio": "",
    "website": "",
    "github": "",
    "weibo": "",
    "status": 1,
    "role": "USER",
    "lastLoginAt": "2024-01-19T08:00:00Z",
    "createdAt": "2024-01-02T00:00:00Z",
    "updatedAt": "2024-01-20T00:00:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 403: 非管理员（403001）
- 404: 用户不存在
- 400: 修改自己的角色 / 降级最后一个启用状态的管理员 / 参数非法

**备注**

- 仅 ADMIN
- 生效即时：`JwtAuthenticationFilter` 每个请求都查库取 role，被降权用户的存量 token 下一次请求即被拒绝

---

### 3. 启用/禁用用户

**请求**

```
PUT /users/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**入参**

```json
{
  "status": 0
}
```

`status`：`1`=正常，`0`=禁用。

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 2,
    "username": "lisi",
    "nickname": "李四",
    "email": "lisi@example.com",
    "avatar": "",
    "bio": "",
    "website": "",
    "github": "",
    "weibo": "",
    "status": 0,
    "role": "USER",
    "lastLoginAt": "2024-01-19T08:00:00Z",
    "createdAt": "2024-01-02T00:00:00Z",
    "updatedAt": "2024-01-20T00:00:00Z"
  }
}
```

**错误情况**

- 401: 未登录
- 403: 非管理员（403001）
- 404: 用户不存在
- 400: 修改自己的状态 / 禁用最后一个启用状态的管理员 / 参数非法

**备注**

- 仅 ADMIN
- 禁用即时生效：该用户存量 token 下一次请求返回 403（403002），登录返回 403「账号已被禁用」；重新启用后恢复

---

## 系统公告接口（管理端）

> **状态**：设计定稿，前后端均待实现。
> **模型**：公告源存 `blog_announcements` 表；采用**按需物化**（lazy materialization）——发布只写源表，**不写扩散**；直到某用户实际拉取通知时才把它该公告补插进他自己的 `blog_notifications`（`type='announcement'`、`source_id` 指向源，靠唯一索引 `uq_notifications_user_source (user_id, source_id)` 防重）。用户侧零新增接口——从铃铛系统 tab 直接消费。
>
> **为什么用按需物化而非写时扩散**：写时扩散是发布时遍历全体 `status=1` 用户逐条插记录，插入量 = 用户数 × 公告数，绝大多数人可能从不打开通知，白白造行；按需物化把插入量从「发布时一次性全部」降到「仅活跃用户实际取到公告时才插」，**发布 O(1)**、索引驱逐 DDL 大范围/大用户量下的写放大消除，且列表/已读/删除仍复用既有通知逻辑。
>
> **未读数/系统 tab 的补插时机**：用户进入通知页或调 `unread-count/通知列表` 时，先查源表是否有「已发布、且我尚未物化」的公告，有则补插副本再返回（物化在读取路径上）。
>
> SecurityConfig 需为 `/api/announcements` 的 POST/PUT/DELETE（及管理端列表 GET）加 `hasAuthority("ADMIN")`，且必须声明在 `/api/**` 宽松规则之前。

### 1. 发布公告

**请求**

```
POST /api/announcements
Authorization: Bearer {accessToken}（ADMIN）
Content-Type: application/json

{ "title": "系统维护通知", "content": "本周六 02:00-04:00 系统维护，期间无法发文。" }
```

| 参数    | 类型   | 说明                          |
| ------- | ------ | ----------------------------- |
| title   | string | 必填，1-100 字符              |
| content | string | 必填，1-450 字符（见下方容量说明） |

**返回**：公告对象 `{ id, title, content, createdBy, createdAt }`

**后端行为**：仅 `INSERT blog_announcements` 源记录（含 `created_by=当前管理员`、`created_at=now`）。**不做任何扩散**——不需要遍历用户，单条插入即可（O(1)）。无需 `@Transactional` 包扩散（没有扩散）。

### 2. 公告列表（管理端）

```
GET /api/announcements?page=1&pageSize=10（ADMIN）
```

返回 `PageResult`，每条含 `{ id, title, content, createdBy, createdAt, updatedAt }`，可附 `deliveredCount`（**当前已物化的副本数**，即「已触达 N 人」——按需物化下不等于用户总数，仅表示已实际取到该公告的用户数）。

### 3. 编辑公告

```
PUT /api/announcements/{id}（ADMIN）
Body: { "title", "content" }（同发布校验）
```

**后端行为**：更新源表 → **同步更新已物化的副本**（`UPDATE blog_notifications SET title=?, content=? WHERE type='announcement' AND source_id=?`）。`is_read` 不动——已读用户保持已读，未读保持未读（内容被更正而非重新提醒）。
**尚未物化的用户不受影响**：他们下次拉取时从源表拿到的是更新后的新内容（按需物化天然保证「越晚看到越新」）。

### 4. 删除公告

```
DELETE /api/announcements/{id}（ADMIN）
```

**后端行为**：**级联删除已物化的副本**（`DELETE FROM blog_notifications WHERE type='announcement' AND source_id=?`）→ 删除源记录，`@Transactional`。
**这是公告删除的唯一途径**——用户侧 `DELETE /notifications/{id}` 对 `type='announcement'` 返回 403「系统公告只能由管理员删除」。管理页删除确认文案需说明「删除后已收到该公告用户的该条通知将一并消失」。
**尚未物化的用户无需清理**：删除源后他们下次拉取时在源表里查不到该公告，自然补齐不了，也不会残留。

**容量说明（content 为何上限 450）**：公告的已物化副本会把 `content` 原样写入 `blog_notifications.content`，而该列是 `VARCHAR(500)`（含生成时拼入的触发者昵称前缀另有占用）。因此公告 `content` 上限定为 **450 字符**，确保副本插入不超列宽；若将来要发超长公告，需先把 `blog_notifications.content` 扩为 TEXT。

### 5. 前端接入约定（管理页）

- `AdminLayout` 侧边栏新增「公告管理」入口（`/admin/announcements`），页面复用 AdminReview/AdminUsers 的卡片+表格风格
- 功能：列表（分页）/ 新建（title + content textarea 弹窗）/ 编辑（同弹窗回填）/ 删除（二次确认含级联提示）
- 通知侧（`Notifications.vue`）：`type='announcement'` 的行不渲染删除按钮；`NotificationType` 类型联合与 `TYPE_LABELS` 补 `announcement: '公告'`（tag 建议 warning 色，与普通系统通知区分）

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

### 2. 上传文章封面图片

**请求**

```
POST /upload/cover
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**入参（multipart 字段）**
| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| file | file | 是 | 图片文件，支持 jpg/jpeg/png/gif/webp/bmp，建议 ≤ 2MB（前端另限制 ≤ 5MB） |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "url": "https://{bucket}.oss-{region}.aliyuncs.com/cover/2026/10/11/uuid.png"
  }
}
```

**错误情况**

- 401: 未登录 / accessToken 无效
- 400: 文件为空、格式不支持、超过大小限制

**备注**

- 与头像上传同构，文件存 OSS 的 `cover` 目录；返回的 `url` 由前端写入 `coverImage`，随 `POST /posts` / `PUT /posts/{id}` 提交
- 写文章页交互：点击上传框选择本地图片 → **选中即调本接口**上传 → 拿到 URL 显示预览；点 × 移除仅清空前端值（编辑提交时以空串覆盖后端 `cover_image`）
- `SecurityConfig` 中该路径落到 `anyRequest().authenticated()`，普通登录用户即可调用

---

## AI 助手接口

AI 对话模块采用「后端代理」模式：前端不直连大模型，而是把提问发给后端，由后端组装上下文、调用 DeepSeek（OpenAI 兼容协议）并以 SSE 流式转发结果。模块**对游客开放**——会话按客户端 IP 归属（登录用户按 user_id 归属），因此无需认证，成本控制靠后端按 IP 的限流实现。

> 本模块接口路径同样省略 `/api` 前缀（前端 axios baseURL 自动补全），与全文档保持一致。

### 1. 查询 AI 能力状态

**请求**

```
GET /ai/config
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "configured": false,
    "model": "deepseek-chat"
  }
}
```

**备注**

- 无需认证
- `configured` 为 `false` 表示后端未配置模型 API Key，此时提问会失败；前端据此在页面上给出「AI 服务未配置」的提示，而不是等用户发出提问才报错

### 2. 会话列表

**请求**

```
GET /ai/sessions
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "title": "JWT 双 token 的原理",
      "createdAt": "2026-09-23T10:00:00",
      "updatedAt": "2026-09-23T10:05:00"
    }
  ]
}
```

**备注**

- 无需认证；登录态由后端从 `Authorization` 头宽松解析，缺失或无效均按游客处理
- 登录用户返回自己（`user_id` 匹配）的会话，游客返回本 IP 下未绑定用户的会话；两者取并集，游客登录后可接着原会话继续
- 按 `updated_at` 倒序（最近活跃在前），最多 100 条

### 3. 新建会话

**请求**

```
POST /ai/sessions
Content-Type: application/json
```

**入参**

| 字段  | 类型   | 必需 | 说明                         |
| ----- | ------ | ---- | ---------------------------- |
| title | string | 否   | 会话标题，缺省为「新的对话」 |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 2,
    "title": "新的对话",
    "createdAt": "2026-09-23T10:10:00",
    "updatedAt": "2026-09-23T10:10:00"
  }
}
```

**备注**

- 也可以不显式建会话：直接调 `POST /ai/chat` 不传 `sessionId`，后端会在首条提问时自动建会话并按提问内容命名

### 4. 删除会话

**请求**

```
DELETE /ai/sessions/{id}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": null
}
```

**错误情况**

- 404: 会话不存在或无权访问

**备注**

- 会话下的消息随 `ON DELETE CASCADE` 一并删除

### 5. 会话历史消息

**请求**

```
GET /ai/sessions/{id}/messages
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 10,
      "role": "user",
      "content": "帮我解释下 SSE",
      "tokens": 0,
      "status": 1,
      "createdAt": "2026-09-23T10:12:00"
    },
    {
      "id": 11,
      "role": "assistant",
      "content": "SSE（Server-Sent Events）是……",
      "tokens": 132,
      "status": 1,
      "createdAt": "2026-09-23T10:12:05"
    }
  ]
}
```

**备注**

- `role`：`user` 用户提问 / `assistant` AI 回复
- `status`：`0` 生成中 / `1` 已完成 / `2` 失败（生成中断），失败的消息内容保留已生成的部分，前端据此提示重试
- 消息按创建时间正序返回

### 6. 流式对话（SSE）

**请求**

```
POST /ai/chat
Content-Type: application/json
Accept: text/event-stream
Authorization: Bearer {accessToken}   // 可选，登录用户带上以归属会话
```

**入参（JSON）**

| 字段        | 类型   | 必需 | 说明                             |
| ----------- | ------ | ---- | -------------------------------- |
| sessionId   | number | 否   | 会话 id；为空表示新建会话        |
| content     | string | 否   | 提问正文；为空时需至少有一个附件 |
| attachments | array  | 否   | 附件列表，最多 5 个              |

**attachments 数组项**

| 字段    | 类型   | 必需 | 说明                               |
| ------- | ------ | ---- | ---------------------------------- |
| name    | string | 是   | 原始文件名                         |
| content | string | 否   | 文本类附件的内容（前端读成纯文本） |
| url     | string | 否   | 二进制附件的 OSS 地址              |

**响应（SSE 事件流，按顺序）**

```
event:meta
data:{"sessionId":2,"messageId":12}

event:content
data:{"delta":"SSE"}

event:content
data:{"delta":"（Server-Sent Events）是……"}

event:done
data:{"tokens":132}
```

**事件说明**

| 事件      | data 字段            | 说明                                             |
| --------- | -------------------- | ------------------------------------------------ |
| `meta`    | sessionId, messageId | 首帧，服务端确认的会话/消息 id，前端据此挂载气泡 |
| `content` | delta                | 增量文本，会被多次推送，前端逐段渲染             |
| `done`    | tokens               | 生成完成，携带本次消耗的 token 数                |
| `error`   | message              | 生成中途失败（如上游限流、超时），前端展示该文案 |

**错误情况（生成开始前，返回标准 JSON 错误体）**

- 400: 提问与附件均为空、附件超过 5 个
- 429: 游客超过每小时提问次数上限
- 503: AI 服务未配置 Key、上游报错或超时

**备注**

- 因为 `EventSource` 只支持 GET，前端用 `fetch` + `ReadableStream` 消费本接口
- 每条用户提问与 AI 回复都会落库到 `blog_ai_messages`，支持刷新后恢复历史
- 文本类附件会以代码块形式拼进本轮上下文，模型能「读懂」文件内容；二进制附件只带地址，模型侧明确「无法读取内容」
- 生成中途客户端断开时，后端停止调用上游并保留已生成内容（该条消息状态置为失败）

### 7. 上传二进制附件

**请求**

```
POST /ai/upload
Content-Type: multipart/form-data
```

**入参（multipart 字段）**

| 字段 | 类型 | 必需 | 说明                  |
| ---- | ---- | ---- | --------------------- |
| file | file | 是   | 附件文件，单个 ≤ 10MB |

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "url": "https://{bucket}.oss-{region}.aliyuncs.com/ai-attachment/2026/09/23/uuid.png",
    "name": "photo.png",
    "size": 204800
  }
}
```

**备注**

- 无需认证；用于图片等二进制附件的 OSS 中转上传
- 文本类文件（txt/md/csv/json/代码等）不走本接口，由前端直接读成文本后放进 `attachments[].content`

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
      "likeCount": 36,
      "favCount": 12,
      "status": 1
    }
  ]
}
```

**错误情况**

- 无（公开接口，无需认证）

**备注**

- 不需要认证
- 已实现：`GET /posts/top`，`limit` 走 Query 参数，后端用 SQL `LIMIT` 截断（默认 10）
- 按 `viewCount` 降序返回前 N 条（默认 10 条）
- 仅返回已发布文章（status=1）且未软删
- 仅查 `blog_posts` 单表：返回其自有列（`ArticleListItem` 中 `authorNickname`/`authorAvatar`/`category`/`tags` 等关联字段为 null，响应 `NON_NULL` 会被省略）；首页排行侧栏只用 `title` + `viewCount`，足够
- 用于首页右侧「热门排行」侧栏，仅在「全部」标签时展示

---

### 10. 我的文章（含草稿）

**请求**

```
GET /posts/mine
Authorization: Bearer {accessToken}
```

**返回**

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 12,
      "userId": 7,
      "title": "MySQL 到 PostgreSQL 迁移踩坑记录",
      "summary": "……",
      "coverImage": "https://example.com/cover.png",
      "readingTime": 8,
      "viewCount": 82,
      "likeCount": 5,
      "favCount": 2,
      "status": 1,
      "allowComment": 1,
      "isTop": 0,
      "createdAt": "2026-09-22T01:52:33",
      "updatedAt": "2026-10-01T10:00:00",
      "category": { "id": 3, "name": "数据库" },
      "tags": [{ "id": 4, "name": "前端", "createdAt": "2026-08-30T06:00:31" }],
      "authorNickname": "user",
      "authorAvatar": "https://example.com/avatar.jpg"
    }
  ]
}
```

**错误情况**

- 401: 未登录 / accessToken 无效

**备注**

- 仅返回**当前登录用户**本人的文章，按 `updatedAt` 倒序；不含已软删（`deleted_at` 非空）的文章
- 返回两个状态字段：`status`（发布状态：0=草稿 1=已发布 2=已下架）与 `reviewStatus`（审核状态：0=待审核 1=通过 2=拒绝，仅本接口返回）
- 前端「我的文章」页按 `status` 分页签（全部/已发布/草稿/已下架），行内另用 `reviewStatus` 展示「待审核/审核被拒」标签（通过时不显示）
- 用于「头像菜单 → 我的文章」页面（`/my-articles`，新标签页打开）；`GET /posts` 公开列表不受本接口影响

---

## 站内通知接口

### 1. 通知列表

**请求**

```
GET /notifications?page=1&pageSize=10&onlyUnread=false
Authorization: Bearer {accessToken}
```

**Query 参数**

| 参数       | 类型    | 必需 | 说明                 |
| ---------- | ------- | ---- | -------------------- |
| page       | number  | 否   | 页码，默认 1         |
| pageSize   | number  | 否   | 每页条数，默认 10    |
| onlyUnread | boolean | 否   | 只看未读，默认 false |

**返回**（`PageResult` 结构）

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "data": [
      {
        "id": 12,
        "type": "post_comment",
        "title": "文章评论",
        "content": "张三 评论了你的文章《Vue3 指南》",
        "link": "/article/5",
        "isRead": 0,
        "createdAt": "2026-10-16T10:20:30"
      }
    ],
    "total": 3,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**错误情况**

- 401 未登录

**备注**

- 仅返回**当前登录用户**自己的通知，按 `createdAt` 倒序
- `content` 已在生成时拼好触发者昵称（如「张三 回复了你的评论」），前端直接展示
- 评论类通知 `link` 带锚点 `/article/{id}#comment-{commentId}`，跳转后定位到具体评论
- `type` 枚举：`post_comment`（评论文章）/ `comment_reply`（回复评论）/ `comment_like`（评论被赞）/ `like`（文章被赞）/ `favorite`（文章被收藏）/ `follow`（被关注）/ `message`（收到私信）/ `system`（系统）/ `announcement`（系统公告）。**前端 `tabOf` 按这些值分组**：post_comment/comment_reply/comment_like → 评论通知 tab；like/favorite → 点赞收藏 tab；其余（含 announcement）→ 系统 tab。后端生成时必须用此枚举，自造值（如 post_like/comment_create）会全部落到系统分类
- 触发时机（均已接入）：顶级评论成功 → 文章作者收 `post_comment`；回复评论成功 → 被回复评论的作者收 `comment_reply`；评论点赞成功 → 评论作者收 `comment_like`；文章点赞/收藏成功 → 文章作者收 `like` / `favorite`。各触发点 try/catch 包裹（通知失败不影响主流程）；自己触发自己的动作不生成（防自扰）；取消点赞/收藏不撤回已发通知

---

### 2. 未读数

```
GET /notifications/unread-count
Authorization: Bearer {accessToken}
```

**返回**

```json
{ "code": 200, "message": "操作成功", "data": { "count": 3 } }
```

---

### 3. 标记单条已读

```
PUT /notifications/{id}/read
Authorization: Bearer {accessToken}
```

**返回**：`{ "code": 200 }`

**错误情况**

- 401 未登录；404（业务码 401 消息体）通知不存在或非本人

---

### 4. 全部标记已读

```
PUT /notifications/read-all
Authorization: Bearer {accessToken}
```

**返回**：`{ "code": 200 }`

---

### 5. 删除单条通知

```
DELETE /notifications/{id}
Authorization: Bearer {accessToken}
```

**返回**：`{ "code": 200 }`

**错误情况**

- 401: 未登录
- 403: `type='announcement'`（系统公告只能由管理员删除，见「系统公告接口」）
- 404: 通知不存在或非本人

**备注**

- **物理删除**（通知是个人收件箱数据，删了即消失，无软删字段）
- 仅能删除 `user_id` 等于当前用户的行（与标记已读同一防线）
- 删除未读通知后 `unread-count` 自然减一（计数按行算，无需额外处理）

---

### 前端接入约定

- 顶部导航铃铛（`Header.vue`，登录态显示）：进入页面拉一次 `unread-count` 展示红点；不做轮询、无 WebSocket（实时性要求不高）
- **通知页无「全部」分类**：只有五个模块 tab（评论通知/点赞收藏/关注/私信/系统），默认激活第一个 `comment`
- **悬浮铃铛**弹出五个分类快捷入口（评论通知/点赞收藏/关注/私信/系统），点击跳 `/notifications?tab={key}` 预选模块；**点铃铛本体**默认进第一个分类：`/notifications?tab=comment`
- `/notifications` 页按 `?tab=` 预选模块；`?tab=` 缺失或非法时统一落到 `comment` 并回写 URL；页内切 tab 会同步回 URL（刷新/分享不丢状态）
- 页内点某条通知：先 `PUT .../read` 再 `router.push(link)` 跳转到对应文章/评论位置；**`type='announcement'` 例外**——公告内容内联展示、无落地页（后端副本 `link` 填了不存在的 `/announcements`），前端仅标已读不跳转
- **锚点定位链路**（评论点赞通知已接入）：后端 link 形如 `/article/{postId}#comment-{commentId}`；`CommentSection.vue`（inline 变体）在评论加载完成后解析 `route.hash`，必要时展开「查看全部」并扩大展示批次，`nextTick` 后按 `id="comment-{commentId}"` 找 DOM（带重试）`scrollIntoView`，目标评论黄色高亮 2.5s；已在文章页时监听 `route.hash` 再次触发。已触发 `comment_like`：`BlogPostCommentService.likeComment` 在 `saveLike` 成功后调 `createNotification`（try/catch 包裹，通知失败不影响点赞）
- **通知删除**（已实现）：通知行提供「删除」入口（`DELETE /notifications/{id}`，`@click.stop` 防触发整行跳转，先 `ElMessageBox.confirm` 确认），成功后行移除、未读时未读数减一；`type='announcement'` 的行**不显示删除按钮**（公告只能由管理员从源头删除）
- **系统公告的用户接收方式（按需物化）**：管理员发布公告只写 `blog_announcements` 源表，**不主动扩散**。用户进入通知页或拉取未读数/通知列表时，后端先查「已发布、且我（`user_id`）尚未物化」的公告，有则补插一条 `type='announcement'`、`source_id` 指向源的副本（唯一索引防重）再返回。因此用户**不需要任何新接口/新页面**：铃铛红点自动 +1、系统 tab 直接可见、点开走既有 `markRead` 即已读。编辑公告同步更新**已物化**副本的 title/content、未物化用户下次拉到新内容（已读状态不变）；删除公告级联删除**已物化**副本、未物化用户自然不再补齐

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
> **⚠️ 重要字段差异**：API 返回的 `commentCount`（评论数）在 `blog_posts` 实体中**并不存在对应列**，需后端在 VO 层计算/派生（详见文末「实现差异与字段映射」）。

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
  role VARCHAR(20) NOT NULL DEFAULT 'USER' COMMENT 'ADMIN=管理员, USER=普通用户',
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
  status TINYINT NOT NULL DEFAULT 2 COMMENT '发布状态:0=草稿,1=已发布,2=已下架（历史默认2，新文章应显式传0）',
  review_status TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态:0=待审核,1=通过,2=拒绝（独立于 status 的另一维度）',
  reviewer_id INT DEFAULT NULL COMMENT '审核人 ID',
  reviewed_at DATETIME DEFAULT NULL COMMENT '审核时间',
  is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1=置顶,0=普通',
  allow_comment TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1=允许评论,0=禁止',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间'
  -- 注意：无 comment_count 列（API 需派生，见文末）
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
  --       无 updated_at（评论发布后不可修改，只能删除，故无需记录编辑时间）
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

#### blog_users 单会话列（单会话登录新增）

> 单会话设计（见「认证相关接口 · 5. 单会话登录」）：会话版本号，终结旧会话时立即作废其全部 access token。

```sql
ALTER TABLE blog_users ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0;
COMMENT ON COLUMN blog_users.token_version IS
  '会话版本号：登录成功/登出/改密 +1；access token 携带该版本，JwtAuthenticationFilter 每请求与库中值比对，不匹配即 401';
```

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

### 六、通知 / 公告

> **`blog_links`（友情链接）表已于 2026-10-19 物理删除**（空表、无代码引用）。

#### blog_notifications 表（站内通知）

```sql
CREATE TABLE blog_notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '接收用户ID',
  type VARCHAR(30) NOT NULL COMMENT 'post_comment/comment_reply/comment_like/like/favorite/follow/message/system/announcement',
  title VARCHAR(100) NOT NULL,
  content VARCHAR(500) NOT NULL,
  link VARCHAR(255) DEFAULT NULL,
  source_id BIGINT DEFAULT NULL COMMENT '按需物化的公告副本指向 blog_announcements.id；普通通知为 NULL。与(user_id)组成唯一索引 uq_notifications_user_source 防重插',
  is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=未读,1=已读',
  created_at DATETIME NOT NULL
);
```

> **`source_id` 加列说明**（系统公告设计新增）：用于公告副本的编辑同步与删除级联。一期可不重新生成 jOOQ 类——Repository 里用 `DSL.field("source_id", Long.class)` 内联读写；二期再跑 jOOQ codegen 换成类型安全字段。

#### blog_announcements 表（系统公告源）

> **已于 2026-10-19 在库中实际创建**（PostgreSQL，容器 pgvector-db），每列带 `COMMENT ON` 注释。用户不直接读此表（经通知表**按需物化**副本消费）。

```sql
CREATE TABLE blog_announcements (
  id BIGSERIAL PRIMARY KEY,              -- 公告ID，自增主键；通知表按需物化副本的 source_id 回指此列
  title VARCHAR(100) NOT NULL,           -- 公告标题，1-100字符，同步到通知副本的 title
  content TEXT NOT NULL,                 -- 公告正文，1-450字符，同步到通知副本的 content
  created_by INT NOT NULL,               -- 发布管理员的用户ID → blog_users.id
  created_at TIMESTAMP NOT NULL DEFAULT now(),  -- 发布时间
  updated_at TIMESTAMP NULL              -- 最后编辑时间，未编辑过为 NULL
);
COMMENT ON TABLE blog_announcements IS '系统公告：管理员发布（只写本表），用户拉取通知时按需物化到通知表（type=announcement, source_id 指向本表），unique(user_id,source_id) 防重';
```

> 后续实现需跑 jOOQ codegen（`mvn generate-sources`）生成 `com.syt.blog.jooq` 下的类，再写 Repository/Service（项目无 JPA 实体，表结构直接在库中维护）。

### 七、日志统计

> **`blog_login_logs`（登录日志）表已于 2026-10-19 物理删除**（空表、无代码引用）。

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

| 文档路径                                           | 后端现状                                                                                | 差异说明                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /posts?categoryId&tagId&keyword`（列表）      | `GET /posts/published`、`GET /posts/category/{categoryId}`、`GET /posts/search?keyword` | 后端拆成多接口、**不支持组合筛选与分页**；前端 `getArticles` 期望单接口不分页返回全量                       |
| `GET /posts/{id}`（详情含 category/tags/liked 等） | `GET /posts/{id}` 返回裸 `BlogPost`                                                     | 缺派生字段（见 §2）；浏览量已在 `GET /posts/{id}` 查询后防刷自动 +1，**无单独 `PUT /posts/{id}/view` 接口** |
| `POST /posts`（入参含 `tags:number[]`）            | `POST /posts` 入参是裸 `BlogPost`                                                       | **入参无 `tags` 字段**，标签需另存 `blog_post_tags`；`status` 默认 `@PrePersist` 置 1（绕过审核）           |
| `PUT /posts/{id}/approve`                          | `PUT /posts/{id}/publish`                                                               | 路径不同；且**无 `/reject` 接口**                                                                           |
| `GET /posts/pending`（待审核分页）                 | 无                                                                                      | 未实现                                                                                                      |
| `POST/DELETE /posts/{id}/like`、收藏接口           | 无                                                                                      | 未实现控制器                                                                                                |

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

- 评论：`POST /posts/{articleId}/comments`（必须登录，见 §2 契约）、`GET/DELETE /posts/{articleId}/comments/{commentId}`、评论点赞 `POST/DELETE .../like`（评论列表 `GET /posts/{articleId}/comments` 已实现）。**不含 `PUT`**：评论发布后不可修改，只能删除
- 浏览量排行：`GET /posts/top`

已从本清单移除（后端已实现）：

- 文章收藏 `POST/DELETE /posts/{id}/favorite`（2026-10-10 补齐 DELETE，登录即可、非管理员专属）
- 待审核列表 `GET /posts/pending`
- 文章点赞 `POST/DELETE /posts/{id}/like`（2026-10-12 补齐 DELETE 端点与 SecurityConfig 规则，登录即可，非管理员专属）
- 审核拒绝 `PUT /posts/{id}/reject`
- 我的文章 `GET /posts/mine`（2026-10-12，仅本人、含草稿）

### 7. 创建文章的标签保存

`POST /posts` 入参（裸 `BlogPost`）不含 `tags`。前端 `ArticlePayload.tags: number[]` 需后端：

- 方案 A（推荐）：新增 `PostCreateDTO{...,tags:number[]}`，service 内先存 `BlogPost` 再批量插 `blog_post_tags`；
- 方案 B：前端创建文章后单独调标签绑定接口（文档未定义，不推荐）。

### 8. 状态字段语义（status vs review_status）

文章有两组独立状态：`status`（发布状态：0=草稿 1=已发布 2=已下架）与 `review_status`（审核状态：0=待审核 1=通过 2=拒绝）。`status` 列 `DEFAULT 2` 是历史遗留——旧语义里 2 表示「待审核」，新语义下会变成「已下架」，因此 `PostRequest.status` 缺省值已改为 0（草稿），前端创建/提交也显式传 0；审核流转只改 `review_status`（配合 approve/reject 同步调整 `status`）。

---

## 注意事项

1. **Token 管理**：accessToken 存 localStorage，refreshToken 存 httpOnly cookie；accessToken 过期后由前端自动无感刷新（后端返回 HTTP 401 + `code: 401001` 触发）
2. **错误处理**：所有接口返回统一的错误格式，前端需判断 code 字段
3. **CORS**：因前端使用 `withCredentials: true`，后端 CORS 的 `Access-Control-Allow-Origin` 必须写死前端域名（不能用 `*`），并设置 `Access-Control-Allow-Credentials: true`
4. **速率限制**：建议后端对登录、刷新、发表评论等接口设置速率限制
5. **输入校验**：后端需对所有输入进行校验和过滤
6. **SQL 注入防护**：使用参数化查询防止 SQL 注入
7. **XSS 防护**：对用户输入的内容进行 HTML 转义
