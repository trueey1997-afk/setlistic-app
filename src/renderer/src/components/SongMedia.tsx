import { useEffect, useMemo, useRef } from 'react'
import { AspectRatio, Box, Button, Flex, HStack, SegmentGroup, Stack, Text } from '@chakra-ui/react'
import {
  ArrowLeft,
  CirclePlay,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCw,
  Type
} from 'lucide-react'
import { getYouTubeId } from '@shared/youtube'
import {
  SIZE,
  SPEED,
  useChordViewer,
  type ChordViewer,
  type WebviewElement
} from '@renderer/hooks/useChordViewer'
import { Placeholder, RowAction, Tip } from './ui'

const BASE_FONT_PX = 15

/** Takes the rest of a flex column. */
const FILL = { minH: '0', flex: '1' } as const

/** Embedded player; the privacy-enhanced domain doesn't set cookies until play. */
export function YouTubePlayer({ url, title }: { url: string; title: string }): React.JSX.Element {
  const id = getYouTubeId(url)
  if (!id) {
    return (
      <AspectRatio ratio={16 / 9} w="full" flexShrink={0}>
        <Placeholder p="4">
          <CirclePlay size={24} />
          {url ? 'ลิงก์ YouTube นี้เล่นในแอปไม่ได้' : 'ยังไม่มีลิงก์ YouTube'}
        </Placeholder>
      </AspectRatio>
    )
  }
  return (
    <AspectRatio
      ratio={16 / 9}
      w="full"
      flexShrink={0}
      overflow="hidden"
      rounded="inset"
      borderWidth="1px"
      bg="bg.media"
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title={`YouTube: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </AspectRatio>
  )
}

/** − value + group: one stepper style for speed and text size. */
function Stepper({
  label,
  icon,
  value,
  resetLabel,
  onReset,
  onDecrease,
  onIncrease,
  decreaseShortcut,
  increaseShortcut,
  canDecrease,
  canIncrease
}: {
  label: string
  icon: React.ReactNode
  value: string
  resetLabel: string
  onReset: () => void
  onDecrease: () => void
  onIncrease: () => void
  decreaseShortcut?: string
  increaseShortcut?: string
  canDecrease: boolean
  canIncrease: boolean
}): React.JSX.Element {
  return (
    <HStack gap="1" role="group" aria-label={label} flexShrink={0}>
      <Box color="fg.muted" aria-hidden>
        {icon}
      </Box>
      <RowAction
        label={`${label}: ลด`}
        shortcut={decreaseShortcut}
        disabled={!canDecrease}
        onClick={onDecrease}
      >
        <Minus />
      </RowAction>
      <Tip label={resetLabel}>
        <Button
          variant="ghost"
          size="xs"
          w="12"
          px="0"
          onClick={onReset}
          fontFamily="mono"
          fontWeight="normal"
          color="fg.muted"
          fontVariantNumeric="tabular-nums"
        >
          {value}
        </Button>
      </Tip>
      <RowAction
        label={`${label}: เพิ่ม`}
        shortcut={increaseShortcut}
        disabled={!canIncrease}
        onClick={onIncrease}
      >
        <Plus />
      </RowAction>
    </HStack>
  )
}

/** Auto-scroll play/pause · speed −/+ · text size −/+ */
export function ChordControls({ viewer }: { viewer: ChordViewer }): React.JSX.Element {
  const { playing, setPlaying, speed, setSpeed, size, setSize } = viewer
  return (
    <HStack gap="4" minW="0">
      <Tip label={playing ? 'หยุดเลื่อน' : 'เลื่อนอัตโนมัติ'} shortcut="Space">
        <Button
          size="xs"
          h="control.h"
          px="3"
          flexShrink={0}
          onClick={() => setPlaying(!playing)}
          aria-pressed={playing}
          aria-keyshortcuts="Space"
          variant={playing ? 'subtle' : 'outline'}
          colorPalette={playing ? 'accent' : 'gray'}
        >
          {playing ? <Pause /> : <Play />}
          {playing ? 'หยุดเลื่อน' : 'เลื่อนอัตโนมัติ'}
        </Button>
      </Tip>
      <Stepper
        label="ความเร็วการเลื่อน"
        icon={<Gauge size={16} />}
        value={`${(speed / SPEED.fallback).toFixed(1)}x`}
        resetLabel="ความเร็วปกติ (1.0x)"
        onReset={() => setSpeed(SPEED.fallback)}
        onDecrease={() => setSpeed(speed - SPEED.step)}
        onIncrease={() => setSpeed(speed + SPEED.step)}
        canDecrease={speed > SPEED.min}
        canIncrease={speed < SPEED.max}
      />
      <Stepper
        label="ขนาดตัวอักษร"
        icon={<Type size={16} />}
        value={`${size}%`}
        resetLabel="ขนาดปกติ (Ctrl+0)"
        onReset={() => setSize(SIZE.fallback)}
        onDecrease={() => setSize(size - SIZE.step)}
        onIncrease={() => setSize(size + SIZE.step)}
        decreaseShortcut="Ctrl+-"
        increaseShortcut="Ctrl+="
        canDecrease={size > SIZE.min}
        canIncrease={size < SIZE.max}
      />
    </HStack>
  )
}

/** Chord site ↔ typed lyrics; only when the song has both. */
export function ChordSourceSwitch({ viewer }: { viewer: ChordViewer }): React.JSX.Element | null {
  if (!viewer.hasBoth) return null
  return (
    <SegmentGroup.Root
      size="xs"
      flexShrink={0}
      value={viewer.source}
      onValueChange={(e) => viewer.setSource(e.value as 'web' | 'text')}
    >
      <SegmentGroup.Indicator />
      <SegmentGroup.Items
        items={[
          {
            value: 'web',
            label: (
              <HStack gap="1">
                <Globe size={16} /> เว็บคอร์ด
              </HStack>
            )
          },
          {
            value: 'text',
            label: (
              <HStack gap="1">
                <FileText size={16} /> เนื้อเพลง
              </HStack>
            )
          }
        ]}
      />
    </SegmentGroup.Root>
  )
}

/** Back / reload / open in browser, while the chord site is showing. */
export function ChordWebNav({ viewer }: { viewer: ChordViewer }): React.JSX.Element | null {
  const { source, chordUrl, canGoBack, webviewRef } = viewer
  if (source !== 'web' || !chordUrl) return null
  return (
    <HStack gap="0" flexShrink={0}>
      <RowAction
        label="ย้อนกลับ"
        disabled={!canGoBack}
        onClick={() => webviewRef.current?.goBack()}
      >
        <ArrowLeft />
      </RowAction>
      <RowAction label="โหลดหน้าเว็บคอร์ดใหม่" onClick={() => webviewRef.current?.reload()}>
        <RotateCw />
      </RowAction>
      {/* setWindowOpenHandler in main sends it to the system browser */}
      <RowAction
        label="เปิดเว็บคอร์ดในเบราว์เซอร์"
        onClick={() => window.open(chordUrl, '_blank', 'noopener')}
      >
        <ExternalLink />
      </RowAction>
    </HStack>
  )
}

const FRAME = { rounded: 'inset', borderWidth: '1px', overflow: 'hidden' } as const

/**
 * The sheet itself; fills the rest of its flex column and is the only part that scrolls.
 * `framed` draws it as a rounded box (stage mode); otherwise it runs edge to edge in its panel.
 */
export function ChordView({
  viewer,
  framed
}: {
  viewer: ChordViewer
  framed?: boolean
}): React.JSX.Element {
  const frame = framed ? FRAME : {}
  // Destructured once, so the React Compiler sees plain values next to the refs
  const { empty, source, chordUrl, content, size, setCanGoBack, webviewRef, textRef } = viewer
  if (empty) {
    return (
      <Flex {...FILL} p="panel.px">
        <Placeholder flex="1">
          <FileText size={24} />
          ยังไม่มีลิงก์คอร์ด กด &quot;แก้ไข&quot; แล้วใส่ &quot;ลิงก์คอร์ด / Sheet&quot;
          เพื่อดูคอร์ดในแอป
        </Placeholder>
      </Flex>
    )
  }
  if (source === 'web') {
    return (
      <Flex direction="column" {...FILL} {...frame}>
        <ChordWeb
          key={chordUrl}
          ref={webviewRef}
          url={chordUrl}
          zoom={size / 100}
          onNavigate={setCanGoBack}
        />
      </Flex>
    )
  }
  return (
    <ChordText
      ref={textRef}
      content={content}
      fontPx={(BASE_FONT_PX * size) / 100}
      framed={framed}
    />
  )
}

/** One chord symbol: root, quality/extensions, optional slash bass. */
const CHORD =
  /^\(?[A-G][#b♯♭]?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+)?\d*(?:(?:sus|add|maj|b|#)\d+)*(?:\/[A-G][#b♯♭]?)?\)?$/
/** Bar lines, repeats and no-chord marks that can share a line with chords. */
const CHORD_EXTRA = /^(?:\|+|:?\|:?|-+|\/|x\d+|N\.?C\.?)$/i

/** A line made only of chord symbols (and bar marks) sits above the lyric it belongs to. */
function isChordLine(line: string): boolean {
  const words = line.trim().split(/\s+/)
  if (!words[0]) return false
  return (
    words.every((w) => CHORD.test(w) || CHORD_EXTRA.test(w)) && words.some((w) => CHORD.test(w))
  )
}

/**
 * Typed chord sheet: monospace so chords stay over the character they were typed above;
 * chord lines in `chord.fg`.
 */
function ChordText({
  ref,
  content,
  fontPx,
  framed
}: {
  ref: React.RefObject<HTMLPreElement | null>
  content: string
  fontPx: number
  framed?: boolean
}): React.JSX.Element {
  const lines = useMemo(
    () => content.split('\n').map((text) => ({ text, chord: isChordLine(text) })),
    [content]
  )
  return (
    <Box
      as="pre"
      ref={ref}
      style={{ fontSize: fontPx }}
      {...FILL}
      {...(framed && FRAME)}
      overflowY="auto"
      px="panel.px"
      py="4"
      fontFamily="mono"
      lineHeight="relaxed"
      whiteSpace="pre-wrap"
    >
      {lines.map((line, i) => (
        <Text as="span" key={i} {...(line.chord && { color: 'chord.fg', fontWeight: 'bold' })}>
          {line.text}
          {'\n'}
        </Text>
      ))}
    </Box>
  )
}

/**
 * Shows the chord site inside the app. A <webview> (not an iframe) because most chord
 * sites refuse to be framed; main hardens every webview in `will-attach-webview`.
 * Text size is the page zoom, since the site's own styles decide its fonts.
 */
function ChordWeb({
  ref,
  url,
  zoom,
  onNavigate
}: {
  ref: React.RefObject<WebviewElement | null>
  url: string
  zoom: number
  onNavigate: (canGoBack: boolean) => void
}): React.JSX.Element {
  const zoomRef = useRef(zoom)

  useEffect(() => {
    zoomRef.current = zoom
    try {
      ref.current?.setZoomFactor(zoom)
    } catch {
      // Not ready yet; dom-ready applies it
    }
  }, [ref, zoom])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onReady = (): void => el.setZoomFactor(zoomRef.current)
    const onNav = (): void => onNavigate(el.canGoBack())
    el.addEventListener('dom-ready', onReady)
    el.addEventListener('did-navigate', onNav)
    el.addEventListener('did-navigate-in-page', onNav)
    return () => {
      el.removeEventListener('dom-ready', onReady)
      el.removeEventListener('did-navigate', onNav)
      el.removeEventListener('did-navigate-in-page', onNav)
    }
  }, [ref, onNavigate])

  return (
    <Box asChild w="full" bg="bg.webpage" {...FILL}>
      <webview
        ref={ref}
        src={url}
        // Own cookie jar, kept apart from the app and the YouTube player
        // eslint-disable-next-line react/no-unknown-property
        partition="persist:chords"
      />
    </Box>
  )
}

/**
 * Self-contained chord sheet with its toolbar on top (stage mode). The song page places the
 * same pieces in its own regions instead. Give it `key={song.id}`.
 */
export function ChordPane({
  chordUrl,
  content,
  fill
}: {
  chordUrl: string
  content: string
  /** Take the rest of a flex column instead of a fixed height. */
  fill?: boolean
}): React.JSX.Element {
  const viewer = useChordViewer(chordUrl, content)
  return (
    <Stack gap="2" {...(fill ? FILL : { h: '96' })}>
      {!viewer.empty && (
        <Flex
          wrap="wrap"
          align="center"
          columnGap="4"
          rowGap="2"
          rounded="inset"
          borderWidth="1px"
          bg="bg.panel"
          px="2"
          py="2"
        >
          <ChordControls viewer={viewer} />
          <HStack ml="auto" gap="2">
            <ChordWebNav viewer={viewer} />
            <ChordSourceSwitch viewer={viewer} />
          </HStack>
        </Flex>
      )}
      <ChordView viewer={viewer} framed />
    </Stack>
  )
}
