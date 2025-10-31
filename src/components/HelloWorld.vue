<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

defineProps<{ msg: string }>()

const users = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const fetchUsers = async () => {
  loading.value = true
  error.value = null
  try {
    users.value = await userApi.all()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch users'
    console.error('Error fetching users:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section>
    <p>{{ msg }}</p>
    <p>
      Backend API: <code>http://localhost:8000/api</code>
    </p>
    
    <div style="margin-top: 1rem;">
      <button @click="fetchUsers" :disabled="loading">
        {{ loading ? 'Loading...' : 'Fetch All Users' }}
      </button>
      
      <div v-if="error" class="alert error">
        <span class="icon icon-error" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10" cy="10" r="8" />
            <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
          </svg>
        </span>
        <span>{{ error }}</span>
      </div>
      
      <div v-if="users.length > 0" style="margin-top: 1rem;">
        <h4>Users ({{ users.length }}):</h4>
        <ul style="text-align: left;">
          <li v-for="user in users" :key="user.user_id">
            <strong>{{ user.name }}</strong> ({{ user.email }}) - {{ user.status }}
          </li>
        </ul>
      </div>
      
      <div v-else-if="!loading && !error" class="empty-hint">
        Click the button to test the API connection
      </div>
    </div>
  </section>
</template>

<style scoped>
section {
  background: var(--ff-surface);
  border: 1px solid var(--ff-border);
  padding: 1rem;
  border-radius: var(--radius);
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
  color: var(--ff-text-base);
}

code {
  background: var(--ff-primary-ghost);
  padding: 0.15rem 0.35rem;
  border-radius: 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 0.85rem;
}

button {
  background: var(--ff-primary);
  color: var(--ff-surface);
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease, transform 0.2s ease;
}

button:hover:not(:disabled) {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

ul {
  list-style: none;
  padding: 0;
}
li {
  padding: 0.25rem 0;
}

.alert {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
  font-size: 0.9rem;
}

.alert span:last-child {
  line-height: 1.4;
}

.empty-hint {
  margin-top: 0.5rem;
  color: var(--ff-text-muted);
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
}

.icon svg {
  width: 100%;
  height: 100%;
}

.icon-error {
  color: var(--ff-error);
}
</style>
