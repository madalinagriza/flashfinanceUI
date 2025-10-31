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
</style>
