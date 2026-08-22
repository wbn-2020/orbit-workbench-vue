<template>
  <div class="page">
    <PageHeader title="统一搜索" description="在当前工作区内搜索任务、数据集、资料、成果和运行。" />

    <section class="surface search-panel">
      <div class="search-input">
        <Search aria-hidden="true" />
        <input
          v-model="search.query"
          type="search"
          minlength="2"
          maxlength="100"
          placeholder="输入至少 2 个字符"
          autofocus
          @keydown.enter.prevent="executeNow"
        />
        <el-button
          type="primary"
          :loading="search.loading"
          :disabled="
            search.query.trim().length < 2
            || search.types.length === 0
            || !search.workspaceId
          "
          @click="executeNow"
        >
          搜索
        </el-button>
      </div>
      <div class="search-filters">
        <el-select
          v-model="search.workspaceId"
          placeholder="选择工作区"
          :disabled="workspaces.length === 0"
        >
          <el-option
            v-for="workspace in workspaces"
            :key="workspace.id"
            :label="workspace.name"
            :value="workspace.id"
          />
        </el-select>
        <el-checkbox-group v-model="search.types">
          <el-checkbox-button
            v-for="type in resourceTypes"
            :key="type"
            :value="type"
          >
            {{ enumLabel(type) }}
          </el-checkbox-button>
        </el-checkbox-group>
      </div>
    </section>

    <el-alert
      v-if="search.error"
      class="page-section"
      :title="search.error"
      type="error"
      show-icon
      :closable="false"
    />
    <div v-else-if="search.loading" class="surface page-feedback page-section">
      <el-skeleton :rows="8" animated />
    </div>
    <EmptyState
      v-else-if="search.query.trim().length < 2"
      class="surface page-section"
      title="输入关键词开始搜索"
      description="搜索词长度为 2 至 100 个字符。"
      :icon="Search"
    />
    <EmptyState
      v-else-if="search.types.length === 0"
      class="surface page-section"
      title="请选择资源类型"
      description="至少选择一种资源后再执行搜索。"
      :icon="Search"
    />
    <EmptyState
      v-else-if="search.results.length === 0"
      class="surface page-section"
      title="没有找到匹配结果"
      description="尝试更换关键词、工作区或资源类型。"
      :icon="SearchX"
    />
    <div v-else class="result-groups page-section">
      <section
        v-for="type in resourceTypes"
        v-show="groupedResults[type].length > 0"
        :key="type"
        class="surface result-group"
      >
        <div class="surface-header">
          <div class="group-title">
            <component :is="iconFor(type)" aria-hidden="true" />
            <div>
              <h2 class="surface-title">{{ enumLabel(type) }}</h2>
              <span class="surface-subtitle">{{ groupedResults[type].length }} 条结果</span>
            </div>
          </div>
        </div>
        <div class="result-list">
          <button
            v-for="item in groupedResults[type]"
            :key="`${item.resourceType}-${item.resourceId}`"
            type="button"
            class="result-row"
            @click="openResult(item)"
          >
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.summary || '无摘要' }}</small>
            </span>
            <time>{{ formatDateTime(item.updatedAt) }}</time>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  Archive,
  ChevronRight,
  Database,
  FileText,
  ListChecks,
  Search,
  SearchX,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import { useSearchStore } from '@/stores/search'
import type {
  SearchResourceType,
  SearchResultItem,
  Workspace,
} from '@/types/api'
import { enumLabel, formatDateTime } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const search = useSearchStore()
const workspaces = ref<Workspace[]>([])
const resourceTypes: SearchResourceType[] = [
  'TASK',
  'DATASET',
  'DOCUMENT',
  'ARTIFACT',
  'RUN',
]
let debounceTimer: number | undefined
let initializing = true

const groupedResults = computed<Record<SearchResourceType, SearchResultItem[]>>(() => ({
  TASK: search.results.filter((item) => item.resourceType === 'TASK'),
  DATASET: search.results.filter((item) => item.resourceType === 'DATASET'),
  DOCUMENT: search.results.filter((item) => item.resourceType === 'DOCUMENT'),
  ARTIFACT: search.results.filter((item) => item.resourceType === 'ARTIFACT'),
  RUN: search.results.filter((item) => item.resourceType === 'RUN'),
}))

function iconFor(type: SearchResourceType): Component {
  return {
    TASK: ListChecks,
    DATASET: Database,
    DOCUMENT: FileText,
    ARTIFACT: Archive,
    RUN: Activity,
  }[type]
}

function fallbackRoute(item: SearchResultItem): string {
  const routes: Record<SearchResourceType, string> = {
    TASK: `/tasks/${item.resourceId}`,
    DATASET: `/datasets/${item.resourceId}`,
    DOCUMENT: `/documents`,
    ARTIFACT: `/artifacts/${item.resourceId}`,
    RUN: `/runs/${item.resourceId}`,
  }
  return routes[item.resourceType]
}

function openResult(item: SearchResultItem): void {
  void router.push(item.route || fallbackRoute(item))
}

function executeNow(): void {
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = undefined
  const normalized = search.query.trim()
  void router.replace({
    path: '/search',
    query: normalized.length >= 2 ? { q: normalized } : undefined,
  })
  void search.execute()
}

function scheduleSearch(): void {
  if (initializing) return
  if (debounceTimer) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = undefined
    executeNow()
  }, 350)
}

watch(
  () => [search.query, search.workspaceId, search.types.join(',')],
  scheduleSearch,
)

onMounted(async () => {
  const routeQuery = typeof route.query.q === 'string' ? route.query.q : ''
  search.query = routeQuery
  search.results = []
  search.error = ''
  try {
    workspaces.value = await listWorkspaces()
    if (
      !search.workspaceId
      || !workspaces.value.some((workspace) => workspace.id === search.workspaceId)
    ) {
      search.workspaceId = workspaces.value[0]?.id
    }
    if (!search.workspaceId) {
      search.error = '没有可用工作区'
      return
    }
  } catch (workspaceError) {
    search.error = `工作区加载失败：${problemMessage(workspaceError)}`
    return
  } finally {
    initializing = false
  }
  if (search.query.trim().length >= 2) void search.execute()
})

onBeforeUnmount(() => {
  if (debounceTimer) window.clearTimeout(debounceTimer)
})
</script>

<style scoped>
.search-panel {
  padding: 14px;
}

.search-input {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.search-input > svg {
  width: 18px;
  height: 18px;
  color: var(--ow-muted);
}

.search-input input {
  min-width: 0;
  height: 38px;
  color: var(--ow-ink);
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 15px;
}

.search-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid var(--ow-line-soft);
}

.search-filters .el-select {
  width: 200px;
}

.result-groups {
  display: grid;
  gap: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-title > svg {
  width: 18px;
  height: 18px;
  color: var(--ow-primary);
}

.result-list {
  padding: 5px 8px 8px;
}

.result-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 68px;
  padding: 10px 8px;
  color: inherit;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--ow-line-soft);
  cursor: pointer;
}

.result-row:hover {
  background: var(--ow-surface-raised);
}

.result-row > span {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.result-row strong,
.result-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-row small,
.result-row time {
  color: var(--ow-muted);
  font-size: 12px;
}

.result-row > svg {
  width: 15px;
  height: 15px;
  color: var(--ow-muted);
}

@media (max-width: 700px) {
  .search-filters {
    align-items: stretch;
    flex-direction: column;
  }

  .search-filters .el-select,
  .search-filters :deep(.el-checkbox-group) {
    width: 100%;
  }

  .result-row {
    grid-template-columns: minmax(0, 1fr) 16px;
  }

  .result-row time {
    display: none;
  }
}
</style>
