// TypeScript types for FlashFinance API

// ===== User Types =====
export interface User {
  user_id: string
  username: string
  status?: 'ACTIVE' | 'INACTIVE'
  session?: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface AuthenticateRequest {
  username: string
  password: string
}

// export interface DeactivateRequest {
//   user_id: string
// }

export interface ChangePasswordRequest {
  user: string
  oldPassword: string
  newPassword: string
}

export interface LogoutRequest {
  session: string
}

// export interface ReactivateRequest {
//   email: string
//   new_password: string
// }

export interface UserAuthenticationResponse {
  user: string
}

export interface LoginResponse {
  session: string
}

export interface LogoutResponse {
  status: 'logged_out'
}

// ===== Transaction Types =====
export interface Transaction {
  tx_id: string
  owner_id: string
  date: string
  merchant_text: string
  amount: number
  status: 'UNLABELED' | 'LABELED'
}

export interface ImportTransactionsRequest {
  owner_id: string
  fileContent: string
}

export interface MarkLabeledRequest {
  tx_id: string
  requester_id: string
}

export interface GetTransactionRequest {
  owner_id: string
  tx_id: string
}

export interface GetUnlabeledTransactionsRequest {
  owner_id: string
}

export interface GetTxInfoRequest {
  owner_id: string
  tx_id: string
}

export interface TransactionInfoResponse {
  date?: string
  merchant_text?: string
  amount?: number
  tx_name?: string
  tx_merchant?: string
}

// ===== Category Types =====
export interface Category {
  category_id: string
  owner_id: string
  name: string
}

export interface CategoryNameOwner {
  category_id: string
  name: string
  owner_id: string
}

export interface CreateCategoryRequest {
  owner_id: string
  name: string
}

export interface RenameCategoryRequest {
  owner_id: string
  category_id: string
  new_name: string
}

export interface DeleteCategoryRequest {
  owner_id: string
  category_id: string
  can_delete: boolean
}

export interface GetCategoriesFromOwnerRequest {
  owner_id: string
}

export interface OwnerCategoryId {
  category_id: string
}

export interface GetCategoryNameByIdRequest {
  owner_id: string
  category_id: string
}

export interface CategoryNameResponse {
  name: string
}

export interface AddCategoryTransactionRequest {
  owner_id: string
  category_id: string
  tx_id: string
  amount: number
  tx_date: string
}

export interface RemoveCategoryTransactionRequest {
  owner_id: string
  category_id: string
  tx_id: string
}

export interface UpdateCategoryTransactionRequest {
  owner_id: string
  tx_id: string
  old_category_id: string
  new_category_id: string
}

export interface MoveTransactionToTrashRequest {
  owner_id: string
  from_category_id: string
  tx_id: string
}

export interface ListCategoryTransactionsRequest {
  owner_id: string
  category_id: string
}

export interface CategoryTransactionEntry {
  tx_id: string
  amount: number
  tx_date: string
}

export interface CategoryMetricPeriod {
  startDate: string
  endDate: string
}

export interface GetCategoryMetricStatsRequest {
  owner_id: string
  category_id: string
  period: CategoryMetricPeriod
}

export interface CategoryMetricStats {
  total_amount: number
  transaction_count: number
  average_per_day: number
  days: number
}

export type CategoryMetricStatsResponse = CategoryMetricStats[]

// ===== Label Types =====
export interface Label {
  _id: string
  user_id: string
  tx_id: string
  category_id: string
  created_at: string
}

export interface StageLabelRequest {
  user_id: string
  tx_id: string
  tx_name: string
  tx_merchant: string
  category_id: string
}

export interface FinalizeLabelRequest {
  user_id: string
}

export interface CancelLabelRequest {
  user_id: string
}

export interface UpdateLabelRequest {
  user_id: string
  tx_id: string
  new_category_id: string
}

export interface RemoveLabelRequest {
  user_id: string
  tx_id: string
}

export interface DiscardLabelRequest {
  user_id: string
  tx_id: string
  tx_name: string
  tx_merchant: string
}

export interface GetLabelRequest {
  user_id: string
  tx_id: string
}

// export interface GetCategoryHistoryRequest {
//   user_id: string
//   category_id: string
// }

export interface HasLabelsForCategoryRequest {
  user_id: string
  category_id: string
}

export interface GetStagedLabelsRequest {
  user_id: string
}

export interface StagedLabel {
  _id?: string
  user_id: string
  category_id: string
  tx_id: string
  tx_name?: string
  tx_merchant?: string
  staged_at?: string
}

// ===== Response Types =====
export interface ApiError {
  error: string
}

export interface CategoryIdResponse {
  category_id: string
}

export interface OkResponse {
  ok: boolean
}

export interface LabelTxIdResponse {
  label_tx_id: string
}

export interface TxIdResponse {
  tx_id: string
}

export interface HasLabelsResponse {
  result: boolean
}

export interface ListLabelsRequest {
  user_id: string
}

export interface SuggestLabelRequest {
  user_id: string
  allCategories: [string, string][]
  txInfo: {
    tx_id: string
    tx_name: string
    tx_merchant: string
  }
}

export interface SuggestLabelResponse {
  id: string
  name: string
}

// ===== File Upload Types =====
export interface UploadFileRequest {
  owner: string
  name: string
  content: string
}

export interface UploadFileResponse {
  file: string
}
