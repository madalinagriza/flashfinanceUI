<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  navigate: [page: string]
  'user-updated': [user: User]
  signOut: []
}>()

const accountUser = ref<User | null>(null)
const deactivateState = reactive({ loading: false, message: null as string | null, error: null as string | null })
const passwordState = reactive({ loading: false, message: null as string | null, error: null as string | null })
const passwordForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })
// Suggestion preference (persisted locally per-user)
const suggestPref = reactive({ enabled: true, message: null as string | null })

watch(
  () => props.user,
  (newUser) => {
    // Normalize incoming user.user_id which can be an object { value: '...' }
    const normalizeUserId = (id: any) => {
      if (!id) return ''
      if (typeof id === 'string') return id
      if (typeof id === 'object' && 'value' in id) return String(id.value)
      return String(id)
    }

    accountUser.value = newUser
      ? { ...newUser, user_id: normalizeUserId((newUser as any).user_id) }
      : null
    deactivateState.message = null
    deactivateState.error = null
    passwordState.message = null
    passwordState.error = null
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  },
  { immediate: true },
)

// Load persisted suggest-AI preference for the current account when user changes
watch(
  () => accountUser.value?.user_id,
  (uid) => {
    if (!uid) return
    try {
      const key = `suggestAi_${uid}`
      const raw = localStorage.getItem(key)
      // default to true if not set (preserve existing behavior)
      suggestPref.enabled = raw == null ? true : raw === 'true'
      suggestPref.message = null
    } catch (e) {
      console.error('Failed to load suggest-AI preference', e)
      suggestPref.enabled = true
    }
  },
  { immediate: true },
)

const toggleSuggestPref = () => {
  const uid = accountUser.value?.user_id
  if (!uid) return
  try {
    const key = `suggestAi_${uid}`
    localStorage.setItem(key, suggestPref.enabled ? 'true' : 'false')
    suggestPref.message = suggestPref.enabled ? 'AI suggestions enabled.' : 'AI suggestions disabled.'
    setTimeout(() => (suggestPref.message = null), 2500)
  } catch (e) {
    console.error('Failed to persist suggest-AI preference', e)
    suggestPref.message = 'Unable to save preference locally.'
  }
}

const canDeactivate = computed(() => accountUser.value?.status === 'ACTIVE' && !deactivateState.loading)
const statusBadgeClass = computed(() => accountUser.value?.status.toLowerCase() ?? '')

const handleDeactivate = async () => {
  if (!accountUser.value) {
    return
  }

  if (!window.confirm('Are you sure you want to deactivate this account?')) {
    return
  }

  deactivateState.loading = true
  deactivateState.error = null
  deactivateState.message = null

  try {
    const resolveUserId = (id: any) => {
      if (!id) return ''
      if (typeof id === 'string') return id
      if (typeof id === 'object' && 'value' in id) return String(id.value)
      return String(id)
    }

    const uid = resolveUserId((accountUser.value as any).user_id)
    const payload = { user_id: uid }
    console.debug('[UserAccountPage] deactivate payload (normalized):', payload, 'original:', (accountUser.value as any).user_id)
    if (!payload.user_id) throw new Error('Missing user_id for deactivate')
    await userApi.deactivate(payload)
    accountUser.value = { ...accountUser.value, status: 'INACTIVE' }
    deactivateState.message = 'Account successfully deactivated.'
    emit('user-updated', accountUser.value)
    // If the current user just deactivated their own account, sign them out
    emit('signOut')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unable to deactivate account'
    deactivateState.error = `${message} (user_id=${accountUser.value?.user_id ?? 'unknown'})`
    console.error('[UserAccountPage] Deactivate error:', { error: e, user_id: accountUser.value?.user_id })
  } finally {
    deactivateState.loading = false
  }
}

const validatePasswordForm = () => {
  if (!passwordForm.oldPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
    passwordState.error = 'All password fields are required.'
    return false
  }

  if (passwordForm.newPassword.length < 8) {
    passwordState.error = 'New password must be at least 8 characters.'
    return false
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordState.error = 'New password and confirmation do not match.'
    return false
  }

  return true
}

const handleChangePassword = async () => {
  passwordState.error = null
  passwordState.message = null

  if (!accountUser.value) {
    passwordState.error = 'No user selected.'
    return
  }

  if (!validatePasswordForm()) {
    return
  }

  passwordState.loading = true

  try {
    await userApi.changePassword({
      user_id: accountUser.value.user_id,
      old_password: passwordForm.oldPassword,
      new_password: passwordForm.newPassword,
    })
    passwordState.message = 'Password updated successfully.'
    passwordForm.oldPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unable to change password'
    passwordState.error = message
    console.error('Change password error:', e)
  } finally {
    passwordState.loading = false
  }
}
</script>

<template>
  <div class="account-page" v-if="accountUser">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">
        <span class="icon icon-arrow" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.5 4.5L7 10l5.5 5.5" />
            <path d="M7 10h7" />
          </svg>
        </span>
        <span>Back to Home</span>
      </button>
    </div>

    <div class="container">
      <header class="header">
        <div>
          <p class="eyebrow">Account Settings</p>
          <h1>{{ accountUser.name }}</h1>
          <p class="description">Manage account status and credentials.</p>
        </div>
        <div class="status">
          <span class="label">Status:</span>
          <span class="status-badge" :class="statusBadgeClass">{{ accountUser.status }}</span>
        </div>
      </header>

      <section class="card">
        <h2>Profile Info</h2>
        <div class="profile-grid">
          <div>
            <span class="label">Email</span>
            <p class="value">{{ accountUser.email }}</p>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>Deactivate Account</h2>
          <p>Deactivate to revoke access while preserving data.</p>
        </div>
        <div v-if="deactivateState.error" class="alert error">
          <span class="icon icon-error" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
            </svg>
          </span>
          <span>{{ deactivateState.error }}</span>
        </div>
        <div v-if="deactivateState.message" class="alert success">
          <span class="icon icon-check" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 11l3.5 3.5L15 8" />
              <circle cx="10" cy="10" r="8" />
            </svg>
          </span>
          <span>{{ deactivateState.message }}</span>
        </div>
        <button
          class="btn-deactivate"
          @click="handleDeactivate"
          :disabled="!canDeactivate"
        >
          {{ deactivateState.loading ? 'Deactivating...' : 'Deactivate Account' }}
        </button>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>Change Password</h2>
          <p>Update the password using the current credential for verification.</p>
        </div>
        <div v-if="passwordState.error" class="alert error">
          <span class="icon icon-error" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="8" />
              <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
            </svg>
          </span>
          <span>{{ passwordState.error }}</span>
        </div>
        <div v-if="passwordState.message" class="alert success">
          <span class="icon icon-check" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 11l3.5 3.5L15 8" />
              <circle cx="10" cy="10" r="8" />
            </svg>
          </span>
          <span>{{ passwordState.message }}</span>
        </div>
        <form class="password-form" @submit.prevent="handleChangePassword">
          <label class="form-field">
            <span>Current Password</span>
            <input
              type="password"
              v-model="passwordForm.oldPassword"
              autocomplete="current-password"
              required
            />
          </label>
          <label class="form-field">
            <span>New Password</span>
            <input
              type="password"
              v-model="passwordForm.newPassword"
              autocomplete="new-password"
              required
            />
          </label>
          <label class="form-field">
            <span>Confirm New Password</span>
            <input
              type="password"
              v-model="passwordForm.confirmPassword"
              autocomplete="new-password"
              required
            />
          </label>
          <button class="btn-primary" type="submit" :disabled="passwordState.loading">
            {{ passwordState.loading ? 'Updating...' : 'Change Password' }}
          </button>
        </form>
      </section>

      <section class="card">
        <div class="card-header">
          <h2>Preferences</h2>
          <p>Control labeling suggestions powered by AI.</p>
        </div>
        <div class="preference-row">
          <label class="form-field" style="flex-direction:row;align-items:center;gap:0.75rem">
            <input type="checkbox" v-model="suggestPref.enabled" @change="toggleSuggestPref" />
            <span>Suggest categories with AI</span>
          </label>
          <div
            v-if="suggestPref.message"
            class="alert"
            :class="{ success: !suggestPref.message.includes('Unable'), error: suggestPref.message.includes('Unable') }"
          >
            <span v-if="suggestPref.message.includes('Unable')" class="icon icon-error" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="10" cy="10" r="8" />
                <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
              </svg>
            </span>
            <span v-else class="icon icon-check" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 11l3.5 3.5L15 8" />
                <circle cx="10" cy="10" r="8" />
              </svg>
            </span>
            <span>{{ suggestPref.message }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="missing-user">
    <p>No user selected. Please return to the main page.</p>
    <button class="btn-primary" @click="emit('navigate', 'main')">Back to Home</button>
  </div>
</template>

<style scoped>
.account-page {
  min-height: 100vh;
  background: var(--ff-background);
  padding: 2rem 1rem 3rem 1rem;
}

.topbar {
  position: sticky;
  top: 10px;
  left: 10px;
  z-index: 10;
}

.btn-back {
  background: var(--ff-surface);
  color: var(--ff-primary);
  border: 1px solid var(--ff-primary-border-strong);
  border-radius: 6px;
  padding: 0.5rem 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-back:hover {
  background: var(--ff-primary-ghost);
}

.container {
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: rgba(31, 41, 51, 0.56);
  margin-bottom: 0.25rem;
}

.description {
  color: rgba(31, 41, 51, 0.72);
  margin-top: 0.5rem;
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: var(--ff-success-soft);
  color: var(--ff-success);
}

.status-badge.inactive {
  background: var(--ff-error-soft);
  color: var(--ff-error);
}

.card {
  background: var(--ff-surface);
  border-radius: 12px;
  padding: 1.75rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.card-header h2 {
  margin: 0;
  color: var(--ff-primary);
}

.card-header p {
  margin: 0.5rem 0 0 0;
  color: rgba(31, 41, 51, 0.72);
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(31, 41, 51, 0.56);
  margin-bottom: 0.4rem;
}

.value {
  font-size: 1rem;
  color: rgba(31, 41, 51, 0.88);
  word-break: break-all;
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
  flex: 1;
  line-height: 1.4;
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

.btn-deactivate {
  align-self: flex-start;
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 6px;
  background: var(--ff-error-soft);
  color: var(--ff-error);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.btn-deactivate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-deactivate:hover:not(:disabled) {
  background: rgba(196, 76, 76, 0.26);
  transform: translateY(-1px);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: rgba(31, 41, 51, 0.78);
}

.form-field input {
  padding: 0.6rem;
  border-radius: 6px;
  border: 1px solid var(--ff-primary-border-strong);
  font-size: 1rem;
  background: var(--ff-surface);
}

.btn-primary {
  align-self: flex-start;
  padding: 0.65rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: var(--ff-primary);
  color: var(--ff-surface);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease, transform 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--ff-primary-hover);
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.missing-user {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: var(--ff-background);
  color: rgba(31, 41, 51, 0.78);
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

.icon-arrow {
  color: var(--ff-primary);
}

.icon-error {
  color: var(--ff-error);
}

.icon-check {
  color: var(--ff-success);
}
</style>
