import { defineStore } from 'pinia'
import { ref } from 'vue'

// 正式版只保留一套浅色主主题与一套深色变体；历史的多套主题已随视觉收敛移除。
export type OwTheme = 'light' | 'dark'

export interface OwThemeMeta {
  value: OwTheme
  name: string
  desc: string
  dark: boolean
  preview: string
}

export const OW_THEMES: OwThemeMeta[] = [
  { value: 'light', name: '晨野', desc: '清新自然 · 浅色', dark: false, preview: 'linear-gradient(135deg,#34c98a,#6f8df0)' },
  { value: 'dark', name: '夜航', desc: '幽静暗夜 · 深色', dark: true, preview: 'linear-gradient(135deg,#1f8f6e,#5566d0)' },
]

/** 历史主题值 → 收敛后的最近似主题（旧浏览器存储不再报错，静默迁移）。 */
const THEME_MIGRATION: Record<string, OwTheme> = {
  light: 'light',
  dark: 'dark',
  sakura: 'light',
  abyss: 'dark',
  sunset: 'light',
  cosmos: 'dark',
  frost: 'light',
  aurora: 'dark',
}

const THEME_STORAGE_KEY = 'ow_theme'

/* 阅读偏好（26 号阶段④）：只保存在当前浏览器，开启后字号阶梯整档 +2px。 */
const LARGE_TEXT_KEY = 'ow_text_large'

function readStoredLargeText(): boolean {
  try {
    return localStorage.getItem(LARGE_TEXT_KEY) === '1'
  } catch {
    return false
  }
}

function readStoredTheme(): OwTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored) return THEME_MIGRATION[stored] ?? 'light'
  } catch {
    /* localStorage 不可用时使用默认主题 */
  }
  return 'light'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<OwTheme>(readStoredTheme())
  const largeText = ref(readStoredLargeText())

  function applyLargeText(next: boolean): void {
    largeText.value = next
    document.documentElement.classList.toggle('ow-text-large', next)
    try {
      localStorage.setItem(LARGE_TEXT_KEY, next ? '1' : '0')
    } catch {
      /* 忽略持久化失败 */
    }
  }

  function toggleLargeText(): void {
    applyLargeText(!largeText.value)
  }

  function apply(next: OwTheme): void {
    theme.value = next
    const root = document.documentElement
    if (next === 'light') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', next)
    }
    const dark = OW_THEMES.find((item) => item.value === next)?.dark ?? false
    root.classList.toggle('dark', dark)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* 忽略持久化失败 */
    }
  }

  function init(): void {
    apply(theme.value)
    applyLargeText(largeText.value)
  }

  function toggleNext(): void {
    const index = OW_THEMES.findIndex((item) => item.value === theme.value)
    const next = OW_THEMES[(index + 1) % OW_THEMES.length] ?? OW_THEMES[0]
    if (next) apply(next.value)
  }

  return { theme, largeText, apply, applyLargeText, toggleLargeText, init, toggleNext }
})
