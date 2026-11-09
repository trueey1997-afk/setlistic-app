import { useEffect, useRef, useState } from 'react'
import {
  AspectRatio,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  SegmentGroup,
  Slider,
  Stack,
  Text,
  type SystemStyleObject
} from '@chakra-ui/react'
import {
  AArrowDown,
  AArrowUp,
  ArrowLeft,
  CirclePlay,
  ExternalLink,
  FileText,
  Gauge,
  Globe,
  Pause,
  Play,
  RotateCw
} from 'lucide-react'
import { getYouTubeId } from '@shared/youtube'
import { ExternalA } from './links'

/** Embedded player; the privacy-enhanced domain doesn't set cookies until play. */
export function YouTubePlayer({ url, title }: { url: string; title: string }): React.JSX.Element {
  const id = getYouTubeId(url)
  if (!id) {
    return (
      <AspectRatio ratio={16 / 9} w="full" flexShrink={0}>
        <Stack
          align="center"
          justify="center"
          gap="2"
          rounded="lg"
          borderWidth="1px"
          borderStyle="dashed"
          p="4"
          textAlign="center"
          fontSize="sm"
          color="fg.muted"
        >
          <CirclePlay size={24} />
          {url ? 'ลิงก์ YouTube นี้เล่นในแอปไม่ได้' : 'ยังไม่มีลิงก์ YouTube'}
        </Stack>
      </AspectRatio>
    )
  }
  return (
    <AspectRatio
      ratio={16 / 9}
      w="full"
      flexShrink={0}
      overflow="hidden"
      rounded="lg"
      borderWidth="1px"
      bg="black"
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

/** The bits of Electron's WebviewTag we use; the renderer doesn't pull in Electron's types. */
type WebviewElement = HTMLElement & {
  reload(): void
  goBack(): void
  canGoBack(): boolean
  setZoomFactor(factor: number): void
  executeJavaScript(code: string): Promise<unknown>
}

const TICK_MS = 50
const SPEED = { min: 5, max: 150, fallback: 30 } // px per second
const SIZE = { min: 60, max: 250, step: 10, fallback: 100 } // percent
const BASE_FONT_PX = 15

/** Container query for the song page's side-by-side layout (Tailwind's old `@3xl`). */
export const WIDE = '@container (min-width: 48rem)'

/** Fills the screen beside the sticky player; a fixed share of it when stacked. */
const PANE_HEIGHT = {
  h: '70vh',
  minH: '80',
  css: { [WIDE]: { height: 'calc(100vh - 12rem)' } } satisfies SystemStyleObject
} as const
/** Takes the rest of a flex column (stage mode). */
const FILL = { minH: '0', flex: '1' } as const

function useStoredNumber(
  key: string,
  { min, max, fallback }: { min: number; max: number; fallback: number }
): [number, (n: number) => void] {
  const [value, setValue] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key))
      return n >= min && n <= max ? n : fallback
    } catch {
      return fallback
    }
  })
  function set(n: number): void {
    const clamped = Math.min(max, Math.max(min, n))
    setValue(clamped)
    try {
      localStorage.setItem(key, String(clamped))
    } catch {
      // Still applies for this session
    }
  }
  return [value, set]
}

/** Scrolls the page inside a webview; resolves true once it hits the bottom. */
async function scrollWebview(el: WebviewElement | null, px: number): Promise<boolean> {
  if (!el) return true
  try {
    const atEnd = await el.executeJavaScript(
      `window.scrollBy(0, ${px}); innerHeight + scrollY >= document.documentElement.scrollHeight - 2`
    )
    return atEnd === true
  } catch {
    return false // Page still loading
  }
}

function scrollElement(el: HTMLElement | null, px: number): boolean {
  if (!el) return true
  el.scrollTop += px
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 2
}

/**
 * Chords/lyrics with auto-scroll and text size. Shows the chord site when there is a link,
 * or text typed into older versions of the app; songs with both can switch between them.
 * Give it `key={song.id}` so scrolling stops when another song is opened.
 */
export function ChordPane({
  chordUrl,
  content,
  fill
}: {
  chordUrl: string
  content: string
  /** Take the rest of a flex column (stage mode) instead of a fixed height. */
  fill?: boolean
}): React.JSX.Element {
  const height = fill ? FILL : PANE_HEIGHT
  const [source, setSource] = useState<'web' | 'text'>(chordUrl ? 'web' : 'text')
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useStoredNumber('setlistic-scroll-speed', SPEED)
  const [size, setSize] = useStoredNumber('setlistic-chord-size', SIZE)
  const webviewRef = useRef<WebviewElement>(null)
  const textRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (!playing) return
    let carry = 0 // Sub-pixel remainder, so slow speeds still move
    const timer = setInterval(async () => {
      carry += (speed * TICK_MS) / 1000
      const px = Math.floor(carry)
      if (px === 0) return
      carry -= px
      const atEnd =
        source === 'web'
          ? await scrollWebview(webviewRef.current, px)
          : scrollElement(textRef.current, px)
      if (atEnd) setPlaying(false)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [playing, speed, source])

  if (!chordUrl && !content) {
    return (
      <Stack
        h="60"
        align="center"
        justify="center"
        gap="2"
        rounded="lg"
        borderWidth="1px"
        borderStyle="dashed"
        p="6"
        textAlign="center"
        fontSize="sm"
        color="fg.muted"
      >
        <FileText size={24} />
        ยังไม่มีลิงก์คอร์ด กด &quot;แก้ไข&quot; แล้วใส่ &quot;ลิงก์คอร์ด / Sheet&quot;
        เพื่อดูคอร์ดในแอป
      </Stack>
    )
  }

  return (
    <Stack gap="2" {...(fill ? FILL : {})}>
      <Flex
        wrap="wrap"
        align="center"
        columnGap="4"
        rowGap="2"
        rounded="lg"
        borderWidth="1px"
        bg="bg.panel"
        px="2"
        py="1.5"
      >
        <Button
          size="xs"
          h="8"
          px="3"
          onClick={() => setPlaying(!playing)}
          aria-pressed={playing}
          variant={playing ? 'solid' : 'outline'}
          colorPalette={playing ? 'brand' : 'gray'}
        >
          {playing ? <Pause /> : <Play />}
          {playing ? 'หยุดเลื่อน' : 'เลื่อนอัตโนมัติ'}
        </Button>

        <HStack gap="2" fontSize="xs" color="fg.muted" title="ความเร็ว">
          <Gauge size={16} />
          <Slider.Root
            w="28"
            size="sm"
            colorPalette="brand"
            min={SPEED.min}
            max={SPEED.max}
            value={[speed]}
            onValueChange={(e) => setSpeed(e.value[0])}
            aria-label={['ความเร็วการเลื่อน']}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
          <Text as="span" w="8" fontFamily="mono" fontVariantNumeric="tabular-nums">
            {speed}
          </Text>
        </HStack>

        <HStack gap="0.5" role="group" aria-label="ขนาดตัวอักษร">
          <ToolbarButton
            label="ตัวอักษรเล็กลง"
            disabled={size <= SIZE.min}
            onClick={() => setSize(size - SIZE.step)}
          >
            <AArrowDown />
          </ToolbarButton>
          <Button
            variant="ghost"
            size="xs"
            w="12"
            onClick={() => setSize(SIZE.fallback)}
            title="ขนาดปกติ"
            fontFamily="mono"
            fontWeight="normal"
            color="fg.muted"
            fontVariantNumeric="tabular-nums"
          >
            {size}%
          </Button>
          <ToolbarButton
            label="ตัวอักษรใหญ่ขึ้น"
            disabled={size >= SIZE.max}
            onClick={() => setSize(size + SIZE.step)}
          >
            <AArrowUp />
          </ToolbarButton>
        </HStack>

        {chordUrl && content && (
          <SegmentGroup.Root
            ml="auto"
            size="xs"
            value={source}
            onValueChange={(e) => setSource(e.value as 'web' | 'text')}
          >
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={[
                {
                  value: 'web',
                  label: (
                    <HStack gap="1">
                      <Globe size={14} /> เว็บคอร์ด
                    </HStack>
                  )
                },
                {
                  value: 'text',
                  label: (
                    <HStack gap="1">
                      <FileText size={14} /> เนื้อเพลง
                    </HStack>
                  )
                }
              ]}
            />
          </SegmentGroup.Root>
        )}
      </Flex>

      {source === 'web' ? (
        <ChordWeb key={chordUrl} ref={webviewRef} url={chordUrl} zoom={size / 100} fill={fill} />
      ) : (
        <Box
          as="pre"
          ref={textRef}
          style={{ fontSize: (BASE_FONT_PX * size) / 100 }}
          overflowY="auto"
          rounded="lg"
          borderWidth="1px"
          bg="bg.panel"
          p="5"
          fontFamily="mono"
          lineHeight="relaxed"
          whiteSpace="pre-wrap"
          {...height}
        >
          {content}
        </Box>
      )}
    </Stack>
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
  fill
}: {
  ref: React.RefObject<WebviewElement | null>
  url: string
  zoom: number
  fill?: boolean
}): React.JSX.Element {
  const [canGoBack, setCanGoBack] = useState(false)
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
    const onNavigate = (): void => setCanGoBack(el.canGoBack())
    el.addEventListener('dom-ready', onReady)
    el.addEventListener('did-navigate', onNavigate)
    el.addEventListener('did-navigate-in-page', onNavigate)
    return () => {
      el.removeEventListener('dom-ready', onReady)
      el.removeEventListener('did-navigate', onNavigate)
      el.removeEventListener('did-navigate-in-page', onNavigate)
    }
  }, [ref])

  return (
    <Flex
      direction="column"
      overflow="hidden"
      rounded="lg"
      borderWidth="1px"
      {...(fill ? FILL : {})}
    >
      <HStack gap="1" borderBottomWidth="1px" bg="bg.subtle" px="2" py="1">
        <Box mx="1" flexShrink={0} color="fg.muted">
          <Globe size={16} />
        </Box>
        <Text minW="0" flex="1" truncate fontFamily="mono" fontSize="xs" color="fg.muted">
          {url}
        </Text>
        <ToolbarButton label="ย้อนกลับ" disabled={!canGoBack} onClick={() => ref.current?.goBack()}>
          <ArrowLeft />
        </ToolbarButton>
        <ToolbarButton label="โหลดใหม่" onClick={() => ref.current?.reload()}>
          <RotateCw />
        </ToolbarButton>
        <ExternalA href={url}>
          <ExternalLink /> เปิดในเบราว์เซอร์
        </ExternalA>
      </HStack>
      <Box asChild w="full" bg="white" {...(fill ? FILL : PANE_HEIGHT)}>
        <webview
          ref={ref}
          src={url}
          // Own cookie jar, kept apart from the app and the YouTube player
          // eslint-disable-next-line react/no-unknown-property
          partition="persist:chords"
        />
      </Box>
    </Flex>
  )
}

function ToolbarButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      size="xs"
      color="fg.muted"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </IconButton>
  )
}
