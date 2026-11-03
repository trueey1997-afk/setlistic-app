import { useState } from 'react'
import {
  CalendarDays,
  Check,
  CirclePlay,
  Copy,
  ListMusic,
  MapPin,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Timer,
  Trash2
} from 'lucide-react'
import {
  SETLIST_KINDS,
  SETLIST_KIND_LABEL,
  type SetlistDetail,
  type SetlistInput,
  type SetlistItem,
  type SetlistKind,
  type SetlistSummary
} from '@shared/types'
import { formatTotal } from '@shared/format'
import {
  SHORT_SUMMARY_LIMIT,
  formatThaiDate,
  generateLineSummary,
  isItemReady,
  lineShareUrl,
  type SummaryFormat
} from '@shared/lineSummary'
import { buildYouTubePlaylist, YOUTUBE_PLAYLIST_LIMIT } from '@shared/youtube'
import { useAsync } from '@renderer/hooks/useAsync'
import { SetlistItems } from './SetlistItems'
import { StageMode } from './StageMode'
import { SongStatusBadge } from './links'
import { useRun, useToast } from './toast'
import { Badge, Button, Dialog, EmptyState, Field, Input, Select, SidePane, Textarea } from './ui'

const SUMMARY_FORMATS: [SummaryFormat, string][] = [
  ['full', 'LINE (ละเอียด)'],
  ['short', 'สั้น (IG / Messenger)']
]

/** Local date as YYYY-MM-DD, comparable with `eventDate`. */
function todayString(): string {
  return new Date().toLocaleDateString('sv-SE')
}

/** Splits the list (dated newest first, then undated) into the groups shown in the side pane. */
function groupSetlists(list: SetlistSummary[]): { label: string; items: SetlistSummary[] }[] {
  const today = todayString()
  const upcoming = list.filter((s) => s.eventDate && s.eventDate >= today).reverse() // nearest first
  const undated = list.filter((s) => !s.eventDate)
  const past = list.filter((s) => s.eventDate && s.eventDate < today)
  return [
    { label: 'กำลังจะถึง', items: upcoming },
    { label: 'ยังไม่กำหนดวัน', items: undated },
    { label: 'ที่ผ่านมา', items: past }
  ].filter((g) => g.items.length > 0)
}

export function SetlistsPage({
  bandId,
  bandName,
  sidebarOpen
}: {
  bandId: number
  bandName: string
  sidebarOpen: boolean
}): React.JSX.Element {
  const setlists = useAsync(() => window.setlistic.setlists.list(bandId), `setlists:${bandId}`)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const run = useRun()
  const groups = groupSetlists(setlists.data ?? [])
  // Until something is picked, open the next show/rehearsal (or the newest one)
  const activeId = selectedId ?? groups[0]?.items[0]?.id ?? null

  return (
    <div className="flex min-h-0 flex-1">
      <SidePane open={sidebarOpen} label="รายการเซ็ตลิสต์" className="w-[340px]">
        <div className="border-b border-border p-3">
          <Button className="w-full" onClick={() => setCreating(true)}>
            <Plus /> สร้างเซ็ตลิสต์
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {setlists.data?.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              ยังไม่มีเซ็ตลิสต์ สร้างสำหรับวันซ้อมหรือวันเล่นได้เลย
            </p>
          )}
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h3 className="sticky top-0 z-[1] bg-background/95 px-3 pt-3 pb-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase backdrop-blur">
                {g.label} · {g.items.length}
              </h3>
              <ul>
                {g.items.map((s) => (
                  <li key={s.id}>
                    <SetlistRow
                      setlist={s}
                      selected={s.id === activeId}
                      onClick={() => setSelectedId(s.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SidePane>

      <section className="min-w-0 flex-1 overflow-y-auto">
        {activeId ? (
          <SetlistView
            key={activeId}
            setlistId={activeId}
            bandId={bandId}
            bandName={bandName}
            onChanged={setlists.reload}
            onDeleted={() => {
              setSelectedId(null)
              setlists.reload()
            }}
          />
        ) : (
          <EmptyState icon={<ListMusic />} title="เลือกเซ็ตลิสต์ หรือสร้างใหม่" />
        )}
      </section>

      <SetlistFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          const created = await run(window.setlistic.setlists.create(bandId, input))
          if (!created) return
          setCreating(false)
          setSelectedId(created.id)
          setlists.reload()
        }}
      />
    </div>
  )
}

function SetlistRow({
  setlist: s,
  selected,
  onClick
}: {
  setlist: SetlistSummary
  selected: boolean
  onClick: () => void
}): React.JSX.Element {
  const date = s.eventDate ? new Date(`${s.eventDate}T00:00:00`) : null
  const isToday = s.eventDate === todayString()
  return (
    <button
      onClick={onClick}
      aria-current={selected}
      className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left ${
        selected ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60'
      }`}
    >
      <span
        className={`flex w-12 shrink-0 flex-col items-center rounded border py-1 leading-tight ${
          s.kind === 'gig'
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background'
        }`}
      >
        {date ? (
          <>
            <span className="font-mono text-lg font-bold">{date.getDate()}</span>
            <span className="text-[10px] font-semibold opacity-80">
              {date.toLocaleDateString('th-TH', { month: 'short' })}
            </span>
          </>
        ) : (
          <span className="py-2 text-xs">–</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{s.name}</span>
          {isToday && <Badge tone="primary">วันนี้</Badge>}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {SETLIST_KIND_LABEL[s.kind]}
          {s.eventTime && ` · ${s.eventTime}`}
          {s.venue && ` · ${s.venue}`}
        </span>
      </span>
      <span className="shrink-0 text-right font-mono text-xs text-muted-foreground">
        <span className="block">{s.songCount} เพลง</span>
        {s.totalSec > 0 && <span className="block">{formatTotal(s.totalSec)}</span>}
      </span>
    </button>
  )
}

function SetlistView({
  setlistId,
  bandId,
  bandName,
  onChanged,
  onDeleted
}: {
  setlistId: number
  bandId: number
  bandName: string
  onChanged: () => void
  onDeleted: () => void
}): React.JSX.Element {
  const run = useRun()
  const toast = useToast()
  const setlist = useAsync(() => window.setlistic.setlists.get(setlistId), `setlist:${setlistId}`)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [includeProgress, setIncludeProgress] = useState(false)
  const [format, setFormat] = useState<SummaryFormat>('full')
  const [onStage, setOnStage] = useState(false)

  if (!setlist.data) return <p className="p-6 text-primary">{setlist.error}</p>
  const s = setlist.data

  /** Applies a mutation's returned setlist; refreshes the side list when counts may change. */
  async function apply(task: Promise<SetlistDetail>, listChanged = false): Promise<void> {
    const updated = await run(task)
    if (updated) setlist.setData(updated)
    else setlist.reload()
    if (listChanged) onChanged()
  }

  function reorder(items: SetlistItem[]): void {
    setlist.setData({ ...s, items }) // optimistic, so the row doesn't jump back while saving
    apply(
      window.setlistic.setlists.reorder(
        s.id,
        items.map((it) => it.id)
      )
    )
  }

  const text = generateLineSummary(s, { bandName, includeProgress, format })
  const tooLong = format === 'short' && text.length > SHORT_SUMMARY_LIMIT
  const playlist = buildYouTubePlaylist(s.items.map((it) => it.song))
  const readyCount = s.items.filter(isItemReady).length
  const playedCount = s.items.filter((it) => it.played).length

  function setPlayed(item: SetlistItem, played: boolean): void {
    // optimistic, so ticking through a live set feels instant
    setlist.setData({
      ...s,
      items: s.items.map((it) => (it.id === item.id ? { ...it, played } : it))
    })
    apply(window.setlistic.setlists.setPlayed(item.id, played))
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Badge tone={s.kind === 'gig' ? 'primary' : 'neutral'} className="self-start">
            {SETLIST_KIND_LABEL[s.kind]}
          </Badge>
          <h1 className="text-3xl font-bold break-words">{s.name}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground [&_svg]:size-4">
            {s.eventDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays /> {formatThaiDate(s.eventDate, s.eventTime)}
              </span>
            )}
            {s.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin /> {s.venue}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Timer /> ~{formatTotal(s.totalSec)}
              {s.unknownDurationCount > 0 && ` (+${s.unknownDurationCount} เพลงไม่ระบุความยาว)`}
            </span>
          </p>
          {s.notes && <p className="text-sm">{s.notes}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            disabled={s.items.length === 0}
            onClick={() => setOnStage(true)}
            title="เต็มจอ ตัวใหญ่ เปลี่ยนเพลงด้วยลูกศรหรือ pedal"
          >
            <Play /> เริ่มเล่นสด
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil /> แก้ไข
          </Button>
          <Button
            variant="danger"
            aria-label="ลบเซ็ตลิสต์"
            onClick={async () => {
              if (!confirm(`ลบเซ็ตลิสต์ "${s.name}"?`)) return
              if ((await run(window.setlistic.setlists.remove(s.id))) !== undefined) onDeleted()
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      {/* ── Share bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
        <div
          role="radiogroup"
          aria-label="รูปแบบข้อความ"
          className="flex rounded-md border border-border p-0.5 text-xs font-semibold"
        >
          {SUMMARY_FORMATS.map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={format === value}
              onClick={() => setFormat(value)}
              className={`rounded px-2.5 py-1.5 ${
                format === value
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          disabled={s.items.length === 0}
          onClick={async () => {
            if ((await run(window.setlistic.system.copyText(text))) !== undefined)
              toast(
                format === 'short'
                  ? 'คัดลอกแล้ว ไปวางในแชตได้เลย'
                  : 'คัดลอกแล้ว ไปวางในกลุ่ม LINE ได้เลย'
              )
          }}
        >
          <Copy /> คัดลอกข้อความ
        </Button>
        <Button
          variant="outline"
          disabled={s.items.length === 0 || format === 'short'}
          title={format === 'short' ? 'ส่งเข้า LINE ใช้แบบละเอียด' : undefined}
          onClick={() => run(window.setlistic.system.openExternal(lineShareUrl(text)))}
        >
          <Send /> ส่งเข้า LINE
        </Button>
        <Button
          variant="outline"
          disabled={!playlist}
          title={
            playlist
              ? `เล่น ${playlist.videoCount} เพลงต่อกันตามลำดับ` +
                (playlist.missingCount
                  ? ` · ข้าม ${playlist.missingCount} เพลงที่ไม่มีลิงก์`
                  : '') +
                (playlist.truncated ? ` · สูงสุด ${YOUTUBE_PLAYLIST_LIMIT} เพลงแรก` : '')
              : 'ยังไม่มีเพลงที่มีลิงก์ YouTube'
          }
          onClick={() => playlist && run(window.setlistic.system.openExternal(playlist.url))}
        >
          <CirclePlay /> YouTube Playlist{playlist && ` (${playlist.videoCount})`}
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeProgress}
            onChange={(e) => setIncludeProgress(e.target.checked)}
            className="size-4 accent-primary"
          />
          แนบสถานะการซ้อม
        </label>
        <details className="w-full text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            ดูตัวอย่างข้อความ{' '}
            <span className={`font-mono text-xs ${tooLong ? 'text-primary' : ''}`}>
              ({text.length.toLocaleString()}
              {format === 'short' && `/${SHORT_SUMMARY_LIMIT.toLocaleString()}`} ตัวอักษร)
            </span>
          </summary>
          {tooLong && (
            <p className="mt-2 text-xs text-primary">
              ยาวเกินที่ IG ส่งได้ในข้อความเดียว ลองย่อชื่อเซ็ต/สถานที่ หรือแบ่งเซ็ตเป็นสองช่วง
            </p>
          )}
          <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 font-sans text-xs whitespace-pre-wrap">
            {text}
          </pre>
        </details>
      </div>

      {/* ── Songs ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              รายการเพลง · {s.items.length}
            </h2>
            {s.items.length > 0 && s.items[0].progress.length > 0 && (
              <Meter label="ทั้งวงพร้อม" value={readyCount} total={s.items.length} tone="success" />
            )}
            {playedCount > 0 && (
              <Meter label="เล่นแล้ว" value={playedCount} total={s.items.length} />
            )}
          </div>
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus /> เพิ่มเพลง
          </Button>
        </div>

        {s.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            ยังไม่มีเพลงในเซ็ตนี้ กด &quot;เพิ่มเพลง&quot; เพื่อเลือกจากคลังเพลงของวง
          </div>
        ) : (
          <>
            <SetlistItems
              items={s.items}
              onReorder={reorder}
              onRemove={(item) => apply(window.setlistic.setlists.removeItem(item.id), true)}
              onEdit={(item, input) => apply(window.setlistic.setlists.updateItem(item.id, input))}
              onProgress={(item, memberId, status) =>
                apply(window.setlistic.setlists.setProgress(item.id, memberId, status))
              }
              onPlayed={setPlayed}
            />
            <p className="text-xs text-muted-foreground">
              ลากที่ไอคอน ⋮⋮ หรือกดลูกศรเพื่อจัดลำดับ · คลิกชื่อสมาชิกเพื่อเปลี่ยนสถานะการซ้อม ·
              ติ๊กช่องใต้เลขลำดับเมื่อเล่นเพลงนั้นแล้ว
            </p>
          </>
        )}
      </section>

      {onStage && <StageMode setlist={s} onPlayed={setPlayed} onClose={() => setOnStage(false)} />}

      <AddSongsDialog
        bandId={bandId}
        open={adding}
        onClose={() => setAdding(false)}
        inSetlist={new Set(s.items.map((it) => it.song.id))}
        onAdd={(songId) => apply(window.setlistic.setlists.addSong(s.id, songId), true)}
      />

      <SetlistFormDialog
        setlist={s}
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={async (input) => {
          await apply(window.setlistic.setlists.update(s.id, input), true)
          setEditing(false)
        }}
      />
    </div>
  )
}

function Meter({
  label,
  value,
  total,
  tone = 'primary'
}: {
  label: string
  value: number
  total: number
  tone?: 'primary' | 'success'
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <span
          className={`block h-full rounded-full ${tone === 'success' ? 'bg-emerald-500' : 'bg-primary'}`}
          style={{ width: `${(value / total) * 100}%` }}
        />
      </span>
      <span className="font-mono tabular-nums">
        {value}/{total}
      </span>
    </span>
  )
}

function AddSongsDialog({
  bandId,
  open,
  onClose,
  inSetlist,
  onAdd
}: {
  bandId: number
  open: boolean
  onClose: () => void
  inSetlist: Set<number>
  onAdd: (songId: number) => void
}): React.JSX.Element {
  const [search, setSearch] = useState('')
  const songs = useAsync(
    () => (open ? window.setlistic.songs.list(bandId, { search }) : Promise.resolve(null)),
    `add-songs:${bandId}:${open}:${search}`
  )

  return (
    <Dialog open={open} onClose={onClose} title="เพิ่มเพลงจากคลัง">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเพลง"
            className="pl-8"
            autoFocus
          />
        </div>
        {songs.data?.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ไม่พบเพลง เพิ่มเพลงในแท็บ &quot;เพลง&quot; ก่อน
          </p>
        ) : (
          <ul className="flex max-h-[55vh] flex-col divide-y divide-border overflow-y-auto">
            {songs.data?.map((song) => {
              const added = inSetlist.has(song.id)
              return (
                <li key={song.id}>
                  <button
                    onClick={() => onAdd(song.id)}
                    className="flex w-full items-center gap-3 px-2 py-2 text-left hover:bg-muted"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded ${
                        added ? 'text-emerald-500' : 'text-primary'
                      }`}
                    >
                      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{song.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {song.artist || '—'}
                      </span>
                    </span>
                    {song.key && <Badge tone="primary">{song.key}</Badge>}
                    <SongStatusBadge status={song.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          คลิกเพื่อเพิ่มต่อท้ายเซ็ต (เพิ่มเพลงเดิมซ้ำได้ เช่น เพลง encore)
        </p>
      </div>
    </Dialog>
  )
}

function SetlistFormDialog({
  setlist,
  open,
  onClose,
  onSubmit
}: {
  setlist?: SetlistDetail
  open: boolean
  onClose: () => void
  onSubmit: (input: SetlistInput) => void
}): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} title={setlist ? 'แก้ไขเซ็ตลิสต์' : 'สร้างเซ็ตลิสต์'}>
      <form
        key={setlist?.id ?? 'new'}
        className="grid grid-cols-2 gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.currentTarget)
          const str = (k: string): string => String(f.get(k) ?? '').trim()
          onSubmit({
            name: str('name'),
            kind: str('kind') as SetlistKind,
            eventDate: str('eventDate') || null,
            eventTime: str('eventTime') || null,
            venue: str('venue'),
            notes: str('notes')
          })
        }}
      >
        <Field label="ชื่อ *" className="col-span-2">
          <Input
            name="name"
            required
            maxLength={120}
            defaultValue={setlist?.name}
            placeholder="เช่น ซ้อมใหญ่ก่อนงาน Fest"
            autoFocus
          />
        </Field>
        <Field label="ประเภท">
          <Select name="kind" defaultValue={setlist?.kind ?? 'rehearsal'}>
            {SETLIST_KINDS.map((k) => (
              <option key={k} value={k}>
                {SETLIST_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="สถานที่">
          <Input name="venue" maxLength={200} defaultValue={setlist?.venue} />
        </Field>
        <Field label="วันที่">
          <Input name="eventDate" type="date" defaultValue={setlist?.eventDate ?? ''} />
        </Field>
        <Field label="เวลา">
          <Input name="eventTime" type="time" defaultValue={setlist?.eventTime ?? ''} />
        </Field>
        <Field label="หมายเหตุ" className="col-span-2">
          <Textarea name="notes" rows={2} maxLength={5000} defaultValue={setlist?.notes} />
        </Field>
        <div className="col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </Dialog>
  )
}
