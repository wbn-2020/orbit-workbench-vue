<template>
  <div class="empty-state">
    <component :is="icon" class="empty-icon" aria-hidden="true" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: Component
  }>(),
  {
    description: undefined,
    icon: Inbox,
  },
)
</script>

<style scoped>
.empty-state {
  display: grid;
  min-height: 210px;
  place-items: center;
  align-content: center;
  padding: 28px;
  color: var(--ow-muted);
  text-align: center;
}

.empty-icon {
  width: 26px;
  height: 26px;
  margin-bottom: 10px;
  color: var(--ow-primary);
  stroke-width: 1.7;
}

h3 {
  margin: 0;
  color: var(--ow-ink-secondary);
  font-size: 15px;
}

p {
  max-width: 48ch;
  margin: 6px 0 14px;
  font-size: 13px;
}
</style>
