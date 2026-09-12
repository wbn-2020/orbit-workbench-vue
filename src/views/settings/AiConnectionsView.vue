<template>
  <div class="page">
    <PageHeader title="AI 连接" description="管理模型供应商、协议和可用性测试。API Key 只在当前表单内存中存在。">
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openCreate">添加连接</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="error" :message="error" :retry="load" />
    <section v-else class="surface">
      <div v-if="loading" class="page-feedback"><el-skeleton :rows="6" animated /></div>
      <EmptyState
        v-else-if="connections.length === 0"
        title="还没有 AI 连接"
        description="添加一个 OpenAI 兼容连接后，技术学习任务才能调用模型。"
        :icon="Bot"
      >
        <el-button type="primary" @click="openCreate">添加连接</el-button>
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="connections" row-key="id">
          <el-table-column label="连接" min-width="220">
            <template #default="{ row }">
              <div class="connection-cell">
                <span class="connection-mark"><Bot aria-hidden="true" /></span>
                <span>
                  <strong>{{ row.name }}</strong>
                  <small>{{ resolveAiConnectionUrl(row.baseUrl, row.endpointPath) }}</small>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="Provider" width="150">
            <template #default="{ row }">{{ enumLabel(row.providerType) }}</template>
          </el-table-column>
          <el-table-column label="协议" width="150">
            <template #default="{ row }">{{ enumLabel(row.protocol) }}</template>
          </el-table-column>
          <el-table-column label="模型" width="170">
            <template #default="{ row }">
              <span class="mono">{{ row.modelName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="联网" width="140">
            <template #default="{ row }">
              <el-tag v-if="row.webSearchSupported" size="small" :type="row.forcedSearchSupported ? 'success' : 'warning'" effect="plain">
                {{ row.forcedSearchSupported ? '可强制检索' : '模型自决检索' }}
              </el-tag>
              <span v-else class="muted">不联网</span>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="90">
            <template #default="{ row }">
              <el-switch
                :model-value="row.enabled"
                :loading="togglingId === row.id"
                @change="toggle(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="最近测试" width="130">
            <template #default="{ row }">
              <StatusTag :value="row.lastTestStatus || 'UNTESTED'" />
            </template>
          </el-table-column>
          <el-table-column label="延迟" width="100">
            <template #default="{ row }">
              {{ row.lastTestLatencyMs ? `${row.lastTestLatencyMs} ms` : '—' }}
            </template>
          </el-table-column>
          <el-table-column label="测试时间" width="155">
            <template #default="{ row }">{{ formatDateTime(row.lastTestedAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="230" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button text :icon="Activity" @click="testSaved(row)">测试</el-button>
                <el-button text :icon="Edit3" @click="openEdit(row)">编辑</el-button>
                <el-button text type="danger" :icon="Trash2" @click="remove(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <section class="surface">
      <div class="section-head">
        <div>
          <h2>场景绑定</h2>
          <p class="section-note">
            为四类 AI 能力分别指定主用与备用账户。备用账户仅在主用出现可重试的上游失败
            （服务不可用、超时、流中断、限流）后启用一次；凭据错误、模型不存在、请求非法
            不会被切换掩盖。面试会话创建时已指定的账户优先级最高，该场景配置不介入。
          </p>
        </div>
        <el-button :icon="RefreshCw" :loading="scenarioLoading" @click="loadScenarios">
          重新加载
        </el-button>
      </div>

      <div v-if="scenarioError" class="page-feedback">
        <ErrorState :message="scenarioError" :retry="loadScenarios" />
      </div>
      <div v-else-if="scenarioLoading" class="page-feedback"><el-skeleton :rows="4" animated /></div>
      <div v-else class="table-wrap">
        <el-table :data="scenarioRoutes" row-key="scenario">
          <el-table-column label="场景" min-width="200">
            <template #default="{ row }">
              <div class="connection-cell">
                <span class="connection-mark"><Bot aria-hidden="true" /></span>
                <span>
                  <strong>{{ row.scenarioLabel }}</strong>
                  <small>{{ AI_SCENARIO_HINTS[row.scenario as AiScenario] }}</small>
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="主用账户" min-width="190">
            <template #default="{ row }">
              <el-select v-model="draftOf(row.scenario).primaryConnectionId"
                placeholder="选择账户" class="width-full">
                <el-option
                  v-for="item in selectableConnections"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="备用账户" min-width="190">
            <template #default="{ row }">
              <el-select v-model="draftOf(row.scenario).backupConnectionId"
                clearable placeholder="不启用" class="width-full">
                <el-option
                  v-for="item in selectableConnections"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                  :disabled="item.id === draftOf(row.scenario).primaryConnectionId"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="故障切换" width="100">
            <template #default="{ row }">
              <el-switch
                v-model="draftOf(row.scenario).failoverEnabled"
                :disabled="!draftOf(row.scenario).backupConnectionId"
              />
            </template>
          </el-table-column>
          <el-table-column label="当前生效" width="150">
            <template #default="{ row }">
              <el-tag :type="row.source === 'ROUTE' ? 'success' : 'info'" effect="plain" size="small">
                {{ row.source === 'ROUTE' ? '已配置' : '默认回退' }}
              </el-tag>
              <small v-if="row.source === 'ROUTE'" class="cell-note">v{{ row.version }}</small>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  text
                  type="primary"
                  :loading="savingScenario === row.scenario"
                  @click="saveScenario(row.scenario)"
                >
                  保存
                </el-button>
                <el-button
                  v-if="row.source === 'ROUTE'"
                  text
                  @click="resetScenario(row.scenario)"
                >
                  恢复默认
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <section class="surface">
      <div class="section-head">
        <div>
          <h2>最近 AI 调用</h2>
          <p class="section-note">
            审计记录场景、实际使用的账户、是否尝试过备用、耗时与文本长度；
            不保存提示词、模型原文和任何凭据。
          </p>
        </div>
        <el-button :icon="RefreshCw" :loading="auditLoading" @click="loadAudits">刷新</el-button>
      </div>
      <div v-if="auditLoading" class="page-feedback"><el-skeleton :rows="4" animated /></div>
      <div v-else-if="auditError" class="page-feedback">
        <ErrorState :message="auditError" :retry="loadAudits" />
      </div>
      <EmptyState v-else-if="audits.length === 0" title="还没有调用记录"
        description="生成一次报告、画像事实或知识库问答后，这里会出现真实留痕。" :icon="Activity">
      </EmptyState>
      <div v-else class="table-wrap">
        <el-table :data="audits" row-key="id">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="场景" width="130">
            <template #default="{ row }">{{ row.scenarioLabel }}</template>
          </el-table-column>
          <el-table-column label="实际账户" min-width="150">
            <template #default="{ row }">
              {{ row.usedConnectionName || `#${row.usedConnectionId}` }}
              <small v-if="row.backupAttempted" class="cell-note">已切换备用</small>
            </template>
          </el-table-column>
          <el-table-column label="结果" width="150">
            <template #default="{ row }">
              <span :class="row.status === 'SUCCEEDED' ? 'audit-ok' : 'audit-fail'">
                {{ aiAuditStatusLabel(row.status) }}
              </span>
              <small v-if="row.errorCode" class="mono cell-note">{{ row.errorCode }}</small>
            </template>
          </el-table-column>
          <el-table-column label="延迟" width="100">
            <template #default="{ row }">{{ typeof row.latencyMs === 'number' ? `${row.latencyMs} ms` : '—' }}</template>
          </el-table-column>
          <el-table-column label="请求/响应字数" width="140">
            <template #default="{ row }">{{ row.requestChars }} / {{ row.responseChars }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-drawer
      v-model="drawerOpen"
      :title="editingId ? '编辑 AI 连接' : '添加 AI 连接'"
      direction="rtl"
      size="min(560px, 100vw)"
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-alert
          v-if="saveConflict"
          class="save-conflict"
          :title="saveConflict"
          type="warning"
          show-icon
          :closable="false"
        />
        <el-form-item label="连接名称" prop="name">
          <el-input v-model.trim="form.name" placeholder="例如：本地 DeepSeek" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="Provider 类型" prop="providerType">
            <el-select v-model="form.providerType">
              <el-option
                v-for="provider in providerCatalogs"
                :key="provider.id"
                :label="provider.displayName"
                :value="provider.providerCode"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="协议" prop="protocol">
            <el-select v-model="form.protocol">
              <el-option
                v-for="protocol in protocolOptions"
                :key="protocol"
                :label="enumLabel(protocol)"
                :value="protocol"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="完整请求 URL" prop="baseUrl">
          <el-input
            v-model.trim="form.baseUrl"
            placeholder="https://api.example.com/v1/chat/completions"
          />
        </el-form-item>
        <el-form-item label="Endpoint Path（兼容）" prop="endpointPath">
          <el-input v-model.trim="form.endpointPath" placeholder="/chat/completions" />
        </el-form-item>
        <el-form-item label="默认模型（ModelProfile）" prop="modelName">
          <el-input v-model.trim="form.modelName" placeholder="例如：Deepseek-v4-flash" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input
            v-model="form.apiKey"
            type="password"
            show-password
            autocomplete="off"
            :placeholder="editingId ? '留空表示保留当前 Key' : '仅在当前表单中保留'"
          />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="超时（毫秒）" prop="timeoutMs">
            <el-input-number v-model="form.timeoutMs" :min="1000" :max="120000" :step="1000" />
          </el-form-item>
          <el-form-item label="输入价（元/百万 token）">
            <el-input-number
              v-model="form.inputPricePerMillion"
              :min="0"
              :step="0.1"
              :precision="4"
              :controls="false"
              placeholder="留空表示不计价"
            />
          </el-form-item>
          <el-form-item label="输出价（元/百万 token）">
            <el-input-number
              v-model="form.outputPricePerMillion"
              :min="0"
              :step="0.1"
              :precision="4"
              :controls="false"
              placeholder="留空表示不计价"
            />
          </el-form-item>
          <el-form-item label="联网形状">
            <el-select v-model="form.webSearchDialect" style="width: 100%">
              <el-option
                v-for="option in webSearchDialectOptions(form.protocol)"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <small class="muted dialect-hint">{{ webSearchDialectHint(form.webSearchDialect) }}</small>
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="form.enabled" />
          </el-form-item>
        </div>

        <div class="test-block">
          <div class="test-heading">
            <div>
              <strong>连通性测试</strong>
              <span>{{ shouldTestDraft ? '测试当前表单配置' : '测试已保存连接' }}</span>
            </div>
            <el-switch v-model="testStreaming" active-text="流式" inactive-text="非流式" />
          </div>
          <el-input
            v-model="testPrompt"
            type="textarea"
            :rows="3"
            placeholder="测试提示词，默认只要求模型回复 OK"
          />
          <div class="test-actions">
            <el-button :loading="testing" :icon="Activity" @click="testCurrent">
              {{ shouldTestDraft ? '测试当前配置' : '测试已保存连接' }}
            </el-button>
            <span v-if="testResult" :class="['test-result', testResult.status === 'SUCCESS' ? 'success' : 'danger']">
              {{ testResult.status === 'SUCCESS' ? '连接成功' : '连接失败' }}
              <template v-if="testResult.latencyMs"> · {{ testResult.latencyMs }} ms</template>
            </span>
          </div>
          <p v-if="testResult?.errorSummary" class="error-text">{{ testResult.errorSummary }}</p>
          <p v-if="testResult?.eventCount" class="muted">
            收到 {{ testResult.eventCount }} 个事件{{ testResult.doneMarkerReceived ? '，已收到结束标记' : '' }}
          </p>
        </div>

        <section v-if="editingId" class="connection-metadata">
          <div class="metadata-heading">
            <div>
              <strong>模型配置与测试历史</strong>
              <span>保存后的实际配置与最近 5 次连通性测试</span>
            </div>
            <el-button text :icon="RefreshCw" :loading="metadataLoading" @click="loadMetadata">
              刷新
            </el-button>
          </div>
          <el-skeleton v-if="metadataLoading" :rows="4" animated />
          <template v-else>
            <dl v-if="modelProfiles.length" class="profile-grid">
              <div>
                <dt>模型</dt>
                <dd class="mono">{{ modelProfiles[0]?.modelName }}</dd>
              </div>
              <div>
                <dt>支持协议</dt>
                <dd>{{ modelProfiles[0]?.supportedProtocols.map(enumLabel).join('、') || '—' }}</dd>
              </div>
            </dl>
            <p v-else class="muted metadata-empty">暂无可用 Model Profile</p>

            <div v-if="testHistory.length" class="test-history">
              <div v-for="record in testHistory" :key="record.id" class="test-history-row">
                <StatusTag :value="record.status" />
                <span>{{ enumLabel(record.protocol) }} · {{ record.streaming ? '流式' : '非流式' }}</span>
                <span>{{ record.latencyMs == null ? '—' : `${record.latencyMs} ms` }}</span>
                <time>{{ formatDateTime(record.testedAt) }}</time>
              </div>
            </div>
            <p v-else class="muted metadata-empty">暂无已保存连接的测试记录</p>
          </template>
        </section>
      </el-form>

      <template #footer>
        <el-button @click="drawerOpen = false">取消</el-button>
        <el-button
          type="primary"
          :loading="saving"
          :disabled="Boolean(saveConflict)"
          @click="save"
        >
          保存连接
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { Activity, Bot, Edit3, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import {
  createAiConnection,
  deleteAiConnection,
  listConnectionModelProfiles,
  listConnectionTests,
  listAiConnections,
  listProviderCatalogs,
  setAiConnectionEnabled,
  testDraftAiConnection,
  testSavedAiConnection,
  updateAiConnection,
  webSearchDialectHint,
  webSearchDialectOptions,
} from '@/api/aiConnections'
import {
  AI_SCENARIO_HINTS,
  aiAuditStatusLabel,
  listCallAudits,
  listScenarioRoutes,
  removeScenarioRoute,
  saveScenarioRoute,
} from '@/api/aiScenarios'
import type { AiScenario, CallAudit, ScenarioRoute } from '@/api/aiScenarios'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import StatusTag from '@/components/StatusTag.vue'
import type {
  AiConnection,
  AiConnectionPayload,
  AiProtocol,
  ConnectionTestHistoryItem,
  ConnectionTestResult,
  ModelProfile,
  ProviderCatalog,
  ProviderType,
} from '@/types/api'
import { isAiConnectionDraftDirty } from '@/utils/aiConnectionDraft'
import { resolveAiConnectionUrl } from '@/utils/aiConnectionAddress'
import { enumLabel, formatDateTime } from '@/utils/format'
import { createLatestRequestGuard } from '@/utils/latestRequest'

const loading = ref(true)
const error = ref('')
const connections = ref<AiConnection[]>([])
const providerCatalogs = ref<ProviderCatalog[]>([])
const modelProfiles = ref<ModelProfile[]>([])
const testHistory = ref<ConnectionTestHistoryItem[]>([])
const drawerOpen = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const saving = ref(false)
const testing = ref(false)
const togglingId = ref<number | null>(null)
const testStreaming = ref(true)
const testPrompt = ref('Reply with OK only.')
const testResult = ref<ConnectionTestResult>()
const metadataLoading = ref(false)
const saveConflict = ref('')
const savedConnection = ref<AiConnection | null>(null)
const metadataRequest = createLatestRequestGuard()
const testRequest = createLatestRequestGuard()

interface ScenarioDraft {
  primaryConnectionId: number | null
  backupConnectionId: number | null
  failoverEnabled: boolean
}

const scenarioRoutes = ref<ScenarioRoute[]>([])
const scenarioDraft = reactive<Record<string, ScenarioDraft>>({})
const scenarioLoading = ref(false)
const scenarioError = ref('')
const savingScenario = ref<AiScenario | ''>('')
const audits = ref<CallAudit[]>([])
const auditLoading = ref(false)
const auditError = ref('')
const selectableConnections = computed(() => connections.value.filter((item) => item.enabled))

const form = reactive({
  name: '',
  providerType: 'CUSTOM_OPENAI_COMPATIBLE' as ProviderType,
  baseUrl: '',
  endpointPath: '/chat/completions',
  protocol: 'CHAT_COMPLETIONS' as AiProtocol,
  modelName: '',
  apiKey: '',
  timeoutMs: 30_000,
  enabled: true,
  webSearchDialect: 'NONE',
  // 单价是可选项：不填就是「不计价」，用量页会如实显示未计价而不是 0
  inputPricePerMillion: null as number | null,
  outputPricePerMillion: null as number | null,
})

// 协议换了，原形状可能根本不属于这个协议；退回不联网比留着发错参数安全。
watch(() => form.protocol, (protocol) => {
  const offered = webSearchDialectOptions(protocol).map((option) => option.value)
  if (!offered.includes(form.webSearchDialect)) form.webSearchDialect = 'NONE'
})

const shouldTestDraft = computed(() =>
  isAiConnectionDraftDirty(savedConnection.value, buildPayload()),
)
const protocolOptions = computed<AiProtocol[]>(() => {
  const provider = providerCatalogs.value.find(
    (item) => item.providerCode === form.providerType,
  )
  return provider?.defaultProtocols.length
    ? provider.defaultProtocols
    : ['CHAT_COMPLETIONS', 'RESPONSES']
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入连接名称', trigger: 'blur' }],
  providerType: [{ required: true, message: '请选择 Provider 类型', trigger: 'change' }],
  baseUrl: [
    { required: true, message: '请输入 Base URL', trigger: 'blur' },
    { type: 'url', message: '请输入有效 URL', trigger: 'blur' },
  ],
  endpointPath: [{ required: true, message: '请输入 Endpoint Path', trigger: 'blur' }],
  protocol: [{ required: true, message: '请选择协议', trigger: 'change' }],
  modelName: [{ required: true, message: '请输入默认模型名', trigger: 'blur' }],
  apiKey: [
    {
      validator: (_rule, value: string, callback) => {
        if (!editingId.value && !value) callback(new Error('请输入 API Key'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
  timeoutMs: [
    {
      validator: (_rule, value: number, callback) => {
        if (value < 1000 || value > 120000) {
          callback(new Error('超时范围为 1000-120000 毫秒'))
        } else {
          callback()
        }
      },
      trigger: 'change',
    },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [connectionResult, catalogResult] = await Promise.all([
      listAiConnections(1, 100),
      listProviderCatalogs(),
    ])
    connections.value = connectionResult.items
    providerCatalogs.value = catalogResult
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
  await loadScenarios()
}

function draftOf(scenario: AiScenario): ScenarioDraft {
  if (!scenarioDraft[scenario]) {
    scenarioDraft[scenario] = {
      primaryConnectionId: selectableConnections.value[0]?.id ?? null,
      backupConnectionId: null,
      failoverEnabled: false,
    }
  }
  // 再次经响应式代理读回：直接持有裸对象会让 v-model 失去追踪
  return scenarioDraft[scenario]
}

async function loadScenarios(): Promise<void> {
  scenarioLoading.value = true
  scenarioError.value = ''
  try {
    const rows = await listScenarioRoutes()
    // 先铺草稿再挂表格，避免模板读到尚未初始化的行
    rows.forEach((row) => {
      scenarioDraft[row.scenario] = {
        primaryConnectionId: row.primaryConnectionId ?? selectableConnections.value[0]?.id ?? null,
        backupConnectionId: row.backupConnectionId,
        failoverEnabled: row.failoverEnabled,
      }
    })
    scenarioRoutes.value = rows
  } catch (reason) {
    scenarioError.value = problemMessage(reason)
  } finally {
    scenarioLoading.value = false
  }
}

async function loadAudits(): Promise<void> {
  auditLoading.value = true
  auditError.value = ''
  try {
    const result = await listCallAudits(1, 10)
    audits.value = result.items
  } catch (reason) {
    audits.value = []
    auditError.value = problemMessage(reason)
  } finally {
    auditLoading.value = false
  }
}

async function saveScenario(scenario: AiScenario): Promise<void> {
  const draft = scenarioDraft[scenario]
  if (!draft?.primaryConnectionId) {
    ElMessage.warning('请先为该场景选择主用账户')
    return
  }
  savingScenario.value = scenario
  try {
    const updated = await saveScenarioRoute(scenario, {
      primaryConnectionId: draft.primaryConnectionId,
      backupConnectionId: draft.backupConnectionId ?? null,
      failoverEnabled: draft.failoverEnabled && Boolean(draft.backupConnectionId),
    })
    scenarioRoutes.value = scenarioRoutes.value.map((row) =>
      (row.scenario === scenario ? updated : row))
    scenarioDraft[scenario] = {
      primaryConnectionId: updated.primaryConnectionId,
      backupConnectionId: updated.backupConnectionId,
      failoverEnabled: updated.failoverEnabled,
    }
    ElMessage.success(`${updated.scenarioLabel}的账户绑定已保存`)
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  } finally {
    savingScenario.value = ''
  }
}

async function resetScenario(scenario: AiScenario): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '恢复默认后，该场景将回退为“最近更新且已启用的第一个账户”，不再使用备用切换。',
      '恢复默认账户',
      { type: 'warning', confirmButtonText: '恢复默认', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await removeScenarioRoute(scenario)
    await loadScenarios()
    ElMessage.success('已恢复为默认账户选择')
  } catch (reason) {
    ElMessage.error(problemMessage(reason))
  }
}

function openCreate(): void {
  resetForm()
  drawerOpen.value = true
}

function openEdit(connection: AiConnection): void {
  metadataRequest.invalidate()
  testRequest.invalidate()
  editingId.value = connection.id
  savedConnection.value = { ...connection }
  form.name = connection.name
  form.providerType = connection.providerType
  form.baseUrl = connection.baseUrl
  form.endpointPath = connection.endpointPath
  form.protocol = connection.protocol
  form.modelName = connection.modelName
  form.apiKey = ''
  form.timeoutMs = connection.timeoutMs || 30_000
  form.enabled = connection.enabled
  form.webSearchDialect = connection.webSearchDialect || 'NONE'
  form.inputPricePerMillion = connection.inputPricePerMillion ?? null
  form.outputPricePerMillion = connection.outputPricePerMillion ?? null
  testResult.value = undefined
  saveConflict.value = ''
  modelProfiles.value = []
  testHistory.value = []
  drawerOpen.value = true
  void loadMetadata()
}

function resetForm(): void {
  metadataRequest.invalidate()
  testRequest.invalidate()
  editingId.value = null
  savedConnection.value = null
  form.name = ''
  form.providerType = 'CUSTOM_OPENAI_COMPATIBLE'
  form.baseUrl = ''
  form.endpointPath = '/chat/completions'
  form.protocol = 'CHAT_COMPLETIONS'
  form.modelName = ''
  form.apiKey = ''
  form.timeoutMs = 30_000
  form.enabled = true
  form.webSearchDialect = 'NONE'
  testStreaming.value = true
  testPrompt.value = 'Reply with OK only.'
  testResult.value = undefined
  saveConflict.value = ''
  modelProfiles.value = []
  testHistory.value = []
  metadataLoading.value = false
  testing.value = false
  formRef.value?.clearValidate()
}

async function loadMetadata(): Promise<void> {
  const connectionId = editingId.value
  if (!connectionId) return
  const requestId = metadataRequest.begin()
  metadataLoading.value = true
  try {
    const [profileResult, historyResult] = await Promise.all([
      listConnectionModelProfiles(connectionId),
      listConnectionTests(connectionId, 1, 5),
    ])
    if (metadataRequest.isCurrent(requestId) && editingId.value === connectionId) {
      modelProfiles.value = profileResult
      testHistory.value = historyResult.items
    }
  } catch (metadataError) {
    if (metadataRequest.isCurrent(requestId) && editingId.value === connectionId) {
      ElMessage.error(problemMessage(metadataError))
    }
  } finally {
    if (metadataRequest.isCurrent(requestId) && editingId.value === connectionId) {
      metadataLoading.value = false
    }
  }
}

function buildPayload(): AiConnectionPayload {
  const payload: AiConnectionPayload = {
    name: form.name,
    providerType: form.providerType,
    baseUrl: form.baseUrl,
    endpointPath: form.endpointPath,
    protocol: form.protocol,
    modelName: form.modelName,
    timeoutMs: form.timeoutMs,
    enabled: form.enabled,
    webSearchDialect: form.webSearchDialect,
    inputPricePerMillion: form.inputPricePerMillion,
    outputPricePerMillion: form.outputPricePerMillion,
  }
  if (form.apiKey) payload.apiKey = form.apiKey
  return payload
}

async function save(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  saving.value = true
  try {
    if (editingId.value && savedConnection.value) {
      await updateAiConnection(editingId.value, {
        ...buildPayload(),
        expectedVersion: savedConnection.value.version,
      })
    } else {
      await createAiConnection({ ...buildPayload(), apiKey: form.apiKey })
    }
    ElMessage.success('AI 连接已保存')
    form.apiKey = ''
    drawerOpen.value = false
    await load()
  } catch (saveError) {
    const problem = getProblem(saveError)
    if (problem.status === 409 && editingId.value) {
      saveConflict.value = '连接已被其他页面更新，请关闭后重新打开并确认最新配置'
      await load()
    } else {
      ElMessage.error(problem.detail || problem.title)
    }
  } finally {
    saving.value = false
  }
}

async function testCurrent(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  const draftTest = shouldTestDraft.value
  if (draftTest && !form.apiKey) {
    ElMessage.warning('当前配置有未保存修改，请输入 API Key 后测试草稿')
    return
  }

  const connectionId = editingId.value
  const requestId = testRequest.begin()
  testing.value = true
  try {
    const result = draftTest
      ? await testDraftAiConnection({
        name: form.name,
        providerType: form.providerType,
        baseUrl: form.baseUrl,
        endpointPath: form.endpointPath,
        protocol: form.protocol,
        modelName: form.modelName,
        apiKey: form.apiKey,
        timeoutMs: form.timeoutMs,
        streaming: testStreaming.value,
        testPrompt: testPrompt.value,
      })
      : connectionId
        ? await testSavedAiConnection(connectionId, {
        streaming: testStreaming.value,
        testPrompt: testPrompt.value,
      })
        : undefined

    if (
      result &&
      testRequest.isCurrent(requestId) &&
      editingId.value === connectionId
    ) {
      testResult.value = result
    }

    if (!draftTest && connectionId && testRequest.isCurrent(requestId)) {
      await load()
      await loadMetadata()
    }
  } catch (testError) {
    if (testRequest.isCurrent(requestId) && editingId.value === connectionId) {
      ElMessage.error(problemMessage(testError))
    }
  } finally {
    if (testRequest.isCurrent(requestId) && editingId.value === connectionId) {
      testing.value = false
    }
  }
}

async function testSaved(connection: AiConnection): Promise<void> {
  try {
    const result = await testSavedAiConnection(connection.id, { streaming: true })
    ElMessage[result.status === 'SUCCESS' ? 'success' : 'error'](
      result.status === 'SUCCESS'
        ? `连接成功，延迟 ${result.latencyMs ?? '—'} ms`
        : result.errorSummary || '连接测试失败',
    )
    await load()
    if (editingId.value === connection.id) {
      await loadMetadata()
    }
  } catch (testError) {
    ElMessage.error(problemMessage(testError))
  }
}

async function toggle(connection: AiConnection): Promise<void> {
  togglingId.value = connection.id
  try {
    await setAiConnectionEnabled(connection.id, !connection.enabled, connection.version)
    ElMessage.success(connection.enabled ? '连接已停用' : '连接已启用')
    await load()
  } catch (toggleError) {
    const problem = getProblem(toggleError)
    if (problem.status === 409) {
      await load()
      ElMessage.warning('连接状态已变化，已刷新列表')
    } else {
      ElMessage.error(problem.detail || problem.title)
    }
  } finally {
    togglingId.value = null
  }
}

async function remove(connection: AiConnection): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '删除会清除凭据并停用连接，历史模型调用只保留非敏感审计信息。',
      '确认删除连接',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
    await deleteAiConnection(connection.id)
    ElMessage.success('连接已删除')
    await load()
  } catch (removeError) {
    if (removeError === 'cancel') return
    ElMessage.error(problemMessage(removeError))
  }
}

onMounted(() => {
  load()
  loadAudits()
})

watch(protocolOptions, (options) => {
  if (!options.includes(form.protocol)) {
    form.protocol = options[0] || 'CHAT_COMPLETIONS'
  }
})

watch(form, () => {
  testRequest.invalidate()
  testResult.value = undefined
  testing.value = false
})

watch([testStreaming, testPrompt], () => {
  testRequest.invalidate()
  testResult.value = undefined
  testing.value = false
})
</script>

<style scoped>
.connection-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.connection-mark {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  color: var(--ow-info);
  background: var(--ow-info-soft);
  border-radius: 6px;
}

.connection-mark svg {
  width: 16px;
  height: 16px;
}

.connection-cell > span:last-child {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.connection-cell strong,
.connection-cell small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-cell strong {
  color: var(--ow-ink-secondary);
}

.connection-cell small {
  color: var(--ow-muted);
  font-size: 12px;
}

.mono {
  font-family: "Cascadia Code", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 0 14px;
}

.form-grid :deep(.el-select),
.form-grid :deep(.el-input-number) {
  width: 100%;
}

.save-conflict {
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 6px;
}

.section-head h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.section-note {
  max-width: 900px;
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ow-text-muted);
}

.cell-note {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ow-text-muted);
}

.width-full {
  width: 100%;
}

.audit-ok {
  color: var(--ow-success, #18794e);
}

.audit-fail {
  color: var(--ow-danger, #b42318);
}

@media (max-width: 700px) {
  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
}

.dialect-hint {
  display: block;
  margin-top: 4px;
  line-height: 1.6;
}

.test-block {
  display: grid;
  gap: 12px;
  padding: 14px;
  margin-top: 6px;
  background: var(--ow-surface-raised);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius);
}

.test-heading,
.test-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.test-heading > div {
  display: grid;
  gap: 3px;
}

.test-heading span {
  color: var(--ow-muted);
  font-size: 12px;
}

.test-result {
  font-size: 12px;
}

.test-result.success {
  color: var(--ow-primary-strong);
}

.test-result.danger {
  color: var(--ow-danger);
}

.test-block p {
  margin: 0;
  font-size: 12px;
}

.connection-metadata {
  display: grid;
  gap: 12px;
  padding-top: 18px;
  margin-top: 18px;
  border-top: 1px solid var(--ow-line-soft);
}

.metadata-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.metadata-heading > div {
  display: grid;
  gap: 3px;
}

.metadata-heading span,
.metadata-empty {
  color: var(--ow-muted);
  font-size: 12px;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin: 0;
}

.profile-grid div {
  min-width: 0;
}

.profile-grid dt {
  margin-bottom: 4px;
  color: var(--ow-muted);
  font-size: 12px;
}

.profile-grid dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.test-history {
  display: grid;
}

.test-history-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  border-top: 1px solid var(--ow-line-soft);
  font-size: 12px;
}

.test-history-row time {
  color: var(--ow-muted);
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .test-heading,
  .test-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-grid,
  .test-history-row {
    grid-template-columns: 1fr;
  }
}
</style>
