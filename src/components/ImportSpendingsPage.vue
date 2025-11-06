<script setup lang="ts">
import { ref, computed } from 'vue'
import { transactionApi, fileUploadingApi } from '../api'
import type { Transaction, User, UploadFileRequest, UploadFileResponse } from '../api'
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
const uploadedFileId = ref<string | null>(null)

// Safely extract a string user id from various shapes
const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const userId = computed(() => extractUserId(props.user))

const importCsvContent = async (content: string) => {
  error.value = null
  transactions.value = []
  uploadedFileId.value = null

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
    const uploadRequest: UploadFileRequest = {
      owner: currentUserId,
      name: lastFileName.value || `pasted-import-${new Date().toISOString().split('T')[0]}.csv`,
      content,
    }

    try {
      const uploadResult: UploadFileResponse = await fileUploadingApi.uploadFile(uploadRequest)
      uploadedFileId.value = uploadResult?.file ?? null
    } catch (uploadErr) {
      console.warn('Upload to FileUploading failed; continuing with inline import', uploadErr)
    }

    const result = await transactionApi.importTransactions({
      owner_id: currentUserId,
      fileContent: content,
    })
    const imported = Array.isArray(result) ? result : []
    transactions.value = imported

    if (typeof window !== 'undefined' && currentUserId) {
      const metaKey = `ff:last-import:${currentUserId}`
      const payload = {
        timestamp: new Date().toISOString(),
        count: imported.length,
      }
      try {
        window.localStorage.setItem(metaKey, JSON.stringify(payload))
      } catch (storageErr) {
        console.warn('Unable to persist last import metadata', storageErr)
      }
    }

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
    // Populate the textarea with the file contents but do NOT import yet.
    // The user must click the Import CSV button to begin the import.
    csvContent.value = text
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
  <div class="import-page ff-page">
    <div class="ff-page-frame">
      <header class="ff-page-header import-header">
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
            <h1>Import Transactions</h1>
            <p class="ff-page-subtitle">Upload a CSV file or paste its contents to bring new spendings into FlashFinance.</p>
          </div>
        </div>
        <div class="ff-header-actions">
          <button type="button" class="ff-pill-action accent import-cta" @click="emit('navigate', 'unlabeled')">
            View unlabeled queue
          </button>
        </div>
      </header>

      <div class="ff-page-grid import-grid">
        <div class="ff-column">
          <section class="ff-card import-card">
            <h2 class="ff-card-title">Upload or paste your CSV</h2>
            <p class="ff-card-subtitle">Choose a file from your computer or paste the contents directly. Click import once you're ready.</p>
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
              <p v-if="lastFileName" class="file-status">
                Loaded <strong>{{ lastFileName }}</strong>
                <span v-if="fileReading">(reading…)</span>
                <span class="hint">Click “Import CSV” after reviewing the preview below.</span>
              </p>
              <textarea
                v-model="csvContent"
                placeholder="Paste CSV content here..."
                rows="10"
                class="csv-textarea"
              ></textarea>
              <div v-if="error" class="banner error">
                <span class="ff-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="10" cy="10" r="8" />
                    <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                  </svg>
                </span>
                {{ error }}
              </div>
              <p v-if="uploadedFileId && !error" class="file-status">
                Uploaded to file storage as
                <strong>{{ uploadedFileId }}</strong>
              </p>
              <button type="submit" class="action-button primary" :disabled="loading || fileReading">
                {{ (loading || fileReading) ? 'Importing…' : 'Import CSV' }}
              </button>
            </form>
          </section>
        </div>

        <div class="ff-column import-aside">
          <section class="ff-card compact import-notes">
            <h3 class="notes-title">Import tips</h3>
            <ul class="notes-list">
              <li>Ensure your CSV includes headers like date, amount, merchant.</li>
              <li>Amounts should use positive numbers for debits and negative for credits.</li>
              <li>After importing, review the unlabeled queue to categorize new spendings.</li>
            </ul>
          </section>
          <section class="ff-card compact status-card" v-if="csvContent">
            <h3 class="notes-title">Import summary</h3>
            <p class="ff-summary">Current paste length: {{ csvContent.length.toLocaleString() }} characters.</p>
          </section>
        </div>

        <section v-if="transactions.length > 0" class="ff-card results-card ff-full-width">
          <div class="results-header">
            <h2 class="ff-card-title">Imported transactions</h2>
            <span class="badge">{{ transactions.length }}</span>
          </div>
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
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.import-header {
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

.import-cta {
  font-size: 0.95rem;
}

.ff-page-grid {
  margin-top: 24px;
}

.import-grid {
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 0.3fr);
  align-items: start;
}

.import-card {
  display: grid;
  gap: 1.5rem;
}

.import-form {
  display: grid;
  gap: 1rem;
}

.file-picker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  border: 1px dashed var(--ff-primary-border-strong);
  border-radius: 10px;
  background: var(--ff-surface);
  color: var(--ff-text-base);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.file-picker:hover {
  border-color: var(--ff-primary);
  color: var(--ff-primary);
  background: var(--ff-primary-ghost);
}

.file-picker input {
  display: none;
}

.file-picker-label {
  font-weight: 600;
}

.file-status {
  font-size: 0.9rem;
  color: var(--ff-text-muted);
  display: grid;
  gap: 0.25rem;
}

.hint {
  font-size: 0.85rem;
  color: var(--ff-text-subtle);
}

.csv-textarea {
  width: 100%;
  min-height: 200px;
  font-family: monospace;
  font-size: 1rem;
  padding: 1rem;
  border: 1px solid var(--ff-primary-border-strong);
  border-radius: 10px;
  resize: vertical;
  background: var(--ff-background);
  color: var(--ff-text-base);
}

.banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.75rem 0.95rem;
  font-size: 0.95rem;
}

.banner.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
}

.action-button {
  border-radius: 999px;
  border: none;
  padding: 0.75rem 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.action-button.primary {
  background: var(--ff-primary);
  color: var(--ff-surface);
}

.action-button.primary:hover,
.action-button.primary:focus-visible {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
  outline: none;
}

.import-aside {
  align-self: stretch;
}

.import-notes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--ff-surface-subtle);
  font-size: 0.9rem;
}

.notes-title {
  margin: 0;
  color: var(--ff-text-strong);
  font-size: 1rem;
}

.notes-list {
  margin: 0;
  padding-left: 18px;
  color: var(--ff-text-muted);
  line-height: 1.4;
  font-size: 0.9rem;
  display: grid;
  gap: 8px;
}

.notes-list li::marker {
  color: var(--ff-accent);
}

.status-card {
  display: grid;
  gap: 0.5rem;
}

.results-card {
  display: grid;
  gap: 1rem;
}

.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--ff-secondary);
  color: var(--ff-surface);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.table-wrapper {
  overflow: auto;
  border-radius: 12px;
  border: 1px solid var(--ff-border);
  max-height: 260px;
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

.status.labeled {
  background: var(--ff-success-soft);
  color: var(--ff-success);
}

@media (max-width: 900px) {
  .import-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .header-stack {
    align-items: stretch;
  }

  .ff-header-actions {
    width: 100%;
  }

  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
