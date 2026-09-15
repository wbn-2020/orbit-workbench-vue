<template>
  <div class="page report-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1>{{ session?.title ?? '面试报告' }}</h1>
        <div class="sub">
          {{ topicLabel }} ｜ {{ session?.interviewerName ?? 'AI 面试官' }} ｜ 模型 {{ session?.aiModel ?? '自动' }}
          <template v-if="report?.generatedAt"> ｜ 生成于 {{ shortTime(report.generatedAt) }}</template>
        </div>
      </div>
      <div class="acts">
        <button class="ow-btn ghost" type="button" @click="router.push('/interviews')">返回记录</button>
        <button
          v-if="report?.status === 'REPORT_READY'"
          class="ow-btn"
          type="button"
          :disabled="creatingTasks"
          @click="createTasks"
        >
          {{ creatingTasks ? '生成中…' : '按报告生成复习任务' }}
        </button>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />

    <div v-else-if="loading" class="ow-empty">加载中…</div>

    <!-- 无报告：会话未结束 -->
    <div v-else-if="!report" class="ow-empty-state">
      <div class="ic"><ClipboardList aria-hidden="true" /></div>
      <div class="t">还没有报告</div>
      <div class="d">结束面试后会自动创建待生成报告；回到面试房间结束本场即可。</div>
      <div class="act">
        <el-button type="primary" @click="router.push(`/interviews/${sessionId}`)">回到面试房间</el-button>
      </div>
    </div>

    <!-- 待生成 / 失败 -->
    <div v-else-if="report.status !== 'REPORT_READY'" class="pending-panel">
      <div class="ow-empty-state">
        <div class="ic">
          <TriangleAlert v-if="report.status === 'REPORT_FAILED'" aria-hidden="true" />
          <Hourglass v-else aria-hidden="true" />
        </div>
        <div class="t">
          {{ report.status === 'REPORT_FAILED' ? '报告生成失败' : '报告待生成' }}
        </div>
        <div class="d">
          <template v-if="report.status === 'REPORT_FAILED'">
            <template v-if="report.failureSummary">
              {{ report.failureSummary }} · 已重试 {{ report.retryCount }} 次<br />
              {{ report.failureNextStep }}
            </template>
            <template v-else>{{ report.failureReason ?? '生成失败' }} · 已重试 {{ report.retryCount }} 次</template>
          </template>
          <template v-else>面试问答已保存，点击下方由 AI 生成 11 维评分报告（约十几秒）。</template>
        </div>
        <pre v-if="streamingPreview" class="stream-preview">{{ streamingPreview }}</pre>
        <div class="act">
          <el-button
            type="primary"
            :loading="generating"
            @click="report.status === 'REPORT_FAILED' ? retry() : generate()"
          >
            {{ generating ? 'AI 生成中…' : report.status === 'REPORT_FAILED' ? '重试生成' : 'AI 生成报告' }}
          </el-button>
          <el-button @click="router.push(`/interviews/${sessionId}`)">查看面试问答</el-button>
        </div>
      </div>
    </div>

    <!-- 就绪报告 -->
    <template v-else>
      <div class="report-grid">
        <div class="ow-card col4">
          <div class="ow-card-h">
            <div class="ic b3"><Star aria-hidden="true" /></div>
            总体评分
          </div>
          <div class="ow-card-b overall">
            <div class="score-line">
              <div class="score">{{ report.totalScore ?? '--' }}</div>
              <div class="score-sub">总分 / 100</div>
            </div>
            <div style="text-align: center; margin-top: 8px;">
              <span class="grade" :class="gradeClass">{{ recommendationLabel }}</span>
            </div>
            <div class="ow-note" style="margin-top: 12px;">
              评分由 AI 基于全部问答生成，重试 {{ report.retryCount }} 次。
            </div>
          </div>
        </div>

        <div class="ow-card col8">
          <div class="ow-card-h">
            <div class="ic b1"><BarChart3 aria-hidden="true" /></div>
            分项评分（11 维）
          </div>
          <div class="ow-card-b">
            <div v-for="(value, name) in dims" :key="name" class="dim">
              <div class="name">{{ name }}</div>
              <div class="track">
                <i :style="{ width: `${value}%`, background: dimColor(value) }" />
              </div>
              <div class="score">{{ value }}</div>
            </div>
          </div>
        </div>

        <div class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b2"><Layers aria-hidden="true" /></div>
            能力雷达
          </div>
          <div class="ow-card-b radar-wrap">
            <svg class="radar" viewBox="0 0 320 300" role="img" aria-label="能力雷达图">
              <polygon
                v-for="ring in radarRings"
                :key="ring"
                :points="polygonPoints(ring)"
                fill="none"
                stroke="var(--line-2)"
                stroke-width="1"
              />
              <line
                v-for="(name, index) in dimNames"
                :key="`axis-${name}`"
                :x1="radarCenter"
                :y1="radarCenter"
                :x2="axisPoint(index, 1).x"
                :y2="axisPoint(index, 1).y"
                stroke="var(--line-2)"
                stroke-width="1"
              />
              <polygon :points="dataPoints" fill="rgba(39,179,137,.22)" stroke="var(--brand)" stroke-width="2" />
              <text
                v-for="(name, index) in dimNames"
                :key="`label-${name}`"
                :x="labelPoint(index).x"
                :y="labelPoint(index).y"
                text-anchor="middle"
                class="radar-label"
              >
                {{ shortLabel(name) }}
              </text>
            </svg>
          </div>
        </div>

        <div class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b6"><Lock aria-hidden="true" /></div>
            做得好的地方
          </div>
          <div class="ow-card-b">
            <ul class="plain-list good">
              <li v-for="item in strengths" :key="item">{{ item }}</li>
              <li v-if="!strengths.length" class="muted-item">（无）</li>
            </ul>
          </div>
        </div>

        <div class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b5"><AlertTriangle aria-hidden="true" /></div>
            追问暴露的问题
          </div>
          <div class="ow-card-b">
            <ul class="plain-list issues">
              <li v-for="item in followUpFindings" :key="item">{{ item }}</li>
              <li v-if="!followUpFindings.length" class="muted-item">（无）</li>
            </ul>
          </div>
        </div>

        <div class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b3"><Activity aria-hidden="true" /></div>
            薄弱点（项目 / 技术）
            <div class="right">
              <el-button
                size="small"
                :icon="Target"
                :loading="creatingGoals"
                :disabled="!goalGaps.length"
                @click="createGoalsFromGaps"
              >
                生成学习目标{{ goalGaps.length ? `（${goalGaps.length}）` : '' }}
              </el-button>
            </div>
          </div>
          <div class="ow-card-b">
            <div class="weak-group">
              <b class="weak-title project">项目掌握薄弱点</b>
              <div>
                <span v-for="item in projectMastery" :key="item" class="ow-tag red">{{ item }}</span>
                <span v-if="!projectMastery.length" class="ow-tag gray">无</span>
              </div>
            </div>
            <div class="weak-group">
              <b class="weak-title tech">技术知识薄弱点</b>
              <div>
                <span v-for="item in knowledgeGaps" :key="item" class="ow-tag orange">{{ item }}</span>
                <span v-if="!knowledgeGaps.length" class="ow-tag gray">无</span>
              </div>
            </div>
            <div class="weak-group">
              <b class="weak-title tech">总体薄弱点</b>
              <div>
                <span v-for="item in weaknesses" :key="item" class="ow-tag yel">{{ item }}</span>
                <span v-if="!weaknesses.length" class="ow-tag gray">无</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ow-card col6">
          <div class="ow-card-h">
            <div class="ic b1"><BookOpen aria-hidden="true" /></div>
            复习建议
          </div>
          <div class="ow-card-b">
            <div>
              <span v-for="item in studySuggestions" :key="item" class="ow-chip plan-chip">{{ item }}</span>
              <span v-if="!studySuggestions.length" class="ow-tag gray">无</span>
            </div>
            <div class="ow-hint">
              点击右上角「按报告生成复习任务」，把以上建议落成可执行的复习计划（重复点击不会重复创建）。
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Hourglass,
  TriangleAlert,
  BookOpen,
  Layers,
  Lock,
  Star,
  Target,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  generateTasksFromReport,
  getReport,
  getSession,
  parseDims,
  parseJsonArray,
  streamGenerateReport,
  retryReport,
  TOPIC_MODES,
  type InterviewReport,
  type InterviewSession,
} from '@/api/interview'
import { createLearningGoal, listLearningGoals } from '@/api/learning'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import { gapKey, gapFromReason } from '@/utils/reportGoal'

const route = useRoute()
const router = useRouter()
const sessionId = Number(route.params.id)

const session = ref<InterviewSession | null>(null)
const report = ref<InterviewReport | null>(null)
const exists = ref(false)
const loading = ref(true)
const loadError = ref('')
const generating = ref(false)
const creatingTasks = ref(false)
const creatingGoals = ref(false)
const createdGoalKeys = ref<string[]>([])

const radarRings = [0.25, 0.5, 0.75, 1]
const radarCenter = 160
const radarRadius = 95

const dims = computed(() => parseDims(report.value?.dimensionScoresJson))
const dimNames = computed(() => Object.keys(dims.value))
const dimValues = computed(() => dimNames.value.map((name) => dims.value[name] ?? 0))
const strengths = computed(() => parseJsonArray(report.value?.strengthsJson))
const weaknesses = computed(() => parseJsonArray(report.value?.weaknessesJson))
const followUpFindings = computed(() => parseJsonArray(report.value?.followUpFindingsJson))
const projectMastery = computed(() => parseJsonArray(report.value?.projectMasteryJson))
const knowledgeGaps = computed(() => parseJsonArray(report.value?.knowledgeGapsJson))
const studySuggestions = computed(() => parseJsonArray(report.value?.studySuggestionsJson))

const topicLabel = computed(
  () => TOPIC_MODES.find((topic) => topic.value === session.value?.topicMode)?.label
    ?? session.value?.topicMode ?? '',
)

const recommendationLabel = computed(() => {
  const map: Record<string, string> = {
    STRONG_PASS: '强烈通过', PASS: '通过', HOLD: '待定', FAIL: '不通过',
  }
  return map[report.value?.hiringRecommendation ?? ''] ?? '待定'
})

const gradeClass = computed(() => {
  const map: Record<string, string> = {
    STRONG_PASS: 'g-strong', PASS: 'g-pass', HOLD: 'g-wait', FAIL: 'g-fail',
  }
  return map[report.value?.hiringRecommendation ?? ''] ?? 'g-wait'
})

function axisPoint(index: number, ratio: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / Math.max(1, dimNames.value.length) - Math.PI / 2
  return {
    x: radarCenter + Math.cos(angle) * radarRadius * ratio,
    y: radarCenter + Math.sin(angle) * radarRadius * ratio,
  }
}

function polygonPoints(ring: number): string {
  return dimNames.value
    .map((_, index) => {
      const point = axisPoint(index, ring)
      return `${point.x},${point.y}`
    })
    .join(' ')
}

const dataPoints = computed(() =>
  dimValues.value
    .map((value, index) => {
      const point = axisPoint(index, value / 100)
      return `${point.x},${point.y}`
    })
    .join(' '),
)

function labelPoint(index: number): { x: number; y: number } {
  const point = axisPoint(index, 1.22)
  return { x: point.x, y: point.y + 4 }
}

function shortLabel(name: string): string {
  return name.length > 5 ? name.slice(0, 5) : name
}

function dimColor(value: number): string {
  if (value >= 85) return 'linear-gradient(90deg, var(--green), #4cc585)'
  if (value >= 70) return 'linear-gradient(90deg, var(--brand), #6aa6ff)'
  return 'linear-gradient(90deg, #f6b43a, #e79412)'
}

function shortTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [state, detail] = await Promise.all([
      getReport(sessionId),
      getSession(sessionId).catch(() => null),
    ])
    exists.value = state.exists
    report.value = state.report
    session.value = detail?.session ?? null
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

const streamingPreview = ref('')

async function generate(): Promise<void> {
  generating.value = true
  streamingPreview.value = ''
  let streamFailed = false
  try {
    await streamGenerateReport(sessionId, undefined, {
      onDelta: (delta) => {
        // 等待期预览：只保留尾部 600 字，避免长报告撑爆 DOM
        streamingPreview.value = (streamingPreview.value + delta).slice(-600)
      },
      onDone: () => {
        // done 只说明模型写完；正式数据以刷新为准
      },
      onError: (message) => {
        streamFailed = true
        streamingPreview.value = ''
        ElMessage.error(message)
      },
    })
    if (streamFailed) {
      await load()
      return
    }
    const state = await getReport(sessionId)
    if (state.report?.status !== 'REPORT_READY') {
      throw new Error('报告尚未生成完成，请刷新后确认状态')
    }
    report.value = state.report
    exists.value = state.exists
    ElMessage.success('报告已生成')
  } catch (error) {
    ElMessage.error(problemMessage(error))
    await load()
  } finally {
    streamingPreview.value = ''
    generating.value = false
  }
}

async function retry(): Promise<void> {
  generating.value = true
  try {
    const state = await retryReport(sessionId)
    report.value = state.report
    ElMessage.success('报告已生成')
  } catch (error) {
    ElMessage.error(problemMessage(error))
    await load()
  } finally {
    generating.value = false
  }
}

/** 缺口项：技术知识缺口 + 总体薄弱点合并去重（项目薄弱点偏项目事实，不重复建目标）。 */
const goalGaps = computed(() => {
  const seen = new Set<string>()
  const items: string[] = []
  for (const gap of [...knowledgeGaps.value, ...weaknesses.value]) {
    const key = normalizeGap(gap)
    if (key && !seen.has(key)) {
      seen.add(key)
      items.push(gap.trim())
    }
  }
  return items.filter((item) => !createdGoalKeys.value.includes(item))
})

const goalSourceTag = `面试缺口 #${sessionId}`

function normalizeGap(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * 把 AI 缺口描述提炼成可读的目标短标题。
 * 缺口原文是评语句式（如「对 X 缺乏讨论（可能是后续追问半径未覆盖…）」），
 * 直接做目标名又长又技术腔；此处剥尾部解释性括注与模板后缀，保留核心主体。
 * 纯启发式、不调 AI；完整原文始终保留在 reason 中。
 */
function shortenGapTitle(raw: string): string {
  let text = normalizeGap(raw)
  for (;;) {
    // 循环剥离结尾括注；剥掉模板后缀后可能再露出括注，故循环往复直到稳定。
    const before = text
    for (;;) {
      const tail = text.match(/[（(][^（）()]*[)）]$/)
      if (!tail || tail.index === undefined) break
      text = text.slice(0, tail.index).trim()
    }
    text = text
      .replace(/(缺乏(?:深入)?讨论|讨论不足|了解不足|掌握不足|理解不足|不够深入|有待加强|表现不足)$/g, '')
      .trim()
    if (text === before) break
  }
  text = text.replace(/^对/, '').replace(/^[「『]+/, '').replace(/[」』]+$/, '').trim()
  if (text.length > 22) {
    const window = text.slice(0, 22)
    const separators = [' ', '、', '，', ',', '：', ':', '；', ';']
    let cut = -1
    for (const sep of separators) cut = Math.max(cut, window.lastIndexOf(sep))
    text = (cut > 8 ? window.slice(0, cut) : window).trim() + '…'
  }
  return text || normalizeGap(raw)
}

/** 报告缺口 → 学习目标：短标题可读、完整描述进 reason；同来源下按标题双形态去重。 */
async function createGoalsFromGaps(): Promise<void> {
  if (creatingGoals.value || !goalGaps.value.length) return
  creatingGoals.value = true
  try {
    const existing = await listLearningGoals()
    const existingKeys = new Set(
      existing
        .filter((goal) => (goal.linkedSkill ?? '').endsWith(goalSourceTag))
        .map((goal) => gapFromReason(goal.reason) ?? gapKey(goal.title)),
    )
    let created = 0
    for (const gap of goalGaps.value) {
      const shortTitle = shortenGapTitle(gap)
      if (existingKeys.has(gapKey(gap))) continue
      await createLearningGoal({
        // linked_skill 列仅 128 字符：放短标题 + 来源标签，长原文一律留在 reason（1024）。
        title: shortTitle,
        reason: `来自面试报告的薄弱点（会话 #${sessionId}）。完整描述：${gap}`,
        linkedSkill: `${shortTitle} · ${goalSourceTag}`.slice(0, 128),
      })
      existingKeys.add(gapKey(gap))
      created += 1
    }
    createdGoalKeys.value.push(...goalGaps.value)
    ElMessage.success(created > 0 ? `已创建 ${created} 条学习目标，可前往学习更新查看` : '这些缺口已有对应的学习目标')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    creatingGoals.value = false
  }
}

async function createTasks(): Promise<void> {
  creatingTasks.value = true
  try {
    const { created } = await generateTasksFromReport(sessionId)
    ElMessage.success(created > 0 ? `已生成 ${created} 条复习任务，可前往复习计划查看` : '报告建议已全部在复习计划中')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    creatingTasks.value = false
  }
}

load()
</script>

<style scoped>
.report-page {
  display: grid;
  gap: 18px;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: start;
}

.col4 { grid-column: span 4; }
.col6 { grid-column: span 6; }
.col8 { grid-column: span 8; }

.pending-panel {
  max-width: 640px;
}

.overall .score-line {
  padding: 8px 0 4px;
  text-align: center;
}

.overall .score {
  color: var(--ink);
  font-size: var(--fs-2xl);
  font-weight: 900;
  line-height: 1;
}

.overall .score-sub {
  margin-top: 4px;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.grade {
  display: inline-block;
  padding: 5px 16px;
  border-radius: 12px;
  font-size: var(--fs-sm);
  font-weight: 800;
}

.g-pass {
  background: linear-gradient(180deg, #e9f8ef, #d8f3e2);
  color: #0f7a40;
}

.g-wait {
  background: linear-gradient(180deg, #fdf3df, #fbebc6);
  color: #9a6a00;
}

.g-fail {
  background: linear-gradient(180deg, #fdecec, #fbdada);
  color: #b93b3b;
}

.g-strong {
  background: linear-gradient(180deg, #dcf3e5, #bce6cd);
  color: #0f7a40;
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.dim .name {
  width: 120px;
  flex: 0 0 120px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.dim .track {
  flex: 1;
  height: 9px;
  background: var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}

.dim .track i {
  display: block;
  height: 100%;
  border-radius: 6px;
}

.dim .score {
  width: 34px;
  flex: 0 0 34px;
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 800;
  text-align: right;
}

.radar-wrap {
  display: grid;
  justify-items: center;
}

.radar {
  width: min(100%, 340px);
}

.radar-label {
  fill: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.plain-list {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.9;
}

.plain-list.good li::marker {
  color: var(--green-600);
}

.plain-list.issues li::marker {
  color: var(--orange-600);
}

.muted-item {
  list-style: none;
  margin-left: -18px;
  color: var(--muted);
}

.weak-group {
  margin-bottom: 10px;
}

.weak-title {
  display: block;
  margin-bottom: 6px;
  font-size: var(--fs-xs);
}

.weak-title.project {
  color: var(--red-600);
}

.weak-title.tech {
  color: var(--orange);
}

.weak-group .ow-tag {
  margin: 2px 4px 2px 0;
}

.plan-chip {
  margin: 2px 6px 2px 0;
  background: var(--green-50);
  color: var(--green-600);
  border-color: #b6e6cb;
}

@media (max-width: 1100px) {
  .col4,
  .col6,
  .col8 {
    grid-column: span 12;
  }
}

.stream-preview {
  margin: 14px auto 0;
  max-width: 640px;
  max-height: 180px;
  overflow: hidden;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ow-muted, #52685e);
  font-size: var(--fs-xs);
  line-height: 1.6;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 12%));
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--ow-surface-raised, var(--ow-surface, #fff));
}
</style>
