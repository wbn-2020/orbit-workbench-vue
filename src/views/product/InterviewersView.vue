<template>
  <div class="page interviewers-page">
    <header class="ow-page-top">
      <div>
        <h1><UsersRound aria-hidden="true" /> 面试官</h1>
        <div class="sub">
          内置面试官只读，可复制为专属后编辑；创建会话时写入面试官快照，历史会话不受后续修改影响
        </div>
      </div>
      <div class="acts">
        <button class="ow-btn" type="button" @click="openCreate">＋ 自定义面试官</button>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />

    <template v-else>
      <div class="ow-card">
        <div class="ow-card-h">
          <div class="ic b1"><UsersRound aria-hidden="true" /></div>
          内置面试官
          <div class="right">系统预置 · 可一键复制为专属</div>
        </div>
        <div class="ow-card-b">
          <div v-if="loading" class="ow-empty">加载中…</div>
          <div v-else class="ow-tlist">
            <div v-for="profile in builtIns" :key="profile.id" class="ow-titem">
              <span class="iv-ico" :style="builtinStyle(profile.id)">{{ profile.name.slice(0, 1) }}</span>
              <div class="grow">
                <div class="tt">
                  {{ profile.name }}
                  <span class="ow-tag gray">{{ topicModeLabel(profile.topicMode) }}</span>
                </div>
                <div class="ow-tm">{{ profile.description || '（无简介）' }}</div>
                <div v-if="profile.focusTags.length" class="ow-row tag-row">
                  <span v-for="tag in profile.focusTags" :key="tag" class="ow-chip">{{ tag }}</span>
                  <span class="ow-hint">
                    默认 主问题 {{ profile.defaultQuestionLimit }} · 追问 ≤{{ profile.defaultFollowUpLimit }}
                  </span>
                </div>
              </div>
              <button class="ow-btn sm" type="button" @click="startInterview(profile)">开始面试</button>
              <button class="ow-btn sm ghost" type="button" @click="copyProfile(profile)">复制为专属</button>
            </div>
          </div>
        </div>
      </div>

      <div class="ow-card">
        <div class="ow-card-h">
          <div class="ic b5"><UserRoundPlus aria-hidden="true" /></div>
          我的专属面试官
          <div class="right">
            {{ customs.length }} 个
            <label class="archived-toggle">
              <input v-model="showArchived" type="checkbox" @change="load"> 显示已归档
            </label>
          </div>
        </div>
        <div class="ow-card-b">
          <div v-if="loading" class="ow-empty">加载中…</div>
          <div v-else-if="customs.length === 0" class="ow-empty">
            还没有专属面试官，点「＋ 自定义面试官」创建，或从内置面试官复制。
          </div>
          <div v-else class="ow-tlist">
            <div v-for="profile in customs" :key="profile.id" class="ow-titem">
              <span class="iv-ico my">{{ profile.name.slice(0, 1) }}</span>
              <div class="grow">
                <div class="tt">
                  {{ profile.name }}
                  <span class="ow-tag gray">{{ topicModeLabel(profile.topicMode) }}</span>
                  <span v-if="profile.archived" class="ow-tag warn">已归档</span>
                </div>
                <div class="ow-tm">{{ profile.description || '（无简介）' }}</div>
                <div v-if="profile.focusTags.length" class="ow-row tag-row">
                  <span v-for="tag in profile.focusTags" :key="tag" class="ow-chip">{{ tag }}</span>
                  <span class="ow-hint">
                    默认 主问题 {{ profile.defaultQuestionLimit }} · 追问 ≤{{ profile.defaultFollowUpLimit }}
                  </span>
                </div>
              </div>
              <button
                class="ow-btn sm"
                type="button"
                :disabled="profile.archived"
                @click="startInterview(profile)"
              >
                开始面试
              </button>
              <button class="ow-btn sm ghost" type="button" @click="openEdit(profile)">编辑</button>
              <button
                class="ow-btn sm ghost"
                type="button"
                @click="toggleArchive(profile)"
              >
                {{ profile.archived ? '取消归档' : '归档' }}
              </button>
              <button
                class="ow-btn xs danger"
                type="button"
                aria-label="删除"
                @click="removeProfile(profile)"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-if="editorOpen" class="ow-modal" @click.self="editorOpen = false">
      <div class="box wide">
        <h3>
          <UsersRound aria-hidden="true" />
          {{ editingId ? '编辑面试官' : '自定义面试官' }}
        </h3>
        <div class="ow-formgrid">
          <div class="ow-field">
            <label>名称</label>
            <input v-model="draft.name" class="ow-input" maxlength="64" placeholder="如：秒杀项目深挖官">
          </div>
          <div class="ow-field">
            <label>面试题材</label>
            <select v-model="draft.topicMode" class="ow-input">
              <option v-for="mode in INTERVIEWER_TOPIC_MODES" :key="mode.value" :value="mode.value">
                {{ mode.label }}
              </option>
            </select>
          </div>
          <div class="ow-field" style="grid-column: 1 / 3;">
            <label>简介（可选）</label>
            <input v-model="draft.description" class="ow-input" maxlength="512" placeholder="这个面试官的提问定位">
          </div>
          <div class="ow-field" style="grid-column: 1 / 3;">
            <label>面试官人设提示词（写入会话快照并用于 AI 出题）</label>
            <textarea
              v-model="draft.systemPrompt"
              class="ow-input"
              rows="4"
              maxlength="4000"
              placeholder="如：你是项目深挖面试官，只能依据会话项目快照提问，优先验证真实职责与技术取舍。"
            />
          </div>
          <div class="ow-field" style="grid-column: 1 / 3;">
            <label>重点考查方向（用顿号或逗号分隔，最多 10 个）</label>
            <input v-model="draft.focusTagsInput" class="ow-input" placeholder="架构取舍、故障恢复、个人职责">
          </div>
          <div class="ow-field">
            <label>默认主问题数（1-50）</label>
            <input v-model.number="draft.questionLimit" class="ow-input" type="number" min="1" max="50">
          </div>
          <div class="ow-field">
            <label>默认追问上限（0-20）</label>
            <input v-model.number="draft.followUpLimit" class="ow-input" type="number" min="0" max="20">
          </div>
        </div>
        <div class="ow-row end">
          <button class="ow-btn ghost" type="button" @click="editorOpen = false">取消</button>
          <button class="ow-btn" type="button" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : (editingId ? '保存' : '创建') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Trash2, UserRoundPlus, UsersRound } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  archiveInterviewer,
  copyInterviewer,
  createInterviewer,
  deleteInterviewer,
  INTERVIEWER_TOPIC_MODES,
  listInterviewers,
  topicModeLabel,
  unarchiveInterviewer,
  updateInterviewer,
  type InterviewerProfile,
  type InterviewerTopicMode,
} from '@/api/interviewers'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const router = useRouter()

const loading = ref(true)
const loadError = ref('')
const profiles = ref<InterviewerProfile[]>([])
const showArchived = ref(false)
const editorOpen = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const draft = reactive({
  name: '',
  topicMode: 'PROJECT_DEEP_DIVE' as InterviewerTopicMode,
  description: '',
  systemPrompt: '',
  focusTagsInput: '',
  questionLimit: 6,
  followUpLimit: 3,
})

const builtIns = computed(() => profiles.value.filter((profile) => profile.builtIn))
const customs = computed(() => profiles.value.filter((profile) => !profile.builtIn))

const BUILTIN_COLORS = ['#2b55b0', '#5f3fd0', '#16634f', '#8a5a00', '#b83232', '#0a7a85']

function builtinStyle(id: number): { background: string; color: string } {
  const color = BUILTIN_COLORS[id % BUILTIN_COLORS.length] ?? '#27b389'
  return { background: `${color}1a`, color }
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    profiles.value = await listInterviewers(showArchived.value)
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

function startInterview(profile: InterviewerProfile): void {
  void router.push(`/interviews/new?interviewerId=${profile.id}`)
}

async function copyProfile(profile: InterviewerProfile): Promise<void> {
  try {
    await copyInterviewer(profile.id)
    ElMessage.success('已复制为专属面试官，可在下方编辑')
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

function resetDraft(): void {
  draft.name = ''
  draft.topicMode = 'PROJECT_DEEP_DIVE'
  draft.description = ''
  draft.systemPrompt = ''
  draft.focusTagsInput = ''
  draft.questionLimit = 6
  draft.followUpLimit = 3
}

function openCreate(): void {
  editingId.value = null
  resetDraft()
  editorOpen.value = true
}

function openEdit(profile: InterviewerProfile): void {
  editingId.value = profile.id
  draft.name = profile.name
  draft.topicMode = profile.topicMode
  draft.description = profile.description ?? ''
  draft.systemPrompt = profile.systemPrompt
  draft.focusTagsInput = profile.focusTags.join('、')
  draft.questionLimit = profile.defaultQuestionLimit
  draft.followUpLimit = profile.defaultFollowUpLimit
  editorOpen.value = true
}

function parseTags(input: string): string[] {
  return input
    .split(/[,，、]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .slice(0, 10)
}

async function save(): Promise<void> {
  if (!draft.name.trim()) {
    ElMessage.warning('请填写名称')
    return
  }
  if (!draft.systemPrompt.trim()) {
    ElMessage.warning('请填写面试官人设提示词')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      systemPrompt: draft.systemPrompt.trim(),
      topicMode: draft.topicMode,
      focusTags: parseTags(draft.focusTagsInput),
      defaultQuestionLimit: draft.questionLimit,
      defaultFollowUpLimit: draft.followUpLimit,
    }
    if (editingId.value) {
      await updateInterviewer(editingId.value, payload)
      ElMessage.success('面试官已更新（仅影响之后的新会话）')
    } else {
      await createInterviewer(payload)
      ElMessage.success('面试官已创建')
    }
    editorOpen.value = false
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    saving.value = false
  }
}

async function toggleArchive(profile: InterviewerProfile): Promise<void> {
  try {
    if (profile.archived) {
      await unarchiveInterviewer(profile.id)
      ElMessage.success('已取消归档')
    } else {
      await archiveInterviewer(profile.id)
      ElMessage.success('已归档，历史会话快照不受影响')
    }
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

async function removeProfile(profile: InterviewerProfile): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复；若该面试官已有历史面试会话，将拒绝删除，请改用归档。',
      '删除面试官',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }
  try {
    await deleteInterviewer(profile.id)
    ElMessage.success('面试官已删除')
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  }
}

load()
</script>

<style scoped>
.interviewers-page {
  display: grid;
  gap: 18px;
}

.interviewers-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.ow-card + .ow-card {
  margin-top: 18px;
}

.grow {
  flex: 1;
  min-width: 0;
}

.iv-ico {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  font-weight: 800;
}

.iv-ico.my {
  color: #fff;
  background: var(--av-1);
}

.tag-row {
  margin-top: 6px;
  flex-wrap: wrap;
}

.archived-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
  font-size: var(--fs-xs);
  cursor: pointer;
}

/* 窄屏：标题列撑满整行，操作按钮换到下方（与复习计划页同规则） */
@media (max-width: 720px) {
  .ow-titem {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .grow {
    flex: 1 1 calc(100% - 48px);
  }
}
</style>
