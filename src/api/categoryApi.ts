// Category API endpoints

import { apiClient } from './client'
import type {
  CategoryNameOwner,
  CreateCategoryRequest,
  RenameCategoryRequest,
  DeleteCategoryRequest,
  CategoryIdResponse,
  OkResponse,
  GetCategoriesFromOwnerRequest,
  OwnerCategoryId,
  GetCategoryNameByIdRequest,
  CategoryNameResponse,
} from './types'

const resolveId = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.$oid === 'string') return obj.$oid
    if (typeof obj.value === 'string') return obj.value
    if (typeof obj.id === 'string') return obj.id
    if (typeof obj.category_id === 'string') return obj.category_id
    if (typeof obj.categoryId === 'string') return obj.categoryId
  }
  return null
}

const resolveName = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value) && value.length > 0) return resolveName(value[0])
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.name === 'string') return obj.name
    if (typeof obj.value === 'string') return obj.value
    if (typeof obj.label === 'string') return obj.label
  }
  return null
}

export const categoryApi = {
  /**
   * POST /api/Category/create
   * Creates a new category for a given user with a specified name.
   */
  async create(request: CreateCategoryRequest): Promise<CategoryIdResponse> {
    return apiClient.post<CreateCategoryRequest, CategoryIdResponse>('/Category/create', request)
  },

  /**
   * POST /api/Category/rename
   * Renames an existing category for a given user.
   */
  async rename(request: RenameCategoryRequest): Promise<CategoryIdResponse> {
    return apiClient.post<RenameCategoryRequest, CategoryIdResponse>('/Category/rename', request)
  },

  /**
   * POST /api/Category/delete
   * Deletes a category and its associated metrics, provided it's safe to delete.
   */
  async delete(request: DeleteCategoryRequest): Promise<OkResponse> {
    return apiClient.post<DeleteCategoryRequest, OkResponse>('/Category/delete', request)
  },

  /**
   * POST /api/Category/getCategoryNamesAndOwners
   * Retrieves a list of category names and owners for the specified user.
   */
  async getCategoryNamesAndOwners(owner_id: string): Promise<CategoryNameOwner[]> {
    const raw = await apiClient.post<{ owner_id: string }, any[]>(
      '/Category/getCategoryNamesAndOwners',
      { owner_id }
    )

    return (raw || [])
      .map((r: any) => {
        const categoryId = resolveId(r?.category_id) ?? resolveId(r?._id) ?? resolveId(r)
        if (!categoryId) return null

  const ownerValue = resolveId(r?.owner_id) ?? owner_id
  const nameValue = resolveName(r?.name) ?? ''

        return {
          category_id: categoryId,
          name: nameValue,
          owner_id: ownerValue,
        } as CategoryNameOwner
      })
      .filter((entry): entry is CategoryNameOwner => entry !== null)
  },

  /**
   * POST /api/Category/getCategoriesFromOwner
   * Returns the list of category ids for the specified owner.
   */
  async getCategoriesFromOwner(owner_id: string): Promise<OwnerCategoryId[]> {
    const raw = await apiClient.post<GetCategoriesFromOwnerRequest, any[]>(
      '/Category/getCategoriesFromOwner',
      { owner_id }
    )

    return (raw || [])
      .map((entry: any) => {
        const categoryId = resolveId(entry?.category_id) ?? resolveId(entry?._id) ?? resolveId(entry)
        return categoryId ? ({ category_id: categoryId } as OwnerCategoryId) : null
      })
      .filter((entry): entry is OwnerCategoryId => entry !== null)
  },

  /**
   * POST /api/Category/getCategoryNameById
   * Returns the stored name for a category id scoped to an owner.
   */
  async getCategoryNameById(request: GetCategoryNameByIdRequest): Promise<CategoryNameResponse> {
    return apiClient.post<GetCategoryNameByIdRequest, CategoryNameResponse>(
      '/Category/getCategoryNameById',
      request
    )
  },

  /**
   * Helper that combines getCategoriesFromOwner and getCategoryNameById to produce
   * full category records for the provided owner.
   */
  async getCategoriesWithNames(owner_id: string): Promise<CategoryNameOwner[]> {
    const idEntries = await this.getCategoriesFromOwner(owner_id)
    if (!Array.isArray(idEntries) || idEntries.length === 0) return []

    const categories = await Promise.all(
      idEntries.map(async ({ category_id }) => {
        const normalizedId = resolveId(category_id)
        if (!normalizedId) return null
        try {
          const response = await this.getCategoryNameById({ owner_id, category_id: normalizedId })
          const resolvedName = resolveName(response) ?? resolveName((response as any)?.name) ?? normalizedId
          return {
            category_id: normalizedId,
            name: resolvedName || normalizedId,
            owner_id,
          } as CategoryNameOwner
        } catch (err) {
          console.error('getCategoriesWithNames: failed to resolve name', normalizedId, err)
          return {
            category_id: normalizedId,
            name: normalizedId,
            owner_id,
          } as CategoryNameOwner
        }
      })
    )

    return categories.filter((entry): entry is CategoryNameOwner => entry !== null)
  },
}
