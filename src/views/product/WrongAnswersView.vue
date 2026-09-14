<template>
  <div class="page wrong-page">
    <PageHeader
      title="错题本 · 专项复练"
      description="条目只从已经发生过的观测里来：面试报告的薄弱清单、没答上来的面试轮次，或你自己手工记的一条。重练结果由你自评，系统不替你判定掌握，也不生成参考答案。"
    >
      <template #actions>
        <el-button :icon="RefreshCw" :loading="loading || summaryLoading" @click="reload">刷新</el-button>
        <el-button :icon="Download" @click="openImport">导入错题</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">手工记一条</el-button>
      </template>
    </PageHeader>

    <el-alert
      v-if="focusNotice"
      :title="focusNotice"
      type="info"
      show-icon
      closable
      @close="focusNotice = ''"
    />

    <section class="ow-card">
      <div class="filters">
        <div class="filter-group">
          <span class="filter-label">掌握状态</span>
          <div class="ow-seg">
            <button
              v-for="option in MASTERY_OPTIONS"
              :key="`mastery-${option.value ?? 'all'}`"
              type="button"
              :class="{ on: mastery === option.value }"
              @click="applyFilter({ mastery: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">队列</span>
          <div class="ow-seg">
            <button
              v-for="option in ARCHIVED_OPTIONS"
              :key="`archived-${option.value}`"
              type="button"
              :class="{ on: archived === option.value }"
              @click="applyFilter({ archived: option.value })"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <label class="filter-group">
          <span class="filter-label">来源</span>
          <el-select :model-value="sourceType" clearable placeholder="全部来源" @change="onSourceChange">
            <el-option v-for="(label, value) in SOURCE_LABELS" :key="value" :label="label" :value="value" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">归类</span>
          <el-select :model-value="topic" clearable filterable placeholder="全部归类" @change="onTopicChange">
            <el-option
              v-for="entry in summary?.topics ?? []"
              :key="entry.topic"
              :label="`${entry.topic}（${entry.itemCount}）`"
              :value="entry.topic"
            />
          </el-select>
        </label>
        <div class="filter-spacer" />
        <el-button text :icon="FilterX" :disabled="!filtersActive" @click="resetFilters">清空筛选</el-button>
      </div>
    </section>

    <div class="wrong-grid">
      <div class="col8">
        <div v-if="loading" class="ow-card"><div class="ow-card-b"><el-skeleton :rows="8" animated /></div></div>
        <ErrorState v-else-if="listError" :message="listError" :retry="loadList" />
        <section v-else-if="items.length === 0" class="ow-card">
          <EmptyState
            :icon="Target"
            :title="emptyTitle"
            :description="emptyDescription"
          >
            <el-button v-if="filtersActive" @click="resetFilters">清空筛选</el-button>
            <template v-else>
              <el-button type="primary" :icon="Download" @click="openImport">导入错题</el-button>
              <el-button :icon="Plus" @click="openCreate">手工记一条</el-button>
            </template>
          </EmptyState>
        </section>

        <div v-else class="wrong-list">
          <article
            v-for="item in items"
            :id="`practice-item-${item.itemId}`"
            :key="item.itemId"
            class="wrong-card"
            :class="{ focused: item.itemId === focusId }"
          >
            <div class="wrong-tags">
              <span class="ow-tag" :class="MASTERY_TAG_CLASS[item.masteryStatus]">
                {{ MASTERY_LABELS[item.masteryStatus] }}
              </span>
              <span class="ow-tag blue">{{ item.topic }}</span>
              <span class="ow-tag gray">{{ SOURCE_LABELS[item.sourceType] }}</span>
              <span v-if="item.archived" class="ow-tag red">已归档</span>
            </div>

            <p class="q">{{ item.question }}</p>

            <div class="meta">
              <span>{{ sourceHint(item) }}</span>
              <span>尝试 {{ item.attemptCount }} 次</span>
              <span v-if="item.lastResult">
                最近一次 {{ RESULT_LABELS[item.lastResult] }}
                <template v-if="item.lastSelfScore !== null && item.lastSelfScore !== undefined">· 自评 {{ item.lastSelfScore }}</template>
              </span>
              <span v-if="item.consecutivePassed > 0">末段连续答通 {{ item.consecutivePassed }} 次</span>
              <span v-if="item.nextReviewDate">{{ reviewDateText(item) }}</span>
              <span>加入于 {{ formatDateTime(item.createdAt) }}</span>
            </div>

            <div class="ow-row wrong-actions">
              <el-button size="small" type="primary" :icon="Dumbbell" @click="toggleExpand(item)">
                {{ expandedId === item.itemId ? '收起重练' : '重练这一条' }}
              </el-button>
              <el-button
                v-if="item.sourceSessionId"
                size="small"
                text
                :icon="ExternalLink"
                @click="openSource(item)"
              >
                {{ item.sourceType === 'REPORT' ? '看这份报告' : '看这场面试' }}
              </el-button>
            </div>

            <div v-if="expandedId === item.itemId" class="detail">
              <div v-if="detailLoading"><el-skeleton :rows="4" animated /></div>
              <ErrorState v-else-if="detailError" :message="detailError" :retry="() => loadDetail(item.itemId)" />
              <template v-else-if="detail">
                <div class="block">
                  <div class="block-h">原始问答</div>
                  <template v-if="detail.item.traceableToQuestion">
                    <p class="trace-line"><b>问题</b>{{ detail.item.originalQuestion }}</p>
                    <p class="trace-line">
                      <b>当时的回答</b>{{ detail.item.originalAnswer || '（这一轮没有作答记录）' }}
                    </p>
                    <p v-if="detail.item.originalAnswerSource" class="muted">
                      回答来源：{{ answerSourceLabel(detail.item.originalAnswerSource) }}
                      <template v-if="detail.item.originalTurnType"> · {{ turnTypeLabel(detail.item.originalTurnType) }}</template>
                    </p>
                  </template>
                  <p v-else class="missing">
                    {{ detail.item.traceLimitation || '这条错题没有可追溯的原始问答。' }}
                  </p>
                </div>

                <div class="block">
                  <div class="block-h">治这类错的套路<span class="muted">（按错题文本命中的能力维度匹配，纯静态派生）</span></div>
                  <div v-if="craftLoading"><el-skeleton :rows="2" animated /></div>
                  <p v-else-if="craftError" class="error-line">{{ craftError }}</p>
                  <template v-else-if="craftSuggestion">
                    <ul v-if="craftSuggestion.items.length" class="craft-list">
                      <li v-for="candidate in craftSuggestion.items" :key="candidate.craftId" class="craft-item">
                        <div class="craft-line">
                          <span class="craft-dim">{{ candidate.matchedDimension }}</span>
                          <span class="craft-cat">{{ craftCategoryLabel(candidate.category) }}</span>
                          <span class="craft-title">{{ candidate.title }}</span>
                          <span v-if="candidate.mastered" class="craft-mastered">✓ 已练熟</span>
                        </div>
                        <p v-if="candidate.whenToUse" class="craft-when">用在哪：{{ candidate.whenToUse }}</p>
                      </li>
                    </ul>
                    <p v-else class="missing">{{ craftSuggestion.note }}</p>
                    <p v-if="craftSuggestion.items.length && craftSuggestion.note" class="muted">
                      {{ craftSuggestion.note }}
                    </p>
                  </template>
                </div>

                <div class="block">
                  <div class="block-h">重练记录<span class="muted">（只新增、不覆盖，按时间升序）</span></div>
                  <p v-if="detail.attempts.length === 0" class="missing">
                    这条还没有重练过。掌握需要末段连续 {{ summary?.masteredStreak ?? '?' }} 次「答通」且每次自评 ≥ {{ summary?.masteredSelfScore ?? '?' }}。
                  </p>
                  <ol v-else class="attempts">
                    <li v-for="attempt in detail.attempts" :key="attempt.id">
                      <div class="attempt-head">
                        <span class="ow-tag" :class="resultTagClass(attempt.result)">{{ RESULT_LABELS[attempt.result] }}</span>
                        <span v-if="attempt.selfScore !== null && attempt.selfScore !== undefined" class="ow-tag gray">
                          自评 {{ attempt.selfScore }}
                        </span>
                        <span v-if="basisIds.has(attempt.id)" class="ow-tag green">计入掌握依据</span>
                        <span class="muted">{{ formatDateTime(attempt.attemptedAt) }}</span>
                      </div>
                      <p class="attempt-answer">{{ attempt.answer }}</p>
                      <p v-if="attempt.feedback" class="muted">备注：{{ attempt.feedback }}</p>
                    </li>
                  </ol>
                </div>

                <div class="block">
                  <div class="block-h">这次重练</div>
                  <el-input
                    v-model="attemptForm.answer"
                    type="textarea"
                    :rows="3"
                    maxlength="8000"
                    show-word-limit
                    placeholder="自己把答案写下来。这里不做选择题，也没有系统给的参考答案。"
                  />
                  <div class="ow-row attempt-form-row">
                    <el-radio-group v-model="attemptForm.result">
                      <el-radio-button v-for="(label, value) in RESULT_LABELS" :key="value" :value="value">
                        {{ label }}
                      </el-radio-button>
                    </el-radio-group>
                    <el-input-number
                      v-model="attemptForm.selfScore"
                      :min="0"
                      :max="100"
                      :step="5"
                      placeholder="自评"
                      controls-position="right"
                    />
                    <el-input v-model="attemptForm.feedback" maxlength="512" placeholder="备注（可选）" class="feedback" />
                    <el-button
                      type="primary"
                      :icon="Send"
                      :loading="attemptSubmitting"
                      :disabled="!attemptReady || Boolean(attemptHint)"
                      @click="submitAttempt"
                    >
                      提交这次重练
                    </el-button>
                  </div>
                  <p v-if="attemptHint" class="missing">{{ attemptHint }}</p>
                  <p class="muted">
                    自评与结果都由你判定；界面按 {{ masteryRuleBrief }} 复算掌握，没有「直接标记已掌握」的入口。
                  </p>
                  <p v-if="reviewRuleText" class="muted">{{ reviewRuleText }}</p>
                  <p v-if="reviewSchedulingNote" class="ok-line">{{ reviewSchedulingNote }}</p>
                  <p v-if="attemptError" class="error-line">{{ attemptError }}</p>
                </div>

                <div class="block">
                  <div class="block-h">归类与复习计划</div>
                  <p v-if="detail.item.nextReviewDate" class="muted">
                    当前复习日：{{ reviewDateText(detail.item) }}
                  </p>
                  <div class="ow-row classify-row">
                    <el-input v-model="classifyForm.topic" maxlength="128" placeholder="归类名称" class="topic-input" />
                    <el-date-picker
                      v-model="classifyForm.nextReviewDate"
                      type="date"
                      value-format="YYYY-MM-DD"
                      placeholder="计划复习日（可选）"
                    />
                    <el-button :loading="classifySubmitting" @click="saveClassification">保存归类</el-button>
                  </div>
                  <p class="muted">
                    这里手改的复习日只保留到下一次提交重练：提交后系统会按上面的阶梯重算一个覆盖它。
                    保存后会记录为「手工设定」；重练后会改为「规则排期」。迁移前已有日期可能显示为「历史数据未记录来源」。
                    当前仍不支持钉住复习日。
                  </p>
                  <el-input
                    v-model="classifyForm.referenceAnswer"
                    type="textarea"
                    :rows="3"
                    maxlength="4000"
                    show-word-limit
                    placeholder="参考答案：只保存你自己写或粘贴的内容，系统不会自动生成。"
                  />
                  <p v-if="classifyError" class="error-line">{{ classifyError }}</p>
                </div>

                <div class="ow-row end">
                  <el-button size="small" text @click="toggleArchive(detail.item)">
                    {{ detail.item.archived ? '取消归档（放回队列）' : '归档（移出队列，保留全部重练记录）' }}
                  </el-button>
                </div>
                <p v-if="actionError" class="error-line">{{ actionError }}</p>
              </template>
            </div>
          </article>
        </div>

        <div v-if="!loading && !listError && items.length" class="pager">
          <el-button size="small" :disabled="page <= 1" @click="goPage(page - 1)">上一页</el-button>
          <span class="muted">第 {{ page }} 页 / 共 {{ pageCount }} 页 · 共 {{ total }} 条</span>
          <el-button size="small" :disabled="page >= pageCount" @click="goPage(page + 1)">下一页</el-button>
        </div>
      </div>

      <div class="col4 side">
        <section class="ow-card">
          <div class="ow-card-h"><CircleCheckBig aria-hidden="true" /> 掌握进度</div>
          <div class="ow-card-b">
            <div v-if="summaryLoading"><el-skeleton :rows="3" animated /></div>
            <ErrorState v-else-if="summaryError" :message="summaryError" :retry="loadSummary" />
            <p v-else-if="summary && !summary.renderable" class="missing">
              当前队列里一条错题都没有，掌握进度不画。零条数据算出来的 0% 或 100% 都不说明任何问题。
            </p>
            <template v-else-if="summary">
              <div class="mastery-total">
                <span>已掌握 {{ summary.masteredCount }} / {{ summary.total }} 条</span>
                <b>{{ masteryPercent }}%</b>
              </div>
              <div class="ow-prog"><i :style="{ width: `${masteryPercent}%` }" /></div>
              <div class="state-row">
                <span>未练过 {{ summary.newCount }}</span>
                <span>巩固中 {{ summary.learningCount }}</span>
                <span>已掌握 {{ summary.masteredCount }}</span>
              </div>
              <p class="muted rule">{{ masteryRuleText }}</p>
              <div v-for="entry in summary.topics" :key="entry.topic" class="dim">
                <div class="name">{{ entry.topic }}</div>
                <div class="track"><i :style="{ width: `${percentOf(entry)}%` }" /></div>
                <div class="score">{{ entry.itemCount - entry.notMasteredCount }}/{{ entry.itemCount }}</div>
              </div>
              <p class="muted">最近一次重练：{{ formatDateTime(summary.lastAttemptAt) }}</p>
            </template>
          </div>
        </section>
      </div>
    </div>

    <el-dialog v-model="importOpen" title="导入错题" width="min(600px, calc(100vw - 32px))" destroy-on-close>
      <p class="muted">
        导入只是把已经发生过的观测复制成练习条目，不改动报告与面试会话；同一条内容重复导入会被跳过。
      </p>
      <div class="import-group">
        <div class="block-h">从报告的薄弱清单导入</div>
        <el-select v-model="importReportId" filterable placeholder="选择一场已生成报告的面试" class="pick">
          <el-option
            v-for="report in readyReports"
            :key="report.reportId"
            :label="`${report.sessionTitle} · 总分 ${report.totalScore ?? '—'} · ${report.scoringRuleVersion ?? '未记录规则版本'}`"
            :value="report.sessionId"
          />
        </el-select>
        <div>
          <el-button :loading="importing === 'report'" :disabled="!importReportId" @click="runImport('report')">
            导入这份报告的四类清单
          </el-button>
        </div>
        <p v-if="readyReports.length === 0" class="missing">
          还没有已完成的报告。报告中心里状态为「已完成」的会话才能导入薄弱清单。
        </p>
      </div>
      <div class="import-group">
        <div class="block-h">从面试轮次导入</div>
        <el-select v-model="importSessionId" filterable placeholder="选择一场面试" class="pick">
          <el-option
            v-for="session in sessions"
            :key="session.id"
            :label="`${session.title} · ${statusLabel(session.status)}`"
            :value="session.id"
          />
        </el-select>
        <div>
          <el-button :loading="importing === 'session'" :disabled="!importSessionId" @click="runImport('session')">
            导入没独立答上来的轮次
          </el-button>
        </div>
        <p class="muted">
          只导入回答空白、提示后作答、AI 辅助作答与 AI 生成作答四类轮次；独立作答和外部导入的历史记录不进错题本。
        </p>
      </div>
      <p v-if="importError" class="error-line">{{ importError }}</p>
      <p v-if="importResult" class="ok-line">
        「{{ importResult.sessionTitle }}」新增 {{ importResult.created }} 条、跳过 {{ importResult.skipped }} 条<template v-if="importResult.topics.length">，归类：{{ importResult.topics.join('、') }}</template>。
        <template v-if="importResult.note">{{ importResult.note }}</template>
      </p>
      <template #footer>
        <el-button @click="importOpen = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createOpen" title="手工记一条" width="min(600px, calc(100vw - 32px))" destroy-on-close>
      <p class="muted">手工条目同样只能靠提交重练结果推进掌握状态。</p>
      <el-input v-model="createForm.topic" maxlength="128" placeholder="归类名称，例如「缓存一致性」" class="mb" />
      <el-input
        v-model="createForm.question"
        type="textarea"
        :rows="3"
        maxlength="4000"
        show-word-limit
        placeholder="把你卡住的问题写下来"
        class="mb"
      />
      <el-input
        v-model="createForm.referenceAnswer"
        type="textarea"
        :rows="2"
        maxlength="4000"
        show-word-limit
        placeholder="参考答案（可选，只保存你自己写的内容）"
      />
      <p v-if="createError" class="error-line">{{ createError }}</p>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="runCreate">加入错题本</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { CircleCheckBig, Download, Dumbbell, ExternalLink, FilterX, Plus, RefreshCw, Send, Target } from 'lucide-vue-next'
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  MASTERY_LABELS,
  MASTERY_TAG_CLASS,
  REVIEW_DATE_SOURCE_LABELS,
  RESULT_LABELS,
  SOURCE_LABELS,
  addPracticeAttempt,
  archivePracticeItem,
  createPracticeItem,
  getPracticeDetail,
  getPracticeSummary,
  getWrongAnswerCraftSuggestion,
  importFromReport,
  importFromSession,
  listPracticeItems,
  unarchivePracticeItem,
  updatePracticeClassification,
  type WrongAnswerCraftSuggestion,
} from '@/api/practice'
import { CRAFT_CATEGORY_LABELS } from '@/api/crafts'
import { listReports } from '@/api/reports'
import { problemMessage } from '@/api/http'
import { answerSourceLabel, listSessions } from '@/api/interview'
import { topicModeLabel } from '@/api/interviewers'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { formatDateTime } from '@/utils/format'

import type { InterviewSession } from '@/api/interview'
import type {
  PracticeDetailResponse,
  PracticeImportResponse,
  PracticeItem,
  PracticeMastery,
  PracticeResult,
  PracticeSource,
  PracticeSummary,
  ReportListItem,
} from '@/types/api'

const route = useRoute()
const router = useRouter()

const SIZE = 10

const MASTERY_OPTIONS: { value: PracticeMastery | null; label: string }[] = [
  { value: null, label: '全部' },
  { value: 'NEW', label: MASTERY_LABELS.NEW },
  { value: 'LEARNING', label: MASTERY_LABELS.LEARNING },
  { value: 'MASTERED', label: MASTERY_LABELS.MASTERED },
]
// 归档等于移出队列，所以默认视图只看未归档；显式 all 才把两类一起列出。
const ARCHIVED_OPTIONS = [
  { value: 'false', label: '队列中' },
  { value: 'true', label: '已归档' },
  { value: 'all', label: '全部' },
] as const

const items = ref<PracticeItem[]>([])
const total = ref(0)
const page = ref(1)
const mastery = ref<PracticeMastery | null>(null)
const sourceType = ref<PracticeSource | null>(null)
const topic = ref<string | null>(null)
const archived = ref<'true' | 'false' | 'all'>('false')
const loading = ref(true)
const listError = ref('')

const summary = ref<PracticeSummary | null>(null)
const summaryLoading = ref(true)
const summaryError = ref('')

const expandedId = ref<number | null>(null)
const focusId = ref<number | null>(null)
const focusNotice = ref('')
const detail = ref<PracticeDetailResponse | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const actionError = ref('')

// V57：错题 → 治这类错的套路。展开详情时才请求；失败只在本区块显示错误，不影响重练。
const craftSuggestion = ref<WrongAnswerCraftSuggestion | null>(null)
const craftLoading = ref(false)
const craftError = ref('')

function craftCategoryLabel(category: string): string {
  const labels = CRAFT_CATEGORY_LABELS as Record<string, string>
  return labels[category] ?? category
}

async function loadCraftSuggestion(itemId: number): Promise<void> {
  craftLoading.value = true
  craftError.value = ''
  craftSuggestion.value = null
  try {
    craftSuggestion.value = await getWrongAnswerCraftSuggestion(itemId)
  } catch (error) {
    craftError.value = problemMessage(error)
  } finally {
    craftLoading.value = false
  }
}

const attemptForm = reactive({
  answer: '',
  result: 'PARTIAL' as PracticeResult,
  selfScore: null as number | null,
  feedback: '',
})
const attemptSubmitting = ref(false)
const attemptError = ref('')

const classifyForm = reactive({ topic: '', referenceAnswer: '', nextReviewDate: null as string | null })
const classifySubmitting = ref(false)
const classifyError = ref('')

const importOpen = ref(false)
const importReportId = ref<number | null>(null)
const importSessionId = ref<number | null>(null)
const readyReports = ref<ReportListItem[]>([])
const sessions = ref<InterviewSession[]>([])
const importing = ref<'report' | 'session' | ''>('')
const importError = ref('')
const importResult = ref<PracticeImportResponse | null>(null)

const createOpen = ref(false)
const createForm = reactive({ topic: '', question: '', referenceAnswer: '' })
const creating = ref(false)
const createError = ref('')

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / SIZE)))
const filtersActive = computed(() => Boolean(mastery.value || sourceType.value || topic.value)
  || archived.value !== 'false')
// 空态文案必须跟着「队列」视图走：在已归档里提示「切到已归档」是错的。
const emptyTitle = computed(() => {
  if (archived.value === 'true') return '还没有归档过条目'
  if (filtersActive.value) return '当前筛选条件下没有条目'
  return '错题本还是空的'
})
const emptyDescription = computed(() => {
  if (archived.value === 'true') return '归档过的条目会出现在这里；归档只是移出练习队列，不会删除任何重练记录。'
  if (archived.value === 'all') return '换一个掌握状态、来源或归类看看；库里还没有任何练习条目时，可以从报告或面试轮次导入。'
  if (filtersActive.value) return '换一个掌握状态、来源或归类看看；被移出队列的条目在「已归档」里。'
  return '先完成一场模拟面试并让它生成报告，然后把报告的薄弱清单或没答上来的轮次导入到这里。你也可以手工记一条正在卡住的题。'
})
const masteryPercent = computed(() => {
  const data = summary.value
  if (!data || data.total === 0) return 0
  return Math.round((data.masteredCount / data.total) * 100)
})
// 阈值取接口下发的值，不写死在文案里。
const masteryRuleText = computed(() => {
  const data = summary.value
  if (!data) return ''
  return `掌握判定：末段连续 ${data.masteredStreak} 次「答通」且这些自评都 ≥ ${data.masteredSelfScore}；中途答砸一次退回「巩固中」，回退是允许的。`
})
const masteryRuleBrief = computed(() => {
  const data = summary.value
  if (!data) return '后端下发的阈值'
  return `连续 ${data.masteredStreak} 次答通且自评 ≥ ${data.masteredSelfScore}`
})

// 阶梯天数同样取接口下发的值：界面写死 1/3/7/14 的话，后端改档位就会留下一句过时的宣传语。
const reviewRuleText = computed(() => {
  const ladder = summary.value?.reviewLadderDays ?? []
  if (ladder.length === 0) return ''
  return `复习日阶梯：连续答通依次排到 ${ladder.join(' / ')} 天后（继续答通也保持 ${ladder[ladder.length - 1]} 天），`
    + `没答通回到 ${ladder[0]} 天。`
})
const reviewSchedulingNote = ref('')

/** 只展示与后端规则一致的掌握依据；掌握判定仍以服务端重算结果为准。 */
const basisIds = computed(() => {
  const attempts = detail.value?.attempts ?? []
  const ids = new Set<number>()
  const rule = summary.value
  if (!rule) return ids
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index]
    if (!attempt || attempt.result !== 'PASSED') break
    if (attempt.selfScore === null
      || attempt.selfScore === undefined
      || attempt.selfScore < rule.masteredSelfScore) return new Set<number>()
    ids.add(attempt.id)
  }
  return ids
})

const attemptReady = computed(() => attemptForm.answer.trim().length > 0)
const attemptHint = computed(() => {
  if (!attemptForm.answer.trim()) return '先把这次的答案写下来再提交。'
  if (attemptForm.result === 'PASSED' && attemptForm.selfScore === null) {
    return `选「答通」必须给自评分（0-100）：自评 ≥ ${summary.value?.masteredSelfScore ?? 80} 才可能进入已掌握。`
  }
  return ''
})

function resultTagClass(result: PracticeResult): string {
  if (result === 'PASSED') return 'green'
  return result === 'PARTIAL' ? 'orange' : 'red'
}

function percentOf(entry: PracticeSummary['topics'][number]): number {
  if (entry.itemCount === 0) return 0
  return Math.round(((entry.itemCount - entry.notMasteredCount) / entry.itemCount) * 100)
}

function turnTypeLabel(value: string): string {
  const map: Record<string, string> = { MAIN: '主问题', FOLLOW_UP: '追问' }
  return map[value] ?? value
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    READY: '待开始',
    RUNNING: '进行中',
    PAUSED: '已暂停',
    USER_ENDED: '已结束',
    COMPLETING: '收尾中',
    COMPLETED: '已完成',
    FAILED: '失败',
    CANCELLED: '已取消',
  }
  return map[status] ?? status
}

function sourceHint(item: PracticeItem): string {
  const parts = [SOURCE_LABELS[item.sourceType]]
  if (item.sourceSessionTitle) parts.push(item.sourceSessionTitle)
  if (item.sourceTopicMode) parts.push(topicModeLabel(item.sourceTopicMode))
  return parts.join(' · ')
}

function reviewDateText(item: PracticeItem): string {
  if (!item.nextReviewDate) return ''
  const source = item.reviewDateSource
    ? REVIEW_DATE_SOURCE_LABELS[item.reviewDateSource]
    : '历史数据未记录来源'
  return `计划复习 ${item.nextReviewDate} · ${source}`
}

function openSource(item: PracticeItem): void {
  if (!item.sourceSessionId) return
  void router.push(item.sourceType === 'REPORT'
    ? `/interviews/${item.sourceSessionId}/report`
    : `/interviews/${item.sourceSessionId}`)
}

async function loadList(): Promise<void> {
  loading.value = true
  listError.value = ''
  try {
    const data = await listPracticeItems({
      mastery: mastery.value,
      sourceType: sourceType.value,
      topic: topic.value,
      archived: archived.value,
      page: page.value,
      size: SIZE,
    })
    items.value = data.items
    total.value = data.total
    page.value = data.page
    // 换页或换筛选后展开中的条目可能已不在列表里，重练面板随之收起。
    if (expandedId.value !== null && !data.items.some((entry) => entry.itemId === expandedId.value)) {
      closeDetail()
    }
  } catch (error) {
    listError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function loadSummary(): Promise<void> {
  summaryLoading.value = true
  summaryError.value = ''
  try {
    summary.value = await getPracticeSummary(archived.value)
  } catch (error) {
    summaryError.value = problemMessage(error)
  } finally {
    summaryLoading.value = false
  }
}

function applyFilter(next: {
  mastery?: string | null
  sourceType?: string | null
  topic?: string | null
  archived?: string
}): void {
  if ('mastery' in next) mastery.value = (next.mastery as PracticeMastery | null) ?? null
  if ('sourceType' in next) sourceType.value = (next.sourceType as PracticeSource | null) ?? null
  if ('topic' in next) topic.value = next.topic ?? null
  if ('archived' in next) archived.value = (next.archived as 'true' | 'false' | 'all') ?? 'false'
  page.value = 1
  void loadList()
  void loadSummary()
}

function onSourceChange(value: unknown): void {
  applyFilter({ sourceType: (value as PracticeSource | undefined) ?? null })
}

function onTopicChange(value: unknown): void {
  applyFilter({ topic: typeof value === 'string' && value ? value : null })
}

function resetFilters(): void {
  applyFilter({ mastery: null, sourceType: null, topic: null, archived: 'false' })
}

function goPage(target: number): void {
  page.value = Math.min(Math.max(1, target), pageCount.value)
  void loadList()
}

function resetForms(data: PracticeDetailResponse): void {
  attemptForm.answer = ''
  attemptForm.result = 'PARTIAL'
  attemptForm.selfScore = null
  attemptForm.feedback = ''
  attemptError.value = ''
  classifyForm.topic = data.item.topic
  classifyForm.referenceAnswer = data.item.referenceAnswer ?? ''
  classifyForm.nextReviewDate = data.item.nextReviewDate ?? null
  classifyError.value = ''
  actionError.value = ''
  reviewSchedulingNote.value = ''
}

async function loadDetail(itemId: number): Promise<void> {
  detailLoading.value = true
  detailError.value = ''
  void loadCraftSuggestion(itemId) // V57：套路建议与详情并行走，失败只影响本区块
  try {
    const data = await getPracticeDetail(itemId)
    detail.value = data
    resetForms(data)
  } catch (error) {
    detailError.value = problemMessage(error)
  } finally {
    detailLoading.value = false
  }
}

function closeDetail(): void {
  expandedId.value = null
  detail.value = null
  detailError.value = ''
  actionError.value = ''
  craftSuggestion.value = null
  craftError.value = ''
}

function toggleExpand(item: PracticeItem): void {
  if (expandedId.value === item.itemId) {
    closeDetail()
    return
  }
  expandedId.value = item.itemId
  void loadDetail(item.itemId)
}

async function submitAttempt(): Promise<void> {
  const itemId = detail.value?.item.itemId
  if (!itemId || !attemptReady.value) return
  attemptSubmitting.value = true
  attemptError.value = ''
  try {
    const data = await addPracticeAttempt(itemId, {
      answer: attemptForm.answer.trim(),
      result: attemptForm.result,
      selfScore: attemptForm.selfScore,
      feedback: attemptForm.feedback.trim() || null,
    })
    detail.value = data
    resetForms(data)
    reviewSchedulingNote.value = data.item.nextReviewDate
      ? `这次重练已按规则把复习日排到 ${data.item.nextReviewDate}。`
      : ''
    await Promise.all([loadList(), loadSummary()])
  } catch (error) {
    attemptError.value = problemMessage(error)
  } finally {
    attemptSubmitting.value = false
  }
}

async function saveClassification(): Promise<void> {
  const current = detail.value
  if (!current || !classifyForm.topic.trim()) {
    classifyError.value = '归类名称不能为空。'
    return
  }
  classifySubmitting.value = true
  classifyError.value = ''
  try {
    const updated = await updatePracticeClassification(current.item.itemId, {
      topic: classifyForm.topic.trim(),
      referenceAnswer: classifyForm.referenceAnswer.trim() || null,
      nextReviewDate: classifyForm.nextReviewDate || null,
      expectedUpdatedAt: current.item.updatedAt,
    })
    detail.value = { ...current, item: updated }
    await Promise.all([loadList(), loadSummary()])
  } catch (error) {
    classifyError.value = `${problemMessage(error)} 归类未保存——这条可能在你打开后被改过，收起再展开可拿到最新版本。`
  } finally {
    classifySubmitting.value = false
  }
}

async function toggleArchive(item: PracticeItem): Promise<void> {
  actionError.value = ''
  try {
    const updated = item.archived
      ? await unarchivePracticeItem(item.itemId)
      : await archivePracticeItem(item.itemId)
    // 归档改变队列归属：列表与进度都要跟着变，展开中的详情用新状态替换。
    if (detail.value?.item.itemId === updated.itemId) detail.value = { ...detail.value, item: updated }
    await Promise.all([loadList(), loadSummary()])
  } catch (error) {
    actionError.value = problemMessage(error)
  }
}

async function openImport(): Promise<void> {
  importOpen.value = true
  importError.value = ''
  importResult.value = null
  try {
    const [reportPage, sessionList] = await Promise.all([listReports({ size: 50 }), listSessions()])
    readyReports.value = reportPage.items.filter((entry) => entry.reportStatus === 'REPORT_READY')
    sessions.value = sessionList
  } catch (error) {
    importError.value = problemMessage(error)
  }
}

async function runImport(mode: 'report' | 'session'): Promise<void> {
  const target = mode === 'report' ? importReportId.value : importSessionId.value
  if (!target) return
  importing.value = mode
  importError.value = ''
  importResult.value = null
  try {
    importResult.value = mode === 'report'
      ? await importFromReport(target)
      : await importFromSession(target)
    await Promise.all([loadList(), loadSummary()])
  } catch (error) {
    importError.value = problemMessage(error)
  } finally {
    importing.value = ''
  }
}

function openCreate(): void {
  createOpen.value = true
  createError.value = ''
}

async function runCreate(): Promise<void> {
  if (!createForm.topic.trim() || !createForm.question.trim()) {
    createError.value = '归类名称和问题都要填。'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const created = await createPracticeItem({
      topic: createForm.topic.trim(),
      question: createForm.question.trim(),
      referenceAnswer: createForm.referenceAnswer.trim() || null,
    })
    createOpen.value = false
    createForm.topic = ''
    createForm.question = ''
    createForm.referenceAnswer = ''
    await Promise.all([loadList(), loadSummary()])
    expandedId.value = created.itemId
    void loadDetail(created.itemId)
  } catch (error) {
    createError.value = problemMessage(error)
  } finally {
    creating.value = false
  }
}

async function reload(): Promise<void> {
  await Promise.all([loadList(), loadSummary()])
}

async function applyFocus(): Promise<void> {
  const raw = Number(route.query.focus)
  if (!Number.isInteger(raw) || raw <= 0) return

  let target = items.value.find((item) => item.itemId === raw)
  if (!target) {
    const broad = await listPracticeItems({ archived: archived.value, size: 50 })
    const index = broad.items.findIndex((item) => item.itemId === raw)
    if (index >= 0) {
      page.value = Math.floor(index / SIZE) + 1
      await loadList()
      target = items.value.find((item) => item.itemId === raw)
    }
  }

  if (!target) {
    focusNotice.value = '未找到这条错题，可能已归档或已不在当前练习队列。'
    return
  }

  focusId.value = raw
  focusNotice.value = `已定位到错题「${target.topic}」`
  expandedId.value = raw
  await loadDetail(raw)
  await nextTick()
  document.getElementById(`practice-item-${raw}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

async function initialize(): Promise<void> {
  await reload()
  await applyFocus()
}

void initialize()
</script>

<style scoped>
.wrong-page {
  display: grid;
  gap: 18px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 14px 18px;
  padding: 16px 18px;
}

.filter-group {
  display: grid;
  gap: 6px;
  min-width: 150px;
}

.filter-label {
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 800;
}

.filter-spacer {
  flex: 1 1 auto;
}

.wrong-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: start;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

.side {
  position: sticky;
  top: 18px;
}

.wrong-list {
  display: grid;
  gap: 14px;
}

.wrong-card {
  padding: 16px 18px;
  background: var(--glass-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
}

.wrong-card.focused {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-200), var(--shadow-md);
}

.wrong-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.q {
  margin: 0;
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.6;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.wrong-actions {
  margin-top: 12px;
  align-items: center;
}

.detail {
  display: grid;
  gap: 14px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}

.block-h {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 800;
}

.trace-line {
  margin: 0 0 6px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.65;
}

.trace-line b {
  margin-right: 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 800;
}

.attempts {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
}

.attempt-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.attempt-answer {
  margin: 6px 0 0;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.65;
  white-space: pre-wrap;
}

.attempt-form-row {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.feedback {
  flex: 1 1 200px;
}

.classify-row {
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.topic-input {
  max-width: 220px;
}

.muted {
  color: var(--muted);
  font-size: var(--fs-xs);
}

.rule {
  margin: 10px 0 4px;
  line-height: 1.6;
}

.missing {
  margin: 0;
  padding: 10px 12px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: var(--fs-sm);
  line-height: 1.65;
}

/* V57：错题 → 套路候选列表。中性底色 + 文字色，品牌色留给可操作元素（视觉系统 v2） */
.craft-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.craft-item {
  display: grid;
  gap: 5px;
  padding: 11px 13px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.craft-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.craft-dim {
  padding: 2px 8px;
  color: var(--ink-2);
  background: var(--glass-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: var(--fs-xs);
  font-weight: 700;
}

.craft-cat {
  padding: 2px 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.craft-title {
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.craft-mastered {
  padding: 1px 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.craft-when {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.error-line {
  margin: 8px 0 0;
  color: var(--red-600);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.ok-line {
  margin: 12px 0 0;
  color: var(--green-700);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.mastery-total {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.mastery-total b {
  color: var(--ink);
}

.state-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.dim .name {
  flex: 0 0 96px;
  color: var(--ink-2);
  font-size: var(--fs-xs);
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
  background: linear-gradient(90deg, var(--green), #4cc585);
}

.dim .score {
  flex: 0 0 42px;
  color: var(--ink);
  font-size: var(--fs-xs);
  font-weight: 800;
  text-align: right;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 14px;
}

.import-group {
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.pick {
  width: 100%;
}

.mb {
  margin-bottom: 10px;
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }

  .side {
    position: static;
  }
}
</style>
