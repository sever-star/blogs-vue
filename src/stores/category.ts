import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Category } from '@/types'
import { getCategories } from '@/api/category'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  const categoryList = computed(() => categories.value)
  const categoryOptions = computed(() =>
    categories.value.map(cat => ({
      label: cat.name,
      value: cat.id,
      data: cat
    }))
  )

  async function fetchCategories(force = false) {
    if (categories.value.length > 0 && !force) return

    loading.value = true
    try {
      categories.value = await getCategories()
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      loading.value = false
    }
  }

  function getCategoryById(id: number): Category | undefined {
    return categories.value.find(cat => cat.id === id)
  }

  function getCategoryName(id: number | undefined): string {
    if (!id) return '未分类'
    const category = getCategoryById(id)
    return category?.name || '未分类'
  }

  function clearCategories() {
    categories.value = []
  }

  return {
    categories,
    loading,
    categoryList,
    categoryOptions,
    fetchCategories,
    getCategoryById,
    getCategoryName,
    clearCategories
  }
})