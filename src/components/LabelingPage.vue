<template>
  <div class="labeling-page ff-page">
    <div v-if="currentTx" class="ff-page-frame">
      <header class="ff-page-header labeling-header">
        <div class="labeling-heading">
          <h1>Label Transaction</h1>
          <p class="ff-page-subtitle">Categorize the spending below.</p>
        </div>
        <div class="labeling-actions">
          <span v-if="sessionTransactions.length" class="session-indicator">
            Tx {{ sessionIndex + 1 }} of {{ sessionTransactions.length }}
          </span>
          <button
            v-if="sessionTransactions.length > 1"
            type="button"
            class="action-button ghost header-next"
            @click="nextTx"
            :disabled="stageLoading || finalizeLoading || sessionIndex >= sessionTransactions.length - 1"
          >
            Next
          </button>
          <button
            type="button"
            class="action-button primary header-finalize"
            @click="finalizeLabeling"
            :disabled="finalizeLoading || !userId || !currentTx"
          >
            <template v-if="finalizeLoading">Finalizing…</template>
            <template v-else>
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 11l3.5 3.5L15 8" />
                  <circle cx="10" cy="10" r="8" />
                </svg>
              </span>
              Finalize session
            </template>
          </button>
        </div>
      </header>

      <div class="ff-page-grid labeling-layout">
        <div class="ff-column labeling-column">
          <section class="ff-card tx-card">
            <h2 class="ff-card-title">Transaction details</h2>
            <div class="tx-grid">
              <div class="tx-row">
                <span class="tx-label">Merchant</span>
                <span class="tx-value merchant">{{ currentTx!.merchant_text }}</span>
              </div>
              <div class="tx-row">
                <span class="tx-label">Date</span>
                <span class="tx-value">{{ currentTx!.date }}</span>
              </div>
              <div class="tx-row">
                <span class="tx-label">Amount</span>
                <span class="tx-value amount">{{ formatCurrency(currentTx!.amount) }}</span>
              </div>
            </div>
          </section>

          <section class="ff-card category-card">
            <div class="category-header">
              <h2 class="ff-card-title">Select a category</h2>
              <button
                v-if="!loading && !error && currentTx && userId"
                type="button"
                class="link-button danger"
                @click="discardCurrentTx"
                :disabled="stageLoading || finalizeLoading"
              >
                <span class="ff-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 5h-12" />
                    <path d="M7.5 3h5l.5 2h-6z" />
                    <path d="M14 5v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5" />
                  </svg>
                </span>
                Send to trash
              </button>
            </div>
            <div v-if="loading" class="loading-message">Loading categories…</div>
            <div v-if="error" class="banner error">
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                </svg>
              </span>
              {{ error }}
            </div>
            <div v-if="stageError" class="banner error">
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                </svg>
              </span>
              {{ stageError }}
            </div>
            <div v-if="stageMessage" class="banner success">
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 11l3.5 3.5L15 8" />
                  <circle cx="10" cy="10" r="8" />
                </svg>
              </span>
              {{ stageMessage }}
            </div>
            <div v-if="suggestLoading" class="loading-message">Getting suggestion…</div>
            <div v-if="suggestError" class="banner warning">
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 3.2l7.2 12.6a1 1 0 0 1-.87 1.5H3.67a1 1 0 0 1-.87-1.5L10 3.2z" />
                  <path d="M10 8v3.8" />
                  <path d="M10 14.8h.01" />
                </svg>
              </span>
              Suggestion failed: {{ suggestError }}
            </div>

            <div v-if="!suggestLoading && visibleCategories.length > 0" class="category-grid">
              <button
                v-for="category in visibleCategories"
                :key="category.category_id"
                type="button"
                class="category-chip"
                :class="{ suggested: category.category_id === suggestedCategoryId }"
                @click="stageCategory(category)"
                :disabled="stageLoading"
              >
                {{ category.name }}
              </button>
            </div>
            <div v-else-if="!loading && !error && !suggestLoading" class="no-data">No categories found.</div>
            <div v-if="finalizeError || finalizeMessage" class="finalize-status">
              <div v-if="finalizeError" class="banner error">
                <span class="ff-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="10" cy="10" r="8" />
                    <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                  </svg>
                </span>
                {{ finalizeError }}
              </div>
              <div v-if="finalizeMessage" class="banner success">
                <span class="ff-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 11l3.5 3.5L15 8" />
                    <circle cx="10" cy="10" r="8" />
                  </svg>
                </span>
                {{ finalizeMessage }}
              </div>
            </div>
          </section>
          <section class="ff-card compact tips-card">
            <h3 class="section-title">Labeling tips</h3>
            <ul class="tips-list">
              <li>Suggested categories are highlighted for quick selection.</li>
              <li>Use the “Next” control to move through the session without leaving the page.</li>
              <li>Finalize after confirming every transaction has been categorized.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>

    <div v-else class="ff-page-frame">
      <section class="ff-card empty-state">
        <p>No transaction selected for labeling.</p>
        <button type="button" class="action-button secondary" @click="emit('navigate', 'unlabeled')">
          Return to queue
        </button>
      </section>
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
.labeling-header {
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.labeling-heading {
  display: grid;
  gap: 0.45rem;
}

.labeling-heading h1 {
  margin: 0;
  color: var(--ff-primary);
}

.labeling-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.session-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.labeling-layout {
  grid-template-columns: minmax(0, 1fr);
}

.labeling-column {
  display: grid;
  gap: 1.5rem;
}

.tx-card {
  display: grid;
  gap: 1.25rem;
}

.tx-grid {
  display: grid;
  gap: 0.85rem;
}

.tx-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ff-border);
}

.tx-row:last-child {
  border-bottom: none;
}

.tx-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ff-text-subtle);
}

.tx-value {
  color: var(--ff-text-base);
  font-weight: 600;
}

.tx-value.merchant {
  color: var(--ff-primary);
  font-size: 1.1rem;
}

.tx-value.amount {
  color: var(--ff-secondary);
  font-size: 1.15rem;
}

.category-card {
  display: grid;
  gap: 1rem;
}

.category-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.link-button {
  border-radius: 999px;
  border: 1px solid var(--ff-border);
  background: var(--ff-surface);
  color: var(--ff-primary);
  padding: 0.45rem 1rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.link-button:hover,
.link-button:focus-visible {
  background: var(--ff-primary-ghost);
  border-color: var(--ff-primary-border-strong);
  outline: none;
}

.link-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-button.danger {
  border-color: var(--ff-error-border);
  background: var(--ff-error-soft);
  color: var(--ff-error);
}

.link-button.danger:hover,
.link-button.danger:focus-visible {
  background: rgba(196, 76, 76, 0.24);
}

.loading-message {
  color: var(--ff-text-muted);
  font-size: 0.95rem;
}

.banner {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.95rem;
}

.banner.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
}

.banner.success {
  background: var(--ff-success-soft);
  border: 1px solid var(--ff-success-border);
  color: var(--ff-success);
}

.banner.warning {
  background: rgba(231, 183, 91, 0.18);
  border: 1px solid rgba(231, 183, 91, 0.32);
  color: #8a6728;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.category-chip {
  border-radius: 999px;
  border: 1px solid var(--ff-primary-border-strong);
  padding: 0.55rem 1.15rem;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.category-chip:hover,
.category-chip:focus-visible {
  background: rgba(61, 122, 116, 0.24);
  transform: translateY(-1px);
  outline: none;
}

.category-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.category-chip.suggested {
  background: rgba(231, 183, 91, 0.22);
  border-color: rgba(231, 183, 91, 0.42);
  color: #8a6728;
}

.no-data {
  color: var(--ff-text-muted);
  font-size: 0.95rem;
}

.tips-card {
  display: grid;
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1.05rem;
}

.tips-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--ff-text-muted);
  line-height: 1.6;
}

.action-button {
  border-radius: 999px;
  border: none;
  padding: 0.7rem 1.4rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

.action-button.primary {
  background: var(--ff-primary);
  color: var(--ff-surface);
}

.action-button.ghost {
  background: var(--ff-surface);
  color: var(--ff-text-base);
  border: 1px solid var(--ff-border);
}

.action-button.ghost:hover:not(:disabled),
.action-button.ghost:focus-visible:not(:disabled) {
  background: var(--ff-overlay);
}

.action-button.primary:hover:not(:disabled),
.action-button.primary:focus-visible:not(:disabled) {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
  outline: none;
}

.action-button.secondary {
  background: var(--ff-secondary);
  color: var(--ff-surface);
}

.action-button.secondary:hover,
.action-button.secondary:focus-visible {
  background: var(--ff-secondary-hover);
  outline: none;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.finalize-status {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.empty-state {
  display: grid;
  gap: 1rem;
  justify-items: center;
  text-align: center;
}

.ff-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
}

.ff-icon svg {
  width: 100%;
  height: 100%;
}

@media (max-width: 720px) {
  .labeling-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .labeling-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
  }

  .labeling-actions .action-button {
    flex: 1 1 100%;
  }

  .category-header {
    flex-direction: column;
    align-items: stretch;
  }

  .link-button {
    width: 100%;
    justify-content: center;
  }

  .category-grid {
    justify-content: flex-start;
  }

  .action-button {
    width: 100%;
  }
}
</style>
