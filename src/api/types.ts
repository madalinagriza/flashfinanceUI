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
  date: string
  merchant_text: string
  amount: number
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

export interface GetLabelRequest {
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
