<script setup lang="ts">
import { ref, computed } from 'vue'
import { transactionApi } from '../api'
import type { Transaction, User } from '../api'
import { normalizeId } from '../utils/normalize'

const props = defineProps<{
  user: User | null
}>()
const emit = defineEmits<{
  navigate: [page: string]
}>()

const csvContent = ref('')
const error = ref<string | null>(null)
const loading = ref(false)
const fileReading = ref(false)
const lastFileName = ref<string | null>(null)
const transactions = ref<Transaction[]>([])

// Safely extract a string user id from various shapes
const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const userId = computed(() => extractUserId(props.user))

const importCsvContent = async (content: string) => {
  error.value = null
  transactions.value = []

  const currentUserId = userId.value
  if (!currentUserId) {
    error.value = 'You must be signed in to import transactions.'
    return
  }
  if (!content.trim()) {
    error.value = 'No CSV content found to import.'
    return
  }

  loading.value = true
  try {
    await transactionApi.importTransactions({
      owner_id: currentUserId,
      fileContent: content,
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

const handleUpload = async () => {
  await importCsvContent(csvContent.value)
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input?.files || input.files.length === 0) {
    return
  }

  const file = input.files[0]
  lastFileName.value = file?.name ?? null
  fileReading.value = true
  error.value = null

  try {
    const text = await file.text()
    csvContent.value = text
    await importCsvContent(text)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to read the selected file'
    console.error('File import error:', e)
  } finally {
    fileReading.value = false
    // Allow selecting the same file again if needed
    input.value = ''
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
      <p>Upload a CSV file or paste its contents below to import your transactions.</p>
      <form @submit.prevent="handleUpload" class="import-form">
        <label class="file-picker">
          <span class="file-picker-label">Select CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            @change="handleFileChange"
            :disabled="loading || fileReading"
          />
        </label>
        <div v-if="lastFileName" class="file-status">
          Loaded: <strong>{{ lastFileName }}</strong>
          <span v-if="fileReading">(reading…)</span>
        </div>
        <textarea
          v-model="csvContent"
          placeholder="Paste CSV content here..."
          rows="10"
          class="csv-textarea"
        ></textarea>
        <div v-if="error" class="error-message">❌ {{ error }}</div>
        <button type="submit" class="btn-upload" :disabled="loading || fileReading">
          {{ (loading || fileReading) ? 'Importing…' : 'Import CSV' }}
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

.file-picker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  border: 1px dashed #ccd3e0;
  border-radius: 6px;
  background: #fff;
  color: #3a4a63;
  cursor: pointer;
  align-self: center;
  transition: border-color 0.2s, color 0.2s;
}

.file-picker:hover {
  border-color: #667eea;
  color: #2d3a58;
}

.file-picker input {
  display: none;
}

.file-picker-label {
  font-weight: 600;
}

.file-status {
  font-size: 0.9rem;
  color: #4a5568;
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
