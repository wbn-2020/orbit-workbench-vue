<template>
  <div class="ws" :aria-busy="loading">
    <header class="ws-head">
      <div>
        <p class="ws-eyebrow">工作沉淀模式</p>
        <h1>工作记录与知识蒸馏</h1>
        <p class="ws-sub">
          记录每日工作中的项目、故障、决策与学习，再一键蒸馏为可复用知识卡片，避免经验随项目流失。
        </p>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <p v-else-if="loading" class="ws-loading">正在加载工作记录…</p>

    <div class="ws-grid">
      <section class="ws-main">
        <div class="ws-card">
          <h2 class="ws-card-title">知识卡片</h2>
          <p class="ws-kc-sub">由工作记录蒸馏而来，是你可复用的个人知识资产。点击卡片可编辑标题、摘要与标签。</p>
          <div v-if="lastCard" class="card-flash">
            <Sparkles aria-hidden="true" />
            <div>
              <strong>刚蒸馏：{{ lastCard.title }}</strong>
              <p>{{ lastCard.summary }}</p>
            </div>
          </div>
          <ul class="kc-list">
            <li v-for="card in cards" :key="card.id" class="kc-item">
              <button class="kc-open" type="button" :aria-label="`编辑知识卡片 ${card.title}`" @click="openEditor(card)">
                <span class="kc-title">
                  {{ card.title }}
                  <span v-if="card.nextReviewDate" class="kc-review-badge" :class="{ due: isDue(card.nextReviewDate) }">
                    {{ reviewLabel(card.nextReviewDate) }}
                  </span>
                </span>
                <span class="kc-summary">{{ card.summary }}</span>
                <span class="kc-tags">
                  <span v-for="tag in card.tags" :key="tag" class="kc-tag">{{ tag }}</span>
                </span>
              </button>
              <button class="ws-btn ghost" type="button" :disabled="reviewingId !== null" @click="review(card)">
                <CheckCircle2 aria-hidden="true" /> {{ reviewingId === card.id ? '记录中…' : '记一次回顾' }}
              </button>
            </li>
            <li v-if="!cards.length" class="kc-empty">
              还没有知识卡片。从右侧挑一条工作记录点「蒸馏为知识卡片」，它就会成为你的第一张资产。
            </li>
          </ul>
        </div>
      </section>

      <aside class="ws-side">
        <div class="ws-card">
          <h2 class="ws-card-title">新建工作记录</h2>
          <div class="ws-form">
            <input
              v-model="form.title"
              class="ws-input"
              placeholder="标题，例如：排查生产环境订单超时"
              aria-label="工作记录标题"
            />
            <textarea
              v-model="form.content"
              class="ws-textarea"
              placeholder="过程、根因、决策与结论……"
              aria-label="工作记录内容"
              rows="4"
            />
            <div class="ws-form-row">
              <select v-model="form.category" class="ws-select" aria-label="类别">
                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <button
                class="ws-btn primary"
                type="button"
                :disabled="!canSubmit || submitting"
                @click="submit"
              >
                <Plus aria-hidden="true" /> {{ submitting ? '添加中…' : '添加记录' }}
              </button>
            </div>
          </div>
        </div>

        <div class="ws-card">
          <h2 class="ws-card-title">工作记录</h2>
          <ul class="log-list">
            <li v-for="log in logs" :key="log.id" class="log-item">
              <div class="log-head">
                <span class="log-cat" :class="log.category">{{ categoryLabel(log.category) }}</span>
                <span class="log-title">{{ log.title }}</span>
                <span v-if="log.distilled" class="log-done">
                  <CheckCircle2 aria-hidden="true" /> 已蒸馏
                </span>
              </div>
              <p class="log-content">{{ log.content }}</p>
              <div v-if="distillErrors[log.id]" class="log-distill-error" role="alert">
                <CircleAlert aria-hidden="true" />
                <span class="err-text">蒸馏失败：{{ distillErrors[log.id] }}</span>
                <button class="err-retry" type="button" @click="distill(log.id)">重试</button>
              </div>
              <div class="log-actions">
                <button
                  class="ws-btn ghost"
                  type="button"
                  :disabled="log.distilled || distillingId === log.id"
                  @click="distill(log.id)"
                >
                  <FlaskConical aria-hidden="true" />
                  {{ distillingId === log.id ? '蒸馏中…' : '蒸馏为知识卡片' }}
                </button>
              </div>
            </li>
            <li v-if="!logs.length" class="log-empty">还没有工作记录，先添加一条吧。</li>
          </ul>
        </div>
      </aside>
    </div>

    <el-dialog
      v-model="editorOpen"
      title="编辑知识卡片"
      width="min(560px, 92vw)"
      :aria-label="'编辑知识卡片'"
    >
      <div class="kc-editor">
        <label class="kc-field">
          <span>标题</span>
          <input v-model="editorForm.title" class="ws-input" aria-label="卡片标题" maxlength="255" />
        </label>
        <label class="kc-field">
          <span>摘要</span>
          <textarea v-model="editorForm.summary" class="ws-textarea" rows="4" aria-label="卡片摘要" maxlength="2000" />
        </label>
        <label class="kc-field">
          <span>标签（用顿号或逗号分隔，最多 8 个）</span>
          <input v-model="editorForm.tagsText" class="ws-input" aria-label="卡片标签" />
        </label>
        <p v-if="editingCard?.sourceLogId" class="kc-source">蒸馏自工作记录，来源关系不可更改。</p>
      </div>
      <template #footer>
        <button class="ws-btn ghost" type="button" @click="editorOpen = false">取消</button>
        <button class="ws-btn primary" type="button" :disabled="editorSaving" @click="saveEditor">
          {{ editorSaving ? '保存中…' : '保存' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CheckCircle2, CircleAlert, FlaskConical, Plus, Sparkles } from 'lucide-vue-next'
import {
  createWorkLog,
  distillWorkLog,
  listKnowledgeCards,
  listWorkLogs,
  updateKnowledgeCard,
} from '@/api/worklogs'
import type { KnowledgeCard, WorkLog, WorkLogCategory } from '@/api/types'
import ErrorState from '@/components/ErrorState.vue'
import { problemMessage } from '@/api/http'
import { reviewCard } from '@/api/knowledgeOverview'

const reviewingId = ref<string | null>(null)
async function review(card: KnowledgeCard): Promise<void> {
  if (reviewingId.value) return
  reviewingId.value = card.id
  try {
    const updated = await reviewCard(card.id)
    Object.assign(card, updated)
    ElMessage.success('已记录回顾，下次复习日期已更新')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    reviewingId.value = null
  }
}

const logs = ref<WorkLog[]>([])
const cards = ref<KnowledgeCard[]>([])
const distillingId = ref<string | null>(null)
/** 每条工作记录的蒸馏失败信息：内联呈现在记录卡上，不再只靠短暂 toast。 */
const distillErrors = ref<Record<string, string>>({})
const lastCard = ref<KnowledgeCard | null>(null)
const loading = ref(false)
const loadError = ref('')
const submitting = ref(false)
const editorOpen = ref(false)
const editorSaving = ref(false)
const editingCard = ref<KnowledgeCard | null>(null)
const editorForm = reactive<{ title: string; summary: string; tagsText: string }>({
  title: '',
  summary: '',
  tagsText: '',
})

const form = reactive<{ title: string; content: string; category: WorkLogCategory }>({
  title: '',
  content: '',
  category: 'project',
})

const categoryOptions: { value: WorkLogCategory; label: string }[] = [
  { value: 'project', label: '项目' },
  { value: 'incident', label: '故障' },
  { value: 'decision', label: '决策' },
  { value: 'learning', label: '学习' },
  { value: 'other', label: '其他' },
]

function reviewLabel(date: string): string {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return `已到期 ${-days} 天`
  if (days === 0) return '今天回顾'
  return `${days} 天后回顾`
}

function isDue(date: string): boolean {
  const target = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return target.getTime() <= today.getTime()
}

function categoryLabel(value: WorkLogCategory): string {
  return categoryOptions.find((o) => o.value === value)?.label ?? value
}

const canSubmit = computed(() => form.title.trim().length > 0 && form.content.trim().length > 0)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const [logRes, cardRes] = await Promise.all([listWorkLogs(), listKnowledgeCards()])
    logs.value = logRes
    cards.value = cardRes
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

async function submit(): Promise<void> {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await createWorkLog({ ...form })
    form.title = ''
    form.content = ''
    form.category = 'project'
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    submitting.value = false
  }
}

async function distill(id: string): Promise<void> {
  distillingId.value = id
  delete distillErrors.value[id]
  try {
    const card = await distillWorkLog(id)
    lastCard.value = card
    await load()
  } catch (error) {
    // 失败必须留在记录卡上：用户等了几秒 AI 调用，toast 一闪而过等于什么都没发生。
    distillErrors.value[id] = problemMessage(error)
  } finally {
    distillingId.value = null
  }
}

function openEditor(card: KnowledgeCard): void {
  editingCard.value = card
  editorForm.title = card.title
  editorForm.summary = card.summary
  editorForm.tagsText = card.tags.join('、')
  editorOpen.value = true
}

async function saveEditor(): Promise<void> {
  if (!editingCard.value || editorSaving.value) return
  if (!editorForm.title.trim() || !editorForm.summary.trim()) {
    ElMessage.warning('标题和摘要不能为空')
    return
  }
  editorSaving.value = true
  try {
    await updateKnowledgeCard(editingCard.value.id, {
      title: editorForm.title,
      summary: editorForm.summary,
      tags: editorForm.tagsText
        .split(/[、,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
    })
    editorOpen.value = false
    ElMessage.success('知识卡片已更新')
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    editorSaving.value = false
  }
}

function handleFocusSaved(): void {
  void load()
}

onMounted(() => {
  void load()
  window.addEventListener('focus-session-saved', handleFocusSaved)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus-session-saved', handleFocusSaved)
})
</script>

<style scoped>
.ws {
  display: grid;
  gap: 22px;
}

.ws-loading {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.ws-head .ws-eyebrow {
  margin: 0 0 6px;
  color: var(--ow-eyebrow, #16634f);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

.ws-head h1 {
  margin: 0;
  color: var(--ink);
  font-size: 22px;
  font-weight: 800;
}

.ws-sub {
  margin: 10px 0 0;
  max-width: 60ch;
  color: var(--ow-muted, #5c7268);
  font-size: 14px;
  line-height: 1.6;
}

.ws-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.ws-main {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.ws-card {
  padding: 20px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
}

.ws-card-title {
  margin: 0 0 14px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.ws-form {
  display: grid;
  gap: 12px;
}

.ws-input,
.ws-textarea,
.ws-select {
  width: 100%;
  padding: 11px 13px;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--line-2);
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.ws-textarea {
  resize: vertical;
}

.ws-input:focus,
.ws-textarea:focus,
.ws-select:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 4px var(--brand-50, rgb(31 111 92 / 12%));
}

.ws-form-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ws-select {
  width: auto;
  flex: none;
}

.ws-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--glass);
  color: var(--ink-2);
}

.ws-btn svg {
  width: 16px;
  height: 16px;
}

.ws-btn.primary {
  color: #fff;
  background: linear-gradient(135deg, var(--btn-1, #1fa879), var(--btn-2, #15805f));
  border-color: transparent;
  box-shadow: 0 6px 16px rgb(31 111 92 / 30%);
}

.ws-btn.ghost {
  color: var(--brand-700, #1f6f5c);
  background: var(--brand-50, rgb(31 111 92 / 12%));
  border-color: var(--brand-200, rgb(31 111 92 / 20%));
}

.ws-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ws-btn:not(:disabled):hover {
  filter: brightness(1.05);
}

.log-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.log-item {
  padding: 14px 16px;
  border: 1px solid var(--line-2);
  border-radius: 12px;
}

.log-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.log-cat {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: var(--glass);
  color: var(--muted);
}

.log-cat.incident {
  color: #b91c1c;
  background: rgb(185 28 28 / 12%);
}

.log-cat.decision {
  color: #7c3aed;
  background: rgb(124 58 237 / 12%);
}

.log-cat.learning {
  color: #d97706;
  background: rgb(217 119 6 / 12%);
}

.log-title {
  flex: 1;
  min-width: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.log-done {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--green, #16a34a);
  font-size: 12px;
  font-weight: 700;
}

.log-done svg {
  width: 14px;
  height: 14px;
}

.log-content {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}

.log-distill-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--ow-danger, #b42318);
  border-radius: 12px;
  background: var(--ow-danger-soft, rgb(180 35 24 / 8%));
  font-size: 12px;
}

.log-distill-error svg {
  width: 15px;
  height: 15px;
  flex: none;
  color: var(--ow-danger, #b42318);
}

.log-distill-error .err-text {
  flex: 1;
  min-width: 0;
  color: var(--ow-danger, #b42318);
  font-weight: 600;
  line-height: 1.5;
}

.log-distill-error .err-retry {
  flex: none;
  padding: 3px 10px;
  border: 1px solid var(--ow-danger, #b42318);
  border-radius: 12px;
  background: transparent;
  color: var(--ow-danger, #b42318);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.log-distill-error .err-retry:hover {
  background: var(--ow-danger, #b42318);
  color: #fff;
}

.log-empty,
.kc-empty {
  color: var(--muted);
  font-size: 14px;
}

.ws-side {
  position: sticky;
  top: 90px;
}

.card-flash {
  display: flex;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--brand-50, rgb(31 111 92 / 10%));
  border: 1px solid var(--brand-200, rgb(31 111 92 / 20%));
  border-radius: 12px;
}

.card-flash svg {
  width: 18px;
  height: 18px;
  flex: none;
  color: var(--brand);
  margin-top: 2px;
}

.card-flash strong {
  color: var(--ink);
  font-size: 14px;
}

.card-flash p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.kc-open {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 12px;
  background: var(--ow-surface, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, box-shadow .15s ease;
}

.kc-open:hover {
  border-color: var(--ow-primary, #27b389);
  box-shadow: var(--ow-shadow-sm, 0 1px 2px rgb(15 23 42 / 6%));
}

.kc-kc-sub,
.ws-kc-sub {
  margin: 4px 0 12px;
  color: var(--ow-muted, #5c7268);
  font-size: 14px;
  line-height: 1.6;
}

.kc-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--ow-ink-secondary, #3f574c);
  font-size: 14px;
  font-weight: 600;
}

.kc-source {
  margin: 0;
  color: var(--ow-muted, #5c7268);
  font-size: 12px;
}

.kc-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.kc-item {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--line-2);
  border-radius: 12px;
}

.kc-title {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.kc-summary {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}

.kc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.kc-tag {
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--glass);
  color: var(--faint);
  font-size: 12px;
}

@media (max-width: 980px) {
  .ws-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ws-side {
    position: static;
  }
}

.kc-review-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--ow-status-neutral-bg, var(--surface-2, #eef2f0));
  color: var(--ow-status-neutral-text, #52685e);
  font-size: 12px;
  font-weight: 700;
}

.kc-review-badge.due {
  background: var(--ow-status-warning-bg, #fdf3df);
  color: var(--ow-status-warning-text, #7d5400);
}
</style>
