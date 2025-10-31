<script setup lang="ts">
import { ref } from 'vue'
import type { User } from '../api'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  signOut: []
  navigate: [page: string]
  'view-account': [user: User]
}>()
</script>

<template>
  <div class="main-page ff-page">
    <div class="ff-page-frame">
      <header class="ff-page-header">
        <div class="ff-page-heading">
          <p class="eyebrow">Dashboard</p>
          <h1>Welcome to FlashFinance</h1>
          <p class="ff-page-subtitle">Stay organized by importing transactions, labeling activity, and monitoring category health.</p>
          <p v-if="user" class="greeting">Signed in as <strong>{{ user.name }}</strong></p>
        </div>
        <div class="ff-header-actions">
          <button type="button" class="header-action ghost" @click="emit('navigate', 'categories')">Categories</button>
          <button type="button" class="header-action" @click="emit('navigate', 'import')">Import CSV</button>
          <button
            v-if="user"
            type="button"
            class="header-action accent"
            @click="emit('view-account', user)"
          >Account</button>
        </div>
      </header>

      <div class="ff-page-grid">
        <div class="ff-column">
          <section class="ff-card primary-overview">
            <h2 class="ff-card-title">Kickstart your workflow</h2>
            <p class="ff-card-subtitle">Follow these steps to keep your finances current and ready for insights.</p>
            <div class="action-row">
              <button type="button" class="action-button primary" @click="emit('navigate', 'import')">Import Transactions</button>
              <button type="button" class="action-button secondary" @click="emit('navigate', 'unlabeled')">Start Labeling</button>
              <button type="button" class="action-button ghost" @click="emit('navigate', 'categories')">Manage Categories</button>
            </div>
            <div class="progress-callout">
              <span class="ff-section-label">Suggested next step</span>
              <p class="ff-summary">Importing your latest statement surfaces new transactions for fast labeling and analysis.</p>
            </div>
            <div class="ff-card-divider"></div>
            <div class="insight-grid">
              <div class="insight-item">
                <span class="ff-section-label">What you can do</span>
                <ul class="feature-list">
                  <li>Import and categorize transactions</li>
                  <li>Track spending by category</li>
                  <li>Set and monitor budgets</li>
                  <li>View upcoming financial insights</li>
                </ul>
              </div>
              <div class="insight-item">
                <span class="ff-section-label">Up next</span>
                <p class="ff-summary">Dashboard charts and budgeting tools will appear here as data and goals roll in.</p>
              </div>
            </div>
          </section>
        </div>

        <div class="ff-column">
          <section class="ff-card account-card" v-if="user">
            <div class="account-header">
              <h2 class="ff-card-title">Account snapshot</h2>
              <span class="status-pill" :class="user.status.toLowerCase()">{{ user.status }}</span>
            </div>
            <dl class="account-details">
              <div>
                <dt>Email</dt>
                <dd>{{ user.email }}</dd>
              </div>
            </dl>
            <button type="button" class="action-button ghost full-width" @click="emit('view-account', user)">
              View personal account
            </button>
          </section>
          <section class="ff-card account-card" v-else>
            <h2 class="ff-card-title">No user signed in</h2>
            <p class="ff-summary">Sign in to view your account details and personalize your dashboard experience.</p>
          </section>

          <section class="ff-card compact secondary-overview">
            <h3 class="secondary-title">Helpful links</h3>
            <ul class="link-list">
              <li>
                <button type="button" class="inline-link" @click="emit('navigate', 'import')">Import CSV guide</button>
              </li>
              <li>
                <button type="button" class="inline-link" @click="emit('navigate', 'categories')">Category management</button>
              </li>
              <li>
                <button type="button" class="inline-link" @click="emit('navigate', 'unlabeled')">Label transactions</button>
              </li>
            </ul>
          </section>
        </div>
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

.ff-header-actions {
  flex-wrap: wrap;
}

.header-action {
  border: 1px solid rgba(255, 255, 255, 0.0);
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  border-radius: 999px;
  padding: 0.35rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.header-action:hover,
.header-action:focus-visible {
  background: var(--ff-primary);
  color: var(--ff-surface);
  border-color: transparent;
  outline: none;
}

.header-action.ghost {
  background: transparent;
  border-color: rgba(61, 122, 116, 0.32);
  color: var(--ff-primary);
}

.header-action.ghost:hover,
.header-action.ghost:focus-visible {
  background: var(--ff-primary-ghost);
}

.header-action.accent {
  background: var(--ff-secondary);
  color: var(--ff-surface);
}

.header-action.accent:hover,
.header-action.accent:focus-visible {
  background: var(--ff-secondary-hover);
}

.primary-overview {
  display: grid;
  gap: 1.5rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.action-button {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.65rem 1.4rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.action-button.primary {
  background: var(--ff-primary);
  color: var(--ff-surface);
}

.action-button.primary:hover,
.action-button.primary:focus-visible {
  background: var(--ff-primary-hover);
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

.action-button.ghost {
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  border-color: var(--ff-primary-border-strong);
}

.action-button.ghost:hover,
.action-button.ghost:focus-visible {
  background: rgba(61, 122, 116, 0.2);
  outline: none;
}

.action-button.full-width {
  width: 100%;
  justify-content: center;
}

.progress-callout {
  display: grid;
  gap: 0.5rem;
}

.insight-grid {
  display: grid;
  gap: 1.25rem;
}

.feature-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--ff-text-base);
  line-height: 1.7;
}

.account-card {
  display: grid;
  gap: 1.25rem;
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
}

.status-pill.active {
  background: var(--ff-success-soft);
  color: var(--ff-success);
}

.status-pill.inactive {
  background: var(--ff-error-soft);
  color: var(--ff-error);
}

.account-details {
  display: grid;
  gap: 1rem;
  margin: 0;
}

.account-details div {
  display: grid;
  gap: 0.35rem;
}

.account-details dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ff-text-subtle);
}

.account-details dd {
  margin: 0;
  color: var(--ff-text-strong);
}

.secondary-overview {
  display: grid;
  gap: 1rem;
}

.secondary-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1.1rem;
}

.link-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.inline-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--ff-secondary);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: color 0.2s ease;
}

.inline-link:hover,
.inline-link:focus-visible {
  color: var(--ff-secondary-hover);
  outline: none;
}

@media (max-width: 960px) {
  .ff-header-actions {
    align-self: stretch;
  }

  .header-action {
    flex: 1;
    text-align: center;
  }
}

@media (max-width: 640px) {
  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
