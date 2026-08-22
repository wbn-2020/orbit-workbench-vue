<template>
  <div class="chart-viewer">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      show-icon
      :closable="false"
    />
    <div v-else ref="chartElement" class="chart-canvas" role="img" :aria-label="ariaLabel" />
  </div>
</template>

<script setup lang="ts">
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { init, use, type EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

const props = withDefaults(
  defineProps<{
    spec: string | Record<string, unknown>
    ariaLabel?: string
  }>(),
  { ariaLabel: '分析图表' },
)

const chartElement = ref<HTMLElement>()
const error = ref('')
let chart: ReturnType<typeof init> | undefined
let resizeObserver: ResizeObserver | undefined

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function safeString(value: unknown, maximum = 200): string | undefined {
  return typeof value === 'string' ? value.slice(0, maximum) : undefined
}

function safeBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function safeDataValue(value: unknown): string | number | boolean | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return value
  }
  return String(value).slice(0, 500)
}

function safeSeriesDatum(value: unknown): unknown {
  const item = recordValue(value)
  if (!item) return safeDataValue(value)
  return {
    ...(safeString(item.name, 160) ? { name: safeString(item.name, 160) } : {}),
    ...(safeNumber(item.value) !== undefined
      ? { value: safeNumber(item.value) }
      : Array.isArray(item.value)
        ? { value: item.value.slice(0, 8).map(safeDataValue) }
        : {}),
  }
}

function safeDataset(value: unknown): Record<string, unknown> | undefined {
  const sourceRecord = recordValue(value)
  if (!sourceRecord || !Array.isArray(sourceRecord.source)) return undefined
  const source = sourceRecord.source.slice(0, 5_001).map((row) => {
    if (Array.isArray(row)) return row.slice(0, 100).map(safeDataValue)
    const rowRecord = recordValue(row)
    if (!rowRecord) return safeDataValue(row)
    return Object.fromEntries(
      Object.entries(rowRecord)
        .slice(0, 100)
        .map(([key, item]) => [key.slice(0, 128), safeDataValue(item)]),
    )
  })
  return { source }
}

function safeAxis(value: unknown): Record<string, unknown> | undefined {
  const axis = recordValue(Array.isArray(value) ? value[0] : value)
  if (!axis) return undefined
  const type = safeString(axis.type)
  if (type && !['category', 'value', 'time'].includes(type)) return undefined
  return {
    ...(type ? { type } : {}),
    ...(safeString(axis.name, 80) ? { name: safeString(axis.name, 80) } : {}),
    ...(Array.isArray(axis.data)
      ? { data: axis.data.slice(0, 5_000).map(safeDataValue) }
      : {}),
    axisLabel: {
      ...(safeBoolean(recordValue(axis.axisLabel)?.show) !== undefined
        ? { show: safeBoolean(recordValue(axis.axisLabel)?.show) }
        : {}),
      hideOverlap: true,
    },
  }
}

function safeSeries(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new Error('图表规格缺少 series')
  if (value.length === 0 || value.length > 12) {
    throw new Error('图表 series 数量必须在 1 至 12 之间')
  }
  return value.map((item) => {
    const series = recordValue(item)
    const type = safeString(series?.type)
    if (!series || !type || !['bar', 'line', 'pie', 'scatter'].includes(type)) {
      throw new Error('图表仅支持 bar、line、pie 和 scatter')
    }
    return {
      type,
      ...(safeString(series.name, 100) ? { name: safeString(series.name, 100) } : {}),
      ...(safeString(series.encode) ? { encode: safeString(series.encode) } : {}),
      ...(recordValue(series.encode)
        ? {
            encode: Object.fromEntries(
              Object.entries(recordValue(series.encode)!)
                .slice(0, 12)
                .filter(([, encoded]) =>
                  typeof encoded === 'string' || typeof encoded === 'number',
                ),
            ),
          }
        : {}),
      ...(Array.isArray(series.data)
        ? { data: series.data.slice(0, 5_000).map(safeSeriesDatum) }
        : {}),
      ...(type === 'line' && safeBoolean(series.smooth) !== undefined
        ? { smooth: safeBoolean(series.smooth) }
        : {}),
      ...(type === 'pie'
        ? {
            radius: safeString(series.radius, 20) || '65%',
            center: ['50%', '52%'],
          }
        : {}),
    }
  })
}

function validatedOption(input: string | Record<string, unknown>): EChartsCoreOption {
  const raw = typeof input === 'string' ? JSON.parse(input) as unknown : input
  const spec = recordValue(raw)
  if (!spec) throw new Error('图表规格必须是 JSON 对象')

  const title = recordValue(spec.title)
  const legend = recordValue(spec.legend)
  const tooltip = recordValue(spec.tooltip)
  const option: Record<string, unknown> = {
    animationDuration: 240,
    backgroundColor: 'transparent',
    textStyle: { color: '#cbd5d1' },
    grid: { left: 48, right: 24, top: title ? 68 : 42, bottom: 44, containLabel: true },
    title: title
      ? {
          text: safeString(title.text, 160),
          subtext: safeString(title.subtext, 240),
          left: 'center',
          textStyle: { color: '#edf4f0', fontSize: 15, fontWeight: 600 },
          subtextStyle: { color: '#91a19a', fontSize: 11 },
        }
      : undefined,
    legend: {
      show: safeBoolean(legend?.show) ?? true,
      top: title ? 42 : 8,
      textStyle: { color: '#aebbb5' },
    },
    tooltip: {
      show: safeBoolean(tooltip?.show) ?? true,
      trigger: safeString(tooltip?.trigger) === 'item' ? 'item' : 'axis',
      confine: true,
    },
    dataset: safeDataset(spec.dataset),
    xAxis: safeAxis(spec.xAxis),
    yAxis: safeAxis(spec.yAxis),
    series: safeSeries(spec.series),
  }
  return option as EChartsCoreOption
}

async function render(): Promise<void> {
  error.value = ''
  try {
    const option = validatedOption(props.spec)
    await nextTick()
    if (!chartElement.value) return
    chart ||= init(chartElement.value, undefined, { renderer: 'canvas' })
    chart.setOption(option, { notMerge: true })
  } catch (renderError) {
    chart?.clear()
    error.value =
      renderError instanceof Error ? `图表规格无效：${renderError.message}` : '图表规格无效'
  }
}

onMounted(() => {
  void render()
  if (chartElement.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartElement.value)
  }
})

watch(() => props.spec, () => void render(), { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
})
</script>

<style scoped>
.chart-viewer {
  width: 100%;
}

.chart-canvas {
  width: 100%;
  min-height: 440px;
}

@media (max-width: 640px) {
  .chart-canvas {
    min-height: 360px;
  }
}
</style>
