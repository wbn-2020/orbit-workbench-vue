<template>
  <div class="page">
    <PageHeader title="MCP Servers" description="配置受控 MCP Server，同步工具元数据并显式启用工具。">
      <template #actions>
        <el-select v-model="workspaceId" placeholder="选择工作空间" @change="load">
          <el-option
            v-for="workspace in workspaces"
            :key="workspace.id"
            :label="workspace.name"
            :value="workspace.id"
          />
        </el-select>
        <el-button :icon="RefreshCw" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建 Server</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <div v-else class="catalog-layout">
      <section class="surface server-list">
        <div v-if="loading" class="page-feedback"><el-skeleton :rows="7" animated /></div>
        <EmptyState
          v-else-if="servers.length === 0"
          title="没有 MCP Server"
          description="添加一个受控 Server 后同步工具目录。"
          :icon="PlugZap"
        />
        <button
          v-for="server in servers"
          :key="server.id"
          class="server-row"
          :class="{ active: selected?.id === server.id }"
          type="button"
          @click="select(server)"
        >
          <PlugZap aria-hidden="true" />
          <span class="server-main">
            <strong>{{ server.name }}</strong>
            <small>{{ server.serverCode }} · {{ server.syncStatus }}</small>
          </span>
          <StatusTag :value="server.status" />
        </button>
      </section>

      <section class="surface detail-panel">
        <EmptyState
          v-if="!selected"
          title="选择一个 MCP Server"
          description="查看同步状态、工具清单和启停策略。"
          :icon="PlugZap"
        />
        <template v-else>
          <div class="surface-header">
            <div>
              <h2 class="surface-title">{{ selected.name }}</h2>
              <span class="surface-subtitle mono">{{ selected.serverCode }}</span>
            </div>
            <div class="inline-actions">
              <StatusTag :value="selected.status" />
              <el-button :icon="Edit3" @click="openEdit">编辑</el-button>
              <el-button
                :icon="RefreshCw"
                :loading="actionLoading"
                @click="sync"
              >同步工具</el-button>
              <el-button
                v-if="selected.status === 'DISABLED'"
                type="success"
                :icon="Power"
                :loading="actionLoading"
                @click="toggleServer"
              >启用</el-button>
              <el-button
                v-else
                type="danger"
                plain
                :icon="PowerOff"
                :loading="actionLoading"
                @click="toggleServer"
              >停用</el-button>
            </div>
          </div>

          <dl class="detail-grid">
            <div><dt>传输</dt><dd>{{ selected.transport }}</dd></div>
            <div><dt>同步状态</dt><dd>{{ selected.syncStatus }}</dd></div>
            <div><dt>凭据</dt><dd>{{ selected.hasCredentialRef ? '已配置引用' : '未配置' }}</dd></div>
            <div><dt>工具数</dt><dd>{{ selected.tools.length }}</dd></div>
            <div class="wide"><dt>Endpoint</dt><dd class="mono endpoint">{{ selected.endpointUrl }}</dd></div>
            <div v-if="selected.lastErrorSummary" class="wide">
              <dt>最近错误</dt><dd class="error-text">{{ selected.lastErrorSummary }}</dd>
            </div>
          </dl>

          <div class="section-heading">
            <div>
              <h3>工具清单</h3>
              <p>同步只写入元数据；工具必须单独启用后才能进入 Tool Runtime。</p>
            </div>
          </div>
          <div v-if="selected.tools.length === 0" class="inline-empty">尚未同步工具。</div>
          <el-table v-else :data="selected.tools" row-key="id">
            <el-table-column label="工具" min-width="250">
              <template #default="{ row }">
                <div class="primary-cell">
                  <strong>{{ row.title || row.toolName }}</strong>
                  <span class="mono">{{ row.toolName }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="版本" width="90">
              <template #default="{ row }">v{{ row.versionNumber }}</template>
            </el-table-column>
            <el-table-column label="风险" width="90" prop="riskLevel" />
            <el-table-column label="状态" width="120">
              <template #default="{ row }">{{ row.enabled ? '已启用' : '未启用' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button
                  text
                  :type="row.enabled ? 'danger' : 'success'"
                  :loading="toolActionId === row.id"
                  @click="toggleTool(row)"
                >{{ row.enabled ? '停用' : '启用' }}</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </section>
    </div>

    <el-drawer v-model="editorOpen" title="MCP Server 配置" size="min(620px, 96vw)" destroy-on-close>
      <el-alert
        v-if="editorError"
        :title="editorError"
        type="error"
        show-icon
        :closable="false"
      />
      <el-form :model="form" label-position="top" @submit.prevent>
        <el-form-item label="Server code">
          <el-input v-model="form.serverCode" maxlength="64" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" maxlength="128" />
        </el-form-item>
        <el-form-item label="传输">
          <el-select v-model="form.transport">
            <el-option label="STREAMABLE_HTTP" value="STREAMABLE_HTTP" />
          </el-select>
        </el-form-item>
        <el-form-item label="Endpoint URL">
          <el-input v-model="form.endpointUrl" placeholder="http://127.0.0.1:3000/mcp" />
        </el-form-item>
        <el-form-item label="凭据引用">
          <el-input
            v-model="form.credentialRef"
            placeholder="仅保存受控引用，不填写则保留已有引用"
          />
        </el-form-item>
        <el-form-item label="允许私有网络地址">
          <el-switch v-model="form.allowPrivateNetwork" />
        </el-form-item>
        <div class="drawer-actions">
          <el-button @click="editorOpen = false">取消</el-button>
          <el-button type="primary" :loading="actionLoading" @click="save">保存</el-button>
        </div>
      </el-form>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Edit3, PlugZap, Plus, Power, PowerOff, RefreshCw } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

import {
  createMcpServer,
  disableMcpServer,
  disableMcpTool,
  enableMcpServer,
  enableMcpTool,
  listMcpServers,
  syncMcpServer,
  updateMcpServer,
  type McpServerPayload,
} from '@/api/mcp'
import { problemMessage } from '@/api/http'
import { listWorkspaces } from '@/api/workspaces'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type { McpServer, McpTool, Workspace } from '@/types/api'

const loading = ref(false)
const error = ref('')
const actionLoading = ref(false)
const toolActionId = ref<number>()
const editorOpen = ref(false)
const editorError = ref('')
const workspaceId = ref<number>()
const workspaces = ref<Workspace[]>([])
const servers = ref<McpServer[]>([])
const selected = ref<McpServer>()
const editingId = ref<number>()
const route = useRoute()
const router = useRouter()

const form = reactive({
  serverCode: '',
  name: '',
  transport: 'STREAMABLE_HTTP' as const,
  endpointUrl: '',
  credentialRef: '',
  allowPrivateNetwork: false,
})

const selectedWorkspace = computed(() => workspaceId.value || 0)

function select(server: McpServer): void {
  selected.value = server
  void router.replace(`/mcp/servers/${server.id}`)
}

function replaceServer(updated: McpServer): void {
  const index = servers.value.findIndex((server) => server.id === updated.id)
  if (index >= 0) servers.value[index] = updated
  selected.value = updated
}

function openCreate(): void {
  editingId.value = undefined
  editorError.value = ''
  Object.assign(form, {
    serverCode: '',
    name: '',
    transport: 'STREAMABLE_HTTP',
    endpointUrl: '',
    credentialRef: '',
    allowPrivateNetwork: false,
  })
  editorOpen.value = true
}

function openEdit(): void {
  if (!selected.value) return
  editingId.value = selected.value.id
  editorError.value = ''
  Object.assign(form, {
    serverCode: selected.value.serverCode,
    name: selected.value.name,
    transport: selected.value.transport,
    endpointUrl: selected.value.endpointUrl,
    credentialRef: '',
    allowPrivateNetwork: selected.value.allowPrivateNetwork,
  })
  editorOpen.value = true
}

function payload(): McpServerPayload {
  return {
    workspaceId: selectedWorkspace.value,
    serverCode: form.serverCode.trim(),
    name: form.name.trim(),
    transport: form.transport,
    endpointUrl: form.endpointUrl.trim(),
    credentialRef: form.credentialRef.trim() || null,
    allowPrivateNetwork: form.allowPrivateNetwork,
    expectedVersion: selected.value?.lockVersion,
  }
}

async function save(): Promise<void> {
  actionLoading.value = true
  editorError.value = ''
  try {
    const updated = editingId.value
      ? await updateMcpServer(editingId.value, payload())
      : await createMcpServer(payload())
    replaceServer(updated)
    editorOpen.value = false
    await load()
    ElMessage.success('MCP Server 已保存')
  } catch (saveError) {
    editorError.value = problemMessage(saveError)
  } finally {
    actionLoading.value = false
  }
}

async function sync(): Promise<void> {
  if (!selected.value) return
  actionLoading.value = true
  try {
    const updated = await syncMcpServer(selected.value.id)
    replaceServer(updated)
    await load()
    ElMessage.success('MCP 工具目录已同步')
  } catch (syncError) {
    ElMessage.error(problemMessage(syncError))
    await load()
  } finally {
    actionLoading.value = false
  }
}

async function toggleServer(): Promise<void> {
  if (!selected.value) return
  const enabling = selected.value.status === 'DISABLED'
  try {
    await ElMessageBox.confirm(
      enabling
        ? '启用后，已显式启用的 MCP Tool 才允许进入运行时。'
        : '停用后，该 Server 下的 MCP Tool 将无法运行。',
      enabling ? '确认启用 MCP Server' : '确认停用 MCP Server',
      { type: 'warning', confirmButtonText: enabling ? '启用' : '停用', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  actionLoading.value = true
  try {
    const updated = enabling
      ? await enableMcpServer(selected.value.id)
      : await disableMcpServer(selected.value.id)
    replaceServer(updated)
    await load()
  } catch (toggleError) {
    ElMessage.error(problemMessage(toggleError))
  } finally {
    actionLoading.value = false
  }
}

async function toggleTool(tool: McpTool): Promise<void> {
  toolActionId.value = tool.id
  try {
    const updated = tool.enabled
      ? await disableMcpTool(tool.id)
      : await enableMcpTool(tool.id)
    if (selected.value) {
      selected.value = {
        ...selected.value,
        tools: selected.value.tools.map((item) => item.id === updated.id ? updated : item),
      }
      replaceServer(selected.value)
    }
    await load()
  } catch (toggleError) {
    ElMessage.error(problemMessage(toggleError))
  } finally {
    toolActionId.value = undefined
  }
}

async function load(): Promise<void> {
  if (!workspaceId.value) return
  loading.value = true
  error.value = ''
  try {
    servers.value = await listMcpServers(workspaceId.value)
    const routeId = Number(route.params.id)
    selected.value = servers.value.find((server) => server.id === routeId)
      || servers.value.find((server) => server.id === selected.value?.id)
      || servers.value[0]
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    workspaces.value = await listWorkspaces()
    workspaceId.value = workspaces.value.find((workspace) => workspace.isDefault)?.id
      || workspaces.value[0]?.id
    await load()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  }
})

watch(
  () => route.params.id,
  () => {
    if (!route.params.id || !servers.value.length) return
    const routeId = Number(route.params.id)
    const server = servers.value.find((item) => item.id === routeId)
    if (server) selected.value = server
  },
)
</script>

<style scoped>
.catalog-layout { display: grid; grid-template-columns: minmax(260px, 0.34fr) minmax(0, 1fr); gap: 16px; }
.server-list { padding: 8px; align-self: start; }
.server-row { display: flex; width: 100%; align-items: center; gap: 10px; padding: 14px 12px; color: inherit; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--ow-line-soft); cursor: pointer; }
.server-row.active { background: var(--ow-surface-subtle); }
.server-main { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 4px; }
.server-main small { color: var(--ow-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.detail-panel { min-width: 0; padding: 18px; }
.detail-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 22px 0; }
.detail-grid dt { color: var(--ow-text-muted); font-size: 12px; }
.detail-grid dd { margin: 4px 0 0; }
.detail-grid .wide { grid-column: 1 / -1; }
.endpoint { overflow-wrap: anywhere; }
.error-text { color: var(--ow-danger); }
.section-heading { display: flex; justify-content: space-between; gap: 12px; margin: 22px 0 12px; }
.section-heading h3, .section-heading p { margin: 0; }
.section-heading p, .inline-empty { color: var(--ow-text-muted); }
.section-heading p { margin-top: 4px; font-size: 13px; }
.primary-cell { display: flex; flex-direction: column; gap: 4px; }
.primary-cell span { color: var(--ow-text-muted); font-size: 12px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
@media (max-width: 900px) { .catalog-layout { grid-template-columns: 1fr; } .detail-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .detail-grid { grid-template-columns: 1fr; } .detail-grid .wide { grid-column: auto; } }
</style>
