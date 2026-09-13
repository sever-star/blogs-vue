import client from './client'
import type { Category, PageQuery, PaginatedResponse } from '@/types'
import { FIXED_CATEGORIES } from '@/constants/categories'

export type { Category, PageQuery, PaginatedResponse }

/**
 * 数据源切换开关（为后端传输数据预留的接口）：
 *
 * - `VITE_USE_MOCK === 'true'`：走 client 请求，由 src/api/mock.ts 的拦截器
 *   返回 mock 数据（数据来自 src/constants/categories.ts 的固定数据）。
 * - `VITE_USE_BACKEND === 'true'`：走 client 请求，命中真实后端接口
 *   `GET /categories`（mock 关闭时生效）。
 * - 两者都未开启：返回前端固定数据兜底，前端可脱离后端独立运行。
 *
 * 后端就绪后：将 `.env` 中 `VITE_USE_MOCK` 置为 `false` 并设置
 * `VITE_USE_BACKEND` 为 `true` 即可无缝切换到真实接口。
 */
const USE_MOCK = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true'
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'

/** 分类请求体 */
export interface CategoryPayload {
  name: string
}

/**
 * 创建分类
 * POST /categories
 */
export const createCategory = async (payload: CategoryPayload): Promise<Category> => {
  return client.post('/categories', payload)
}

/**
 * 获取所有分类
 * GET /categories
 *
 * 数据源：mock / 真实后端 / 固定数据兜底（见上方开关说明）。
 *
 * 返回全量数组，供选择器（分类下拉）使用。管理表格分页请用 getCategoriesPaged。
 */
export const getCategories = async (): Promise<Category[]> => {
  // 开启 mock 或后端时走统一 client 请求
  if (USE_MOCK || USE_BACKEND) {
    return client.get('/categories')
  }
  // 后端与 mock 均未开启：返回固定分类数据兜底
  return FIXED_CATEGORIES
}

/**
 * 分页获取分类
 * GET /categories/page?page=&pageSize=
 *
 * 与 getCategories 拆分为独立 endpoint：本接口固定返回
 * PaginatedResponse<Category>，管理表格使用；全量列表请用 getCategories。
 */
export const getCategoriesPaged = async (
  params: PageQuery
): Promise<PaginatedResponse<Category>> => {
  return client.get('/categories/page', { params })
}

/**
 * 获取单个分类
 * GET /categories/{id}
 */
export const getCategoryById = async (id: number): Promise<Category> => {
  return client.get(`/categories/${id}`)
}

/**
 * 更新分类
 * PUT /categories/{id}
 */
export const updateCategory = async (id: number, payload: Partial<CategoryPayload>): Promise<Category> => {
  return client.put(`/categories/${id}`, payload)
}

/**
 * 删除分类
 * DELETE /categories/{id}
 */
export const deleteCategory = async (id: number): Promise<void> => {
  await client.delete(`/categories/${id}`)
}