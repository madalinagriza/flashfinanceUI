<script setup lang="ts">
import { ref } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

const emit = defineEmits<{
  navigate: [page: string]
}>()

const username = ref('')
const password = ref('')
const confirmPassword = ref('')

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)
const registeredUser = ref<User | null>(null)
const lastRegisteredUserId = ref<string | null>(null)

const resetForm = () => {
  username.value = ''
  password.value = ''
  confirmPassword.value = ''
  error.value = null
}

const handleRegister = async () => {
  error.value = null
  success.value = false

  // Basic validation
  if (!username.value || !password.value) {
    error.value = 'Username and password are required'
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
      username: username.value,
      password: password.value,
    })

    registeredUser.value = user
    lastRegisteredUserId.value = user?.user_id ?? null
    success.value = true
    resetForm()
    
    // Redirect to sign-in page after 1.5 seconds
    setTimeout(() => {
      emit('navigate', 'signin')
    }, 1500)
  } catch (e) {
    error.value = 'Registration failed: username already in use'
    console.error('Registration error:', e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- Topbar removed: do not expose navigation on register page -->
    <div class="register-card">
      <h2>Create Account</h2>
      <p class="subtitle">Sign up for FlashFinance</p>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Enter a username"
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

        <div v-if="error" class="alert error">
          <span class="icon icon-error" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
            </svg>
          </span>
          <span>{{ error }}</span>
        </div>

        <div v-if="success" class="alert success">
          <span class="icon icon-check" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 11l3.5 3.5L15 8" />
              <circle cx="10" cy="10" r="8" />
            </svg>
          </span>
          <span>
            Registration successful! Welcome, {{ registeredUser?.username }}!
          </span>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
      </form>

      <div class="footer-text">
        Already have an account? <a href="#" @click.prevent="emit('navigate', 'signin')">Sign in</a>
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
  background: var(--ff-background);
  padding: 2rem 1rem;
}

/* Topbar and back button removed per design: register header shows only the logo in AppShell */

.register-card {
  background: var(--ff-surface);
  border-radius: var(--radius);
  box-shadow: 0 12px 32px rgba(17, 24, 39, 0.12);
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}

h2 {
  margin: 0 0 0.5rem 0;
  color: var(--ff-text-strong);
  font-size: 1.75rem;
}

.subtitle {
  margin: 0 0 2rem 0;
  color: var(--ff-text-muted);
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
  color: var(--ff-text-strong);
  font-size: 0.9rem;
}

input {
  padding: 0.75rem;
  border: 1px solid var(--ff-primary-border-strong);
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: var(--ff-surface);
}

input:focus {
  outline: none;
  border-color: var(--ff-primary);
  box-shadow: 0 0 0 3px var(--ff-primary-ghost);
}

input:disabled {
  background: rgba(61, 122, 116, 0.08);
  cursor: not-allowed;
}

.btn-primary {
  padding: 0.875rem;
  background: var(--ff-primary);
  color: var(--ff-surface);
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}

.alert span:last-child {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: inherit;
  line-height: 1.4;
}

.alert small {
  color: var(--ff-text-muted);
}

.alert.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
}

.alert.success {
  background: var(--ff-success-soft);
  border: 1px solid var(--ff-success-border);
  color: var(--ff-success);
}

.footer-text {
  margin-top: 1.5rem;
  text-align: center;
  color: var(--ff-text-muted);
  font-size: 0.9rem;
}

.footer-text a {
  color: var(--ff-primary);
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
}

.footer-text a:hover {
  text-decoration: underline;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
}

.icon svg {
  width: 100%;
  height: 100%;
}

.icon-error {
  color: var(--ff-error);
}

.icon-check {
  color: var(--ff-success);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
