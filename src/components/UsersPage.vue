<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userApi } from '../api'
import type { User } from '../api'

const emit = defineEmits<{
  navigate: [page: string]
  'view-account': [user: User]
}>()

const users = ref<User[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actionMessage = ref<string | null>(null)
const actionError = ref<string | null>(null)
const actionLoading = ref<Record<string, boolean>>({})

const fetchUsers = async () => {
  loading.value = true
  error.value = null
  actionMessage.value = null
  actionError.value = null
  try {
    const raw = await userApi.all()
    // Normalize user_id which may be an object like { value: '...' }
    const normalizeUserId = (id: any) => {
      if (!id) return ''
      if (typeof id === 'string') return id
      if (typeof id === 'object' && 'value' in id) return String((id as any).value)
      return String(id)
    }

    users.value = raw.map((u) => ({ ...u, user_id: normalizeUserId((u as any).user_id) }))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch users'
    console.error('Error fetching users:', e)
  } finally {
    loading.value = false
  }
}

const setActionLoading = (userId: string, value: boolean) => {
  actionLoading.value = { ...actionLoading.value, [userId]: value }
}

const isActionLoading = (userId: string) => actionLoading.value[userId] === true

const updateUserStatus = (userId: string, status: 'ACTIVE' | 'INACTIVE') => {
  users.value = users.value.map((user) =>
    user.user_id === userId ? { ...user, status } : user,
  )
}

const clearActionAlerts = () => {
  actionMessage.value = null
  actionError.value = null
}

const handleDeactivate = async (user: User) => {
  if (!window.confirm(`Deactivate ${user.name}?`)) {
    return
  }

  clearActionAlerts()
  setActionLoading(user.user_id, true)

  try {
    // Ensure we send the raw string id even if the user object contains an object wrapper
    const resolveUserId = (u: any) => {
      if (!u) return ''
      if (typeof u === 'string') return u
      if (typeof u === 'object' && 'value' in u) return String(u.value)
      return String(u)
    }

    const uid = resolveUserId((user as any).user_id)
    const payload = { user_id: uid }
    // Debug: log payload sent to backend to help diagnose "User not found"
    console.debug('[UsersPage] deactivate payload (normalized):', payload, 'original:', (user as any).user_id)
    if (!payload.user_id) throw new Error('Missing user_id for deactivate')
    await userApi.deactivate(payload)
    updateUserStatus(uid, 'INACTIVE')
    actionMessage.value = `${user.name} is now inactive`
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to deactivate user'
    // Include payload context to help debugging (no secrets included)
    const reportedId = (user as any)?.user_id?.value ?? (user as any)?.user_id ?? 'unknown'
    actionError.value = `${message} (user_id=${reportedId})`
    console.error('[UsersPage] Error deactivating user:', { error: e, sent_user: (user as any).user_id })
  } finally {
    const idForLoading = (user as any)?.user_id?.value ?? (user as any)?.user_id ?? ''
    setActionLoading(String(idForLoading), false)
  }
}

const handleReactivate = async (user: User) => {
  clearActionAlerts()

  const newPassword = window.prompt(
    `Enter a new password to reactivate ${user.name}`,
    '',
  )

  if (newPassword === null) {
    return
  }

  const trimmedPassword = newPassword.trim()

  if (trimmedPassword.length < 8) {
    actionError.value = 'Password must be at least 8 characters long'
    return
  }

  const idForLoading = (user as any)?.user_id?.value ?? (user as any)?.user_id ?? ''
  setActionLoading(String(idForLoading), true)

  try {
    const payload = { email: user.email, new_password: trimmedPassword }
    console.debug('[UsersPage] reactivate payload:', { ...payload, new_password: '***' })
    if (!payload.email) throw new Error('Missing email for reactivate')
    await userApi.reactivate(payload)
    const uid = (user as any)?.user_id?.value ?? (user as any)?.user_id ?? ''
    updateUserStatus(String(uid), 'ACTIVE')
    actionMessage.value = `${user.name} has been reactivated`
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to reactivate user'
    actionError.value = message
    console.error('[UsersPage] Error reactivating user:', { error: e, email: user.email })
  } finally {
    setActionLoading(String(idForLoading), false)
  }
}

const handleViewAccount = (user: User) => {
  emit('view-account', user)
}

// Fetch users when component mounts
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="users-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>
    <div class="container">
      <div class="header">
        <h1>All Users</h1>
        <button @click="fetchUsers" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Refreshing...' : '🔄 Refresh' }}
        </button>
      </div>

      <div v-if="loading && users.length === 0" class="loading">
        Loading users...
      </div>

      <div v-if="error" class="error-message">
        ❌ {{ error }}
      </div>

      <div v-if="actionError" class="error-message">
        ❌ {{ actionError }}
      </div>

      <div v-if="actionMessage" class="success-message">
        ✅ {{ actionMessage }}
      </div>

      <div v-if="!loading && users.length === 0 && !error" class="empty-state">
        <p>No users found.</p>
        <p class="hint">Register a new user to get started.</p>
      </div>

      <div v-if="users.length > 0" class="users-grid">
        <div 
          v-for="user in users" 
          :key="user.user_id" 
          class="user-card"
        >
          <div class="user-header">
            <div class="user-avatar">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div class="user-info">
              <h3>{{ user.name }}</h3>
              <p class="user-email">{{ user.email }}</p>
            </div>
          </div>
          <div class="user-details">
            <div class="detail-item">
              <span class="label">User ID:</span>
              <span class="value">{{ user.user_id }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Status:</span>
              <span 
                class="status-badge" 
                :class="user.status.toLowerCase()"
              >
                {{ user.status }}
              </span>
            </div>
          </div>
          <div class="user-actions">
            <button
              class="btn-view"
              @click="handleViewAccount(user)"
            >
              View Account
            </button>
            <button
              v-if="user.status === 'ACTIVE'"
              class="btn-deactivate"
              @click="handleDeactivate(user)"
              :disabled="isActionLoading(user.user_id)"
            >
              {{ isActionLoading(user.user_id) ? 'Deactivating...' : 'Deactivate' }}
            </button>
            <button
              v-else
              class="btn-reactivate"
              @click="handleReactivate(user)"
              :disabled="isActionLoading(user.user_id)"
            >
              {{ isActionLoading(user.user_id) ? 'Reactivating...' : 'Reactivate' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="users.length > 0" class="footer">
        <p>Total Users: <strong>{{ users.length }}</strong></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.users-page {
  min-height: 100vh;
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
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  color: #333;
  margin: 0;
}

.btn-refresh {
  padding: 0.625rem 1.25rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #5568d3;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.1rem;
}

.error-message {
  padding: 1rem;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  margin-bottom: 1rem;
}

.success-message {
  padding: 1rem;
  background: #e6ffed;
  border: 1px solid #b7f5c3;
  border-radius: 4px;
  color: #1b5e20;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state p {
  margin: 0.5rem 0;
  color: #666;
}

.empty-state .hint {
  color: #999;
  font-size: 0.9rem;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.user-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.user-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}

.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-info h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #333;
  font-family: monospace;
  font-size: 0.85rem;
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

.user-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn-view,
.btn-deactivate,
.btn-reactivate {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.btn-view {
  background: #e7f1ff;
  color: #1d4ed8;
}

.btn-view:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-deactivate {
  background: #f8d7da;
  color: #721c24;
}

.btn-deactivate:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-reactivate {
  background: #d4edda;
  color: #155724;
}

.btn-reactivate:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-deactivate:disabled,
.btn-reactivate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-view:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.footer {
  text-align: center;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #666;
}

.footer strong {
  color: #667eea;
}
</style>
