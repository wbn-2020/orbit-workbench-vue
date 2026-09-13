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
        <OwCrumb v-if="crumb" />
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
import OwCrumb from '@/components/OwCrumb.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    back?: boolean
    /** 显示由路由 meta 派生的统一面包屑（区块 / [上级] / 页面），默认开启 */
    crumb?: boolean
  }>(),
  { description: undefined, back: false, crumb: true },
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
  font-size: 22px;
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
