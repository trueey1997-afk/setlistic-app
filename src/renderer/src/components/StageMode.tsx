import { useEffect, useState } from 'react'
import { Box, Button, Flex, HStack, Icon, IconButton, Stack, Text } from '@chakra-ui/react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PanelRightClose,
  PanelRightOpen,
  StickyNote,
  X
} from 'lucide-react'
import type { SetlistDetail, SetlistItem } from '@shared/types'
import { formatClock } from '@shared/format'
import { ChordPane } from './SongMedia'
import { ListRow, selectedBar } from './ui'

const ORDER_KEY = 'stage.showOrder'

/**
 * Full-window view for playing a set live: one song at a time in large type, with the
 * chords below and the running order beside. Arrow keys and PageUp/PageDown move between
 * songs, so a Bluetooth page-turner pedal works too. Moving forward ticks the song as played.
 */
export function StageMode({
  setlist,
  startItemId,
  onPlayed,
  onClose
}: {
  setlist: SetlistDetail
  /** Open on this song instead of the first unplayed one. */
  startItemId?: number
  onPlayed: (item: SetlistItem, played: boolean) => void
  onClose: () => void
}): React.JSX.Element {
  const { items } = setlist
  // Pick up where the band left off
  const [index, setIndex] = useState(() => {
    const start = items.findIndex((it) => it.id === startItemId)
    return start >= 0
      ? start
      : Math.max(
          0,
          items.findIndex((it) => !it.played)
        )
  })
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement)
  // The running order is hidden by default so the chords get the full width
  const [showOrder, setShowOrder] = useState(() => {
    try {
      return localStorage.getItem(ORDER_KEY) === 'open'
    } catch {
      return false
    }
  })
  const current = items[Math.min(index, items.length - 1)]
  const next = items[index + 1]
  const playedCount = items.filter((it) => it.played).length

  function goNext(): void {
    if (!current.played) onPlayed(current, true)
    setIndex((i) => Math.min(i + 1, items.length - 1))
  }

  function goPrev(): void {
    setIndex((i) => Math.max(i - 1, 0))
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  function toggleOrder(): void {
    setShowOrder((open) => {
      try {
        localStorage.setItem(ORDER_KEY, open ? 'closed' : 'open')
      } catch {
        // Not remembered; fine
      }
      return !open
    })
  }

  useEffect(() => {
    const onChange = (): void => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) document.exitFullscreen()
    }
  }, [])

  // Re-bound every render so the handler sees the current song
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // Arrow keys belong to sliders and fields while they have focus
      const target = e.target as HTMLElement
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
        target.closest('[role="slider"], [role="radiogroup"]')
      )
        return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'l' || e.key === 'L') {
        toggleOrder()
      } else if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose() // In fullscreen, Esc first leaves fullscreen
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const { song } = current
  const key = current.keyOverride || song.key
  const changedKey = !!current.keyOverride && current.keyOverride !== song.key

  return (
    <Flex
      role="dialog"
      aria-modal="true"
      aria-label={`โหมดเล่นสด: ${setlist.name}`}
      position="fixed"
      inset="0"
      zIndex="overlay"
      direction="column"
      bg="bg.canvas"
      color="fg.default"
      // Stage density: 56px rows, 48px controls, 24px icons (theme/system.ts)
      data-density="stage"
    >
      {/* ── Top bar: the current song's details live here so the chords get the height ── */}
      <HStack
        as="header"
        position="relative"
        flexShrink={0}
        gap="4"
        borderBottomWidth="1px"
        px="panel.px"
        py="2"
      >
        <StageButton label="ออกจากโหมดเล่นสด (Esc)" onClick={onClose}>
          <X />
        </StageButton>
        <Text
          textStyle="stage.stat"
          color="accent.fg"
          title={`${setlist.name} · เล่นแล้ว ${playedCount}/${items.length}`}
        >
          {String(index + 1).padStart(2, '0')}
        </Text>
        <Box minW="0" flex="1">
          <Text as="h1" truncate textStyle="stage.title">
            {song.title}
          </Text>
          <Text truncate textStyle="stage.label">
            {song.artist || '—'}
            <Text as="span" ml="2" fontVariantNumeric="tabular-nums">
              · {setlist.name} · {playedCount}/{items.length}
            </Text>
          </Text>
        </Box>
        <HStack as="dl" flexShrink={0} gap="6">
          <StageStat
            label={changedKey ? `KEY (เดิม ${song.key ?? '–'})` : 'KEY'}
            value={key ?? '–'}
            tone={changedKey ? 'warning' : 'primary'}
          />
          <StageStat label="BPM" value={song.bpm?.toString() ?? '–'} />
          <StageStat label="TIME" value={formatClock(song.durationSec)} />
        </HStack>
        <StageButton
          label={showOrder ? 'ซ่อนลำดับเพลง (L)' : 'แสดงลำดับเพลง (L)'}
          onClick={toggleOrder}
        >
          {showOrder ? <PanelRightClose /> : <PanelRightOpen />}
        </StageButton>
        <StageButton label={fullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'} onClick={toggleFullscreen}>
          {fullscreen ? <Minimize /> : <Maximize />}
        </StageButton>
        {/* Set progress as a hairline along the bottom edge */}
        <Box position="absolute" insetX="0" bottom="-1px" h="1" bg="bg.muted">
          <Box
            h="full"
            bg="accent.solid"
            transition="width 0.2s"
            style={{ width: `${(playedCount / items.length) * 100}%` }}
          />
        </Box>
      </HStack>

      <Flex minH="0" flex="1">
        {/* ── Chords ── */}
        <Stack as="main" minW="0" flex="1" gap="2" p="panel.px">
          {(current.note || song.notes) && (
            <Flex
              wrap="wrap"
              align="center"
              columnGap="4"
              rowGap="1"
              rounded="chip"
              bg="accent.subtle"
              px="panel.px"
              py="2"
              {...selectedBar(true, '1')}
            >
              {current.note && <Text textStyle="stage.cue">{current.note}</Text>}
              {song.notes && (
                <HStack gap="2" fontSize="lg" color="fg.muted">
                  <StickyNote size={24} /> {song.notes}
                </HStack>
              )}
            </Flex>
          )}

          <ChordPane key={current.id} chordUrl={song.chordUrl} content={song.content} fill />
        </Stack>

        {/* ── Running order ── */}
        <Flex
          as="aside"
          aria-label="ลำดับเพลง"
          display={showOrder ? 'flex' : 'none'}
          w="pane.stageOrder"
          flexShrink={0}
          direction="column"
          borderLeftWidth="1px"
        >
          {next && (
            <Box borderBottomWidth="1px" px="panel.px" py="3">
              <Text textStyle="stage.label">ถัดไป</Text>
              <Text truncate textStyle="title.section">
                {next.song.title}
              </Text>
              <Text
                fontFamily="mono"
                fontSize="sm"
                color="accent.fg"
                fontVariantNumeric="tabular-nums"
              >
                Key {next.keyOverride || next.song.key || '–'}
                {next.song.bpm && (
                  <Text as="span" color="fg.muted">
                    {' '}
                    · {next.song.bpm} BPM
                  </Text>
                )}
              </Text>
            </Box>
          )}
          <Box as="ol" minH="0" flex="1" overflowY="auto">
            {items.map((it, i) => (
              <li key={it.id}>
                <ListRow
                  selected={i === index}
                  barWidth="1"
                  onClick={() => setIndex(i)}
                  color={it.played && i !== index ? 'fg.muted' : undefined}
                >
                  <Box
                    w="8"
                    flexShrink={0}
                    fontFamily="mono"
                    fontSize="sm"
                    fontWeight="bold"
                    fontVariantNumeric="tabular-nums"
                  >
                    {it.played ? (
                      <Icon color="success.fg" boxSize="icon.size">
                        <Check aria-label="เล่นแล้ว" />
                      </Icon>
                    ) : (
                      i + 1
                    )}
                  </Box>
                  <Text
                    minW="0"
                    flex="1"
                    truncate
                    textDecoration={it.played ? 'line-through' : undefined}
                  >
                    {it.song.title}
                  </Text>
                  <Text
                    flexShrink={0}
                    fontFamily="mono"
                    fontSize="sm"
                    color="fg.muted"
                    textAlign="right"
                  >
                    {it.keyOverride || it.song.key}
                  </Text>
                </ListRow>
              </li>
            ))}
          </Box>
        </Flex>
      </Flex>

      {/* ── Big controls, easy to hit mid-song ── */}
      <HStack as="footer" flexShrink={0} gap="2" borderTopWidth="1px" px="panel.px" py="2">
        <Button size="lg" h="control.h" variant="outline" onClick={goPrev} disabled={index === 0}>
          <ChevronLeft /> ก่อนหน้า
        </Button>
        <Button
          size="lg"
          h="control.h"
          variant={current.played ? 'surface' : 'outline'}
          colorPalette={current.played ? 'success' : 'gray'}
          onClick={() => onPlayed(current, !current.played)}
          aria-pressed={current.played}
        >
          <Check /> {current.played ? 'เล่นแล้ว' : 'ติ๊กว่าเล่นแล้ว'}
        </Button>
        <Text
          display={{ base: 'none', xl: 'block' }}
          flex="1"
          truncate
          textAlign="center"
          fontSize="xs"
          color="fg.muted"
        >
          ← → / PageUp PageDown (pedal ได้) · L ซ่อน/แสดงลำดับเพลง · คลิกนอกหน้าคอร์ดก่อนใช้คีย์
        </Text>
        <Button
          size="lg"
          h="control.h"
          colorPalette="accent"
          ml="auto"
          maxW="md"
          minW="56"
          justifyContent="space-between"
          gap="3"
          fontWeight="bold"
          onClick={goNext}
          disabled={!next && current.played}
        >
          <Text as="span" minW="0" truncate>
            {next ? `ถัดไป: ${next.song.title}` : 'จบเซ็ต'}
          </Text>
          <ChevronRight />
        </Button>
      </HStack>
    </Flex>
  )
}

function StageButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      size="lg"
      boxSize="control.h"
      color="fg.muted"
      _icon={{ boxSize: 'icon.size' }}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </IconButton>
  )
}

function StageStat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'primary' | 'warning'
}): React.JSX.Element {
  const color = tone === 'primary' ? 'accent.fg' : tone === 'warning' ? 'warning.fg' : undefined
  return (
    <Stack gap="0">
      <Text as="dt" textStyle="stage.label">
        {label}
      </Text>
      <Text as="dd" textStyle="stage.stat" textAlign="right" color={color}>
        {value}
      </Text>
    </Stack>
  )
}
