<script setup lang="ts">
import { ref } from 'vue'
import SignInPage from './components/SignInPage.vue'
import RegisterPage from './components/RegisterPage.vue'
import UsersPage from './components/UsersPage.vue'
import MainPage from './components/MainPage.vue'
import ImportSpendingsPage from './components/ImportSpendingsPage.vue'
import CategoriesPage from './components/CategoriesPage.vue'
import CategoryDetailPage from './components/CategoryDetailPage.vue'
import UnlabeledTransactionsPage from './components/UnlabeledTransactionsPage.vue'
import LabelingPage from './components/LabelingPage.vue'
import type { CategoryNameOwner, Transaction, User } from './api'

type Page =
  | 'signin'
  | 'register'
  | 'users'
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

const navigateTo = (page: Page | string) => {
  // A simple type guard to be safe
  const validPages: (Page | string)[] = [
    'signin',
    'register',
    'users',
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
  }
}

const handleSignIn = (user: User) => {
  currentUser.value = user
  currentPage.value = 'main'
}

const handleSignOut = () => {
  currentUser.value = null
  selectedCategory.value = null
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
</script>

<template>
  <div class="app">
    <nav class="navbar" v-if="currentPage !== 'main'">
      <div class="nav-container">
        <h1 class="logo">FlashFinance</h1>
        <div class="nav-links">
          <button 
            @click="navigateTo('signin')" 
            :class="{ active: currentPage === 'signin' }"
            class="nav-btn"
          >
            Sign In
          </button>
          <button 
            @click="navigateTo('register')" 
            :class="{ active: currentPage === 'register' }"
            class="nav-btn"
          >
            Register
          </button>
          <button 
            @click="navigateTo('users')" 
            :class="{ active: currentPage === 'users' }"
            class="nav-btn"
          >
            View Users
          </button>
        </div>
      </div>
    </nav>

    <SignInPage 
      v-if="currentPage === 'signin'" 
      @navigate="navigateTo" 
      @sign-in="handleSignIn"
    />
    <RegisterPage v-if="currentPage === 'register'" @navigate="navigateTo" />
    <UsersPage v-if="currentPage === 'users'" @navigate="navigateTo" />
    <MainPage 
      v-if="currentPage === 'main'" 
      :user="currentUser" 
      @sign-out="handleSignOut"
      @navigate="navigateTo"
    />
    <ImportSpendingsPage v-if="currentPage === 'import'" :user="currentUser" @navigate="navigateTo" />
    <CategoriesPage
      v-if="currentPage === 'categories'"
      :user="currentUser"
      @navigate="navigateTo"
      @view-category="handleViewCategory"
    />
    <CategoryDetailPage
      v-if="currentPage === 'categoryDetail'"
      :user="currentUser"
      :category="selectedCategory"
      @navigate="navigateTo"
    />
    <UnlabeledTransactionsPage v-if="currentPage === 'unlabeled'" :user="currentUser" @navigate="navigateTo" @start-labeling="handleStartLabeling" />
    <LabelingPage v-if="currentPage === 'labeling'" :transaction="transactionToLabel" :user="currentUser" @navigate="navigateTo" />
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

.nav-links {
  display: flex;
  gap: 0.5rem;
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
}

.nav-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.nav-btn.active {
  background: #667eea;
  color: white;
}

.nav-btn.active:hover {
  background: #5568d3;
}
</style>
