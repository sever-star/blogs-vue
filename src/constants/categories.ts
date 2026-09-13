import type { Category } from '@/types'

/**
 * 文章分类 - 固定数据
 *
 * 说明：
 * - 在后端接口就绪前，前端使用这份固定分类数据（作为兜底数据源）。
 * - 数据源切换方式见 src/api/category.ts 顶部的 `getCategories`（支持
 *   真实后端 / Mock / 固定数据 三档切换），以及 .env.example 中的
 *   `VITE_USE_BACKEND` / `VITE_USE_MOCK` 两个开关。
 * - 后端就绪后，可保留此文件作为兜底，也可删除；不影响真实接口调用。
 */
export const FIXED_CATEGORIES: Category[] = [
  { id: 1, name: '前端开发', createdAt: '2024-01-01T00:00:00Z' },
  { id: 2, name: '后端开发', createdAt: '2024-01-01T00:00:00Z' },
  { id: 3, name: '数据库', createdAt: '2024-01-02T00:00:00Z' },
  { id: 4, name: 'DevOps', createdAt: '2024-01-03T00:00:00Z' },
  { id: 5, name: '技术教程', createdAt: '2024-01-04T00:00:00Z' },
  { id: 6, name: '生活随笔', createdAt: '2024-01-05T00:00:00Z' },
  { id: 7, name: '读书笔记', createdAt: '2024-01-06T00:00:00Z' },
  { id: 8, name: '经验分享', createdAt: '2024-01-07T00:00:00Z' },
  { id: 9, name: '项目实战', createdAt: '2024-01-08T00:00:00Z' },
  { id: 10, name: '工具推荐', createdAt: '2024-01-09T00:00:00Z' },
]

/**
 * 返回一份固定分类数据的深拷贝。
 *
 * 用于初始化可变的 mock 数据，避免对 mock 数组的增删改
 * 意外污染 FIXED_CATEGORIES 常量本身。
 */
export function getFixedCategories(): Category[] {
  return FIXED_CATEGORIES.map(cat => ({ ...cat }))
}
