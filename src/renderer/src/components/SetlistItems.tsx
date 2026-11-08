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
import { Check, Circle, Clock, GripVertical, Pencil, X } from 'lucide-react'
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
import { KeyChords } from './KeyChords'
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

/** Grip · # · song · key · BPM · time · actions; shared by the header and every row. */
const COLUMNS =
  'grid grid-cols-[2rem_2.75rem_minmax(0,1fr)_4rem_3.5rem_3.5rem_4.5rem] items-center gap-2'

export function SetlistItems({
  items,
  numberOf,
  selectedId,
  reorderable = true,
  onSelect,
  onReorder,
  onRemove,
  onEdit,
  onProgress,
  onPlayed
}: {
  items: SetlistItem[]
  /** Running-order number, which stays put while the list is filtered. */
  numberOf: (item: SetlistItem) => number
  selectedId: number | null
  /** Off while the list is filtered, since a move needs the whole order. */
  reorderable?: boolean
  onSelect: (item: SetlistItem) => void
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

  function onDragEnd({ active, over }: DragEndEvent): void {
    if (!over || active.id === over.id) return
    onReorder(
      arrayMove(
        items,
        items.findIndex((it) => it.id === active.id),
        items.findIndex((it) => it.id === over.id)
      )
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div
          aria-hidden
          className={`${COLUMNS} border-b border-border px-2 py-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase`}
        >
          <span />
          <span className="text-center">#</span>
          <span>เพลง</span>
          <span className="text-center">Key</span>
          <span className="text-right">BPM</span>
          <span className="text-right">Time</span>
          <span />
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-border">
              {items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  number={numberOf(item)}
                  selected={item.id === selectedId}
                  reorderable={reorderable}
                  onSelect={() => onSelect(item)}
                  onEdit={() => setEditing(item)}
                  onRemove={() => onRemove(item)}
                  onProgress={(memberId, status) => onProgress(item, memberId, status)}
                  onPlayed={(played) => onPlayed(item, played)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>

      <ItemDialog item={editing} onClose={() => setEditing(null)} onSubmit={onEdit} />
    </>
  )
}

/** Dialog around the per-setlist key and note form. */
export function ItemDialog({
  item,
  onClose,
  onSubmit
}: {
  item: SetlistItem | null
  onClose: () => void
  onSubmit: (item: SetlistItem, input: SetlistItemInput) => void
}): React.JSX.Element {
  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item ? `ตั้งค่า: ${item.song.title}` : ''}
    >
      {item && (
        <ItemForm
          key={item.id}
          item={item}
          onCancel={onClose}
          onSubmit={(input) => {
            onSubmit(item, input)
            onClose()
          }}
        />
      )}
    </Dialog>
  )
}

/** Per-setlist key and note; the chord chart follows the key as it is picked. */
function ItemForm({
  item,
  onCancel,
  onSubmit
}: {
  item: SetlistItem
  onCancel: () => void
  onSubmit: (input: SetlistItemInput) => void
}): React.JSX.Element {
  const [keyOverride, setKeyOverride] = useState<MusicalKey | ''>(item.keyOverride ?? '')

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        onSubmit({ keyOverride: keyOverride || null, note: String(f.get('note') ?? '') })
      }}
    >
      <Field label={`คีย์สำหรับงานนี้ (ต้นฉบับ: ${item.song.key ?? '–'})`}>
        <Select
          value={keyOverride}
          onChange={(e) => setKeyOverride(e.target.value as MusicalKey | '')}
        >
          <option value="">ใช้คีย์ต้นฉบับ</option>
          {MUSICAL_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
      </Field>
      <KeyChords musicalKey={keyOverride || item.song.key} />
      <Field label="โน้ตสำหรับงานนี้">
        <Input
          name="note"
          maxLength={500}
          defaultValue={item.note}
          placeholder="เช่น ต่อเพลงถัดไปเลย ไม่หยุด"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}

function Row({
  item,
  number,
  selected,
  reorderable,
  onSelect,
  onEdit,
  onRemove,
  onProgress,
  onPlayed
}: {
  item: SetlistItem
  number: number
  selected: boolean
  reorderable: boolean
  onSelect: () => void
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
  } = useSortable({ id: item.id, disabled: !reorderable })
  const { song } = item
  const key = item.keyOverride || song.key
  const changedKey = !!item.keyOverride && item.keyOverride !== song.key

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={`group relative cursor-pointer border-l-2 ${
        isDragging
          ? 'z-10 border-primary bg-muted shadow-xl'
          : selected
            ? 'border-primary bg-muted'
            : 'border-transparent hover:bg-muted/50'
      }`}
    >
      <div className={`${COLUMNS} px-2 py-2`}>
        {/* Arrow keys move the row once the grip has focus (dnd-kit keyboard sensor) */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={!reorderable}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-25"
          aria-label={`ลากเพื่อย้าย ${song.title}`}
          title={reorderable ? 'ลากเพื่อจัดลำดับ' : 'ล้างช่องค้นหาก่อนจึงจัดลำดับได้'}
        >
          <GripVertical className="size-4" />
        </button>

        <label
          className="flex cursor-pointer items-center justify-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          title="ติ๊กเมื่อเล่นเพลงนี้แล้ว"
        >
          <input
            type="checkbox"
            checked={item.played}
            onChange={(e) => onPlayed(e.target.checked)}
            className="size-3.5 cursor-pointer accent-primary"
            aria-label={`เล่นแล้ว: ${song.title}`}
          />
          <span
            className={`font-mono text-sm font-bold tabular-nums ${
              item.played ? 'text-muted-foreground' : ''
            }`}
          >
            {String(number).padStart(2, '0')}
          </span>
        </label>

        <div className={`min-w-0 ${item.played ? 'opacity-50' : ''}`}>
          <p className={`truncate text-sm font-semibold ${item.played ? 'line-through' : ''}`}>
            {isItemReady(item) && (
              <Check className="mr-1 inline size-3.5 text-emerald-500" aria-label="ทั้งวงพร้อม" />
            )}
            {song.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {song.artist || '—'}
            {item.note && <span className="text-foreground"> · {item.note}</span>}
          </p>
        </div>

        <div className="flex justify-center">
          {key ? (
            <Badge
              tone={changedKey ? 'warning' : 'key'}
              className="min-w-10 justify-center font-mono text-sm"
            >
              {key}
            </Badge>
          ) : (
            <span className="font-mono text-muted-foreground">–</span>
          )}
        </div>
        <span className="text-right font-mono text-sm font-bold tabular-nums">
          {song.bpm ?? <span className="text-muted-foreground">–</span>}
        </span>
        <span className="text-right font-mono text-sm text-muted-foreground tabular-nums">
          {formatClock(song.durationSec)}
        </span>

        <div
          className={`flex justify-end focus-within:opacity-100 group-hover:opacity-100 ${
            selected ? '' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            aria-label="ตั้งค่าคีย์และโน้ต"
            title="ตั้งค่าคีย์และโน้ต"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onRemove}
            aria-label="เอาออกจากเซ็ตลิสต์"
            title="เอาออกจากเซ็ตลิสต์"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {item.progress.length > 0 && (
        <div className="pr-2 pb-2 pl-[6.25rem]" onClick={(e) => e.stopPropagation()}>
          <ProgressChips progress={item.progress} onChange={onProgress} />
        </div>
      )}
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
    <ul className="flex flex-wrap gap-1">
      {progress.map((p) => {
        const Icon = STATUS_ICON[p.status]
        return (
          <li key={p.member.id}>
            <button
              onClick={() => onChange(p.member.id, NEXT_STATUS[p.status])}
              title={`${p.member.name}: ${PRACTICE_STATUS_LABEL[p.status]} (คลิกเพื่อเปลี่ยน)`}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[p.status]}`}
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
