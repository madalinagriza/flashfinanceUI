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
const showAddCategory = ref(false)

const openAddCategory = () => {
  addError.value = null
  newCategoryName.value = ''
  showAddCategory.value = true
}

const closeAddCategory = () => {
  showAddCategory.value = false
  addError.value = null
  newCategoryName.value = ''
}

// Safely extract a string user id from various shapes
const extractUserId = (u: unknown): string | null => normalizeId((u as any)?.user_id ?? (u as any)?.id ?? u)

const extractedUserId = computed(() => extractUserId(props.user))

watch(extractedUserId, (next, prev) => {
  if (next === prev) return
  if (!next) {
    allCategories.value = []
    error.value = 'Sign in to load your categories.'
    rowErrors.value = {}
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
  rowErrors.value = {}
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
    await fetchCategories()
    closeAddCategory()
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
const deletingIndex = ref<number | null>(null)
const rowErrors = ref<Record<number, string>>({})

const setRowError = (idx: number, message: string | null) => {
  const next = { ...rowErrors.value }
  if (!message) {
    delete next[idx]
  } else {
    next[idx] = message
  }
  rowErrors.value = next
}

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

const deleteCategory = async (category: CategoryNameOwner, idx: number) => {
  setRowError(idx, null)
  if (!props.user?.user_id) {
    setRowError(idx, 'You must be signed in to delete a category.')
    return
  }

  const ownerId = extractedUserId.value
  if (!ownerId) {
    setRowError(idx, 'Missing owner information for this category.')
    return
  }

  const categoryId = normalizeId((category as any).category_id ?? (category as any).categoryId)
  if (!categoryId) {
    setRowError(idx, 'Unable to determine the category id.')
    return
  }

  deletingIndex.value = idx
  try {
    const transactions = await categoryApi.listTransactions({ owner_id: ownerId, category_id: categoryId })
    if (Array.isArray(transactions) && transactions.length > 0) {
      setRowError(idx, 'This category must have no transactions to be deleted.')
      return
    }

    await categoryApi.delete({ owner_id: ownerId, category_id: categoryId, can_delete: true })
    await fetchCategories()
  } catch (err) {
    console.error('Delete category error:', err)
    const message = err instanceof Error ? err.message : 'Failed to delete category.'
    setRowError(idx, message)
  } finally {
    deletingIndex.value = null
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
        <button type="button" class="ff-back-button back-circle" @click="emit('navigate', 'main')">
          <span class="back-circle-icon">
            <span class="ff-icon icon-arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.5 4.5L7 10l5.5 5.5" />
              </svg>
            </span>
          </span>
          Back to Dashboard
        </button>
        <div class="heading-row">
          <div class="heading-copy">
            <h1>Categories</h1>
            <p class="ff-page-subtitle">Organize categories to keep labeling fast.</p>
          </div>
          <button type="button" class="add-inline" @click="openAddCategory">
            <span class="ff-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 4v12" />
                <path d="M4 10h12" />
              </svg>
            </span>
            Add category
          </button>
        </div>
      </header>

      <div class="ff-page-grid categories-grid">
        <div class="ff-column ff-full-width categories-column">
          <section class="ff-card list-card">
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
            <div v-else-if="allCategories.length === 0" class="empty">No categories yet — add your first using the plus button.</div>
            <ul v-else class="category-list">
              <li
                v-for="(c, idx) in allCategories"
                :key="c.category_id || c.name"
                :class="['category-row', { editing: editingIndex === idx }]"
              >
                <template v-if="editingIndex === idx">
                  <div class="edit-row">
                    <input v-model="editName" class="edit-input" placeholder="Category name" />
                    <div class="edit-actions">
                      <button class="btn-small primary" @click.prevent="saveEdit(c, idx)">Save</button>
                      <button class="btn-small muted" @click.prevent="cancelEdit(idx)">Cancel</button>
                    </div>
                  </div>
                  <div v-if="editStatus[idx]" class="edit-status">{{ editStatus[idx] }}</div>
                </template>
                <template v-else>
                  <span class="category-name">{{ c.name }}</span>
                  <div class="row-actions">
                    <button
                      class="icon-button view-action"
                      type="button"
                      @click.prevent="viewCategory(c)"
                    >
                      <span class="ff-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1.8 10s2.9-5.5 8.2-5.5S18.2 10 18.2 10 15.3 15.5 10 15.5 1.8 10 1.8 10Z" />
                          <circle cx="10" cy="10" r="2.5" />
                        </svg>
                      </span>
                      <span class="button-label">View</span>
                    </button>
                    <button
                      class="icon-button rename-action"
                      type="button"
                      @click.prevent="startEdit(c, idx)"
                    >
                      <span class="ff-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12.1 4.1l3.8 3.8" />
                          <path d="M3.5 13.5l2.5 2.9 10.5-10.5-2.9-2.5-10.1 10Z" />
                          <path d="M3 17h4" />
                        </svg>
                      </span>
                      <span class="button-label">Rename</span>
                    </button>
                    <button
                      class="icon-button delete-action"
                      type="button"
                      :disabled="deletingIndex === idx"
                      @click.prevent="deleteCategory(c, idx)"
                    >
                      <span class="ff-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M5 6h10" />
                          <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6" />
                          <path d="M6.5 6v9.5A1.5 1.5 0 0 0 8 17h4a1.5 1.5 0 0 0 1.5-1.5V6" />
                        </svg>
                      </span>
                      <span class="button-label">Delete</span>
                    </button>
                  </div>
                  <div v-if="rowErrors[idx]" class="row-status">{{ rowErrors[idx] }}</div>
                </template>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <div v-if="showAddCategory" class="add-modal">
        <div class="modal-backdrop" @click="closeAddCategory"></div>
        <section
          class="modal-panel ff-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="addCategoryTitle"
          tabindex="-1"
          @keydown.esc.prevent="closeAddCategory"
        >
          <header class="modal-header">
            <h2 id="addCategoryTitle" class="modal-title">Add category</h2>
            <button type="button" class="icon-button close-button" @click="closeAddCategory" aria-label="Close add category dialog">
              <span class="ff-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 5l10 10" />
                  <path d="M15 5L5 15" />
                </svg>
              </span>
            </button>
          </header>
          <form class="modal-form" @submit.prevent="addCategory">
            <label class="modal-field">
              <span>Category name</span>
              <input
                v-model="newCategoryName"
                type="text"
                placeholder="e.g. Travel"
                :disabled="adding"
                required
              />
            </label>
            <div v-if="addError" class="banner error">
              <span class="ff-icon icon-error" aria-hidden="true">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M12.5 7.5L7.5 12.5M7.5 7.5l5 5" />
                </svg>
              </span>
              {{ addError }}
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-small muted" @click.prevent="closeAddCategory">Cancel</button>
              <button type="submit" class="btn-small primary" :disabled="adding">
                {{ adding ? 'Adding…' : 'Add category' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categories-header {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem 0 0.25rem;
  margin-bottom: 0.75rem;
  justify-items: start;
}

.heading-row {
  display: grid;
  grid-template-columns: 1fr auto;  /* title on the left, button on the right */
  align-items: center;
  gap: 1rem;
  width: 100%;
}


.heading-row .heading-copy {
  flex: 1 1 240px;
}

.heading-copy {
  display: grid;
  gap: 0.35rem;
}

.heading-row .add-inline {
  justify-self: end;               /* push to the far right of the row */
  align-self: center;
  margin-left: 0;                  /* no manual margin tricks */
}

.heading-copy h1 {
  margin: 0;
  color: var(--ff-primary);
}

.heading-copy .ff-page-subtitle {
  font-size: 0.9rem;
  color: var(--ff-text-muted);
}

.categories-grid {
  margin-top: 0;
  grid-template-columns: minmax(0, 1fr);
}

.categories-column {
  align-content: start;
  display: grid;
  gap: 1.5rem;
}

.list-card {
  display: grid;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem 1.5rem;
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
  margin: 0 -1.5rem -1.5rem;
  padding: 0;
  max-height: calc(100vh - 280px);
  display: grid;
  gap: 0;
  border-radius: 18px;
  overflow: hidden;
  overflow-y: auto;
  background: transparent;
}

.category-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--ff-border);
  transition: background 0.2s ease;
  background: transparent;
}

.category-row:nth-child(odd) {
  background: #F9F8F3;
}

.category-row:nth-child(even) {
  background: #FBFAF4;
}

.category-row:last-child {
  border-bottom: none;
}

.category-row:hover,
.category-row:focus-within {
  background: inherit;
}

.category-row.editing {
  background: var(--ff-surface);
  grid-template-columns: 1fr;
  gap: 0.6rem;
}

.category-name {
  color: var(--ff-text-base);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.row-actions {
  display: inline-flex;
  gap: 0.65rem;
  justify-self: end;
  align-items: center;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid transparent;
  background: var(--ff-surface);
  color: var(--ff-primary);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.icon-button:hover,
.icon-button:focus-visible {
  background: rgba(36, 164, 124, 0.16);
  background: color-mix(in srgb, var(--ff-primary) 16%, transparent);
  border-color: var(--ff-primary);
  color: var(--ff-primary);
  transform: translateY(-1px);
  outline: none;
}

.icon-button.view-action {
  background: #E8EFEC;
  border-color: #D7E2DC;
  color: #2D6D5C;
}

.icon-button.view-action:hover,
.icon-button.view-action:focus-visible {
  background: color-mix(in srgb, #2D6D5C 12%, #E8EFEC 88%);
  border-color: #2D6D5C;
  color: #2D6D5C;
}

.icon-button.rename-action {
  background: #F2EFEC;
  border-color: #E4DED8;
  color: #6B5A4B;
}

.icon-button.rename-action:hover,
.icon-button.rename-action:focus-visible {
  background: color-mix(in srgb, #6B5A4B 12%, #F2EFEC 88%);
  border-color: #6B5A4B;
  color: #6B5A4B;
}

.icon-button.delete-action {
  background: #F9E9E7;
  border-color: #F0CFC9;
  color: #B5564A;
}

.icon-button.delete-action:hover,
.icon-button.delete-action:focus-visible {
  background: color-mix(in srgb, #B5564A 12%, #F9E9E7 88%);
  border-color: #B5564A;
  color: #B5564A;
}

.icon-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.icon-button:disabled:hover,
.icon-button:disabled:focus-visible {
  background: inherit;
  border-color: inherit;
  color: inherit;
}

.icon-button .ff-icon {
  color: currentColor;
}

.icon-button .ff-icon svg {
  width: 16px;
  height: 16px;
}

.button-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.row-status {
  grid-column: 1 / -1;
  font-size: 0.85rem;
  color: var(--ff-error);
  margin-top: 0.35rem;
}

.back-circle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem 0.3rem 0.3rem;
  border-radius: 999px;
  border: 1px solid var(--ff-border-strong, #d0d7de);
  background: var(--ff-surface);
  color: var(--ff-primary);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.back-circle:hover,
.back-circle:focus-visible {
  background: var(--ff-primary-ghost);
  border-color: var(--ff-primary-border-strong);
  transform: translateY(-1px);
  outline: none;
}

.back-circle-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ff-primary-ghost);
  display: grid;
  place-items: center;
  color: var(--ff-primary);
}

.back-circle-icon .ff-icon svg {
  width: 16px;
  height: 16px;
}

.add-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-primary);
  color: var(--ff-surface);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  white-space: nowrap;
}

.add-inline:hover,
.add-inline:focus-visible {
  background: var(--ff-primary-hover);
  border-color: var(--ff-primary-hover);
  transform: translateY(-1px);
  outline: none;
}

.add-inline .ff-icon svg {
  width: 18px;
  height: 18px;
}

.edit-row {
  display: grid;
  gap: 0.75rem;
  width: 100%;
}

.edit-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-background);
  color: var(--ff-text-base);
}

.edit-actions {
  display: inline-flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-surface);
  color: var(--ff-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}

.btn-small:hover,
.btn-small:focus-visible {
  background: rgba(36, 164, 124, 0.16);
  background: color-mix(in srgb, var(--ff-primary) 16%, transparent);
  border-color: var(--ff-primary);
  transform: translateY(-1px);
  outline: none;
}

.btn-small.primary {
  background: var(--ff-primary);
  border-color: var(--ff-primary);
  color: var(--ff-surface);
}

.btn-small.primary:hover,
.btn-small.primary:focus-visible {
  background: var(--ff-primary-hover);
  border-color: var(--ff-primary-hover);
}

.btn-small.muted {
  color: var(--ff-text-muted);
  border-color: var(--ff-border);
}

.edit-status {
  color: var(--ff-text-subtle);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.add-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 40;
}

.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 32, 0.45);
}

.modal-panel {
  position: relative;
  width: min(420px, 92vw);
  display: grid;
  gap: 1.25rem;
  padding: 24px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.modal-title {
  margin: 0;
  color: var(--ff-primary);
  font-size: 1.15rem;
}

.close-button {
  border-color: transparent;
  background: transparent;
  color: var(--ff-text-subtle);
}

.close-button:hover,
.close-button:focus-visible {
  color: var(--ff-primary);
  border-color: var(--ff-primary-border-strong);
}

.modal-form {
  display: grid;
  gap: 1rem;
}

.modal-field {
  display: grid;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--ff-text-base);
}

.modal-field input {
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--ff-primary-border-strong);
  background: var(--ff-background);
  color: var(--ff-text-base);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.banner.error {
  background: var(--ff-error-soft);
  border: 1px solid var(--ff-error-border);
  color: var(--ff-error);
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

@media (max-width: 720px) {
  .categories-header {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem 0 0.25rem;
  }
.heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between; /* KEY: pushes Add button to the far right */
  width: 100%;
  flex-wrap: wrap;
  gap: 1rem;
}


.heading-row .heading-copy {
  flex: 1 1 auto;
}

.heading-row .add-inline {
  margin-left: auto; /* just ensures right alignment on smaller screens */
}


  .list-card {
    padding: 1rem 1.25rem 1.25rem;
  }

  .category-list {
    margin: 0 -1.25rem -1.25rem;
    border-radius: 16px;
  }

  .category-row {
    padding: 0.85rem 1.25rem;
  }

  .row-actions {
    gap: 0.5rem;
  }

  .icon-button {
    padding: 0.35rem 0.75rem;
  }
}
</style>
