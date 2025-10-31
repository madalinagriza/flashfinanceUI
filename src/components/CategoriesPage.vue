<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
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

watch(extractedUserId, (next, prev) => {
  if (next === prev) return
  if (!next) {
    allCategories.value = []
    error.value = 'Sign in to load your categories.'
    return
  }
  fetchCategories()
})

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
  <div class="categories-page ff-page">
    <div class="ff-page-frame">
      <header class="ff-page-header categories-header">
        <div class="header-leading">
          <button type="button" class="ff-back-button" @click="emit('navigate', 'main')">
            <span class="ff-icon icon-arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.5 4.5L7 10l5.5 5.5" />
              </svg>
            </span>
            Back to Dashboard
          </button>
          <div class="heading-copy">
            <h1>Categories</h1>
            <p class="ff-page-subtitle">Create, rename, and review your category list to keep labeling fast and accurate.</p>
          </div>
        </div>
      </header>

      <div class="ff-page-grid categories-grid">
        <div class="ff-column ff-full-width categories-column">
          <section class="ff-card add-card">
            <h2 class="ff-card-title">Create a category</h2>
            <p class="ff-card-subtitle">Add new categories to streamline future labeling.</p>
            <div class="add-row">
              <input
                v-model="newCategoryName"
                type="text"
                placeholder="Category name"
                :disabled="adding"
              />
              <button class="action-button primary" type="button" @click="addCategory" :disabled="adding">
                {{ adding ? 'Adding…' : 'Add Category' }}
              </button>
            </div>
            <div v-if="addError" class="banner error">
              <span class="ff-icon icon-error" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                </svg>
              </span>
              {{ addError }}
            </div>
          </section>

          <section class="ff-card list-card">
            <div class="list-header">
              <h2 class="ff-card-title">Your categories</h2>
              <span class="badge" v-if="!loading">{{ allCategories.length }}</span>
            </div>
            <div v-if="error" class="banner error">
              <span class="ff-icon icon-error" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                </svg>
              </span>
              {{ error }}
            </div>
            <div v-else-if="loading" class="loading">Loading…</div>
            <div v-else-if="allCategories.length === 0" class="empty">No categories yet — add your first above.</div>
            <ul v-else class="category-list">
              <li v-for="(c, idx) in allCategories" :key="c.category_id || c.name">
                <span class="dot"></span>
                <template v-if="editingIndex === idx">
                  <input v-model="editName" class="edit-input" />
                  <div class="row-actions">
                    <button class="btn-small" @click.prevent="saveEdit(c, idx)">Save</button>
                    <button class="btn-small muted" @click.prevent="cancelEdit(idx)">Cancel</button>
                  </div>
                  <div class="edit-status">{{ editStatus[idx] }}</div>
                </template>
                <template v-else>
                  <span class="name">{{ c.name }}</span>
                  <div class="row-actions">
                    <button class="btn-small" @click.prevent="viewCategory(c)">View</button>
                    <button class="btn-small" @click.prevent="startEdit(c, idx)">Edit</button>
                  </div>
                </template>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categories-header {
  align-items: center;
}

.header-leading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.heading-copy h1 {
  margin: 0;
  color: var(--ff-primary);
}

.categories-grid {
  margin-top: 0.5rem;
  grid-template-columns: minmax(0, 1fr);
}

.categories-column {
  align-content: start;
  gap: 2rem;
}

.add-card {
  display: grid;
  gap: 1.25rem;
}

.add-row {
  align-items: center;
  gap: 0.6rem;
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.95rem;
}

.banner.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
}

.list-card {
  display: grid;
  gap: 1rem;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--ff-primary-ghost);
  color: var(--ff-primary);
  padding: 0.25rem 0.75rem;
  font-weight: 600;
  font-size: 0.8rem;
}

.loading {
  color: var(--ff-text-base);
}

.empty {
  color: var(--ff-text-muted);
}

.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.category-list li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ff-border);
}

.category-list li:last-child {
  border-bottom: none;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ff-secondary);
}

.name {
  color: var(--ff-text-base);
  font-weight: 600;
}

.row-actions {
  display: inline-flex;
  gap: 0.45rem;
}

.btn-small {
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-surface);
  color: var(--ff-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.btn-small:hover,
.btn-small:focus-visible {
  background: var(--ff-primary-ghost);
  outline: none;
}

.btn-small.muted {
  color: var(--ff-text-muted);
}

.edit-input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-background);
  color: var(--ff-text-base);
}

.edit-status {
  color: var(--ff-text-subtle);
  font-size: 0.85rem;
  margin-top: 0.4rem;
}

.summary-card {
  display: grid;
  gap: 0.75rem;
}

.summary-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1.1rem;
}

.notes-list {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--ff-text-muted);
  line-height: 1.6;
}

.inline-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--ff-secondary);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: color 0.2s ease;
}

.inline-link:hover,
.inline-link:focus-visible {
  color: var(--ff-secondary-hover);
  outline: none;
}

@media (max-width: 720px) {
  .add-row {
    flex-direction: column;
  }

  .action-button.primary,
  .add-row input {
    width: 100%;
  }

  .row-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
