<template>
  <div class="page study-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">成长 / 复习计划</div>
        <h1><CircleCheckBig aria-hidden="true" /> 复习计划</h1>
        <div class="sub">来自报告自动生成与手工创建 · 连接后端真实任务</div>
      </div>
      <div class="acts">
        <el-button :icon="Plus" @click="createOpen = true">新建任务</el-button>
      </div>
    </header>

    <ErrorState v-if="error" :message="error" :retry="load" />

    <div v-else class="study-grid">
      <div class="ow-card col8">
        <div class="ow-card-h">
          <div class="ic b1"><ListChecks aria-hidden="true" /></div>
          复习任务
          <div class="right">{{ completedCount }}/{{ tasks.length }} 完成</div>
        </div>
        <div class="ow-card-b">
          <div style="margin-bottom: 12px;">
            <div class="ow-prog green"><i :style="{ width: `${completionPercent}%` }" /></div>
          </div>
          <div v-if="!tasks.length" class="ow-empty-state">
            <div class="ic">📚</div>
            <div class="t">还没有复习任务</div>
            <div class="d">完成一场面试并在报告页点击「按报告生成复习任务」，或手工新建。</div>
          </div>
          <div v-else class="ow-tlist">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="ow-titem"
              :class="{ done: task.status === 'COMPLETED' }"
            >
              <span class="ow-status" :class="statusClass(task.status)">{{ statusLabel(task.status) }}</span>
              <div class="grow">
                <div class="tt">{{ task.title }}</div>
                <div class="ow-tm">
                  来源 {{ sourceLabel(task.sourceType) }}
                  <template v-if="task.dueDate"> · 截止 {{ task.dueDate }}</template>
                  <template v-if="task.estimatedMinutes"> · 约 {{ task.estimatedMinutes }} 分钟</template>
                </div>
              </div>
              <button
                v-if="task.status === 'PLANNED' || task.status === 'IN_PROGRESS'"
                class="ow-btn xs"
                type="button"
                @click="complete(task)"
              >
                完成
              </button>
              <button
                v-if="task.status === 'PLANNED'"
                class="ow-btn xs ghost"
                type="button"
                @click="skip(task)"
              >
                跳过
              </button>
              <button class="ow-btn xs ghost danger-btn" type="button" aria-label="删除" @click="remove(task)">
                ✕
              </button>
            </div>
          </div>
          <div class="ow-hint">
            报告自动生成的任务按标题幂等；完成/跳过/删除直接写库（真实后端）。
          </div>
        </div>
      </div>

      <div class="ow-card col4">
        <div class="ow-card-h">
          <div class="ic b3"><Target aria-hidden="true" /></div>
          掌握度概览
        </div>
        <div class="ow-card-b">
          <div class="mastery-total">
            <span>总体完成度</span>
            <b>{{ completionPercent }}%</b>
          </div>
          <div class="ow-prog" style="margin-top: 5px;"><i :style="{ width: `${completionPercent}%` }" /></div>
          <div v-for="stat in statusCounts" :key="stat.status" class="dim">
            <div class="name">{{ statusLabel(stat.status) }}</div>
            <div class="track"><i class="green" :style="{ width: `${percentOf(stat.count)}%` }" /></div>
            <div class="score">{{ stat.count }}</div>
          </div>
          <div class="ow-hint">真实熟练度将在能力数据（CapabilityRecord）落地后按报告与练习记录计算。</div>
        </div>
      </div>
    </div>

    <el-dialog v-model="createOpen" title="新建复习任务" width="min(480px, calc(100vw - 32px))" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="任务标题" required>
          <el-input v-model="draft.title" maxlength="255" placeholder="如：复盘 Redis 双写一致性" />
        </el-form-item>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <el-form-item label="优先级">
            <el-select v-model="draft.priority">
              <el-option label="高" value="HIGH" />
              <el-option label="中" value="MEDIUM" />
              <el-option label="低" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计分钟">
            <el-input-number v-model="draft.estimatedMinutes" :min="5" :max="480" :step="5" />
          </el-form-item>
        </div>
        <el-form-item label="截止日期">
          <el-date-picker v-model="draft.dueDate" type="date" value-format="YYYY-MM-DD" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createOpen = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createTask">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { CircleCheckBig, ListChecks, Plus, Target } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  completeTask,
  createStudyTask,
  deleteTask,
  listStudyTasks,
  skipTask,
  type StudyTask,
  type StudyTaskStatus,
} from '@/api/interview'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const tasks = ref<StudyTask[]>([])
const error = ref('')
const loading = ref(true)
const createOpen = ref(false)
const creating = ref(false)

const draft = reactive({
  title: '',
  priority: 'MEDIUM',
  estimatedMinutes: 30,
  dueDate: null as string | null,
})

const completedCount = computed(() => tasks.value.filter((task) => task.status === 'COMPLETED').length)
const completionPercent = computed(() =>
  tasks.value.length ? Math.round((completedCount.value / tasks.value.length) * 100) : 0,
)

const statusCounts = computed(() => {
  const order: StudyTaskStatus[] = ['IN_PROGRESS', 'PLANNED', 'POSTPONED', 'COMPLETED', 'SKIPPED']
  return order.map((status) => ({
    status,
    count: tasks.value.filter((task) => task.status === status).length,
  }))
})

function percentOf(count: number): number {
  return tasks.value.length ? Math.round((count / tasks.value.length) * 100) : 0
}

function statusLabel(status: StudyTaskStatus): string {
  const map: Record<StudyTaskStatus, string> = {
    PLANNED: '计划中', IN_PROGRESS: '进行中', COMPLETED: '已完成', POSTPONED: '已延期', SKIPPED: '已跳过',
  }
  return map[status] ?? status
}

function statusClass(status: StudyTaskStatus): string {
  if (status === 'COMPLETED') return 'ok'
  if (status === 'IN_PROGRESS') return 'run'
  if (status === 'PLANNED') return 'wait'
  return 'off'
}

function sourceLabel(source: StudyTask['sourceType']): string {
  const map = { MANUAL: '手工创建', REPORT: '面试报告', WORKBENCH: '工作台' } as const
  return map[source] ?? source
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    tasks.value = await listStudyTasks()
  } catch (loadError) {
    error.value = problemMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function complete(task: StudyTask): Promise<void> {
  try {
    const updated = await completeTask(task.id)
    replace(updated)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function skip(task: StudyTask): Promise<void> {
  try {
    const updated = await skipTask(task.id)
    replace(updated)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function remove(task: StudyTask): Promise<void> {
  try {
    await deleteTask(task.id)
    tasks.value = tasks.value.filter((item) => item.id !== task.id)
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  }
}

async function createTask(): Promise<void> {
  if (!draft.title.trim()) {
    ElMessage.warning('请填写任务标题')
    return
  }
  creating.value = true
  try {
    const created = await createStudyTask({
      title: draft.title.trim(),
      priority: draft.priority,
      estimatedMinutes: draft.estimatedMinutes ?? undefined,
      dueDate: draft.dueDate,
    })
    createOpen.value = false
    draft.title = ''
    tasks.value = [created, ...tasks.value]
    ElMessage.success('任务已创建')
  } catch (submitError) {
    ElMessage.error(problemMessage(submitError))
  } finally {
    creating.value = false
  }
}

function replace(updated: StudyTask): void {
  const index = tasks.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) tasks.value[index] = updated
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.study-page {
  display: grid;
  gap: 18px;
}

.study-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.study-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

.grow {
  flex: 1;
  min-width: 0;
}

.ow-titem .tt {
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
}

.ow-titem.done .tt {
  color: var(--muted);
  text-decoration: line-through;
}

.mastery-total {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
}

.mastery-total b {
  color: var(--ink);
}

.dim {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.dim .name {
  width: 72px;
  flex: 0 0 72px;
  color: var(--ink-2);
  font-size: 12.5px;
  font-weight: 600;
}

.dim .track {
  flex: 1;
  height: 9px;
  background: var(--line-2);
  border-radius: 6px;
  overflow: hidden;
}

.dim .track i.green {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--green), #4cc585);
}

.dim .score {
  width: 30px;
  flex: 0 0 30px;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 800;
  text-align: right;
}

.danger-btn {
  color: var(--red-600);
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}
</style>
