// TypeScript types for FlashFinance API

// ===== User Types =====
export interface User {
  user_id: string
  email: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
}

export interface AuthenticateRequest {
  email: string
  password: string
}

export interface DeactivateRequest {
  user_id: string
}

export interface ChangePasswordRequest {
  user_id: string
  old_password: string
  new_password: string
}

export interface ReactivateRequest {
  email: string
  new_password: string
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
  tx_id: string
}

export interface GetUnlabeledTransactionsRequest {
  owner_id: string
}

// ===== Category Types =====
export interface Category {
  category_id: string
  owner_id: string
  name: string
}

export interface CategoryNameOwner {
  category_id?: string
  name: string
  owner_id: string
}

export interface CategoryMetric {
  owner_id: string
  category_id: string
  period_start: string
  period_end: string
  current_total: number
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

export interface SetMetricTotalRequest {
  owner_id: string
  category_id: string
  period: {
    startDate: string
    endDate: string
  }
  total: number
}

export interface GetMetricRequest {
  owner_id: string
  category_id: string
  period: {
    startDate: string
    endDate: string
  }
}

export interface ListMetricsRequest {
  owner_id: string
  category_id: string
}

// ===== Label Types =====
export interface Label {
  _id: string
  user_id: string
  tx_id: string
  category_id: string
  created_at: string
}

export interface TransactionInfo {
  _id: string
  tx_name: string
  tx_merchant: string
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

export interface GetLabelRequest {
  user_id: string
  tx_id: string
}

export interface GetTxInfoRequest {
  user_id: string
  tx_id: string
}

export interface GetCategoryHistoryRequest {
  user_id: string
  category_id: string
}

export interface HasLabelsForCategoryRequest {
  user_id: string
  category_id: string
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
  has_labels: boolean
}
