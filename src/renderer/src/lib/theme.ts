import { useSyncExternalStore } from 'react'
import { ACCENTS, THEMES, type AccentName, type ThemeName } from '@renderer/theme/palette'

export type { AccentName, ThemeName }

export type ThemeSettings = { theme: ThemeName; accent: AccentName }

const THEME_KEY = 'setlistic-theme'
const ACCENT_KEY = 'setlistic-accent'
const DEFAULTS: ThemeSettings = { theme: 'dark', accent: 'lime' }

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null
    return value && allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Still applies for this session
  }
}

let current: ThemeSettings = {
  theme: read(THEME_KEY, THEMES, DEFAULTS.theme),
  accent: read(ACCENT_KEY, ACCENTS, DEFAULTS.accent)
}
const listeners = new Set<() => void>()

/**
 * Puts the theme on <html>, which is what the semantic tokens in theme/system.ts key off:
 * light → `light`, dark → `dark`, stage → `dark stage`; accent → `data-accent`
 * (dropped in stage, whose accent is fixed red to protect night vision).
 */
function apply({ theme, accent }: ThemeSettings): void {
  const root = document.documentElement
  root.classList.toggle('light', theme === 'light')
  root.classList.toggle('dark', theme !== 'light')
  root.classList.toggle('stage', theme === 'stage')
  if (theme === 'stage') root.removeAttribute('data-accent')
  else root.setAttribute('data-accent', accent)
  root.style.colorScheme = theme === 'light' ? 'light' : 'dark'
}

function update(next: Partial<ThemeSettings>): void {
  current = { ...current, ...next }
  write(THEME_KEY, current.theme)
  write(ACCENT_KEY, current.accent)
  apply(current)
  listeners.forEach((l) => l())
}

/** Call before the first render so the window never flashes the wrong theme. */
export function applyStoredTheme(): void {
  apply(current)
}

export function setTheme(theme: ThemeName): void {
  update({ theme })
}

export function setAccent(accent: AccentName): void {
  update({ accent })
}

/** Steps dark → light → stage → dark (for a keyboard shortcut). */
export function cycleTheme(): void {
  setTheme(THEMES[(THEMES.indexOf(current.theme) + 1) % THEMES.length])
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current theme and accent; every component using it re-renders on change. */
export function useThemeSettings(): ThemeSettings {
  return useSyncExternalStore(subscribe, () => current)
}
