<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { transactionApi, type User, type Transaction } from '../api'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  (e: 'navigate', page: string): void
  (e: 'start-labeling', transaction: Transaction): void
}>()

const transactions = ref<Transaction[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const retriedOnce = ref(false)
const showDebug = ref(false)

// Safely extract a string user id from various shapes (matches Categories page logic)
const extractUserId = (u: any): string | null => {
  if (!u) return null
  const candidate = u.user_id ?? u.id ?? u
  if (candidate == null) return null
  if (typeof candidate === 'string') return candidate
  if (typeof candidate === 'object') {
    if (typeof candidate.value === 'string') return candidate.value
    if (typeof candidate.value === 'object' && typeof candidate.value.value === 'string') return candidate.value.value
  }
  try { return String(candidate) } catch { return null }
}

const userId = computed(() => extractUserId(props.user))

// Normalize various server shapes for owner_id to a string
const extractOwnerId = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as any
    const candidate = o.value ?? o.id ?? o.user_id ?? o.owner_id
    if (typeof candidate === 'string') return candidate
    if (candidate != null) {
      try { return String(candidate) } catch { /* fallthrough */ }
    }
  }
  try { return String(value) } catch { return '' }
}

// Guard against server-side filtering mistakes: only show items owned by this user
const displayedTransactions = computed(() => {
  const uid = userId.value
  if (!uid) return []
  return transactions.value.filter(t => extractOwnerId((t as any).owner_id) === uid)
})

const fetchUnlabeledTransactions = async () => {
  const currentUserId = userId.value
  if (!currentUserId) {
    error.value = 'User not signed in.'
    return
  }

  loading.value = true
  error.value = null
  try {
    const resp = await transactionApi.getUnlabeledTransactions({ owner_id: currentUserId })
    const arr = Array.isArray(resp) ? resp : []
    // Diagnostics before normalization
    const rawOwners = [...new Set(arr.map((t: any) => t?.owner_id))].slice(0, 5)
    // Normalize owner_id to a string for consistent client behavior
    transactions.value = arr.map((t: any) => ({
      ...t,
      owner_id: extractOwnerId(t?.owner_id),
    })) as Transaction[]
    const owners = [...new Set(transactions.value.map(t => t.owner_id))].slice(0, 5)
    console.debug('Unlabeled fetch:', {
      requested_owner_id: currentUserId,
      total: transactions.value.length,
      owners_sample_normalized: owners,
      owners_sample_raw: rawOwners,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load unlabeled transactions.'
    console.error('Fetch unlabeled transactions error:', e)
  } finally {
    loading.value = false
  }

  // If nothing returned right after an import, retry once after a brief delay
  if (!error.value && transactions.value.length === 0 && !retriedOnce.value) {
    retriedOnce.value = true
    setTimeout(() => {
      // fire-and-forget; UI will show loading state
      fetchUnlabeledTransactions()
    }, 800)
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

onMounted(fetchUnlabeledTransactions)
</script>

<template>
  <div class="unlabeled-tx-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>
    <div class="container">
      <div class="header">
        <h1>Unlabeled Transactions</h1>
        <button class="btn-refresh" @click="fetchUnlabeledTransactions" :disabled="loading">
          {{ loading ? 'Refreshing…' : '🔄 Refresh' }}
        </button>
      </div>

      <div v-if="error" class="error-message">❌ {{ error }}</div>
      <div v-else-if="loading" class="loading-message">Loading transactions…</div>
      <!-- If API returned items but none match current user, surface a helpful hint -->
      <div
        v-else-if="transactions.length > 0 && displayedTransactions.length === 0"
        class="error-message"
      >
        We fetched {{ transactions.length }} item(s), but none belong to the current user.
        This usually means the backend returned transactions with a different owner_id.
      </div>
      <div v-else-if="displayedTransactions.length === 0" class="empty-message">
        🎉 All transactions are labeled!
      </div>
      <div v-else class="results">
        <p>You have {{ displayedTransactions.length }} transaction(s) to label.</p>
        <button
          class="btn-start-labeling"
          @click="emit('start-labeling', displayedTransactions[0])"
          v-if="displayedTransactions.length > 0"
        >
          Start Labeling Session
        </button>
        <div class="table-wrapper">
          <table class="tx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th class="right">Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in displayedTransactions" :key="tx.tx_id">
                <td>{{ tx.date }}</td>
                <td>{{ tx.merchant_text }}</td>
                <td class="right">{{ formatCurrency(tx.amount) }}</td>
                <td>
                  <span class="status" :class="tx.status.toLowerCase()">{{ tx.status }}</span>
                </td>
                <td>
                  <button class="btn-small" @click="emit('start-labeling', tx)">Label</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Debug section: shows raw API payload with owner ids (always visible) -->
      <div class="debug-panel">
        <button class="btn-debug" type="button" @click="showDebug = !showDebug">
          {{ showDebug ? 'Hide' : 'Show' }} Debug (Raw API Results)
        </button>
        <div v-if="showDebug" class="debug-content">
          <p>Total returned by API (no client filtering): {{ transactions.length }}</p>
          <div class="table-wrapper">
            <table class="tx-table debug-table">
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Owner ID</th>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th class="right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rtx in transactions" :key="rtx.tx_id">
                  <td class="mono">{{ rtx.tx_id }}</td>
                  <td class="mono">{{ rtx.owner_id }}</td>
                  <td>{{ rtx.date }}</td>
                  <td>{{ rtx.merchant_text }}</td>
                  <td class="right">{{ formatCurrency(rtx.amount) }}</td>
                  <td>
                    <span class="status" :class="rtx.status.toLowerCase()">{{ rtx.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unlabeled-tx-page {
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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 2rem;
  color: #333;
  margin: 0;
}

.btn-refresh {
  padding: 0.5rem 0.9rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message,
.loading-message,
.empty-message {
  margin-top: 2rem;
  text-align: center;
  padding: 2rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
}

.error-message {
  color: #c33;
  background: #fee;
  border: 1px solid #fcc;
}

.results {
  margin-top: 1rem;
}

.btn-start-labeling {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-start-labeling:hover {
  background: #218838;
}

.table-wrapper {
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tx-table th,
.tx-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
  text-align: left;
}

.tx-table thead th {
  background: #f8f9fb;
  color: #444;
  position: sticky;
  top: 0;
}

.right {
  text-align: right;
}

.status {
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}
.status.unlabeled {
  background: #fff3cd;
  color: #856404;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

/* Debug styles */
.debug-panel {
  margin-top: 1rem;
}
.btn-debug {
  padding: 0.4rem 0.8rem;
  background: #edf2f7;
  color: #2d3748;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  cursor: pointer;
}
.btn-debug:hover { background: #e2e8f0; }
.debug-content {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fff;
  border: 1px dashed #cbd5e0;
  border-radius: 6px;
}
.debug-table th:nth-child(2), .debug-table td:nth-child(2) { /* Owner ID column */
  color: #4a5568;
}
</style>
