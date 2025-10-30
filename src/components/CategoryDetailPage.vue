<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { categoryApi, labelApi, transactionApi } from '../api'
import { normalizeId } from '../utils/normalize'
import type {
  CategoryNameOwner,
  CategoryTransactionEntry,
  CategoryMetricStatsResponse,
  TransactionInfoResponse,
  User,
} from '../api'

type CategoryHistoryRow = CategoryTransactionEntry & { display_name?: string }

const props = defineProps<{
  user: User | null
  category: CategoryNameOwner | null
}>()

const emit = defineEmits<{
  (e: 'navigate', page: string): void
}>()

const transactionsState = reactive<
  | { status: 'idle' | 'loading' }
  | { status: 'loaded'; data: CategoryHistoryRow[] }
  | { status: 'error'; error: string }
>({ status: 'idle' })

const transactionsRaw = ref('')

const metricsState = reactive<
  | { status: 'idle' | 'loading' }
  | { status: 'loaded'; data: CategoryMetricStatsResponse }
  | { status: 'error'; error: string }
>({ status: 'idle' })

const metricsRaw = ref('')
const metricsFilterError = ref<string | null>(null)

const DEFAULT_METRICS_END = '2025-10-30'
const DEFAULT_METRICS_START = '2024-10-30'

const metricsStartDate = ref('')
const metricsEndDate = ref('')

const initializeMetricsPeriod = () => {
  metricsStartDate.value = DEFAULT_METRICS_START
  metricsEndDate.value = DEFAULT_METRICS_END
  metricsFilterError.value = null
}

const buildPeriod = () => {
  if (!metricsStartDate.value || !metricsEndDate.value) return null
  const startIso = `${metricsStartDate.value}T00:00:00.000Z`
  const endIso = `${metricsEndDate.value}T23:59:59.999Z`
  return {
    startDate: new Date(startIso).toISOString(),
    endDate: new Date(endIso).toISOString(),
  }
}

const allCategories = ref<CategoryNameOwner[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref<string | null>(null)

const moveState = reactive({
  txId: null as string | null,
  targetCategoryId: null as string | null,
  loading: false,
  error: null as string | null,
  message: null as string | null,
})

const deleteState = reactive({
  loading: false,
  error: null as string | null,
  message: null as string | null,
})

const ownerId = computed(() => normalizeId(props.category?.owner_id ?? props.user?.user_id) ?? null)
const categoryId = computed(() => normalizeId(props.category?.category_id) ?? null)
const categoryName = computed(() => props.category?.name ?? 'Unknown category')
const moveTargets = computed(() =>
  allCategories.value.filter(cat => cat.category_id !== categoryId.value)
)
const hasMoveTargets = computed(() => moveTargets.value.length > 0)

const categoryNameById = (id: string | null | undefined) => {
  if (!id) return ''
  return allCategories.value.find(cat => cat.category_id === id)?.name ?? id
}

const fetchCategories = async () => {
  if (!ownerId.value) {
    allCategories.value = []
    categoriesError.value = 'Missing owner id.'
    categoriesLoading.value = false
    return
  }
  categoriesLoading.value = true
  categoriesError.value = null
  try {
    const categories = await categoryApi.getCategoriesWithNames(ownerId.value)
    allCategories.value = categories.map(cat => ({
      ...cat,
      category_id: normalizeId(cat.category_id) ?? cat.category_id,
      owner_id: normalizeId(cat.owner_id) ?? cat.owner_id,
    }))
  } catch (error: any) {
    categoriesError.value = error?.message ?? 'Failed to load categories.'
    console.error('CategoryDetail: failed to fetch categories', error)
  } finally {
    categoriesLoading.value = false
  }
}

const loadTransactions = async () => {
  if (!ownerId.value || !categoryId.value) {
    transactionsState.status = 'error'
    ;(transactionsState as any).error = 'Missing owner or category id.'
    transactionsRaw.value = 'Missing owner or category id.'
    return
  }
  transactionsState.status = 'loading'
  transactionsRaw.value = 'Loading…'
  try {
    const data = await categoryApi.listTransactions({
      owner_id: ownerId.value,
      category_id: categoryId.value,
    })
    const normalized = data.map(entry => ({
      ...entry,
      tx_id: normalizeId(entry.tx_id) ?? entry.tx_id,
    }))
    const enriched = await Promise.all(
      normalized.map(async entry => {
        if (!entry.tx_id || !ownerId.value) {
          return { ...entry, display_name: entry.tx_id }
        }
        try {
          const info = await transactionApi.getTxInfo({ owner_id: ownerId.value, tx_id: entry.tx_id })
          const displayName = (info as any)?.tx_name
            ?? (info as any)?.merchant_text
            ?? entry.tx_id
          return { ...entry, display_name: displayName }
        } catch (infoErr) {
          console.warn('CategoryDetail: failed to fetch transaction info for history row', entry.tx_id, infoErr)
          return { ...entry, display_name: entry.tx_id }
        }
      })
    )
    transactionsState.status = 'loaded'
    ;(transactionsState as any).data = enriched
    transactionsRaw.value = JSON.stringify(enriched, null, 2)
  } catch (error: any) {
    transactionsState.status = 'error'
    ;(transactionsState as any).error = error?.message ?? 'Failed to load history.'
    try {
      if (error?.response?.data) {
        transactionsRaw.value = JSON.stringify(error.response.data, null, 2)
      } else {
        transactionsRaw.value = error?.message ?? 'Unknown error'
      }
    } catch {
      transactionsRaw.value = error?.message ?? 'Unknown error'
    }
  }
}

const loadMetrics = async () => {
  if (!ownerId.value || !categoryId.value) {
    metricsState.status = 'error'
    ;(metricsState as any).error = 'Missing owner or category id.'
    metricsRaw.value = 'Missing owner or category id.'
    return
  }
  const period = buildPeriod()
  if (!period) {
    metricsFilterError.value = 'Select both start and end dates.'
    metricsRaw.value = 'Missing start/end date.'
    return
  }
  if (new Date(period.startDate).getTime() > new Date(period.endDate).getTime()) {
    metricsFilterError.value = 'Start date must be before end date.'
    metricsRaw.value = JSON.stringify({ requestPayload: { owner_id: ownerId.value, category_id: categoryId.value, period }, error: 'Start date after end date.' }, null, 2)
    return
  }

  metricsFilterError.value = null
  metricsState.status = 'loading'
  metricsRaw.value = 'Loading…'
  const requestPayload = {
    owner_id: ownerId.value,
    category_id: categoryId.value,
    period,
  }
  try {
    const result = await categoryApi.getMetricStats(requestPayload)
    metricsState.status = 'loaded'
    ;(metricsState as any).data = result
    metricsRaw.value = JSON.stringify({ requestPayload, response: result }, null, 2)
  } catch (error: any) {
    metricsState.status = 'error'
    ;(metricsState as any).error = error?.message ?? 'Failed to load metrics.'
    try {
      if (error?.response?.data) {
        metricsRaw.value = JSON.stringify(
          { requestPayload, error: error.response.data },
          null,
          2
        )
      } else {
        metricsRaw.value = JSON.stringify(
          { requestPayload, error: error?.message ?? 'Unknown metrics error' },
          null,
          2
        )
      }
    } catch {
      metricsRaw.value = JSON.stringify(
        { requestPayload, error: error?.message ?? 'Unknown metrics error' },
        null,
        2
      )
    }
  }
}

const applyMetricsFilters = async () => {
  await loadMetrics()
}

const openMove = (txId: string) => {
  moveState.error = null
  moveState.message = null
  if (moveTargets.value.length === 0) {
    moveState.error = 'You need another category to move this transaction.'
    moveState.txId = null
    moveState.targetCategoryId = null
    return
  }
  moveState.txId = txId
  const defaultTarget = moveTargets.value.find(cat => cat.category_id !== categoryId.value)
  moveState.targetCategoryId = defaultTarget?.category_id ?? moveTargets.value[0]?.category_id ?? null
}

const cancelMove = () => {
  moveState.txId = null
  moveState.targetCategoryId = null
  moveState.loading = false
  moveState.error = null
}

const confirmMove = async () => {
  if (!moveState.txId) {
    moveState.error = 'Select a transaction to move.'
    return
  }
  if (!moveState.targetCategoryId) {
    moveState.error = 'Choose a destination category.'
    return
  }
  if (!ownerId.value || !categoryId.value) {
    moveState.error = 'Missing owner or category context.'
    return
  }

  const owner = ownerId.value
  const currentCategoryId = categoryId.value

  moveState.loading = true
  moveState.error = null
  moveState.message = null

  const txId = moveState.txId
  const destinationId = moveState.targetCategoryId

  try {
    await labelApi.update({ user_id: owner, tx_id: txId, new_category_id: destinationId })

    try {
      await categoryApi.removeTransaction({
        owner_id: owner,
        category_id: currentCategoryId,
        tx_id: txId,
      })
    } catch (removeErr: any) {
      console.warn('CategoryDetail: failed to remove transaction from current category', removeErr)
      const message = removeErr instanceof Error
        ? removeErr.message
        : removeErr?.response?.data?.error ?? 'Failed to remove transaction from current category.'
      throw new Error(message)
    }

    let txInfo: TransactionInfoResponse | null = null
    try {
      txInfo = await transactionApi.getTxInfo({ owner_id: owner, tx_id: txId })
    } catch (infoErr) {
      console.warn('CategoryDetail: failed to fetch transaction info, falling back to defaults', infoErr)
    }

    const amount = typeof txInfo?.amount === 'number' && Number.isFinite(txInfo.amount)
      ? txInfo.amount
      : Number((txInfo as any)?.amount ?? 0) || 0
    const txDate = typeof txInfo?.date === 'string' && txInfo.date.length > 0
      ? txInfo.date
      : new Date().toISOString()

    await categoryApi.addTransaction({
      owner_id: owner,
      category_id: destinationId,
      tx_id: txId,
      amount,
      tx_date: txDate,
    })

    moveState.message = `Moved transaction to ${categoryNameById(destinationId)}.`
    cancelMove()

    await loadTransactions()
    await loadMetrics()
    await fetchCategories()

    if (moveState.message) {
      setTimeout(() => {
        moveState.message = null
      }, 4000)
    }
  } catch (error: any) {
    moveState.error = error?.message ?? 'Failed to move transaction.'
    console.error('CategoryDetail: failed to move transaction', error)
  } finally {
    moveState.loading = false
  }
}

const deleteTransaction = async (txId: string) => {
  if (!ownerId.value || !categoryId.value) {
    deleteState.error = 'Missing owner or category context.'
    return
  }

  const owner = ownerId.value
  const currentCategoryId = categoryId.value

  const confirmed = window.confirm('Are you sure you want to delete this transaction from the category?')
  if (!confirmed) return

  deleteState.loading = true
  deleteState.error = null
  deleteState.message = null

  try {
    await labelApi.remove({ user_id: owner, tx_id: txId })

    await categoryApi.moveTransactionToTrash({
      owner_id: owner,
      from_category_id: currentCategoryId,
      tx_id: txId,
    })

    deleteState.message = 'Transaction moved to Trash.'

    if (moveState.txId === txId) {
      cancelMove()
    }

    await loadTransactions()
    await loadMetrics()

    setTimeout(() => {
      deleteState.message = null
    }, 4000)
  } catch (error: any) {
    deleteState.error = error?.message ?? 'Failed to delete transaction.'
    console.error('CategoryDetail: failed to delete transaction', error)
  } finally {
    deleteState.loading = false
  }
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString()
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount ?? 0)

onMounted(async () => {
  if (!props.category) return
  initializeMetricsPeriod()
  await fetchCategories()
  await loadTransactions()
  await loadMetrics()
})

watch(
  () => ownerId.value,
  (newOwner, oldOwner) => {
    if (!newOwner || newOwner === oldOwner) return
    fetchCategories()
  }
)

watch(
  () => [ownerId.value, categoryId.value] as const,
  ([newOwner, newCategory], [oldOwner, oldCategory]) => {
    if (!newOwner || !newCategory) return
    if (newOwner !== oldOwner || newCategory !== oldCategory) {
      loadTransactions()
      loadMetrics()
    }
  }
)

watch(
  moveTargets,
  (newTargets) => {
    if (moveState.txId == null) return
    if (newTargets.length === 0) {
      moveState.txId = null
      moveState.targetCategoryId = null
      moveState.error = 'You need another category to move this transaction.'
      return
    }
    if (!newTargets.some(cat => cat.category_id === moveState.targetCategoryId)) {
      moveState.targetCategoryId = newTargets[0]?.category_id ?? null
    }
  }
)

const goBack = () => {
  emit('navigate', 'categories')
}
</script>

<template>
  <div class="category-detail">
    <div class="topbar">
      <button class="btn-back" type="button" @click="goBack">← Back to Categories</button>
    </div>

    <div class="container">
      <div v-if="!categoryId" class="empty-state">
        <h2>No category selected</h2>
        <p>Select a category from the list to see its details.</p>
        <button class="btn-primary" type="button" @click="goBack">Return to Categories</button>
      </div>

      <div v-else class="content">
        <div v-if="moveState.message" class="notice notice-success">
          {{ moveState.message }}
        </div>
        <div v-if="moveState.error && !moveState.txId" class="notice notice-error">
          {{ moveState.error }}
        </div>
        <div v-if="deleteState.message" class="notice notice-success">
          {{ deleteState.message }}
        </div>
        <div v-if="deleteState.error" class="notice notice-error">
          {{ deleteState.error }}
        </div>
        <div v-if="categoriesError" class="notice notice-error">
          {{ categoriesError }}
        </div>

        <header class="header">
          <div>
            <h1>{{ categoryName }}</h1>
            <p class="subtitle">Category ID: <code>{{ categoryId }}</code></p>
          </div>
          <div class="meta">
            <span>Owner</span>
            <code>{{ ownerId }}</code>
          </div>
        </header>

        <section class="metrics">
          <div class="metrics-header">
            <div>
              <h3>Category Metrics</h3>
              <p class="subtitle">Select a custom period to recalculate totals.</p>
            </div>
            <form class="metrics-filter" @submit.prevent="applyMetricsFilters">
              <label>
                <span>Start date</span>
                <input type="date" v-model="metricsStartDate" />
              </label>
              <label>
                <span>End date</span>
                <input type="date" v-model="metricsEndDate" />
              </label>
              <button type="submit" class="btn-apply" :disabled="metricsState.status === 'loading'">
                {{ metricsState.status === 'loading' ? 'Loading…' : 'Apply' }}
              </button>
            </form>
          </div>
          <p v-if="metricsFilterError" class="metrics-error">{{ metricsFilterError }}</p>

          <div v-if="metricsState.status === 'loading'" class="metrics-loading">Loading metrics…</div>
          <div v-else-if="metricsState.status === 'error'" class="metrics-error">{{ metricsState.error }}</div>
          <ul v-else-if="metricsState.status === 'loaded'" class="metrics-list">
            <li><strong>Total amount:</strong> {{ formatCurrency(metricsState.data.total_amount) }}</li>
            <li><strong>Transactions:</strong> {{ metricsState.data.transaction_count }}</li>
            <li><strong>Average per day:</strong> {{ formatCurrency(metricsState.data.average_per_day) }}</li>
            <li><strong>Days covered:</strong> {{ metricsState.data.days }}</li>
          </ul>
        </section>

        <section class="history">
          <div class="history-header">
            <h3>Transaction history</h3>
            <span v-if="transactionsState.status === 'loaded'">
              {{ transactionsState.data.length }} transaction<span v-if="transactionsState.data.length !== 1">s</span>
            </span>
          </div>

          <div v-if="transactionsState.status === 'loading'" class="loading">
            Loading transactions…
          </div>

          <div v-else-if="transactionsState.status === 'error'" class="error">
            {{ transactionsState.error }}
          </div>

          <div v-else-if="transactionsState.status === 'loaded'">
            <table v-if="transactionsState.data.length" class="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Transaction</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="tx in transactionsState.data" :key="tx.tx_id">
                  <td>{{ formatDate(tx.tx_date) }}</td>
                  <td>{{ formatCurrency(tx.amount) }}</td>
                  <td>
                    <div class="tx-name">{{ tx.display_name || tx.tx_id }}</div>
                    <div class="tx-id" v-if="tx.display_name && tx.display_name !== tx.tx_id">
                      <code>{{ tx.tx_id }}</code>
                    </div>
                  </td>
                  <td class="actions-cell">
                    <div v-if="moveState.txId === tx.tx_id" class="move-controls">
                      <label class="sr-only" :for="`move-select-${tx.tx_id}`">Select destination category</label>
                      <select
                        :id="`move-select-${tx.tx_id}`"
                        v-model="moveState.targetCategoryId"
                        :disabled="moveState.loading"
                      >
                        <option v-for="target in moveTargets" :key="target.category_id" :value="target.category_id">
                          {{ target.name }}
                        </option>
                      </select>
                      <div class="move-buttons">
                        <button
                          type="button"
                          class="btn-confirm"
                          @click="confirmMove"
                          :disabled="moveState.loading || !moveState.targetCategoryId"
                        >
                          Move
                        </button>
                        <button
                          type="button"
                          class="btn-cancel"
                          @click="cancelMove"
                          :disabled="moveState.loading"
                        >
                          Cancel
                        </button>
                      </div>
                      <p v-if="moveState.error" class="move-error">{{ moveState.error }}</p>
                    </div>
                    <div v-else class="actions-inline">
                      <button
                        type="button"
                        class="btn-move"
                        @click="openMove(tx.tx_id)"
                        :disabled="!hasMoveTargets || moveState.loading || categoriesLoading || deleteState.loading"
                        :title="!hasMoveTargets ? 'Create another category to enable moving.' : 'Move this transaction to another category.'"
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        class="btn-delete"
                        @click="deleteTransaction(tx.tx_id)"
                        :disabled="deleteState.loading || moveState.loading"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="empty">No transactions recorded for this category yet.</p>
          </div>
        </section>

        <section class="debug" v-if="transactionsRaw || metricsRaw">
          <h3>Debug Responses</h3>
          <div v-if="metricsRaw" class="debug-block">
            <h4>getMetricStats</h4>
            <pre>{{ metricsRaw }}</pre>
          </div>
          <div v-if="transactionsRaw" class="debug-block">
            <h4>listTransactions</h4>
            <pre>{{ transactionsRaw }}</pre>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-detail {
  min-height: calc(100vh - 70px);
  background: #f5f7fa;
  padding: 2rem 1rem;
}

.topbar {
  position: sticky;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.btn-back {
  background: #fff;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.empty-state {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.btn-primary {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  background: #fff;
  border-radius: 8px;
  padding: 1.75rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.subtitle {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.95rem;
}

.meta {
  text-align: right;
  color: #555;
  font-size: 0.9rem;
}

.meta code {
  display: block;
  margin-top: 0.35rem;
  background: #f5f5f5;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
}

.metrics,
.history {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.metrics-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
}

.metrics-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
}

.metrics-filter label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #4a5568;
  gap: 0.35rem;
}

.metrics-filter input[type="date"] {
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 0.9rem;
}

.btn-apply {
  padding: 0.45rem 0.9rem;
  background: #3182ce;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-apply:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.metrics-error {
  color: #b83280;
  background: #fff5f7;
  border: 1px solid #fed7e2;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.75rem;
}

.metrics-loading {
  color: #4a5568;
  font-size: 0.95rem;
}

.metrics-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.metrics ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.metrics li + li {
  margin-top: 0.5rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
}

.history-table th,
.history-table td {
  text-align: left;
  padding: 0.6rem 0.45rem;
  border-bottom: 1px solid #e5e7eb;
}

.history-table tbody tr:hover {
  background: #f9fafb;
}

.tx-name {
  font-weight: 600;
  color: #2d3748;
}

.tx-id {
  font-size: 0.8rem;
  color: #718096;
}

.empty,
.loading,
.error {
  color: #6b7280;
}

.error {
  color: #b91c1c;
}

.debug {
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  border-radius: 10px;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.debug-block + .debug-block {
  margin-top: 1rem;
}

.notice {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.95rem;
}

.notice-success {
  background: #f0fff4;
  border-color: #9ae6b4;
  color: #22543d;
}

.notice-error {
  background: #fff5f5;
  border-color: #feb2b2;
  color: #742a2a;
}

.actions-cell {
  min-width: 160px;
}

.btn-move,
.btn-confirm,
.btn-cancel,
.btn-delete {
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-move {
  background: #e0e7ff;
  border-color: #c7d2fe;
  color: #3730a3;
}

.btn-move:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.move-controls {
  display: grid;
  gap: 0.5rem;
}

.move-controls select {
  width: 100%;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid #cbd5e0;
  font-size: 0.85rem;
}

.move-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-confirm {
  background: #38a169;
  border-color: #2f855a;
  color: #fff;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-cancel {
  background: #edf2f7;
  border-color: #cbd5e0;
  color: #2d3748;
}

.btn-delete {
  background: #fed7d7;
  border-color: #feb2b2;
  color: #9b2c2c;
}

.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.move-error {
  color: #c53030;
  font-size: 0.8rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.actions-inline {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
