import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Input,
  NativeSelect,
  Stack,
  Text,
  Wrap
} from '@chakra-ui/react'
import { Music, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { KeyChords } from './KeyChords'
import { SongFormDialog } from './SongForm'
import { SongLinks, SongStatusBadge } from './links'
import { StemsPanel } from './Stems'
import { ChordPane, WIDE, YouTubePlayer } from './SongMedia'
import { useRun } from './toast'
import { Badge, EmptyState, ListRow, SearchGroup, SidePane } from './ui'

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
    <Flex minH="0" flex="1">
      {/* ── List pane ── */}
      <SidePane open={sidebarOpen} label="รายการเพลง" w="380px">
        <Stack gap="2" borderBottomWidth="1px" p="3">
          <SearchGroup>
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเพลง / ศิลปิน  (Ctrl+F)"
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
          <Button colorPalette="brand" onClick={() => setEditing('new')} title="Ctrl+N">
            <Plus /> เพิ่มเพลง
          </Button>
        </Stack>

        <Box minH="0" flex="1" overflowY="auto">
          {songs.error ? (
            <Text p="4" fontSize="sm" color="fg.error">
              {songs.error}
            </Text>
          ) : !songs.data ? null : songs.data.length === 0 ? (
            <Text p="6" textAlign="center" fontSize="sm" color="fg.muted">
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
                    onClick={() => setSelectedId(song.id)}
                    onDoubleClick={() => setEditing(song)}
                  >
                    <Center
                      boxSize="10"
                      flexShrink={0}
                      rounded="sm"
                      borderWidth="1px"
                      bg="bg"
                      fontFamily="mono"
                      fontSize="sm"
                      fontWeight="bold"
                      color="brand.fg"
                    >
                      {song.key ?? '–'}
                    </Center>
                    <Box minW="0" flex="1">
                      <Text truncate fontSize="sm" fontWeight="semibold">
                        {song.title}
                      </Text>
                      <Text truncate fontSize="xs" color="fg.muted">
                        {song.artist || '—'}
                      </Text>
                    </Box>
                    <Stack flexShrink={0} align="flex-end" gap="1">
                      <SongStatusBadge status={song.status} />
                      <Text fontFamily="mono" fontSize="xs" color="fg.muted">
                        {formatClock(song.durationSec)}
                      </Text>
                    </Stack>
                  </ListRow>
                </li>
              ))}
            </ul>
          )}
        </Box>

        {songs.data && (
          <Text borderTopWidth="1px" px="3" py="2" fontFamily="mono" fontSize="xs" color="fg.muted">
            {songs.data.length} เพลง
          </Text>
        )}
      </SidePane>

      {/* ── Detail pane ── */}
      <Box as="section" minW="0" flex="1" overflowY="auto">
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
      </Box>

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
    </Flex>
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
    <Stack as="article" containerType="inline-size" mx="auto" maxW="1600px" gap="5" p="6">
      {/* Header: reference video on the left, song details beside it */}
      <Flex as="header" wrap="wrap" align="flex-start" columnGap="6" rowGap="4">
        <Box w="full" flexShrink={0} css={{ [WIDE]: { width: '360px' } }}>
          <YouTubePlayer url={song.youtubeUrl} title={song.title} />
        </Box>
        <Stack minW="0" flex="1" gap="4">
          <Flex wrap="wrap" align="flex-start" justify="space-between" columnGap="6" rowGap="3">
            <Box minW="0" flex="1">
              <Heading size="3xl" wordBreak="break-word">
                {song.title}
              </Heading>
              <Text mt="1" color="fg.muted">
                {song.artist || '—'}
              </Text>
            </Box>
            <HStack flexShrink={0} gap="1">
              <Button variant="outline" onClick={onEdit}>
                <Pencil /> แก้ไข
              </Button>
              <IconButton variant="ghost" colorPalette="red" onClick={onDelete} aria-label="ลบเพลง">
                <Trash2 />
              </IconButton>
            </HStack>
          </Flex>
          <Wrap align="center" gap="1.5">
            <SongStatusBadge status={song.status} />
            {song.tags.map((t) => (
              <Badge key={t}>#{t}</Badge>
            ))}
            <SongLinks youtubeUrl={song.youtubeUrl} chordUrl={song.chordUrl} />
          </Wrap>
          <HStack as="dl" gap="6" fontFamily="mono">
            <Stat label="KEY" value={song.key ?? '–'} accent />
            <Stat label="BPM" value={song.bpm?.toString() ?? '–'} />
            <Stat label="TIME" value={formatClock(song.durationSec)} />
          </HStack>
          {song.notes && (
            <Text borderLeftWidth="2px" borderColor="brand.solid" pl="3" fontSize="sm">
              {song.notes}
            </Text>
          )}
        </Stack>
      </Flex>

      {/* 65 / 35 split once there's room: chords | stems, chords in key, notes */}
      <Grid
        alignItems="start"
        gap="6"
        css={{ [WIDE]: { gridTemplateColumns: 'minmax(0,65fr) minmax(0,35fr)' } }}
      >
        <ChordPane key={song.id} chordUrl={song.chordUrl} content={song.content} />
        <Stack
          as="aside"
          gap="6"
          css={{
            [WIDE]: {
              position: 'sticky',
              top: '1.5rem',
              maxHeight: 'calc(100vh - 6rem)',
              overflowY: 'auto'
            }
          }}
        >
          <Stack gap="2">
            <StemsPanel key={song.id} song={song} />
            <KeyChords musicalKey={song.key} compact />
          </Stack>
          <InstrumentNotes song={song} members={members} onChange={onChange} />
        </Stack>
      </Grid>
    </Stack>
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
    <Stack gap="1">
      <Text as="dt" fontSize="11px" letterSpacing="widest" color="fg.muted">
        {label}
      </Text>
      <Text as="dd" fontSize="2xl" fontWeight="bold" color={accent ? 'brand.fg' : undefined}>
        {value}
      </Text>
    </Stack>
  )
}
