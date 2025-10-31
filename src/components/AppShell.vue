<template>
  <v-app>
    <v-app-bar class="app-bar" elevated>
      <div class="app-bar-inner">
        <div class="brand-wrap">
          <span class="tt-logo logo" @click.prevent="handleBrandClick">FlashFinance</span>
        </div>

        <div class="app-bar-spacer"></div>

        <!-- Right-side area: show authenticated nav/actions or auth links when not signed in -->
        <div class="app-right" v-if="isAuthenticated">
          <nav class="app-nav">
            <button type="button" class="nav-link" @click="$emit('navigate', 'categories')">Categories</button>
            <button type="button" class="nav-link" @click="$emit('navigate', 'userAccount')">Account</button>
            <button type="button" class="nav-link nav-link--signout" @click="$emit('sign-out')">Sign Out</button>
          </nav>
        </div>
        <div class="app-right" v-else>
          <div class="app-auth-links">
            <button type="button" class="nav-link" @click="$emit('navigate', 'signin')">Sign In</button>
            <button type="button" class="nav-link nav-link--accent" @click="$emit('navigate', 'register')">Register</button>
          </div>
        </div>
      </div>
    </v-app-bar>

    <v-main :style="`background: var(--ff-background);`">
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  user: any | null
}>()
const emit = defineEmits<{
  (e: 'navigate', page: string): void
  (e: 'sign-out'): void
}>()

const isAuthenticated = computed(() => Boolean(props.user))

const handleBrandClick = () => {
  if (!isAuthenticated.value) return
  emit('navigate', 'main')
}
</script>

<style scoped>
.app-bar {
  background: var(--ff-primary);
  color: var(--ff-surface);
  height: var(--ff-app-bar-height);
  min-height: var(--ff-app-bar-height);
  display: flex;
  align-items: center;
  box-shadow: 0 1px 6px rgba(17, 24, 39, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  transition: height 180ms ease;
}

.app-bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 0 22px;
}

.app-bar-spacer {
  flex: 1;
}

.brand-wrap {
  display: flex;
  align-items: center;
  height: 100%;
}

.logo {
  cursor: pointer;
  font-weight: 900;
  font-size: 2.25rem;
  line-height: 1;
  font-style: italic;
  color: var(--ff-surface);
  transition: transform 180ms ease;
}

.logo:hover {
  transform: translateY(-2px);
}

.app-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-nav,
.app-auth-links {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-link {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.12);
  color: var(--ff-surface);
  font-size: 0.95rem;
  font-weight: 600;
  padding: 0.38rem 0.95rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  background: rgba(255, 255, 255, 0.22);
  outline: none;
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22);
}

.nav-link--accent,
.nav-link--signout {
  background: var(--ff-secondary-soft);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: var(--ff-surface);
}

.nav-link--accent:hover,
.nav-link--accent:focus-visible {
  background: var(--ff-secondary);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.nav-link--signout {
  background: rgba(196, 76, 76, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: var(--ff-surface);
}

.nav-link--signout:hover,
.nav-link--signout:focus-visible {
  background: rgba(196, 76, 76, 0.26);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.26);
}

@media (max-width: 900px) {
  .app-bar-inner {
    padding: 0 18px;
    gap: 14px;
  }

  .logo {
    font-size: 2rem;
  }

  .nav-link {
    font-size: 0.9rem;
    padding: 0.35rem 0.85rem;
  }
}

@media (max-width: 600px) {
  .app-bar {
    height: auto;
    min-height: 54px;
  }

  .app-bar-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    padding: 16px;
  }

  .app-bar-spacer {
    display: none;
  }

  .app-right {
    align-self: stretch;
    justify-content: space-between;
  }

  .nav-link {
    width: 100%;
    justify-content: center;
  }
}
</style>
