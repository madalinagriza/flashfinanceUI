<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryNameOwner, User } from '../api'

const props = defineProps<{
  user: User | null
  category: CategoryNameOwner | null
}>()

const emit = defineEmits<{
  navigate: [page: string]
}>()

const categoryId = computed(() => props.category?.category_id ?? null)
const categoryName = computed(() => props.category?.name ?? 'Unknown category')
const ownerId = computed(() => props.category?.owner_id ?? props.user?.user_id ?? null)

const goBack = () => {
  emit('navigate', 'categories')
}
</script>

<template>
  <div class="category-detail">
    <div class="topbar">
      <button class="btn-back" type="button" @click="goBack">← Back to Categories</button>
    </div>

    <div class="container">
      <div v-if="!categoryId" class="empty-state">
        <h2>No category selected</h2>
        <p>Select a category from the list to see its details.</p>
        <button class="btn-primary" type="button" @click="goBack">Return to Categories</button>
      </div>

      <div v-else class="content">
        <header class="header">
          <div>
            <h1>{{ categoryName }}</h1>
            <p class="subtitle">Category ID: <code>{{ categoryId }}</code></p>
          </div>
          <div class="meta">
            <span>Owner</span>
            <code>{{ ownerId }}</code>
          </div>
        </header>

        <section class="overview">
          <h2>Getting Started</h2>
          <p>
            Track how this category performs over time. Future iterations will surface spending totals,
            recent transactions, and trend lines right on this page.
          </p>
          <div class="cards">
            <div class="card">
              <span class="label">Status</span>
              <span class="value">Ready</span>
            </div>
            <div class="card">
              <span class="label">Owner</span>
              <span class="value">{{ ownerId || 'n/a' }}</span>
            </div>
          </div>
        </section>

        <section class="actions">
          <h2>Next Steps</h2>
          <p>Use the labeling flow to assign more transactions to this category.</p>
          <div class="buttons">
            <button class="btn-secondary" type="button" @click="emit('navigate', 'unlabeled')">
              Label Transactions
            </button>
          </div>
        </section>

        <section class="history">
          <h2>What’s Coming</h2>
          <p class="status empty">
            Transaction history, budget metrics, and AI-powered insights will appear here soon.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-detail {
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

.empty-state {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-align: center;
}

.btn-primary {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header {
  background: #fff;
  border-radius: 8px;
  padding: 1.75rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.subtitle {
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.95rem;
}

.meta {
  text-align: right;
  color: #555;
  font-size: 0.9rem;
}

.meta code {
  display: block;
  margin-top: 0.35rem;
  background: #f5f5f5;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
}

.overview, .actions, .history {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.05);
}

.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.card {
  flex: 1 1 240px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  padding: 1.25rem;
  color: #fff;
}

.card .label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.card .value {
  font-size: 2rem;
  font-weight: 700;
}

.actions .buttons {
  margin-top: 1rem;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  background: #22b8cf;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  color: #666;
}

.status.empty {
  color: #888;
}
</style>
