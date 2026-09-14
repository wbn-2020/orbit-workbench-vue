<template>
  <div class="page craft-page">
    <header class="ow-page-top">
      <div>
        <OwCrumb />
        <h1><Hammer aria-hidden="true" /> 本事库</h1>
        <div class="sub">
          可复用的做法：讲述结构、话术模板、执行套路、复盘方法。区别于知识块（技术点）与画像事实（我是谁）——这里存「怎么做这类事」。
        </div>
      </div>
      <div class="acts">
        <el-button :icon="Plus" @click="startCreate">手动录入</el-button>
        <el-button type="primary" :icon="WandSparkles" :loading="distilling" @click="distill">
          提炼套路
        </el-button>
      </div>
    </header>

    <ErrorState v-if="error" :message="error" :retry="load" />

    <template v-else>
      <div v-if="pending.length" class="ow-card">
        <div class="ow-card-h">
          <div class="ic b2"><WandSparkles aria-hidden="true" /></div>
          待确认建议
          <div class="right">AI 提炼的套路，确认后才进库</div>
        </div>
        <div class="ow-card-b">
          <ul class="craft-list">
            <li v-for="note in pending" :key="note.id" class="craft-item analyzed">
              <div class="craft-line">
                <span class="craft-cat">{{ categoryLabel(note.category) }}</span>
                <span class="craft-title">{{ note.title }}</span>
                <span class="craft-origin">
                  AI 建议<template v-if="note.confidence != null"> · 置信 {{ note.confidence }}</template>
                </span>
              </div>
              <p class="craft-when">用在哪：{{ note.whenToUse }}</p>
              <pre class="craft-content">{{ note.content }}</pre>
              <div class="craft-acts">
                <el-button size="small" type="primary" :loading="busyId === note.id" @click="confirmNote(note)">
                  确认入库
                </el-button>
                <el-button size="small" :loading="busyId === note.id" @click="archive(note)">忽略</el-button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="ow-card">
        <div class="ow-card-h">
          <div class="ic b1"><Hammer aria-hidden="true" /></div>
          已入库套路
          <div class="right">{{ confirmed.length }} 条</div>
        </div>
        <div class="ow-card-b">
          <div v-if="loading" class="ow-empty">加载中…</div>
          <div v-else-if="!confirmed.length" class="ow-empty-state">
            <div class="ic">🧰</div>
            <div class="t">还没有套路</div>
            <div class="d">点「提炼套路」从你的工作记录与面试结论里提炼，或手动录入一条你自己总结的方法。</div>
          </div>
          <ul v-else class="craft-list">
            <li v-for="note in confirmed" :key="note.id" class="craft-item">
              <div class="craft-line">
                <button
                  class="pin-btn"
                  type="button"
                  :class="{ on: note.pinned }"
                  :aria-label="note.pinned ? '取消置顶' : '置顶'"
                  :title="note.pinned ? '取消置顶' : '置顶'"
                  @click="togglePin(note)"
                >
                  <Pin aria-hidden="true" />
                </button>
                <span class="craft-cat">{{ categoryLabel(note.category) }}</span>
                <span class="craft-title">{{ note.title }}</span>
                <span v-if="note.tags.length" class="craft-tags">
                  <span v-for="tag in note.tags" :key="tag" class="craft-tag">{{ tag }}</span>
                </span>
              </div>
              <p class="craft-when">用在哪：{{ note.whenToUse }}</p>
              <pre class="craft-content">{{ note.content }}</pre>
              <div class="craft-acts">
                <el-button
                  size="small"
                  :type="note.practiced ? 'default' : 'primary'"
                  :loading="busyId === note.id"
                  @click="practice(note)"
                >
                  {{ note.practiced ? '已在练习计划' : '练一练' }}
                </el-button>
                <el-button size="small" text @click="startEdit(note)">编辑</el-button>
                <el-button size="small" text @click="archive(note)">归档</el-button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <el-dialog
      v-model="editorOpen"
      :title="editingId ? '编辑套路' : '录入套路'"
      width="min(560px, 92vw)"
    >
      <div class="craft-form">
        <el-select v-model="form.category" class="form-select" aria-label="套路类型">
          <el-option
            v-for="(label, value) in CRAFT_CATEGORY_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
        <el-input v-model="form.title" maxlength="120" placeholder="标题，如：项目讲述五步结构" />
        <el-input
          v-model="form.whenToUse"
          maxlength="255"
          placeholder="什么时候用，如：面试被要求介绍项目时"
        />
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="6"
          maxlength="2000"
          show-word-limit
          placeholder="步骤化写清怎么做：1. … 2. … 3. …"
        />
        <el-input
          v-model="form.tagsText"
          maxlength="200"
          placeholder="标签，逗号分隔（可选）"
        />
      </div>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Hammer, Pin, Plus, WandSparkles } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  CRAFT_CATEGORY_LABELS,
  archiveCraft,
  confirmCraft,
  createCraft,
  createCraftPracticeTask,
  distillCrafts,
  listCrafts,
  pinCraft,
  updateCraft,
  type CraftCategory,
  type CraftNote,
  type SaveCraftPayload,
} from '@/api/crafts'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const notes = ref<CraftNote[]>([])
const loading = ref(true)
const error = ref('')
const distilling = ref(false)
const busyId = ref(-1)
const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)

const form = reactive({
  category: 'STORY' as CraftCategory,
  title: '',
  whenToUse: '',
  content: '',
  tagsText: '',
})

const pending = computed(() => notes.value.filter((n) => n.status === 'ANALYZED'))
const confirmed = computed(() => notes.value.filter((n) => n.status === 'CONFIRMED'))

function categoryLabel(category: CraftCategory): string {
  return CRAFT_CATEGORY_LABELS[category] ?? category
}

function payloadFromForm(): SaveCraftPayload {
  return {
    category: form.category,
    title: form.title.trim(),
    whenToUse: form.whenToUse.trim(),
    content: form.content.trim(),
    tags: form.tagsText
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    notes.value = await listCrafts()
  } catch (err) {
    error.value = problemMessage(err)
  } finally {
    loading.value = false
  }
}

function startCreate(): void {
  editingId.value = null
  form.category = 'STORY'
  form.title = ''
  form.whenToUse = ''
  form.content = ''
  form.tagsText = ''
  editorOpen.value = true
}

function startEdit(note: CraftNote): void {
  editingId.value = note.id
  form.category = note.category
  form.title = note.title
  form.whenToUse = note.whenToUse
  form.content = note.content
  form.tagsText = note.tags.join('，')
  editorOpen.value = true
}

async function submit(): Promise<void> {
  const payload = payloadFromForm()
  if (!payload.title || !payload.whenToUse || !payload.content) {
    ElMessage.warning('类型、标题、适用场景与正文都要填写')
    return
  }
  saving.value = true
  try {
    if (editingId.value) {
      await updateCraft(editingId.value, payload)
      ElMessage.success('已更新')
    } else {
      await createCraft(payload)
      ElMessage.success('已入库，随时可在准备与练习时查阅')
    }
    editorOpen.value = false
    await load()
  } catch (err) {
    ElMessage.error(problemMessage(err))
  } finally {
    saving.value = false
  }
}

async function confirmNote(note: CraftNote): Promise<void> {
  busyId.value = note.id
  try {
    await confirmCraft(note.id, {
      category: note.category,
      title: note.title,
      whenToUse: note.whenToUse,
      content: note.content,
      tags: note.tags,
    })
    await load()
    ElMessage.success('已确认入库')
  } catch (err) {
    ElMessage.error(problemMessage(err))
  } finally {
    busyId.value = -1
  }
}

async function togglePin(note: CraftNote): Promise<void> {
  try {
    await pinCraft(note.id, !note.pinned)
    await load()
  } catch (err) {
    ElMessage.error(problemMessage(err))
  }
}

async function archive(note: CraftNote): Promise<void> {
  try {
    await ElMessageBox.confirm('归档后保留痕迹、不再显示在已入库列表。', '归档套路', {
      confirmButtonText: '归档',
      cancelButtonText: '返回',
      type: 'info',
    })
  } catch {
    return
  }
  busyId.value = note.id
  try {
    await archiveCraft(note.id)
    await load()
  } catch (err) {
    ElMessage.error(problemMessage(err))
  } finally {
    busyId.value = -1
  }
}

/** V49：一键把套路转成练习任务，幂等——已存在时后端返回 created=0。 */
async function practice(note: CraftNote): Promise<void> {
  busyId.value = note.id
  try {
    const created = await createCraftPracticeTask(note.id)
    if (created > 0) {
      ElMessage.success('已加入复习计划的练习任务')
      note.practiced = true
    } else {
      ElMessage.info('这条套路已经在练习计划里了')
      note.practiced = true
    }
  } catch (err) {
    ElMessage.error(problemMessage(err))
  } finally {
    busyId.value = -1
  }
}

async function distill(): Promise<void> {
  distilling.value = true
  try {
    const suggestions = await distillCrafts()
    await load()
    ElMessage.success(`提炼出 ${suggestions.length} 条套路建议，确认后才入库`)
  } catch (err) {
    ElMessage.error(problemMessage(err))
  } finally {
    distilling.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.craft-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.craft-item {
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  background: var(--glass, rgb(31 111 92 / 3%));
}

.craft-item.analyzed {
  border-style: dashed;
  border-color: var(--ow-accent-soft, rgb(124 92 214 / 45%));
}

.craft-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.craft-cat {
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--btn-soft, rgb(31 111 92 / 10%));
  color: var(--ow-ink-secondary, #3f574c);
}

.craft-title {
  font-weight: 700;
  color: var(--ow-ink);
}

.craft-origin {
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.craft-tags {
  display: inline-flex;
  gap: 4px;
}

.craft-tag {
  font-size: var(--fs-xs);
  padding: 1px 7px;
  border-radius: 999px;
  color: var(--ow-muted, #52685e);
  background: var(--surface-2, rgb(31 111 92 / 6%));
}

.craft-when {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.craft-content {
  margin: 0;
  font-family: inherit;
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ow-ink-secondary, #3f574c);
  white-space: pre-wrap;
  word-break: break-word;
}

.craft-acts {
  display: flex;
  gap: 8px;
}

.pin-btn {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--ow-muted, #52685e);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.pin-btn svg {
  width: 15px;
  height: 15px;
}

.pin-btn.on {
  color: var(--brand-700, #15815f);
  background: var(--brand-50, #e6f8f0);
}

.craft-form {
  display: grid;
  gap: 10px;
}

.form-select {
  width: 160px;
}
</style>
