<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

const emit = defineEmits<{
  navigate: [page: string]
  signIn: [user: User]
}>()

const email = ref('')
const password = ref('')

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)
const authenticatedUser = ref<User | null>(null)

const resetForm = () => {
  email.value = ''
  password.value = ''
  error.value = null
}

const handleSignIn = async () => {
  error.value = null
  success.value = false

  // Basic validation
  if (!email.value || !password.value) {
    error.value = 'Email and password are required'
    return
  }

  loading.value = true

  try {
    const user = await userApi.authenticate({
      email: email.value,
      password: password.value,
    })

    authenticatedUser.value = user
    success.value = true
    
    // Emit sign-in event with user data and redirect after brief delay
    setTimeout(() => {
      emit('signIn', user)
    }, 1000)
  } catch (e) {
    error.value = 'Authentication Failed: Invalid email or password'
    console.error('Sign in error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="signin-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>
    <div class="signin-card">
      <h2>Sign In</h2>
      <p class="subtitle">Welcome back to FlashFinance</p>

      <form @submit.prevent="handleSignIn">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="Enter your email"
            :disabled="loading"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter your password"
            :disabled="loading"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          ❌ {{ error }}
        </div>

        <div v-if="success" class="success-message">
          ✅ Welcome back, {{ authenticatedUser?.name }}!
          <br />
          <small>Status: {{ authenticatedUser?.status }}</small>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>

      <div class="footer-text">
        Don't have an account? <a href="#" @click.prevent="$emit('navigate', 'register')">Register</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.signin-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 70px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 1rem;
}

.topbar {
  position: absolute;
  top: 10px;
  left: 10px;
}

.btn-back {
  background: rgba(255,255,255,0.9);
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.signin-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.75rem;
}

.subtitle {
  margin: 0 0 2rem 0;
  color: #666;
  font-size: 0.95rem;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #667eea;
}

input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-primary {
  padding: 0.875rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 0.75rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  font-size: 0.9rem;
}

.success-message {
  padding: 0.75rem;
  background: #efe;
  border: 1px solid #cfc;
  border-radius: 4px;
  color: #383;
  font-size: 0.9rem;
}

.success-message small {
  color: #666;
}

.footer-text {
  margin-top: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.footer-text a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
}

.footer-text a:hover {
  text-decoration: underline;
}
</style>
