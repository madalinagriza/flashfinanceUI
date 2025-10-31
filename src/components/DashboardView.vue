<template>
  <v-container fluid>
    <v-row dense>
      <v-col cols="12" md="6" lg="3" v-for="card in cards" :key="card.key">
        <v-hover v-slot="slotProps">
          <v-card :elevation="slotProps?.hover ? 6 : 2" class="summary-card" :class="{ 'is-hovered': slotProps?.hover }">
            <v-card-text>
              <div class="card-top">
                <div class="card-title tt-title">{{ card.title }}</div>
                <v-chip v-if="card.variant === 'success'" color="success" small>{{ card.chip }}</v-chip>
                <v-chip v-else-if="card.variant === 'error'" color="error" small>{{ card.chip }}</v-chip>
              </div>
              <div class="card-value tt-body">{{ card.value }}</div>
              <div class="card-sub tt-body">{{ card.sub }}</div>
            </v-card-text>
          </v-card>
        </v-hover>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Example summary card data — replace with real props or API-backed values as needed
const cards = ref([
  { key: 'total', title: 'Total Spend', value: '$12,345', sub: 'This month', chip: '+4.2%', variant: 'success' },
  { key: 'uncat', title: 'Uncategorized', value: '14', sub: 'Transactions', chip: 'Review', variant: 'error' },
  { key: 'saved', title: 'Savings', value: '$1,234', sub: 'YTD', chip: 'Stable', variant: 'success' },
  { key: 'alerts', title: 'Alerts', value: '2', sub: 'Requires attention', chip: '2 open', variant: 'error' },
])
</script>

<style scoped>
.summary-card {
  transition: box-shadow 200ms ease, transform 150ms ease, filter 150ms ease;
  border-radius: var(--radius);
  background: var(--v-theme-surface, white);
}
.summary-card.is-hovered {
  transform: translateY(-4px);
  filter: brightness(1.03);
}
.card-top {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 8px;
}
.card-title { font-size: 1rem; }
.card-value { font-size: 1.5rem; margin-top: 8px; }
.card-sub { color: rgba(0,0,0,0.6); margin-top: 6px; }

/* Respect typography utilities */
.tt-title { font-family: inherit; }
.tt-body { font-family: inherit; }
</style>
