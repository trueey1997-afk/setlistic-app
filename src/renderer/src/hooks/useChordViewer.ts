/**
 * Chord-sheet state shared by the pieces in components/SongMedia.tsx (auto-scroll, speed,
 * text size, source, webview navigation) and the song page's keyboard shortcuts.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** The bits of Electron's WebviewTag we use; the renderer doesn't pull in Electron's types. */
export type WebviewElement = HTMLElement & {
  reload(): void
  goBack(): void
  canGoBack(): boolean
  setZoomFactor(factor: number): void
  executeJavaScript(code: string): Promise<unknown>
}

const TICK_MS = 50
/** px per second; shown as a multiple of `fallback` (30 px/s = 1.0x) */
export const SPEED = { min: 5, max: 150, step: 3, fallback: 30 }
export const SIZE = { min: 60, max: 250, step: 10, fallback: 100 } // percent

function useStoredNumber(
  key: string,
  { min, max, fallback }: { min: number; max: number; fallback: number }
): [number, (n: number) => void] {
  const [value, setValue] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key))
      return n >= min && n <= max ? n : fallback
    } catch {
      return fallback
    }
  })
  const set = useCallback(
    (n: number): void => {
      const clamped = Math.min(max, Math.max(min, n))
      setValue(clamped)
      try {
        localStorage.setItem(key, String(clamped))
      } catch {
        // Still applies for this session
      }
    },
    [key, min, max]
  )
  return [value, set]
}

/** Scrolls the page inside a webview; resolves true once it hits the bottom. */
async function scrollWebview(el: WebviewElement | null, px: number): Promise<boolean> {
  if (!el) return true
  try {
    const atEnd = await el.executeJavaScript(
      `window.scrollBy(0, ${px}); innerHeight + scrollY >= document.documentElement.scrollHeight - 2`
    )
    return atEnd === true
  } catch {
    return false // Page still loading
  }
}

function scrollElement(el: HTMLElement | null, px: number): boolean {
  if (!el) return true
  el.scrollTop += px
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 2
}

export interface ChordViewer {
  chordUrl: string
  content: string
  /** No chord link and no typed text */
  empty: boolean
  /** Has a chord link and typed text, so the source can be switched */
  hasBoth: boolean
  source: 'web' | 'text'
  setSource: (source: 'web' | 'text') => void
  playing: boolean
  setPlaying: (playing: boolean) => void
  /** px per second */
  speed: number
  setSpeed: (speed: number) => void
  /** percent */
  size: number
  setSize: (size: number) => void
  canGoBack: boolean
  setCanGoBack: (canGoBack: boolean) => void
  webviewRef: React.RefObject<WebviewElement | null>
  textRef: React.RefObject<HTMLPreElement | null>
}

/**
 * State of one chord sheet: which source is showing (chord site or typed text), auto-scroll,
 * speed and text size (both remembered). The pieces below (ChordControls, ChordSourceSwitch,
 * ChordWebNav, ChordView) all read it, so a screen can place them in different regions.
 * Remount (change `key`) when the song changes, so scrolling stops.
 */
export function useChordViewer(chordUrl: string, content: string): ChordViewer {
  const [source, setSource] = useState<'web' | 'text'>(chordUrl ? 'web' : 'text')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useStoredNumber('setlistic-scroll-speed', SPEED)
  const [size, setSize] = useStoredNumber('setlistic-chord-size', SIZE)
  const [canGoBack, setCanGoBack] = useState(false)
  const webviewRef = useRef<WebviewElement>(null)
  const textRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!playing) return
    let carry = 0 // Sub-pixel remainder, so slow speeds still move
    const timer = setInterval(async () => {
      carry += (speed * TICK_MS) / 1000
      const px = Math.floor(carry)
      if (px === 0) return
      carry -= px
      const atEnd =
        source === 'web'
          ? await scrollWebview(webviewRef.current, px)
          : scrollElement(textRef.current, px)
      if (atEnd) setPlaying(false)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [playing, speed, source])

  return {
    chordUrl,
    content,
    empty: !chordUrl && !content,
    hasBoth: !!chordUrl && !!content,
    source,
    setSource,
    playing,
    setPlaying,
    speed,
    setSpeed,
    size,
    setSize,
    canGoBack,
    setCanGoBack,
    webviewRef,
    textRef
  }
}

/** Elements where Space already means something (type, press, slide). */
const SPACE_TAKEN = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[contenteditable="true"]',
  '[role="slider"]',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="separator"]'
].join(', ')

/**
 * Song-page shortcuts: Space starts/stops auto-scroll; Ctrl+= / Ctrl+- / Ctrl+0 change the
 * text size (instead of Electron's whole-window zoom on those keys). Keys pressed inside the
 * chord site's webview stay in the webview.
 */
export function useChordShortcuts(viewer: ChordViewer, enabled = true): void {
  const { empty, playing, setPlaying, size, setSize } = viewer
  useEffect(() => {
    if (empty || !enabled) return
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.repeat || target?.closest(SPACE_TAKEN)) return
        e.preventDefault()
        setPlaying(!playing)
        return
      }
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault()
        setSize(size + SIZE.step)
      } else if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault()
        setSize(size - SIZE.step)
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault()
        setSize(SIZE.fallback)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [empty, enabled, playing, setPlaying, size, setSize])
}
