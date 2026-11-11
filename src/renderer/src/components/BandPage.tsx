import { useState } from 'react'
import { Box, Button, chakra, Flex, HStack, Input, Stack, Text, Wrap } from '@chakra-ui/react'
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
import { Shell, ShellMain } from './shell'
import { Badge, PanelBody, PanelHeader, Placeholder, RowAction, SectionLabel } from './ui'

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
    <Flex flex="1" align="center" justify="center" p="8">
      <chakra.form
        display="flex"
        flexDirection="column"
        w="full"
        maxW="page.form"
        gap="4"
        onSubmit={async (e) => {
          e.preventDefault()
          const band = await run(window.setlistic.bands.create(name))
          if (band) onCreated(band)
        }}
      >
        <Box>
          <Text as="h1" textStyle="title.page">
            {first ? 'เริ่มจากสร้างวง' : 'สร้างวงใหม่'}
          </Text>
          <Text mt="1" fontSize="sm" color="fg.muted">
            แต่ละวงมีคลังเพลง เซ็ตลิสต์ และสมาชิกของตัวเอง ข้อมูลเก็บในเครื่องนี้เท่านั้น
          </Text>
        </Box>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อวง"
          maxLength={120}
          required
          autoFocus
        />
        <HStack gap="2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              ยกเลิก
            </Button>
          )}
          <Button type="submit" colorPalette="accent" flex="1">
            สร้างวง
          </Button>
        </HStack>
      </chakra.form>
    </Flex>
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

  if (!band.data)
    return (
      <Text p="panel.px" color="fg.error">
        {band.error}
      </Text>
    )
  const b = band.data

  async function save(task: Promise<Band>): Promise<boolean> {
    const updated = await run(task)
    if (!updated) return false
    band.setData(updated)
    onChanged()
    return true
  }

  return (
    <Shell>
      <ShellMain>
        <PanelHeader
          title="วง & สมาชิก"
          titleStyle="title.page"
          actions={
            <Button colorPalette="accent" onClick={() => setEditingMember('new')}>
              <UserPlus /> เพิ่มสมาชิก
            </Button>
          }
        />
        <PanelBody>
          <Stack maxW="page.narrow" gap="panel.gap">
            <Stack as="section" gap="2">
              <SectionLabel>ชื่อวง</SectionLabel>
              <chakra.form
                key={b.name}
                display="flex"
                gap="2"
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
                  fontWeight="semibold"
                />
                <Button type="submit" variant="outline">
                  บันทึก
                </Button>
              </chakra.form>
            </Stack>

            <Stack as="section" gap="2">
              <SectionLabel>สมาชิก ({b.members.length})</SectionLabel>

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
                <Placeholder>
                  <Users size={24} />
                  เพิ่มชื่อสมาชิกเพื่อใช้กับโน้ตรายเครื่องดนตรีและสถานะการซ้อม
                </Placeholder>
              ) : (
                b.members.length > 0 && (
                  <Stack
                    as="ul"
                    listStyleType="none"
                    gap="0"
                    rounded="card"
                    borderWidth="1px"
                    bg="bg.panel"
                    divideY="1px"
                  >
                    {b.members.map((m) =>
                      editingMember !== 'new' && editingMember?.id === m.id ? (
                        <Box as="li" key={m.id} p="panel.px">
                          <MemberForm
                            member={m}
                            onCancel={() => setEditingMember(null)}
                            onSave={async (input) => {
                              if (await save(window.setlistic.bands.updateMember(m.id, input)))
                                setEditingMember(null)
                            }}
                          />
                        </Box>
                      ) : (
                        <HStack as="li" key={m.id} h="row.h" gap="3" px="panel.px">
                          <Text flex="1" truncate textStyle="title.item">
                            {m.name}
                          </Text>
                          <Wrap justify="flex-end" gap="1">
                            {m.instruments.map((i) => (
                              <Badge key={i}>{INSTRUMENT_LABEL[i]}</Badge>
                            ))}
                          </Wrap>
                          <HStack gap="0">
                            <RowAction
                              label={`แก้ไข ${m.name}`}
                              onClick={() => setEditingMember(m)}
                            >
                              <Pencil />
                            </RowAction>
                            <RowAction
                              label={`ลบ ${m.name}`}
                              colorPalette="danger"
                              onClick={() => {
                                if (
                                  confirm(`ลบ ${m.name} ออกจากวง?
สถานะการซ้อมของคนนี้จะถูกลบด้วย`)
                                )
                                  save(window.setlistic.bands.removeMember(m.id))
                              }}
                            >
                              <Trash2 />
                            </RowAction>
                          </HStack>
                        </HStack>
                      )
                    )}
                  </Stack>
                )
              )}
            </Stack>

            <Stack as="section" gap="2">
              <SectionLabel>จัดการวง</SectionLabel>
              <Button
                variant="outline"
                colorPalette="danger"
                alignSelf="flex-start"
                onClick={async () => {
                  if (
                    !confirm(`ลบวง "${b.name}"?
เพลง เซ็ตลิสต์ และสมาชิกทั้งหมดของวงนี้จะถูกลบถาวร`)
                  )
                    return
                  if ((await run(window.setlistic.bands.remove(b.id))) !== undefined) onDeleted()
                }}
              >
                <Trash2 /> ลบวงนี้
              </Button>
            </Stack>
          </Stack>
        </PanelBody>
      </ShellMain>
    </Shell>
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
    <chakra.form
      display="flex"
      flexDirection="column"
      gap="3"
      rounded="card"
      borderWidth="1px"
      bg="bg.panel"
      p="panel.px"
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
      <Wrap gap="2">
        {INSTRUMENTS.map((inst) => {
          const on = instruments.includes(inst)
          return (
            <Button
              key={inst}
              type="button"
              size="xs"
              aria-pressed={on}
              variant={on ? 'subtle' : 'outline'}
              colorPalette={on ? 'accent' : 'gray'}
              fontWeight="medium"
              onClick={() =>
                setInstruments(on ? instruments.filter((i) => i !== inst) : [...instruments, inst])
              }
            >
              {INSTRUMENT_LABEL[inst]}
            </Button>
          )
        })}
      </Wrap>
      <HStack justify="flex-end" gap="2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button type="submit" variant="subtle" colorPalette="accent">
          บันทึก
        </Button>
      </HStack>
    </chakra.form>
  )
}
