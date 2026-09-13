<template>
  <div class="page settings-page">
    <PageHeader
      title="设置"
      description="管理本地外观、通知偏好和账户操作。通知开关只影响之后产生的新通知，不会删除已有通知。"
    />

    <div class="settings-grid">
      <section class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b2"><Download aria-hidden="true" /></div>
          数据管理
        </div>
        <div class="ow-card-b">
          <p class="ow-hint data-note">
            备份当前账号在本产品中写入的数据（项目、画像事实、知识卡片、面试、报告、简历、日程、偏好等）。
            导入是<strong>覆盖式恢复</strong>：会先清空同范围数据再写回，请在同一账号下使用。
          </p>
          <div class="ow-row">
            <button class="ow-btn" type="button" :disabled="dataBusy !== ''" @click="handleExport">
              {{ dataBusy === 'export' ? '导出中…' : '导出 JSON 存档' }}
            </button>
            <button class="ow-btn ghost" type="button" :disabled="dataBusy !== ''" @click="triggerImport">
              {{ dataBusy === 'import' ? '导入中…' : '导入 JSON 存档' }}
            </button>
            <input
              ref="importInput"
              class="hidden-file"
              type="file"
              accept="application/json,.json"
              @change="handleImportFile"
            >
          </div>
          <p v-if="dataError" class="error-text">{{ dataError }}</p>
          <p v-if="dataHint" class="ow-hint">{{ dataHint }}</p>
          <div class="data-danger">
            <button class="ow-btn danger" type="button" :disabled="dataBusy !== ''" @click="handleClear">
              {{ dataBusy === 'clear' ? '清空中…' : '清空全部数据（二次确认）' }}
            </button>
          </div>
        </div>
      </section>

      <section class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b2"><Beaker aria-hidden="true" /></div>
          实验特性
        </div>
        <div class="ow-card-b">
          <p class="ow-hint data-note">
            岗位上表匹配需要手工录入岗位要求，投入产出比偏低，已从主导航撤出，保留为实验特性。
          </p>
          <div class="ow-row">
            <RouterLink class="ow-btn ghost" to="/jobs">进入岗位与 JD 匹配</RouterLink>
          </div>
        </div>
      </section>

      <section class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b1"><Sun aria-hidden="true" /></div>
          主题与偏好
        </div>
        <div class="ow-card-b">
          <div class="theme-head">
            <div>
              <div class="theme-title">外观主题</div>
              <div class="ow-hint theme-hint">浅色 / 深色 · 只保存在当前浏览器 · 实时切换</div>
            </div>
            <button class="ow-btn ghost xs" type="button" @click="ui.toggleNext()">切换下一主题</button>
          </div>
          <div class="theme-grid">
            <button
              v-for="meta in OW_THEMES"
              :key="meta.value"
              type="button"
              class="theme-card"
              :class="{ active: ui.theme === meta.value }"
              :aria-pressed="ui.theme === meta.value"
              @click="ui.apply(meta.value)"
            >
              <span class="tc-prev" :style="{ background: meta.preview }" />
              <span class="tc-name">{{ meta.name }}</span>
              <span class="tc-desc">{{ meta.desc }}</span>
            </button>
          </div>
          <div class="ow-note current-theme">当前主题：{{ currentTheme.name }} · {{ currentTheme.desc }}</div>

          <div class="theme-head readability-head">
            <div>
              <div class="theme-title">阅读偏好</div>
              <div class="ow-hint theme-hint">大字号模式 · 全站字号阶梯整档 +2px · 只保存在当前浏览器</div>
            </div>
            <button
              class="ow-btn ghost xs"
              type="button"
              :class="{ active: ui.largeText }"
              :aria-pressed="ui.largeText"
              @click="ui.toggleLargeText()"
            >
              {{ ui.largeText ? '已开启 · 恢复正常' : '开启大字号' }}
            </button>
          </div>
        </div>
      </section>

      <section class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b3"><Bell aria-hidden="true" /></div>
          通知偏好
          <span v-if="preference" class="version-label">v{{ preference.version }}</span>
        </div>
        <div class="ow-card-b preference-body">
          <div v-if="preferenceLoading" class="loading-block">
            <el-skeleton :rows="6" animated />
          </div>
          <ErrorState v-else-if="preferenceError && !preference" :message="preferenceError" :retry="loadPreferences" />
          <template v-else>
            <div
              v-for="item in notificationSettings"
              :key="item.key"
              class="titem-row"
              :class="{ disabled: preferenceSaving }"
            >
              <div class="grow">
                <div class="titem-title">{{ item.label }}</div>
                <div class="ow-hint item-desc">{{ item.desc }}</div>
              </div>
              <button
                class="ow-switch"
                :class="{ on: item.enabled }"
                type="button"
                role="switch"
                :aria-checked="item.enabled"
                :aria-label="item.label"
                :disabled="preferenceSaving"
                @click="togglePreference(item.key)"
              />
            </div>

            <div class="timezone-row">
              <div>
                <div class="titem-title">时区</div>
                <div class="ow-hint item-desc">用于后续日程与到期提醒的统一时间口径</div>
              </div>
              <el-select
                v-model="preferenceDraft.timezoneId"
                class="timezone-select"
                :disabled="preferenceLoading || preferenceSaving"
                aria-label="时区"
              >
                <el-option
                  v-for="option in TIMEZONE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>

            <div class="timezone-row">
              <div>
                <div class="titem-title">调用记录保留</div>
                <div class="ow-hint item-desc">超过保留期的 AI 调用账目会被自动清理；默认永久保留</div>
              </div>
              <el-select
                v-model="preferenceDraft.auditRetentionDays"
                class="timezone-select"
                :disabled="preferenceLoading || preferenceSaving"
                aria-label="调用记录保留"
              >
                <el-option
                  v-for="option in RETENTION_OPTIONS"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>

            <div class="timezone-row">
              <div>
                <div class="titem-title">通知保留</div>
                <div class="ow-hint item-desc">超过保留期的通知会被自动清理；默认永久保留</div>
              </div>
              <el-select
                v-model="preferenceDraft.notificationRetentionDays"
                class="timezone-select"
                :disabled="preferenceLoading || preferenceSaving"
                aria-label="通知保留"
              >
                <el-option
                  v-for="option in RETENTION_OPTIONS"
                  :key="String(option.value)"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>

            <div class="preference-actions">
              <el-button
                type="primary"
                :loading="preferenceSaving"
                :disabled="!preferenceDirty"
                @click="savePreferences"
              >
                保存偏好
              </el-button>
              <el-button text :disabled="preferenceSaving" @click="loadPreferences">重新加载</el-button>
            </div>
            <p v-if="preferenceError" class="error-line" role="alert">{{ preferenceError }}</p>
            <p class="ow-hint preference-note">
              报告完成、AI 失败、资料导入失败和复习到期通知会读取这些开关；面试提醒开关先保存偏好，自动面试提醒任务尚未开放。
            </p>
          </template>
        </div>
      </section>

      <section class="ow-card col6">
        <div class="ow-card-h">
          <div class="ic b5"><UserRound aria-hidden="true" /></div>
          账户
        </div>
        <div class="ow-card-b">
          <div class="account-row">
            <span class="ava">{{ avatarText }}</span>
            <div>
              <div class="account-name">{{ auth.user?.username || '求职者' }}</div>
              <div class="ow-hint account-hint">本地账户 · 会话认证</div>
            </div>
          </div>
          <div class="ow-row account-actions">
            <button class="ow-btn ghost" type="button" @click="passwordOpen = true">修改密码</button>
            <button class="ow-btn ghost" type="button" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </section>

      <section class="ow-card col12">
        <div class="ow-card-h">
          <div class="ic b6"><Info aria-hidden="true" /></div>
          关于与实现状态
        </div>
        <div class="ow-card-b">
          <p class="about-text">
            Orbit 工作台 · 个人职业成长工作台（本地 Web 应用）。市场感知（面试）、工作沉淀、学习更新三种模式与项目资料、知识库、报告均已接入产品主链；
            主题偏好保存在浏览器，通知偏好保存在后端用户偏好记录。数据清空、JSON 导入导出、语音面试和外部招聘集成尚未开放。
          </p>
        </div>
      </section>
    </div>

    <ChangePasswordDialog v-model="passwordOpen" />
  </div>
</template>

<script setup lang="ts">
import { Beaker, Bell, Download, Info, Sun, UserRound } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import ErrorState from '@/components/ErrorState.vue'
import PageHeader from '@/components/PageHeader.vue'
import { problemMessage } from '@/api/http'
import { CLEAR_CONFIRM, countBackupRows, clearAllData, exportBackup, importBackup, type BackupPayload } from '@/api/dataBackup'
import { getPreferences, updatePreferences } from '@/api/preferences'
import { useAuthStore } from '@/stores/auth'
import { OW_THEMES, useUiStore } from '@/stores/ui'
import type { UserPreferences } from '@/types/api'

type PreferenceBooleanKey =
  | 'notifyReportReady'
  | 'notifyStudyDue'
  | 'notifyInterview'
  | 'notifyImportFailure'
  | 'notifyAiFailure'

interface PreferenceDraft {
  notifyReportReady: boolean
  notifyStudyDue: boolean
  notifyInterview: boolean
  notifyImportFailure: boolean
  notifyAiFailure: boolean
  timezoneId: string
  /** 保留期：null = 永久保留 */
  auditRetentionDays: number | null
  notificationRetentionDays: number | null
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间（Asia/Shanghai）' },
  { value: 'Asia/Tokyo', label: '日本标准时间（Asia/Tokyo）' },
  { value: 'Asia/Singapore', label: '新加坡时间（Asia/Singapore）' },
  { value: 'UTC', label: '协调世界时（UTC）' },
  { value: 'America/Los_Angeles', label: '美国太平洋时间（America/Los_Angeles）' },
  { value: 'America/New_York', label: '美国东部时间（America/New_York）' },
] as const

/** 保留期选项：null = 永久保留（默认，不悄悄删数据）；最短 7 天与后端校验一致。 */
const RETENTION_OPTIONS = [
  { value: null, label: '永久保留（默认）' },
  { value: 30, label: '保留 30 天' },
  { value: 90, label: '保留 90 天' },
  { value: 180, label: '保留 180 天' },
  { value: 365, label: '保留 1 年' },
] as const

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const passwordOpen = ref(false)
const preference = ref<UserPreferences | null>(null)
const preferenceLoading = ref(true)
const preferenceSaving = ref(false)
const preferenceError = ref('')
const preferenceDraft = reactive<PreferenceDraft>({
  notifyReportReady: true,
  notifyStudyDue: true,
  notifyInterview: true,
  notifyImportFailure: true,
  notifyAiFailure: true,
  timezoneId: 'Asia/Shanghai',
  auditRetentionDays: null,
  notificationRetentionDays: null,
})

const notificationSettings = computed(() => [
  {
    key: 'notifyReportReady' as const,
    label: '新报告提醒',
    desc: '面试报告生成完成后通知你',
    enabled: preferenceDraft.notifyReportReady,
  },
  {
    key: 'notifyStudyDue' as const,
    label: '复习到期提醒',
    desc: '复习任务到期后通知你',
    enabled: preferenceDraft.notifyStudyDue,
  },
  {
    key: 'notifyInterview' as const,
    label: '面试与日程提醒',
    desc: '面试安排或自定义日程到提醒时间时通知你',
    enabled: preferenceDraft.notifyInterview,
  },
  {
    key: 'notifyImportFailure' as const,
    label: '导入异常提醒',
    desc: '项目资料有文件解析失败时通知你',
    enabled: preferenceDraft.notifyImportFailure,
  },
  {
    key: 'notifyAiFailure' as const,
    label: 'AI 处理失败提醒',
    desc: '报告、知识库等 AI 处理失败时通知你',
    enabled: preferenceDraft.notifyAiFailure,
  },
])

const FALLBACK_THEME = OW_THEMES[0] ?? {
  value: 'light' as const, name: '绿茵广场', desc: '清新自然 · 浅色', dark: false, preview: '',
}

const currentTheme = computed(() => OW_THEMES.find((meta) => meta.value === ui.theme) ?? FALLBACK_THEME)
const avatarText = computed(() => auth.user?.username.slice(0, 2).toUpperCase() || '求职')
const preferenceDirty = computed(() => {
  const current = preference.value
  if (!current) return false
  return (
    current.notifyReportReady !== preferenceDraft.notifyReportReady ||
    current.notifyStudyDue !== preferenceDraft.notifyStudyDue ||
    current.notifyInterview !== preferenceDraft.notifyInterview ||
    current.notifyImportFailure !== preferenceDraft.notifyImportFailure ||
    current.notifyAiFailure !== preferenceDraft.notifyAiFailure ||
    current.timezoneId !== preferenceDraft.timezoneId ||
    current.auditRetentionDays !== preferenceDraft.auditRetentionDays ||
    current.notificationRetentionDays !== preferenceDraft.notificationRetentionDays
  )
})

function syncDraft(data: UserPreferences): void {
  preferenceDraft.notifyReportReady = data.notifyReportReady
  preferenceDraft.notifyStudyDue = data.notifyStudyDue
  preferenceDraft.notifyInterview = data.notifyInterview
  preferenceDraft.notifyImportFailure = data.notifyImportFailure
  preferenceDraft.notifyAiFailure = data.notifyAiFailure
  preferenceDraft.timezoneId = data.timezoneId
  preferenceDraft.auditRetentionDays = data.auditRetentionDays
  preferenceDraft.notificationRetentionDays = data.notificationRetentionDays
}

async function loadPreferences(): Promise<void> {
  preferenceLoading.value = true
  preferenceError.value = ''
  try {
    const data = await getPreferences()
    preference.value = data
    syncDraft(data)
  } catch (error) {
    preferenceError.value = problemMessage(error)
  } finally {
    preferenceLoading.value = false
  }
}

function togglePreference(key: PreferenceBooleanKey): void {
  preferenceDraft[key] = !preferenceDraft[key]
}

async function savePreferences(): Promise<void> {
  const current = preference.value
  if (!current || !preferenceDirty.value) return
  preferenceSaving.value = true
  preferenceError.value = ''
  try {
    const data = await updatePreferences({
      ...preferenceDraft,
      expectedVersion: current.version,
    })
    preference.value = data
    syncDraft(data)
    ElMessage.success('通知偏好已保存')
  } catch (error) {
    preferenceError.value = problemMessage(error)
  } finally {
    preferenceSaving.value = false
  }
}

const importInput = ref<HTMLInputElement | null>(null)
const dataBusy = ref<'' | 'export' | 'import' | 'clear'>('')
const dataError = ref('')
const dataHint = ref('')

function stamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

async function handleExport(): Promise<void> {
  dataBusy.value = 'export'
  dataError.value = ''
  dataHint.value = ''
  try {
    const payload = await exportBackup()
    const blob = new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orbit-workbench-backup-${stamp()}.json`
    link.click()
    URL.revokeObjectURL(url)
    dataHint.value = `已导出 ${payload.tables.length} 张表、${countBackupRows(payload)} 行数据。`
  } catch (error) {
    dataError.value = problemMessage(error)
  } finally {
    dataBusy.value = ''
  }
}

function triggerImport(): void {
  dataError.value = ''
  dataHint.value = ''
  importInput.value?.click()
}

async function handleImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  let payload: BackupPayload
  try {
    payload = JSON.parse(await file.text()) as BackupPayload
  } catch {
    dataError.value = '文件不是合法的 JSON，未做任何改动'
    return
  }
  try {
    await ElMessageBox.confirm(
      `将用该备份覆盖当前账号的数据（${payload.tables?.length ?? 0} 张表、${countBackupRows(payload)} 行），此操作不可撤销。`,
      '确认覆盖式恢复',
      { type: 'warning', confirmButtonText: '覆盖恢复', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  dataBusy.value = 'import'
  try {
    const summary = await importBackup(payload)
    dataHint.value = `已恢复 ${summary.tables} 张表、${summary.rows} 行数据。`
    ElMessage.success('导入完成')
  } catch (error) {
    dataError.value = problemMessage(error)
  } finally {
    dataBusy.value = ''
  }
}

async function handleClear(): Promise<void> {
  dataError.value = ''
  dataHint.value = ''
  let entered = ''
  try {
    const result = await ElMessageBox.prompt(
      `将删除本账号在本产品中写入的全部数据（项目、画像事实、知识卡片、面试、报告、简历、日程、偏好等）。请输入「${CLEAR_CONFIRM}」以确认。`,
      '清空全部数据',
      {
        type: 'warning',
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        inputPlaceholder: CLEAR_CONFIRM,
        inputValidator: (value: string) => (value === CLEAR_CONFIRM ? true : `请输入「${CLEAR_CONFIRM}」`),
      },
    )
    entered = result.value
  } catch {
    return
  }
  dataBusy.value = 'clear'
  try {
    const summary = await clearAllData(entered)
    dataHint.value = `已清空 ${summary.rows} 行数据。`
    ElMessage.success('数据已清空')
  } catch (error) {
    dataError.value = problemMessage(error)
  } finally {
    dataBusy.value = ''
  }
}

async function handleLogout(): Promise<void> {
  await auth.logout().catch(() => undefined)
  await router.replace('/login')
}

onMounted(loadPreferences)
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 18px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
  align-items: start;
}

.col6 { grid-column: span 6; }
.col12 { grid-column: span 12; }

.hidden-file {
  display: none;
}

.data-note {
  margin: 0 0 12px;
}

.data-danger {
  margin-top: 14px;
}

.ow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.theme-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-title {
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.theme-hint {
  margin-top: 4px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  color: var(--ink);
  background: var(--glass-2);
  border: 1.5px solid var(--line-2);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: border-color 0.16s, box-shadow 0.16s;
}

.theme-card:hover {
  border-color: var(--brand);
}

.theme-card.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-200);
}

.theme-card .tc-prev {
  height: 48px;
  border-radius: 12px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 40%);
}

.theme-card .tc-name {
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 800;
}

.theme-card .tc-desc {
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 600;
}

.current-theme {
  margin-top: 12px;
}

.preference-body {
  min-height: 0;
}

.loading-block {
  padding: 6px 0;
}

.version-label {
  margin-left: auto;
  color: var(--muted);
  font-size: var(--fs-xs);
  font-weight: 700;
}

.titem-row,
.timezone-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 10px 12px;
  background: var(--glass-2);
  border: 1.5px solid var(--line);
  border-radius: 12px;
}

.titem-row.disabled {
  opacity: 0.68;
}

.grow {
  flex: 1;
  min-width: 0;
}

.titem-title {
  color: var(--ink);
  font-size: var(--fs-sm);
  font-weight: 700;
}

.item-desc {
  margin-top: 2px;
}

.timezone-row {
  align-items: flex-start;
  justify-content: space-between;
  margin-top: 12px;
}

.timezone-select {
  width: min(100%, 260px);
}

.preference-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.preference-note {
  margin: 12px 0 0;
  line-height: 1.6;
}

.error-line {
  margin: 10px 0 0;
  color: var(--red-600);
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ava {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  color: #fff;
  background: linear-gradient(135deg, var(--av-1), var(--av-2));
  border-radius: 12px;
  font-weight: 800;
}

.account-name {
  color: var(--ink);
  font-weight: 700;
}

.account-hint {
  margin-top: 2px;
}

.account-actions {
  margin-top: 14px;
}

.about-text {
  margin: 0;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.8;
}

@media (max-width: 1100px) {
  .col6,
  .col12 {
    grid-column: span 12;
  }
}

@media (max-width: 560px) {
  .timezone-row {
    flex-direction: column;
  }

  .timezone-select {
    width: 100%;
  }
}
</style>
