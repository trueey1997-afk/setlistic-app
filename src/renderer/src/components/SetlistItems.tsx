import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, ChevronDown, ChevronUp, Circle, Clock, GripVertical, Pencil, X } from 'lucide-react'
import {
  MUSICAL_KEYS,
  PRACTICE_STATUS_LABEL,
  type MusicalKey,
  type PracticeProgress,
  type PracticeStatus,
  type SetlistItem,
  type SetlistItemInput
} from '@shared/types'
import { formatClock } from '@shared/format'
import { isItemReady } from '@shared/lineSummary'
import { SongLinks } from './links'
import { Badge, Button, Dialog, Field, Input, Select } from './ui'

const NEXT_STATUS: Record<PracticeStatus, PracticeStatus> = {
  not_started: 'practicing',
  practicing: 'ready',
  ready: 'not_started'
}
const STATUS_ICON = { not_started: Circle, practicing: Clock, ready: Check }
const STATUS_CHIP: Record<PracticeStatus, string> = {
  not_started: 'border-border text-muted-foreground',
  practicing: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  ready: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
}

export function SetlistItems({
  items,
  onReorder,
  onRemove,
  onEdit,
  onProgress,
  onPlayed
}: {
  items: SetlistItem[]
  onReorder: (items: SetlistItem[]) => void
  onRemove: (item: SetlistItem) => void
  onEdit: (item: SetlistItem, input: SetlistItemInput) => void
  onProgress: (item: SetlistItem, memberId: number, status: PracticeStatus) => void
  onPlayed: (item: SetlistItem, played: boolean) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState<SetlistItem | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function move(from: number, to: number): void {
    if (to < 0 || to >= items.length) return
    onReorder(arrayMove(items, from, to))
  }

  function onDragEnd({ active, over }: DragEndEvent): void {
    if (!over || active.id === over.id) return
    move(
      items.findIndex((it) => it.id === active.id),
      items.findIndex((it) => it.id === over.id)
    )
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2">
            {items.map((item, i) => (
              <Row
                key={item.id}
                item={item}
                index={i}
                last={i === items.length - 1}
                onUp={() => move(i, i - 1)}
                onDown={() => move(i, i + 1)}
                onEdit={() => setEditing(item)}
                onRemove={() => onRemove(item)}
                onProgress={(memberId, status) => onProgress(item, memberId, status)}
                onPlayed={(played) => onPlayed(item, played)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `ตั้งค่า: ${editing.song.title}` : ''}
      >
        {editing && (
          <form
            key={editing.id}
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              onEdit(editing, {
                keyOverride: (String(f.get('keyOverride')) || null) as MusicalKey | null,
                note: String(f.get('note') ?? '')
              })
              setEditing(null)
            }}
          >
            <Field label={`คีย์สำหรับงานนี้ (ต้นฉบับ: ${editing.song.key ?? '–'})`}>
              <Select name="keyOverride" defaultValue={editing.keyOverride ?? ''}>
                <option value="">ใช้คีย์ต้นฉบับ</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="โน้ตสำหรับงานนี้">
              <Input
                name="note"
                maxLength={500}
                defaultValue={editing.note}
                placeholder="เช่น ต่อเพลงถัดไปเลย ไม่หยุด"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                ยกเลิก
              </Button>
              <Button type="submit">บันทึก</Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  )
}

function Row({
  item,
  index,
  last,
  onUp,
  onDown,
  onEdit,
  onRemove,
  onProgress,
  onPlayed
}: {
  item: SetlistItem
  index: number
  last: boolean
  onUp: () => void
  onDown: () => void
  onEdit: () => void
  onRemove: () => void
  onProgress: (memberId: number, status: PracticeStatus) => void
  onPlayed: (played: boolean) => void
}): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })
  const { song } = item
  const key = item.keyOverride || song.key
  const changedKey = !!item.keyOverride && item.keyOverride !== song.key

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex gap-2 rounded-lg border bg-card p-3 ${
        isDragging
          ? 'relative z-10 border-primary shadow-xl'
          : isItemReady(item)
            ? 'border-emerald-500/40'
            : 'border-border'
      }`}
    >
      <div className="flex shrink-0 flex-col items-center">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label={`ลากเพื่อย้าย ${song.title}`}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          onClick={onUp}
          disabled={index === 0}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25"
          aria-label="เลื่อนขึ้น"
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          onClick={onDown}
          disabled={last}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-25"
          aria-label="เลื่อนลง"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      <label className="flex shrink-0 cursor-pointer flex-col items-center gap-2 pt-0.5">
        <span
          className={`w-9 text-center font-mono text-2xl leading-none font-bold tabular-nums ${
            item.played ? 'text-muted-foreground' : 'text-primary'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <input
          type="checkbox"
          checked={item.played}
          onChange={(e) => onPlayed(e.target.checked)}
          className="size-5 cursor-pointer accent-primary"
          aria-label={`เล่นแล้ว: ${song.title}`}
          title="ติ๊กเมื่อเล่นเพลงนี้แล้ว"
        />
      </label>

      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${item.played ? 'opacity-50' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`truncate font-semibold ${item.played ? 'line-through' : ''}`}>
              {song.title}
            </p>
            <p className="truncate text-sm text-muted-foreground">{song.artist || '—'}</p>
          </div>
          <div className="flex shrink-0">
            <Button variant="ghost" onClick={onEdit} aria-label="ตั้งค่าคีย์และโน้ต">
              <Pencil />
            </Button>
            <Button variant="ghost" onClick={onRemove} aria-label="เอาออกจากเซ็ตลิสต์">
              <X />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono">
          {key && (
            <Badge tone={changedKey ? 'warning' : 'primary'}>
              Key {key}
              {changedKey && ' (เปลี่ยน)'}
            </Badge>
          )}
          {song.bpm && <Badge>{song.bpm} BPM</Badge>}
          <Badge>{formatClock(song.durationSec)}</Badge>
          <span className="font-sans">
            <SongLinks youtubeUrl={song.youtubeUrl} chordUrl={song.chordUrl} />
          </span>
        </div>

        {item.note && <p className="border-l-2 border-primary pl-2 text-sm">{item.note}</p>}

        {item.progress.length > 0 && (
          <ProgressChips progress={item.progress} onChange={onProgress} />
        )}
      </div>
    </li>
  )
}

/** Click a member to cycle: ยังไม่เริ่ม → กำลังซ้อม → ซ้อมแล้ว. */
function ProgressChips({
  progress,
  onChange
}: {
  progress: PracticeProgress[]
  onChange: (memberId: number, status: PracticeStatus) => void
}): React.JSX.Element {
  return (
    <ul className="flex flex-wrap gap-1 border-t border-border pt-2">
      {progress.map((p) => {
        const Icon = STATUS_ICON[p.status]
        return (
          <li key={p.member.id}>
            <button
              onClick={() => onChange(p.member.id, NEXT_STATUS[p.status])}
              title={`${p.member.name}: ${PRACTICE_STATUS_LABEL[p.status]} (คลิกเพื่อเปลี่ยน)`}
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[p.status]}`}
            >
              <Icon className="size-3" />
              {p.member.name}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
