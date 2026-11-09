import { useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  chakra,
  Flex,
  Grid,
  HStack,
  IconButton,
  Input,
  NativeSelect,
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
import { Badge, Dialog, Field } from './ui'

const NEXT_STATUS: Record<PracticeStatus, PracticeStatus> = {
  not_started: 'practicing',
  practicing: 'ready',
  ready: 'not_started'
}
const STATUS_ICON = { not_started: Circle, practicing: Clock, ready: Check }
const STATUS_CHIP: Record<PracticeStatus, ButtonProps> = {
  not_started: { variant: 'outline', colorPalette: 'gray', color: 'fg.muted' },
  practicing: { variant: 'surface', colorPalette: 'orange' },
  ready: { variant: 'surface', colorPalette: 'green' }
}

/** Grip · # · song · key · BPM · time · actions; shared by the header and every row. */
const COLUMNS: GridProps = {
  display: 'grid',
  gridTemplateColumns: '2rem 2.75rem minmax(0,1fr) 4rem 3.5rem 3.5rem 4.5rem',
  alignItems: 'center',
  gap: '2'
}

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
      <Box overflow="hidden" rounded="xl" borderWidth="1px" bg="bg.panel">
        <Grid
          aria-hidden
          {...COLUMNS}
          borderBottomWidth="1px"
          px="2"
          py="2"
          fontSize="10px"
          fontWeight="bold"
          letterSpacing="widest"
          color="fg.muted"
          textTransform="uppercase"
        >
          <span />
          <Text textAlign="center">#</Text>
          <Text>เพลง</Text>
          <Text textAlign="center">Key</Text>
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
                  onEdit={() => setEditing(item)}
                  onRemove={() => onRemove(item)}
                  onProgress={(memberId, status) => onProgress(item, memberId, status)}
                  onPlayed={(played) => onPlayed(item, played)}
                />
              ))}
            </Box>
          </SortableContext>
        </DndContext>
      </Box>

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
        <Button type="submit" colorPalette="brand">
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
    <Box
      as="li"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className="group"
      position="relative"
      cursor="pointer"
      borderLeftWidth="2px"
      borderColor={isDragging || selected ? 'brand.solid' : 'transparent'}
      bg={isDragging || selected ? 'bg.muted' : undefined}
      _hover={{ bg: 'bg.muted' }}
      {...(isDragging && { zIndex: 1, shadow: 'xl' })}
    >
      <Grid {...COLUMNS} px="2" py="2">
        {/* Arrow keys move the row once the grip has focus (dnd-kit keyboard sensor) */}
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          variant="ghost"
          size="2xs"
          color="fg.muted"
          disabled={!reorderable}
          onClick={(e) => e.stopPropagation()}
          cursor="grab"
          touchAction="none"
          _active={{ cursor: 'grabbing' }}
          _disabled={{ cursor: 'default', opacity: 0.25 }}
          aria-label={`ลากเพื่อย้าย ${song.title}`}
          title={reorderable ? 'ลากเพื่อจัดลำดับ' : 'ล้างช่องค้นหาก่อนจึงจัดลำดับได้'}
        >
          <GripVertical />
        </IconButton>

        <HStack
          justify="center"
          gap="1.5"
          onClick={(e) => e.stopPropagation()}
          title="ติ๊กเมื่อเล่นเพลงนี้แล้ว"
        >
          <Checkbox.Root
            size="xs"
            colorPalette="brand"
            checked={item.played}
            onCheckedChange={(e) => onPlayed(e.checked === true)}
            aria-label={`เล่นแล้ว: ${song.title}`}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label
              fontFamily="mono"
              fontSize="sm"
              fontWeight="bold"
              fontVariantNumeric="tabular-nums"
              color={item.played ? 'fg.muted' : undefined}
            >
              {String(number).padStart(2, '0')}
            </Checkbox.Label>
          </Checkbox.Root>
        </HStack>

        <Box minW="0" opacity={item.played ? 0.5 : undefined}>
          <Text
            truncate
            fontSize="sm"
            fontWeight="semibold"
            textDecoration={item.played ? 'line-through' : undefined}
          >
            {isItemReady(item) && (
              <Check
                size={14}
                color="var(--chakra-colors-green-500)"
                style={{ display: 'inline', marginRight: 4 }}
                aria-label="ทั้งวงพร้อม"
              />
            )}
            {song.title}
          </Text>
          <Text truncate fontSize="xs" color="fg.muted">
            {song.artist || '—'}
            {item.note && (
              <Text as="span" color="fg">
                {' '}
                · {item.note}
              </Text>
            )}
          </Text>
        </Box>

        <Flex justify="center">
          {key ? (
            <Badge
              tone={changedKey ? 'warning' : 'key'}
              minW="10"
              justifyContent="center"
              fontFamily="mono"
              fontSize="sm"
            >
              {key}
            </Badge>
          ) : (
            <Text fontFamily="mono" color="fg.muted">
              –
            </Text>
          )}
        </Flex>
        <Text
          textAlign="right"
          fontFamily="mono"
          fontSize="sm"
          fontWeight="bold"
          fontVariantNumeric="tabular-nums"
        >
          {song.bpm ?? (
            <Text as="span" color="fg.muted">
              –
            </Text>
          )}
        </Text>
        <Text
          textAlign="right"
          fontFamily="mono"
          fontSize="sm"
          color="fg.muted"
          fontVariantNumeric="tabular-nums"
        >
          {formatClock(song.durationSec)}
        </Text>

        <Flex
          justify="flex-end"
          opacity={selected ? 1 : 0}
          _focusWithin={{ opacity: 1 }}
          _groupHover={{ opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            variant="ghost"
            size="xs"
            color="fg.muted"
            onClick={onEdit}
            aria-label="ตั้งค่าคีย์และโน้ต"
            title="ตั้งค่าคีย์และโน้ต"
          >
            <Pencil />
          </IconButton>
          <IconButton
            variant="ghost"
            size="xs"
            color="fg.muted"
            _hover={{ bg: 'red.subtle', color: 'fg.error' }}
            onClick={onRemove}
            aria-label="เอาออกจากเซ็ตลิสต์"
            title="เอาออกจากเซ็ตลิสต์"
          >
            <X />
          </IconButton>
        </Flex>
      </Grid>

      {item.progress.length > 0 && (
        <Box pr="2" pb="2" pl="6.25rem" onClick={(e) => e.stopPropagation()}>
          <ProgressChips progress={item.progress} onChange={onProgress} />
        </Box>
      )}
    </Box>
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
    <Wrap as="ul" gap="1">
      {progress.map((p) => {
        const Icon = STATUS_ICON[p.status]
        return (
          <li key={p.member.id}>
            <Button
              size="2xs"
              px="2"
              fontWeight="semibold"
              {...STATUS_CHIP[p.status]}
              onClick={() => onChange(p.member.id, NEXT_STATUS[p.status])}
              title={`${p.member.name}: ${PRACTICE_STATUS_LABEL[p.status]} (คลิกเพื่อเปลี่ยน)`}
            >
              <Icon />
              {p.member.name}
            </Button>
          </li>
        )
      })}
    </Wrap>
  )
}
