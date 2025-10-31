<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { transactionApi, type User, type Transaction } from '../api'
import { normalizeId } from '../utils/normalize'

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
const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const userId = computed(() => extractUserId(props.user))

// Normalize various server shapes for owner_id to a string
const extractOwnerId = (value: unknown): string => normalizeId(value) ?? ''

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
  <div class="unlabeled-tx-page ff-page">
    <div class="ff-page-frame">
      <header class="ff-page-header queue-header">
        <div class="header-stack">
          <button type="button" class="ff-back-button" @click="emit('navigate', 'main')">
            <span class="ff-icon icon-arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.5 4.5L7 10l5.5 5.5" />
              </svg>
            </span>
            Back to Dashboard
          </button>
          <div class="heading-copy">
            <h1>Unlabeled Transactions</h1>
          </div>
        </div>
      </header>

      <div class="ff-page-grid queue-layout">
        <div class="queue-support">
          <section class="ff-card compact tips-card">
            <h3 class="support-title">Queue tips</h3>
            <ul class="tips-list">
              <li>Label a handful of transactions at a time to keep momentum.</li>
              <li>For faster labeling, turn off suggestion more in the account page.</li>
            </ul>
          </section>
          <section class="ff-card compact glance-card" v-if="displayedTransactions.length">
            <h3 class="support-title">At a glance</h3>
            <p class="support-copy">
              {{ displayedTransactions.length }} pending label<span v-if="displayedTransactions.length !== 1">s</span>.
            </p>
            <p class="support-copy">Oldest transaction: {{ displayedTransactions[displayedTransactions.length - 1]?.date ?? '—' }}</p>
          </section>
        </div>

        <section class="ff-card queue-card">
          <div class="queue-top">
            <div class="queue-summary">
              <h2 class="ff-card-title">Queue overview</h2>
              <p class="ff-card-subtitle">{{ displayedTransactions.length }} transaction<span v-if="displayedTransactions.length !== 1">s</span> awaiting labels.</p>
            </div>
            <button
              v-if="displayedTransactions.length > 0"
              type="button"
              class="ff-pill-action accent queue-cta"
              @click="emit('start-labeling', displayedTransactions[0])"
            >
              Start labeling session
            </button>
          </div>

          <div v-if="error" class="banner error">
            <span class="ff-icon icon-error" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="8" />
                <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
              </svg>
            </span>
            {{ error }}
          </div>
          <div v-else-if="loading" class="loading-message">Loading transactions…</div>
          <div
            v-else-if="transactions.length > 0 && displayedTransactions.length === 0"
            class="banner warning"
          >
            <span class="ff-icon icon-warning" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 3.2l7.2 12.6a1 1 0 0 1-.87 1.5H3.67a1 1 0 0 1-.87-1.5L10 3.2z" />
                <path d="M10 8v3.8" />
                <path d="M10 14.8h.01" />
              </svg>
            </span>
            We fetched {{ transactions.length }} item(s), but none belong to the current user. This usually means the backend returned transactions with a different owner ID.
          </div>
          <div v-else-if="displayedTransactions.length === 0" class="empty-message">
            <span class="ff-icon icon-check" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 10l3.5 3.5L15 7" />
                <circle cx="10" cy="10" r="8" />
              </svg>
            </span>
            <p class="empty-message-text">All transactions are labeled!</p>
          </div>
          <div v-else class="table-wrapper">
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
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-header {
  align-items: flex-start;
}

.header-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.heading-copy h1 {
  margin: 0;
  color: var(--ff-primary);
}

.queue-layout {
  grid-template-columns: minmax(0, 1fr);
  row-gap: 2rem;
}

.queue-support {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.tips-card,
.glance-card {
  display: grid;
  gap: 0.6rem;
  font-size: 0.9rem;
}

.support-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1rem;
}

.support-copy {
  margin: 0;
  color: var(--ff-text-muted);
}

.tips-list {
  margin: 0;
  padding-left: 1.15rem;
  list-style: disc;
  color: var(--ff-text-muted);
  line-height: 1.45;
}

.queue-card {
  display: grid;
  gap: 1.5rem;
}

.queue-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.queue-summary {
  max-width: 32rem;
  display: grid;
  gap: 0.35rem;
}

.queue-cta {
  white-space: nowrap;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  line-height: 1.2;
  box-shadow: 0 2px 6px rgba(31, 45, 54, 0.16);
}

.banner {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border-radius: 10px;
  padding: 0.75rem 0.95rem;
  font-size: 0.95rem;
}

.banner.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
}

.banner.warning {
  background: var(--ff-warning, rgba(231, 183, 91, 0.18));
  border: 1px solid rgba(231, 183, 91, 0.32);
  color: #8a6728;
}

.loading-message {
  color: var(--ff-text-muted);
  font-size: 0.95rem;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 3rem 1.5rem;
  border-radius: 16px;
  background: linear-gradient(145deg, var(--ff-primary-ghost) 0%, #fdfdfc 100%);
  text-align: center;
}

.empty-message .ff-icon {
  width: 4.5rem;
  height: 4.5rem;
  color: var(--ff-primary);
}

.empty-message-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ff-primary);
}

.table-wrapper {
  border: 1px solid var(--ff-border);
  border-radius: 12px;
  overflow: auto;
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tx-table th,
.tx-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--ff-border);
  text-align: left;
}

.tx-table thead th {
  background: var(--ff-primary-ghost);
  color: var(--ff-text-muted);
  position: sticky;
  top: 0;
}

.right {
  text-align: right;
}

.status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
}

.status.unlabeled {
  background: rgba(231, 183, 91, 0.22);
  color: #8a6728;
}

.btn-small {
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-surface);
  color: var(--ff-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-small:hover,
.btn-small:focus-visible {
  background: var(--ff-primary-ghost);
  outline: none;
}

@media (max-width: 720px) {
  .queue-top {
    flex-direction: column;
    align-items: stretch;
  }

  .queue-cta {
    width: 100%;
    justify-content: center;
  }
}
</style>
