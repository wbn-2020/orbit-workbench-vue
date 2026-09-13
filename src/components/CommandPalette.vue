<template>
  <Teleport to="body">
    <div v-if="open" class="cmd-overlay" @click.self="close">
      <div class="cmd-panel" role="dialog" aria-modal="true" aria-label="命令面板">
        <div class="cmd-input-row">
          <Search class="cmd-input-icon" :size="16" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="query"
            class="cmd-input"
            placeholder="搜索内容，或输入页面名称直接跳转…"
            aria-label="命令面板输入"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="activate()"
            @keydown.esc.prevent="close"
          >
          <span class="cmd-key-hint" aria-hidden="true">Esc 关闭</span>
        </div>
        <div ref="listRef" class="cmd-list">
          <template v-for="(item, i) in flat" :key="item.key">
            <div v-if="i === 0 || flat[i - 1]?.group !== item.group" class="cmd-group">
              {{ item.group }}
            </div>
            <button
              type="button"
              class="cmd-item"
              :class="{ 'is-active': i === activeIndex }"
              @mouseenter="activeIndex = i"
              @click="activate(item)"
            >
              <span class="cmd-item-title">{{ item.title }}</span>
              <span v-if="item.sub" class="cmd-item-sub">{{ item.sub }}</span>
            </button>
          </template>
          <div v-if="!flat.length" class="cmd-empty">
            {{ loading ? '搜索中…' : '没有匹配的结果' }}
          </div>
        </div>
        <div class="cmd-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
          <span><kbd>Enter</kbd> 前往</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import { SEARCH_DOMAIN_META, searchAll } from '@/api/search'

export interface PalettePage {
  label: string
  to: string
  section: string
}

const props = defineProps<{
  pages: PalettePage[]
}>()

const router = useRouter()

interface Row {
  key: string
  group: string
  title: string
  sub?: string
  to: string
}

const open = ref(false)
const query = ref('')
const activeIndex = ref(0)
const loading = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const hits = ref<Row[]>([])
let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchRequestId = 0

function matchesPage(page: PalettePage, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return (
    page.label.toLowerCase().includes(needle) ||
    page.section.toLowerCase().includes(needle) ||
    page.to.toLowerCase().includes(needle)
  )
}

const flat = ref<Row[]>([])

function rebuild(): void {
  const q = query.value.trim().toLowerCase()
  const rows: Row[] = []
  for (const page of props.pages) {
    if (!matchesPage(page, q)) continue
    rows.push({
      key: `page-${page.to}`,
      group: `页面 · ${page.section}`,
      title: page.label,
      sub: page.section,
      to: page.to,
    })
  }
  if (q.length >= 2) {
    rows.push(...hits.value)
  } else {
    hits.value = []
  }
  flat.value = rows
  if (activeIndex.value >= rows.length) activeIndex.value = Math.max(0, rows.length - 1)
}

watch(query, () => {
  rebuild()
  activeIndex.value = 0
  if (searchTimer) clearTimeout(searchTimer)
  const q = query.value.trim()
  if (q.length < 2) {
    loading.value = false
    hits.value = []
    return
  }
  loading.value = true
  const requestId = ++searchRequestId
  searchTimer = setTimeout(() => {
    void (async () => {
      try {
        const result = await searchAll(q)
        if (requestId !== searchRequestId) return
        hits.value = result.groups.flatMap((group) =>
          group.items.map((hit) => ({
            key: `hit-${hit.type}-${hit.id}`,
            group: SEARCH_DOMAIN_META[hit.type]?.label ?? group.label,
            title: hit.title,
            sub: hit.sub ?? undefined,
            to: hit.route,
          })),
        )
      } catch {
        if (requestId === searchRequestId) hits.value = []
      } finally {
        if (requestId === searchRequestId) {
          loading.value = false
          rebuild()
        }
      }
    })()
  }, 250)
})
watch(() => props.pages, rebuild, { deep: true })

function move(delta: number): void {
  if (!flat.value.length) return
  activeIndex.value = (activeIndex.value + delta + flat.value.length) % flat.value.length
  void nextTick(() => {
    listRef.value?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' })
  })
}

function activate(item?: Row): void {
  const target = item ?? flat.value[activeIndex.value]
  if (!target) return
  close()
  void router.push(target.to)
}

function show(): void {
  open.value = true
  query.value = ''
  hits.value = []
  flat.value = []
  rebuild()
  activeIndex.value = 0
  void nextTick(() => inputRef.value?.focus())
}

function close(): void {
  open.value = false
  loading.value = false
}

function onGlobalKey(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    if (open.value) close()
    else show()
    return
  }
  if (event.key === 'Escape' && open.value) close()
}

onMounted(() => window.addEventListener('keydown', onGlobalKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKey))

defineExpose({ show })
</script>

<style scoped>
.cmd-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgb(8 10 14 / 42%);
}

.cmd-panel {
  position: absolute;
  top: 12vh;
  left: 50%;
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 32px));
  overflow: hidden;
  background: var(--surface, #fff);
  border: 1px solid var(--line, #e5e7eb);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgb(0 0 0 / 28%);
  transform: translateX(-50%);
}

.cmd-input-row {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line, #e5e7eb);
}

.cmd-input-icon {
  flex: none;
  color: var(--muted, #6b7280);
}

.cmd-input {
  flex: 1;
  min-width: 0;
  color: var(--ink, #16181c);
  font: inherit;
  font-size: 16px;
  background: transparent;
  border: 0;
  outline: none;
}

.cmd-key-hint {
  flex: none;
  color: var(--faint, #9ca3af);
  font-size: var(--fs-xs);
}

.cmd-list {
  max-height: min(52vh, 420px);
  padding: 6px;
  overflow-y: auto;
}

.cmd-group {
  padding: 8px 12px 4px;
  color: var(--faint, #9ca3af);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.cmd-item {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 9px 12px;
  color: var(--ink, #16181c);
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--fs-sm);
}

.cmd-item.is-active {
  color: var(--brand-700, #2f5fb8);
  background: var(--brand-50, #eef4fd);
}

.cmd-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cmd-item-sub {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  color: var(--muted, #6b7280);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-xs);
}

.cmd-item.is-active .cmd-item-sub {
  color: inherit;
  opacity: 0.8;
}

.cmd-empty {
  padding: 22px 12px;
  color: var(--muted, #6b7280);
  text-align: center;
  font-size: var(--fs-sm);
}

.cmd-foot {
  display: flex;
  gap: 14px;
  padding: 9px 16px;
  color: var(--faint, #9ca3af);
  border-top: 1px solid var(--line, #e5e7eb);
  font-size: var(--fs-xs);
}

.cmd-foot kbd {
  padding: 1px 5px;
  color: var(--muted, #6b7280);
  background: var(--surface-2, #f3f4f6);
  border: 1px solid var(--line, #e5e7eb);
  border-radius: 5px;
  font-family: inherit;
  font-size: 11px;
}
</style>
