import { useEffect, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  StickyNote,
  X
} from 'lucide-react'
import type { SetlistDetail, SetlistItem } from '@shared/types'
import { formatClock } from '@shared/format'
import { ChordPane } from './SongMedia'

const ORDER_KEY = 'stage.showOrder'

/**
 * Full-window view for playing a set live: one song at a time in large type, with the
 * chords below and the running order beside. Arrow keys and PageUp/PageDown move between
 * songs, so a Bluetooth page-turner pedal works too. Moving forward ticks the song as played.
 */
export function StageMode({
  setlist,
  startItemId,
  onPlayed,
  onClose
}: {
  setlist: SetlistDetail
  /** Open on this song instead of the first unplayed one. */
  startItemId?: number
  onPlayed: (item: SetlistItem, played: boolean) => void
  onClose: () => void
}): React.JSX.Element {
  const { items } = setlist
  // Pick up where the band left off
  const [index, setIndex] = useState(() => {
    const start = items.findIndex((it) => it.id === startItemId)
    return start >= 0
      ? start
      : Math.max(
          0,
          items.findIndex((it) => !it.played)
        )
  })
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)
  // The running order is hidden by default so the chords get the full width
  const [showOrder, setShowOrder] = useState(() => {
    try {
      return localStorage.getItem(ORDER_KEY) === 'open'
    } catch {
      return false
    }
  })
  const current = items[Math.min(index, items.length - 1)]
  const next = items[index + 1]
  const playedCount = items.filter((it) => it.played).length

  function goNext(): void {
    if (!current.played) onPlayed(current, true)
    setIndex((i) => Math.min(i + 1, items.length - 1))
  }

  function goPrev(): void {
    setIndex((i) => Math.max(i - 1, 0))
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  function toggleOrder(): void {
    setShowOrder((open) => {
      try {
        localStorage.setItem(ORDER_KEY, open ? 'closed' : 'open')
      } catch {
        // Not remembered; fine
      }
      return !open
    })
  }

  useEffect(() => {
    const onChange = (): void => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) document.exitFullscreen()
    }
  }, [])

  // Re-bound every render so the handler sees the current song
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // Arrow keys belong to sliders and fields while they have focus
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'l' || e.key === 'L') {
        toggleOrder()
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose() // In fullscreen, Esc first leaves fullscreen
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const { song } = current
  const key = current.keyOverride || song.key
  const changedKey = !!current.keyOverride && current.keyOverride !== song.key

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`โหมดเล่นสด: ${setlist.name}`}
      className="fixed inset-0 z-40 flex flex-col bg-background text-foreground"
    >
      {/* ── Top bar: the current song's details live here so the chords get the height ── */}
      <header className="relative flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
        <StageButton label="ออกจากโหมดเล่นสด (Esc)" onClick={onClose}>
          <X />
        </StageButton>
        <span
          className="font-mono text-3xl leading-none font-bold text-primary tabular-nums"
          title={`${setlist.name} · เล่นแล้ว ${playedCount}/${items.length}`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl leading-tight font-bold">{song.title}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {song.artist || '—'}
            <span className="ml-2 font-mono text-xs tabular-nums">
              · {setlist.name} · {playedCount}/{items.length}
            </span>
          </p>
        </div>
        <dl className="flex shrink-0 gap-5 font-mono">
          <StageStat
            label={changedKey ? `KEY (เดิม ${song.key ?? '–'})` : 'KEY'}
            value={key ?? '–'}
            tone={changedKey ? 'warning' : 'primary'}
          />
          <StageStat label="BPM" value={song.bpm?.toString() ?? '–'} />
          <StageStat label="TIME" value={formatClock(song.durationSec)} />
        </dl>
        <StageButton
          label={showOrder ? 'ซ่อนลำดับเพลง (L)' : 'แสดงลำดับเพลง (L)'}
          onClick={toggleOrder}
        >
          {showOrder ? <PanelRightClose /> : <PanelRightOpen />}
        </StageButton>
        <StageButton label={fullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize /> : <Maximize />}
        </StageButton>
        {/* Set progress as a hairline along the bottom edge */}
        <div className="absolute inset-x-0 -bottom-px h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${(playedCount / items.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Chords ── */}
        <main className="flex min-w-0 flex-1 flex-col gap-2 p-2">
          {(current.note || song.notes) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 rounded-md border-l-4 border-primary bg-primary/10 px-3 py-1.5">
              {current.note && <p className="font-semibold">{current.note}</p>}
              {song.notes && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <StickyNote className="size-3.5 shrink-0" /> {song.notes}
                </p>
              )}
            </div>
          )}

          <ChordPane key={current.id} chordUrl={song.chordUrl} content={song.content} fill />
        </main>

        {/* ── Running order ── */}
        <aside
          aria-label="ลำดับเพลง"
          className={`${showOrder ? 'flex' : 'hidden'} w-64 shrink-0 flex-col border-l border-border`}
        >
          {next && (
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                ถัดไป
              </p>
              <p className="truncate text-lg font-bold">{next.song.title}</p>
              <p className="font-mono text-sm text-primary">
                Key {next.keyOverride || next.song.key || '–'}
                {next.song.bpm && (
                  <span className="text-muted-foreground"> · {next.song.bpm} BPM</span>
                )}
              </p>
            </div>
          )}
          <ol className="min-h-0 flex-1 overflow-y-auto py-1">
            {items.map((it, i) => (
              <li key={it.id}>
                <button
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  className={`flex w-full items-center gap-3 border-l-4 px-4 py-2.5 text-left ${
                    i === index ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60'
                  } ${it.played && i !== index ? 'text-muted-foreground' : ''}`}
                >
                  <span className="w-6 shrink-0 font-mono text-sm font-bold tabular-nums">
                    {it.played ? <Check className="size-4 text-emerald-500" /> : i + 1}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${it.played ? 'line-through' : ''}`}>
                    {it.song.title}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {it.keyOverride || it.song.key}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {/* ── Big controls, easy to hit mid-song ── */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-2 py-1.5">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border px-4 font-semibold hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="size-5" /> ก่อนหน้า
        </button>
        <button
          onClick={() => onPlayed(current, !current.played)}
          aria-pressed={current.played}
          className={`inline-flex h-11 items-center gap-1.5 rounded-lg border px-4 font-semibold ${
            current.played
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-border hover:bg-muted'
          }`}
        >
          <Check className="size-5" /> {current.played ? 'เล่นแล้ว' : 'ติ๊กว่าเล่นแล้ว'}
        </button>
        <p className="hidden flex-1 truncate text-center text-xs text-muted-foreground xl:block">
          ← → / PageUp PageDown (pedal ได้) · L ซ่อน/แสดงลำดับเพลง · คลิกนอกหน้าคอร์ดก่อนใช้คีย์
        </p>
        <button
          onClick={goNext}
          disabled={!next && current.played}
          className="ml-auto inline-flex h-11 max-w-md min-w-56 items-center justify-between gap-3 rounded-lg bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-30"
        >
          <span className="min-w-0 truncate">{next ? `ถัดไป: ${next.song.title}` : 'จบเซ็ต'}</span>
          <ChevronRight className="size-5 shrink-0" />
        </button>
      </footer>
    </div>
  )
}

function StageButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-5"
    >
      {children}
    </button>
  )
}

function StageStat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'primary' | 'warning'
}): React.JSX.Element {
  const color =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : ''
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] tracking-widest text-muted-foreground">{label}</dt>
      <dd className={`text-2xl leading-tight font-bold ${color}`}>{value}</dd>
    </div>
  )
}
