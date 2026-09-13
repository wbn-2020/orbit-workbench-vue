<template>
  <div class="page job-page">
    <PageHeader
      title="岗位与 JD 匹配"
      description="手工录入岗位与 JD 原文，逐条写出你在意的要求；服务端只在你这一版简历的文本里找每条要求写没写过。本期不打分、不给录用概率，也不连接招聘网站。"
    >
      <template #actions>
        <el-button type="primary" :icon="Plus" @click="openCreate">录入岗位</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="listError" :message="listError" :retry="loadPostings" />

    <section v-else class="surface">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">我录入的岗位</h2>
          <span class="surface-subtitle">
            {{ total }} 个岗位 · 关键词只过滤你自己的录入，站内不搜索外部岗位
          </span>
        </div>
        <div class="toolbar">
          <el-input
            v-model="keyword"
            :prefix-icon="Search"
            clearable
            placeholder="公司 / 岗位 / 城市"
            style="width: 200px"
          />
          <el-segmented v-model="archivedFilter" :options="ARCHIVED_OPTIONS" @change="reloadPage1" />
        </div>
      </div>
      <div class="surface-body">
        <div v-if="loadingList" class="page-feedback"><el-skeleton :rows="5" animated /></div>

        <EmptyState
          v-else-if="!postings.length && !keyword && archivedFilter === 'false'"
          title="还没有录入岗位"
          description="把 JD 原文粘进来，再逐条写出你在意的要求（技能 / 经验 / 项目 / 其他），就能和自己的简历逐条对照。"
          :icon="BriefcaseBusiness"
        >
          <el-button type="primary" :icon="Plus" @click="openCreate">录入岗位</el-button>
        </EmptyState>
        <EmptyState
          v-else-if="!postings.length"
          title="这里没有可显示的岗位"
          description="换个关键词，或在上方切换「在办 / 全部 / 已归档」。归档的岗位不会出现在默认列表里。"
          :icon="Search"
        />

        <div v-else class="posting-list">
          <article
            v-for="job in postings"
            :key="job.id"
            class="posting-row"
            :class="{ picked: job.id === detail?.id }"
          >
            <div class="posting-copy">
              <div class="posting-title">
                <strong>{{ job.company }} · {{ job.title }}</strong>
                <span v-if="job.archived" class="ow-tag gray">已归档</span>
                <span
                  v-if="job.lastMatchConfirmationStatus"
                  class="ow-status"
                  :class="confirmationClass(job.lastMatchConfirmationStatus)"
                >{{ confirmationLabel(job.lastMatchConfirmationStatus) }}</span>
              </div>
              <p class="posting-meta">
                <span>{{ job.city || '城市未填' }}</span>
                <span>{{ job.salaryNote || '薪资未填' }}</span>
                <span>{{ job.source || '来源未填' }}</span>
                <span>{{ job.activeVersionId ? `JD v${job.activeVersionNumber}` : '缺生效 JD 版本' }}</span>
                <span>{{ job.requirementCount }} 条要求</span>
                <span>
                  {{ job.lastMatchedAt ? `上次对照 ${formatRelativeTime(job.lastMatchedAt)}` : '还没对照过' }}
                </span>
              </p>
            </div>
            <div class="posting-actions">
              <el-button size="small" :type="job.id === detail?.id ? 'primary' : 'default'" @click="openDetail(job.id)">
                {{ job.id === detail?.id ? '正在查看' : '查看与对照' }}
              </el-button>
            </div>
          </article>
        </div>

        <el-pagination
          v-if="limits && total > limits.size"
          class="pager"
          layout="prev, pager, next"
          :current-page="page"
          :page-size="limits.size"
          :total="total"
          @current-change="turnPage"
        />
      </div>
    </section>

    <ErrorState v-if="detailError" :message="detailError" :retry="() => reloadDetail(selectedId)" />

    <section v-else-if="detail" ref="detailAnchor" class="surface detail">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">{{ detail.company }} · {{ detail.title }}</h2>
          <span class="surface-subtitle">
            {{ detail.city || '城市未填' }} · {{ detail.salaryNote || '薪资未填' }} ·
            {{ detail.source || '来源未填' }} · 更新于 {{ formatDateTime(detail.updatedAt) }}
          </span>
        </div>
        <div class="toolbar">
          <el-button size="small" text :icon="ArrowLeft" @click="closeDetail">收起</el-button>
          <el-button size="small" :icon="PencilLine" @click="openMeta">编辑基本信息</el-button>
          <el-button size="small" :icon="FileText" @click="openJdEditor">编辑 JD 与要求</el-button>
          <el-button size="small" :loading="archiving" @click="toggleArchive">
            {{ detail.archived ? '取消归档' : '归档' }}
          </el-button>
        </div>
      </div>

      <div class="surface-body detail-body">
        <div class="assoc-line">
          <template v-if="detail.application">
            <span class="muted">关联投递：</span>
            <router-link class="assoc-link" :to="`/applications?focus=${detail.application.id}`">
              {{ detail.application.company }} · {{ detail.application.role }}
            </router-link>
            <span class="ow-status run">{{ applicationStageLabel(detail.application.stage) }}</span>
          </template>
          <span v-else class="muted">未关联投递记录。关联后可在同一岗位下看 JD 与投递进度（可选）。</span>
        </div>

        <div v-if="!detail.requirements.length" class="guide-card">
          <b>这个岗位还没有要求条目</b>
          <p>
            对照是逐条进行的：你先写下你在意的每一条要求，规则再去简历文本里找这条要求的字样。
            没有条目就没有可对照的对象，页面上任何「已具备 / 待补齐」都不会出现。
          </p>
          <el-button size="small" type="primary" :icon="Plus" @click="openJdEditor">录入要求条目</el-button>
        </div>

        <div v-if="match" class="trace-bar">
          <span>
            简历：<b>{{ resumeCaption }}</b>
            <router-link
              v-if="match.resume?.versionId"
              class="assoc-link"
              :to="`/resume?version=${match.resume.versionId}`"
            >
              打开这一版
            </router-link>
          </span>
          <span>JD：<b>v{{ match.jdVersionNumber }}</b></span>
          <span>规则：<b>{{ match.ruleVersion }}</b></span>
          <span>档案快照：<b>{{ match.profileSnapshotAt ? formatDateTime(match.profileSnapshotAt) : '没有求职档案快照' }}</b></span>
          <span v-if="match.savedAt">保存于：<b>{{ formatDateTime(match.savedAt) }}</b></span>
          <span v-if="!match.matchId" class="unsaved">实时结果，未保存</span>
        </div>

        <div v-if="detail.requirements.length" class="match-controls">
          <el-select
            v-model="resumeVersionId"
            clearable
            placeholder="自动（生效版本，其次草稿）"
            style="width: 232px"
            @visible-change="onVersionDropdown"
          >
            <el-option
              v-for="version in resumeVersions"
              :key="version.id"
              :label="`v${version.versionNumber} · ${version.status === 'FINAL' ? '已定稿' : '草稿'}`"
              :value="version.id"
            />
          </el-select>
          <el-button :icon="Scale" :loading="matching" @click="runMatch">开始对照</el-button>
          <el-button
            :icon="Save"
            :loading="savingMatch"
            :disabled="!match || Boolean(match?.matchId)"
            @click="saveMatch"
          >
            保存这次对照
          </el-button>
          <template v-if="match?.matchId">
            <el-button
              :icon="Check"
              :loading="confirming"
              :disabled="match.confirmationStatus === 'CONFIRMED'"
              @click="confirm('CONFIRMED')"
            >
              确认这份结果
            </el-button>
            <el-button
              :icon="X"
              :loading="confirming"
              :disabled="match.confirmationStatus === 'REJECTED'"
              @click="confirm('REJECTED')"
            >
              驳回这份结果
            </el-button>
          </template>
        </div>
        <p v-if="match?.matchId" class="muted control-hint">
          下面是已保存的快照：确认与驳回只更新这一行的状态，不新增记录。要保存新一轮对照，重新点「开始对照」。
        </p>

        <ErrorState v-if="matchError" :message="matchError" :retry="runMatch" />

        <el-alert
          v-else-if="match && !match.resume"
          class="state-alert"
          type="warning"
          :closable="false"
          show-icon
          title="没有可比对的简历版本"
        >
          <p>
            这次对照没有拿任何材料来比，所以每一条都只能进「需人工确认」——
            这不表示你差了多少条，只表示规则手上没有可比对的内容。
          </p>
          <router-link class="assoc-link" to="/resume">去简历工作台建一版简历</router-link>
        </el-alert>

        <template v-if="match && !matchError">
          <div class="count-row">
            <div class="count-card ok"><b>{{ match.counts.matched }}</b><span>已具备</span></div>
            <div class="count-card gap"><b>{{ match.counts.gaps }}</b><span>待补齐</span></div>
            <div class="count-card ask"><b>{{ match.counts.needConfirmation }}</b><span>需人工确认</span></div>
          </div>
          <p v-if="match.scoring.reason" class="muted scoring-note">{{ match.scoring.reason }}</p>

          <el-segmented v-model="verdictFilter" :options="VERDICT_OPTIONS" class="verdict-filter" />

          <ul class="req-list">
            <li v-for="item in visibleItems" :key="item.requirementId" class="req-item" :class="verdictClass(item.verdict)">
              <div class="req-head">
                <span class="ow-tag blue">{{ item.categoryLabel }}</span>
                <span class="req-text">{{ item.text }}</span>
                <span class="ow-status" :class="verdictStatusClass(item.verdict)">{{ item.verdictLabel }}</span>
              </div>
              <p v-if="item.reason" class="req-reason">{{ item.reason }}</p>
              <ul v-if="item.evidences.length" class="evidence-list">
                <li v-for="(evidence, index) in item.evidences" :key="`${item.requirementId}-${index}`">
                  <div class="evidence-head">
                    <b>{{ evidence.sectionLabel }}</b>
                    <span v-if="evidence.itemLabel" class="muted">{{ evidence.itemLabel }}</span>
                  </div>
                  <p v-if="evidence.snippet" class="snippet">
                    {{ expanded[`${item.requirementId}-${index}`] ? evidence.snippet : shorten(evidence.snippet) }}
                    <button
                      v-if="needsExpand(evidence.snippet)"
                      class="link-btn"
                      type="button"
                      @click="toggleExpand(`${item.requirementId}-${index}`)"
                    >
                      {{ expanded[`${item.requirementId}-${index}`] ? '收起' : '展开' }}
                    </button>
                  </p>
                </li>
              </ul>
              <p v-if="item.evidenceCount > item.evidences.length" class="muted evidence-more">
                共 {{ item.evidenceCount }} 处命中，这里显示前 {{ item.evidences.length }} 处。
              </p>
            </li>
          </ul>
          <p v-if="!visibleItems.length" class="muted">这一栏没有条目。切换上方筛选看其他判定。</p>
        </template>

        <section v-if="!match && detail.requirements.length" class="block">
          <h3>要求清单（{{ detail.requirements.length }} 条）</h3>
          <ul class="plain-list">
            <li v-for="requirement in detail.requirements" :key="requirement.id">
              <span class="ow-tag blue">{{ requirement.categoryLabel }}</span>
              <span>{{ requirement.text }}</span>
            </li>
          </ul>
          <p class="muted block-hint">
            点「开始对照」后，每一条会带上判定结果与依据原文；未对照前这里只列出你自己写下的要求。
          </p>
        </section>

        <section class="block">
          <h3>
            JD 原文
            <button class="link-btn" type="button" @click="showJd = !showJd">
              {{ showJd ? '收起' : '展开' }}
            </button>
          </h3>
          <p v-if="!detail.jdText" class="muted">没有 JD 正文。点「编辑 JD 与要求」粘贴原文。</p>
          <pre v-else-if="showJd" class="jd-text">{{ detail.jdText }}</pre>
          <p v-else class="muted">已折叠（{{ detail.jdText.length }} 字）。</p>
        </section>

        <section class="block">
          <h3>JD 版本（{{ detail.versions.length }} 版，只追加不改写）</h3>
          <ul class="plain-list">
            <li v-for="version in detail.versions" :key="version.id" class="version-row">
              <span><b>v{{ version.versionNumber }}</b> · {{ version.requirementCount }} 条 · {{ version.jdChars }} 字 · {{ version.ruleVersion }}</span>
              <span class="muted">{{ formatDateTime(version.createdAt) }}</span>
              <span v-if="version.active" class="ow-tag green">当前</span>
              <el-button
                v-else
                size="small"
                text
                :loading="activatingId === version.id"
                @click="activateVersion(version.id)"
              >
                设为当前
              </el-button>
            </li>
          </ul>
        </section>

        <section class="block">
          <h3>对照记录（{{ history.length }} 次，只追加）</h3>
          <p v-if="!history.length" class="muted">还没有保存过对照结果。跑一次对照再点「保存这次对照」。</p>
          <ul v-else class="plain-list">
            <li v-for="row in history" :key="row.matchId" class="version-row">
              <span>v{{ row.jdVersionNumber }} · {{ row.ruleVersion }} ·
                已具备 {{ row.counts.matched }} / 待补齐 {{ row.counts.gaps }} / 需人工确认 {{ row.counts.needConfirmation }}</span>
              <span class="muted">{{ formatDateTime(row.createdAt) }}</span>
              <span class="ow-status" :class="confirmationClass(row.confirmationStatus)">
                {{ confirmationLabel(row.confirmationStatus) }}
              </span>
              <el-button size="small" text :loading="loadingMatchId === row.matchId" @click="openSnapshot(row.matchId)">
                看这次
              </el-button>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <el-dialog v-model="formOpen" :title="formMode === 'create' ? '录入岗位' : '编辑 JD 与要求'" width="min(760px, calc(100vw - 24px))" destroy-on-close>
      <el-form label-position="top">
        <template v-if="formMode === 'create'">
          <div class="form-grid">
            <el-form-item label="公司" required>
              <el-input v-model="form.company" maxlength="128" placeholder="公司名" />
            </el-form-item>
            <el-form-item label="岗位" required>
              <el-input v-model="form.title" maxlength="128" placeholder="如：Java 后端工程师" />
            </el-form-item>
          </div>
          <div class="form-grid three">
            <el-form-item label="城市">
              <el-input v-model="form.city" maxlength="64" placeholder="可选" />
            </el-form-item>
            <el-form-item label="薪资备注">
              <el-input v-model="form.salaryNote" maxlength="128" placeholder="可选，如 25k-35k" />
            </el-form-item>
            <el-form-item label="来源">
              <el-input v-model="form.source" maxlength="64" placeholder="可选，如 内推 / 官网" />
            </el-form-item>
          </div>
          <el-form-item label="关联投递记录">
            <el-select v-model="form.applicationId" clearable placeholder="可选，来自求职进度" style="width: 100%">
              <el-option
                v-for="application in applications"
                :key="application.id"
                :label="`${application.company} · ${application.role}`"
                :value="application.id"
              />
            </el-select>
          </el-form-item>
        </template>
        <el-alert v-else class="state-alert" type="info" :closable="false" show-icon>
          正文或要求清单任一有变化就会出一个新版本；旧版本原文不会被改写。
        </el-alert>

        <el-form-item label="JD 原文" required>
          <el-input
            v-model="form.jdText"
            type="textarea"
            :rows="8"
            :maxlength="limits?.maxJdChars"
            show-word-limit
            placeholder="从招聘网站复制过来的正文原样粘贴即可，站内不会替你抽取要求"
          />
        </el-form-item>

        <el-form-item :label="`要求条目（${form.requirements.length}/${limits?.maxRequirementCount ?? '∞'}）`">
          <div class="req-editor">
            <div v-for="(row, index) in form.requirements" :key="row.id" class="req-row">
              <el-select v-model="row.category" style="width: 104px">
                <el-option v-for="option in CATEGORY_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
              <el-input v-model="row.text" maxlength="128" placeholder="一条要求一句话，如：熟悉 MySQL 索引与事务" />
              <el-button size="small" text :icon="Trash2" aria-label="删除这条要求" @click="form.requirements.splice(index, 1)" />
            </div>
            <el-button
              size="small"
              text
              :icon="Plus"
              :disabled="Boolean(limits && form.requirements.length >= limits.maxRequirementCount)"
              @click="addRequirement"
            >
              添加一条要求
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ formMode === 'create' ? '创建并存为 v1' : '保存为新版本' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="metaOpen" title="编辑基本信息" width="min(560px, calc(100vw - 24px))" destroy-on-close>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="公司" required>
            <el-input v-model="meta.company" maxlength="128" />
          </el-form-item>
          <el-form-item label="岗位" required>
            <el-input v-model="meta.title" maxlength="128" />
          </el-form-item>
        </div>
        <div class="form-grid three">
          <el-form-item label="城市"><el-input v-model="meta.city" maxlength="64" /></el-form-item>
          <el-form-item label="薪资备注"><el-input v-model="meta.salaryNote" maxlength="128" /></el-form-item>
          <el-form-item label="来源"><el-input v-model="meta.source" maxlength="64" /></el-form-item>
        </div>
        <el-form-item label="关联投递记录">
          <el-select v-model="meta.applicationId" clearable placeholder="可选" style="width: 100%">
            <el-option
              v-for="application in applications"
              :key="application.id"
              :label="`${application.company} · ${application.role}`"
              :value="application.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="metaOpen = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitMeta">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  FileText,
  PencilLine,
  Plus,
  Save,
  Scale,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import {
  CONFIRMATION_LABELS,
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_CATEGORY_LABELS,
  VERDICT_LABELS,
  createJobPosting,
  getJobMatch,
  getJobPosting,
  listJobMatches,
  listJobPostings,
  matchJobPosting,
  newRequirementId,
  resumeSourceLabel,
  saveJobJdVersion,
  saveJobMatch,
  setActiveJdVersion,
  setJobArchived,
  updateJobMeta,
  confirmJobMatch,
  type JobPostingQuery,
} from '@/api/jobPostings'
import { listApplications, stageLabel, type JobApplication } from '@/api/jobApplications'
import { getResumeState } from '@/api/resume'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { formatDateTime, formatRelativeTime } from '@/utils/format'

import type {
  JobMatchConfirmation,
  JobMatchHistoryItem,
  JobMatchItem,
  JobMatchVerdict,
  JobMatchView,
  JobPostingDetail,
  JobPostingListResponse,
  JobPostingSummary,
  JobRequirementPayload,
  ResumeState,
  ResumeVersionSummary,
} from '@/types/api'

/** 依据片段后端按 40 字上下文截断，界面再折一次行，避免窄屏撑破卡片。 */
const SNIPPET_VISIBLE_CHARS = 60

const ARCHIVED_OPTIONS = [
  { value: 'false', label: '在办' },
  { value: 'all', label: '全部' },
  { value: 'true', label: '已归档' },
]

const CATEGORY_OPTIONS = REQUIREMENT_CATEGORIES.map((value) => ({
  value,
  label: REQUIREMENT_CATEGORY_LABELS[value],
}))

const VERDICT_OPTIONS: { value: 'ALL' | JobMatchVerdict; label: string }[] = [
  { value: 'ALL', label: '全部' },
  { value: 'MATCHED', label: VERDICT_LABELS.MATCHED },
  { value: 'GAP', label: VERDICT_LABELS.GAP },
  { value: 'NEED_CONFIRMATION', label: VERDICT_LABELS.NEED_CONFIRMATION },
]

const limits = ref<JobPostingListResponse | null>(null)
const postings = ref<JobPostingSummary[]>([])
const total = ref(0)
const page = ref(1)
const keyword = ref('')
const archivedFilter = ref('false')
const loadingList = ref(true)
const listError = ref('')

const selectedId = ref(0)
const detail = ref<JobPostingDetail | null>(null)
const detailError = ref('')
const archiving = ref(false)
const activatingId = ref<number | null>(null)
const showJd = ref(false)
const detailAnchor = ref<HTMLElement | null>(null)

const applications = ref<JobApplication[]>([])
const resumeState = ref<ResumeState | null>(null)
const resumeVersionId = ref<number | null>(null)

const match = ref<JobMatchView | null>(null)
const matching = ref(false)
const matchError = ref('')
const savingMatch = ref(false)
const confirming = ref(false)
const loadingMatchId = ref<number | null>(null)
const history = ref<JobMatchHistoryItem[]>([])
// el-segmented 回写的是 SegmentedValue（string|number|boolean），这里不能收得更窄。
const verdictFilter = ref<string>('ALL')
const expanded = ref<Record<string, boolean>>({})

const formOpen = ref(false)
const formMode = ref<'create' | 'jd'>('create')
const submitting = ref(false)
const form = reactive({
  company: '',
  title: '',
  city: '',
  salaryNote: '',
  source: '',
  applicationId: null as number | null,
  jdText: '',
  requirements: [] as JobRequirementPayload[],
})

const metaOpen = ref(false)
const meta = reactive({
  company: '',
  title: '',
  city: '',
  salaryNote: '',
  source: '',
  applicationId: null as number | null,
})

let searchTimer: ReturnType<typeof setTimeout> | null = null

const resumeVersions = computed<ResumeVersionSummary[]>(() => resumeState.value?.versions ?? [])

const visibleItems = computed<JobMatchItem[]>(() => {
  const items = match.value?.items ?? []
  return verdictFilter.value === 'ALL' ? items : items.filter((item) => item.verdict === verdictFilter.value)
})

const resumeCaption = computed(() => {
  const current = match.value
  if (!current) return ''
  if (!current.resume) return resumeSourceLabel(current.resumeSource)
  return `v${current.resume.versionNumber} · ${current.resume.status === 'FINAL' ? '已定稿' : '草稿'} · ${resumeSourceLabel(current.resumeSource)}`
})

watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void loadPostings(1)
  }, 400)
})

onMounted(() => {
  void loadPostings()
  void loadSideData()
})

async function loadSideData(): Promise<void> {
  try {
    const [applicationList, resume] = await Promise.all([listApplications(false), getResumeState()])
    applications.value = applicationList.items
    resumeState.value = resume
  } catch (sideError) {
    // 下拉与版本选择是辅助数据：拿不到时保留主链可用，只在下拉里说明为空。
    ElMessage.warning(`投递与简历版本列表未加载：${problemMessage(sideError)}`)
  }
}

async function loadPostings(targetPage?: number): Promise<void> {
  // ErrorState 的 retry 会把点击事件当第一个参数传进来，非数字一律回落到当前页。
  const requested = typeof targetPage === 'number' && targetPage > 0 ? targetPage : page.value

  loadingList.value = true
  listError.value = ''
  try {
    const query: JobPostingQuery = {
      archived: archivedFilter.value,
      q: keyword.value.trim() || null,
      page: requested,
      size: limits.value?.size ?? null,
    }
    const response = await listJobPostings(query)
    limits.value = response
    postings.value = response.items
    total.value = response.total
    page.value = response.page
  } catch (loadError) {
    listError.value = problemMessage(loadError)
  } finally {
    loadingList.value = false
  }
}

function reloadPage1(): void {
  void loadPostings(1)
}

function turnPage(next: number): void {
  void loadPostings(next)
}

async function openDetail(id: number): Promise<void> {
  selectedId.value = id
  match.value = null
  matchError.value = ''
  verdictFilter.value = 'ALL'
  showJd.value = false
  expanded.value = {}
  await reloadDetail(id)
  detailAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeDetail(): void {
  detail.value = null
  selectedId.value = 0
  match.value = null
}

async function reloadDetail(id: number): Promise<void> {
  detailError.value = ''
  try {
    const [posting, matches] = await Promise.all([getJobPosting(id), listJobMatches(id)])
    detail.value = posting
    history.value = matches.items
  } catch (loadError) {
    detailError.value = problemMessage(loadError)
    detail.value = null
  }
}

/** 下拉展开时重取简历状态：同一挂载内用户可能刚在简历页建了新版本。 */
async function onVersionDropdown(open: boolean): Promise<void> {
  if (!open) return
  try {
    resumeState.value = await getResumeState()
  } catch (sideError) {
    ElMessage.error(problemMessage(sideError))
  }
}

async function runMatch(): Promise<void> {
  if (!detail.value) return
  const target = detail.value
  matching.value = true
  matchError.value = ''
  try {
    match.value = await matchJobPosting(target.id, toIdOrNull(resumeVersionId.value))
    verdictFilter.value = 'ALL'
    expanded.value = {}
  } catch (submitError) {
    matchError.value = problemMessage(submitError)
  } finally {
    matching.value = false
  }
}

async function saveMatch(): Promise<void> {
  if (!detail.value) return
  const target = detail.value
  savingMatch.value = true
  try {
    // 服务端按同一规则重算后再落库，前端手上的实时结果只是给用户看的。
    match.value = await saveJobMatch(target.id, toIdOrNull(resumeVersionId.value))
    await Promise.all([reloadDetail(target.id), loadPostings()])
    ElMessage.success('对照结果已保存为一条新记录')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    savingMatch.value = false
  }
}

async function confirm(status: JobMatchConfirmation): Promise<void> {
  const current = match.value
  if (!current?.matchId) return
  confirming.value = true
  try {
    match.value = await confirmJobMatch(current.matchId, status, current.confirmationStatus ?? null)
    await Promise.all([reloadDetail(current.jobId), loadPostings()])
    ElMessage.success(`已标记为「${CONFIRMATION_LABELS[status]}」`)
  } catch (submitError) {
    if (getProblem(submitError).errorCode === 'STATE_CONFLICT') {
      ElMessage.warning('这份结果在别处已被改判，已重新加载最新状态')
      await reloadDetail(current.jobId)
      match.value = await getJobMatch(current.matchId)
    } else {
      ElMessage.error(problemMessage(submitError))
    }
  } finally {
    confirming.value = false
  }
}

async function openSnapshot(matchId: number): Promise<void> {
  loadingMatchId.value = matchId
  try {
    match.value = await getJobMatch(matchId)
    verdictFilter.value = 'ALL'
    expanded.value = {}
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    loadingMatchId.value = null
  }
}

async function activateVersion(versionId: number): Promise<void> {
  if (!detail.value) return
  activatingId.value = versionId
  try {
    detail.value = await setActiveJdVersion(detail.value.id, versionId)
    match.value = null
    matchError.value = ''
    await loadPostings()
    ElMessage.success('已切换到该 JD 版本，请重新对照')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    activatingId.value = null
  }
}

async function toggleArchive(): Promise<void> {
  if (!detail.value) return
  archiving.value = true
  try {
    detail.value = await setJobArchived(detail.value.id, !detail.value.archived)
    await loadPostings()
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    archiving.value = false
  }
}

function openCreate(): void {
  formMode.value = 'create'
  form.company = ''
  form.title = ''
  form.city = ''
  form.salaryNote = ''
  form.source = ''
  form.applicationId = null
  form.jdText = ''
  form.requirements = [{ id: newRequirementId(), category: 'SKILL', text: '' }]
  formOpen.value = true
}

function openJdEditor(): void {
  const current = detail.value
  if (!current) return
  formMode.value = 'jd'
  form.jdText = current.jdText ?? ''
  form.requirements = current.requirements.map((item) => ({
    id: item.id,
    category: item.category,
    text: item.text,
  }))
  if (!form.requirements.length) addRequirement()
  formOpen.value = true
}

function addRequirement(): void {
  form.requirements.push({ id: newRequirementId(), category: 'SKILL', text: '' })
}

function buildRequirements(): JobRequirementPayload[] | null {
  const rows = form.requirements.filter((row) => row.text.trim())
  if (form.requirements.some((row) => !row.text.trim())) {
    ElMessage.warning('有空的要求条目，填上文字或删掉这一行')
    return null
  }
  return rows.map((row) => ({ id: row.id, category: row.category, text: row.text.trim() }))
}

async function submitForm(): Promise<void> {
  const requirements = buildRequirements()
  if (!requirements) return
  if (formMode.value === 'create' && (!form.company.trim() || !form.title.trim())) {
    ElMessage.warning('请填写公司与岗位')
    return
  }
  if (!form.jdText.trim()) {
    ElMessage.warning('JD 原文不能为空，对照要求至少要有正文')
    return
  }
  const target = detail.value
  submitting.value = true
  try {
    if (formMode.value === 'create') {
      const created = await createJobPosting({
        company: form.company.trim(),
        title: form.title.trim(),
        city: form.city.trim() || null,
        salaryNote: form.salaryNote.trim() || null,
        source: form.source.trim() || null,
        applicationId: toIdOrNull(form.applicationId),
        jdText: form.jdText,
        requirements,
      })
      formOpen.value = false
      await loadPostings(1)
      await openDetail(created.id)
      ElMessage.success('岗位已录入，可以直接开始对照')
    } else if (target) {
      detail.value = await saveJobJdVersion(target.id, { jdText: form.jdText, requirements })
      formOpen.value = false
      match.value = null
      await Promise.all([reloadDetail(target.id), loadPostings()])
      ElMessage.success('已保存为新的 JD 版本')
    }
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    submitting.value = false
  }
}

function openMeta(): void {
  const current = detail.value
  if (!current) return
  meta.company = current.company
  meta.title = current.title
  meta.city = current.city ?? ''
  meta.salaryNote = current.salaryNote ?? ''
  meta.source = current.source ?? ''
  meta.applicationId = current.application?.id ?? null
  metaOpen.value = true
}

async function submitMeta(): Promise<void> {
  const current = detail.value
  if (!current) return
  if (!meta.company.trim() || !meta.title.trim()) {
    ElMessage.warning('请填写公司与岗位')
    return
  }
  submitting.value = true
  try {
    detail.value = await updateJobMeta(current.id, {
      company: meta.company.trim(),
      title: meta.title.trim(),
      city: meta.city.trim() || null,
      salaryNote: meta.salaryNote.trim() || null,
      source: meta.source.trim() || null,
      applicationId: toIdOrNull(meta.applicationId),
      expectedUpdatedAt: current.updatedAt,
    })
    metaOpen.value = false
    await Promise.all([reloadDetail(current.id), loadPostings()])
    ElMessage.success('基本信息已更新')
  } catch (submitError) {
    if (getProblem(submitError).errorCode === 'STATE_CONFLICT') {
      ElMessage.warning('这个岗位在别处已被修改，你的改动没有保存；已拉回最新内容，请重做修改')
      await reloadDetail(current.id)
      // 表单必须刷成服务端最新值：留着旧值再提一次，就会把别人的改动静默覆盖回去。
      openMeta()
    } else {
      ElMessage.error(problemMessage(submitError))
    }
  } finally {
    submitting.value = false
  }
}

/** 可清空的下拉在清空时回写的是空字符串，直接进 JSON 会变成 ""，数值 id 必须先归一。 */
function toIdOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function needsExpand(snippet?: string | null): boolean {
  return Boolean(snippet && snippet.length > SNIPPET_VISIBLE_CHARS)
}

function shorten(snippet?: string | null): string {
  if (!snippet) return ''
  if (snippet.length <= SNIPPET_VISIBLE_CHARS) return snippet
  return `${snippet.slice(0, SNIPPET_VISIBLE_CHARS)}…`
}

function toggleExpand(key: string): void {
  expanded.value = { ...expanded.value, [key]: !expanded.value[key] }
}

function verdictClass(verdict: JobMatchVerdict): string {
  if (verdict === 'MATCHED') return 'is-matched'
  if (verdict === 'GAP') return 'is-gap'
  return 'is-ask'
}

function verdictStatusClass(verdict: JobMatchVerdict): string {
  if (verdict === 'MATCHED') return 'ok'
  if (verdict === 'GAP') return 'off'
  return 'run'
}

function confirmationLabel(status?: JobMatchConfirmation | string | null): string {
  if (!status) return '未确认'
  return CONFIRMATION_LABELS[status as JobMatchConfirmation] ?? String(status)
}

function confirmationClass(status?: JobMatchConfirmation | string | null): string {
  if (status === 'CONFIRMED') return 'ok'
  if (status === 'REJECTED') return 'off'
  return 'run'
}

function applicationStageLabel(stage?: string | null): string {
  if (!stage) return '阶段未知'
  return stageLabel(stage as JobApplication['stage'])
}
</script>

<style scoped>
.job-page {
  display: grid;
  gap: 18px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.posting-list {
  display: grid;
}

.posting-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--ow-line-soft);
}

.posting-row:last-child {
  border-bottom: 0;
}

.posting-row.picked {
  background: var(--brand-50);
}

.posting-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.posting-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.posting-title strong {
  color: var(--ow-ink-secondary);
  font-size: var(--fs-sm);
}

.posting-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-xs);
}

.pager {
  margin-top: 12px;
  justify-content: center;
}

.detail-body {
  display: grid;
  gap: 14px;
}

.assoc-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: var(--fs-xs);
}

.assoc-link {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
}

.assoc-link:hover {
  text-decoration: underline;
}

.guide-card {
  display: grid;
  gap: 8px;
  justify-items: start;
  padding: 14px 16px;
  background: var(--gold-50);
  border: 1px solid var(--gold-200);
  border-radius: 12px;
  font-size: var(--fs-sm);
}

.guide-card p {
  margin: 0;
  color: var(--ink-2);
  line-height: 1.7;
}

.trace-bar {
  display: flex;
  align-items: center;
  gap: 8px 18px;
  flex-wrap: wrap;
  padding: 10px 14px;
  color: var(--ink-2);
  background: var(--surface-2);
  border: 1px dashed var(--line);
  border-radius: 12px;
  font-size: var(--fs-xs);
}

.trace-bar b {
  color: var(--ow-ink-secondary);
}

.trace-bar .unsaved {
  color: var(--gold-600);
  font-weight: 700;
}

.match-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.control-hint {
  margin: -6px 0 0;
  font-size: var(--fs-xs);
}

.state-alert :deep(p) {
  margin: 0 0 6px;
}

.count-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.count-card {
  display: grid;
  gap: 2px;
  padding: 12px 10px;
  text-align: center;
  border: 1.5px solid var(--line);
  border-radius: 12px;
}

.count-card b {
  color: var(--ow-ink-secondary);
  font-size: var(--fs-lg);
  font-weight: 900;
}

.count-card span {
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.count-card.ok {
  background: var(--green-50);
  border-color: var(--green-200);
}

.count-card.gap {
  background: var(--red-50);
  border-color: var(--red-200);
}

.count-card.ask {
  background: var(--gold-50);
  border-color: var(--gold-200);
}

.scoring-note {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.7;
}

.verdict-filter {
  justify-content: flex-start;
}

.req-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.req-item {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-left-width: 3px;
  border-radius: 12px;
  font-size: var(--fs-sm);
}

.req-item.is-matched {
  border-left-color: var(--green);
}

.req-item.is-gap {
  border-left-color: var(--red);
}

.req-item.is-ask {
  border-left-color: var(--gold);
}

.req-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.req-text {
  flex: 1;
  min-width: 160px;
  color: var(--ow-ink-secondary);
  font-weight: 700;
}

.req-reason {
  margin: 0;
  color: var(--muted);
  font-size: var(--fs-xs);
  line-height: 1.65;
}

.evidence-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.evidence-list li {
  padding: 8px 10px;
  background: var(--ow-surface);
  border: 1px solid var(--ow-line-soft);
  border-radius: 12px;
}

.evidence-head {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: var(--fs-xs);
}

.snippet {
  margin: 4px 0 0;
  color: var(--ink-2);
  font-size: var(--fs-xs);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.evidence-more {
  margin: 0;
  font-size: var(--fs-xs);
}

.link-btn {
  padding: 0;
  color: var(--brand-700);
  background: none;
  border: 0;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.block {
  display: grid;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid var(--ow-line-soft);
}

.block h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--ow-ink-secondary);
  font-size: var(--fs-sm);
}

.block-hint {
  margin: 0;
  font-size: var(--fs-xs);
  line-height: 1.7;
}

.plain-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--fs-xs);
}

.plain-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.version-row {
  color: var(--ink-2);
}

.jd-text {
  margin: 0;
  padding: 12px;
  overflow: auto;
  max-height: 320px;
  color: var(--ink-2);
  background: var(--surface-2);
  border-radius: 12px;
  font-family: var(--mono, ui-monospace, monospace);
  font-size: var(--fs-xs);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-grid.three {
  grid-template-columns: 1fr 1fr 1fr;
}

.req-editor {
  display: grid;
  gap: 8px;
  width: 100%;
}

.req-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) 32px;
  align-items: center;
  gap: 8px;
}

@media (max-width: 720px) {
  .posting-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .posting-actions {
    justify-self: start;
  }

  .form-grid,
  .form-grid.three {
    grid-template-columns: 1fr;
  }

  .req-row {
    grid-template-columns: 100px minmax(0, 1fr) 32px;
  }
}
</style>
