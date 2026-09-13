<template>
  <div class="page map-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1><Map aria-hidden="true" /> 求职进度</h1>
        <div class="sub">站内投递记录与阶段推进 · 不连接招聘网站 · 阶段变化留有流水</div>
      </div>
      <div class="acts">
        <el-button :icon="Plus" @click="createOpen = true">新增投递</el-button>
      </div>
    </header>

    <ErrorState v-if="error" :message="error" :retry="load" />

    <template v-else>
      <section class="pipeline surface-pipeline">
        <div
          v-for="stage in stageCards"
          :key="stage.value"
          class="pipeline-stage"
          :class="{ active: stage.count > 0 }"
        >
          <span>{{ stage.label }}</span>
          <strong>{{ stage.count }}</strong>
        </div>
      </section>

      <section class="surface">
        <div class="surface-header">
          <div>
            <h2 class="surface-title">投递记录</h2>
            <span class="surface-subtitle">
              {{ items.length }} 条在档
              <template v-if="archivedCount"> · {{ archivedCount }} 条已归档</template>
            </span>
          </div>
          <div class="toolbar">
            <el-switch
              v-model="showArchived"
              active-text="含归档"
              @change="load"
            />
            <el-input
              v-model="keyword"
              :prefix-icon="Search"
              clearable
              placeholder="搜索公司或岗位"
              style="width: 220px"
            />
          </div>
        </div>

        <el-alert
          v-if="focusNotice"
          class="focus-notice"
          type="info"
          closable
          show-icon
          :title="focusNotice"
          @close="focusNotice = ''"
        />

        <div v-if="loading" class="page-feedback"><el-skeleton :rows="6" animated /></div>
        <EmptyState
          v-else-if="!filtered.length"
          title="还没有投递记录"
          description="新增一条投递，跟踪从关注到 Offer 的每一步阶段变化。"
          :icon="BriefcaseBusiness"
        >
          <el-button type="primary" @click="createOpen = true">新增投递</el-button>
        </EmptyState>
        <div v-else class="app-list">
          <article
            v-for="item in filtered"
            :id="`app-row-${item.id}`"
            :key="item.id"
            class="app-row"
            :class="{ focused: item.id === focusId }"
          >
            <span class="company-mark">{{ item.company.slice(0, 1) }}</span>
            <div class="app-copy">
              <div class="app-title">
                <strong>{{ item.company }} · {{ item.role }}</strong>
                <span class="ow-status" :class="stageClass(item.stage)">{{ stageLabel(item.stage) }}</span>
                <span v-if="item.archived" class="ow-tag gray">已归档</span>
              </div>
              <p class="app-meta">
                <template v-if="item.applyDate">投递 {{ item.applyDate }} · </template>
                <template v-if="item.interviewDate">面试 {{ item.interviewDate }} · </template>
                <template v-if="item.salaryNote">{{ item.salaryNote }} · </template>
                {{ item.note ?? item.jdSummary ?? '暂无备注' }}
              </p>
            </div>
            <div class="app-actions">
              <el-select
                :model-value="item.stage"
                size="small"
                style="width: 104px"
                @change="(stage: ApplicationStage) => advance(item, stage)"
              >
                <el-option
                  v-for="stage in APPLICATION_STAGES"
                  :key="stage.value"
                  :label="stage.label"
                  :value="stage.value"
                />
              </el-select>
              <el-button text size="small" @click="toggleArchive(item)">
                {{ item.archived ? '取消归档' : '归档' }}
              </el-button>
              <el-button text size="small" type="danger" @click="remove(item)">删除</el-button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <el-dialog v-model="createOpen" title="新增投递" width="min(560px, calc(100vw - 32px))" destroy-on-close>
      <el-form label-position="top">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <el-form-item label="公司" required>
            <el-input v-model="draft.company" maxlength="128" placeholder="公司名" />
          </el-form-item>
          <el-form-item label="岗位" required>
            <el-input v-model="draft.role" maxlength="128" placeholder="如：Java 后端" />
          </el-form-item>
        </div>
        <el-form-item label="JD 摘要">
          <el-input v-model="draft.jdSummary" type="textarea" :rows="3" placeholder="核心要求与关键词（可选）" />
        </el-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <el-form-item label="当前阶段">
            <el-select v-model="draft.stage">
              <el-option
                v-for="stage in APPLICATION_STAGES"
                :key="stage.value"
                :label="stage.label"
                :value="stage.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="投递日期">
            <el-date-picker v-model="draft.applyDate" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
          </el-form-item>
          <el-form-item label="面试日期">
            <el-date-picker v-model="draft.interviewDate" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
          </el-form-item>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <el-form-item label="来源">
            <el-input v-model="draft.source" maxlength="64" placeholder="如：内推 / 官网（可选）" />
          </el-form-item>
          <el-form-item label="薪资备注">
            <el-input v-model="draft.salaryNote" maxlength="128" placeholder="如：25k-35k（可选）" />
          </el-form-item>
        </div>
        <el-form-item label="备注">
          <el-input v-model="draft.note" maxlength="512" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="create">添加记录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { BriefcaseBusiness, Map, Plus, Search } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  APPLICATION_STAGES,
  advanceStage,
  archiveApplication,
  createApplication,
  deleteApplication,
  listApplications,
  stageLabel,
  unarchiveApplication,
  type ApplicationStage,
  type JobApplication,
} from '@/api/jobApplications'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'

const route = useRoute()

const items = ref<JobApplication[]>([])
const focusId = ref<number | null>(null)
const focusNotice = ref('')
const archivedCount = ref(0)
const error = ref('')
const loading = ref(true)
const createOpen = ref(false)
const creating = ref(false)
const keyword = ref('')
const showArchived = ref(false)

const draft = reactive({
  company: '',
  role: '',
  jdSummary: '',
  source: '',
  applyDate: null as string | null,
  interviewDate: null as string | null,
  stage: 'APPLIED' as ApplicationStage,
  salaryNote: '',
  note: '',
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return items.value
  return items.value.filter((item) =>
    `${item.company}${item.role}`.toLowerCase().includes(kw),
  )
})

const stageCards = computed(() => {
  const counts: Record<ApplicationStage, number> = {
    WATCHING: 0, APPLIED: 0, WRITTEN_TEST: 0,
    INTERVIEWING: 0, HR: 0, OFFER: 0, CLOSED: 0,
  }
  items.value.forEach((item) => {
    counts[item.stage] += 1
  })
  return APPLICATION_STAGES.map((stage) => ({
    value: stage.value,
    label: stage.label,
    count: counts[stage.value],
  }))
})

function stageClass(stage: ApplicationStage): string {
  if (stage === 'OFFER') return 'ok'
  if (stage === 'CLOSED') return 'off'
  if (stage === 'WATCHING') return 'off'
  return 'run'
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [active, all] = await Promise.all([
      listApplications(false),
      listApplications(true),
    ])
    items.value = showArchived.value
      ? all.items
      : active.items
    archivedCount.value = all.items.filter((item) => item.archived).length
    await applyFocus()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

/** ?focus= 深链：岗位与 JD 匹配页关联了某条投递后跳过来要能真的定位到它，不能只跳列表。 */
async function applyFocus(): Promise<void> {
  const raw = Number(route.query.focus)
  if (!Number.isInteger(raw) || raw <= 0) return
  focusId.value = raw
  const hit = items.value.some((item) => item.id === raw)
  focusNotice.value = hit
    ? '已定位到岗位对照里关联的这条投递记录。'
    : '关联的投递记录不在当前列表里（可能已归档或删除）。可打开右上「含归档」再找。'
  if (hit) {
    await nextTick()
    document.getElementById(`app-row-${raw}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

async function advance(item: JobApplication, stage: ApplicationStage): Promise<void> {
  if (stage === item.stage) return
  try {
    const updated = await advanceStage(item.id, stage, '页面阶段调整')
    replace(updated)
    ElMessage.success(`「${item.company}」推进到「${stageLabel(stage)}」`)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
    await load()
  }
}

async function toggleArchive(item: JobApplication): Promise<void> {
  try {
    if (item.archived) {
      await unarchiveApplication(item.id)
    } else {
      await archiveApplication(item.id)
    }
    await load()
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function remove(item: JobApplication): Promise<void> {
  try {
    await deleteApplication(item.id)
    items.value = items.value.filter((entry) => entry.id !== item.id)
    ElMessage.success('已删除')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function create(): Promise<void> {
  if (!draft.company.trim() || !draft.role.trim()) {
    ElMessage.warning('请填写公司与岗位')
    return
  }
  creating.value = true
  try {
    const created = await createApplication({
      company: draft.company.trim(),
      role: draft.role.trim(),
      jdSummary: draft.jdSummary.trim() || undefined,
      source: draft.source.trim() || undefined,
      applyDate: draft.applyDate,
      interviewDate: draft.interviewDate,
      stage: draft.stage,
      salaryNote: draft.salaryNote.trim() || undefined,
      note: draft.note.trim() || undefined,
    })
    createOpen.value = false
    resetDraft()
    items.value = [created, ...items.value]
    ElMessage.success('投递记录已添加')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    creating.value = false
  }
}

function resetDraft(): void {
  draft.company = ''
  draft.role = ''
  draft.jdSummary = ''
  draft.source = ''
  draft.applyDate = null
  draft.interviewDate = null
  draft.stage = 'APPLIED'
  draft.salaryNote = ''
  draft.note = ''
}

function replace(updated: JobApplication): void {
  const index = items.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) items.value[index] = updated
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.map-page {
  display: grid;
  gap: 18px;
}

.map-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.pipeline {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 16px;
  background: var(--ow-surface);
  border: 1px solid var(--ow-line-soft);
  border-radius: var(--ow-radius);
}

.pipeline-stage {
  display: grid;
  gap: 2px;
  padding: 10px 6px;
  color: var(--muted);
  text-align: center;
  background: var(--surface-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
  font-size: var(--fs-xs);
  font-weight: 700;
}

.pipeline-stage strong {
  color: var(--ink);
  font-size: var(--fs-md);
  font-weight: 900;
}

.pipeline-stage.active {
  color: var(--brand-700);
  background: linear-gradient(180deg, var(--brand-50), var(--brand-100));
  border-color: var(--brand-200);
}

.surface-header {
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-list {
  display: grid;
  padding: 4px 16px 12px;
}

.app-row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 76px;
  padding: 8px 0;
  border-bottom: 1px solid var(--ow-line-soft);
}

.app-row:last-child {
  border-bottom: 0;
}

.app-row.focused {
  background: var(--brand-50);
}

.focus-notice {
  margin-bottom: 8px;
}

.company-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: #16634f;
  background: linear-gradient(180deg, var(--brand-50), var(--brand-100));
  border-radius: 12px;
  font-weight: 800;
}

.app-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.app-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-title strong {
  overflow: hidden;
  color: var(--ow-ink-secondary);
  font-size: var(--fs-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-meta {
  margin: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: var(--fs-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 860px) {
  .pipeline {
    grid-template-columns: repeat(4, 1fr);
  }

  .app-row {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .app-actions {
    grid-column: 2;
  }
}
</style>
