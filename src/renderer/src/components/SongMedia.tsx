import { useEffect, useRef, useState } from 'react'
import {
  AArrowDown,
  AArrowUp,
  ArrowLeft,
  CirclePlay,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Pause,
  Play,
  RotateCw
} from 'lucide-react'
import { getYouTubeId } from '@shared/youtube'
import { ExternalA } from './links'

/** Embedded player; the privacy-enhanced domain doesn't set cookies until play. */
export function YouTubePlayer({ url, title }: { url: string; title: string }): React.JSX.Element {
  const id = getYouTubeId(url)
  if (!id) {
    return (
      <div className="flex aspect-video w-full shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        <CirclePlay className="size-6" />
        {url ? 'ลิงก์ YouTube นี้เล่นในแอปไม่ได้' : 'ยังไม่มีลิงก์ YouTube'}
      </div>
    )
  }
  return (
    <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-border bg-black">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={`YouTube: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="size-full"
      />
    </div>
  )
}

/** The bits of Electron's WebviewTag we use; the renderer doesn't pull in Electron's types. */
type WebviewElement = HTMLElement & {
  reload(): void
  goBack(): void
  canGoBack(): boolean
  setZoomFactor(factor: number): void
  executeJavaScript(code: string): Promise<unknown>
}

const TICK_MS = 50
const SPEED = { min: 5, max: 150, fallback: 30 } // px per second
const SIZE = { min: 60, max: 250, step: 10, fallback: 100 } // percent
const BASE_FONT_PX = 15

/** Fills the screen beside the sticky player; a fixed share of it when stacked. */
const PANE_HEIGHT = 'h-[70vh] min-h-80 @3xl:h-[calc(100vh-12rem)]'

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
  function set(n: number): void {
    const clamped = Math.min(max, Math.max(min, n))
    setValue(clamped)
    try {
      localStorage.setItem(key, String(clamped))
    } catch {
      // Still applies for this session
    }
  }
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

/**
 * Chords/lyrics with auto-scroll and text size. Shows the chord site when there is a link,
 * or text typed into older versions of the app; songs with both can switch between them.
 * Give it `key={song.id}` so scrolling stops when another song is opened.
 */
export function ChordPane({
  chordUrl,
  content
}: {
  chordUrl: string
  content: string
}): React.JSX.Element {
  const [source, setSource] = useState<'web' | 'text'>(chordUrl ? 'web' : 'text')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useStoredNumber('setlistic-scroll-speed', SPEED)
  const [size, setSize] = useStoredNumber('setlistic-chord-size', SIZE)
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

  if (!chordUrl && !content) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <FileText className="size-6" />
        ยังไม่มีลิงก์คอร์ด กด &quot;แก้ไข&quot; แล้วใส่ &quot;ลิงก์คอร์ด / Sheet&quot;
        เพื่อดูคอร์ดในแอป
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-2 py-1.5">
        <button
          onClick={() => setPlaying(!playing)}
          aria-pressed={playing}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold [&_svg]:size-4 ${
            playing
              ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
              : 'border border-border hover:bg-muted'
          }`}
        >
          {playing ? <Pause /> : <Play />}
          {playing ? 'หยุดเลื่อน' : 'เลื่อนอัตโนมัติ'}
        </button>

        <label className="flex items-center gap-2 text-xs text-muted-foreground" title="ความเร็ว">
          <Gauge className="size-4 shrink-0" />
          <input
            type="range"
            min={SPEED.min}
            max={SPEED.max}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            aria-label="ความเร็วการเลื่อน"
            className="w-28 accent-primary"
          />
          <span className="w-8 font-mono tabular-nums">{speed}</span>
        </label>

        <div className="flex items-center gap-0.5" role="group" aria-label="ขนาดตัวอักษร">
          <ToolbarButton
            label="ตัวอักษรเล็กลง"
            disabled={size <= SIZE.min}
            onClick={() => setSize(size - SIZE.step)}
          >
            <AArrowDown />
          </ToolbarButton>
          <button
            onClick={() => setSize(SIZE.fallback)}
            title="ขนาดปกติ"
            className="w-12 rounded py-1 font-mono text-xs text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground"
          >
            {size}%
          </button>
          <ToolbarButton
            label="ตัวอักษรใหญ่ขึ้น"
            disabled={size >= SIZE.max}
            onClick={() => setSize(size + SIZE.step)}
          >
            <AArrowUp />
          </ToolbarButton>
        </div>

        {chordUrl && content && (
          <div className="ml-auto flex rounded-md border border-border p-0.5 text-xs font-semibold">
            <SourceTab active={source === 'web'} onClick={() => setSource('web')}>
              <Globe /> เว็บคอร์ด
            </SourceTab>
            <SourceTab active={source === 'text'} onClick={() => setSource('text')}>
              <FileText /> เนื้อเพลง
            </SourceTab>
          </div>
        )}
      </div>

      {source === 'web' ? (
        <ChordWeb key={chordUrl} ref={webviewRef} url={chordUrl} zoom={size / 100} />
      ) : (
        <pre
          ref={textRef}
          style={{ fontSize: (BASE_FONT_PX * size) / 100 }}
          className={`${PANE_HEIGHT} overflow-y-auto rounded-lg border border-border bg-card p-5 font-mono leading-relaxed whitespace-pre-wrap`}
        >
          {content}
        </pre>
      )}
    </div>
  )
}

/**
 * Shows the chord site inside the app. A <webview> (not an iframe) because most chord
 * sites refuse to be framed; main hardens every webview in `will-attach-webview`.
 * Text size is the page zoom, since the site's own styles decide its fonts.
 */
function ChordWeb({
  ref,
  url,
  zoom
}: {
  ref: React.RefObject<WebviewElement | null>
  url: string
  zoom: number
}): React.JSX.Element {
  const [canGoBack, setCanGoBack] = useState(false)
  const zoomRef = useRef(zoom)

  useEffect(() => {
    zoomRef.current = zoom
    try {
      ref.current?.setZoomFactor(zoom)
    } catch {
      // Not ready yet; dom-ready applies it
    }
  }, [ref, zoom])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onReady = (): void => el.setZoomFactor(zoomRef.current)
    const onNavigate = (): void => setCanGoBack(el.canGoBack())
    el.addEventListener('dom-ready', onReady)
    el.addEventListener('did-navigate', onNavigate)
    el.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      el.removeEventListener('dom-ready', onReady)
      el.removeEventListener('did-navigate', onNavigate)
      el.removeEventListener('did-navigate-in-page', onNavigate)
    }
  }, [ref])

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 px-2 py-1">
        <Globe className="mx-1 size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {url}
        </span>
        <ToolbarButton label="ย้อนกลับ" disabled={!canGoBack} onClick={() => ref.current?.goBack()}>
          <ArrowLeft />
        </ToolbarButton>
        <ToolbarButton label="โหลดใหม่" onClick={() => ref.current?.reload()}>
          <RotateCw />
        </ToolbarButton>
        <ExternalA href={url}>
          <ExternalLink /> เปิดในเบราว์เซอร์
        </ExternalA>
      </div>
      <webview
        ref={ref}
        src={url}
        // Own cookie jar, kept apart from the app and the YouTube player
        // eslint-disable-next-line react/no-unknown-property
        partition="persist:chords"
        className={`${PANE_HEIGHT} w-full bg-white`}
      />
    </div>
  )
}

function SourceTab({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded px-2 py-1 [&_svg]:size-3.5 ${
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  )
}
