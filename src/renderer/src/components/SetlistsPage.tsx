import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Center,
  Checkbox,
  chakra,
  Collapsible,
  Flex,
  Grid,
  HStack,
  Input,
  Link,
  NativeSelect,
  Progress,
  SegmentGroup,
  Span,
  Stack,
  Text,
  Textarea,
  Wrap
} from '@chakra-ui/react'
import {
  CalendarDays,
  Check,
  CirclePlay,
  Copy,
  ExternalLink,
  FileMusic,
  ListMusic,
  MapPin,
  Pencil,
  Play,
  Plus,
  Rows4,
  Send,
  Share2,
  StickyNote,
  Trash2
} from 'lucide-react'
import {
  SETLIST_KINDS,
  SETLIST_KIND_LABEL,
  type SetlistDetail,
  type SetlistInput,
  type SetlistItem,
  type SetlistItemInput,
  type SetlistKind,
  type SetlistSummary
} from '@shared/types'
import { formatClock, formatTotal } from '@shared/format'
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
import { ItemDialog, ProgressChips, SetlistItems } from './SetlistItems'
import { StageMode } from './StageMode'
import { YouTubePlayer } from './SongMedia'
import { SongStatusBadge } from './links'
import {
  InspectorToggle,
  RailItem,
  Shell,
  ShellInspector,
  ShellMain,
  ShellRail,
  ShellSidebar,
  SidebarCollapse,
  useShell
} from './shell'
import { useRun, useToast } from './toast'
import {
  Badge,
  Dialog,
  EmptyState,
  Field,
  ListRow,
  PanelAction,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelToolbar,
  Placeholder,
  SearchGroup,
  SectionLabel
} from './ui'

const DENSITY_KEY = 'setlistic-setlist-density'

function readCompact(): boolean {
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compact'
  } catch {
    return false
  }
}

const SUMMARY_FORMATS: { value: SummaryFormat; label: string }[] = [
  { value: 'full', label: 'LINE (ละเอียด)' },
  { value: 'short', label: 'สั้น (IG / Messenger)' }
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
  bandName
}: {
  bandId: number
  bandName: string
}): React.JSX.Element {
  const setlists = useAsync(() => window.setlistic.setlists.list(bandId), `setlists:${bandId}`)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const run = useRun()
  const groups = groupSetlists(setlists.data ?? [])
  // Until something is picked, open the next show/rehearsal (or the newest one)
  const activeId = selectedId ?? groups[0]?.items[0]?.id ?? null

  return (
    <Shell>
      <ShellSidebar
        label="รายการเซ็ตลิสต์"
        rail={
          <ShellRail>
            {groups.flatMap((g) =>
              g.items.map((s) => (
                <RailItem
                  key={s.id}
                  label={s.name}
                  selected={s.id === activeId}
                  onClick={() => setSelectedId(s.id)}
                >
                  <RailDate setlist={s} />
                </RailItem>
              ))
            )}
          </ShellRail>
        }
      >
        <PanelHeader
          title="เซ็ตลิสต์"
          actions={
            <>
              <PanelAction label="สร้างเซ็ตลิสต์" onClick={() => setCreating(true)}>
                <Plus />
              </PanelAction>
              <SidebarCollapse />
            </>
          }
        />
        <PanelBody inset={false} gap="0">
          {setlists.data?.length === 0 && (
            <Text px="panel.px" py="6" fontSize="sm" color="fg.muted">
              ยังไม่มีเซ็ตลิสต์ กด + เพื่อสร้างสำหรับวันซ้อมหรือวันเล่น
            </Text>
          )}
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <Text
                as="h3"
                position="sticky"
                top="0"
                zIndex="1"
                bg="bg.canvas/95"
                backdropFilter="blur(8px)"
                px="panel.px"
                pt="3"
                pb="1"
                textStyle="caption"
              >
                {g.label} · {g.items.length}
              </Text>
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
        </PanelBody>
        {setlists.data && <PanelFooter>{setlists.data.length} เซ็ต</PanelFooter>}
      </ShellSidebar>

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
        <ShellMain>
          <EmptyState icon={<ListMusic />} title="เลือกเซ็ตลิสต์ หรือกด + เพื่อสร้างใหม่" />
        </ShellMain>
      )}

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
    </Shell>
  )
}

/** The day of the month in a small tile; gigs tinted like in the full list. */
function RailDate({ setlist: s }: { setlist: SetlistSummary }): React.JSX.Element {
  return (
    <Stack
      boxSize="8"
      align="center"
      justify="center"
      rounded="chip"
      borderWidth="1px"
      fontFamily="mono"
      fontSize="xs"
      fontWeight="bold"
      {...(s.kind === 'gig'
        ? { borderColor: 'accent.muted', bg: 'accent.subtle', color: 'accent.fg' }
        : { bg: 'bg.panel' })}
    >
      {s.eventDate ? Number(s.eventDate.slice(8, 10)) : '–'}
    </Stack>
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
    <ListRow selected={selected} onClick={onClick}>
      <Stack
        w="12"
        h="9"
        flexShrink={0}
        align="center"
        justify="center"
        gap="0"
        rounded="chip"
        borderWidth="1px"
        {...(s.kind === 'gig'
          ? { borderColor: 'accent.muted', bg: 'accent.subtle', color: 'accent.fg' }
          : { bg: 'bg.panel' })}
      >
        {date ? (
          <>
            <Text fontFamily="mono" fontSize="sm" lineHeight="1.25rem" fontWeight="bold">
              {date.getDate()}
            </Text>
            <Text fontSize="xs" lineHeight="1rem">
              {date.toLocaleDateString('th-TH', { month: 'short' })}
            </Text>
          </>
        ) : (
          <Text fontSize="xs">–</Text>
        )}
      </Stack>
      <Box minW="0" flex="1">
        <HStack gap="2">
          <Text truncate textStyle="title.item">
            {s.name}
          </Text>
          {isToday && <Badge tone="primary">วันนี้</Badge>}
        </HStack>
        <Text truncate fontSize="xs" color="fg.muted">
          {SETLIST_KIND_LABEL[s.kind]}
          {s.eventTime && ` · ${s.eventTime}`}
          {s.venue && ` · ${s.venue}`}
        </Text>
      </Box>
      <Box
        flexShrink={0}
        textAlign="right"
        fontFamily="mono"
        fontSize="xs"
        color="fg.muted"
        fontVariantNumeric="tabular-nums"
      >
        <Text>{s.songCount} เพลง</Text>
        {s.totalSec > 0 && <Text>{formatTotal(s.totalSec)}</Text>}
      </Box>
    </ListRow>
  )
}

/** Main panel (the setlist) and inspector (the picked song) for one setlist. */
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
  const shell = useShell()
  const setlist = useAsync(() => window.setlistic.setlists.get(setlistId), `setlist:${setlistId}`)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [includeProgress, setIncludeProgress] = useState(false)
  const [format, setFormat] = useState<SummaryFormat>('full')
  const [sharing, setSharing] = useState(false)
  const [compact, setCompact] = useState(readCompact)
  const [query, setQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<SetlistItem | null>(null)
  // Item to open stage mode on; null picks up at the first unplayed song
  const [stage, setStage] = useState<{ startItemId: number | null } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const { searchTick } = shell

  // Ctrl+K (shell) focuses this search
  useEffect(() => {
    if (searchTick) searchRef.current?.focus()
  }, [searchTick])

  if (!setlist.data)
    return (
      <ShellMain>
        <Text p="panel.px" color="fg.error">
          {setlist.error}
        </Text>
      </ShellMain>
    )
  const s = setlist.data
  const selectedItem = s.items.find((it) => it.id === selectedItemId) ?? s.items[0]
  const q = query.trim().toLowerCase()
  const shownItems = q
    ? s.items.filter((it) => `${it.song.title} ${it.song.artist}`.toLowerCase().includes(q))
    : s.items

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

  function toggleCompact(): void {
    try {
      localStorage.setItem(DENSITY_KEY, compact ? 'comfortable' : 'compact')
    } catch {
      // Still applies for this session
    }
    setCompact(!compact)
  }

  const text = generateLineSummary(s, { bandName, includeProgress, format })
  const tooLong = format === 'short' && text.length > SHORT_SUMMARY_LIMIT
  const playlist = buildYouTubePlaylist(s.items.map((it) => it.song))
  const readyCount = s.items.filter(isItemReady).length
  const playedCount = s.items.filter((it) => it.played).length
  const hasMembers = s.items.length > 0 && s.items[0].progress.length > 0

  function setPlayed(item: SetlistItem, played: boolean): void {
    // optimistic, so ticking through a live set feels instant
    setlist.setData({
      ...s,
      items: s.items.map((it) => (it.id === item.id ? { ...it, played } : it))
    })
    apply(window.setlistic.setlists.setPlayed(item.id, played))
  }

  function updateItem(item: SetlistItem, input: SetlistItemInput): void {
    apply(window.setlistic.setlists.updateItem(item.id, input))
  }

  const numbers = new Map(s.items.map((it, i) => [it.id, i + 1]))

  return (
    <>
      <ShellMain>
        <PanelHeader
          title={s.name}
          titleStyle="title.page"
          actions={
            <>
              <PanelAction label="แก้ไขเซ็ตลิสต์" onClick={() => setEditing(true)}>
                <Pencil />
              </PanelAction>
              <PanelAction
                label="แชร์ (LINE, YouTube playlist)"
                aria-pressed={sharing}
                variant={sharing ? 'subtle' : 'ghost'}
                onClick={() => setSharing(!sharing)}
              >
                <Share2 />
              </PanelAction>
              <PanelAction
                label="ลบเซ็ตลิสต์"
                colorPalette="danger"
                onClick={async () => {
                  if (!confirm(`ลบเซ็ตลิสต์ "${s.name}"?`)) return
                  if ((await run(window.setlistic.setlists.remove(s.id))) !== undefined) onDeleted()
                }}
              >
                <Trash2 />
              </PanelAction>
              <Button
                colorPalette="accent"
                ml="2"
                disabled={s.items.length === 0}
                onClick={() => setStage({ startItemId: null })}
                title="เต็มจอ ตัวใหญ่ เปลี่ยนเพลงด้วยลูกศรหรือ pedal"
              >
                <Play /> เล่นสด
              </Button>
              <InspectorToggle />
            </>
          }
        />

        <PanelToolbar>
          <Wrap align="center" columnGap="4" rowGap="1" fontSize="sm" color="fg.muted">
            <Badge tone={s.kind === 'gig' ? 'primary' : 'neutral'}>
              {SETLIST_KIND_LABEL[s.kind]}
            </Badge>
            {s.eventDate && (
              <HStack as="span" gap="1">
                <CalendarDays size={16} /> {formatThaiDate(s.eventDate, s.eventTime)}
              </HStack>
            )}
            <Venue venue={s.venue} venueUrl={s.venueUrl} />
          </Wrap>
          <HStack gap="2" maxW="page.default">
            <SearchGroup>
              <Input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาเพลงในเซ็ตนี้  (Ctrl+K)"
                aria-label="ค้นหาเพลงในเซ็ตนี้"
              />
            </SearchGroup>
            <Button variant="outline" onClick={() => setAdding(true)}>
              <Plus /> เพิ่มเพลง
            </Button>
            <PanelAction
              label={compact ? 'แถวปกติ' : 'แถวแน่น (เซ็ตยาว)'}
              aria-pressed={compact}
              variant={compact ? 'subtle' : 'ghost'}
              onClick={toggleCompact}
            >
              <Rows4 />
            </PanelAction>
          </HStack>
        </PanelToolbar>

        <PanelBody>
          <Stack maxW="page.default" gap="panel.gap">
            {s.notes && (
              <Text fontSize="sm" color="fg.muted">
                {s.notes}
              </Text>
            )}

            {sharing && (
              <ShareTools
                setlist={s}
                text={text}
                tooLong={tooLong}
                format={format}
                onFormat={setFormat}
                includeProgress={includeProgress}
                onIncludeProgress={setIncludeProgress}
                playlist={playlist}
                onCopy={async () => {
                  if ((await run(window.setlistic.system.copyText(text))) !== undefined)
                    toast(
                      format === 'short'
                        ? 'คัดลอกแล้ว ไปวางในแชตได้เลย'
                        : 'คัดลอกแล้ว ไปวางในกลุ่ม LINE ได้เลย'
                    )
                }}
                onOpen={(url) => run(window.setlistic.system.openExternal(url))}
              />
            )}

            {s.items.length === 0 ? (
              <Placeholder py="12">
                ยังไม่มีเพลงในเซ็ตนี้ กด &quot;เพิ่มเพลง&quot; เพื่อเลือกจากคลังเพลงของวง
              </Placeholder>
            ) : shownItems.length === 0 ? (
              <Placeholder>ไม่มีเพลงที่ตรงกับ &quot;{query}&quot;</Placeholder>
            ) : (
              <Stack as="section" gap="2" aria-label="รายการเพลง">
                <SetlistItems
                  items={shownItems}
                  numberOf={(item) => numbers.get(item.id) ?? 0}
                  selectedId={selectedItem?.id ?? null}
                  reorderable={!q}
                  compact={compact}
                  onSelect={(item) => {
                    setSelectedItemId(item.id)
                    shell.showInspector()
                  }}
                  onReorder={reorder}
                  onRemove={(item) => apply(window.setlistic.setlists.removeItem(item.id), true)}
                  onEdit={setEditingItem}
                  onPlayed={setPlayed}
                />
                <Text fontSize="xs" color="fg.muted">
                  ลากที่ ⋮⋮ เพื่อจัดลำดับ (หรือโฟกัสแล้วกดลูกศร) · ติ๊กช่องหน้าเลขลำดับเมื่อเล่นแล้ว
                  · สถานะการซ้อมของสมาชิกอยู่ในแผงรายละเอียด
                </Text>
              </Stack>
            )}
          </Stack>
        </PanelBody>

        <PanelFooter>
          <Meter
            label="เล่นแล้ว"
            value={playedCount}
            total={s.items.length}
            colorPalette="accent"
          />
          {hasMembers && (
            <Meter
              label="ทั้งวงพร้อม"
              value={readyCount}
              total={s.items.length}
              colorPalette="success"
            />
          )}
          <Text
            ml="auto"
            title={
              s.unknownDurationCount > 0
                ? `+${s.unknownDurationCount} เพลงไม่ระบุความยาว`
                : undefined
            }
          >
            {s.items.length} เพลง · ~{formatTotal(s.totalSec)}
            {s.unknownDurationCount > 0 && ` (+${s.unknownDurationCount})`}
          </Text>
        </PanelFooter>
      </ShellMain>

      {selectedItem && (
        <SongInspector
          key={selectedItem.id}
          item={selectedItem}
          number={numbers.get(selectedItem.id) ?? 0}
          onViewChords={() => setStage({ startItemId: selectedItem.id })}
          onEdit={() => setEditingItem(selectedItem)}
          onOpenYouTube={() =>
            run(window.setlistic.system.openExternal(selectedItem.song.youtubeUrl))
          }
          onProgress={(memberId, status) =>
            apply(window.setlistic.setlists.setProgress(selectedItem.id, memberId, status))
          }
        />
      )}

      {stage && (
        <StageMode
          setlist={s}
          startItemId={stage.startItemId ?? undefined}
          onPlayed={setPlayed}
          onClose={() => setStage(null)}
        />
      )}

      <ItemDialog item={editingItem} onClose={() => setEditingItem(null)} onSubmit={updateItem} />

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
    </>
  )
}

/** Small "label n/total ▓▓░" for the panel footer. */
function Meter({
  label,
  value,
  total,
  colorPalette
}: {
  label: string
  value: number
  total: number
  colorPalette: 'accent' | 'success'
}): React.JSX.Element {
  return (
    <HStack gap="2">
      <Text>
        {label} {value}/{total}
      </Text>
      <Progress.Root
        w="16"
        value={total ? (value / total) * 100 : 0}
        size="xs"
        colorPalette={colorPalette}
        aria-label={label}
      >
        <Progress.Track rounded="full" bg="bg.muted">
          <Progress.Range rounded="full" />
        </Progress.Track>
      </Progress.Root>
    </HStack>
  )
}

/** LINE text, copy/send and YouTube playlist; shown under the header while sharing is on. */
function ShareTools({
  setlist: s,
  text,
  tooLong,
  format,
  onFormat,
  includeProgress,
  onIncludeProgress,
  playlist,
  onCopy,
  onOpen
}: {
  setlist: SetlistDetail
  text: string
  tooLong: boolean
  format: SummaryFormat
  onFormat: (format: SummaryFormat) => void
  includeProgress: boolean
  onIncludeProgress: (on: boolean) => void
  playlist: ReturnType<typeof buildYouTubePlaylist>
  onCopy: () => void
  onOpen: (url: string) => void
}): React.JSX.Element {
  return (
    <Wrap
      as="section"
      aria-label="แชร์เซ็ตลิสต์"
      align="center"
      gap="2"
      rounded="card"
      borderWidth="1px"
      bg="bg.panel"
      p="panel.px"
    >
      <SegmentGroup.Root
        size="sm"
        value={format}
        onValueChange={(e) => onFormat(e.value as SummaryFormat)}
        aria-label="รูปแบบข้อความ"
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={SUMMARY_FORMATS} fontWeight="semibold" />
      </SegmentGroup.Root>
      <Button variant="outline" disabled={s.items.length === 0} onClick={onCopy}>
        <Copy /> คัดลอกข้อความ
      </Button>
      <Button
        variant="outline"
        disabled={s.items.length === 0 || format === 'short'}
        title={format === 'short' ? 'ส่งเข้า LINE ใช้แบบละเอียด' : undefined}
        onClick={() => onOpen(lineShareUrl(text))}
      >
        <Send /> ส่งเข้า LINE
      </Button>
      <Button
        variant="outline"
        disabled={!playlist}
        title={
          playlist
            ? `เล่น ${playlist.videoCount} เพลงต่อกันตามลำดับ` +
              (playlist.missingCount ? ` · ข้าม ${playlist.missingCount} เพลงที่ไม่มีลิงก์` : '') +
              (playlist.truncated ? ` · สูงสุด ${YOUTUBE_PLAYLIST_LIMIT} เพลงแรก` : '')
            : 'ยังไม่มีเพลงที่มีลิงก์ YouTube'
        }
        onClick={() => playlist && onOpen(playlist.url)}
      >
        <CirclePlay /> YouTube Playlist{playlist && ` (${playlist.videoCount})`}
      </Button>
      <Checkbox.Root
        ml="auto"
        size="sm"
        colorPalette="accent"
        checked={includeProgress}
        onCheckedChange={(e) => onIncludeProgress(e.checked === true)}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label color="fg.muted" fontWeight="normal">
          แนบสถานะการซ้อม
        </Checkbox.Label>
      </Checkbox.Root>
      <Collapsible.Root w="full" fontSize="sm">
        <Collapsible.Trigger
          cursor="pointer"
          color="fg.muted"
          _hover={{ color: 'fg.default' }}
          textAlign="left"
        >
          ดูตัวอย่างข้อความ{' '}
          <Span
            fontFamily="mono"
            fontSize="xs"
            fontVariantNumeric="tabular-nums"
            color={tooLong ? 'fg.error' : undefined}
          >
            ({text.length.toLocaleString()}
            {format === 'short' && `/${SHORT_SUMMARY_LIMIT.toLocaleString()}`} ตัวอักษร)
          </Span>
        </Collapsible.Trigger>
        <Collapsible.Content>
          {tooLong && (
            <Text mt="2" fontSize="xs" color="fg.error">
              ยาวเกินที่ IG ส่งได้ในข้อความเดียว ลองย่อชื่อเซ็ต/สถานที่ หรือแบ่งเซ็ตเป็นสองช่วง
            </Text>
          )}
          <Box
            as="pre"
            mt="2"
            maxH="72"
            overflow="auto"
            rounded="inset"
            bg="bg.muted"
            p="3"
            fontFamily="body"
            fontSize="xs"
            whiteSpace="pre-wrap"
          >
            {text}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Wrap>
  )
}

/** Venue name, linked when there's a map/page link; older sets may hold a bare link as the name. */
function Venue({ venue, venueUrl }: { venue: string; venueUrl: string }): React.JSX.Element | null {
  const href = venueUrl || (/^https?:\/\//i.test(venue) ? venue : '')
  const label = href === venue ? 'เปิดแผนที่' : venue || 'เปิดแผนที่'
  if (!venue && !venueUrl) return null
  if (!href) {
    return (
      <HStack as="span" gap="1">
        <MapPin size={16} /> {venue}
      </HStack>
    )
  }
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={href}
      display="inline-flex"
      alignItems="center"
      gap="1"
      color="inherit"
      textDecoration="underline"
      textDecorationColor="border"
      textUnderlineOffset="4px"
      _hover={{ color: 'accent.fg', textDecorationColor: 'accent.fg' }}
    >
      <MapPin size={16} /> {label} <ExternalLink size={16} />
    </Link>
  )
}

/** Inspector for the song picked in the table. */
function SongInspector({
  item,
  number,
  onViewChords,
  onEdit,
  onOpenYouTube,
  onProgress
}: {
  item: SetlistItem
  number: number
  onViewChords: () => void
  onEdit: () => void
  onOpenYouTube: () => void
  onProgress: React.ComponentProps<typeof ProgressChips>['onChange']
}): React.JSX.Element {
  const { song } = item
  const key = item.keyOverride || song.key
  const changedKey = !!item.keyOverride && item.keyOverride !== song.key
  const hasChords = !!song.chordUrl || !!song.content.trim()

  return (
    <ShellInspector
      label={`รายละเอียด: ${song.title}`}
      title={`เพลงที่ ${String(number).padStart(2, '0')}`}
      actions={
        <PanelAction label="คีย์ / โน้ตสำหรับงานนี้" onClick={onEdit}>
          <Pencil />
        </PanelAction>
      }
    >
      <PanelBody>
        <Stack gap="3">
          <Box>
            <Text as="h3" textStyle="title.section" wordBreak="break-word">
              {song.title}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {song.artist || '—'}
            </Text>
          </Box>
          <Grid as="dl" templateColumns="repeat(3, 1fr)" gap="2">
            <InspectorStat
              label={changedKey ? `Key (เดิม ${song.key ?? '–'})` : 'Key'}
              value={key ?? '–'}
              accent={!!key}
              warning={changedKey}
            />
            <InspectorStat label="BPM" value={song.bpm?.toString() ?? '–'} />
            <InspectorStat label="Length" value={formatClock(song.durationSec)} />
          </Grid>
        </Stack>

        {(item.note || song.notes) && (
          <Stack as="section" gap="1" fontSize="sm">
            <SectionLabel>โน้ต</SectionLabel>
            {item.note && <Text fontWeight="semibold">{item.note}</Text>}
            {song.notes && (
              <HStack align="flex-start" gap="2" color="fg.muted">
                <Flex h="5" align="center" flexShrink={0}>
                  <StickyNote size={16} />
                </Flex>
                {song.notes}
              </HStack>
            )}
          </Stack>
        )}

        {item.progress.length > 0 && (
          <Stack as="section" gap="2">
            <SectionLabel>ความพร้อมของสมาชิก (คลิกเพื่อเปลี่ยน)</SectionLabel>
            <ProgressChips progress={item.progress} onChange={onProgress} />
          </Stack>
        )}

        <Stack as="section" gap="2">
          <SectionLabel>Reference</SectionLabel>
          <YouTubePlayer url={song.youtubeUrl} title={song.title} />
        </Stack>
      </PanelBody>

      <PanelFooter gap="2">
        <Button
          variant="outline"
          flex="1"
          onClick={onViewChords}
          title={hasChords ? 'เปิดคอร์ดเต็มจอที่เพลงนี้' : 'เพลงนี้ยังไม่มีคอร์ด'}
        >
          <FileMusic /> ดูคอร์ด
        </Button>
        <Button variant="outline" flex="1" disabled={!song.youtubeUrl} onClick={onOpenYouTube}>
          <ExternalLink /> YouTube
        </Button>
      </PanelFooter>
    </ShellInspector>
  )
}

function InspectorStat({
  label,
  value,
  accent,
  warning
}: {
  label: string
  value: string
  accent?: boolean
  warning?: boolean
}): React.JSX.Element {
  const tone = warning
    ? { borderColor: 'warning.muted', bg: 'warning.subtle', color: 'warning.fg' }
    : accent
      ? { borderColor: 'accent.muted', bg: 'accent.subtle', color: 'accent.fg' }
      : { bg: 'bg.panel' }
  return (
    <Stack gap="0" rounded="inset" borderWidth="1px" p="2" {...tone}>
      <Text as="dt" truncate textStyle="caption" color="inherit">
        {label}
      </Text>
      <Text
        as="dd"
        fontFamily="mono"
        fontSize="lg"
        lineHeight="1.5rem"
        fontWeight="bold"
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </Text>
    </Stack>
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
      <Stack gap="3">
        <SearchGroup>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเพลง"
            autoFocus
          />
        </SearchGroup>
        {songs.data?.length === 0 ? (
          <Placeholder>ไม่พบเพลง เพิ่มเพลงในแท็บ &quot;เพลง&quot; ก่อน</Placeholder>
        ) : (
          <Stack as="ul" gap="0" maxH="55vh" overflowY="auto" mx="-4">
            {songs.data?.map((song) => {
              const added = inSetlist.has(song.id)
              return (
                <li key={song.id}>
                  <chakra.button
                    onClick={() => onAdd(song.id)}
                    display="flex"
                    w="full"
                    h="row.h"
                    alignItems="center"
                    gap="3"
                    px="panel.px"
                    textAlign="left"
                    cursor="pointer"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    <Center boxSize="8" flexShrink={0} color={added ? 'success.fg' : 'accent.fg'}>
                      {added ? <Check size={16} /> : <Plus size={16} />}
                    </Center>
                    <Box minW="0" flex="1">
                      <Text truncate textStyle="title.item">
                        {song.title}
                      </Text>
                      <Text truncate fontSize="xs" color="fg.muted">
                        {song.artist || '—'}
                      </Text>
                    </Box>
                    {song.key && (
                      <Badge tone="key" fontFamily="mono">
                        {song.key}
                      </Badge>
                    )}
                    <SongStatusBadge status={song.status} />
                  </chakra.button>
                </li>
              )
            })}
          </Stack>
        )}
        <Text fontSize="xs" color="fg.muted">
          คลิกเพื่อเพิ่มต่อท้ายเซ็ต (เพิ่มเพลงเดิมซ้ำได้ เช่น เพลง encore)
        </Text>
      </Stack>
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
      <chakra.form
        key={setlist?.id ?? 'new'}
        display="grid"
        gridTemplateColumns="repeat(2, minmax(0, 1fr))"
        gap="4"
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
            venueUrl: str('venueUrl'),
            notes: str('notes')
          })
        }}
      >
        <Field label="ชื่อ *" gridColumn="span 2">
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
          <NativeSelect.Root>
            <NativeSelect.Field name="kind" defaultValue={setlist?.kind ?? 'rehearsal'}>
              {SETLIST_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SETLIST_KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field>
        <Field label="สถานที่">
          <Input
            name="venue"
            maxLength={200}
            defaultValue={setlist?.venue}
            placeholder="เช่น ห้องซ้อม Studio A"
          />
        </Field>
        <Field label="วันที่">
          <Input name="eventDate" type="date" defaultValue={setlist?.eventDate ?? ''} />
        </Field>
        <Field label="เวลา">
          <Input name="eventTime" type="time" defaultValue={setlist?.eventTime ?? ''} />
        </Field>
        <Field label="ลิงก์สถานที่ (Google Maps, เพจร้าน ฯลฯ)" gridColumn="span 2">
          <Input
            name="venueUrl"
            type="url"
            pattern="https?://.+"
            title="ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://"
            defaultValue={setlist?.venueUrl}
            placeholder="https://maps.app.goo.gl/…"
          />
        </Field>
        <Field label="หมายเหตุ" gridColumn="span 2">
          <Textarea name="notes" rows={2} maxLength={5000} defaultValue={setlist?.notes} />
        </Field>
        <HStack gridColumn="span 2" justify="flex-end" gap="2">
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" colorPalette="accent">
            บันทึก
          </Button>
        </HStack>
      </chakra.form>
    </Dialog>
  )
}
