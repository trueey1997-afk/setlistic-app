import { useState } from 'react'
import { Button, chakra, HStack, Input, NativeSelect, Text } from '@chakra-ui/react'
import {
  MUSICAL_KEYS,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type MusicalKey,
  type Song,
  type SongInput,
  type SongStatus
} from '@shared/types'
import { formatClock, parseClock } from '@shared/format'
import { KeyChords } from './KeyChords'
import { Dialog, Field } from './ui'

export function SongFormDialog({
  bandId,
  song,
  open,
  onClose,
  onSaved
}: {
  bandId: number
  /** Edit this song; omit to add a new one. */
  song?: Song
  open: boolean
  onClose: () => void
  onSaved: (song: Song) => void
}): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} title={song ? 'แก้ไขเพลง' : 'เพิ่มเพลง'}>
      {/* Remount per song so the fields start from that song's values */}
      <SongForm
        key={song?.id ?? 'new'}
        bandId={bandId}
        song={song}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Dialog>
  )
}

function SongForm({
  bandId,
  song,
  onCancel,
  onSaved
}: {
  bandId: number
  song?: Song
  onCancel: () => void
  onSaved: (song: Song) => void
}): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [key, setKey] = useState<MusicalKey | ''>(song?.key ?? '')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const str = (name: string): string => String(f.get(name) ?? '').trim()

    const durationSec = parseClock(str('duration'))
    if (durationSec === undefined) {
      setError('ความยาวเพลงให้ใส่แบบ 4:05')
      return
    }

    const input: SongInput = {
      title: str('title'),
      artist: str('artist'),
      key: (str('key') || null) as MusicalKey | null,
      bpm: str('bpm') ? Number(str('bpm')) : null,
      durationSec,
      youtubeUrl: str('youtubeUrl'),
      chordUrl: str('chordUrl'),
      status: str('status') as SongStatus,
      tags: [
        ...new Set(
          str('tags')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      ],
      // No editor for this any more; keep whatever the song already has
      content: song?.content ?? '',
      notes: str('notes')
    }

    setSaving(true)
    setError(null)
    try {
      const saved = song
        ? await window.setlistic.songs.update(song.id, input)
        : await window.setlistic.songs.create(bandId, input)
      onSaved(saved)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <chakra.form
      onSubmit={onSubmit}
      display="grid"
      gridTemplateColumns="repeat(4, minmax(0, 1fr))"
      gap="4"
    >
      <Field label="ชื่อเพลง *" gridColumn="span 2">
        <Input name="title" required maxLength={200} defaultValue={song?.title} autoFocus />
      </Field>
      <Field label="ศิลปิน" gridColumn="span 2">
        <Input name="artist" maxLength={200} defaultValue={song?.artist} />
      </Field>
      <Field label="คีย์">
        <NativeSelect.Root>
          <NativeSelect.Field
            name="key"
            value={key}
            onChange={(e) => setKey(e.target.value as MusicalKey | '')}
          >
            <option value="">–</option>
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field>
      <Field label="BPM">
        <Input name="bpm" type="number" min={20} max={400} defaultValue={song?.bpm ?? ''} />
      </Field>
      <Field label="ความยาว (นาที:วินาที)">
        <Input
          name="duration"
          placeholder="4:05"
          defaultValue={song?.durationSec != null ? formatClock(song.durationSec) : ''}
        />
      </Field>
      <Field label="สถานะ">
        <NativeSelect.Root>
          <NativeSelect.Field name="status" defaultValue={song?.status ?? 'learning'}>
            {SONG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SONG_STATUS_LABEL[s]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field>
      <KeyChords musicalKey={key || null} gridColumn="span 4" />
      <Field label="ลิงก์ YouTube" gridColumn="span 2">
        <Input
          name="youtubeUrl"
          type="url"
          placeholder="https://youtu.be/..."
          defaultValue={song?.youtubeUrl}
        />
      </Field>
      <Field label="ลิงก์คอร์ด / Sheet" gridColumn="span 2">
        <Input name="chordUrl" type="url" placeholder="https://..." defaultValue={song?.chordUrl} />
      </Field>
      <Field label="แท็ก (คั่นด้วย ,)" gridColumn="span 4">
        <Input name="tags" placeholder="เพลงช้า, เปิดงาน" defaultValue={song?.tags.join(', ')} />
      </Field>
      <Field label="โน้ตย่อ" gridColumn="span 4">
        <Input
          name="notes"
          maxLength={5_000}
          defaultValue={song?.notes}
          placeholder="เช่น เข้าเพลงด้วยกลองนับ 4 / ท่อนจบเล่นซ้ำ 2 รอบ"
        />
      </Field>

      {error && (
        <Text
          gridColumn="span 4"
          rounded="md"
          bg="red.subtle"
          color="fg.error"
          px="3"
          py="2"
          fontSize="sm"
        >
          {error}
        </Text>
      )}
      <HStack gridColumn="span 4" justify="flex-end" gap="2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" colorPalette="brand" loading={saving}>
          บันทึก
        </Button>
      </HStack>
    </chakra.form>
  )
}
