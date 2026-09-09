<template>
  <slot v-if="!capturedError" />
  <div v-else class="route-error-boundary" role="alert">
    <div class="reb-card">
      <CircleAlert aria-hidden="true" />
      <h1>这个页面渲染出了问题</h1>
      <p class="reb-detail">{{ capturedMessage }}</p>
      <p class="reb-hint">你的数据不受影响——这只是当前页面的显示错误。</p>
      <div class="reb-acts">
        <button class="reb-btn primary" type="button" @click="goWorkbench">返回工作台</button>
        <button class="reb-btn" type="button" @click="reload">重试当前页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 路由级错误边界：包住 RouterView，子树渲染异常时呈现兜底 UI，
 * 而不是整页白屏且无任何提示（2026-09-09 求职档案页偶发白屏的防御）。
 * 路由切换时自动复位——用户离开出错页即恢复正常渲染。
 */
import { CircleAlert } from 'lucide-vue-next'
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const capturedError = ref<unknown>(null)

const capturedMessage = ref('')

onErrorCaptured((error) => {
  capturedError.value = error
  capturedMessage.value = error instanceof Error ? error.message : String(error)
  // 边界已呈现兜底 UI，不再向全局 errorHandler 传播重复告警。
  return false
})

watch(
  () => route.fullPath,
  () => {
    capturedError.value = null
    capturedMessage.value = ''
  },
)

function goWorkbench(): void {
  void router.push('/')
}

function reload(): void {
  // 重挂当前路由：先离开再回来，触发子树完整重建。
  const target = route.fullPath
  void router.replace('/').then(() => router.replace(target))
}
</script>

<style scoped>
.route-error-boundary {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

.reb-card {
  max-width: 460px;
  width: 100%;
  padding: 32px;
  background: var(--surface, #fff);
  border: 1px solid var(--line-2, #d8e2dd);
  border-radius: 16px;
  box-shadow: var(--shadow-sm, 0 1px 2px rgb(15 23 42 / 6%));
  text-align: center;
}

.reb-card svg {
  width: 34px;
  height: 34px;
  color: var(--ow-danger, #b42318);
}

.reb-card h1 {
  margin: 12px 0 0;
  color: var(--ink, #1a2b25);
  font-size: 18px;
  font-weight: 800;
}

.reb-detail {
  margin: 10px 0 0;
  color: var(--ow-danger, #b42318);
  font-size: 13px;
  font-weight: 600;
  word-break: break-word;
}

.reb-hint {
  margin: 6px 0 0;
  color: var(--muted, #52685e);
  font-size: 13px;
}

.reb-acts {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.reb-btn {
  height: 38px;
  padding: 0 18px;
  border: 1px solid var(--line-2, #d8e2dd);
  border-radius: 10px;
  background: var(--surface-2, #f3f6f4);
  color: var(--ink-2, #3f574c);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.reb-btn.primary {
  border-color: transparent;
  background: var(--brand, #1f6f5c);
  color: #fff;
}
</style>
