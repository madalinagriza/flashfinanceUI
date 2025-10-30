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
  <div class="main-page">
    <div class="container">
      <div class="welcome-section">
        <h1>Welcome to FlashFinance</h1>
        <p v-if="user" class="greeting">Hello, <strong>{{ user.name }}</strong>!</p>
        <p class="subtitle">Your personal finance management dashboard</p>
      </div>

      <div class="content-section">
        <div class="placeholder-card">
          <h2>🎯 Getting Started</h2>
          <p>Your main dashboard will appear here.</p>
          <ul class="feature-list">
            <li>Import and categorize transactions</li>
            <li>Track spending by category</li>
            <li>Set and monitor budgets</li>
            <li>View financial insights</li>
          </ul>
        </div>
      </div>

      <div class="user-info" v-if="user">
        <div class="info-card">
          <h3>Account Information</h3>
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">{{ user.email }}</span>
          </div>
          <div class="info-item">
            <span class="label">Status:</span>
            <span class="status-badge" :class="user.status.toLowerCase()">
              {{ user.status }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">User ID:</span>
            <span class="value">{{ user.user_id }}</span>
          </div>
          <button class="btn-account" @click="emit('view-account', user)">View Personal Account Page</button>
        </div>
      </div>
.btn-account {
  display: block;
  margin: 1.5rem auto 0 auto;
  padding: 0.7rem 2rem;
  background: #e7f1ff;
  color: #1d4ed8;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-account:hover {
  background: #c7e0ff;
}

      <button @click="emit('navigate', 'import')" class="btn-primary">
        Import Transactions
      </button>
      <button @click="emit('navigate', 'unlabeled')" class="btn-secondary">
        View Unlabeled Transactions
      </button>
      <button @click="emit('navigate', 'categories')" class="btn-secondary">
        Manage Categories
      </button>
      <button @click="emit('signOut')" class="btn-signout">
        Sign Out
      </button>
    </div>
  </div>
</template>

<style scoped>
.main-page {
  min-height: calc(100vh - 70px);
  background: #f5f7fa;
  padding: 2rem 1rem;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.welcome-section {
  text-align: center;
  margin-bottom: 3rem;
}

h1 {
  font-size: 2.5rem;
  color: #333;
  margin: 0 0 1rem 0;
}

.greeting {
  font-size: 1.25rem;
  color: #667eea;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

.content-section {
  margin-bottom: 2rem;
}

.placeholder-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.placeholder-card h2 {
  color: #333;
  margin: 0 0 1rem 0;
}

.placeholder-card p {
  color: #666;
  margin-bottom: 1.5rem;
}

.feature-list {
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
  color: #666;
  line-height: 1.8;
}

.user-info {
  margin-bottom: 2rem;
}

.info-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-family: monospace;
  font-size: 0.9rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.btn-primary {
  display: block;
  margin: 2rem auto 1rem auto;
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5568d3;
}

.btn-signout {
  display: block;
  margin: 0 auto;
  padding: 0.75rem 2rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-signout:hover {
  background: #c82333;
}

.btn-secondary {
  display: block;
  margin: 0.5rem auto 1.25rem auto;
  padding: 0.75rem 2rem;
  background: #22b8cf;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-secondary:hover {
  background: #1fa0b5;
}
</style>
