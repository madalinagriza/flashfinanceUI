<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { categoryApi } from '../api'
import type { User, CategoryNameOwner } from '../api'
import { normalizeId } from '../utils/normalize'

const props = defineProps<{
  user: User | null
}>()

const emit = defineEmits<{
  navigate: [page: string]
  'view-category': [category: CategoryNameOwner]
}>()

const allCategories = ref<CategoryNameOwner[]>([])
const loading = ref(false)
const adding = ref(false)
const error = ref<string | null>(null)
const addError = ref<string | null>(null)
const newCategoryName = ref('')

// Safely extract a string user id from various shapes
const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const extractedUserId = computed(() => extractUserId(props.user))

const fetchCategories = async () => {
  error.value = null
  loading.value = true
  try {
    const ownerId = extractedUserId.value
    if (!ownerId) {
      allCategories.value = []
      error.value = 'Sign in to load your categories.'
      return
    }
    const categories = await categoryApi.getCategoriesWithNames(ownerId)
    allCategories.value = categories
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load categories'
    console.error('Categories fetch error:', e)
  } finally {
    loading.value = false
  }
}

const addCategory = async () => {
  addError.value = null
  if (!props.user?.user_id) {
    addError.value = 'You must be signed in to add a category.'
    return
  }
  if (!newCategoryName.value.trim()) {
    addError.value = 'Please enter a category name.'
    return
  }
  adding.value = true
  try {
    const ownerIdToSend = extractedUserId.value || ''
    const createResp = await categoryApi.create({ owner_id: ownerIdToSend, name: newCategoryName.value.trim() })
    console.debug('Create category response:', createResp)
    newCategoryName.value = ''
    await fetchCategories()
  } catch (e) {
    addError.value = e instanceof Error ? e.message : 'Failed to add category'
    console.error('Add category error:', e)
  } finally {
    adding.value = false
  }
}

const viewCategory = (category: CategoryNameOwner) => {
  emit('view-category', category)
}

// Editing state
const editingIndex = ref<number | null>(null)
const editName = ref('')
const editStatus = ref<Record<number, string>>({})

const startEdit = (c: any, idx: number) => {
  editingIndex.value = idx
  editName.value = c.name || ''
  editStatus.value[idx] = ''
}

const cancelEdit = (idx: number) => {
  if (editingIndex.value === idx) editingIndex.value = null
  editName.value = ''
  editStatus.value[idx] = ''
}

const saveEdit = async (c: any, idx: number) => {
  editStatus.value[idx] = ''
  const newName = editName.value.trim()
  if (!newName) {
    editStatus.value[idx] = 'Please provide a name.'
    return
  }
  const ownerId = extractedUserId.value || ''
  editStatus.value[idx] = 'Saving...'
  try {
  const catId = normalizeId((c as any).category_id ?? (c as any).categoryId)
    if (catId) {
      // Call rename endpoint
  await categoryApi.rename({ owner_id: ownerId, category_id: catId, new_name: newName })
      editStatus.value[idx] = 'Renamed.'
    } else {
      // Fallback: create a new category with the new name
  await categoryApi.create({ owner_id: ownerId, name: newName })
      editStatus.value[idx] = 'Created new category (rename not possible).' 
    }
    // Re-fetch the full category list and then filter for this owner to ensure
    // we're showing the canonical server state after the rename/create.
    await fetchCategories()

    // Check for duplicate names after refresh
    const ownerCats = allCategories.value
    const nameCounts: Record<string, number> = {}
    ownerCats.forEach(x => {
      const n = x.name || ''
      nameCounts[n] = (nameCounts[n] || 0) + 1
    })
    if (nameCounts[newName] > 1) {
      editStatus.value[idx] = 'Warning: duplicate category name exists after rename.'
      console.warn('Duplicate category names for owner', ownerId, newName, ownerCats)
    } else {
      editStatus.value[idx] = 'Saved.'
    }

    editingIndex.value = null
    editName.value = ''
  } catch (err) {
    console.error('Rename/create error:', err)
    editStatus.value[idx] = err instanceof Error ? err.message : 'Failed to save'
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<template>
  <div class="categories-page">
    <div class="topbar">
      <button class="btn-back" @click="emit('navigate', 'main')">← Back to Home</button>
    </div>

    <div class="container">
      <div class="header">
        <h1>Categories</h1>
        <button class="btn-refresh" @click="fetchCategories" :disabled="loading">
          {{ loading ? 'Refreshing…' : '🔄 Refresh' }}
        </button>
      </div>

      <div class="add-card">
        <h3>Create New Category</h3>
        <div class="add-row">
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="Category name"
            :disabled="adding"
          />
          <button class="btn-primary" @click="addCategory" :disabled="adding">
            {{ adding ? 'Adding…' : 'Add Category' }}
          </button>
        </div>
        <div v-if="addError" class="error">❌ {{ addError }}</div>
      </div>

      <div class="list-card">
        <h3>Your Categories</h3>
        <div v-if="error" class="error">❌ {{ error }}</div>
        <div v-else-if="loading" class="loading">Loading…</div>
        <div v-else>
          <div class="debug-info">
            <small style="color: #999;">
              Categories loaded: {{ allCategories.length }} |
              Your user ID: {{ user?.user_id }}
            </small>
          </div>
          <div v-if="allCategories.length === 0" class="empty">
            No categories yet.
          </div>
          <ul v-else class="category-list">
            <li v-for="(c, idx) in allCategories" :key="(c.category_id || c.name) + ':' + c.owner_id">
              <span class="dot"></span>
              <template v-if="editingIndex === idx">
                <input v-model="editName" class="edit-input" />
                <button class="btn-small" @click.prevent="saveEdit(c, idx)">Save</button>
                <button class="btn-small muted" @click.prevent="cancelEdit(idx)">Cancel</button>
                <div class="edit-status">{{ editStatus[idx] }}</div>
              </template>
              <template v-else>
                <span class="name">{{ c.name }}</span>
                <span class="owner-id"><code>{{ c.owner_id }}</code></span>
                <button class="btn-small" @click.prevent="viewCategory(c)">View</button>
                <button class="btn-small" @click.prevent="startEdit(c, idx)">Edit</button>
              </template>
            </li>
          </ul>
        </div>
      </div>

      <div class="list-card debug-card">
        <h3>🐛 All Categories (Debug)</h3>
        <div v-if="loading" class="loading">Loading…</div>
        <div v-if="allCategories.length === 0" class="empty">
          No categories found for your account.
        </div>
        <div v-else>
          <div style="margin-bottom: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.85em;">
            <strong>Raw JSON response:</strong>
            <pre style="margin-top: 0.5rem; overflow-x: auto;">{{ JSON.stringify(allCategories, null, 2) }}</pre>
          </div>
          <table class="debug-table">
            <thead>
              <tr>
                <th>Category ID</th>
                <th>Name</th>
                <th>Owner ID</th>
                <th>Is Yours?</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, idx) in allCategories" :key="idx">
                <td><code>{{ c.category_id || '(none)' }}</code></td>
                <td>{{ c.name || '(empty)' }}</td>
                <td><code>{{ c.owner_id || '(empty)' }}</code></td>
                <td>
                  <span v-if="c.owner_id === user?.user_id" style="color: #28a745;">✓ Yes</span>
                  <span v-else style="color: #999;">✗ No</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categories-page {
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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

h1 { margin: 0; color: #333; }

.btn-refresh {
  padding: 0.5rem 0.9rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-card, .list-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

.add-card h3, .list-card h3 { margin: 0 0 1rem 0; color: #333; }

.add-row {
  display: flex;
  gap: 0.5rem;
}

.add-row input {
  flex: 1;
  padding: 0.65rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-primary {
  padding: 0.65rem 1rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.loading { color: #666; }
.empty { color: #888; }
.error {
  margin-top: 0.5rem;
  color: #c33;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
}

.category-list { list-style: none; padding: 0; margin: 0; }
.category-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0; }
.category-list li:last-child { border-bottom: none; }
.dot { width: 8px; height: 8px; background: #667eea; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.name { color: #333; flex-grow: 1; }
.owner-id { color: #999; font-size: 0.85em; }
.owner-id code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }

.btn-small {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  border-radius: 4px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}
.btn-small.muted { color: #666; }
.edit-input { padding: 0.4rem 0.5rem; margin-right: 0.5rem; border-radius: 4px; border: 1px solid #ddd; }
.edit-status { color: #666; font-size: 0.85rem; margin-top: 0.4rem; }

.debug-card {
  background: #fffbf0;
  border: 2px dashed #f0ad4e;
}

.debug-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.debug-table th {
  text-align: left;
  padding: 0.5rem;
  background: #f8f9fa;
  border-bottom: 2px solid #dee2e6;
  font-weight: 600;
}

.debug-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.debug-table code {
  background: #f5f5f5;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.85em;
}
</style>
