<script setup lang="ts">
// Users page has been removed. This stub will redirect back to main if somehow reached.
import { onMounted } from 'vue'
const emit = defineEmits<{
  navigate: [page: string]
}>()

onMounted(() => {
  // navigate back to main immediately
  emit('navigate', 'main')
})
</script>

<template>
  <div class="users-removed">
    <p>This page has been removed.</p>
  </div>
</template>

<style scoped>
.users-removed {
  padding: 2rem;
  text-align: center;
  color: #666;
}
</style>
