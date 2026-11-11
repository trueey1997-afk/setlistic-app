import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  HStack,
  Input,
  Menu,
  NativeSelect,
  Portal,
  Stack,
  Text,
  Wrap
} from '@chakra-ui/react'
import {
  AudioLines,
  CirclePlay,
  ExternalLink,
  Info,
  Eye,
  EyeOff,
  MoreHorizontal,
  Music,
  NotebookPen,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react'
import {
  MUSICAL_KEYS,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type Member,
  type MusicalKey,
  type Song,
  type SongStatus
} from '@shared/types'
import { formatClock, formatTotal } from '@shared/format'
import { useAsync } from '@renderer/hooks/useAsync'
import { InstrumentNotes } from './InstrumentNotes'
import { KeyChords } from './KeyChords'
import { SongFormDialog } from './SongForm'
import { SongLinks, SongStatusBadge } from './links'
import { StemsPanel } from './Stems'
import {
  ChordControls,
  ChordSourceSwitch,
  ChordView,
  ChordWebNav,
  YouTubePlayer
} from './SongMedia'
import { useChordShortcuts, useChordViewer } from '@renderer/hooks/useChordViewer'
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
import { useRun } from './toast'
import {
  Badge,
  EmptyState,
  FoldSection,
  KeyValue,
  KeyValueList,
  ListRow,
  PanelAction,
  PanelBody,
  PanelFooter,
  PanelHeader,
  PanelToolbar,
  SearchGroup,
  SectionLabel
} from './ui'

export function SongLibrary({ bandId }: { bandId: number }): React.JSX.Element {
  const run = useRun()
  const shell = useShell()
  const { requestSearch, searchTick } = shell
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
  const totalSec = songs.data?.reduce((sum, s) => sum + (s.durationSec ?? 0), 0) ?? 0

  // Desktop shortcuts: Ctrl+N new song, Ctrl+F search (same as Ctrl+K)
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      if (e.key === 'n') {
        e.preventDefault()
        setEditing('new')
      } else if (e.key === 'f') {
        e.preventDefault()
        requestSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestSearch])

  // Ctrl+K (shell) focuses this search
  useEffect(() => {
    if (searchTick) searchRef.current?.focus()
  }, [searchTick])

  function pick(id: number): void {
    setSelectedId(id)
    shell.showInspector()
  }

  async function remove(song: Song): Promise<void> {
    if (!confirm(`ลบเพลง "${song.title}"?\nเพลงนี้จะถูกเอาออกจากทุกเซ็ตลิสต์ด้วย`)) return
    if ((await run(window.setlistic.songs.remove(song.id))) === undefined) return
    setSelectedId(null)
    songs.reload()
  }

  return (
    <Shell>
      <ShellSidebar
        label="รายการเพลง"
        rail={
          <ShellRail>
            {songs.data?.map((song) => (
              <RailItem
                key={song.id}
                label={song.title}
                selected={song.id === selectedId}
                onClick={() => pick(song.id)}
              >
                <KeyTile musicalKey={song.key} />
              </RailItem>
            ))}
          </ShellRail>
        }
      >
        <PanelHeader
          title="เพลง"
          actions={
            <>
              <Button
                colorPalette="accent"
                onClick={() => setEditing('new')}
                aria-keyshortcuts="Control+N"
                title="Ctrl+N"
              >
                <Plus /> เพิ่มเพลง
              </Button>
              <SidebarCollapse />
            </>
          }
        />
        <PanelToolbar>
          <SearchGroup>
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเพลง / ศิลปิน  (Ctrl+K)"
              aria-label="ค้นหาเพลง"
            />
          </SearchGroup>
          <HStack gap="2">
            <NativeSelect.Root>
              <NativeSelect.Field
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
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
            <NativeSelect.Root>
              <NativeSelect.Field
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
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </HStack>
        </PanelToolbar>

        <PanelBody inset={false} gap="0">
          {songs.error ? (
            <Text px="panel.px" py="4" fontSize="sm" color="fg.error">
              {songs.error}
            </Text>
          ) : !songs.data ? null : songs.data.length === 0 ? (
            <Text px="panel.px" py="6" fontSize="sm" color="fg.muted">
              {search || key || status
                ? 'ไม่พบเพลงที่ตรงกับการค้นหา'
                : 'ยังไม่มีเพลง กด "เพิ่มเพลง" เพื่อเริ่ม'}
            </Text>
          ) : (
            <ul>
              {songs.data.map((song) => (
                <li key={song.id}>
                  <ListRow
                    selected={song.id === selectedId}
                    onClick={() => pick(song.id)}
                    onDoubleClick={() => setEditing(song)}
                  >
                    <KeyTile musicalKey={song.key} />
                    <Box minW="0" flex="1">
                      <Text truncate textStyle="title.item">
                        {song.title}
                      </Text>
                      <Text truncate fontSize="xs" lineHeight="1rem" color="fg.muted">
                        {song.artist || '—'}
                      </Text>
                    </Box>
                    <Text
                      flexShrink={0}
                      textAlign="right"
                      fontFamily="mono"
                      fontSize="xs"
                      color="fg.muted"
                      fontVariantNumeric="tabular-nums"
                    >
                      {formatClock(song.durationSec)}
                    </Text>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>

        <PanelFooter justifyContent="space-between">
          {songs.data && (
            <>
              <Text as="span">{songs.data.length} เพลง</Text>
              {totalSec > 0 && <Text as="span">รวม {formatTotal(totalSec)}</Text>}
            </>
          )}
        </PanelFooter>
      </ShellSidebar>

      {selected ? (
        <SongDetail
          key={selected.id}
          song={selected}
          members={band.data?.members ?? []}
          onEdit={() => setEditing(selected)}
          onDelete={() => remove(selected)}
          onChange={() => songs.reload()}
        />
      ) : (
        <ShellMain>
          <EmptyState icon={<Music />} title="เลือกเพลงจากรายการเพื่อดูคอร์ด ฟังเพลง และโน้ต" />
        </ShellMain>
      )}

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
    </Shell>
  )
}

/** Key letter in a small tile: the song list and its rail. */
function KeyTile({ musicalKey }: { musicalKey: MusicalKey | null }): React.JSX.Element {
  return (
    <Center
      boxSize="8"
      flexShrink={0}
      rounded="chip"
      borderWidth="1px"
      bg="bg.panel"
      fontFamily="mono"
      fontSize="xs"
      fontWeight="bold"
      color="accent.fg"
    >
      {musicalKey ?? '–'}
    </Center>
  )
}

/** Chords hidden on the song page (for songs you only listen to); one setting for all songs. */
const CHORDS_HIDDEN_KEY = 'setlistic-chords-hidden'

function useStoredFlag(key: string): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  function set(next: boolean): void {
    setValue(next)
    try {
      localStorage.setItem(key, next ? '1' : '0')
    } catch {
      // Still applies for this session
    }
  }
  return [value, set]
}

/** Which inspector sections are open; remembered across songs and launches. */
const SECTIONS_KEY = 'setlistic-song-sections'
type SectionId = 'youtube' | 'stems' | 'keyChords' | 'notes'
const DEFAULT_SECTIONS: Record<SectionId, boolean> = {
  youtube: true,
  stems: false,
  keyChords: false,
  notes: false
}

function useOpenSections(): [Record<SectionId, boolean>, (id: SectionId, open: boolean) => void] {
  const [open, setOpen] = useState<Record<SectionId, boolean>>(() => {
    try {
      return { ...DEFAULT_SECTIONS, ...JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? '{}') }
    } catch {
      return DEFAULT_SECTIONS
    }
  })
  function set(id: SectionId, value: boolean): void {
    setOpen((prev) => {
      const next = { ...prev, [id]: value }
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      } catch {
        // Still folds for this session
      }
      return next
    })
  }
  return [open, set]
}

/**
 * One song. Main is the chord sheet (header · meta bar · sheet · auto-scroll footer); the
 * inspector holds the details and the practice tools. Give it `key={song.id}`.
 */
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
  const viewer = useChordViewer(song.chordUrl, song.content)
  const [chordsHidden, setChordsHidden] = useStoredFlag(CHORDS_HIDDEN_KEY)
  useChordShortcuts(viewer, !chordsHidden)
  const [sections, setSection] = useOpenSections()

  function toggleChords(): void {
    viewer.setPlaying(false)
    setChordsHidden(!chordsHidden)
  }

  // Details and practice tools: in the inspector beside the chords, or in Main when the
  // chords are hidden
  const tools = (
    <>
      <KeyValueList>
        <KeyValue label="Key">
          <Text as="span" fontFamily="mono" color="accent.fg">
            {song.key ?? '–'}
          </Text>
        </KeyValue>
        <KeyValue label="BPM" numeric>
          {song.bpm ?? '–'}
        </KeyValue>
        <KeyValue label="ความยาว" numeric>
          {formatClock(song.durationSec)}
        </KeyValue>
        <KeyValue label="สถานะ">
          <SongStatusBadge status={song.status} />
        </KeyValue>
        <KeyValue label="ศิลปิน">
          <Text as="span" display="block" truncate>
            {song.artist || '—'}
          </Text>
        </KeyValue>
        {song.tags.length > 0 && (
          <KeyValue label="แท็ก">
            <Wrap justify="flex-end" gap="1" py="2">
              {song.tags.map((t) => (
                <Badge key={t}>#{t}</Badge>
              ))}
            </Wrap>
          </KeyValue>
        )}
      </KeyValueList>

      {song.notes && (
        <Text fontSize="sm" whiteSpace="pre-wrap">
          {song.notes}
        </Text>
      )}

      <Stack gap="0" borderBottomWidth="1px">
        <FoldSection
          title="YouTube"
          icon={<CirclePlay />}
          open={sections.youtube}
          onOpenChange={(o) => setSection('youtube', o)}
        >
          <YouTubePlayer url={song.youtubeUrl} title={song.title} />
        </FoldSection>
        <FoldSection
          title="Stems"
          icon={<AudioLines />}
          open={sections.stems}
          onOpenChange={(o) => setSection('stems', o)}
        >
          <StemsPanel song={song} bare />
        </FoldSection>
        <FoldSection
          title="คอร์ดในคีย์"
          icon={<Music />}
          open={sections.keyChords}
          onOpenChange={(o) => setSection('keyChords', o)}
        >
          <KeyChords musicalKey={song.key} compact />
        </FoldSection>
        <FoldSection
          title="โน้ตรายเครื่องดนตรี"
          icon={<NotebookPen />}
          open={sections.notes}
          onOpenChange={(o) => setSection('notes', o)}
        >
          <InstrumentNotes song={song} members={members} onChange={onChange} bare />
        </FoldSection>
      </Stack>
    </>
  )

  return (
    <>
      <ShellMain>
        <PanelHeader
          title={song.title}
          titleStyle="title.page"
          actions={
            <>
              <PanelAction
                label={chordsHidden ? 'แสดงคอร์ด' : 'ซ่อนคอร์ด'}
                aria-pressed={chordsHidden}
                onClick={toggleChords}
              >
                {chordsHidden ? <Eye /> : <EyeOff />}
              </PanelAction>
              <PanelAction label="แก้ไขเพลง" onClick={onEdit}>
                <Pencil />
              </PanelAction>
              <SongMenu song={song} onDelete={onDelete} />
              {!chordsHidden && <InspectorToggle />}
            </>
          }
        />

        {/* Meta bar: what you need before the first chord */}
        <Flex
          h="panel.footerH"
          flexShrink={0}
          align="center"
          gap="3"
          px="panel.px"
          borderBottomWidth="1px"
        >
          <HStack
            as="p"
            minW="0"
            flex="1"
            gap="2"
            overflow="hidden"
            fontSize="sm"
            color="fg.muted"
            whiteSpace="nowrap"
          >
            <span>
              Key{' '}
              <Text as="b" fontFamily="mono" color="accent.fg">
                {song.key ?? '–'}
              </Text>
            </span>
            <span aria-hidden>·</span>
            <span>
              <Text as="b" fontFamily="mono" color="fg.default" fontVariantNumeric="tabular-nums">
                {song.bpm ?? '–'}
              </Text>{' '}
              BPM
            </span>
            <span aria-hidden>·</span>
            <Text as="b" fontFamily="mono" color="fg.default" fontVariantNumeric="tabular-nums">
              {formatClock(song.durationSec)}
            </Text>
          </HStack>
          {!chordsHidden && (
            <>
              <ChordWebNav viewer={viewer} />
              <ChordSourceSwitch viewer={viewer} />
            </>
          )}
        </Flex>

        {chordsHidden ? (
          <>
            <PracticeBoard song={song} members={members} onChange={onChange} />
            <PanelFooter>
              <SongLinks youtubeUrl={song.youtubeUrl} chordUrl={song.chordUrl} />
            </PanelFooter>
          </>
        ) : (
          <>
            <ChordView viewer={viewer} />
            <PanelFooter>
              {viewer.empty ? 'ยังไม่มีคอร์ดให้เลื่อน' : <ChordControls viewer={viewer} />}
            </PanelFooter>
          </>
        )}
      </ShellMain>

      {!chordsHidden && (
        <ShellInspector label={`รายละเอียด: ${song.title}`} title="รายละเอียด">
          <PanelBody>{tools}</PanelBody>
          <PanelFooter>
            <SongLinks youtubeUrl={song.youtubeUrl} chordUrl={song.chordUrl} />
          </PanelFooter>
        </ShellInspector>
      )}
    </>
  )
}

/** Main gets this two-column layout once its width passes 48rem (container query). */
const WIDE = '@container (min-width: 48rem)'

/** One block of the practice board: a card with an optional label. */
function Board({
  label,
  icon,
  children
}: {
  label?: string
  icon?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Stack as="section" gap="3" rounded="card" borderWidth="1px" bg="bg.panel" p="panel.px">
      {label && (
        <SectionLabel display="flex" alignItems="center" gap="2" _icon={{ boxSize: '4' }}>
          {icon}
          {label}
        </SectionLabel>
      )}
      {children}
    </Stack>
  )
}

/**
 * Song page with the chords hidden: Main has the room, so the tools sit side by side instead
 * of folded. Left: listen (video, stems). Right: read (details, chords in key, parts).
 * Key · BPM · length stay in the meta bar above, so they aren't repeated here.
 */
function PracticeBoard({
  song,
  members,
  onChange
}: {
  song: Song
  members: Member[]
  onChange: (song: Song) => void
}): React.JSX.Element {
  return (
    <PanelBody containerType="inline-size">
      <Grid
        maxW="page.default"
        w="full"
        gap="panel.gap"
        alignItems="start"
        templateColumns="minmax(0, 1fr)"
        css={{ [WIDE]: { gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)' } }}
      >
        <Stack gap="panel.gap" minW="0">
          <Board label="YouTube" icon={<CirclePlay />}>
            <YouTubePlayer url={song.youtubeUrl} title={song.title} />
          </Board>
          <Board>
            <StemsPanel song={song} />
          </Board>
        </Stack>

        <Stack gap="panel.gap" minW="0">
          <Board label="รายละเอียด" icon={<Info />}>
            <KeyValueList>
              <KeyValue label="สถานะ">
                <SongStatusBadge status={song.status} />
              </KeyValue>
              <KeyValue label="ศิลปิน">
                <Text as="span" display="block" truncate>
                  {song.artist || '—'}
                </Text>
              </KeyValue>
              {song.tags.length > 0 && (
                <KeyValue label="แท็ก">
                  <Wrap justify="flex-end" gap="1" py="2">
                    {song.tags.map((t) => (
                      <Badge key={t}>#{t}</Badge>
                    ))}
                  </Wrap>
                </KeyValue>
              )}
            </KeyValueList>
            {song.notes && (
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {song.notes}
              </Text>
            )}
          </Board>
          <KeyChords musicalKey={song.key} />
          <Board>
            <InstrumentNotes song={song} members={members} onChange={onChange} />
          </Board>
        </Stack>
      </Grid>
    </PanelBody>
  )
}

/** ⋯ menu in the song header: less frequent actions, delete last. */
function SongMenu({ song, onDelete }: { song: Song; onDelete: () => void }): React.JSX.Element {
  // setWindowOpenHandler in main sends these to the system browser
  function open(url: string): void {
    window.open(url, '_blank', 'noopener')
  }
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <PanelAction label="เพิ่มเติม">
          <MoreHorizontal />
        </PanelAction>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="56">
            {song.chordUrl && (
              <Menu.Item value="chords" onClick={() => open(song.chordUrl)}>
                <ExternalLink size={16} /> เปิดเว็บคอร์ดในเบราว์เซอร์
              </Menu.Item>
            )}
            {song.youtubeUrl && (
              <Menu.Item value="youtube" onClick={() => open(song.youtubeUrl)}>
                <CirclePlay size={16} /> เปิด YouTube ในเบราว์เซอร์
              </Menu.Item>
            )}
            {(song.chordUrl || song.youtubeUrl) && <Menu.Separator />}
            <Menu.Item
              value="delete"
              color="fg.error"
              _highlighted={{ bg: 'danger.subtle', color: 'fg.error' }}
              onClick={onDelete}
            >
              <Trash2 size={16} /> ลบเพลง
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
