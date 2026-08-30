import { defineStore } from 'pinia'
import { ref } from 'vue'

export type OwTheme =
  | 'light'
  | 'dark'
  | 'sakura'
  | 'abyss'
  | 'sunset'
  | 'cosmos'
  | 'frost'
  | 'aurora'

export interface OwThemeMeta {
  value: OwTheme
  name: string
  desc: string
  dark: boolean
  preview: string
}

export const OW_THEMES: OwThemeMeta[] = [
  { value: 'light', name: '🌿 绿茵广场', desc: '清新自然 · 浅色', dark: false, preview: 'linear-gradient(135deg,#34c98a,#6f8df0)' },
  { value: 'dark', name: '🌙 夜之精灵', desc: '幽静暗夜 · 深色', dark: true, preview: 'linear-gradient(135deg,#1f8f6e,#5566d0)' },
  { value: 'sakura', name: '🌸 樱云之境', desc: '梦幻粉樱 · 浅色', dark: false, preview: 'linear-gradient(135deg,#f07cb0,#9b8bf0)' },
  { value: 'abyss', name: '🌊 深海秘境', desc: '深蓝沉浸 · 深色', dark: true, preview: 'linear-gradient(135deg,#1fb8c8,#5566d0)' },
  { value: 'sunset', name: '🔥 落日余晖', desc: '暖金暮色 · 浅色', dark: false, preview: 'linear-gradient(135deg,#f59042,#b06ad0)' },
  { value: 'cosmos', name: '🌌 宇宙星空', desc: '深空星云 · 深色', dark: true, preview: 'radial-gradient(circle at 30% 30%, #a78bfa, transparent 60%), radial-gradient(circle at 70% 70%, #22d3ee, transparent 55%), linear-gradient(135deg,#6d28d9,#06b6d4)' },
  { value: 'frost', name: '🌫 晨雾极简', desc: '石墨灰蓝 · 浅色', dark: false, preview: 'linear-gradient(135deg,#c3cbd8,#8391a6 45%,#3f4a5c)' },
  { value: 'aurora', name: '💫 极光幻境', desc: '极光渐变 · 深色', dark: true, preview: 'linear-gradient(135deg,#0d9488,#0891b2 50%,#7c3aed)' },
]

const THEME_STORAGE_KEY = 'ow_theme'

function isOwTheme(value: string | null): value is OwTheme {
  return OW_THEMES.some((theme) => theme.value === value)
}

function readStoredTheme(): OwTheme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isOwTheme(stored)) return stored
  } catch {
    /* localStorage 不可用时使用默认主题 */
  }
  return 'light'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<OwTheme>(readStoredTheme())

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
  }

  function toggleNext(): void {
    const index = OW_THEMES.findIndex((item) => item.value === theme.value)
    const next = OW_THEMES[(index + 1) % OW_THEMES.length] ?? OW_THEMES[0]
    if (next) apply(next.value)
  }

  return { theme, apply, init, toggleNext }
})
