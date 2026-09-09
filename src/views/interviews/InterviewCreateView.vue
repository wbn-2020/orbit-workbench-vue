<template>
  <div class="page create-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">面试 / 新建</div>
        <h1><Swords aria-hidden="true" /> 新建面试副本</h1>
        <div class="sub">创建后立即开始，题目与追问由 AI 实时生成（连接真实后端）</div>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="loadConnections" />

    <section v-else class="ow-card quick-start">
      <div class="quick-start-body">
        <h2>快速开始</h2>
        <p>不填任何配置：通用资深面试官、5 道主问题、45 分钟专项训练。想调整细节再展开下方高级配置。</p>
      </div>
      <button class="ow-btn" type="button" :disabled="creating" @click="quickStart">
        {{ creating ? '创建中…' : '一键开始面试 ▶' }}
      </button>
    </section>

    <div v-if="!loadError" class="create-grid" :class="{ collapsed: !advancedOpen }">
      <div class="ow-card col8">
        <div class="ow-card-h">
          <div class="ic b1"><UsersRound aria-hidden="true" /></div>
          面试配置
        </div>
        <div class="ow-card-b">
          <div class="ow-formgrid">
            <div class="ow-field">
              <label>标题 / 公司关卡</label>
              <input v-model="form.title" class="ow-input" placeholder="如：腾讯·微信 技术一面">
            </div>
            <div class="ow-field">
              <label>面试官（创建时写入快照）</label>
              <select v-model="form.interviewerId" class="ow-input" @change="onInterviewerChange">
                <option :value="null">不指定（通用资深面试官）</option>
                <option v-for="profile in interviewers" :key="profile.id" :value="profile.id">
                  {{ profile.name }}{{ profile.builtIn ? '（内置）' : '' }}
                </option>
              </select>
            </div>
            <div class="ow-field">
              <label>面试题材 topicMode</label>
              <select v-model="form.topicMode" class="ow-input">
                <option v-for="topic in TOPIC_MODES" :key="topic.value" :value="topic.value">
                  {{ topic.label }}
                </option>
              </select>
            </div>
            <div class="ow-field">
              <label>训练形式 form</label>
              <select v-model="form.form" class="ow-input">
                <option value="TRAINING">专项训练（可提示/重答）</option>
                <option value="FORMAL">正式模拟面试</option>
              </select>
            </div>
            <div class="ow-field">
              <label>面试轮次</label>
              <select v-model="form.round" class="ow-input">
                <option value="FIRST">一面</option>
                <option value="SECOND">二面</option>
                <option value="THIRD">三面</option>
                <option value="CUSTOM">指定轮次</option>
              </select>
            </div>
            <div class="ow-field">
              <label>目标岗位</label>
              <input v-model="form.targetRole" class="ow-input" placeholder="Java 后端工程师">
            </div>
            <div class="ow-field">
              <label>目标年限</label>
              <select v-model="form.targetExperienceBand" class="ow-input">
                <option value="GRADUATE">应届</option>
                <option value="ONE_TO_THREE_YEARS">1-3 年</option>
                <option value="THREE_TO_FIVE_YEARS">3-5 年</option>
                <option value="FIVE_PLUS_YEARS">5 年以上</option>
                <option value="CUSTOM">自定义</option>
              </select>
            </div>
            <div class="ow-field">
              <label>联网策略</label>
              <select v-model="form.webSearchPolicy" class="ow-input">
                <option
                  v-for="choice in webSearchChoices"
                  :key="choice.value"
                  :value="choice.value"
                  :disabled="choice.disabled"
                >
                  {{ choice.label }}
                </option>
              </select>
              <p v-if="webSearchNote" class="web-note">{{ webSearchNote }}</p>
            </div>
            <div class="ow-field">
              <label>主问题数（1-50）</label>
              <input v-model.number="form.questionLimit" class="ow-input" type="number" min="1" max="50">
            </div>
            <div class="ow-field">
              <label>追问上限（0-20）</label>
              <input v-model.number="form.followUpLimit" class="ow-input" type="number" min="0" max="20">
            </div>
            <div class="ow-field">
              <label>总问答上限（1-100）</label>
              <input v-model.number="form.turnLimit" class="ow-input" type="number" min="1" max="100">
            </div>
            <div class="ow-field">
              <label>时长上限（分钟 5-240）</label>
              <input v-model.number="form.durationLimitMinutes" class="ow-input" type="number" min="5" max="240">
            </div>
            <div class="ow-field">
              <label>面试时间（可选，用于日程与提醒）</label>
              <input v-model="form.scheduledAt" class="ow-input" type="datetime-local">
            </div>
            <div class="ow-field">
              <label>AI 账户（不选则用第一个启用账户）</label>
              <select v-model="form.aiConnectionId" class="ow-input">
                <option :value="null">自动（第一个启用账户）</option>
                <option v-for="conn in connections" :key="conn.id" :value="conn.id">
                  {{ conn.name }} · {{ conn.modelName }}
                </option>
              </select>
            </div>
          </div>

          <div class="bindings knowledge-bind">
            <div class="bindings-header">
              <label>注入工作心得（来自你的工作记录蒸馏，AI 可围绕这些真实经验追问；最多 10 条，不选则默认带最近 5 条）</label>
            </div>
            <p v-if="!knowledgeCards.length" class="ow-note">
              还没有知识卡片。可先到「工作记录」蒸馏几条，再回来让面试官追问你的真实经验。
            </p>
            <el-select
              v-else
              v-model="form.knowledgeCardIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              :multiple-limit="10"
              placeholder="默认带最近 5 条"
              class="ow-input knowledge-select"
              aria-label="注入工作心得"
            >
              <el-option
                v-for="card in knowledgeCards"
                :key="card.id"
                :value="Number(card.id)"
                :label="card.title"
              >
                <span class="kc-opt">{{ card.title }}</span>
                <span class="kc-opt-tags">{{ card.tags.slice(0, 3).join(' · ') }}</span>
              </el-option>
            </el-select>
          </div>

          <div class="bindings">
            <div class="bindings-header">
              <label>绑定项目资料（创建时快照项目版本与已确认画像事实，之后不受项目修改影响）</label>
              <button
                class="ow-btn binding-add"
                type="button"
                :disabled="bindings.length >= 5"
                @click="addBinding"
              >
                添加绑定
              </button>
            </div>
            <p v-if="bindings.length === 0" class="ow-note">
              未绑定项目资料；项目深挖类面试建议绑定一个项目版本。
            </p>
            <div v-for="(binding, index) in bindings" :key="index" class="binding-row">
              <select
                v-model="binding.projectId"
                class="ow-input"
                @change="onBindingProjectChange(binding)"
              >
                <option :value="null">选择项目</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>
              <select v-model="binding.versionId" class="ow-input" :disabled="!binding.projectId">
                <option :value="null">{{ binding.loading ? '版本加载中…' : '选择版本' }}</option>
                <option v-for="version in binding.versions" :key="version.id" :value="version.id">
                  V{{ version.versionNumber }} · {{ version.sourceFileName }}
                </option>
              </select>
              <button class="ow-btn binding-add" type="button" @click="bindings.splice(index, 1)">
                移除
              </button>
            </div>
          </div>

          <div class="ow-note">
            题目、追问与评分由 AI 实时生成；正式模拟模式不展示实时分数，结束后生成完整报告。
          </div>
        </div>
      </div>

      <div class="ow-card col4">
        <div class="ow-card-h">
          <div class="ic b3"><ClipboardCheck aria-hidden="true" /></div>
          配置摘要
        </div>
        <div class="ow-card-b">
          <div class="ow-kv">
            <div class="r"><span class="k">标题</span><span class="v">{{ form.title || '（未填写）' }}</span></div>
            <div class="r"><span class="k">面试官</span><span class="v">{{ interviewerLabel }}</span></div>
            <div class="r"><span class="k">题材 / 形式</span><span class="v">{{ topicLabel }} · {{ form.form === 'TRAINING' ? '专项训练' : '正式模拟' }}</span></div>
            <div class="r"><span class="k">轮次</span><span class="v">{{ roundLabel }}</span></div>
            <div class="r"><span class="k">岗位 / 年限</span><span class="v">{{ form.targetRole || '未填写' }} · {{ form.targetExperienceBand }}</span></div>
            <div class="r"><span class="k">题量</span><span class="v">主问题 {{ form.questionLimit }} · 追问 ≤{{ form.followUpLimit }} · 总问答 ≤{{ form.turnLimit }}</span></div>
            <div class="r"><span class="k">时长上限</span><span class="v">{{ form.durationLimitMinutes }} 分钟</span></div>
            <div class="r"><span class="k">联网</span><span class="v">{{ webLabel }}</span></div>
            <div class="r"><span class="k">工作心得</span><span class="v">{{ knowledgeSummary }}</span></div>
            <div class="r"><span class="k">项目绑定</span><span class="v">{{ bindingSummary }}</span></div>
          </div>
          <button class="ow-btn block" style="margin-top: 14px;" type="button" :disabled="creating" @click="launch">
            {{ creating ? '创建中…' : '出发 → 进入面试副本' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ClipboardCheck, Swords, UsersRound } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createSession,
  listKnowledgeCardOptions,
  startSession,
  TOPIC_MODES,
  type CreateSessionPayload,
  type KnowledgeCardOption,
} from '@/api/interview'
import { webSearchPolicyChoices } from '@/api/aiConnections'
import { listInterviewers, type InterviewerProfile } from '@/api/interviewers'
import { getProject, listProjects } from '@/api/projects'
import { http, problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import type { ProjectSummary, ProjectVersion } from '@/types/api'

interface ConnectionOption {
  id: number
  name: string
  modelName: string
  webSearchSupported?: boolean
  forcedSearchSupported?: boolean
}

/** 未指定账户时由场景路由挑连接，界面无从预知，只能提示而不是假装知道。 */
const ROUTED_HINT = '未指定账户时由场景路由挑选连接，联网能力以那次挑选的结果为准；做不到的一档会被服务端拒绝而不是静默不搜。'

interface AiConnectionSummary {
  id: number
  name: string
  modelName: string
  webSearchSupported?: boolean
  forcedSearchSupported?: boolean
}

interface BindingRow {
  projectId: number | null
  versionId: number | null
  versions: ProjectVersion[]
  loading: boolean
}

const route = useRoute()
const router = useRouter()

const form = reactive({
  title: '',
  interviewerId: null as number | null,
  topicMode: 'ROTE',
  form: 'TRAINING',
  round: 'FIRST',
  targetRole: 'Java 后端工程师',
  targetExperienceBand: 'THREE_TO_FIVE_YEARS',
  webSearchPolicy: 'DISABLED',
  questionLimit: 5,
  followUpLimit: 3,
  turnLimit: 12,
  durationLimitMinutes: 45,
  scheduledAt: '',
  aiConnectionId: null as number | null,
  knowledgeCardIds: [] as number[],
})

const connections = ref<ConnectionOption[]>([])
const interviewers = ref<InterviewerProfile[]>([])
const projects = ref<ProjectSummary[]>([])
const bindings = ref<BindingRow[]>([])
const knowledgeCards = ref<KnowledgeCardOption[]>([])
const loadError = ref('')
const creating = ref(false)
const advancedOpen = ref(false)

const topicLabel = computed(
  () => TOPIC_MODES.find((topic) => topic.value === form.topicMode)?.label ?? form.topicMode,
)
const roundLabel = computed(
  () => ({ FIRST: '一面', SECOND: '二面', THIRD: '三面', CUSTOM: '指定轮次' })[form.round] ?? form.round,
)
const selectedConnection = computed(
  () => connections.value.find((item) => item.id === form.aiConnectionId) ?? null,
)
const webSearchChoices = computed(() => webSearchPolicyChoices(selectedConnection.value))
/** 只说当前这一档的后果，三条原因一起摊开就成了噪声。 */
const webSearchNote = computed(() => {
  if (!selectedConnection.value) return ROUTED_HINT
  return webSearchChoices.value.find((choice) => choice.value === form.webSearchPolicy)?.note ?? ''
})
const webLabel = computed(
  () => webSearchChoices.value.find((choice) => choice.value === form.webSearchPolicy)?.label
    ?? form.webSearchPolicy,
)
const knowledgeSummary = computed(() => {
  const picked = form.knowledgeCardIds.length
  if (picked > 0) return `已选 ${picked} 条`
  return knowledgeCards.value.length > 0 ? '默认最近 5 条' : '无（暂无知识卡片）'
})

const bindingSummary = computed(() => {
  const selected = bindings.value.filter((binding) => binding.projectId && binding.versionId)
  if (selected.length === 0) return '未绑定'
  return selected
    .map((binding) => {
      const name = projects.value.find((project) => project.id === binding.projectId)?.name
      const version = binding.versions.find((item) => item.id === binding.versionId)
      return `${name ?? '项目'} · V${version?.versionNumber ?? '?'}`
    })
    .join('、')
})

async function loadKnowledgeCards(): Promise<void> {
  try {
    knowledgeCards.value = await listKnowledgeCardOptions()
  } catch {
    knowledgeCards.value = []
  }
}

async function loadProjects(): Promise<void> {
  try {
    projects.value = await listProjects()
  } catch {
    projects.value = []
  }
}

const interviewerLabel = computed(() => {
  if (!form.interviewerId) return '通用资深面试官'
  return interviewers.value.find((profile) => profile.id === form.interviewerId)?.name ?? '未知面试官'
})

function applyInterviewerDefaults(profile: InterviewerProfile): void {
  form.topicMode = profile.topicMode
  form.questionLimit = profile.defaultQuestionLimit
  form.followUpLimit = profile.defaultFollowUpLimit
}

function onInterviewerChange(): void {
  const profile = interviewers.value.find((item) => item.id === form.interviewerId)
  if (profile) applyInterviewerDefaults(profile)
}

async function loadInterviewers(): Promise<void> {
  try {
    interviewers.value = await listInterviewers()
  } catch {
    interviewers.value = []
    return
  }
  const requested = Number(route.query.interviewerId)
  const profile = interviewers.value.find((item) => item.id === requested)
  if (profile) {
    form.interviewerId = profile.id
    applyInterviewerDefaults(profile)
  }
}

function addBinding(): void {
  if (bindings.value.length >= 5) return
  bindings.value.push({ projectId: null, versionId: null, versions: [], loading: false })
}

async function onBindingProjectChange(binding: BindingRow): Promise<void> {
  binding.versionId = null
  binding.versions = []
  if (!binding.projectId) return
  binding.loading = true
  try {
    const detail = await getProject(binding.projectId)
    binding.versions = detail.versions
    binding.versionId = detail.versions[0]?.id ?? null
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    binding.loading = false
  }
}

async function loadConnections(): Promise<void> {
  loadError.value = ''
  try {
    const { data } = await http.get<{ items: AiConnectionSummary[] }>(
      '/ai-connections',
      { params: { enabled: true, page: 1, size: 20 } },
    )
    connections.value = data.items.map((item) => ({
      id: item.id,
      name: item.name,
      modelName: item.modelName,
      webSearchSupported: item.webSearchSupported,
      forcedSearchSupported: item.forcedSearchSupported,
    }))
  } catch (error) {
    loadError.value = problemMessage(error)
  }
}

/** 快速开始：完全用表单默认值创建（通用面试官 + 5 题训练），不要求填标题。 */
async function quickStart(): Promise<void> {
  if (creating.value) return
  creating.value = true
  try {
    const session = await createSession({
      title: `快速面试 ${new Date().toLocaleDateString('zh-CN')}`,
      topicMode: 'ROTE',
      form: 'TRAINING',
      round: 'FIRST',
      targetExperienceBand: 'THREE_TO_FIVE_YEARS',
      questionLimit: 5,
      followUpLimit: 3,
      turnLimit: 12,
      durationLimitMinutes: 45,
      scheduledAt: null,
      webSearchPolicy: 'DISABLED',
    })
    await startSession(session.id)
    ElMessage.success('面试已开始')
    void router.push(`/interviews/${session.id}`)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    creating.value = false
  }
}

async function launch(): Promise<void> {
  if (!form.title.trim()) {
    ElMessage.warning('请填写标题 / 公司关卡')
    return
  }
  const incomplete = bindings.value.some(
    (binding) => (binding.projectId && !binding.versionId) || (!binding.projectId && binding.versionId),
  )
  if (incomplete) {
    ElMessage.warning('请为每条绑定同时选择项目和版本，或移除空绑定')
    return
  }
  const projectBindings = bindings.value
    .filter((binding) => binding.projectId && binding.versionId)
    .map((binding) => ({ projectId: binding.projectId!, versionId: binding.versionId! }))
  creating.value = true
  try {
    const payload: CreateSessionPayload = {
      title: form.title.trim(),
      topicMode: form.topicMode,
      form: form.form,
      round: form.round,
      interviewerId: form.interviewerId ?? undefined,
      targetRole: form.targetRole.trim() || undefined,
      targetExperienceBand: form.targetExperienceBand,
      questionLimit: form.questionLimit,
      followUpLimit: form.followUpLimit,
      turnLimit: form.turnLimit,
      durationLimitMinutes: form.durationLimitMinutes,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      aiConnectionId: form.aiConnectionId ?? undefined,
      webSearchPolicy: form.webSearchPolicy,
      projectBindings: projectBindings.length ? projectBindings : undefined,
      knowledgeCardIds: [...form.knowledgeCardIds],
    }
    const session = await createSession(payload)
    await startSession(session.id)
    ElMessage.success('面试副本已创建并开始')
    void router.push(`/interviews/${session.id}`)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    creating.value = false
  }
}

loadConnections()
loadProjects()
loadKnowledgeCards()
loadInterviewers()

if (route.query.mode === '模拟面试') {
  form.topicMode = 'FULL_PROCESS'
  form.form = 'FORMAL'
}
</script>

<style scoped>
.create-page {
  display: grid;
  gap: 18px;
}

.create-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.create-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: start;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}

.web-note {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.bindings {
  margin-top: 16px;
  display: grid;
  gap: 8px;
}

.bindings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.bindings-header label {
  font-size: 13px;
}

.binding-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) auto;
  gap: 8px;
}

.binding-add {
  padding: 6px 12px;
  font-size: 12px;
}

@media (max-width: 720px) {
  .binding-row {
    grid-template-columns: 1fr;
  }
}

.quick-start {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px;
}

.quick-start-body h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: var(--ow-ink);
}

.quick-start-body p {
  margin: 6px 0 0;
  color: var(--ow-muted);
  font-size: 13px;
  line-height: 1.6;
}

.advanced-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  padding: inherit;
  text-align: left;
}

.advanced-head-left {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.advanced-hint {
  color: var(--ow-muted);
  font-size: 12px;
  font-weight: 500;
}

.advanced-chevron {
  width: 16px;
  height: 16px;
  transition: transform .15s ease;
}

.advanced-chevron.open {
  transform: rotate(180deg);
}

/* 折叠时隐藏表单与绑定区，仅保留摘要卡（摘要随默认值仍成立） */
.create-grid.collapsed .col8 .ow-formgrid,
.create-grid.collapsed .col8 .bindings,
.create-grid.collapsed .col8 .ow-note {
  display: none;
}

@media (max-width: 760px) {
  .quick-start {
    flex-direction: column;
    align-items: stretch;
  }
}

.knowledge-bind {
  margin-top: 14px;
}

.knowledge-select {
  width: 100%;
}

.kc-opt {
  display: inline-block;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.kc-opt-tags {
  float: right;
  margin-left: 12px;
  color: var(--ow-muted, #52685e);
  font-size: 12px;
}
</style>
