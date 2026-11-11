import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Code,
  Flex,
  HStack,
  IconButton,
  Progress,
  Slider,
  Stack,
  Text
} from '@chakra-ui/react'
import { AudioLines, Loader2, Pause, Play, RotateCw, Trash2, Volume2, Wand2, X } from 'lucide-react'
import { STEM_LABEL, STEM_NAMES, type Song, type StemName, type StemsState } from '@shared/types'
import { formatClock } from '@shared/format'
import { useAsync } from '@renderer/hooks/useAsync'
import { useStemPlayer } from '@renderer/hooks/useStemPlayer'
import { useRun } from './toast'
import { RowAction, SectionLabel } from './ui'

/** Theme palette per stem (see theme/system.ts). */
const STEM_COLOR: Record<StemName, string> = {
  vocals: 'stemVocals',
  drums: 'stemDrums',
  bass: 'stemBass',
  guitar: 'stemGuitar',
  piano: 'stemPiano',
  other: 'stemOther'
}

const PHASE_LABEL = {
  download: 'กำลังดาวน์โหลดเสียงจาก YouTube…',
  separate: 'กำลังแยกเสียง 6 แทร็ก (Demucs)… อาจใช้เวลาหลายนาที'
} as const

const INSTALL_COMMANDS = [
  'python -m pip install -U yt-dlp demucs soundfile',
  'winget install Gyan.FFmpeg'
]

/**
 * Splits the song's YouTube audio into 6 stems (vocals, drums, bass, guitar, piano, other)
 * and mixes them: play together, mute / solo / volume per stem.
 */
export function StemsPanel({
  song,
  bare
}: {
  song: Song
  /** Leave out the section label (when a fold header already names it) */
  bare?: boolean
}): React.JSX.Element {
  const run = useRun()
  const stems = useAsync(() => window.setlistic.stems.get(song.id), `stems:${song.id}`)
  const [missing, setMissing] = useState<string[] | null>(null)
  const [checking, setChecking] = useState(false)
  const state = stems.data
  const running = state?.status === 'running'
  const setState = stems.setData

  // Poll while a job runs in the main process
  useEffect(() => {
    if (!running) return
    const timer = setInterval(async () => {
      const next = await run(window.setlistic.stems.get(song.id))
      if (next) setState(next)
    }, 1000)
    return () => clearInterval(timer)
  }, [running, song.id, run, setState])

  async function start(): Promise<void> {
    setChecking(true)
    const tools = await run(window.setlistic.stems.tools())
    setChecking(false)
    if (!tools) return
    if (!tools.ready) {
      setMissing(tools.missing)
      return
    }
    setMissing(null)
    const next = await run(window.setlistic.stems.process(song.id))
    if (next) stems.setData(next)
  }

  async function cancel(): Promise<void> {
    await run(window.setlistic.stems.cancel(song.id))
    stems.reload()
  }

  async function remove(): Promise<void> {
    if (!confirm('ลบไฟล์ stems ของเพลงนี้?')) return
    await run(window.setlistic.stems.remove(song.id))
    stems.reload()
  }

  return (
    <Stack as="section" gap="3">
      {(!bare || state?.status === 'ready') && (
        <HStack justify="space-between">
          {bare ? (
            <Text fontSize="xs" color="fg.muted">
              6 เสียง
            </Text>
          ) : (
            <SectionLabel display="flex" alignItems="center" gap="2">
              <AudioLines size={16} /> Stems · 6 เสียง
            </SectionLabel>
          )}
          {state?.status === 'ready' && (
            <HStack gap="0">
              <RowAction
                label="ประมวลผลใหม่"
                onClick={start}
                disabled={!song.youtubeUrl || checking}
              >
                <RotateCw />
              </RowAction>
              <RowAction label="ลบ stems" colorPalette="danger" onClick={remove}>
                <Trash2 />
              </RowAction>
            </HStack>
          )}
        </HStack>
      )}

      {missing && <MissingTools missing={missing} onRetry={start} checking={checking} />}

      {stems.error ? (
        <Text fontSize="sm" color="fg.error">
          {stems.error}
        </Text>
      ) : !state ? null : running ? (
        <Running state={state} onCancel={cancel} />
      ) : state.status === 'ready' ? (
        <>
          {song.youtubeUrl && state.sourceUrl && state.sourceUrl !== song.youtubeUrl && (
            <Alert.Root status="warning" size="sm">
              <Alert.Indicator />
              <Alert.Title fontWeight="normal">
                ลิงก์ YouTube เปลี่ยนไปหลังแยกเสียง กด ↻ เพื่อประมวลผลใหม่
              </Alert.Title>
            </Alert.Root>
          )}
          <Mixer key={state.stems.map((s) => s.url).join()} stems={state.stems} />
        </>
      ) : (
        <Stack gap="2">
          {state.status === 'error' && (
            <Alert.Root status="error" size="sm">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>แยกเสียงไม่สำเร็จ</Alert.Title>
                <Alert.Description wordBreak="break-word">{state.error}</Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}
          <Text fontSize="sm" color="fg.muted">
            {song.youtubeUrl
              ? 'แยกเสียงจาก YouTube เป็น ร้อง · กลอง · เบส · กีตาร์ · เปียโน · อื่นๆ เพื่อซ้อมเปิด/ปิดทีละเครื่อง (ทำในเครื่องนี้ ไม่อัปโหลดไปไหน)'
              : 'ใส่ลิงก์ YouTube ของเพลงก่อน (กด "แก้ไข") จึงจะแยกเสียงได้'}
          </Text>
          <Button variant="outline" disabled={!song.youtubeUrl} loading={checking} onClick={start}>
            <Wand2 /> {state.status === 'error' ? 'ลองใหม่' : 'ประมวลผล'}
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

function Running({
  state,
  onCancel
}: {
  state: StemsState
  onCancel: () => void
}): React.JSX.Element {
  const phase = state.phase ?? 'download'
  return (
    <Stack gap="2">
      <HStack justify="space-between" fontSize="sm">
        <HStack gap="2" color="fg.muted">
          <Box asChild animation="spin" animationDuration="1s">
            <Loader2 size={16} />
          </Box>
          <Text>
            ขั้น {phase === 'download' ? 1 : 2}/2 · {PHASE_LABEL[phase]}
          </Text>
        </HStack>
        <Text fontFamily="mono" fontSize="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
          {Math.round(state.progress * 100)}%
        </Text>
      </HStack>
      <Progress.Root
        value={state.progress * 100}
        size="sm"
        colorPalette="accent"
        aria-label="ความคืบหน้าการแยกเสียง"
      >
        <Progress.Track rounded="full" bg="bg.muted">
          <Progress.Range rounded="full" />
        </Progress.Track>
      </Progress.Root>
      <Button size="xs" variant="ghost" alignSelf="flex-end" color="fg.muted" onClick={onCancel}>
        <X /> ยกเลิก
      </Button>
    </Stack>
  )
}

function MissingTools({
  missing,
  checking,
  onRetry
}: {
  missing: string[]
  checking: boolean
  onRetry: () => void
}): React.JSX.Element {
  return (
    <Alert.Root status="warning" size="sm" alignItems="flex-start">
      <Alert.Indicator />
      <Alert.Content gap="2">
        <Alert.Title>ต้องติดตั้งก่อนใช้งาน: {missing.join(', ')}</Alert.Title>
        <Alert.Description>
          <Stack gap="2">
            <Text>เปิด Terminal แล้วรัน (ครั้งแรก Demucs จะโหลดโมเดลอีกราว 80 MB):</Text>
            {INSTALL_COMMANDS.map((cmd) => (
              <Code key={cmd} size="sm" whiteSpace="pre-wrap" wordBreak="break-all">
                {cmd}
              </Code>
            ))}
            <Button
              size="xs"
              variant="outline"
              alignSelf="flex-start"
              loading={checking}
              onClick={onRetry}
            >
              ติดตั้งแล้ว ตรวจสอบอีกครั้ง
            </Button>
          </Stack>
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  )
}

function Mixer({ stems }: { stems: { name: StemName; url: string }[] }): React.JSX.Element {
  const player = useStemPlayer(stems)
  const anySolo = STEM_NAMES.some((n) => player.mix[n].solo)
  const loading = player.status === 'loading'

  return (
    <Stack gap="3">
      {/* Transport */}
      <HStack gap="2">
        <IconButton
          variant="subtle"
          colorPalette="accent"
          rounded="full"
          aria-label={player.playing ? 'หยุด' : 'เล่น'}
          loading={loading}
          onClick={player.playing ? player.pause : player.play}
        >
          {player.playing ? <Pause /> : <Play />}
        </IconButton>
        <Stack flex="1" gap="1">
          <Slider.Root
            size="sm"
            colorPalette="accent"
            min={0}
            max={player.duration || 1}
            step={0.1}
            value={[player.position]}
            disabled={player.status !== 'ready'}
            onValueChange={(e) => player.seek(e.value[0])}
            aria-label={['ตำแหน่งเพลง']}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumbs />
            </Slider.Control>
          </Slider.Root>
          <Flex
            justify="space-between"
            fontFamily="mono"
            fontSize="xs"
            color="fg.muted"
            fontVariantNumeric="tabular-nums"
          >
            <span>{formatClock(Math.floor(player.position))}</span>
            <span>
              {loading
                ? `กำลังโหลด ${player.loadedCount}/${stems.length}`
                : player.duration
                  ? formatClock(Math.round(player.duration))
                  : 'กด ▶ เพื่อโหลดเสียง'}
            </span>
          </Flex>
        </Stack>
      </HStack>
      {player.error && (
        <Text fontSize="xs" color="fg.error">
          {player.error}
        </Text>
      )}

      {/* One strip per stem */}
      <Stack gap="2">
        {STEM_NAMES.map((name) => {
          const m = player.mix[name]
          const silent = anySolo ? !m.solo : m.muted
          return (
            <HStack key={name} gap="2" opacity={silent ? 0.45 : 1}>
              <Box boxSize="3" rounded="full" flexShrink={0} bg={`${STEM_COLOR[name]}.solid`} />
              <Text w="12" flexShrink={0} fontSize="sm" fontWeight="semibold" truncate>
                {STEM_LABEL[name]}
              </Text>
              <Button
                size="xs"
                w="8"
                px="0"
                variant={m.muted ? 'solid' : 'outline'}
                colorPalette={m.muted ? 'danger' : 'gray'}
                aria-pressed={m.muted}
                aria-label={`ปิดเสียง${STEM_LABEL[name]}`}
                title={`ปิดเสียง${STEM_LABEL[name]}`}
                onClick={() => player.setMix(name, { muted: !m.muted })}
              >
                M
              </Button>
              <Button
                size="xs"
                w="8"
                px="0"
                variant={m.solo ? 'solid' : 'outline'}
                colorPalette={m.solo ? 'warning' : 'gray'}
                aria-pressed={m.solo}
                aria-label={`ฟังเฉพาะ${STEM_LABEL[name]}`}
                title={`ฟังเฉพาะ${STEM_LABEL[name]}`}
                onClick={() => player.setMix(name, { solo: !m.solo })}
              >
                S
              </Button>
              <Slider.Root
                flex="1"
                size="sm"
                colorPalette={STEM_COLOR[name]}
                min={0}
                max={100}
                value={[Math.round(m.volume * 100)]}
                onValueChange={(e) => player.setMix(name, { volume: e.value[0] / 100 })}
                aria-label={[`ระดับเสียง${STEM_LABEL[name]}`]}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumbs />
                </Slider.Control>
              </Slider.Root>
              <Text
                w="8"
                flexShrink={0}
                textAlign="right"
                fontFamily="mono"
                fontVariantNumeric="tabular-nums"
                fontSize="xs"
                color="fg.muted"
              >
                {Math.round(m.volume * 100)}
              </Text>
            </HStack>
          )
        })}
      </Stack>

      {/* Master: after every stem, lined up with the stem sliders */}
      <HStack gap="2" borderTopWidth="1px" pt="3">
        <Box boxSize="3" flexShrink={0} />
        <Text w="12" flexShrink={0} fontSize="sm" fontWeight="bold" truncate>
          Master
        </Text>
        {/* Same width as the M and S buttons above */}
        <HStack gap="2" flexShrink={0} color="fg.muted">
          <Flex w="8" justify="center">
            <Volume2 size={16} />
          </Flex>
          <Box w="8" />
        </HStack>
        <Slider.Root
          flex="1"
          size="sm"
          colorPalette="accent"
          min={0}
          max={100}
          value={[Math.round(player.masterVolume * 100)]}
          onValueChange={(e) => player.setMasterVolume(e.value[0] / 100)}
          aria-label={['ระดับเสียงรวม (Master)']}
        >
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumbs />
          </Slider.Control>
        </Slider.Root>
        <Text
          w="8"
          flexShrink={0}
          textAlign="right"
          fontFamily="mono"
          fontVariantNumeric="tabular-nums"
          fontSize="xs"
          fontWeight="bold"
        >
          {Math.round(player.masterVolume * 100)}
        </Text>
      </HStack>
    </Stack>
  )
}
