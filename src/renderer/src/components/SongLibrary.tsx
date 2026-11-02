import { useEffect, useRef, useState } from 'react'
import { Music, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  MUSICAL_KEYS,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type Member,
  type MusicalKey,
  type Song,
  type SongStatus
} from '@shared/types'
import { formatClock } from '@shared/format'
import { useAsync } from '@renderer/hooks/useAsync'
import { InstrumentNotes } from './InstrumentNotes'
import { SongFormDialog } from './SongForm'
import { SongLinks, SongStatusBadge } from './links'
import { ChordPane, YouTubePlayer } from './SongMedia'
import { useRun } from './toast'
import { Badge, Button, EmptyState, Input, Select, SidePane } from './ui'

export function SongLibrary({
  bandId,
  sidebarOpen
}: {
  bandId: number
  sidebarOpen: boolean
}): React.JSX.Element {
  const run = useRun()
  const [search, setSearch] = useState('')
  const [key, setKey] = useState<MusicalKey | ''>('')
  const [status, setStatus] = useState<SongStatus | ''>('')
  const songs = useAsync(
    () =>
      window.setlistic.songs.list(bandId, {
        search,
        key: key || undefined,
        status: status || undefined
      }),
    `songs:${bandId}:${search}:${key}:${status}`
  )
  const band = useAsync(() => window.setlistic.bands.get(bandId), `band:${bandId}`)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editing, setEditing] = useState<Song | 'new' | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = songs.data?.find((s) => s.id === selectedId) ?? null

  // Desktop shortcuts: Ctrl+N new song, Ctrl+F search
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'n') {
        e.preventDefault()
        setEditing('new')
      } else if (e.key === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function remove(song: Song): Promise<void> {
    if (!confirm(`ลบเพลง "${song.title}"?\nเพลงนี้จะถูกเอาออกจากทุกเซ็ตลิสต์ด้วย`)) return
    if ((await run(window.setlistic.songs.remove(song.id))) === undefined) return
    setSelectedId(null)
    songs.reload()
  }

  return (
    <div className="flex min-h-0 flex-1">
      {/* ── List pane ── */}
      <SidePane open={sidebarOpen} label="รายการเพลง" className="w-[380px]">
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเพลง / ศิลปิน  (Ctrl+F)"
              className="pl-8"
              aria-label="ค้นหาเพลง"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={key}
              onChange={(e) => setKey(e.target.value as MusicalKey | '')}
              aria-label="กรองตามคีย์"
            >
              <option value="">ทุกคีย์</option>
              {MUSICAL_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as SongStatus | '')}
              aria-label="กรองตามสถานะ"
            >
              <option value="">ทุกสถานะ</option>
              {SONG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SONG_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={() => setEditing('new')} title="Ctrl+N">
            <Plus /> เพิ่มเพลง
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {songs.error ? (
            <p className="p-4 text-sm text-primary">{songs.error}</p>
          ) : !songs.data ? null : songs.data.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {search || key || status
                ? 'ไม่พบเพลงที่ตรงกับการค้นหา'
                : 'ยังไม่มีเพลง กด "เพิ่มเพลง" เพื่อเริ่ม'}
            </p>
          ) : (
            <ul>
              {songs.data.map((song) => (
                <li key={song.id}>
                  <button
                    onClick={() => setSelectedId(song.id)}
                    onDoubleClick={() => setEditing(song)}
                    aria-current={song.id === selectedId}
                    className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left ${
                      song.id === selectedId
                        ? 'border-primary bg-muted'
                        : 'border-transparent hover:bg-muted/60'
                    }`}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-background font-mono text-sm font-bold text-primary">
                      {song.key ?? '–'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{song.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {song.artist || '—'}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <SongStatusBadge status={song.status} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatClock(song.durationSec)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {songs.data && (
          <p className="border-t border-border px-3 py-2 font-mono text-xs text-muted-foreground">
            {songs.data.length} เพลง
          </p>
        )}
      </SidePane>

      {/* ── Detail pane ── */}
      <section className="min-w-0 flex-1 overflow-y-auto">
        {selected ? (
          <SongDetail
            song={selected}
            members={band.data?.members ?? []}
            onEdit={() => setEditing(selected)}
            onDelete={() => remove(selected)}
            onChange={() => songs.reload()}
          />
        ) : (
          <EmptyState icon={<Music />} title="เลือกเพลงจากรายการเพื่อฟังเพลง ดูคอร์ด และโน้ต" />
        )}
      </section>

      <SongFormDialog
        bandId={bandId}
        open={editing !== null}
        song={editing === 'new' || editing === null ? undefined : editing}
        onClose={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null)
          setSelectedId(saved.id)
          songs.reload()
        }}
      />
    </div>
  )
}

function SongDetail({
  song,
  members,
  onEdit,
  onDelete,
  onChange
}: {
  song: Song
  members: Member[]
  onEdit: () => void
  onDelete: () => void
  onChange: (song: Song) => void
}): React.JSX.Element {
  return (
    // Container queries: the split depends on the pane's width, which the sidebar changes
    <article className="@container mx-auto flex max-w-[1600px] flex-col gap-5 p-6">
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold break-words">{song.title}</h1>
          <p className="mt-1 text-muted-foreground">{song.artist || '—'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SongStatusBadge status={song.status} />
            {song.tags.map((t) => (
              <Badge key={t}>#{t}</Badge>
            ))}
            <SongLinks youtubeUrl={song.youtubeUrl} chordUrl={song.chordUrl} />
          </div>
        </div>
        <dl className="flex shrink-0 gap-6 font-mono">
          <Stat label="KEY" value={song.key ?? '–'} accent />
          <Stat label="BPM" value={song.bpm?.toString() ?? '–'} />
          <Stat label="TIME" value={formatClock(song.durationSec)} />
        </dl>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" onClick={onEdit}>
            <Pencil /> แก้ไข
          </Button>
          <Button variant="danger" onClick={onDelete} aria-label="ลบเพลง">
            <Trash2 />
          </Button>
        </div>
      </header>

      {song.notes && <p className="border-l-2 border-primary pl-3 text-sm">{song.notes}</p>}

      {/* 65 / 35 split once there's room; stacked (player first) in a narrow pane */}
      <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <ChordPane key={song.id} chordUrl={song.chordUrl} content={song.content} />
        <aside className="order-first flex flex-col gap-6 @3xl:sticky @3xl:top-6 @3xl:order-none @3xl:max-h-[calc(100vh-6rem)] @3xl:overflow-y-auto">
          <YouTubePlayer url={song.youtubeUrl} title={song.title} />
          <InstrumentNotes song={song} members={members} onChange={onChange} />
        </aside>
      </div>
    </article>
  )
}

function Stat({
  label,
  value,
  accent
}: {
  label: string
  value: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] tracking-widest text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-bold ${accent ? 'text-primary' : ''}`}>{value}</dd>
    </div>
  )
}
