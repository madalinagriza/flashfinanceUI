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
        <button
          v-if="!loading && !error && currentTx && userId"
          class="btn-discard"
          type="button"
          @click="discardCurrentTx"
          :disabled="stageLoading || finalizeLoading"
        >
          🗑️ Send to Trash
        </button>
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
import { normalizeId } from '../utils/normalize';
import type {
  CategoryNameOwner,
  DiscardLabelRequest,
  StagedLabel,
  Transaction,
  TransactionInfoResponse,
  User,
} from '../api';

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

const extractUserId = (value: unknown): string | null => normalizeId((value as any)?.user_id ?? (value as any)?.id ?? value);

const userId = computed(() => extractUserId(props.user));

// Check per-user preference (localStorage) for whether AI suggestions should be requested.
const isSuggestEnabled = (uid: string | null): boolean => {
  if (!uid) return false
  try {
    const raw = localStorage.getItem(`suggestAi_${uid}`)
    // default true if not set
    return raw == null ? true : raw === 'true'
  } catch (e) {
    console.error('Failed to read suggest-AI preference, defaulting to enabled', e)
    return true
  }
}

const resolveTxIdValue = (value: unknown): string | null => normalizeId(value);

const extractTxId = (tx: unknown): string | null => {
  if (tx == null) return null;
  if (typeof tx === 'string' || typeof tx === 'number' || typeof tx === 'bigint') {
    return String(tx);
  }
  if (typeof tx === 'object') {
    const obj = tx as Record<string, unknown>;
    return (
      resolveTxIdValue(obj.tx_id) ??
      resolveTxIdValue(obj._id) ??
      resolveTxIdValue(obj.id) ??
      resolveTxIdValue(obj.transaction_id) ??
      null
    );
  }
  return null;
};

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

    const resolvedId = normalizeId((suggestion as any)?.id ?? (suggestion as any)?.category_id ?? suggestion) ?? null;
    const matchFound = !!resolvedId && visibleCategories.value.some(cat => cat.category_id === resolvedId);

    if (resolvedId) {
      suggestedCategoryId.value = resolvedId;
      if (!matchFound) {
        suggestError.value = 'Suggestion refers to a category that is not in your list.';
      }
    } else {
      suggestError.value = 'Suggestion response missing a valid category id.';
    }
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

  const txId = extractTxId(tx);
  if (!txId) {
    stageError.value = 'Transaction is missing a valid identifier.';
    return;
  }

  try {
    const txName = (tx as unknown as { tx_name?: string }).tx_name ?? tx.merchant_text ?? `Transaction ${txId}`;
    const txMerchant = (tx as unknown as { tx_merchant?: string }).tx_merchant ?? tx.merchant_text ?? 'Unknown merchant';

    const response = await labelApi.stage({
      user_id: uid,
      tx_id: txId,
      tx_name: txName,
      tx_merchant: txMerchant,
      category_id: category.category_id,
    });

    stageMessage.value = `Staged category "${category.name}". Click "Finalize Session" to complete.`;
    wasStagedHere.value = true;
    sessionStagedTxIds.value.add(txId);
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
    let stagedPairs: Array<{ txId: string; categoryId: string }> = [];
    let stagedIds: string[] = [];
    try {
      const stagedResponse = await labelApi.getStagedLabels({ user_id: uid });
      const stagedList = Array.isArray(stagedResponse) ? (stagedResponse as StagedLabel[]) : [];
      stagedPairs = stagedList
        .map((entry) => {
          if (!entry) return null;
          const txId = resolveTxIdValue((entry as any).tx_id);
          const categoryId = resolveTxIdValue((entry as any).category_id);
          return txId && categoryId ? { txId, categoryId } : null;
        })
        .filter((pair): pair is { txId: string; categoryId: string } => pair !== null);
      stagedIds = stagedPairs.map((pair) => pair.txId);
    } catch (fetchErr) {
      console.error('Failed to fetch staged labels before finalize', fetchErr);
    }

    // Fallback to locally tracked staged ids if server returned none
    if (stagedIds.length === 0 && sessionStagedTxIds.value.size > 0) {
      stagedIds = Array.from(sessionStagedTxIds.value);
    }

    // Deduplicate IDs to avoid double-marking
    const uniqueIds = Array.from(new Set(stagedIds));
    for (const sId of uniqueIds) {
      try {
        await transactionApi.markLabeled({ tx_id: sId, requester_id: uid });
      } catch (e) {
        console.warn('Failed to mark labeled for tx', sId, e);
      }
    }

    // Finalize all staged labels (commits to permanent labels)
    await labelApi.finalize({ user_id: uid });

    // Update category metrics for each staged tx/category pair
    if (stagedPairs.length > 0) {
      const uniquePairs = new Map<string, string>();
      stagedPairs.forEach(({ txId, categoryId }) => {
        if (!uniquePairs.has(txId)) {
          uniquePairs.set(txId, categoryId);
        }
      });

      const addTransactionsPromises = Array.from(uniquePairs.entries()).map(async ([txId, categoryId]) => {
        try {
          const txInfo = await transactionApi.getTxInfo({ owner_id: uid, tx_id: txId });
          const amount = typeof txInfo?.amount === 'number' && Number.isFinite(txInfo.amount)
            ? txInfo.amount
            : Number(txInfo?.amount ?? 0) || 0;
          const txDate = typeof txInfo?.date === 'string' && txInfo.date.length > 0
            ? txInfo.date
            : new Date().toISOString();

          await categoryApi.addTransaction({
            owner_id: uid,
            category_id: categoryId,
            tx_id: txId,
            amount,
            tx_date: txDate,
          });
        } catch (catErr) {
          console.warn('Failed to add transaction to category metrics', { txId, categoryId }, catErr);
        }
      });

      if (addTransactionsPromises.length > 0) {
        await Promise.allSettled(addTransactionsPromises);
      }
    }

    sessionStagedTxIds.value.clear();

    finalizeMessage.value = uniqueIds.length > 0
      ? `Finalized ${uniqueIds.length} labeled transaction(s).`
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

const discardCurrentTx = async () => {
  const tx = currentTx.value;
  const uid = userId.value;

  if (stageLoading.value || finalizeLoading.value) return;
  if (!uid || !tx) {
    stageError.value = 'Missing user or transaction for discard.';
    return;
  }

  stageLoading.value = true;
  stageError.value = null;
  stageMessage.value = null;

  const txId = extractTxId(tx);
  if (!txId) {
    stageError.value = 'Transaction is missing a valid identifier.';
    return;
  }

  try {
    const txName = (tx as unknown as { tx_name?: string }).tx_name ?? tx.merchant_text ?? `Transaction ${txId}`;
    const txMerchant = (tx as unknown as { tx_merchant?: string }).tx_merchant ?? tx.merchant_text ?? 'Unknown merchant';

    const payload: DiscardLabelRequest = {
      user_id: uid,
      tx_id: txId,
      tx_name: txName,
      tx_merchant: txMerchant,
    };

    await labelApi.discard(payload);

    stageMessage.value = 'Transaction staged for Trash.';
    wasStagedHere.value = true;
    sessionStagedTxIds.value.add(txId);
    nextTx();
  } catch (err) {
    stageError.value = err instanceof Error ? err.message : 'Failed to discard transaction.';
    console.error('Discard transaction error:', err);
  } finally {
    stageLoading.value = false;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Normalize various server shapes for owner_id to a string (copied from Unlabeled page)
const extractOwnerId = (value: unknown): string => normalizeId(value) ?? ''

const fetchSessionTransactions = async () => {
  const uid = userId.value
  if (!uid) return
  try {
    const resp = await transactionApi.getUnlabeledTransactions({ owner_id: uid })
    const arr = Array.isArray(resp) ? resp : []
    // Filter to only current user and keep order
    sessionTransactions.value = arr
      .map((t: any) => {
        const normalizedId = extractTxId(t)
        if (!normalizedId) return null
        return {
          ...t,
          tx_id: normalizedId,
          owner_id: extractOwnerId(t?.owner_id),
        } as Transaction
      })
      .filter((item): item is Transaction => {
        if (!item) return false
        return item.owner_id === uid
      })
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
  if (isSuggestEnabled(userId.value)) {
    await fetchSuggestion();
  } else {
    // Clear any previous suggestion state if suggestions are disabled
    suggestedCategoryId.value = null
    suggestError.value = null
    suggestLoading.value = false
    console.debug('AI suggestions are disabled for user', userId.value)
  }
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
    // Only attempt suggestions if enabled for this user
    if (isSuggestEnabled(userId.value)) {
      fetchSuggestion();
    } else {
      suggestedCategoryId.value = null;
      suggestError.value = null;
      suggestLoading.value = false;
      console.debug('Skipping suggestion because user preference disabled', userId.value);
    }
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

.btn-discard {
  align-self: flex-start;
  background: #ffe6e6;
  color: #b22222;
  border: 1px solid #f5c2c2;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-discard:hover:enabled {
  background: #ffcccc;
}

.btn-discard:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.debug-box {
  margin-top: 1.5rem;
  padding: 1rem;
  text-align: left;
  background: #f8fafc;
  border: 1px dashed #a0aec0;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
