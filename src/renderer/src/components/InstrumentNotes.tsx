import { useState } from 'react'
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
import { Button, Input, Select, Textarea } from './ui'

/** Per-member, per-instrument notes and tab links for one song. */
export function InstrumentNotes({
  song,
  members,
  onChange
}: {
  song: Song
  members: Member[]
  onChange: (song: Song) => void
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
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
        โน้ตรายเครื่องดนตรี
      </h2>

      {groups.map(({ inst, notes }) => (
        <div key={inst} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{INSTRUMENT_LABEL[inst]}</h3>
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
              <div key={note.id} className="flex items-start gap-3 rounded-md bg-muted px-3 py-2">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {note.member?.name ?? 'ไม่ระบุ'}
                  </p>
                  {note.note && <p className="whitespace-pre-wrap">{note.note}</p>}
                  {note.tabUrl && <TabLink href={note.tabUrl} />}
                </div>
                <Button variant="ghost" onClick={() => setEditing(note.id)} aria-label="แก้ไขโน้ต">
                  <Pencil />
                </Button>
                <Button
                  variant="danger"
                  aria-label="ลบโน้ต"
                  onClick={() => {
                    if (confirm('ลบโน้ตนี้?')) save(window.setlistic.songs.removeNote(note.id))
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          )}
        </div>
      ))}

      <details className="rounded-md border border-dashed border-border p-3">
        <summary className="cursor-pointer text-sm font-semibold">+ เพิ่มโน้ต</summary>
        <div className="mt-3">
          <NoteForm
            members={members}
            onSave={(input) => save(window.setlistic.songs.addNote(song.id, input))}
          />
        </div>
      </details>
    </section>
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
    <form
      className="flex flex-col gap-2"
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
      <div className="flex gap-2">
        <Select
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
        </Select>
        <Select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value as Instrument)}
          aria-label="เครื่องดนตรี"
        >
          {INSTRUMENTS.map((i) => (
            <option key={i} value={i}>
              {INSTRUMENT_LABEL[i]}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        name="note"
        rows={2}
        maxLength={1000}
        defaultValue={note?.note}
        placeholder="เช่น ท่อนฮุคเล่น octave / intro เว้น 2 ห้อง"
      />
      <Input name="tabUrl" type="url" defaultValue={note?.tabUrl} placeholder="ลิงก์ Tab (ถ้ามี)" />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit">{note ? 'บันทึก' : 'เพิ่มโน้ต'}</Button>
      </div>
    </form>
  )
}
