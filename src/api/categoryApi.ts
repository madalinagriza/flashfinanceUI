// Category API endpoints

import { apiClient } from './client'
import type {
  CategoryNameOwner,
  CategoryMetric,
  CreateCategoryRequest,
  RenameCategoryRequest,
  DeleteCategoryRequest,
  SetMetricTotalRequest,
  GetMetricRequest,
  ListMetricsRequest,
  CategoryIdResponse,
  OkResponse,
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
   * POST /api/Category/set_metric_total
   * Creates or updates a category metric's total for a specific period.
   */
  async setMetricTotal(request: SetMetricTotalRequest): Promise<OkResponse> {
    return apiClient.post<SetMetricTotalRequest, OkResponse>('/Category/set_metric_total', request)
  },

  /**
   * POST /api/Category/getCategoryNamesAndOwners
   * Retrieves a list of all category names and their owners.
   */
  async getCategoryNamesAndOwners(): Promise<CategoryNameOwner[]> {
    const raw = await apiClient.post<Record<string, never>, any[]>(
      '/Category/getCategoryNamesAndOwners',
      {}
    )

    // Helper to extract string owner id from various shapes
    const extractOwnerId = (v: any): string | null => {
      if (v == null) return null
      if (typeof v === 'string') return v
      if (typeof v === 'object') {
        if (typeof v.value === 'string') return v.value
        if (typeof v.value === 'object' && typeof v.value.value === 'string') return v.value.value
      }
      // fallback to string coercion
      try { return String(v) } catch { return null }
    }

    const extractCategoryId = (r: any): string | undefined => {
      if (!r) return undefined
      if (typeof r.category_id === 'string') return r.category_id
      if (r._id && typeof r._id === 'string') return r._id
      return undefined
    }

    return (raw || []).map((r: any) => ({
      category_id: extractCategoryId(r),
      name: r.name,
      owner_id: extractOwnerId(r.owner_id) || ''
    })) as CategoryNameOwner[]
  },

  /**
   * POST /api/Category/getMetric
   * Retrieves a specific category metric document for a given owner, category, and period.
   */
  async getMetric(request: GetMetricRequest): Promise<CategoryMetric[]> {
    return apiClient.post<GetMetricRequest, CategoryMetric[]>('/Category/getMetric', request)
  },

  /**
   * POST /api/Category/listMetrics
   * Lists all category metrics for a given owner and category, sorted by period start date.
   */
  async listMetrics(request: ListMetricsRequest): Promise<CategoryMetric[]> {
    return apiClient.post<ListMetricsRequest, CategoryMetric[]>('/Category/listMetrics', request)
  },
}
