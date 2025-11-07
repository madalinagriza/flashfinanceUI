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
  CategoryMetricStats,
  CategoryMetricStatsResponse,
  UpdateCategoryTransactionRequest,
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

  // /**
  //  * POST /api/Category/getCategoryNamesAndOwners
  //  * Retrieves a list of category names and owners for the specified user.
  //  */
  // async getCategoryNamesAndOwners(owner_id: string): Promise<CategoryNameOwner[]> {
  //   const raw = await apiClient.post<{ owner_id: string }, any[]>(
  //     '/Category/getCategoryNamesAndOwners',
  //     { owner_id }
  //   )

  //   return (raw || [])
  //     .map((r: any) => {
  //       const categoryId = normalizeId(r?.category_id) ?? normalizeId(r?._id) ?? normalizeId(r)
  //       if (!categoryId) return null
  //       const ownerValue = normalizeId(r?.owner_id) ?? owner_id
  //       const nameValue = normalizeString(r?.name) ?? ''

  //       return {
  //         category_id: categoryId,
  //         name: nameValue,
  //         owner_id: ownerValue,
  //       } as CategoryNameOwner
  //     })
  //     .filter((entry): entry is CategoryNameOwner => entry !== null)
  // },

  /**
   * POST /api/Category/getCategoriesFromOwner
   * Returns the list of category ids for the specified owner.
   */
  async getCategoriesFromOwner(session: string): Promise<OwnerCategoryId[]> {
    const response = await apiClient.post<GetCategoriesFromOwnerRequest, unknown>(
      '/Category/getCategoriesFromOwner',
      { session }
    )

    const resolveEntries = (value: unknown): any[] => {
      if (Array.isArray(value)) {
        return value
      }
      if (value && typeof value === 'object') {
        const container = value as Record<string, unknown>
        const preferred = container.results ?? container.data ?? container.value
        if (Array.isArray(preferred)) {
          return preferred
        }
      }
      return []
    }

    const rawEntries = resolveEntries(response)

    if (!Array.isArray(rawEntries)) {
      console.warn('categoryApi.getCategoriesFromOwner: unexpected response shape', response)
      return []
    }

    return rawEntries
      .map((entry: any) => {
        const categoryId = normalizeId(entry?.category_id) ?? normalizeId(entry?._id) ?? normalizeId(entry)
        if (!categoryId) return null
        const ownerId = normalizeId(entry?.owner_id) ?? null
        const name = normalizeString(entry?.name) ?? null
        return {
          category_id: categoryId,
          owner_id: ownerId,
          name,
        } as OwnerCategoryId
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
   * POST /api/Category/updateTransaction
   * Moves a transaction between categories for the same owner.
   */
  async updateTransaction(request: UpdateCategoryTransactionRequest): Promise<OkResponse> {
    const primary = '/Category/updateTransaction'
    
      return await apiClient.post<UpdateCategoryTransactionRequest, OkResponse>(primary, request)
   
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
  async getCategoriesWithNames(session: string): Promise<CategoryNameOwner[]> {
    const idEntries = await this.getCategoriesFromOwner(session)
    if (!Array.isArray(idEntries) || idEntries.length === 0) return []

    const categories = await Promise.all(
      idEntries.map(async (entry) => {
        const normalizedId = normalizeId(entry.category_id)
        if (!normalizedId) return null

        const existingName = normalizeString((entry as any)?.name)
        if (existingName) {
          return {
            category_id: normalizedId,
            name: existingName,
            owner_id: normalizeId((entry as any)?.owner_id) ?? undefined,
          } as CategoryNameOwner
        }
        try {
          const response = await this.getCategoryNameById({ session, category_id: normalizedId })
          const resolvedName = normalizeString(response) ?? normalizeString((response as any)?.name) ?? normalizedId
          return {
            category_id: normalizedId,
            name: resolvedName || normalizedId,
            owner_id: normalizeId((entry as any)?.owner_id) ?? undefined,
          } as CategoryNameOwner
        } catch (err) {
          console.error('getCategoriesWithNames: failed to resolve name', normalizedId, err)
          return {
            category_id: normalizedId,
            name: normalizedId,
            owner_id: normalizeId((entry as any)?.owner_id) ?? undefined,
          } as CategoryNameOwner
        }
      })
    )

    return categories.filter((entry): entry is CategoryNameOwner => entry !== null)
  },

  async listTransactions(payload: ListCategoryTransactionsRequest): Promise<CategoryTransactionEntry[]> {
    const response = await apiClient.post<ListCategoryTransactionsRequest, unknown>(
      '/Category/listTransactions',
      payload
    )

    const fallbackCategoryName = normalizeString((payload as any)?.category_name) ?? null

    const toArray = (value: unknown): unknown[] => {
      if (Array.isArray(value)) {
        return value
      }
      if (value && typeof value === 'object') {
        const container = value as Record<string, unknown>
        const nested = container.results ?? container.data ?? container.transactions ?? container.items
        if (Array.isArray(nested)) {
          return nested
        }
        if (nested && typeof nested === 'object') {
          return [nested]
        }
      }
      return value == null ? [] : [value]
    }

    const parseAmount = (raw: unknown): number => {
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
      }
      if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (trimmed) {
          const parsed = Number(trimmed)
          if (Number.isFinite(parsed)) {
            return parsed
          }
        }
      }
      return 0
    }

    const parseDate = (raw: unknown): string => {
      if (raw == null) {
        return ''
      }
      if (typeof raw === 'string') {
        return raw
      }
      if (raw instanceof Date) {
        return raw.toISOString()
      }
      const coerced = new Date(String(raw))
      return Number.isNaN(coerced.getTime()) ? '' : coerced.toISOString()
    }

    const normalizeEntry = (entry: unknown): CategoryTransactionEntry | null => {
      if (!entry) return null
      const record =
        entry && typeof entry === 'object' && 'tx' in (entry as Record<string, unknown>)
          ? ((entry as Record<string, unknown>).tx as Record<string, unknown>)
          : (entry as Record<string, unknown> | null)

      if (!record) return null

      const txId = normalizeId(
        record.tx_id ?? record.txId ?? record.id ?? record._id ?? (entry as any)?.tx_id
      )
      if (!txId) {
        return null
      }

      const amount = parseAmount(record.amount ?? record.tx_amount ?? record.total)
      const dateRaw = record.tx_date ?? record.date ?? record.transaction_date
      const categoryName = normalizeString(
        record.category_name ??
          record.category ??
          record.name ??
          (entry as any)?.category_name ??
          fallbackCategoryName
      )

      return {
        tx_id: txId,
        amount,
        tx_date: parseDate(dateRaw),
        category_name: categoryName,
      }
    }

    const normalized = toArray(response)
      .map(normalizeEntry)
      .filter((entry): entry is CategoryTransactionEntry => entry !== null)

    if (normalized.length === 0 && Array.isArray(response) && response.length > 0) {
      console.warn('categoryApi.listTransactions: failed to normalize response entries', response)
    }

    return normalized
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

  const normalizeMetrics = (value: any): CategoryMetricStats | null => {
      if (!value || typeof value !== 'object') return null

      return {
        total_amount: parseNumericValue((value as any).total_amount),
        transaction_count: parseNumericValue((value as any).transaction_count),
        average_per_day: parseNumericValue((value as any).average_per_day),
        days: parseNumericValue((value as any).days, 0),
      }
    }

    const normalizedList: CategoryMetricStatsResponse = []

    const pushNormalized = (candidate: unknown) => {
      let effective = candidate
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        const container = candidate as Record<string, unknown>
        if (container.stats) {
          effective = container.stats
        }
      }

      const normalized = normalizeMetrics(effective)
      if (normalized) {
        normalizedList.push(normalized)
      }
    }

    const resolveEntries = (value: unknown): unknown[] => {
      if (Array.isArray(value)) {
        return value
      }
      if (value && typeof value === 'object') {
        const container = value as Record<string, unknown>
        const nested = container.results ?? container.data ?? container.value ?? container.metrics
        if (Array.isArray(nested)) {
          return nested
        }
        if (nested && typeof nested === 'object') {
          return [nested]
        }
      }
      return value == null ? [] : [value]
    }

    resolveEntries(res).forEach(pushNormalized)

    if (normalizedList.length === 0) {
      console.warn('getMetricStats: response without usable metrics entries', res)
      normalizedList.push({
        total_amount: 0,
        transaction_count: 0,
        average_per_day: 0,
        days: 0,
      })
    }

    return normalizedList
  },
}
