<template>
  <header class="page-header">
    <div class="page-heading">
      <el-button
        v-if="back"
        class="back-button"
        text
        :icon="ArrowLeft"
        aria-label="返回"
        @click="$router.back()"
      />
      <div>
        <h1>{{ title }}</h1>
        <p v-if="description">{{ description }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title: string
    description?: string
    back?: boolean
  }>(),
  { description: undefined, back: false },
)
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.page-heading h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.25;
}

.page-heading p {
  max-width: 72ch;
  margin: 6px 0 0;
  color: var(--ow-muted);
}

.back-button {
  flex: none;
  margin: -4px 8px 0 -8px;
}

.page-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 680px) {
  .page-header {
    flex-direction: column;
    gap: 14px;
  }

  .page-actions {
    width: 100%;
    justify-content: stretch;
  }

  .page-actions :deep(.el-button) {
    flex: 1;
  }
}
</style>
