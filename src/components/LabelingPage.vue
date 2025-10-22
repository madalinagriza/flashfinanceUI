<template>
  <div class="labeling-page">
    <div class="topbar">
      <button class="btn-back" @click="$emit('navigate', 'unlabeled')">← Back to Unlabeled Transactions</button>
    </div>
    <div class="container" v-if="transaction">
      <div class="header">
        <h1>Label Transaction</h1>
        <p>Categorize the spending below.</p>
      </div>

      <div class="transaction-card">
        <div class="info-row">
          <span class="label">Merchant:</span>
          <span class="value merchant">{{ transaction.merchant_text }}</span>
        </div>
        <div class="info-row">
          <span class="label">Date:</span>
          <span class="value">{{ transaction.date }}</span>
        </div>
        <div class="info-row">
          <span class="label">Amount:</span>
          <span class="value amount">{{ formatCurrency(transaction.amount) }}</span>
        </div>
         <div class="info-row">
          <span class="label">Transaction ID:</span>
          <span class="value mono">{{ transaction.tx_id }}</span>
        </div>
      </div>

      <div class="actions">
        <h2>Select a Category</h2>
        <div v-if="loading" class="loading-message">Loading categories...</div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="stageError" class="error-message">{{ stageError }}</div>
        <div v-if="stageMessage" class="success-message">{{ stageMessage }}</div>
        <div v-if="visibleCategories.length > 0" class="category-list">
          <button
            v-for="category in visibleCategories"
            :key="category.category_id"
            class="category-item"
            type="button"
            @click="stageCategory(category)"
            :disabled="stageLoading"
          >
            {{ category.name }}
          </button>
        </div>
        <div v-else-if="!loading && !error" class="no-data">
          No categories found.
        </div>

        <div class="finalize">
          <button
            class="btn-finalize"
            type="button"
            @click="finalizeLabeling"
            :disabled="finalizeLoading || !userId"
          >
            {{ finalizeLoading ? 'Finalizing…' : '✅ Finish Labeling' }}
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
    const response = await categoryApi.getCategoryNamesAndOwners();
    allCategories.value = Array.isArray(response) ? response : [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load categories.';
    console.error('Fetch categories error:', err);
  } finally {
    loading.value = false;
  }
};

const stageCategory = async (category: CategoryNameOwner) => {
  const tx = props.transaction;
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

    stageMessage.value = `Stage successful! label_tx_id: ${response.label_tx_id}`;

    // Immediately mark the transaction as LABELED
    await transactionApi.markLabeled({ tx_id: tx.tx_id, requester_id: uid });

    // Navigate back to unlabeled list to trigger refresh
    emit('navigate', 'unlabeled');
  } catch (err) {
    stageError.value = err instanceof Error ? err.message : 'Failed to stage transaction.';
    console.error('Stage transaction error:', err);
  } finally {
    stageLoading.value = false;
  }
};

const finalizeLabeling = async () => {
  const uid = userId.value;

  if (finalizeLoading.value) return;

  if (!uid) {
    finalizeError.value = 'User not available to finalize.';
    return;
  }

  finalizeLoading.value = true;
  finalizeError.value = null;
  finalizeMessage.value = null;

  try {
    await labelApi.finalize({ user_id: uid });
    finalizeMessage.value = 'Labeling finalized successfully!';
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

onMounted(fetchCategories);

watch(
  () => props.transaction?.tx_id,
  () => {
    stageMessage.value = null;
    stageError.value = null;
    finalizeMessage.value = null;
    finalizeError.value = null;
  }
);
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
