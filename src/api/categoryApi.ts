// Category API endpoints

import { apiClient } from './client'
import { normalizeId, normalizeString } from '../utils/normalize'
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
  AddCategoryTransactionRequest,
  RemoveCategoryTransactionRequest,
  MoveTransactionToTrashRequest,
  ListCategoryTransactionsRequest,
  CategoryTransactionEntry,
  GetCategoryMetricStatsRequest,
  CategoryMetricStatsResponse,
} from './types'

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
        const categoryId = normalizeId(r?.category_id) ?? normalizeId(r?._id) ?? normalizeId(r)
        if (!categoryId) return null
        const ownerValue = normalizeId(r?.owner_id) ?? owner_id
        const nameValue = normalizeString(r?.name) ?? ''

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
        const categoryId = normalizeId(entry?.category_id) ?? normalizeId(entry?._id) ?? normalizeId(entry)
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
   * POST /api/Category/addTransaction
   * Adds a transaction record for category metrics tracking.
   */
  async addTransaction(request: AddCategoryTransactionRequest): Promise<OkResponse> {
    return apiClient.post<AddCategoryTransactionRequest, OkResponse>('/Category/addTransaction', request)
  },

  /**
   * POST /api/Category/removeTransaction
   * Removes a transaction record from category metrics tracking.
   */
  async removeTransaction(request: RemoveCategoryTransactionRequest): Promise<OkResponse> {
    return apiClient.post<RemoveCategoryTransactionRequest, OkResponse>('/Category/removeTransaction', request)
  },

  /**
   * POST /api/Category/moveTransactionToTrash
   * Moves a recorded transaction from a category into the built-in Trash bucket.
   */
  async moveTransactionToTrash(request: MoveTransactionToTrashRequest): Promise<OkResponse> {
    return apiClient.post<MoveTransactionToTrashRequest, OkResponse>('/Category/moveTransactionToTrash', request)
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
        const normalizedId = normalizeId(category_id)
        if (!normalizedId) return null
        try {
          const response = await this.getCategoryNameById({ owner_id, category_id: normalizedId })
          const resolvedName = normalizeString(response) ?? normalizeString((response as any)?.name) ?? normalizedId
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

  async listTransactions(payload: ListCategoryTransactionsRequest): Promise<CategoryTransactionEntry[]> {
    const res = await apiClient.post('/Category/listTransactions', payload)
    return Array.isArray(res) ? (res as CategoryTransactionEntry[]) : []
  },

  async getMetricStats(payload: GetCategoryMetricStatsRequest): Promise<CategoryMetricStatsResponse | null> {
    const res = await apiClient.post('/Category/getMetricStats', payload)
    if (res && typeof res === 'object' && 'total_amount' in res) {
      return res as CategoryMetricStatsResponse
    }
    return null
  },
}
