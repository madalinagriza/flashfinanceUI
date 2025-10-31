<template>
  <v-app>
  <v-app-bar :style="`background: white; color: #1f2933; height: 270px;`" elevated>
      <v-app-bar-nav-icon v-if="user" @click="drawer = !drawer" />
      <v-container class="app-bar-inner" style="max-width:1000px; display:flex; align-items:center;">
        <div class="brand-wrap">
          <span class="tt-logo logo" @click.prevent="$emit('navigate', 'main')">FlashFinance</span>
        </div>

        <div style="flex:1"></div>

        <!-- Right-side area: show authenticated nav/actions or auth links when not signed in -->
        <div class="app-right" v-if="user">
          <nav class="app-nav">
            <button type="button" class="nav-link" @click="$emit('navigate', 'categories')">Categories</button>
            <button type="button" class="nav-link" @click="$emit('navigate', 'userAccount')">Account</button>
            <button type="button" class="nav-link nav-link--outline" @click="$emit('sign-out')">Sign Out</button>
          </nav>
        </div>
        <div class="app-right" v-else>
          <div class="app-auth-links">
            <button type="button" class="nav-link" @click="$emit('navigate', 'signin')">Sign In</button>
            <button type="button" class="nav-link nav-link--outline" @click="$emit('navigate', 'register')">Register</button>
          </div>
        </div>
      </v-container>
    </v-app-bar>

    <v-main :style="`background: var(--ff-bg);`">
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const drawer = ref(false)
const props = defineProps<{
  user: any | null
}>()
const emit = defineEmits<{
  (e: 'navigate', page: string): void
  (e: 'sign-out'): void
}>()

// expose user locally for template convenience
// const user = props.user // This was the bug - it was not reactive.
</script>

<style scoped>
.brand-wrap { display:flex; align-items:center; flex: 0 0 auto; height: 100%; padding-left: 18px; }
.logo { cursor: pointer; font-weight: 900; font-size: 3.15rem; line-height: 1; font-style: italic; color: #1f2933; }
.app-right { display:flex; align-items:center; gap: 12px; height: 100%; }
.app-right { display:flex; align-items:center; gap: 12px; }
.app-nav { display:flex; align-items:center; gap: 12px; }
.app-auth-links { display:flex; align-items:center; gap: 12px; }
.app-actions { display:flex; align-items:center; gap: 8px; }
.signout-btn { color: white; border-color: rgba(255,255,255,0.25); font-size: 0.9rem; }
.nav-link {
  appearance: none;
  border: none;
  background: transparent;
  color: #1f2933;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  background: rgba(31, 41, 51, 0.08);
  outline: none;
  box-shadow: 0 0 0 2px rgba(31, 41, 51, 0.1);
}

.nav-link--outline {
  border: 1px solid rgba(31, 41, 51, 0.5);
  background: rgba(31, 41, 51, 0.06);
}

.app-auth-links .nav-link {
  color: #213547;
}

.app-auth-links .nav-link--outline {
  background: rgba(33, 53, 71, 0.08);
  border-color: rgba(33, 53, 71, 0.4);
}

.app-auth-links .nav-link--outline:hover,
.app-auth-links .nav-link--outline:focus-visible {
  background: rgba(33, 53, 71, 0.16);
}

/* Ensure navigation drawer list is left aligned and readable */
v-navigation-drawer >>> .v-list {
  padding-top: 0.5rem;
}

/* Small responsive tweaks */
@media (max-width: 600px) {
  .app-actions v-btn {
    font-size: 0.85rem;
    padding: 6px 8px;
  }
}
</style>
