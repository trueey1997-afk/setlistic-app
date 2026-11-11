import { Box, Grid, Span, Stack, Text, type StackProps } from '@chakra-ui/react'
import type { MusicalKey } from '@shared/types'
import { chordsInKey } from '@shared/music'

/** Chords that belong to `musicalKey`, primary ones (I-IV-V) highlighted. Shown under key pickers. */
export function KeyChords({
  musicalKey,
  compact,
  ...props
}: StackProps & {
  musicalKey: MusicalKey | null
  /** Smaller chips and a one-line hint, for the narrow column beside the chords. */
  compact?: boolean
}): React.JSX.Element | null {
  if (!musicalKey) return null
  const { chords, spelledAs, dominant } = chordsInKey(musicalKey)
  const strong = (text: string): React.JSX.Element => (
    <Span fontFamily="mono" fontWeight="bold" color="fg.default">
      {text}
    </Span>
  )

  return (
    <Stack
      rounded="inset"
      borderWidth="1px"
      bg="bg.subtle"
      gap={compact ? '1.5' : '2'}
      p={compact ? '2' : '3'}
      {...props}
    >
      <Text fontSize="xs" color="fg.muted">
        คอร์ดในคีย์ {strong(musicalKey)}
        {spelledAs && ` (เขียนแบบ ${spelledAs} จะอ่านง่ายกว่า)`}
        <Span ml="2" display="inline-flex" alignItems="center" gap="1">
          · <Span display="inline-block" boxSize="2.5" rounded="xs" bg="accent.solid" /> คอร์ดหลัก
        </Span>
      </Text>
      <Grid as="ul" templateColumns="repeat(7, minmax(0, 1fr))" gap={compact ? '1' : '1.5'}>
        {chords.map((c) => (
          <Stack
            as="li"
            key={c.degree}
            title={c.primary ? 'คอร์ดหลัก' : undefined}
            minW="0"
            align="center"
            gap="0"
            rounded="chip"
            borderWidth="1px"
            px="1"
            py={compact ? '1' : '1.5'}
            {...(c.primary
              ? { borderColor: 'accent.solid', bg: 'accent.solid', color: 'accent.contrast' }
              : { bg: 'bg.canvas' })}
          >
            <Box fontSize="xs" {...(c.primary ? { opacity: 0.8 } : { color: 'fg.muted' })}>
              {c.degree}
            </Box>
            <Box
              maxW="full"
              truncate
              fontFamily="mono"
              fontWeight="bold"
              fontSize={compact ? 'xs' : 'sm'}
            >
              {c.name}
            </Box>
          </Stack>
        ))}
      </Grid>
      {dominant &&
        (compact ? (
          <Text fontSize="xs" color="fg.muted">
            นิยมใช้ {strong(dominant)} / {strong(`${dominant}7`)} แทน v
          </Text>
        ) : (
          <Text fontSize="xs" color="fg.muted">
            คีย์ไมเนอร์นิยมใช้ {strong(dominant)} หรือ {strong(`${dominant}7`)} (V) แทนคอร์ด v
            ไมเนอร์ เพื่อให้ส่งกลับเข้าคอร์ด i ได้หนักแน่นขึ้น
          </Text>
        ))}
    </Stack>
  )
}
