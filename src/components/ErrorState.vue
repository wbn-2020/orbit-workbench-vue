<template>
  <div class="error-state" role="alert">
    <CircleAlert aria-hidden="true" />
    <div>
      <strong>{{ title }}</strong>
      <p>{{ message }}</p>
    </div>
    <el-button v-if="retry" text :icon="RefreshCw" @click="retry">重试</el-button>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, RefreshCw } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    message: string
    retry?: () => void
  }>(),
  { title: '加载失败', retry: undefined },
)
</script>

<style scoped>
.error-state {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  color: var(--ow-ink-secondary);
  background: var(--ow-danger-soft);
  border: 1px solid oklch(0.45 0.09 25);
  border-radius: var(--ow-radius);
}

.error-state > svg {
  width: 19px;
  height: 19px;
  flex: none;
  color: var(--ow-danger);
}

.error-state div {
  flex: 1;
  min-width: 0;
}

.error-state p {
  margin: 3px 0 0;
  color: var(--ow-muted);
}
</style>
