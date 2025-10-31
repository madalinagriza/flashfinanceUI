<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { categoryApi, transactionApi, type User, type CategoryNameOwner, type Transaction } from '../api'
import { normalizeId } from '../utils/normalize'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  signOut: []
  navigate: [page: string]
  'view-account': [user: User]
}>()

const categories = ref<CategoryNameOwner[]>([])
const categoriesLoading = ref(false)
const categoriesError = ref<string | null>('Sign in to see your categories.')

const unlabeledTransactions = ref<Transaction[]>([])
const unlabeledLoading = ref(false)
const unlabeledError = ref<string | null>('Sign in to view your queue.')

const lastImportMeta = ref<{ timestamp: string; count: number } | null>(null)

const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const userId = computed(() => extractUserId(props.user))

const importStorageKey = computed(() => (userId.value ? `ff:last-import:${userId.value}` : null))

const categoryPreview = computed(() => categories.value.slice(0, 4))

const unlabeledCount = computed(() => unlabeledTransactions.value.length)
const unlabeledPreview = computed(() => unlabeledTransactions.value.slice(0, 3))

const formatCurrency = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const formatDateTime = (iso: string) => {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

const hydrateLastImport = () => {
  if (typeof window === 'undefined') {
    lastImportMeta.value = null
    return
  }
  const key = importStorageKey.value
  if (!key) {
    lastImportMeta.value = null
    return
  }
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    lastImportMeta.value = null
    return
  }
  try {
    const parsed = JSON.parse(raw) as { timestamp?: string; count?: number }
    if (parsed?.timestamp) {
      const count = typeof parsed.count === 'number' && Number.isFinite(parsed.count) ? parsed.count : 0
      lastImportMeta.value = { timestamp: parsed.timestamp, count }
      return
    }
  } catch (err) {
    console.warn('Failed to parse last import metadata', err)
  }
  lastImportMeta.value = null
}

const fetchCategories = async () => {
  const ownerId = userId.value
  if (!ownerId) {
    categories.value = []
    categoriesError.value = 'Sign in to see your categories.'
    return
  }

  categoriesLoading.value = true
  categoriesError.value = null
  try {
    categories.value = await categoryApi.getCategoriesWithNames(ownerId)
  } catch (err) {
    categoriesError.value = err instanceof Error ? err.message : 'Unable to load categories.'
    console.error('Dashboard categories fetch error:', err)
  } finally {
    categoriesLoading.value = false
  }
}

const fetchUnlabeled = async () => {
  const ownerId = userId.value
  if (!ownerId) {
    unlabeledTransactions.value = []
    unlabeledError.value = 'Sign in to view your queue.'
    return
  }

  unlabeledLoading.value = true
  unlabeledError.value = null
  try {
    const resp = await transactionApi.getUnlabeledTransactions({ owner_id: ownerId })
    unlabeledTransactions.value = Array.isArray(resp) ? resp : []
  } catch (err) {
    unlabeledError.value = err instanceof Error ? err.message : 'Unable to load unlabeled transactions.'
    console.error('Dashboard unlabeled fetch error:', err)
  } finally {
    unlabeledLoading.value = false
  }
}

const storageListener = (event: StorageEvent) => {
  if (!event.key || !importStorageKey.value) return
  if (event.key === importStorageKey.value) {
    hydrateLastImport()
  }
}

const refreshDashboardData = () => {
  if (!userId.value) return
  fetchCategories()
  fetchUnlabeled()
  hydrateLastImport()
}

watch(userId, (next, prev) => {
  if (next === prev) return
  if (!next) {
    categories.value = []
    unlabeledTransactions.value = []
    categoriesError.value = 'Sign in to see your categories.'
    unlabeledError.value = 'Sign in to view your queue.'
    lastImportMeta.value = null
    return
  }
  refreshDashboardData()
}, { immediate: true })

watch(importStorageKey, () => {
  hydrateLastImport()
}, { immediate: true })

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageListener)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', storageListener)
  }
})
</script>

<template>
  <div class="main-page ff-page">
    <div class="ff-page-frame">
      <header class="ff-page-header main-header">
        <div class="ff-page-heading">
          <p class="eyebrow">Dashboard</p>
          <h1>Focus your next step</h1>
          <p class="ff-page-subtitle">
            Each section below highlights recent activity so you can jump straight into managing finances.
          </p>
          <p v-if="user" class="greeting">Signed in as <strong>{{ user.name }}</strong></p>
        </div>
      </header>

      <div class="feature-grid">
        <section class="ff-card feature-card categories-card">
          <div class="feature-header">
            <div>
              <h2 class="feature-title">Categories</h2>
              <p class="feature-subtitle">Keep labels sharp for faster insights.</p>
            </div>
            <span v-if="categories.length" class="feature-pill">{{ categories.length }} total</span>
          </div>
          <div class="feature-body">
            <p v-if="!user" class="feature-copy">Sign in to preview your categories.</p>
            <p v-else-if="categoriesLoading" class="feature-copy">Loading categories…</p>
            <p v-else-if="categoriesError" class="feature-copy error">{{ categoriesError }}</p>
            <template v-else>
              <ul v-if="categoryPreview.length" class="preview-chips">
                <li v-for="cat in categoryPreview" :key="cat.category_id" class="preview-chip">{{ cat.name }}</li>
              </ul>
              <p v-else class="feature-copy muted">No categories yet — create your first to organize spending.</p>
            </template>
          </div>
          <button type="button" class="feature-action" @click="emit('navigate', 'categories')">
            Manage Categories
          </button>
        </section>

        <section class="ff-card feature-card unlabeled-card">
          <div class="feature-header">
            <div>
              <h2 class="feature-title">Unlabeled Transactions</h2>
              <p class="feature-subtitle">Label new activity to keep reports current.</p>
            </div>
            <span v-if="unlabeledCount" class="feature-pill accent">{{ unlabeledCount }} awaiting</span>
          </div>
          <div class="feature-body">
            <p v-if="!user" class="feature-copy">Sign in to resume labeling.</p>
            <p v-else-if="unlabeledLoading" class="feature-copy">Checking your queue…</p>
            <p v-else-if="unlabeledError" class="feature-copy error">{{ unlabeledError }}</p>
            <template v-else>
              <ul v-if="unlabeledPreview.length" class="preview-list">
                <li
                  v-for="(tx, idx) in unlabeledPreview"
                  :key="tx.tx_id ?? (tx as any)._id ?? (tx as any).transaction_id ?? idx"
                  class="preview-row"
                >
                  <span class="preview-label">{{ tx.merchant_text || (tx as any).description || 'Merchant' }}</span>
                  <span class="preview-value">{{ formatCurrency(tx.amount) }}</span>
                </li>
              </ul>
              <p v-else class="feature-copy muted">All caught up — no unlabeled transactions.</p>
            </template>
          </div>
          <button type="button" class="feature-action accent" @click="emit('navigate', 'unlabeled')">
            Resume Labeling
          </button>
        </section>

        <section class="ff-card feature-card import-card">
          <div class="feature-header">
            <div>
              <h2 class="feature-title">Import Transactions</h2>
              <p class="feature-subtitle">Bring in new statements to refresh the queue.</p>
            </div>
          </div>
          <div class="feature-body">
            <p v-if="!user" class="feature-copy">Sign in to import CSV files.</p>
            <template v-else>
              <p v-if="lastImportMeta" class="feature-copy">
                Last import {{ formatDateTime(lastImportMeta.timestamp) }}
                <span class="feature-hint" v-if="lastImportMeta.count">· {{ lastImportMeta.count }} new transactions</span>
              </p>
              <p v-else class="feature-copy muted">No imports yet — upload your first CSV to get started.</p>
            </template>
          </div>
          <button type="button" class="feature-action" @click="emit('navigate', 'import')">
            Import New CSV
          </button>
        </section>

        <section class="ff-card feature-card account-card">
          <div class="feature-header">
            <div>
              <h2 class="feature-title">Account</h2>
              <p class="feature-subtitle">Manage your profile and preferences.</p>
            </div>
            <span v-if="user?.status" class="feature-pill" :class="user.status.toLowerCase()">{{ user.status }}</span>
          </div>
          <div class="feature-body">
            <template v-if="user">
              <dl class="account-summary">
                <div>
                  <dt>Email</dt>
                  <dd>{{ user.email }}</dd>
                </div>
              </dl>
            </template>
            <p v-else class="feature-copy">Sign in to view account details and personalize your dashboard.</p>
          </div>
          <button
            v-if="user"
            type="button"
            class="feature-action"
            @click="emit('view-account', user)"
          >
            View Personal Account
          </button>
          <button
            v-else
            type="button"
            class="feature-action"
            @click="emit('navigate', 'import')"
          >
            Get Started
          </button>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-page .eyebrow {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ff-text-subtle);
}

.greeting {
  color: var(--ff-secondary);
  font-size: 1rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 2rem;
  row-gap: 3rem;
  align-items: stretch;
}

.feature-card {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  min-height: 100%;
}

.feature-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.feature-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1.2rem;
}

.feature-subtitle {
  margin: 0.25rem 0 0 0;
  color: var(--ff-text-muted);
  font-size: 0.95rem;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.85rem;
  border-radius: 999px;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.feature-pill.accent {
  background: var(--ff-secondary);
  color: var(--ff-surface);
}

.feature-pill.active {
  background: var(--ff-success-soft);
  color: var(--ff-success);
}

.feature-pill.inactive {
  background: var(--ff-error-soft);
  color: var(--ff-error);
}

.feature-body {
  display: grid;
  gap: 0.75rem;
  flex: 1;
}

.feature-copy {
  margin: 0;
  color: var(--ff-text-base);
  font-size: 0.95rem;
}

.feature-copy.muted {
  color: var(--ff-text-muted);
}

.feature-copy.error {
  color: var(--ff-error);
}

.feature-hint {
  color: var(--ff-text-muted);
  font-size: 0.85rem;
}

.preview-chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.preview-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  font-weight: 600;
  font-size: 0.85rem;
}

.preview-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.95rem;
  color: var(--ff-text-base);
}

.preview-value {
  font-weight: 600;
  color: var(--ff-secondary);
}

.feature-action {
  margin-top: auto;
  align-self: flex-start;
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1.3rem;
  background: var(--ff-primary);
  color: var(--ff-surface);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.feature-action:hover,
.feature-action:focus-visible {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
  outline: none;
}

.feature-action.accent {
  background: var(--ff-secondary);
}

.feature-action.accent:hover,
.feature-action.accent:focus-visible {
  background: var(--ff-secondary-hover);
}

.account-summary {
  margin: 0;
  display: grid;
  gap: 0.8rem;
}

.account-summary div {
  display: grid;
  gap: 0.25rem;
}

.account-summary dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ff-text-subtle);
  margin: 0;
}

.account-summary dd {
  margin: 0;
  color: var(--ff-text-base);
}

@media (max-width: 900px) {
  .feature-grid {
    grid-template-columns: 1fr;
    row-gap: 2.5rem;
  }
}

@media (max-width: 640px) {
  .feature-grid {
    row-gap: 2rem;
  }

  .feature-action {
    width: 100%;
    justify-content: center;
  }
}
</style>
