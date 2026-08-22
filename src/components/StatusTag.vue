<template>
  <el-tag :type="tagType" effect="plain" size="small">
    <span class="status-dot" aria-hidden="true" />
    {{ label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { enumLabel } from '@/utils/format'

const props = defineProps<{ value?: string | null }>()

const tagType = computed(() => {
  if (!props.value) return 'info'
  if (['SUCCESS', 'SUCCEEDED', 'READY'].includes(props.value)) return 'success'
  if (['FAILED', 'CANCELLED'].includes(props.value)) return 'danger'
  if (['RUNNING', 'QUEUED', 'PARSING', 'CANCELLING'].includes(props.value)) return 'primary'
  if (
    [
      'PAUSED',
      'PAUSING',
      'STALE',
      'PENDING',
      'UPLOADED',
      'WAITING_CONFIRMATION',
      'RECOVERY_REQUIRED',
    ]
      .includes(props.value)
  ) {
    return 'warning'
  }
  return 'info'
})

const label = computed(() => enumLabel(props.value))
</script>

<style scoped>
.el-tag {
  gap: 5px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
}
</style>
