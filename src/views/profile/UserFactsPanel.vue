<template>
  <section class="surface facts-panel">
    <div class="surface-header">
      <div>
        <h2 class="surface-title">个人记忆层</h2>
        <span class="surface-subtitle">
          AI 从你的材料与面试轨迹中提炼画像事实；确认后才会注入出题与知识问答，未确认的建议不生效。
        </span>
      </div>
      <div class="panel-actions">
        <el-button
          v-if="!editing"
          :icon="Plus"
          @click="startCreate"
        >
          手动补充
        </el-button>
        <el-button
          type="primary"
          :icon="WandSparkles"
          :loading="distilling"
          @click="distill"
        >
          生成建议
        </el-button>
      </div>
    </div>

    <div class="surface-body">
      <div v-if="loading" class="facts-loading">
        <el-skeleton :rows="4" animated />
      </div>

      <EmptyState
        v-else-if="visibleFacts.length === 0"
        :icon="BrainCircuit"
        title="还没有画像事实"
        description="记录一些工作内容、跑一次面试后点这里「生成建议」；也可以手动补充一条你自己最清楚的事实。"
      />

      <template v-else>
        <ul class="fact-list">
          <li v-for="fact in visibleFacts" :key="fact.id" class="fact-item" :class="fact.status.toLowerCase()">
            <div class="fact-main">
              <span class="fact-type">{{ typeLabel(fact.factType) }}</span>
              <span class="fact-title">{{ fact.title }}</span>
              <span v-if="fact.source === 'AI_SUGGESTED'" class="fact-origin">
                AI 建议<template v-if="fact.confidence != null"> · 置信 {{ fact.confidence }}</template>
              </span>
              <span v-else class="fact-origin">本人录入</span>
              <span v-if="fact.status === 'CONFIRMED' && fact.stale" class="fact-stale">
                约 {{ describeAge(fact.staleDays) }}前确认 · 可能过时
              </span>
            </div>
            <p class="fact-content">{{ fact.content }}</p>
            <div class="fact-actions">
              <template v-if="fact.status === 'ANALYZED'">
                <el-button size="small" type="primary" :loading="busyId === fact.id" @click="confirmFact(fact)">
                  确认生效
                </el-button>
                <el-button size="small" :loading="busyId === fact.id" @click="discard(fact)">忽略</el-button>
              </template>
              <template v-else-if="fact.status === 'CONFIRMED'">
                <el-button
                  v-if="fact.stale"
                  size="small"
                  type="primary"
                  :loading="busyId === fact.id"
                  @click="reaffirm(fact)"
                >
                  仍然成立
                </el-button>
                <el-button size="small" text @click="archive(fact)">
                  归档
                </el-button>
              </template>
            </div>
          </li>
        </ul>
        <p v-if="archivedCount > 0" class="facts-note">另有 {{ archivedCount }} 条已归档事实（保留痕迹，不再注入）。</p>
        <p class="facts-note">
          注入预算：最多 10 条已确认事实进入面试出题与知识库问答上下文，单条超长会被截断。
        </p>
      </template>

      <form v-if="editing" class="fact-create" @submit.prevent="submitCreate">
        <el-select v-model="createForm.factType" class="type-select">
          <el-option
            v-for="(label, value) in USER_FACT_TYPE_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
        <el-input v-model="createForm.title" maxlength="120" placeholder="短标题，如：偏好小规模验证" />
        <el-input
          v-model="createForm.content"
          type="textarea"
          :rows="2"
          maxlength="800"
          show-word-limit
          placeholder="一句话事实，会被注入后续 AI 上下文"
        />
        <div class="create-actions">
          <el-button size="small" @click="editing = false">取消</el-button>
          <el-button size="small" type="primary" native-type="submit" :loading="busyId === 0">保存</el-button>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BrainCircuit, Plus, WandSparkles } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'

import {
  archiveUserFact,
  confirmUserFact,
  createUserFact,
  describeAge,
  distillUserFacts,
  listUserFacts,
  reaffirmUserFact,
  USER_FACT_TYPE_LABELS,
  type UserFact,
  type UserFactType,
} from '@/api/userFacts'
import { problemMessage } from '@/api/http'
import EmptyState from '@/components/EmptyState.vue'

const facts = ref<UserFact[]>([])
const loading = ref(true)
const distilling = ref(false)
const busyId = ref(-1)
const editing = ref(false)
const createForm = reactive<{ factType: UserFactType; title: string; content: string }>({
  factType: 'GOAL',
  title: '',
  content: '',
})

const visibleFacts = computed(() => facts.value.filter((fact) => fact.status !== 'ARCHIVED'))
const archivedCount = computed(() => facts.value.length - visibleFacts.value.length)

function typeLabel(type: UserFactType): string {
  return USER_FACT_TYPE_LABELS[type] ?? type
}

async function load(): Promise<void> {
  loading.value = true
  try {
    facts.value = await listUserFacts()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    loading.value = false
  }
}

async function distill(): Promise<void> {
  distilling.value = true
  try {
    const result = await distillUserFacts()
    await load()
    const skipped = result.skippedLowConfidence
    ElMessage.success(
      `已生成 ${result.suggestions.length} 条建议，确认后才生效${skipped > 0 ? `（${skipped} 条低置信被丢弃）` : ''}`,
    )
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    distilling.value = false
  }
}

function startCreate(): void {
  editing.value = true
  createForm.factType = 'GOAL'
  createForm.title = ''
  createForm.content = ''
}

async function submitCreate(): Promise<void> {
  if (!createForm.title.trim() || !createForm.content.trim()) {
    ElMessage.warning('标题与内容都要填写')
    return
  }
  busyId.value = 0
  try {
    await createUserFact({
      factType: createForm.factType,
      title: createForm.title.trim(),
      content: createForm.content.trim(),
    })
    editing.value = false
    await load()
    ElMessage.success('已记录并立即生效')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    busyId.value = -1
  }
}

async function confirmFact(fact: UserFact): Promise<void> {
  busyId.value = fact.id
  try {
    // 确认即接受 AI 草稿的措辞；要改先「忽略」再手动补充
    await confirmUserFact(fact.id, { factType: fact.factType, title: fact.title, content: fact.content })
    await load()
    ElMessage.success('已确认，将注入后续 AI 上下文')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    busyId.value = -1
  }
}

async function reaffirm(fact: UserFact): Promise<void> {
  busyId.value = fact.id
  try {
    await reaffirmUserFact(fact.id)
    await load()
    ElMessage.success('已标记仍然成立，时效已刷新')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    busyId.value = -1
  }
}

async function discard(fact: UserFact): Promise<void> {
  try {
    await ElMessageBox.confirm('忽略后这条建议会归档留痕，不注入任何上下文。', '忽略建议', {
      confirmButtonText: '忽略',
      cancelButtonText: '返回',
      type: 'info',
    })
  } catch {
    return
  }
  busyId.value = fact.id
  try {
    await archiveUserFact(fact.id)
    await load()
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    busyId.value = -1
  }
}

async function archive(fact: UserFact): Promise<void> {
  busyId.value = fact.id
  try {
    await archiveUserFact(fact.id)
    await load()
    ElMessage.success('已归档')
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    busyId.value = -1
  }
}

onMounted(load)
</script>

<style scoped>
.facts-panel {
  overflow: hidden;
}

.panel-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.fact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.fact-item {
  border: 1px solid var(--ow-line-soft, rgb(31 111 92 / 14%));
  border-radius: 12px;
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  background: var(--glass, rgb(31 111 92 / 3%));
}

.fact-item.analyzed {
  border-style: dashed;
  border-color: var(--ow-accent-soft, rgb(124 92 214 / 45%));
}

.fact-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fact-type {
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--btn-soft, rgb(31 111 92 / 10%));
  color: var(--ow-ink-secondary, #3f574c);
}

.fact-title {
  font-weight: 700;
  color: var(--ow-ink);
}

.fact-origin {
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.fact-content {
  margin: 0;
  font-size: var(--fs-sm);
  line-height: 1.65;
  color: var(--ow-ink-secondary, #3f574c);
}

.fact-actions {
  display: flex;
  gap: 8px;
}

.fact-stale {
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: var(--fs-xs);
  color: var(--ow-warning-text, #8a5a00);
  background: var(--ow-warning-bg, #fff4d6);
}

.facts-note {
  margin: 12px 0 0;
  font-size: var(--fs-xs);
  color: var(--ow-muted, #52685e);
}

.fact-create {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--ow-line-soft, rgb(31 111 92 / 12%));
  display: grid;
  gap: 10px;
}

.type-select {
  width: 140px;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.facts-loading {
  padding: 8px 0;
}

@media (max-width: 640px) {
  .panel-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
