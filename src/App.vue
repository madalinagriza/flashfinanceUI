<script setup lang="ts">
import { ref } from 'vue'
import SignInPage from './components/SignInPage.vue'
import RegisterPage from './components/RegisterPage.vue'
import UserAccountPage from './components/UserAccountPage.vue'
import MainPage from './components/MainPage.vue'
import ImportSpendingsPage from './components/ImportSpendingsPage.vue'
import CategoriesPage from './components/CategoriesPage.vue'
import CategoryDetailPage from './components/CategoryDetailPage.vue'
import UnlabeledTransactionsPage from './components/UnlabeledTransactionsPage.vue'
import LabelingPage from './components/LabelingPage.vue'
import AppShell from './components/AppShell.vue'
import type { CategoryNameOwner, Transaction, User } from './api'

type Page =
  | 'signin'
  | 'register'
  | 'userAccount'
  | 'main'
  | 'import'
  | 'categories'
  | 'categoryDetail'
  | 'unlabeled'
  | 'labeling'

const currentPage = ref<Page>('signin')
const currentUser = ref<User | null>(null)
const transactionToLabel = ref<Transaction | null>(null)
const selectedCategory = ref<CategoryNameOwner | null>(null)
const selectedAccountUser = ref<User | null>(null)

const navigateTo = (page: Page | string) => {
  // A simple type guard to be safe
  const validPages: (Page | string)[] = [
    'signin',
    'register',
    'userAccount',
    'main',
    'import',
    'categories',
    'categoryDetail',
    'unlabeled',
    'labeling',
  ]
  if (validPages.includes(page)) {
    currentPage.value = page as Page;
    if (page === 'categories') {
      selectedCategory.value = null
    }
    if (page === 'userAccount' && currentUser.value) {
      selectedAccountUser.value = currentUser.value
    }
  }
}

const handleSignIn = (user: User) => {
  currentUser.value = user
  currentPage.value = 'main'
}

const handleSignOut = () => {
  currentUser.value = null
  selectedCategory.value = null
  selectedAccountUser.value = null
  currentPage.value = 'signin'
}

const handleStartLabeling = (transaction: Transaction) => {
  transactionToLabel.value = transaction;
  currentPage.value = 'labeling';
}

const handleViewCategory = (category: CategoryNameOwner) => {
  selectedCategory.value = category
  currentPage.value = 'categoryDetail'
}

const handleViewAccount = (user: User) => {
  selectedAccountUser.value = user
  currentPage.value = 'userAccount'
}

const handleAccountUpdated = (user: User) => {
  selectedAccountUser.value = user
}
</script>

<template>
  <div class="app">
  <AppShell :user="currentUser" @navigate="navigateTo" @sign-out="handleSignOut">
      <template #default>
        <SignInPage 
          v-if="currentPage === 'signin'" 
          @navigate="navigateTo" 
          @sign-in="handleSignIn"
        />
        <RegisterPage v-else-if="currentPage === 'register'" @navigate="navigateTo" />
        <MainPage 
          v-else-if="currentPage === 'main'" 
          :user="currentUser" 
          @sign-out="handleSignOut"
          @navigate="navigateTo"
          @view-account="handleViewAccount"
        />
        <ImportSpendingsPage v-else-if="currentPage === 'import'" :user="currentUser" @navigate="navigateTo" />
        <CategoriesPage
          v-else-if="currentPage === 'categories'"
          :user="currentUser"
          @navigate="navigateTo"
          @view-category="handleViewCategory"
        />
        <CategoryDetailPage
          v-else-if="currentPage === 'categoryDetail'"
          :user="currentUser"
          :category="selectedCategory"
          @navigate="navigateTo"
        />
        <UnlabeledTransactionsPage v-else-if="currentPage === 'unlabeled'" :user="currentUser" @navigate="navigateTo" @start-labeling="handleStartLabeling" />
        <LabelingPage v-else-if="currentPage === 'labeling'" :transaction="transactionToLabel" :user="currentUser" @navigate="navigateTo" />
        <UserAccountPage
          v-else-if="currentPage === 'userAccount'"
          :user="selectedAccountUser"
          @navigate="navigateTo"
          @user-updated="handleAccountUpdated"
          @sign-out="handleSignOut"
        />
      </template>
    </AppShell>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

.app {
  min-height: 100vh;
}

.navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.logo {
  font-size: 1.5rem;
  color: #667eea;
  margin: 0;
}

.logo a {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  display: inline-block;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
  align-items: center; /* ensure children are vertically centered */
}

.nav-btn {
  padding: 0.625rem 1.25rem;
  background: transparent;
  color: #666;
  border: none;
  border-radius: 4px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  line-height: 1; /* normalize line-height for consistent vertical alignment */
}

.nav-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.nav-btn.active {
  background: #667eea;
  color: white;
}

.nav-user {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  color: #444;
  line-height: 1;
}

.nav-btn.signout {
  padding-left: 0.8rem;
  padding-right: 0.8rem;
}

.nav-btn.active:hover {
  background: #5568d3;
}
</style>
