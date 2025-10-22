// Label API endpoints

import { apiClient } from './client'
import type {
  Label,
  TransactionInfo,
  StageLabelRequest,
  FinalizeLabelRequest,
  CancelLabelRequest,
  UpdateLabelRequest,
  RemoveLabelRequest,
  GetLabelRequest,
  GetTxInfoRequest,
  GetCategoryHistoryRequest,
  HasLabelsForCategoryRequest,
  LabelTxIdResponse,
  HasLabelsResponse,
} from './types'

export const labelApi = {
  /**
   * POST /api/Label/stage
   * Creates a StagedLabel for a user and transaction, preparing it for finalization.
   */
  async stage(request: StageLabelRequest): Promise<LabelTxIdResponse> {
    return apiClient.post<StageLabelRequest, LabelTxIdResponse>('/Label/stage', request)
  },

  /**
   * POST /api/Label/finalize
   * Commits all staged labels for a user, turning them into permanent labels and history records.
   */
  async finalize(request: FinalizeLabelRequest): Promise<Record<string, never>> {
    return apiClient.post<FinalizeLabelRequest, Record<string, never>>('/Label/finalize', request)
  },

  /**
   * POST /api/Label/cancel
   * Deletes all staged labels for a user without committing them.
   */
  async cancel(request: CancelLabelRequest): Promise<Record<string, never>> {
    return apiClient.post<CancelLabelRequest, Record<string, never>>('/Label/cancel', request)
  },

  /**
   * POST /api/Label/update
   * Changes the category of an existing label for a specific transaction.
   */
  async update(request: UpdateLabelRequest): Promise<LabelTxIdResponse> {
    return apiClient.post<UpdateLabelRequest, LabelTxIdResponse>('/Label/update', request)
  },

  /**
   * POST /api/Label/remove
   * Reassigns a transaction's label to the user's built-in Trash category.
   */
  async remove(request: RemoveLabelRequest): Promise<LabelTxIdResponse> {
    return apiClient.post<RemoveLabelRequest, LabelTxIdResponse>('/Label/remove', request)
  },

  /**
   * POST /api/Label/getLabel
   * Returns the label document for the given user and transaction.
   */
  async getLabel(request: GetLabelRequest): Promise<Label[]> {
    return apiClient.post<GetLabelRequest, Label[]>('/Label/getLabel', request)
  },

  /**
   * POST /api/Label/getTxInfo
   * Returns the transaction info document for the given user and transaction.
   */
  async getTxInfo(request: GetTxInfoRequest): Promise<TransactionInfo[]> {
    return apiClient.post<GetTxInfoRequest, TransactionInfo[]>('/Label/getTxInfo', request)
  },

  /**
   * POST /api/Label/getCategoryHistory
   * Returns a list of transaction IDs associated with a specific category for a user.
   */
  async getCategoryHistory(request: GetCategoryHistoryRequest): Promise<string[]> {
    return apiClient.post<GetCategoryHistoryRequest, string[]>(
      '/Label/getCategoryHistory',
      request
    )
  },

  /**
   * POST /api/Label/all
   * Returns all label documents.
   */
  async all(): Promise<Label[]> {
    return apiClient.post<Record<string, never>, Label[]>('/Label/all', {})
  },

  /**
   * POST /api/Label/hasAnyLabelsForCategory
   * Returns true if any labels exist for the given user and category, false otherwise.
   */
  async hasAnyLabelsForCategory(request: HasLabelsForCategoryRequest): Promise<HasLabelsResponse[]> {
    return apiClient.post<HasLabelsForCategoryRequest, HasLabelsResponse[]>(
      '/Label/hasAnyLabelsForCategory',
      request
    )
  },
}
