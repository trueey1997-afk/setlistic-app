import { useState } from 'react'
import {
  Box,
  Button,
  chakra,
  Collapsible,
  Flex,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Textarea
} from '@chakra-ui/react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  INSTRUMENTS,
  INSTRUMENT_LABEL,
  type Instrument,
  type InstrumentNote,
  type InstrumentNoteInput,
  type Member,
  type Song
} from '@shared/types'
import { TabLink } from './links'
import { useRun } from './toast'
import { RowAction, SectionLabel } from './ui'

/** Per-member, per-instrument notes and tab links for one song. */
export function InstrumentNotes({
  song,
  members,
  onChange,
  bare
}: {
  song: Song
  members: Member[]
  onChange: (song: Song) => void
  /** Leave out the section label (when a fold header already names it) */
  bare?: boolean
}): React.JSX.Element {
  const run = useRun()
  const [editing, setEditing] = useState<number | null>(null)

  async function save(task: Promise<Song>): Promise<boolean> {
    const updated = await run(task)
    if (updated) onChange(updated)
    return !!updated
  }

  const groups = INSTRUMENTS.map((inst) => ({
    inst,
    notes: song.instrumentNotes.filter((n) => n.instrument === inst)
  })).filter((g) => g.notes.length > 0)

  return (
    <Stack as="section" gap="3">
      {!bare && <SectionLabel>โน้ตรายเครื่องดนตรี</SectionLabel>}

      {groups.map(({ inst, notes }) => (
        <Stack key={inst} gap="2">
          <Text as="h4" textStyle="title.item">
            {INSTRUMENT_LABEL[inst]}
          </Text>
          {notes.map((note) =>
            editing === note.id ? (
              <NoteForm
                key={note.id}
                note={note}
                members={members}
                onCancel={() => setEditing(null)}
                onSave={async (input) => {
                  if (await save(window.setlistic.songs.updateNote(note.id, input)))
                    setEditing(null)
                }}
              />
            ) : (
              <Flex key={note.id} align="flex-start" gap="3" rounded="inset" bg="bg.muted" p="3">
                <Box minW="0" flex="1" fontSize="sm">
                  <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                    {note.member?.name ?? 'ไม่ระบุ'}
                  </Text>
                  {note.note && <Text whiteSpace="pre-wrap">{note.note}</Text>}
                  {note.tabUrl && <TabLink href={note.tabUrl} />}
                </Box>
                <RowAction label="แก้ไขโน้ต" onClick={() => setEditing(note.id)}>
                  <Pencil />
                </RowAction>
                <RowAction
                  label="ลบโน้ต"
                  colorPalette="danger"
                  onClick={() => {
                    if (confirm('ลบโน้ตนี้?')) save(window.setlistic.songs.removeNote(note.id))
                  }}
                >
                  <Trash2 />
                </RowAction>
              </Flex>
            )
          )}
        </Stack>
      ))}

      <Collapsible.Root rounded="inset" borderWidth="1px" borderStyle="dashed" p="3">
        <Collapsible.Trigger cursor="pointer" fontSize="sm" fontWeight="semibold">
          + เพิ่มโน้ต
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box mt="3">
            <NoteForm
              members={members}
              onSave={(input) => save(window.setlistic.songs.addNote(song.id, input))}
            />
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Stack>
  )
}

function NoteForm({
  note,
  members,
  onSave,
  onCancel
}: {
  note?: InstrumentNote
  members: Member[]
  onSave: (input: InstrumentNoteInput) => Promise<unknown> | void
  onCancel?: () => void
}): React.JSX.Element {
  const [memberId, setMemberId] = useState<number | null>(
    note?.member?.id ?? members[0]?.id ?? null
  )
  const member = members.find((m) => m.id === memberId)
  // Default the instrument to the chosen member's first instrument
  const [instrument, setInstrument] = useState<Instrument>(
    note?.instrument ?? member?.instruments[0] ?? 'guitar'
  )

  return (
    <chakra.form
      display="flex"
      flexDirection="column"
      gap="2"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const f = new FormData(form)
        await onSave({
          memberId,
          instrument,
          note: String(f.get('note') ?? ''),
          tabUrl: String(f.get('tabUrl') ?? '').trim()
        })
        if (!note) form.reset()
      }}
    >
      <HStack gap="2">
        <NativeSelect.Root>
          <NativeSelect.Field
            value={memberId ?? ''}
            onChange={(e) => {
              const id = Number(e.target.value) || null
              setMemberId(id)
              const first = members.find((m) => m.id === id)?.instruments[0]
              if (first) setInstrument(first)
            }}
            aria-label="สมาชิก"
          >
            <option value="">ไม่ระบุ</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={instrument}
            onChange={(e) => setInstrument(e.target.value as Instrument)}
            aria-label="เครื่องดนตรี"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>
                {INSTRUMENT_LABEL[i]}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>
      <Textarea
        name="note"
        rows={2}
        maxLength={1000}
        defaultValue={note?.note}
        placeholder="เช่น ท่อนฮุคเล่น octave / intro เว้น 2 ห้อง"
      />
      <Input name="tabUrl" type="url" defaultValue={note?.tabUrl} placeholder="ลิงก์ Tab (ถ้ามี)" />
      <HStack justify="flex-end" gap="2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit" variant="subtle" colorPalette="accent">
          {note ? 'บันทึก' : 'เพิ่มโน้ต'}
        </Button>
      </HStack>
    </chakra.form>
  )
}
