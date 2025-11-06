// Label API endpoints

import { apiClient } from './client'
import type {
  Label,
  StageLabelRequest,
  FinalizeLabelRequest,
  CancelLabelRequest,
  UpdateLabelRequest,
  RemoveLabelRequest,
  DiscardLabelRequest,
  GetLabelRequest,
  GetStagedLabelsRequest,
  StagedLabel,
  // GetCategoryHistoryRequest,
  HasLabelsForCategoryRequest,
  SuggestLabelRequest,
  LabelTxIdResponse,
  HasLabelsResponse,
  SuggestLabelResponse,
  ListLabelsRequest,
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
   * POST /api/Label/discardUnstagedToTrash
   * Stages a transaction to be moved to the built-in Trash category.
   */
  async discard(request: DiscardLabelRequest): Promise<LabelTxIdResponse> {
    return apiClient.post<DiscardLabelRequest, LabelTxIdResponse>('/Label/discardUnstagedToTrash', request)
  },

  /**
   * POST /api/Label/finalize
   * Commits all staged labels for a user, turning them into permanent labels and history records.
   */
  async finalize(request: FinalizeLabelRequest): Promise<Record<string, never>> {
    return apiClient.post<FinalizeLabelRequest, Record<string, never>>('/Label/finalize', request)
  },

  /**
   * POST /api/Label/cancelSession
   * Deletes all staged labels for a user without committing them.
   */
  async cancel(request: CancelLabelRequest): Promise<Record<string, never>> {
    return apiClient.post<CancelLabelRequest, Record<string, never>>('/Label/cancelSession', request)
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
    return apiClient.post<RemoveLabelRequest, LabelTxIdResponse>('/Label/removeCommittedLabel', request)
  },

  /**
   * POST /api/Label/getLabel
   * Returns the label document for the given user and transaction.
   */
  async getStagedLabels(request: GetStagedLabelsRequest): Promise<StagedLabel[]> {
    return apiClient.post<GetStagedLabelsRequest, StagedLabel[]>('/Label/getStagedLabels', request)
  },
  async getLabel(request: GetLabelRequest): Promise<Label[]> {
    return apiClient.post<GetLabelRequest, Label[]>('/Label/getLabel', request)
  },

  // /**
  //  * POST /api/Label/getCategoryHistory
  //  * Returns a list of transaction IDs associated with a specific category for a user.
  //  */
  // async getCategoryHistory(request: GetCategoryHistoryRequest): Promise<string[]> {
  //   return apiClient.post<GetCategoryHistoryRequest, string[]>(
  //     '/Label/getCategoryHistory',
  //     request
  //   )
  // },

  /**
   * POST /api/Label/all
   * Returns all label documents.
   */
  async all(request: ListLabelsRequest): Promise<Label[]> {
    return apiClient.post<ListLabelsRequest, Label[]>('/Label/all', request)
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

  /**
   * POST /api/Label/suggest
   * Returns an AI-suggested category for a transaction, without modifying any state.
   */
  async suggest(request: SuggestLabelRequest): Promise<SuggestLabelResponse> {
    return apiClient.post<SuggestLabelRequest, SuggestLabelResponse>('/Label/suggest', request)
  },
}
