<script setup lang="ts">
import { ref, computed } from 'vue'
import { transactionApi } from '../api'
import type { Transaction, User } from '../api'

const props = defineProps<{
  user: User | null
}>()
const emit = defineEmits<{
  navigate: [page: string]
}>()

const csvContent = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const transactions = ref<Transaction[]>([])

// Safely extract a string user id from various shapes
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

const handleUpload = async () => {
  error.value = null
  transactions.value = []

  const currentUserId = userId.value
  if (!currentUserId) {
    error.value = 'You must be signed in to import transactions.'
    return
  }
  if (!csvContent.value.trim()) {
    error.value = 'Please paste your CSV content.'
    return
  }

  loading.value = true
  try {
    await transactionApi.importTransactions({
      owner_id: currentUserId,
      fileContent: csvContent.value,
    })
    // On successful import, navigate to Unlabeled; that page refetches by user on mount.
    emit('navigate', 'unlabeled')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to import transactions'
    console.error('Import error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="import-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>
    <div class="container">
      <h1>Import Spendings</h1>
      <p>Paste your CSV file content below to import your transactions.</p>
      <form @submit.prevent="handleUpload" class="import-form">
        <textarea
          v-model="csvContent"
          placeholder="Paste CSV content here..."
          rows="10"
          class="csv-textarea"
        ></textarea>
        <div v-if="error" class="error-message">❌ {{ error }}</div>
        <button type="submit" class="btn-upload" :disabled="loading">
          {{ loading ? 'Importing…' : 'Import CSV' }}
        </button>
      </form>

      <div v-if="transactions.length > 0" class="results">
        <h2>Imported Transactions ({{ transactions.length }})</h2>
        <div class="table-wrapper">
          <table class="tx-table">
            <thead>
              <tr>
                <th>Tx ID</th>
                <th>Date</th>
                <th>Merchant</th>
                <th class="right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in transactions" :key="tx.tx_id">
                <td class="mono">{{ tx.tx_id }}</td>
                <td>{{ tx.date }}</td>
                <td>{{ tx.merchant_text }}</td>
                <td class="right">{{ tx.amount.toFixed(2) }}</td>
                <td>
                  <span class="status" :class="tx.status.toLowerCase()">{{ tx.status }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-page {
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
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
}

h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 1rem;
}

.import-form {
  margin: 2rem 0 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.csv-textarea {
  width: 100%;
  min-height: 180px;
  font-family: monospace;
  font-size: 1rem;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: vertical;
}

.btn-upload {
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: #5568d3;
}

.error-message {
  color: #c33;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.95rem;
}

.results {
  margin-top: 2rem;
  text-align: left;
}

.table-wrapper {
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.tx-table th, .tx-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.tx-table thead th {
  background: #f8f9fb;
  color: #444;
  position: sticky;
  top: 0;
}

.mono { font-family: monospace; font-size: 0.85rem; }
.right { text-align: right; }

.status {
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}
.status.unlabeled { background: #fff3cd; color: #856404; }
.status.labeled { background: #d4edda; color: #155724; }
</style>
