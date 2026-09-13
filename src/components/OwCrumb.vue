<template>
  <div class="ow-crumb">
    <template v-for="(seg, i) in segments" :key="`${seg.label}-${i}`">
      <span v-if="i > 0" class="sep" aria-hidden="true">/</span>
      <RouterLink v-if="seg.to" :to="seg.to">{{ seg.label }}</RouterLink>
      <strong v-else-if="i === segments.length - 1">{{ seg.label }}</strong>
      <span v-else>{{ seg.label }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useCrumbSegments } from '@/composables/useCrumb'

const segments = useCrumbSegments()
</script>

<style scoped>
.sep {
  margin: 0 2px;
  color: var(--muted);
  font-weight: 500;
}

.ow-crumb a {
  color: var(--ow-muted, var(--muted));
  text-decoration: none;
}

.ow-crumb a:hover {
  color: var(--brand);
  text-decoration: underline;
}

.ow-crumb strong {
  color: var(--ink);
}
</style>
