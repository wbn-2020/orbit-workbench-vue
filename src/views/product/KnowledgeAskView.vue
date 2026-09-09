<template>
  <div class="page kb-page">
    <header class="ow-page-top">
      <div>
        <div class="ow-crumb">资料 / 知识库问答</div>
        <h1><BookOpen aria-hidden="true" /> 知识库问答</h1>
        <div class="sub">
          基于你的项目知识块检索并由 AI 生成答案 · 答案标注文件来源，检索不到会明确提示
        </div>
      </div>
    </header>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />

    <div v-else class="kb-grid">
      <div class="ow-card col8">
        <div class="ow-card-h">
          <div class="ic b6"><Search aria-hidden="true" /></div>
          提问
        </div>
        <div class="ow-card-b">
          <div class="ow-row" style="margin-bottom: 11px;">
            <select v-model="scope" class="ow-input" style="max-width: 280px;" aria-label="检索范围">
              <option :value="null">全部个人资料</option>
              <option v-for="option in versionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="composer">
            <input
              v-model="question"
              class="ow-input"
              placeholder="例如：秒杀系统的库存扣减是怎么做的？"
              @keydown.enter="ask"
            >
            <button class="ow-btn" type="button" :disabled="asking" @click="ask">
              {{ asking ? '检索生成中…' : '提问' }}
            </button>
          </div>

          <ErrorState
            v-if="askError"
            :message="askError"
            :retry="ask"
            retry-text="重新提问"
          />
          <div v-else-if="result" class="answer">
            <template v-if="result.insufficient">
              <div class="answer-q">{{ askedQuestion }}</div>
              <p class="answer-text warn-text">
                资料中未找到足够依据。检索无结果不等于答案为否——可尝试更换关键词，或先在项目资料页构建知识块。
              </p>
              <span class="ow-tag orange">资料不足</span>
            </template>
            <template v-else>
              <div class="answer-q">{{ askedQuestion }}</div>
              <p class="answer-text ai-text">{{ result.answer || '正在生成…' }}</p>
              <template v-if="result.sources.length">
                <div class="ow-hint">以下为 AI 回答所引用的资料位置：</div>
                <div v-for="(source, index) in result.sources" :key="index" class="source-row">
                  <span class="ow-tag blue">[{{ index + 1 }}]</span>
                  <span class="source-path">{{ source.relativePath }} · 第 {{ source.chunkNo }} 段</span>
                  <div class="source-snippet">{{ source.snippet }}</div>
                </div>
              </template>
            </template>
          </div>
          <div v-else class="ow-empty" style="margin-top: 14px;">
            输入问题开始提问。回答只引用你项目资料里的知识块并标注来源；还没有知识块时，可先到项目资料页构建。
          </div>
        </div>
      </div>

      <div class="ow-card col4">
        <div class="ow-card-h">
          <div class="ic b3"><History aria-hidden="true" /></div>
          检索说明
        </div>
        <div class="ow-card-b">
          <ul class="plain-list">
            <li>知识块来自「项目资料」已解析文本文件，按约 1200 字窗口切分。</li>
            <li>检索使用 MySQL ngram 全文索引，辅以关键词包含匹配兜底。</li>
            <li>回答仅基于检索到的资料块并标注来源；资料不足时不会编造答案。</li>
            <li>知识库问答默认不计入能力数据。</li>
          </ul>
          <div class="rebuild-row">
            <el-button text size="small" :icon="RefreshCw" :loading="building" @click="buildAll">
              {{ building ? '构建中…' : '重建全部项目知识块' }}
            </el-button>
          </div>
          <div class="ow-hint">重建会按项目版本重新切分全部已解析文件，耗时取决于资料量。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, History, RefreshCw, Search } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import { askKnowledge, buildKnowledge, streamAskKnowledge } from '@/api/knowledge'
import { listProjects } from '@/api/projects'
import type { AskResult } from '@/api/knowledge'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'

const scope = ref<number | null>(null)
const question = ref('')
const askedQuestion = ref('')
const result = ref<AskResult | null>(null)
const asking = ref(false)
const building = ref(false)
const loadError = ref('')
/** 提问链路失败信息：流式与回退都失败时内联呈现，替代一闪而过的 toast 与误导性空态。 */
const askError = ref('')

const projects = ref<{ id: number; name: string; versionId: number | null }[]>([])

const versionOptions = computed(() =>
  projects.value
    .filter((project) => project.versionId !== null)
    .map((project) => ({
      value: project.versionId as number,
      label: `${project.name}（最新版本）`,
    })),
)

async function load(): Promise<void> {
  loadError.value = ''
  try {
    const summaries = await listProjects()
    projects.value = summaries.map((summary) => ({
      id: summary.id,
      name: summary.name,
      versionId: summary.latestVersion?.id ?? null,
    }))
  } catch (error) {
    loadError.value = problemMessage(error)
  }
}

async function buildAll(): Promise<void> {
  const targets = projects.value.filter((project) => project.versionId !== null)
  if (!targets.length) {
    ElMessage.info('还没有带版本的项目资料，请先在项目资料页导入')
    return
  }
  building.value = true
  let totalChunks = 0
  let failed = 0
  try {
    for (const project of targets) {
      try {
        const result = await buildKnowledge(project.id, project.versionId as number)
        totalChunks += result.chunkCount
      } catch {
        failed += 1
      }
    }
    if (failed) {
      ElMessage.warning(`构建完成：共 ${totalChunks} 块，${failed} 个项目失败`)
    } else {
      ElMessage.success(`知识块构建完成：共 ${totalChunks} 块`)
    }
  } finally {
    building.value = false
  }
}

async function ask(): Promise<void> {
  const text = question.value.trim()
  if (!text || asking.value) return
  asking.value = true
  askedQuestion.value = text
  askError.value = ''
  // 流式优先：先给一个空答案骨架，delta 逐字追加；仅当流式通道本身不可用
  // （如网关不支持 SSE）才回退阻塞接口——上游 AI 失败时回退也会失败，不打无意义的第二次请求。
  result.value = { answer: '', insufficient: false, sources: [] }
  let streamed = false
  // SSE 的 error 事件通过回调送达、不会向外抛出，需用局部变量收集后统一判定。
  let streamErrorMessage = ''
  try {
    await streamAskKnowledge(text, scope.value, {
      onDelta: (delta: string) => {
        streamed = true
        if (result.value) result.value.answer += delta
      },
      onDone: (answer: string, insufficient: boolean) => {
        result.value = { answer, insufficient, sources: result.value?.sources ?? [] }
      },
      onError: (message: string) => {
        // 流中途失败：后端未写入任何数据，清掉空骨架交给内联错误态
        if (streamed && result.value && !result.value.answer) result.value = null
        streamErrorMessage = message
      },
    })
  } catch (streamError) {
    const streamMessage = streamError instanceof Error ? streamError.message : String(streamError)
    if (!streamed) {
      try {
        result.value = await askKnowledge(text, scope.value)
        return
      } catch {
        /* 阻塞接口同样失败：按流式错误呈现，不再叠加第二次噪音 */
      }
    }
    result.value = null
    askError.value = streamMessage || '本次回答生成失败，请稍后重试'
    return
  } finally {
    asking.value = false
  }
  if (streamErrorMessage) {
    // 后端在流内明确报错（多为 AI 上游失败）：回退阻塞接口也会失败，直接诚实呈现。
    result.value = null
    askError.value = streamErrorMessage || '本次回答生成失败，请稍后重试'
  }
}

load()
</script>

<style scoped>
.kb-page {
  display: grid;
  gap: 18px;
}

.kb-page h1 svg {
  width: 24px;
  height: 24px;
  color: var(--brand);
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}

.col4 { grid-column: span 4; }
.col8 { grid-column: span 8; }

.composer {
  display: flex;
  gap: 10px;
}

.composer .ow-input {
  flex: 1;
}

.answer {
  margin-top: 14px;
  padding: 14px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 12px;
}

.answer-q {
  margin-bottom: 6px;
  color: var(--ink);
  font-weight: 800;
}

.answer-text {
  margin: 0 0 10px;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.warn-text {
  color: #9a6a00;
}

.ai-text {
  color: var(--ink-2);
}

.source-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 8px;
  padding: 8px 0;
  border-top: 1px dashed var(--line);
}

.source-path {
  color: var(--brand-700);
  font-size: 12.5px;
  font-weight: 700;
  word-break: break-all;
}

.source-snippet {
  grid-column: 1 / -1;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.plain-list {
  margin: 0;
  padding-left: 18px;
  color: var(--ink-2);
  font-size: 13px;
  line-height: 1.9;
}

.rebuild-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}
</style>
