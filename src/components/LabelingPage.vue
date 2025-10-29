<template>
  <div class="labeling-page">
    <!-- Back button removed per request: single-forward flow only -->
    <div class="container" v-if="currentTx">
      <div class="header">
        <h1>Label Transaction</h1>
        <p>Categorize the spending below.</p>
      </div>

      <div class="transaction-card">
        <div class="info-row">
          <span class="label">Merchant:</span>
          <span class="value merchant">{{ currentTx!.merchant_text }}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span class="value">{{ currentTx!.date }}</span>
        </div>
        <div class="info-row">
          <span class="label">Amount:</span>
          <span class="value amount">{{ formatCurrency(currentTx!.amount) }}</span>
        </div>
         <div class="info-row">
          <span class="label">Transaction ID:</span>
          <span class="value mono">{{ currentTx!.tx_id }}</span>
        </div>
      </div>

      <div class="session-bar" v-if="sessionTransactions.length">
        <div>
          Session: {{ sessionIndex + 1 }} / {{ sessionTransactions.length }}
        </div>
        <div class="session-actions">
          <button type="button" class="btn-next" @click="nextTx" :disabled="stageLoading || finalizeLoading">Next</button>
        </div>
      </div>

      <div class="actions">
        <h2>Select a Category</h2>
        <div v-if="loading" class="loading-message">Loading categories...</div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="stageError" class="error-message">{{ stageError }}</div>
        <div v-if="stageMessage" class="success-message">{{ stageMessage }}</div>
        <div v-if="suggestLoading" class="loading-message">Getting suggestion…</div>
        <div v-if="suggestError" class="error-message">⚠️ Suggestion failed: {{ suggestError }}</div>
        <div v-if="!suggestLoading && visibleCategories.length > 0" class="category-list">
          <button
            v-for="category in visibleCategories"
            :key="category.category_id"
            :class="['category-item', { 'category-suggested': category.category_id === suggestedCategoryId }]"
            type="button"
            @click="stageCategory(category)"
            :disabled="stageLoading"
          >
            {{ category.name }}
            <span v-if="category.category_id === suggestedCategoryId" class="suggest-badge">✨ Suggested</span>
          </button>
        </div>
        <div v-else-if="!loading && !error && !suggestLoading" class="no-data">
          No categories found.
        </div>

        <div class="finalize">
          <button
            class="btn-finalize"
            type="button"
            @click="finalizeLabeling"
            :disabled="finalizeLoading || !userId"
          >
            {{ finalizeLoading ? 'Finalizing…' : '✅ Finalize Session' }}
          </button>
          <div v-if="finalizeError" class="error-message">{{ finalizeError }}</div>
          <div v-if="finalizeMessage" class="success-message">{{ finalizeMessage }}</div>
        </div>
      </div>
    </div>
  <div v-else class="container">
        <p>No transaction selected for labeling.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { categoryApi, labelApi, transactionApi } from '../api';
import type { CategoryNameOwner, Transaction, User } from '../api';

const props = defineProps<{
  transaction: Transaction | null;
  user: User | null;
}>();

const emit = defineEmits<{
  (e: 'navigate', page: string): void;
}>();

const allCategories = ref<CategoryNameOwner[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const stageLoading = ref(false);
const stageError = ref<string | null>(null);
const stageMessage = ref<string | null>(null);
const finalizeLoading = ref(false);
const finalizeError = ref<string | null>(null);
const finalizeMessage = ref<string | null>(null);
const suggestedCategoryId = ref<string | null>(null);
const suggestError = ref<string | null>(null);
const suggestLoading = ref(false);
// Track if the current transaction was staged in this session
const wasStagedHere = ref(false);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Session state: queue of unlabeled transactions and current pointer
const sessionTransactions = ref<Transaction[]>([]);
const sessionIndex = ref(0);
const sessionStagedTxIds = ref<Set<string>>(new Set());

// Active transaction for this page (falls back to prop)
const activeTx = ref<Transaction | null>(null);
const currentTx = computed(() => activeTx.value ?? props.transaction);

const extractUserId = (value: unknown): string | null => {
  if (!value) return null;
  const candidate =
    (value as any).user_id ??
    (value as any).id ??
    value;
  if (candidate == null) return null;
  if (typeof candidate === 'string') return candidate;
  if (typeof candidate === 'object') {
    const inner = (candidate as any).value;
    if (typeof inner === 'string') return inner;
    if (inner && typeof inner === 'object' && typeof inner.value === 'string') {
      return inner.value;
    }
  }
  try {
    return String(candidate);
  } catch {
    return null;
  }
};

const userId = computed(() => extractUserId(props.user));

const visibleCategories = computed(() => {
  const uid = userId.value;
  if (!uid) return [];
  return allCategories.value.filter(category => (category.owner_id || '') === uid);
});

const fetchCategories = async () => {
  const uid = userId.value;
  if (!uid) {
    error.value = 'User not available for fetching categories.';
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const categories = await categoryApi.getCategoriesWithNames(uid);
    allCategories.value = categories;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load categories.';
    console.error('Fetch categories error:', err);
  } finally {
    loading.value = false;
  }
};

const fetchSuggestion = async () => {
  const tx = currentTx.value;
  const uid = userId.value;
  
  if (!uid || !tx) return;
  
  suggestedCategoryId.value = null;
  suggestError.value = null;

  try {
    const txName = (tx as unknown as { tx_name?: string }).tx_name ?? tx.merchant_text ?? `Transaction ${tx.tx_id}`;
    const txMerchant = (tx as unknown as { tx_merchant?: string }).tx_merchant ?? tx.merchant_text ?? 'Unknown merchant';

    // Build the allCategories tuple list [name, id] for this user
    const categoryPairs: [string, string][] = visibleCategories.value
      .filter(c => !!c.category_id && !!c.name)
      .map(c => [c.name, c.category_id!]);

    if (categoryPairs.length === 0) {
      // Per spec, allCategories must be non-empty; skip calling suggest
      suggestError.value = 'No categories available to suggest.';
      return;
    }

    suggestLoading.value = true;
    const suggestPayload = {
      user_id: uid,
      allCategories: categoryPairs,
      txInfo: {
        tx_id: tx.tx_id,
        tx_name: txName,
        tx_merchant: txMerchant,
      },
    } as const;

    console.debug('Calling /api/Label/suggest with payload:', suggestPayload);

    const suggestion = await labelApi.suggest(suggestPayload);

    console.debug('Suggest response:', suggestion);

    suggestedCategoryId.value = suggestion.id;
  } catch (err) {
    suggestError.value = err instanceof Error ? err.message : 'Failed to get suggestion.';
    console.error('Fetch suggestion error:', err);
  } finally {
    suggestLoading.value = false;
  }
};

const stageCategory = async (category: CategoryNameOwner) => {
  const tx = currentTx.value;
  const uid = userId.value;

  if (stageLoading.value) {
    return;
  }

  if (!uid || !tx) {
    stageError.value = 'Missing user or transaction for staging.';
    return;
  }

  if (!category.category_id) {
    stageError.value = 'Selected category is missing an identifier.';
    return;
  }

  stageLoading.value = true;
  stageError.value = null;
  stageMessage.value = null;

  try {
    const txName = (tx as unknown as { tx_name?: string }).tx_name ?? tx.merchant_text ?? `Transaction ${tx.tx_id}`;
    const txMerchant = (tx as unknown as { tx_merchant?: string }).tx_merchant ?? tx.merchant_text ?? 'Unknown merchant';

    const response = await labelApi.stage({
      user_id: uid,
      tx_id: tx.tx_id,
      tx_name: txName,
      tx_merchant: txMerchant,
      category_id: category.category_id,
    });

    stageMessage.value = `Staged category "${category.name}". Click "Finalize Session" to complete.`;
    wasStagedHere.value = true;
    sessionStagedTxIds.value.add(tx.tx_id);
    // Auto-advance to the next transaction after successful staging
    nextTx();
  } catch (err) {
    stageError.value = err instanceof Error ? err.message : 'Failed to stage transaction.';
    console.error('Stage transaction error:', err);
  } finally {
    stageLoading.value = false;
  }
};

const finalizeLabeling = async () => {
  const tx = currentTx.value;
  const uid = userId.value;

  if (finalizeLoading.value) return;

  if (!uid) {
    finalizeError.value = 'User not available to finalize.';
    return;
  }

  if (!tx) {
    finalizeError.value = 'No transaction to finalize.';
    return;
  }

  finalizeLoading.value = true;
  finalizeError.value = null;
  finalizeMessage.value = null;

  try {
    // Finalize all staged labels (commits to permanent labels)
    await labelApi.finalize({ user_id: uid });
    
    // Mark all transactions staged during this session as LABELED
    const stagedIds = Array.from(sessionStagedTxIds.value);
    for (const sId of stagedIds) {
      try {
        await transactionApi.markLabeled({ tx_id: sId, requester_id: uid });
      } catch (e) {
        console.warn('Failed to mark labeled for tx', sId, e);
      }
    }
    finalizeMessage.value = stagedIds.length > 0
      ? `Finalized ${stagedIds.length} labeled transaction(s).`
      : 'No transactions were staged; nothing to finalize.';
    
    // Navigate back to unlabeled list after brief delay
    setTimeout(() => {
      emit('navigate', 'unlabeled');
    }, 1000);
  } catch (err) {
    finalizeError.value = err instanceof Error ? err.message : 'Failed to finalize labeling.';
    console.error('Finalize labeling error:', err);
  } finally {
    finalizeLoading.value = false;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Normalize various server shapes for owner_id to a string (copied from Unlabeled page)
const extractOwnerId = (value: unknown): string => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const o = value as any
    const candidate = o.value ?? o.id ?? o.user_id ?? o.owner_id
    if (typeof candidate === 'string') return candidate
    if (candidate != null) {
      try { return String(candidate) } catch { /* noop */ }
    }
  }
  try { return String(value) } catch { return '' }
}

const fetchSessionTransactions = async () => {
  const uid = userId.value
  if (!uid) return
  try {
    const resp = await transactionApi.getUnlabeledTransactions({ owner_id: uid })
    const arr = Array.isArray(resp) ? resp : []
    // Filter to only current user and keep order
    sessionTransactions.value = arr
      .map((t: any) => ({ ...t, owner_id: extractOwnerId(t?.owner_id) }))
      .filter(t => t.owner_id === uid)
  } catch (e) {
    console.error('Failed to fetch session transactions', e)
  }
}

onMounted(async () => {
  await fetchCategories();
  await fetchSessionTransactions();
  // Initialize activeTx from provided prop if present, else first in queue
  const startId = props.transaction?.tx_id
  if (startId) {
    const idx = sessionTransactions.value.findIndex(t => t.tx_id === startId)
    sessionIndex.value = idx >= 0 ? idx : 0
  } else {
    sessionIndex.value = 0
  }
  activeTx.value = sessionTransactions.value[sessionIndex.value] ?? props.transaction ?? null
  // Ensure categories are loaded before requesting a suggestion (spec requires non-empty categories)
  await fetchSuggestion();
});

watch(
  () => currentTx.value?.tx_id,
  () => {
    stageMessage.value = null;
    stageError.value = null;
    finalizeMessage.value = null;
    finalizeError.value = null;
    suggestedCategoryId.value = null;
    suggestError.value = null;
    wasStagedHere.value = false;
    fetchSuggestion();
  }
);

// Navigation helpers
const nextTx = () => {
  if (sessionIndex.value < sessionTransactions.value.length - 1) {
    sessionIndex.value += 1
    activeTx.value = sessionTransactions.value[sessionIndex.value] || null
  }
}

const skipTx = () => {
  nextTx()
}
</script>

<style scoped>
.labeling-page {
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
  font-weight: 500;
}

.container {
  max-width: 700px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2rem;
  color: #333;
}

.header p {
  color: #666;
  font-size: 1.1rem;
}

.transaction-card {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #555;
}

.value {
  color: #333;
}

.merchant {
  font-weight: bold;
  font-size: 1.1rem;
}

.amount {
  font-size: 1.2rem;
  font-weight: bold;
  color: #667eea;
}

.mono {
  font-family: monospace;
  font-size: 0.9rem;
  background: #eee;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}

.actions {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  text-align: center;
}

.session-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 1rem 0;
  padding: 0.75rem 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.session-actions { display: flex; gap: 0.5rem; }
.btn-skip, .btn-next {
  padding: 0.4rem 0.8rem;
  background: #edf2f7;
  color: #2d3748;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  cursor: pointer;
}
.btn-next { background: #e6fffa; border-color: #b2f5ea; color: #234e52; }

.actions h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.loading-message, .error-message, .success-message, .no-data {
  padding: 1rem;
  color: #666;
}

.error-message {
  color: #e53e3e;
  background-color: #fff5f5;
  border: 1px solid #e53e3e;
  border-radius: 6px;
}

.success-message {
  color: #276749;
  background-color: #f0fff4;
  border: 1px solid #68d391;
  border-radius: 6px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}

.category-item {
  background-color: #f0f4ff;
  color: #5a67d8;
  padding: 0.75rem 1.25rem;
  border-radius: 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #c3dafe;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-style: solid;
  background-clip: padding-box;
}

.category-item:hover {
  background-color: #e2e8f0;
  color: #4c51bf;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.category-item:disabled {
  cursor: not-allowed;
  opacity: 0.65;
  transform: none;
  box-shadow: none;
}

.category-suggested {
  background-color: #fef3c7 !important;
  border: 2px solid #f59e0b !important;
  color: #92400e !important;
  font-weight: 600;
  position: relative;
}

.category-suggested:hover {
  background-color: #fde68a !important;
  color: #78350f !important;
}

.suggest-badge {
  margin-left: 0.5rem;
  font-size: 0.75rem;
}

.finalize {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.5rem;
  justify-items: center;
}

.btn-finalize {
  padding: 0.6rem 1.1rem;
  background: #2f855a;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.btn-finalize:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
