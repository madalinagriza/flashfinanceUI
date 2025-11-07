// Transaction API endpoints

import { apiClient } from './client'
import type {
  Transaction,
  ImportTransactionsRequest,
  MarkLabeledRequest,
  GetTransactionRequest,
  GetUnlabeledTransactionsRequest,
  GetTxInfoRequest,
  TransactionInfoResponse,
  TxIdResponse,
} from './types'

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }
  return null
}

const coerceString = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  return null
}

const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const coerceStatus = (value: unknown): Transaction['status'] => {
  if (value === 'LABELED' || value === 'UNLABELED') {
    return value
  }
  return 'UNLABELED'
}

const coerceTransaction = (value: Record<string, unknown>): Transaction | null => {
  const idSource =
    value.tx_id ?? value.txId ?? value.id ?? value._id ?? value.transaction_id ?? null
  const txId = coerceString(idSource)
  if (!txId) {
    return null
  }

  const ownerId = coerceString(value.owner_id ?? value.ownerId ?? value.user_id)
  const date =
    coerceString(value.date ?? value.tx_date ?? value.posted_date ?? value.created_at) || ''
  const merchant =
    coerceString(
      value.merchant_text ??
        value.merchant ??
        value.tx_merchant ??
        value.tx_name ??
        value.description
    ) || ''
  const amount = coerceNumber(value.amount ?? value.tx_amount ?? value.total)
  const status = coerceStatus(value.status)

  const base = value as Partial<Transaction>

  return {
    ...base,
    tx_id: txId,
    owner_id: ownerId ?? base.owner_id ?? null,
    date,
    merchant_text: merchant,
    amount,
    status,
  }
}

const unwrapTransactionEntry = (payload: unknown): Transaction | null => {
  if (payload == null) {
    return null
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const normalized = unwrapTransactionEntry(item)
      if (normalized) {
        return normalized
      }
    }
    return null
  }

  const record = asRecord(payload)
  if (!record) {
    return null
  }

  const nestedKeys = ['tx', 'transaction', 'value', 'data', 'item'] as const
  for (const key of nestedKeys) {
    if (key in record) {
      const nested = unwrapTransactionEntry(record[key])
      if (nested) {
        return nested
      }
    }
  }

  return coerceTransaction(record)
}

const unwrapTransactions = (payload: unknown): Transaction[] => {
  if (payload == null) {
    return []
  }

  if (Array.isArray(payload)) {
    const result: Transaction[] = []
    for (const item of payload) {
      const normalized = unwrapTransactionEntry(item)
      if (normalized) {
        result.push(normalized)
      }
    }
    return result
  }

  const record = asRecord(payload)
  if (!record) {
    return []
  }

  const collectionKeys = ['results', 'data', 'transactions', 'items', 'values'] as const
  for (const key of collectionKeys) {
    if (key in record) {
      return unwrapTransactions(record[key])
    }
  }

  const candidate = unwrapTransactionEntry(record)
  return candidate ? [candidate] : []
}

const parseDateValue = (raw: unknown): Date | null => {
  if (!raw) {
    return null
  }
  if (raw instanceof Date) {
    const time = raw.getTime()
    return Number.isNaN(time) ? null : raw
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) {
      return null
    }
    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof raw === 'number') {
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    const candidates: unknown[] = [
      record.date,
      record.$date,
      record.value,
      record.timestamp,
    ]

    for (const candidate of candidates) {
      const parsed = parseDateValue(candidate)
      if (parsed) {
        return parsed
      }
    }
  }
  return null
}

export const transactionApi = {
  /**
   * POST /api/Transaction/importTransactions
   * Parses a CSV file and converts its rows into new, unlabeled transactions owned by a user.
   */
  async importTransactions(request: ImportTransactionsRequest): Promise<Transaction[]> {
    // Prefer legacy underscore endpoint per current backend, fall back to camelCase
    const primary = '/Transaction/importTransactions'

      const resp = await apiClient.post<ImportTransactionsRequest, unknown>(primary, request)
      console.debug('transactionApi.importTransactions: used', primary)
      const parsed = unwrapTransactions(resp)
      const record = asRecord(resp)
      const recognizedWrapper = Array.isArray(record?.results) || record?.ok === true
      if (!parsed.length && !recognizedWrapper) {
        console.warn('transactionApi.importTransactions: unexpected response shape', resp)
      }
      return parsed
  },

  /**
   * POST /api/Transaction/mark_labeled
   * Sets a transaction's status to LABELED after verifying ownership.
   */
  async markLabeled(request: MarkLabeledRequest): Promise<TxIdResponse> {
    return apiClient.post<MarkLabeledRequest, TxIdResponse>('/Transaction/mark_labeled', request)
  },

  // /**
  //  * POST /api/Transaction/getTransaction
  //  * Retrieves a single transaction document by its ID.
  //  */
  // async getTransaction(request: GetTransactionRequest): Promise<Transaction[]> {
  //   const resp = await apiClient.post<GetTransactionRequest, unknown>(
  //     '/Transaction/getTransaction',
  //     request
  //   )
  //   const parsed = unwrapTransactions(resp)
  //   if (!parsed.length) {
  //     console.warn('transactionApi.getTransaction: unexpected response shape', resp)
  //   }
  //   return parsed
  // },

  /**
   * POST /api/Transaction/list_all
   * Returns all transaction documents in the system.
   */
  async listAll(): Promise<Transaction[]> {
    const resp = await apiClient.post<Record<string, never>, unknown>(
      '/Transaction/list_all',
      {}
    )
    const parsed = unwrapTransactions(resp)
    if (!parsed.length) {
      console.warn('transactionApi.listAll: unexpected response shape', resp)
    }
    return parsed
  },

  /**
   * POST /api/Transaction/get_unlabeled_transactions
   * Retrieves all unlabeled transactions belonging to a specific owner ID.
   */
  async getUnlabeledTransactions(request: GetUnlabeledTransactionsRequest): Promise<Transaction[]> {
    const primary = '/Transaction/get_unlabeled_transactions'
    const resp = await apiClient.post<GetUnlabeledTransactionsRequest, unknown>(
      primary,
      request
    )
    console.debug('transactionApi.getUnlabeledTransactions: used', primary)
    const parsed = unwrapTransactions(resp)
    const record = asRecord(resp)
    const recognizedWrapper = Array.isArray(record?.results)
    if (!parsed.length && !recognizedWrapper) {
      console.warn('transactionApi.getUnlabeledTransactions: unexpected response shape', resp)
    }
    return parsed
   
  },

  /**
   * POST /api/Transaction/getTxInfo
   * Retrieves the parsed info for a specific transaction.
   */
  async getTxInfo(request: GetTxInfoRequest): Promise<TransactionInfoResponse> {
    const primary = '/Transaction/getTxInfo'

    const normalizeTxInfo = (payload: unknown): TransactionInfoResponse | null => {
      if (payload == null) {
        return null
      }
      if (Array.isArray(payload)) {
        for (const item of payload) {
          const normalized = normalizeTxInfo(item)
          if (normalized) {
            return normalized
          }
        }
        return null
      }

      const record = asRecord(payload)
      if (!record) {
        return null
      }

      if ('txInfo' in record && record.txInfo != null) {
        const nested = normalizeTxInfo(record.txInfo)
        if (nested) {
          return nested
        }
      }

      const dateRaw =
        record.date ?? record.tx_date ?? record.transaction_date ?? record.posted_date
      const merchantRaw =
        record.merchant_text ??
        record.tx_merchant ??
        record.merchant ??
        record.description ??
        record.name
      const amountRaw = record.amount ?? record.tx_amount ?? record.total

      const merchant = coerceString(merchantRaw) ?? ''
      const amount = coerceNumber(amountRaw)
      const parsedDate = parseDateValue(dateRaw)

      return {
        date: parsedDate,
        merchant_text: merchant,
        amount,
      }
    }

    const coerceTxInfo = (payload: unknown): TransactionInfoResponse => {
      const normalized = normalizeTxInfo(payload)
      if (!normalized) {
        console.warn('transactionApi.getTxInfo: unexpected response shape', payload)
        return {
          date: null,
          merchant_text: '',
          amount: 0,
        }
      }
      return normalized
    }

      const response = await apiClient.post<GetTxInfoRequest, unknown>(primary, request)
      return coerceTxInfo(response)
  },
}
