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
      <div class="acts">
        <el-button :icon="RefreshCw" :loading="building" @click="buildAll">
          {{ building ? '构建中…' : '重建全部项目知识块' }}
        </el-button>
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

          <div v-if="result" class="answer">
            <template v-if="result.insufficient">
              <div class="answer-q">{{ askedQuestion }}</div>
              <p class="answer-text warn-text">
                资料中未找到足够依据。检索无结果不等于答案为否——可尝试更换关键词，或先「重建全部项目知识块」。
              </p>
              <span class="ow-tag orange">资料不足</span>
            </template>
            <template v-else>
              <div class="answer-q">{{ askedQuestion }}</div>
              <p class="answer-text ai-text">{{ result.answer }}</p>
              <div class="ow-hint">以下为 AI 回答所引用的资料位置：</div>
              <div v-for="(source, index) in result.sources" :key="index" class="source-row">
                <span class="ow-tag blue">[{{ index + 1 }}]</span>
                <span class="source-path">{{ source.relativePath }} · 第 {{ source.chunkNo }} 段</span>
                <div class="source-snippet">{{ source.snippet }}</div>
              </div>
            </template>
          </div>
          <div v-else class="ow-empty" style="margin-top: 14px;">
            先「重建全部项目知识块」（按项目版本切分已解析文件），再针对资料提问。
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
          <div class="ow-hint">画像事实（AI 分析 + 用户确认）API 已就绪，确认界面将在项目详情页继续接入。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen, History, RefreshCw, Search } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

import { askKnowledge, buildKnowledge } from '@/api/knowledge'
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
  if (!text) return
  asking.value = true
  askedQuestion.value = text
  try {
    result.value = await askKnowledge(text, scope.value)
  } catch (error) {
    ElMessage.error(problemMessage(error))
  } finally {
    asking.value = false
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

@media (max-width: 1100px) {
  .col4,
  .col8 {
    grid-column: span 12;
  }
}
</style>
