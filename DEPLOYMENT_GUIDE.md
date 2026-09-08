# 部署指南

## 本地开发

### 环境要求
- Node.js >= 16.0.0
- pnpm >= 8.0.0

### 启动开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev

# 应用将在 http://localhost:5173 启动
```

### 开发环境配置

创建 `.env` 文件（如果还没有）：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

如果后端运行在不同的地址，相应修改即可。

---

## 生产构建

### 构建生产版本

```bash
# 构建
pnpm run build

# 构建后的文件在 dist/ 目录中
```

### 预览生产构建

```bash
# 启动预览服务器
pnpm run preview

# 应用将在 http://localhost:4173 启动
```

---

## Vercel 部署

### 方式一：通过 Git 连接（推荐）

1. **将代码推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/blog-frontend.git
   git branch -M main
   git push -u origin main
   ```

2. **在 Vercel 创建项目**
   - 访问 https://vercel.com/new
   - 选择 GitHub 仓库
   - 确认以下设置：
     - **Build Command**: `pnpm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `pnpm install`

3. **配置环境变量**
   - 在 Vercel 项目设置中添加环境变量：
     - `VITE_API_BASE_URL`: 生产环境后端 API 地址

4. **部署**
   - 点击部署按钮，等待完成

### 方式二：通过 Vercel CLI

```bash
# 全局安装 Vercel CLI
npm i -g vercel

# 登录到 Vercel
vercel login

# 部署
vercel --prod

# 配置环境变量（如需要）
vercel env add VITE_API_BASE_URL
```

---

## Docker 部署

### 创建 Dockerfile

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# 运行阶段
FROM node:18-alpine

WORKDIR /app

RUN npm install -g pnpm && npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
```

### 构建和运行 Docker 镜像

```bash
# 构建镜像
docker build -t blog-frontend:latest .

# 运行容器
docker run -p 3000:3000 \
  -e VITE_API_BASE_URL=https://api.example.com/api \
  blog-frontend:latest
```

---

## Nginx 部署

### 配置 Nginx

```nginx
server {
    listen 80;
    server_name example.com;

    # 重定向 HTTP 到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL 证书配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # 性能优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Gzip 压缩
    gzip on;
    gzip_types text/css application/javascript application/json;
    gzip_min_length 1000;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    # 应用路由
    location / {
        root /var/www/blog-frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 部署步骤

```bash
# 1. 构建项目
pnpm run build

# 2. 上传文件到服务器
scp -r dist/* user@example.com:/var/www/blog-frontend/dist/

# 3. 配置 Nginx（参考上面的配置文件）

# 4. 重载 Nginx
sudo nginx -s reload
```

---

## 性能优化建议

### 1. 启用 Gzip 压缩
```nginx
gzip on;
gzip_types text/css application/javascript;
gzip_min_length 1000;
```

### 2. 设置缓存头
```nginx
location ~* \.(js|css|png|jpg)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 使用 CDN
- 将静态资源部署到 CDN（如 Cloudflare、阿里云 CDN 等）
- 在 Vite 配置中配置 CDN 路径

### 4. 代码分割
- Vite 已默认启用代码分割
- 路由级别自动分割

### 5. 图片优化
- 使用现代图片格式（WebP）
- 实现图片懒加载

---

## 后端对接步骤

### 1. 配置 API 地址

生产环境需要设置正确的后端 API 地址。

**Vercel 环境变量设置**：
```
VITE_API_BASE_URL=https://api.example.com/api
```

**本地开发**：
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. 替换 Mock 数据为真实 API

修改 `src/api/article.ts` 和 `src/api/comment.ts`：

```typescript
// 示例：替换 getArticles
export async function getArticles(): Promise<Article[]> {
  try {
    // 注释 Mock 调用
    // return await getMockArticles()
    
    // 启用真实 API 调用
    const response = await http.get('/articles')
    return response
  } catch (error) {
    console.error('获取文章列表失败:', error)
    throw error
  }
}
```

### 3. 验证接口对接

1. 检查 API 返回格式是否符合文档规范
2. 测试所有功能：登录、获取文章、发表文章、评论等
3. 检查错误处理逻辑

---

## 常见问题

### Q: 部署到 Vercel 后，页面无法加载资源？
A: 检查环境变量 `VITE_API_BASE_URL` 是否正确设置。确保后端 API 地址与实际部署地址一致。

### Q: 跨域问题（CORS）？
A: 后端需要配置 CORS，允许前端域名访问。在后端的 CORS 配置中添加前端域名。

### Q: 如何处理 Token 过期？
A: 在 HTTP 拦截器中检查响应状态码 401，清除本地 Token 并跳转到登录页。已在 `src/api/http.ts` 中实现。

### Q: 如何监控前端错误？
A: 可以集成 Sentry、LogRocket 等错误监控服务。在 `src/main.ts` 中初始化监控SDK。

### Q: 性能不理想？
A: 
1. 使用 Vite 的分析工具检查包大小
2. 启用 Gzip 压缩
3. 配置 CDN
4. 检查图片大小和格式

---

## 监控和日志

### 启用浏览器控制台日志

所有 API 调用都会输出日志，包括成功和失败。

### 集成监控服务

**Sentry 示例**：

```typescript
// src/main.ts
import * as Sentry from "@sentry/vue"

Sentry.init({
  dsn: "https://your-sentry-dsn@sentry.io/project-id",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
})

app.use(Sentry.vueIntegration())
```

---

## 回滚步骤

### Vercel 回滚

1. 访问 Vercel 项目的 Deployments 页面
2. 找到之前的部署
3. 点击三个点菜单，选择 "Promote to Production"

### 手动部署回滚

```bash
# 回到上一个提交
git revert HEAD
git push origin main

# 重新部署
vercel --prod
```

---

## 清单

部署前完成以下检查：

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 环境变量已配置
- [ ] 后端接口已就位
- [ ] CORS 配置完成
- [ ] SSL 证书已安装
- [ ] Gzip 压缩已启用
- [ ] CDN 已配置（可选）
- [ ] 监控和日志已启用
- [ ] 备份计划已制定
