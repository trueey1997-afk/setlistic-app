import { useCallback, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'setlistic-theme'

function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Chakra's `_dark` condition follows the `dark` class on <html>. */
function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme === 'light')
  root.style.colorScheme = theme
}

/** Call before the first render so the window never flashes the wrong theme. */
export function applyStoredTheme(): void {
  applyTheme(readTheme())
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // Theme still switches for this session
      }
      return next
    })
  }, [])
  return [theme, toggle]
}
