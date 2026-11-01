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

/** Call before the first render so the window never flashes the wrong theme. */
export function applyStoredTheme(): void {
  document.documentElement.dataset.theme = readTheme()
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
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
