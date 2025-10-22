<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const email = ref('')
const name = ref('')
const password = ref('')
const confirmPassword = ref('')

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)
const registeredUser = ref<User | null>(null)

const resetForm = () => {
  email.value = ''
  name.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = null
}

const handleRegister = async () => {
  error.value = null
  success.value = false

  // Basic validation
  if (!email.value || !name.value || !password.value) {
    error.value = 'All fields are required'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }

  loading.value = true

  try {
    const user = await userApi.register({
      email: email.value,
      name: name.value,
      password: password.value,
    })

    registeredUser.value = user
    success.value = true
    resetForm()
    
    // Redirect to sign-in page after 1.5 seconds
    setTimeout(() => {
      emit('navigate', 'signin')
    }, 1500)
  } catch (e) {
    error.value = 'Registration Failed: Email already in use'
    console.error('Registration error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>
    <div class="register-card">
      <h2>Create Account</h2>
      <p class="subtitle">Sign up for FlashFinance</p>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Enter your full name"
            :disabled="loading"
            required
          />
        </div>

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
            placeholder="Enter password (min 6 characters)"
            :disabled="loading"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            :disabled="loading"
            required
          />
        </div>

        <div v-if="error" class="error-message">
          ❌ {{ error }}
        </div>

        <div v-if="success" class="success-message">
          ✅ Registration successful! Welcome, {{ registeredUser?.name }}!
          <br />
          <small>User ID: {{ registeredUser?.user_id }}</small>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
      </form>

      <div class="footer-text">
        Already have an account? <a href="#">Sign in</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
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

.register-card {
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
}

.footer-text a:hover {
  text-decoration: underline;
}
</style>
