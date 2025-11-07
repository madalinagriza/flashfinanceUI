// TypeScript types for FlashFinance API

// ===== User Types =====
export interface User {
  user_id: string | null
  username: string
  status?: 'ACTIVE' | 'INACTIVE'
  session: string | null
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
  session: string
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
  owner_id?: string | null
  date: string
  merchant_text: string
  amount: number
  status: 'UNLABELED' | 'LABELED'
}

export interface ImportTransactionsRequest {
  session: string
  fileContent: string
}

export interface MarkLabeledRequest {
  tx_id: string
  session: string
}

export interface GetTransactionRequest {
  session: string
  tx_id: string
}

export interface GetUnlabeledTransactionsRequest {
  session: string
}

export interface GetTxInfoRequest {
  session: string
  tx_id: string
}

export interface TransactionInfoResponse {
  date: Date | null
  merchant_text: string
  amount: number
}

// ===== Category Types =====
export interface Category {
  category_id: string
  owner_id?: string | null
  name: string
}

export interface CategoryNameOwner {
  category_id: string
  name: string
  owner_id?: string | null
}

export interface CreateCategoryRequest {
  session: string
  name: string
}

export interface RenameCategoryRequest {
  session: string
  category_id: string
  new_name: string
}

export interface DeleteCategoryRequest {
  session: string
  category_id: string
}

export interface GetCategoriesFromOwnerRequest {
  session: string
}

export interface OwnerCategoryId {
  category_id: string
  name?: string | null
  owner_id?: string | null
}

export interface GetCategoryNameByIdRequest {
  session: string
  category_id: string
}

export interface CategoryNameResponse {
  name: string
}

export interface AddCategoryTransactionRequest {
  session: string
  category_id: string
  tx_id: string
  amount: number
  tx_date: string
}

export interface RemoveCategoryTransactionRequest {
  session: string
  category_id: string
  tx_id: string
}

export interface UpdateCategoryTransactionRequest {
  session: string
  tx_id: string
  old_category_id: string
  new_category_id: string
}

export interface MoveTransactionToTrashRequest {
  session: string
  from_category_id: string
  tx_id: string
}

export interface ListCategoryTransactionsRequest {
  session: string
  category_id: string
  category_name?: string
}

export interface CategoryTransactionEntry {
  tx_id: string
  amount: number
  tx_date: string
  category_name?: string | null
}

export interface CategoryMetricPeriod {
  startDate: string
  endDate: string
}

export interface GetCategoryMetricStatsRequest {
  session: string
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
  session: string
  tx_id: string
  tx_name: string
  tx_merchant: string
  category_id: string
}

export interface FinalizeLabelRequest {
  session: string
}

export interface FinalizeLabelResponse {
  message?: string
  finalized?: number
  staged?: number
  [key: string]: unknown
}

export interface CancelLabelRequest {
  session: string
}

export interface UpdateLabelRequest {
  session: string
  tx_id: string
  new_category_id: string
}

export interface RemoveLabelRequest {
  session: string
  tx_id: string
}

export interface DiscardLabelRequest {
  session: string
  tx_id: string
  tx_name: string
  tx_merchant: string
}

export interface GetLabelRequest {
  session: string
  tx_id: string
}

// export interface GetCategoryHistoryRequest {
//   user_id: string
//   category_id: string
// }

export interface HasLabelsForCategoryRequest {
  session: string
  category_id: string
}

export interface GetStagedLabelsRequest {
  session: string
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
  session: string
}

export interface SuggestLabelRequest {
  session: string
  allCategories?: [string, string][]
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
