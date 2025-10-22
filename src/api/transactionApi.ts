// Transaction API endpoints

import { apiClient } from './client'
import type {
  Transaction,
  ImportTransactionsRequest,
  MarkLabeledRequest,
  GetTransactionRequest,
  GetUnlabeledTransactionsRequest,
  TxIdResponse,
} from './types'

export const transactionApi = {
  /**
   * POST /api/Transaction/importTransactions
   * Parses a CSV file and converts its rows into new, unlabeled transactions owned by a user.
   */
  async importTransactions(request: ImportTransactionsRequest): Promise<Transaction[]> {
    // Prefer legacy underscore endpoint per current backend, fall back to camelCase
    const primary = '/Transaction/import_transactions'
    const fallback = '/Transaction/importTransactions'

    try {
      const resp = await apiClient.post<ImportTransactionsRequest, unknown>(primary, request)
      console.debug('transactionApi.importTransactions: used', primary)
      return Array.isArray(resp) ? (resp as Transaction[]) : []
    } catch (err: any) {
      // If primary fails for any reason, try fallback
      console.warn(`importTransactions primary endpoint ${primary} failed (${String(err?.message)}), trying fallback ${fallback}`)
      const resp2 = await apiClient.post<ImportTransactionsRequest, unknown>(fallback, request)
      console.debug('transactionApi.importTransactions: used', fallback)
      return Array.isArray(resp2) ? (resp2 as Transaction[]) : []
    }
  },

  /**
   * POST /api/Transaction/mark_labeled
   * Sets a transaction's status to LABELED after verifying ownership.
   */
  async markLabeled(request: MarkLabeledRequest): Promise<TxIdResponse> {
    return apiClient.post<MarkLabeledRequest, TxIdResponse>('/Transaction/mark_labeled', request)
  },

  /**
   * POST /api/Transaction/getTransaction
   * Retrieves a single transaction document by its ID.
   */
  async getTransaction(request: GetTransactionRequest): Promise<Transaction[]> {
    return apiClient.post<GetTransactionRequest, Transaction[]>(
      '/Transaction/getTransaction',
      request
    )
  },

  /**
   * POST /api/Transaction/list_all
   * Returns all transaction documents in the system.
   */
  async listAll(): Promise<Transaction[]> {
    return apiClient.post<Record<string, never>, Transaction[]>('/Transaction/list_all', {})
  },

  /**
   * POST /api/Transaction/get_unlabeled_transactions
   * Retrieves all unlabeled transactions belonging to a specific owner ID.
   */
  async getUnlabeledTransactions(request: GetUnlabeledTransactionsRequest): Promise<Transaction[]> {
    const primary = '/Transaction/get_unlabeled_transactions'
    const fallback = '/Transaction/getUnlabeledTransactions'
    try {
      const resp = await apiClient.post<GetUnlabeledTransactionsRequest, Transaction[]>(primary, request)
      console.debug('transactionApi.getUnlabeledTransactions: used', primary)
      return resp
    } catch (err: any) {
      console.warn(`getUnlabeledTransactions primary endpoint ${primary} failed (${String(err?.message)}), trying fallback ${fallback}`)
      const resp2 = await apiClient.post<GetUnlabeledTransactionsRequest, Transaction[]>(fallback, request)
      console.debug('transactionApi.getUnlabeledTransactions: used', fallback)
      return resp2
    }
  },
}
