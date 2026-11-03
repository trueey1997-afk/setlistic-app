import { useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Maximize, Minimize, StickyNote, X } from 'lucide-react'
import type { SetlistDetail, SetlistItem } from '@shared/types'
import { formatClock } from '@shared/format'
import { ChordPane } from './SongMedia'

/**
 * Full-window view for playing a set live: one song at a time in large type, with the
 * chords below and the running order beside. Arrow keys and PageUp/PageDown move between
 * songs, so a Bluetooth page-turner pedal works too. Moving forward ticks the song as played.
 */
export function StageMode({
  setlist,
  onPlayed,
  onClose
}: {
  setlist: SetlistDetail
  onPlayed: (item: SetlistItem, played: boolean) => void
  onClose: () => void
}): React.JSX.Element {
  const { items } = setlist
  // Pick up where the band left off
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((it) => !it.played)
    )
  )
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)
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
      {/* ── Top bar ── */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
        <StageButton label="ออกจากโหมดเล่นสด (Esc)" onClick={onClose}>
          <X />
        </StageButton>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{setlist.name}</p>
          <div className="mt-1 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(playedCount / items.length) * 100}%` }}
              />
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              เล่นแล้ว {playedCount}/{items.length}
            </span>
          </div>
        </div>
        <StageButton label={fullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize /> : <Maximize />}
        </StageButton>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Current song ── */}
        <main className="@container flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div className="flex min-w-0 flex-1 items-end gap-5">
              <span className="font-mono text-7xl leading-none font-bold text-primary tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <h1 className="text-4xl leading-tight font-bold break-words @4xl:text-5xl">
                  {song.title}
                </h1>
                <p className="mt-1 text-xl text-muted-foreground">{song.artist || '—'}</p>
              </div>
            </div>
            <dl className="flex shrink-0 gap-8 font-mono">
              <StageStat
                label={changedKey ? `KEY (ต้นฉบับ ${song.key ?? '–'})` : 'KEY'}
                value={key ?? '–'}
                tone={changedKey ? 'warning' : 'primary'}
              />
              <StageStat label="BPM" value={song.bpm?.toString() ?? '–'} />
              <StageStat label="TIME" value={formatClock(song.durationSec)} />
            </dl>
          </div>

          {(current.note || song.notes) && (
            <div className="flex flex-col gap-1 rounded-lg border-l-4 border-primary bg-primary/10 px-4 py-3 text-lg">
              {current.note && <p className="font-semibold">{current.note}</p>}
              {song.notes && (
                <p className="flex items-start gap-2 text-base text-muted-foreground">
                  <StickyNote className="mt-1 size-4 shrink-0" /> {song.notes}
                </p>
              )}
            </div>
          )}

          <ChordPane key={current.id} chordUrl={song.chordUrl} content={song.content} fill />
        </main>

        {/* ── Running order ── */}
        <aside
          aria-label="ลำดับเพลง"
          className="hidden w-80 shrink-0 flex-col border-l border-border lg:flex"
        >
          {next && (
            <div className="border-b border-border p-4">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                ถัดไป
              </p>
              <p className="mt-1 truncate text-xl font-bold">{next.song.title}</p>
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
      <footer className="flex shrink-0 items-center gap-3 border-t border-border p-3">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="inline-flex h-14 items-center gap-2 rounded-lg border border-border px-5 text-lg font-semibold hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="size-6" /> ก่อนหน้า
        </button>
        <button
          onClick={() => onPlayed(current, !current.played)}
          aria-pressed={current.played}
          className={`inline-flex h-14 items-center gap-2 rounded-lg border px-5 text-lg font-semibold ${
            current.played
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-border hover:bg-muted'
          }`}
        >
          <Check className="size-6" /> {current.played ? 'เล่นแล้ว' : 'ติ๊กว่าเล่นแล้ว'}
        </button>
        <p className="hidden flex-1 text-center text-xs text-muted-foreground xl:block">
          ← → หรือ PageUp / PageDown (ใช้กับ pedal พลิกหน้าได้) ·
          คลิกในหน้าคอร์ดแล้วต้องคลิกนอกหน้าก่อนจึงใช้คีย์ได้
        </p>
        <button
          onClick={goNext}
          disabled={!next && current.played}
          className="ml-auto inline-flex h-14 min-w-64 items-center justify-between gap-3 rounded-lg bg-primary px-5 text-lg font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-30"
        >
          <span className="min-w-0 truncate">{next ? `ถัดไป: ${next.song.title}` : 'จบเซ็ต'}</span>
          <ChevronRight className="size-6 shrink-0" />
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
    <div className="flex flex-col gap-1">
      <dt className="text-xs tracking-widest text-muted-foreground">{label}</dt>
      <dd className={`text-4xl font-bold ${color}`}>{value}</dd>
    </div>
  )
}
