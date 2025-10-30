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

let latestMetricStatsRaw: unknown = null

export const categoryApi = {
  getLatestMetricStatsRaw(): unknown {
    return latestMetricStatsRaw
  },

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

  async getMetricStats(payload: GetCategoryMetricStatsRequest): Promise<CategoryMetricStatsResponse> {
    const res = await apiClient.post('/Category/getMetricStats', payload)
    latestMetricStatsRaw = res
    console.debug('categoryApi.getMetricStats raw response:', res)

    const parseNumericValue = (raw: unknown, fallback = 0): number => {
      if (raw == null) return fallback
      if (typeof raw === 'number') return Number.isFinite(raw) ? raw : fallback
      if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (!trimmed) return fallback
        const coerced = Number(trimmed)
        return Number.isFinite(coerced) ? coerced : fallback
      }
      if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>
        const nestedCandidates: unknown[] = [
          obj.$numberDecimal,
          obj.$numberDouble,
          obj.$numberInt,
          obj.$numberLong,
          obj.value,
          obj.amount,
        ]

        for (const candidate of nestedCandidates) {
          const parsed = parseNumericValue(candidate, NaN)
          if (Number.isFinite(parsed)) return parsed
        }

        if (Array.isArray(raw)) {
          for (const entry of raw) {
            const parsed = parseNumericValue(entry, NaN)
            if (Number.isFinite(parsed)) return parsed
          }
        }
      }

      return fallback
    }

    const normalizeMetrics = (value: any): CategoryMetricStatsResponse | null => {
      if (!value || typeof value !== 'object') return null

      return {
        total_amount: parseNumericValue((value as any).total_amount),
        transaction_count: parseNumericValue((value as any).transaction_count),
        average_per_day: parseNumericValue((value as any).average_per_day),
        days: parseNumericValue((value as any).days, 0),
      }
    }

    if (Array.isArray(res)) {
      for (const entry of res) {
        const normalized = normalizeMetrics(entry)
        if (normalized) return normalized
      }
      console.warn('getMetricStats: array response without usable metrics', res)
      return {
        total_amount: 0,
        transaction_count: 0,
        average_per_day: 0,
        days: 0,
      }
    }

    const direct = normalizeMetrics(res)
    if (direct) return direct

    console.warn('getMetricStats: unexpected response shape', res)
    return {
      total_amount: 0,
      transaction_count: 0,
      average_per_day: 0,
      days: 0,
    }
  },
}
