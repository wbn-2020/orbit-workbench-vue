<template>
  <div class="page resume-page">
    <PageHeader
      title="简历工作台"
      description="初稿只带入产品内确有来源的内容：求职档案提供基本信息，已确认的项目事实提供项目与技能。教育经历和工作经历需要你手动填写。"
    >
      <template v-if="resume" #actions>
        <span v-if="dirty" class="dirty-flag">
          <CircleAlert aria-hidden="true" />
          有未保存修改
        </span>
        <el-button v-if="editing" :icon="Save" :loading="saving" @click="saveDraft">
          保存草稿
        </el-button>
        <el-button
          v-if="editing"
          :icon="Stamp"
          :loading="finalizing"
          :disabled="dirty"
          :title="dirty ? '请先保存草稿' : undefined"
          @click="finalizeDraft"
        >
          定稿
        </el-button>
        <el-button
          v-if="editing"
          type="primary"
          :icon="FileDown"
          :loading="exporting"
          :disabled="exportBlocked"
          @click="exportPdf"
        >
          导出 PDF
        </el-button>
      </template>
    </PageHeader>

    <div v-if="loading" class="surface">
      <div class="surface-body">
        <el-skeleton :rows="10" animated />
      </div>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" :retry="load" />

    <section v-else-if="!resume" class="surface">
      <EmptyState
        title="还没有简历"
        description="可以从求职档案和已确认的项目事实生成初稿，再逐条修改。没有来源的区块会保持空白。"
      >
        <el-button type="primary" :icon="WandSparkles" :loading="bootstrapping" @click="bootstrap">
          从现有资料生成初稿
        </el-button>
      </EmptyState>
      <div class="surface-body bootstrap-hint">
        <p class="muted">带入后每条内容都会标注来源，可点回来源页面核对：</p>
        <ul class="source-list">
          <li v-for="meta in sectionMeta" :key="meta.key">
            <b>{{ meta.heading }}</b>
            <span class="muted">{{ meta.sourceHint }}</span>
          </li>
        </ul>
      </div>
    </section>

    <div v-else class="resume-grid">
      <div class="resume-main">
        <el-alert
          v-if="previewVersion"
          class="state-alert"
          type="info"
          :closable="false"
          show-icon
          :title="`正在只读查看 v${previewVersion.versionNumber}（来自岗位对照的依据跳转）`"
        >
          <span class="muted">规则只读，不会改动任何内容；改动只在草稿上进行。</span>
          <el-button class="inline-cta" size="small" @click="leavePreview">
            回到当前编辑内容
          </el-button>
        </el-alert>

        <el-alert
          v-else-if="preflight && !preflight.ready"
          class="state-alert"
          type="warning"
          :closable="false"
          show-icon
          title="当前内容还不能导出 PDF"
        >
          <ul class="blocker-list">
            <li v-for="reason in preflight.blockers" :key="reason">{{ reason }}</li>
          </ul>
        </el-alert>

        <el-alert
          v-else-if="!draftId"
          class="state-alert"
          type="info"
          :closable="false"
          show-icon
          title="当前没有草稿，下面是已定稿版本的只读内容"
        >
          <el-button class="inline-cta" size="small" :icon="Copy" :loading="duplicating" @click="copyToDraft()">
            复制为草稿继续编辑
          </el-button>
        </el-alert>

        <el-alert
          v-if="localErrors.length"
          class="state-alert"
          type="error"
          :closable="false"
          show-icon
          title="保存前需要修正"
        >
          <ul class="blocker-list">
            <li v-for="reason in localErrors" :key="reason">{{ reason }}</li>
          </ul>
        </el-alert>

        <div v-for="meta in sectionMeta" :key="meta.key" class="surface section-card">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">
                {{ meta.heading }}
                <em v-if="editing && isSectionDirty(meta.key)" class="dirty-dot">未保存</em>
              </h2>
              <span class="surface-subtitle">{{ meta.sourceHint }}</span>
            </div>
            <el-button
              v-if="editing"
              size="small"
              text
              :icon="Plus"
              :disabled="sectionOf(meta.key).items.length >= maxItems"
              @click="addItem(meta.key, meta.kind)"
            >
              添加条目
            </el-button>
          </div>
          <div class="surface-body item-list">
            <p v-if="!sectionOf(meta.key).items.length" class="muted empty-hint">
              {{ meta.emptyHint }}
            </p>
            <div v-for="(item, index) in sectionOf(meta.key).items" :key="item.id" class="item-row">
              <div class="item-head">
                <el-input
                  v-if="editing"
                  v-model="item.label"
                  class="item-label"
                  size="small"
                  maxlength="128"
                  :placeholder="meta.kind === 'FIELD' ? '字段名，如 姓名' : '条目标题'"
                  @input="markEdited(item)"
                />
                <b v-else>{{ item.label || '（无标题）' }}</b>
                <span class="item-source">
                  <component :is="sourceIcon(item)" aria-hidden="true" />
                  <router-link
                    v-if="editing && sourceRoute(item)"
                    class="source-link"
                    :to="sourceRoute(item) as RouteLocationRaw"
                  >
                    {{ sourceName(item) }}
                  </router-link>
                  <span v-else class="muted">{{ sourceName(item) }}</span>
                  <el-tag v-if="item.edited" size="small" type="warning" effect="plain">已修改</el-tag>
                </span>
                <el-button
                  v-if="editing"
                  size="small"
                  text
                  :icon="Trash2"
                  aria-label="删除条目"
                  @click="removeItem(meta.key, index)"
                />
              </div>
              <el-input
                v-if="editing"
                v-model="item.text"
                :type="meta.kind === 'FIELD' ? 'text' : 'textarea'"
                :autosize="meta.kind === 'FIELD' ? undefined : { minRows: 2, maxRows: 8 }"
                maxlength="2000"
                show-word-limit
                placeholder="填写内容"
                @input="markEdited(item)"
              />
              <p v-else class="readonly-text">{{ item.text }}</p>
            </div>
          </div>
        </div>
      </div>

      <aside class="resume-side">
        <div class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">版本</h2>
              <span class="surface-subtitle">定稿后不可改写，可复制为草稿继续修改</span>
            </div>
          </div>
          <div class="surface-body version-body">
            <div>
              <span class="field-label">简历标题</span>
              <el-input
                v-model="titleDraft"
                size="small"
                maxlength="128"
                :disabled="!editing"
                aria-label="简历标题"
              />
            </div>
            <ul class="version-list">
              <li
                v-for="version in resume.versions"
                :key="version.id"
                :class="{ active: version.id === resume.activeVersionId || version.id === deepLinkedVersionId }"
              >
                <div class="version-line">
                  <b>v{{ version.versionNumber }}</b>
                  <el-tag size="small" :type="version.status === 'FINAL' ? 'success' : 'info'" effect="plain">
                    {{ version.status === 'FINAL' ? '已定稿' : '草稿' }}
                  </el-tag>
                  <span v-if="version.id === resume.activeVersionId" class="ow-tag blue">当前</span>
                  <span v-if="version.id === deepLinkedVersionId" class="ow-tag orange">查看中</span>
                </div>
                <div class="version-meta muted">
                  {{ version.itemCount }} 条 · {{ version.totalChars }} 字 ·
                  {{ version.pdfAvailable ? '已导出' : '未导出' }}
                  <template v-if="version.exportCount > 0"> · 导出 {{ version.exportCount }} 次</template>
                </div>
                <div v-if="version.changeSummary" class="version-meta muted">{{ version.changeSummary }}</div>
                <div class="version-actions">
                  <el-button
                    v-if="version.pdfAvailable"
                    size="small"
                    text
                    :icon="FileDown"
                    :loading="downloadingId === version.id"
                    @click="download(version.id)"
                  >
                    下载
                  </el-button>
                  <el-button
                    v-if="version.status === 'FINAL' && version.id !== resume.activeVersionId"
                    size="small"
                    text
                    :icon="Anchor"
                    :loading="activatingId === version.id"
                    @click="setActiveVersion(version.id)"
                  >
                    设为当前
                  </el-button>
                  <el-button
                    v-if="!draftId && version.status === 'FINAL'"
                    size="small"
                    text
                    :icon="Copy"
                    :loading="duplicating"
                    @click="copyToDraft(version.id)"
                  >
                    复制为草稿
                  </el-button>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="surface">
          <div class="surface-header">
            <div>
              <h2 class="surface-title">导出记录</h2>
              <span class="surface-subtitle">{{ displayedVersionLabel }} · 只追加，失败同样留痕</span>
            </div>
          </div>
          <div class="surface-body export-body">
            <p v-if="!exportRows.length" class="muted empty-hint">该版本还没有导出记录。</p>
            <ul v-else class="export-list">
              <li v-for="row in exportRows" :key="row.id">
                <el-tag size="small" :type="row.status === 'SUCCEEDED' ? 'success' : 'danger'" effect="plain">
                  {{ row.status === 'SUCCEEDED' ? '成功' : '失败' }}
                </el-tag>
                <span class="muted">{{ formatTime(row.createdAt) }}</span>
                <span v-if="row.status === 'SUCCEEDED'">{{ formatSize(row.sizeBytes) }} · {{ row.fontName }}</span>
                <p v-else class="export-reason">{{ row.failureReason }}</p>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Anchor,
  CircleAlert,
  Copy,
  FileDown,
  Link as LinkIcon,
  PencilLine,
  Plus,
  Save,
  Stamp,
  Trash2,
  WandSparkles,
} from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import {
  bootstrapResume,
  checkResumeExport,
  duplicateResumeVersion,
  downloadResumePdf,
  exportResumePdf,
  finalizeResumeDraft,
  getResumeState,
  getResumeVersion,
  saveResumeDraft,
  setActiveResumeVersion,
} from '@/api/resume'
import { getProblem, problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import type { RouteLocationRaw } from 'vue-router'
import type {
  ResumeExportRecord,
  ResumeItem,
  ResumeItemKind,
  ResumeItemPayload,
  ResumePreflight,
  ResumeSection,
  ResumeSectionKey,
  ResumeSectionPayload,
  ResumeSourceType,
  ResumeState,
  ResumeVersionDetail,
} from '@/types/api'

/** 与后端 ResumeSections.MAX_ITEMS_PER_SECTION 同口径（13 §5）。 */
const maxItems = 30

interface SectionMeta {
  key: ResumeSectionKey
  heading: string
  kind: ResumeItemKind
  sourceHint: string
  emptyHint: string
}

const sectionMeta: SectionMeta[] = [
  {
    key: 'BASIC_INFO',
    heading: '基本信息',
    kind: 'FIELD',
    sourceHint: '姓名与联系方式需你填写；期望岗位等由求职档案带入',
    emptyHint: '产品内没有姓名和联系方式字段，请手动补充。',
  },
  {
    key: 'EDUCATION',
    heading: '教育经历',
    kind: 'ENTRY',
    sourceHint: '产品内暂无来源，需手动填写',
    emptyHint: '产品内没有教育经历的结构化数据，不会自动编造，请手动添加。',
  },
  {
    key: 'WORK_EXPERIENCE',
    heading: '工作经历',
    kind: 'ENTRY',
    sourceHint: '产品内暂无来源，需手动填写',
    emptyHint: '产品内没有任职经历的结构化数据，不会自动编造，请手动添加。',
  },
  {
    key: 'PROJECT_EXPERIENCE',
    heading: '项目经历',
    kind: 'ENTRY',
    sourceHint: '来自已确认的项目事实，可逐条回到来源核对',
    emptyHint: '还没有已确认的项目事实，可在项目资料页确认后重新生成初稿。',
  },
  {
    key: 'SKILLS',
    heading: '技能标签',
    kind: 'FIELD',
    sourceHint: '来自已确认的技术栈事实，可自由增删',
    emptyHint: '还没有带入的技能条目，可手动添加。',
  },
]

const route = useRoute()
const router = useRouter()

const state = ref<ResumeState | null>(null)
const sections = ref<ResumeSection[]>([])
const snapshot = ref<Record<string, string>>({})
const titleSnapshot = ref('')
const titleDraft = ref('')
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const finalizing = ref(false)
const bootstrapping = ref(false)
const exporting = ref(false)
const duplicating = ref(false)
const activatingId = ref<number | null>(null)
const downloadingId = ref<number | null>(null)
const preflight = ref<ResumePreflight | null>(null)
const exportRows = ref<ResumeExportRecord[]>([])
const localErrors = ref<string[]>([])
let itemSeq = 0

const resume = computed(() => (state.value?.exists ? state.value : null))
const draftId = computed(() => state.value?.draft?.id ?? null)
/**
 * ?version= 深链：从岗位对照的依据跳过来看某一版原文。
 * 预览期间必须退出编辑模型——showReadonlyVersion() 会把 snapshot 清空，
 * 这时若还允许保存，只读内容会被当成草稿写回，覆盖用户真正的草稿。
 */
const deepLinkedVersionId = ref<number | null>(null)
const editing = computed(() => Boolean(draftId.value) && deepLinkedVersionId.value === null)
const previewVersion = computed(
  () => state.value?.versions.find((version) => version.id === deepLinkedVersionId.value) ?? null,
)
const dirty = computed(() =>
  editing.value && (
    titleDraft.value !== titleSnapshot.value ||
    sectionMeta.some((meta) => isSectionDirty(meta.key))
  ),
)
const exportBlocked = computed(() => !draftId.value || Boolean(preflight.value && !preflight.value.ready))
const displayedVersionLabel = computed(() => {
  const id = deepLinkedVersionId.value ?? draftId.value ?? state.value?.activeVersionId ?? null
  const version = state.value?.versions.find((item) => item.id === id)
  return version ? `v${version.versionNumber}` : '当前版本'
})

function sectionOf(key: ResumeSectionKey): ResumeSection {
  return sections.value.find((section) => section.key === key) ?? { key, items: [] }
}

/** 只允许新增条目改写区块集合；读取路径带副作用会让计算属性自触发更新。 */
function ensureSection(key: ResumeSectionKey): ResumeSection {
  const found = sections.value.find((section) => section.key === key)
  if (found) return found
  const created: ResumeSection = { key, items: [] }
  sections.value.push(created)
  return created
}

function isSectionDirty(key: ResumeSectionKey): boolean {
  return JSON.stringify(sectionOf(key).items) !== (snapshot.value[key] ?? '[]')
}

function capture(detail: ResumeVersionDetail): void {
  deepLinkedVersionId.value = null
  sections.value = sectionMeta.map((meta) => {
    const source = detail.sections.find((section) => section.key === meta.key)
    return {
      key: meta.key,
      items: (source?.items ?? []).map((item) => ({ ...item })),
    }
  })
  const marks: Record<string, string> = {}
  for (const section of sections.value) marks[section.key] = JSON.stringify(section.items)
  snapshot.value = marks
  titleSnapshot.value = state.value?.title ?? ''
  titleDraft.value = titleSnapshot.value
  exportRows.value = detail.exports ?? []
}

function emptySections(): ResumeSection[] {
  return sectionMeta.map((meta) => ({ key: meta.key, items: [] }))
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    state.value = await getResumeState()
    preflight.value = null
    if (!state.value.exists) {
      sections.value = emptySections()
      snapshot.value = {}
      titleDraft.value = ''
      titleSnapshot.value = ''
      exportRows.value = []
    } else if (state.value.draft) {
      capture(state.value.draft)
      void refreshPreflight(state.value.draft.id)
    } else if (state.value.activeVersionId) {
      await showReadonlyVersion(state.value.activeVersionId)
    }
    await applyVersionQuery()
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

/** 深链只接受真实存在的版本 id；对不上就安静地留在默认视图，不编造只读内容。 */
async function applyVersionQuery(): Promise<void> {
  const raw = Number(route.query.version)
  if (!Number.isInteger(raw) || raw <= 0 || !state.value?.exists) return
  const target = state.value.versions.find((version) => version.id === raw)
  if (!target || target.id === draftId.value) return
  await showReadonlyVersion(target.id)
  deepLinkedVersionId.value = target.id
}

async function leavePreview(): Promise<void> {
  deepLinkedVersionId.value = null
  await router.replace({ query: { ...route.query, version: undefined } })
  await load()
}

/** 无草稿时展示已定稿版本的只读内容，不进编辑模型也不参与脏判定。 */
async function showReadonlyVersion(versionId: number): Promise<void> {
  try {
    const detail = await getResumeVersion(versionId)
    sections.value = detail.sections.map((section) => ({
      key: section.key,
      items: section.items.map((item) => ({ ...item })),
    }))
    snapshot.value = {}
    titleSnapshot.value = state.value?.title ?? ''
    titleDraft.value = titleSnapshot.value
    exportRows.value = detail.exports ?? []
  } catch (error) {
    loadError.value = problemMessage(error)
  }
}

async function refreshPreflight(versionId: number): Promise<ResumePreflight | null> {
  try {
    preflight.value = await checkResumeExport(versionId)
  } catch {
    preflight.value = null
  }
  return preflight.value
}

async function reloadState(): Promise<void> {
  state.value = await getResumeState()
}

function buildPayload(): ResumeSectionPayload[] | null {
  const errors: string[] = []
  const payload = sectionMeta.map((meta) => {
    const items: ResumeItemPayload[] = []
    sectionOf(meta.key).items.forEach((item, index) => {
      const text = (item.text ?? '').trim()
      if (!text) {
        const label = item.label?.trim()
        errors.push(`${meta.heading} 第 ${index + 1} 条${label ? `「${label}」` : ''}没有内容，请填写或删除`)
        return
      }
      const manual = item.sourceType === 'MANUAL'
      items.push({
        id: item.id,
        order: index + 1,
        kind: item.kind,
        label: item.label?.trim() || null,
        text,
        // 手工条目不得带来源 id，自动条目必须带（后端两侧都会拒）。
        source: {
          type: item.sourceType,
          refId: manual ? null : item.sourceRefId,
          label: manual ? null : item.sourceLabel,
        },
        edited: item.edited,
      })
    })
    return { key: meta.key, items }
  })
  localErrors.value = errors
  return errors.length ? null : payload
}

async function saveDraft(): Promise<ResumeVersionDetail | null> {
  if (!editing.value) {
    ElMessage.warning('当前没有草稿，请先复制一个版本为草稿')
    return null
  }
  const payload = buildPayload()
  if (!payload) return null

  saving.value = true
  try {
    const detail = await saveResumeDraft({
      sections: payload,
      expectedUpdatedAt: state.value?.draft?.updatedAt ?? null,
      title: titleDraft.value.trim() || null,
    })
    await reloadState()
    if (state.value?.draft) capture(state.value.draft)
    localErrors.value = []
    void refreshPreflight(detail.id)
    ElMessage.success('草稿已保存')
    return detail
  } catch (error) {
    if (getProblem(error).errorCode === 'STATE_CONFLICT') await handleConflict()
    else ElMessage.error(problemMessage(error))
    return null
  } finally {
    saving.value = false
  }
}

async function handleConflict(): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '简历在别处已被修改，你当前的改动没有保存。可以重新加载最新内容后再重做修改。',
      '内容已变化',
      { confirmButtonText: '重新加载', cancelButtonText: '继续编辑', type: 'warning' },
    )
    await load()
  } catch {
    /* 选择「继续编辑」时保留本地内容，不做静默覆盖 */
  }
}

async function finalizeDraft(): Promise<void> {
  if (dirty.value) return
  let summary: string | null = null
  try {
    const prompt = await ElMessageBox.prompt(
      '定稿后该版本不可再修改，需要改动时可复制为草稿。',
      '定稿',
      { inputPlaceholder: '本次改动说明（可留空）', confirmButtonText: '定稿', cancelButtonText: '取消' },
    )
    summary = prompt.value?.trim() || null
  } catch {
    return
  }

  finalizing.value = true
  try {
    const detail = await finalizeResumeDraft(summary)
    await reloadState()
    await showReadonlyVersion(detail.id)
    preflight.value = null
    ElMessage.success(`已定稿为 v${detail.versionNumber}`)
  } catch (error) {
    if (getProblem(error).errorCode === 'STATE_CONFLICT') await handleConflict()
    else ElMessage.error(problemMessage(error))
  } finally {
    finalizing.value = false
  }
}

async function bootstrap(): Promise<void> {
  bootstrapping.value = true
  try {
    const detail = await bootstrapResume(null)
    await reloadState()
    if (state.value?.draft) capture(state.value.draft)
    void refreshPreflight(detail.id)
    ElMessage.success(`初稿已生成（v${detail.versionNumber}），请核对来源后继续编辑`)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    bootstrapping.value = false
  }
}

async function copyToDraft(fromId?: number): Promise<void> {
  const target = fromId ?? state.value?.activeVersionId ?? null
  if (!target) {
    ElMessage.warning('没有可复制的已定稿版本')
    return
  }
  duplicating.value = true
  try {
    const detail = await duplicateResumeVersion(target)
    await reloadState()
    if (state.value?.draft) capture(state.value.draft)
    void refreshPreflight(detail.id)
    ElMessage.success(`已复制为 v${detail.versionNumber} 草稿`)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    duplicating.value = false
  }
}

async function setActiveVersion(versionId: number): Promise<void> {
  activatingId.value = versionId
  try {
    state.value = await setActiveResumeVersion(versionId)
    ElMessage.success('已切换当前版本')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    activatingId.value = null
  }
}

async function exportPdf(): Promise<void> {
  const versionId = draftId.value
  if (!versionId) return
  exporting.value = true
  try {
    if (dirty.value && !(await saveDraft())) return
    const check = await refreshPreflight(versionId)
    if (!check?.ready) return
    const detail = await exportResumePdf(versionId)
    exportRows.value = detail.exports ?? []
    await reloadState()
    ElMessage.success(`PDF 已生成（v${detail.versionNumber}）`)
    await download(detail.id)
  } catch (error) {
    if (getProblem(error).errorCode === 'STATE_CONFLICT') await handleConflict()
    else ElMessage.error(problemMessage(error))
  } finally {
    exporting.value = false
  }
}

async function download(versionId: number): Promise<void> {
  downloadingId.value = versionId
  try {
    const file = await downloadResumePdf(versionId)
    const url = URL.createObjectURL(file.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    downloadingId.value = null
  }
}

function addItem(key: ResumeSectionKey, kind: ResumeItemKind): void {
  const section = ensureSection(key)
  if (section.items.length >= maxItems) return
  itemSeq += 1
  section.items.push({
    id: `manual-${Date.now()}-${itemSeq}`,
    order: section.items.length + 1,
    kind,
    label: '',
    text: '',
    sourceType: 'MANUAL',
    sourceRefId: null,
    sourceLabel: null,
    edited: false,
  })
}

function removeItem(key: ResumeSectionKey, index: number): void {
  sectionOf(key).items.splice(index, 1)
}

/** 自动带入的条目被改动后要留编辑标记，来源本身不变（13 §5）。 */
function markEdited(item: ResumeItem): void {
  if (item.sourceType !== 'MANUAL') item.edited = true
}

function sourceName(item: ResumeItem): string {
  if (item.sourceType === 'MANUAL') return '手动填写'
  return item.sourceLabel || humanType(item.sourceType)
}

function humanType(type: ResumeSourceType): string {
  if (type === 'JOB_PROFILE') return '求职档案'
  if (type === 'PROJECT_FACT') return '已确认项目事实'
  if (type === 'PROJECT_VERSION') return '项目版本'
  return '手动填写'
}

function sourceRoute(item: ResumeItem): RouteLocationRaw | undefined {
  if (item.sourceType === 'JOB_PROFILE') return { name: 'job-profile' }
  // 来源只带事实主键，反查不到项目路由；跳项目资料列表而不是伪造深链。
  if (item.sourceType === 'PROJECT_FACT' || item.sourceType === 'PROJECT_VERSION') {
    return { name: 'projects' }
  }
  return undefined
}

function sourceIcon(item: ResumeItem) {
  return item.sourceType === 'MANUAL' ? PencilLine : LinkIcon
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B'
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`
}

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function onWindowBeforeUnload(event: BeforeUnloadEvent): void {
  if (!dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  window.addEventListener('beforeunload', onWindowBeforeUnload)
  void load()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onWindowBeforeUnload)
})

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('简历还有未保存的修改，离开后这些修改会丢失。', '离开页面', {
      confirmButtonText: '放弃修改并离开',
      cancelButtonText: '留在本页',
      type: 'warning',
    })
    return true
  } catch {
    return false
  }
})
</script>

<style scoped>
.resume-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
  align-items: start;
}

.resume-main,
.resume-side {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.dirty-flag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ow-accent);
  font-size: 12px;
}

.dirty-flag svg {
  width: 14px;
  height: 14px;
}

.section-card {
  overflow: hidden;
}

.dirty-dot {
  margin-left: 6px;
  padding: 1px 6px;
  color: var(--ow-accent);
  background: var(--ow-accent-soft);
  border-radius: 999px;
  font-size: 11px;
  font-style: normal;
}

.state-alert {
  margin-bottom: 2px;
}

.blocker-list {
  margin: 6px 0 0;
  padding-left: 18px;
}

.blocker-list li {
  margin: 2px 0;
}

.inline-cta {
  margin-top: 8px;
}

.item-list {
  display: grid;
  gap: 16px;
}

.empty-hint {
  margin: 0;
  font-size: 13px;
}

.item-row {
  display: grid;
  gap: 6px;
}

.item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-label {
  max-width: 260px;
}

.item-source {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 12px;
}

.item-source :deep(svg) {
  width: 13px;
  height: 13px;
  color: var(--ow-muted);
}

.source-link {
  color: var(--ow-primary);
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

.readonly-text {
  margin: 0;
  color: var(--ow-ink-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.version-body,
.export-body {
  display: grid;
  gap: 12px;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  color: var(--ow-muted);
  font-size: 12px;
}

.version-list,
.export-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.version-list li {
  padding-top: 12px;
  border-top: 1px solid var(--ow-line-soft);
}

.version-list li:first-child {
  padding-top: 0;
  border-top: 0;
}

.version-list li.active .version-line b {
  color: var(--ow-primary);
}

.version-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-meta {
  margin-top: 3px;
  color: var(--ow-muted);
  font-size: 12px;
}

.version-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 4px;
}

.export-list li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.export-reason {
  flex-basis: 100%;
  margin: 0;
  color: var(--ow-danger);
}

.bootstrap-hint {
  border-top: 1px solid var(--ow-line-soft);
}

.source-list {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.source-list b {
  margin-right: 8px;
}

@media (max-width: 1024px) {
  .resume-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .item-head {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .item-source {
    margin-left: 0;
    flex-basis: 100%;
  }

  .item-label {
    max-width: none;
    flex: 1;
  }
}
</style>
