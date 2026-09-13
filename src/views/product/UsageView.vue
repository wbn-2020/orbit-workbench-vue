<template>
  <div class="usage">
    <PageHeader
      title="用量与费用"
      description="每次真实模型调用都按场景记账。金额只在配置了单价、且上游报了 token 时才算得出；算不出的调用会单独计数，不显示成 0。"
    >
      <template #actions>
        <div class="ow-seg">
          <button
            v-for="opt in WINDOWS"
            :key="opt.value"
            type="button"
            :class="{ on: days === opt.value }"
            @click="applyDays(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <el-button :icon="RefreshCw" :loading="loading" @click="load()">刷新</el-button>
      </template>
    </PageHeader>

    <ErrorState v-if="loadError" :message="loadError" :retry="load" />
    <div v-else-if="loading && !data" class="ow-card">
      <div class="ow-card-b"><el-skeleton :rows="5" animated /></div>
    </div>

    <template v-else-if="data">
      <section class="ow-card usage-summary">
        <div class="stat">
          <span class="stat-num">{{ data.total.calls }}</span>
          <span class="stat-label">调用次数</span>
          <span class="stat-sub">成功 {{ data.total.succeeded }} · 失败 {{ data.total.failed }}</span>
        </div>
        <div class="stat">
          <span class="stat-num">{{ formatTokens(data.total.inputTokens + data.total.outputTokens) }}</span>
          <span class="stat-label">Token 总量</span>
          <span class="stat-sub">入 {{ formatTokens(data.total.inputTokens) }} · 出 {{ formatTokens(data.total.outputTokens) }}</span>
        </div>
        <div class="stat">
          <span class="stat-num">{{ costText }}</span>
          <span class="stat-label">预估费用</span>
          <span class="stat-sub" :class="{ warn: data.total.unpricedCalls > 0 }">{{ costNote }}</span>
        </div>
      </section>

      <section v-if="data.total.calls === 0" class="ow-card">
        <div class="ow-card-b empty-note">
          这个窗口内还没有模型调用记录。跑一次面试出题、生成报告或知识库问答后，这里会出现账目。
        </div>
      </section>

      <div v-else class="usage-grid">
        <section class="ow-card">
          <div class="ow-card-h"><div class="ic b1"><Activity aria-hidden="true" /></div>按场景</div>
          <div class="ow-card-b">
            <table class="usage-table">
              <thead>
                <tr><th>场景</th><th>调用</th><th>Token</th><th>费用</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in data.byScenario" :key="row.key">
                  <td>{{ scenarioLabel(row.key) }}</td>
                  <td class="num">{{ row.calls }}</td>
                  <td class="num">{{ formatTokens(row.inputTokens + row.outputTokens) }}</td>
                  <td class="num">{{ rowCost(row) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="ow-card">
          <div class="ow-card-h"><div class="ic b2"><Bot aria-hidden="true" /></div>按模型</div>
          <div class="ow-card-b">
            <table class="usage-table">
              <thead>
                <tr><th>模型</th><th>调用</th><th>Token</th><th>费用</th></tr>
              </thead>
              <tbody>
                <tr v-for="row in data.byModel" :key="row.key">
                  <td>{{ row.key }}</td>
                  <td class="num">{{ row.calls }}</td>
                  <td class="num">{{ formatTokens(row.inputTokens + row.outputTokens) }}</td>
                  <td class="num">{{ rowCost(row) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section v-if="data.byDay.length" class="ow-card">
        <div class="ow-card-h"><div class="ic b3"><CalendarDays aria-hidden="true" /></div>按日</div>
        <div class="ow-card-b">
          <table class="usage-table">
            <thead>
              <tr><th>日期</th><th>调用</th><th>Token</th><th>费用</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in data.byDay" :key="row.key">
                <td>{{ row.key }}</td>
                <td class="num">{{ row.calls }}</td>
                <td class="num">{{ formatTokens(row.inputTokens + row.outputTokens) }}</td>
                <td class="num">{{ rowCost(row) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p class="usage-note">
        单价在「AI 连接」里按每百万 token 配置，由你自己填写——产品不内置价格表，避免过时报价误导。
        <template v-if="!data.anyPricingConfigured">当前还没有任何连接配置单价，因此费用一律显示为空。</template>
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Activity, Bot, CalendarDays, RefreshCw } from 'lucide-vue-next'
import { getAiUsage, scenarioLabel, type AiUsage, type UsageRow } from '@/api/aiUsage'
import { problemMessage } from '@/api/http'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'

const WINDOWS = [
  { value: 7, label: '近 7 天' },
  { value: 30, label: '近 30 天' },
  { value: 90, label: '近 90 天' },
]

const data = ref<AiUsage | null>(null)
const loading = ref(true)
const loadError = ref('')
const days = ref(30)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await getAiUsage(days.value)
  } catch (error) {
    loadError.value = problemMessage(error)
  } finally {
    loading.value = false
  }
}

function applyDays(value: number): void {
  if (days.value === value) return
  days.value = value
  void load()
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function rowCost(row: UsageRow): string {
  // 后端 Jackson 省略 null 字段：costAmount 可能是 undefined 而非 null，必须宽松判空
  if (row.costAmount == null) {
    return row.unpricedCalls > 0 ? '未计价' : '—'
  }
  return row.costAmount.toFixed(4)
}

const costText = computed(() => {
  if (!data.value) return '—'
  if (data.value.total.costAmount == null) return '—'
  return data.value.total.costAmount.toFixed(4)
})

const costNote = computed(() => {
  const total = data.value?.total
  if (!total) return ''
  if (!data.value?.anyPricingConfigured) return '未配置单价，无法估算'
  if (total.pricedCalls === 0) return '暂无已计价调用'
  if (total.unpricedCalls > 0) return `已计价 ${total.pricedCalls} 次，另有 ${total.unpricedCalls} 次无单价/无 token`
  return `覆盖全部 ${total.pricedCalls} 次调用`
})

onMounted(load)
</script>

<style scoped>
.usage {
  display: grid;
  gap: 18px;
}

.usage-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  padding: 20px 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-num {
  color: var(--ow-ink);
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  color: var(--ow-ink-secondary, #3f574c);
  font-size: 13px;
  font-weight: 700;
}

.stat-sub {
  color: var(--ow-muted, #52685e);
  font-size: 12px;
}

.stat-sub.warn {
  color: var(--ow-status-warning-text, #7d5400);
}

.usage-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.usage-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.usage-table th {
  padding: 8px 6px;
  text-align: left;
  color: var(--ow-muted, #52685e);
  font-weight: 700;
  border-bottom: 1px solid var(--ow-line-soft, rgb(31 111 92 / 12%));
}

.usage-table td {
  padding: 8px 6px;
  border-bottom: 1px solid var(--ow-line-soft, rgb(31 111 92 / 8%));
  color: var(--ow-ink-secondary, #3f574c);
}

.usage-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-note,
.usage-note {
  color: var(--ow-muted, #52685e);
  font-size: 13px;
  line-height: 1.7;
}

.usage-note {
  margin: 0;
}

@media (max-width: 900px) {
  .usage-summary,
  .usage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
