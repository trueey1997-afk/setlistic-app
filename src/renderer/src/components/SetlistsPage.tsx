import { useState } from 'react'
import {
  Box,
  Button,
  Center,
  Checkbox,
  chakra,
  Collapsible,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
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
import { ItemDialog, SetlistItems } from './SetlistItems'
import { StageMode } from './StageMode'
import { YouTubePlayer } from './SongMedia'
import { SongStatusBadge } from './links'
import { useRun, useToast } from './toast'
import { Badge, Dialog, EmptyState, Field, ListRow, SearchGroup, SidePane } from './ui'

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

/** Tiny uppercase caption used on tiles and panel headings. */
const CAPTION = {
  fontSize: '10px',
  fontWeight: 'bold',
  letterSpacing: 'widest',
  textTransform: 'uppercase',
  color: 'fg.muted'
} as const

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
    <Flex minH="0" flex="1">
      <SidePane open={sidebarOpen} label="รายการเซ็ตลิสต์" w="340px">
        <Box borderBottomWidth="1px" p="3">
          <Button colorPalette="brand" w="full" onClick={() => setCreating(true)}>
            <Plus /> สร้างเซ็ตลิสต์
          </Button>
        </Box>
        <Box minH="0" flex="1" overflowY="auto">
          {setlists.data?.length === 0 && (
            <Text p="6" textAlign="center" fontSize="sm" color="fg.muted">
              ยังไม่มีเซ็ตลิสต์ สร้างสำหรับวันซ้อมหรือวันเล่นได้เลย
            </Text>
          )}
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <Text
                as="h3"
                position="sticky"
                top="0"
                zIndex="1"
                bg="bg/95"
                backdropFilter="blur(8px)"
                px="3"
                pt="3"
                pb="1"
                {...CAPTION}
                fontSize="11px"
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
        </Box>
      </SidePane>

      <Flex as="section" minW="0" flex="1">
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
      </Flex>

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
    </Flex>
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
        flexShrink={0}
        align="center"
        gap="0"
        rounded="sm"
        borderWidth="1px"
        py="1"
        lineHeight="short"
        {...(s.kind === 'gig'
          ? { borderColor: 'brand.solid', bg: 'brand.solid', color: 'brand.contrast' }
          : { bg: 'bg' })}
      >
        {date ? (
          <>
            <Text fontFamily="mono" fontSize="lg" fontWeight="bold">
              {date.getDate()}
            </Text>
            <Text fontSize="10px" fontWeight="semibold" opacity={0.8}>
              {date.toLocaleDateString('th-TH', { month: 'short' })}
            </Text>
          </>
        ) : (
          <Text py="2" fontSize="xs">
            –
          </Text>
        )}
      </Stack>
      <Box minW="0" flex="1">
        <HStack gap="1.5">
          <Text truncate fontSize="sm" fontWeight="semibold">
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
      <Box flexShrink={0} textAlign="right" fontFamily="mono" fontSize="xs" color="fg.muted">
        <Text>{s.songCount} เพลง</Text>
        {s.totalSec > 0 && <Text>{formatTotal(s.totalSec)}</Text>}
      </Box>
    </ListRow>
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
  const [sharing, setSharing] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<SetlistItem | null>(null)
  // Item to open stage mode on; null picks up at the first unplayed song
  const [stage, setStage] = useState<{ startItemId: number | null } | null>(null)

  if (!setlist.data)
    return (
      <Text p="6" color="fg.error">
        {setlist.error}
      </Text>
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

  function updateItem(item: SetlistItem, input: SetlistItemInput): void {
    apply(window.setlistic.setlists.updateItem(item.id, input))
  }

  const numbers = new Map(s.items.map((it, i) => [it.id, i + 1]))

  return (
    <Flex minH="0" minW="0" flex="1">
      {/* ── Workspace ── */}
      <Box minW="0" flex="1" overflowY="auto">
        <Stack mx="auto" maxW="5xl" gap="4" p="6">
          <Flex as="header" wrap="wrap" align="flex-start" justify="space-between" gap="4">
            <Stack minW="0" gap="1.5">
              <HStack gap="2">
                <Badge tone={s.kind === 'gig' ? 'primary' : 'neutral'}>
                  {SETLIST_KIND_LABEL[s.kind]}
                </Badge>
                <Wrap columnGap="4" rowGap="1" fontSize="sm" color="fg.muted">
                  {s.eventDate && (
                    <HStack as="span" gap="1">
                      <CalendarDays size={16} /> {formatThaiDate(s.eventDate, s.eventTime)}
                    </HStack>
                  )}
                  <Venue venue={s.venue} venueUrl={s.venueUrl} />
                </Wrap>
              </HStack>
              <Heading size="3xl" wordBreak="break-word">
                {s.name}
              </Heading>
              {s.notes && (
                <Text fontSize="sm" color="fg.muted">
                  {s.notes}
                </Text>
              )}
            </Stack>
            <HStack flexShrink={0} gap="1">
              <Button
                colorPalette="brand"
                disabled={s.items.length === 0}
                onClick={() => setStage({ startItemId: null })}
                title="เต็มจอ ตัวใหญ่ เปลี่ยนเพลงด้วยลูกศรหรือ pedal"
              >
                <Play /> เล่นสด
              </Button>
              <Button
                variant={sharing ? 'subtle' : 'outline'}
                aria-expanded={sharing}
                onClick={() => setSharing(!sharing)}
              >
                <Share2 /> แชร์
              </Button>
              <IconButton
                variant="ghost"
                color="fg.muted"
                onClick={() => setEditing(true)}
                aria-label="แก้ไขเซ็ตลิสต์"
              >
                <Pencil />
              </IconButton>
              <IconButton
                variant="ghost"
                colorPalette="red"
                aria-label="ลบเซ็ตลิสต์"
                onClick={async () => {
                  if (!confirm(`ลบเซ็ตลิสต์ "${s.name}"?`)) return
                  if ((await run(window.setlistic.setlists.remove(s.id))) !== undefined) onDeleted()
                }}
              >
                <Trash2 />
              </IconButton>
            </HStack>
          </Flex>

          {/* ── Summary ── */}
          <Grid as="dl" templateColumns={{ base: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }} gap="2">
            <SummaryTile label="เพลงทั้งหมด" value={String(s.items.length)} />
            <SummaryTile
              label="ความยาวรวม"
              value={`~${formatTotal(s.totalSec)}`}
              hint={
                s.unknownDurationCount > 0
                  ? `+${s.unknownDurationCount} เพลงไม่ระบุความยาว`
                  : undefined
              }
            />
            {s.items.length > 0 && s.items[0].progress.length > 0 ? (
              <SummaryTile
                label="ทั้งวงพร้อม"
                value={`${readyCount}/${s.items.length}`}
                meter={readyCount / s.items.length}
                tone="success"
              />
            ) : (
              <SummaryTile label="ทั้งวงพร้อม" value="–" hint="ยังไม่มีสมาชิก" />
            )}
            <SummaryTile
              label="เล่นแล้ว"
              value={`${playedCount}/${s.items.length}`}
              meter={s.items.length ? playedCount / s.items.length : 0}
            />
          </Grid>

          {/* ── Share tools ── */}
          {sharing && (
            <Wrap align="center" gap="2" rounded="xl" borderWidth="1px" bg="bg.panel" p="3">
              <SegmentGroup.Root
                size="sm"
                value={format}
                onValueChange={(e) => setFormat(e.value as SummaryFormat)}
                aria-label="รูปแบบข้อความ"
              >
                <SegmentGroup.Indicator />
                <SegmentGroup.Items items={SUMMARY_FORMATS} fontWeight="semibold" />
              </SegmentGroup.Root>
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
              <Checkbox.Root
                ml="auto"
                size="sm"
                colorPalette="brand"
                checked={includeProgress}
                onCheckedChange={(e) => setIncludeProgress(e.checked === true)}
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
                  _hover={{ color: 'fg' }}
                  textAlign="left"
                >
                  ดูตัวอย่างข้อความ{' '}
                  <Span fontFamily="mono" fontSize="xs" color={tooLong ? 'fg.error' : undefined}>
                    ({text.length.toLocaleString()}
                    {format === 'short' && `/${SHORT_SUMMARY_LIMIT.toLocaleString()}`} ตัวอักษร)
                  </Span>
                </Collapsible.Trigger>
                <Collapsible.Content>
                  {tooLong && (
                    <Text mt="2" fontSize="xs" color="fg.error">
                      ยาวเกินที่ IG ส่งได้ในข้อความเดียว ลองย่อชื่อเซ็ต/สถานที่
                      หรือแบ่งเซ็ตเป็นสองช่วง
                    </Text>
                  )}
                  <Box
                    as="pre"
                    mt="2"
                    maxH="72"
                    overflow="auto"
                    rounded="lg"
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
          )}

          {/* ── Songs ── */}
          <Stack as="section" gap="3" aria-label="รายการเพลง">
            <HStack gap="2">
              <SearchGroup>
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาเพลงในเซ็ตนี้…"
                  bg="bg.panel"
                  aria-label="ค้นหาเพลงในเซ็ตนี้"
                />
              </SearchGroup>
              <Button variant="outline" onClick={() => setAdding(true)}>
                <Plus /> เพิ่มเพลง
              </Button>
            </HStack>

            {s.items.length === 0 ? (
              <Box
                rounded="xl"
                borderWidth="1px"
                borderStyle="dashed"
                p="10"
                textAlign="center"
                fontSize="sm"
                color="fg.muted"
              >
                ยังไม่มีเพลงในเซ็ตนี้ กด &quot;เพิ่มเพลง&quot; เพื่อเลือกจากคลังเพลงของวง
              </Box>
            ) : shownItems.length === 0 ? (
              <Text py="8" textAlign="center" fontSize="sm" color="fg.muted">
                ไม่มีเพลงที่ตรงกับ &quot;{query}&quot;
              </Text>
            ) : (
              <>
                <SetlistItems
                  items={shownItems}
                  numberOf={(item) => numbers.get(item.id) ?? 0}
                  selectedId={selectedItem?.id ?? null}
                  reorderable={!q}
                  onSelect={(item) => setSelectedItemId(item.id)}
                  onReorder={reorder}
                  onRemove={(item) => apply(window.setlistic.setlists.removeItem(item.id), true)}
                  onEdit={updateItem}
                  onProgress={(item, memberId, status) =>
                    apply(window.setlistic.setlists.setProgress(item.id, memberId, status))
                  }
                  onPlayed={setPlayed}
                />
                <Text fontSize="xs" color="fg.muted">
                  คลิกแถวเพื่อดูรายละเอียด · ลากที่ ⋮⋮ เพื่อจัดลำดับ (หรือโฟกัสแล้วกดลูกศร) ·
                  ติ๊กช่องหน้าเลขลำดับเมื่อเล่นแล้ว · คลิกชื่อสมาชิกเพื่อเปลี่ยนสถานะการซ้อม
                </Text>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* ── Inspector ── */}
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
    </Flex>
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
      _hover={{ color: 'brand.fg', textDecorationColor: 'brand.fg' }}
    >
      <MapPin size={16} /> {label} <ExternalLink size={14} />
    </Link>
  )
}

function SummaryTile({
  label,
  value,
  hint,
  meter,
  tone = 'primary'
}: {
  label: string
  value: string
  hint?: string
  /** 0–1; draws a bar under the value. */
  meter?: number
  tone?: 'primary' | 'success'
}): React.JSX.Element {
  return (
    <Stack gap="1" rounded="xl" borderWidth="1px" bg="bg.panel" px="3" py="2.5">
      <Text as="dt" {...CAPTION}>
        {label}
      </Text>
      <Text
        as="dd"
        fontFamily="mono"
        fontSize="xl"
        lineHeight="shorter"
        fontWeight="bold"
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </Text>
      {meter !== undefined ? (
        <Progress.Root
          value={meter * 100}
          size="xs"
          colorPalette={tone === 'success' ? 'green' : 'brand'}
          aria-label={label}
        >
          <Progress.Track rounded="full" bg="bg.muted">
            <Progress.Range rounded="full" />
          </Progress.Track>
        </Progress.Root>
      ) : (
        hint && (
          <Text truncate fontSize="xs" color="fg.muted">
            {hint}
          </Text>
        )
      )}
    </Stack>
  )
}

/** Right-hand panel for the song picked in the table. */
function SongInspector({
  item,
  number,
  onViewChords,
  onEdit,
  onOpenYouTube
}: {
  item: SetlistItem
  number: number
  onViewChords: () => void
  onEdit: () => void
  onOpenYouTube: () => void
}): React.JSX.Element {
  const { song } = item
  const key = item.keyOverride || song.key
  const changedKey = !!item.keyOverride && item.keyOverride !== song.key
  const hasChords = !!song.chordUrl || !!song.content.trim()

  return (
    <Stack
      as="aside"
      aria-label={`รายละเอียด: ${song.title}`}
      display={{ base: 'none', xl: 'flex' }}
      w="340px"
      flexShrink={0}
      gap="4"
      overflowY="auto"
      borderLeftWidth="1px"
      p="4"
    >
      <Stack as="header" gap="2">
        <Text
          fontFamily="mono"
          fontSize="xs"
          fontWeight="bold"
          letterSpacing="widest"
          color="fg.muted"
        >
          เพลงที่ {String(number).padStart(2, '0')}
        </Text>
        <Box>
          <Heading as="h2" size="xl" lineHeight="shorter" wordBreak="break-word">
            {song.title}
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {song.artist || '—'}
          </Text>
        </Box>
        <Grid as="dl" templateColumns="repeat(3, 1fr)" gap="2" fontFamily="mono">
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
        <Stack
          as="section"
          gap="1"
          rounded="xl"
          borderWidth="1px"
          bg="bg.panel"
          p="3"
          fontSize="sm"
        >
          {item.note && <Text fontWeight="semibold">{item.note}</Text>}
          {song.notes && (
            <HStack align="flex-start" gap="1.5" color="fg.muted">
              <Box mt="0.5" flexShrink={0}>
                <StickyNote size={14} />
              </Box>
              {song.notes}
            </HStack>
          )}
        </Stack>
      )}

      <Stack as="section" gap="2">
        <Text as="h3" {...CAPTION}>
          Reference
        </Text>
        <YouTubePlayer url={song.youtubeUrl} title={song.title} />
      </Stack>

      <Stack mt="auto" gap="2">
        <Button
          colorPalette="brand"
          size="lg"
          w="full"
          onClick={onViewChords}
          title={hasChords ? 'เปิดคอร์ดเต็มจอที่เพลงนี้' : 'เพลงนี้ยังไม่มีคอร์ด'}
        >
          <FileMusic /> ดูคอร์ด
        </Button>
        <Grid templateColumns="repeat(2, 1fr)" gap="2">
          <Button variant="outline" disabled={!song.youtubeUrl} onClick={onOpenYouTube}>
            <ExternalLink /> YouTube
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil /> คีย์ / โน้ต
          </Button>
        </Grid>
      </Stack>
    </Stack>
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
    ? { borderColor: 'orange.muted', bg: 'orange.subtle', color: 'orange.fg' }
    : accent
      ? { borderColor: 'brand.solid', bg: 'brand.solid', color: 'brand.contrast' }
      : { bg: 'bg.panel' }
  return (
    <Stack gap="0" rounded="lg" borderWidth="1px" px="2" py="1.5" {...tone}>
      <Text
        as="dt"
        truncate
        fontFamily="body"
        fontSize="10px"
        fontWeight="semibold"
        letterSpacing="wider"
        textTransform="uppercase"
        opacity={0.7}
      >
        {label}
      </Text>
      <Text as="dd" fontSize="lg" lineHeight="shorter" fontWeight="bold">
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
          <Text py="6" textAlign="center" fontSize="sm" color="fg.muted">
            ไม่พบเพลง เพิ่มเพลงในแท็บ &quot;เพลง&quot; ก่อน
          </Text>
        ) : (
          <Stack as="ul" gap="0" maxH="55vh" divideY="1px" overflowY="auto">
            {songs.data?.map((song) => {
              const added = inSetlist.has(song.id)
              return (
                <li key={song.id}>
                  <chakra.button
                    onClick={() => onAdd(song.id)}
                    display="flex"
                    w="full"
                    alignItems="center"
                    gap="3"
                    px="2"
                    py="2"
                    textAlign="left"
                    cursor="pointer"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    <Center boxSize="7" flexShrink={0} color={added ? 'green.500' : 'brand.fg'}>
                      {added ? <Check size={16} /> : <Plus size={16} />}
                    </Center>
                    <Box minW="0" flex="1">
                      <Text truncate fontSize="sm" fontWeight="semibold">
                        {song.title}
                      </Text>
                      <Text truncate fontSize="xs" color="fg.muted">
                        {song.artist || '—'}
                      </Text>
                    </Box>
                    {song.key && <Badge tone="primary">{song.key}</Badge>}
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
          <Button type="submit" colorPalette="brand">
            บันทึก
          </Button>
        </HStack>
      </chakra.form>
    </Dialog>
  )
}
