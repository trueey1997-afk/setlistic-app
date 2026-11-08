import { useState } from 'react'
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react'
import {
  INSTRUMENTS,
  INSTRUMENT_LABEL,
  type Band,
  type Instrument,
  type Member,
  type MemberInput
} from '@shared/types'
import { useAsync } from '@renderer/hooks/useAsync'
import { useRun } from './toast'
import { Badge, Button, Input } from './ui'

/** Create-a-band screen: shown on first launch, or from "+ สร้างวงใหม่". */
export function BandOnboarding({
  first,
  onCreated,
  onCancel
}: {
  first: boolean
  onCreated: (band: Band) => void
  onCancel?: () => void
}): React.JSX.Element {
  const run = useRun()
  const [name, setName] = useState('')

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <form
        className="flex w-full max-w-sm flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const band = await run(window.setlistic.bands.create(name))
          if (band) onCreated(band)
        }}
      >
        <div>
          <h1 className="text-2xl font-bold">{first ? 'เริ่มจากสร้างวง' : 'สร้างวงใหม่'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            แต่ละวงมีคลังเพลง เซ็ตลิสต์ และสมาชิกของตัวเอง ข้อมูลเก็บในเครื่องนี้เท่านั้น
          </p>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อวง"
          maxLength={120}
          required
          autoFocus
        />
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              ยกเลิก
            </Button>
          )}
          <Button type="submit" className="flex-1">
            สร้างวง
          </Button>
        </div>
      </form>
    </div>
  )
}

export function BandPage({
  bandId,
  onChanged,
  onDeleted
}: {
  bandId: number
  /** Band name or member count changed (refreshes the band switcher). */
  onChanged: () => void
  onDeleted: () => void
}): React.JSX.Element {
  const run = useRun()
  const band = useAsync(() => window.setlistic.bands.get(bandId), `band:${bandId}`)
  const [editingMember, setEditingMember] = useState<Member | 'new' | null>(null)

  if (!band.data) return <p className="p-6 text-danger">{band.error}</p>
  const b = band.data

  async function save(task: Promise<Band>): Promise<boolean> {
    const updated = await run(task)
    if (!updated) return false
    band.setData(updated)
    onChanged()
    return true
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
            ชื่อวง
          </h2>
          <form
            key={b.name}
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const name = String(new FormData(e.currentTarget).get('name') ?? '')
              save(window.setlistic.bands.rename(b.id, name))
            }}
          >
            <Input
              name="name"
              defaultValue={b.name}
              maxLength={120}
              required
              className="text-base font-semibold"
            />
            <Button type="submit" variant="outline">
              บันทึก
            </Button>
          </form>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              สมาชิก ({b.members.length})
            </h2>
            <Button variant="outline" onClick={() => setEditingMember('new')}>
              <UserPlus /> เพิ่มสมาชิก
            </Button>
          </div>

          {editingMember === 'new' && (
            <MemberForm
              onCancel={() => setEditingMember(null)}
              onSave={async (input) => {
                if (await save(window.setlistic.bands.addMember(b.id, input)))
                  setEditingMember(null)
              }}
            />
          )}

          {b.members.length === 0 && editingMember !== 'new' ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Users className="size-6" />
              เพิ่มชื่อสมาชิกเพื่อใช้กับโน้ตรายเครื่องดนตรีและสถานะการซ้อม
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {b.members.map((m) =>
                editingMember !== 'new' && editingMember?.id === m.id ? (
                  <li key={m.id} className="p-3">
                    <MemberForm
                      member={m}
                      onCancel={() => setEditingMember(null)}
                      onSave={async (input) => {
                        if (await save(window.setlistic.bands.updateMember(m.id, input)))
                          setEditingMember(null)
                      }}
                    />
                  </li>
                ) : (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 font-semibold">{m.name}</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {m.instruments.map((i) => (
                        <Badge key={i}>{INSTRUMENT_LABEL[i]}</Badge>
                      ))}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setEditingMember(m)}
                      aria-label={`แก้ไข ${m.name}`}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="danger"
                      aria-label={`ลบ ${m.name}`}
                      onClick={() => {
                        if (confirm(`ลบ ${m.name} ออกจากวง?\nสถานะการซ้อมของคนนี้จะถูกลบด้วย`))
                          save(window.setlistic.bands.removeMember(m.id))
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-6">
          <Button
            variant="danger"
            className="self-start"
            onClick={async () => {
              if (!confirm(`ลบวง "${b.name}"?\nเพลง เซ็ตลิสต์ และสมาชิกทั้งหมดของวงนี้จะถูกลบถาวร`))
                return
              if ((await run(window.setlistic.bands.remove(b.id))) !== undefined) onDeleted()
            }}
          >
            <Trash2 /> ลบวงนี้
          </Button>
        </section>
      </div>
    </div>
  )
}

function MemberForm({
  member,
  onSave,
  onCancel
}: {
  member?: Member
  onSave: (input: MemberInput) => void
  onCancel: () => void
}): React.JSX.Element {
  const [name, setName] = useState(member?.name ?? '')
  const [instruments, setInstruments] = useState<Instrument[]>(member?.instruments ?? [])

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ name, instruments })
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ชื่อเล่น"
        required
        autoFocus
      />
      <div className="flex flex-wrap gap-1.5">
        {INSTRUMENTS.map((inst) => {
          const on = instruments.includes(inst)
          return (
            <button
              key={inst}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setInstruments(on ? instruments.filter((i) => i !== inst) : [...instruments, inst])
              }
              className={`rounded-md border px-2.5 py-1 text-sm font-medium ${
                on
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {INSTRUMENT_LABEL[inst]}
            </button>
          )
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit">บันทึก</Button>
      </div>
    </form>
  )
}
