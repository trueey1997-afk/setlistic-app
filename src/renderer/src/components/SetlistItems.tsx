import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  chakra,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  NativeSelect,
  Span,
  Text,
  Wrap,
  type ButtonProps,
  type GridProps
} from '@chakra-ui/react'
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
import { Badge, Dialog, Field, RowAction, selectedBar } from './ui'

const NEXT_STATUS: Record<PracticeStatus, PracticeStatus> = {
  not_started: 'practicing',
  practicing: 'ready',
  ready: 'not_started'
}
const STATUS_ICON = { not_started: Circle, practicing: Clock, ready: Check }
const STATUS_CHIP: Record<PracticeStatus, ButtonProps> = {
  not_started: { variant: 'outline', colorPalette: 'gray', color: 'fg.muted' },
  practicing: { variant: 'surface', colorPalette: 'warning' },
  ready: { variant: 'surface', colorPalette: 'success' }
}

/** Grip · # · song · key · BPM · time · actions; shared by the header and every row. */
const COLUMNS: GridProps = {
  display: 'grid',
  gridTemplateColumns: '{sizes.setlistColumns}',
  alignItems: 'center',
  gap: '2',
  px: '2'
}

/** Numbers (and the key) sit right-aligned in tabular figures so columns line up. */
const NUMERIC = {
  textAlign: 'right',
  fontFamily: 'mono',
  fontSize: 'sm',
  fontVariantNumeric: 'tabular-nums'
} as const

/** Hidden in compact rows, which have room for one line only. */
const HIDE_WHEN_COMPACT = { css: { '[data-density=compact] &': { display: 'none' } } }

export function SetlistItems({
  items,
  numberOf,
  selectedId,
  reorderable = true,
  compact = false,
  onSelect,
  onReorder,
  onRemove,
  onEdit,
  onPlayed
}: {
  items: SetlistItem[]
  /** Running-order number, which stays put while the list is filtered. */
  numberOf: (item: SetlistItem) => number
  selectedId: number | null
  /** Off while the list is filtered, since a move needs the whole order. */
  reorderable?: boolean
  /** Shorter one-line rows for long sets. */
  compact?: boolean
  onSelect: (item: SetlistItem) => void
  onReorder: (items: SetlistItem[]) => void
  onRemove: (item: SetlistItem) => void
  /** Open the per-setlist key/note dialog for this item. */
  onEdit: (item: SetlistItem) => void
  onPlayed: (item: SetlistItem, played: boolean) => void
}): React.JSX.Element {
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
    <Box
      data-density={compact ? 'compact' : 'comfortable'}
      overflow="hidden"
      rounded="card"
      borderWidth="1px"
      bg="bg.panel"
    >
      <Grid aria-hidden {...COLUMNS} h="8" borderBottomWidth="1px" textStyle="caption">
        <span />
        <Text ps="6">#</Text>
        <Text>เพลง</Text>
        <Text textAlign="right">Key</Text>
        <Text textAlign="right">BPM</Text>
        <Text textAlign="right">Time</Text>
        <span />
      </Grid>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
          <Box as="ol" divideY="1px">
            {items.map((item) => (
              <Row
                key={item.id}
                item={item}
                number={numberOf(item)}
                selected={item.id === selectedId}
                reorderable={reorderable}
                onSelect={() => onSelect(item)}
                onEdit={() => onEdit(item)}
                onRemove={() => onRemove(item)}
                onPlayed={(played) => onPlayed(item, played)}
              />
            ))}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
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
    <chakra.form
      display="flex"
      flexDirection="column"
      gap="4"
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        onSubmit({ keyOverride: keyOverride || null, note: String(f.get('note') ?? '') })
      }}
    >
      <Field label={`คีย์สำหรับงานนี้ (ต้นฉบับ: ${item.song.key ?? '–'})`}>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={keyOverride}
            onChange={(e) => setKeyOverride(e.target.value as MusicalKey | '')}
          >
            <option value="">ใช้คีย์ต้นฉบับ</option>
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
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
      <HStack justify="flex-end" gap="2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" colorPalette="accent">
          บันทึก
        </Button>
      </HStack>
    </chakra.form>
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
  onPlayed
}: {
  item: SetlistItem
  number: number
  selected: boolean
  reorderable: boolean
  onSelect: () => void
  onEdit: () => void
  onRemove: () => void
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
  const readyMembers = item.progress.filter((p) => p.status === 'ready').length

  return (
    <Box
      as="li"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className="group"
      cursor="pointer"
      bg={isDragging ? 'bg.panel' : selected ? 'bg.selected' : undefined}
      _hover={{ bg: selected ? 'bg.selected' : 'bg.muted' }}
      {...selectedBar(isDragging || selected)}
      {...(isDragging && { zIndex: 1, shadow: 'lifted' })}
    >
      <Grid {...COLUMNS} h="row.h">
        {/* Arrow keys move the row once the grip has focus (dnd-kit keyboard sensor) */}
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          variant="ghost"
          size="xs"
          color="fg.muted"
          disabled={!reorderable}
          onClick={(e) => e.stopPropagation()}
          cursor="grab"
          touchAction="none"
          _icon={{ boxSize: 'icon.size' }}
          _active={{ cursor: 'grabbing' }}
          _disabled={{ cursor: 'default', opacity: 0.25 }}
          aria-label={`ลากเพื่อย้าย ${song.title}`}
          title={reorderable ? 'ลากเพื่อจัดลำดับ' : 'ล้างช่องค้นหาก่อนจึงจัดลำดับได้'}
        >
          <GripVertical />
        </IconButton>

        <HStack gap="2" onClick={(e) => e.stopPropagation()} title="ติ๊กเมื่อเล่นเพลงนี้แล้ว">
          <Checkbox.Root
            size="sm"
            colorPalette="accent"
            checked={item.played}
            onCheckedChange={(e) => onPlayed(e.checked === true)}
            aria-label={`เล่นแล้ว: ${song.title}`}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label
              {...NUMERIC}
              fontWeight="bold"
              color={item.played ? 'fg.muted' : undefined}
            >
              {String(number).padStart(2, '0')}
            </Checkbox.Label>
          </Checkbox.Root>
        </HStack>

        <Box minW="0" opacity={item.played ? 0.5 : undefined}>
          <HStack gap="1">
            {isItemReady(item) && (
              <Icon color="success.fg" boxSize="icon.size" flexShrink={0}>
                <Check aria-label="ทั้งวงพร้อม" />
              </Icon>
            )}
            <Text
              truncate
              textStyle="title.item"
              textDecoration={item.played ? 'line-through' : undefined}
            >
              {song.title}
            </Text>
          </HStack>
          <Text truncate fontSize="xs" lineHeight="1rem" color="fg.muted" {...HIDE_WHEN_COMPACT}>
            {item.progress.length > 0 && (
              <Span fontVariantNumeric="tabular-nums">
                พร้อม {readyMembers}/{item.progress.length} ·{' '}
              </Span>
            )}
            {song.artist || '—'}
            {item.note && <Span color="fg.default"> · {item.note}</Span>}
          </Text>
        </Box>

        <Flex justify="flex-end">
          {key ? (
            <Badge tone={changedKey ? 'warning' : 'key'} fontFamily="mono" fontSize="sm">
              {key}
            </Badge>
          ) : (
            <Text {...NUMERIC} color="fg.muted">
              –
            </Text>
          )}
        </Flex>
        <Text {...NUMERIC} fontWeight="bold">
          {song.bpm ?? (
            <Span color="fg.muted" fontWeight="normal">
              –
            </Span>
          )}
        </Text>
        <Text {...NUMERIC} color="fg.muted">
          {formatClock(song.durationSec)}
        </Text>

        <Flex
          justify="flex-end"
          opacity={selected ? 1 : 0}
          _focusWithin={{ opacity: 1 }}
          _groupHover={{ opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <RowAction label="ตั้งค่าคีย์และโน้ต" onClick={onEdit}>
            <Pencil />
          </RowAction>
          <RowAction
            label="เอาออกจากเซ็ตลิสต์"
            _hover={{ bg: 'danger.subtle', color: 'danger.fg' }}
            onClick={onRemove}
          >
            <X />
          </RowAction>
        </Flex>
      </Grid>
    </Box>
  )
}

/** Click a member to cycle: ยังไม่เริ่ม → กำลังซ้อม → ซ้อมแล้ว. */
export function ProgressChips({
  progress,
  onChange
}: {
  progress: PracticeProgress[]
  onChange: (memberId: number, status: PracticeStatus) => void
}): React.JSX.Element {
  return (
    <Wrap as="ul" gap="2">
      {progress.map((p) => {
        const StatusIcon = STATUS_ICON[p.status]
        return (
          <li key={p.member.id}>
            <Button
              size="xs"
              fontWeight="semibold"
              {...STATUS_CHIP[p.status]}
              onClick={() => onChange(p.member.id, NEXT_STATUS[p.status])}
              title={`${p.member.name}: ${PRACTICE_STATUS_LABEL[p.status]} (คลิกเพื่อเปลี่ยน)`}
            >
              <StatusIcon />
              {p.member.name}
            </Button>
          </li>
        )
      })}
    </Wrap>
  )
}
