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
      
      <div v-if="error" style="color: #d32f2f; margin-top: 0.5rem;">
        ❌ {{ error }}
      </div>
      
      <div v-if="users.length > 0" style="margin-top: 1rem;">
        <h4>Users ({{ users.length }}):</h4>
        <ul style="text-align: left;">
          <li v-for="user in users" :key="user.user_id">
            <strong>{{ user.name }}</strong> ({{ user.email }}) - {{ user.status }}
          </li>
        </ul>
      </div>
      
      <div v-else-if="!loading && !error" style="margin-top: 0.5rem; color: #666;">
        Click the button to test the API connection
      </div>
    </div>
  </section>
</template>

<style scoped>
section {
  background: #f7f7f8;
  border: 1px solid #e4e4e7;
  padding: 1rem;
  border-radius: 0.5rem;
}
code {
  background: #efefef;
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}
button {
  background: #42b983;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.9rem;
}
button:hover:not(:disabled) {
  background: #35a372;
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
</style>
