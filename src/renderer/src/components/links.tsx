import { HStack, Link, type LinkProps } from '@chakra-ui/react'
import { CirclePlay, ExternalLink, FileMusic } from 'lucide-react'
import { SONG_STATUS_LABEL, type SongStatus } from '@shared/types'
import { Badge, type BadgeTone } from './ui'

/** External link: setWindowOpenHandler in main sends it to the system browser. */
export function ExternalA({
  href,
  children,
  ...props
}: LinkProps & { href: string }): React.JSX.Element {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      display="inline-flex"
      alignItems="center"
      gap="1"
      rounded="sm"
      px="1.5"
      py="1"
      fontSize="xs"
      fontWeight="medium"
      color="fg.muted"
      textDecoration="none"
      _hover={{ bg: 'bg.muted', color: 'fg', textDecoration: 'none' }}
      css={{ '& svg': { width: '3.5', height: '3.5' } }}
      {...props}
    >
      {children}
    </Link>
  )
}

export function SongLinks({
  youtubeUrl,
  chordUrl
}: {
  youtubeUrl: string
  chordUrl: string
}): React.JSX.Element | null {
  if (!youtubeUrl && !chordUrl) return null
  return (
    <HStack as="span" display="inline-flex" gap="0.5">
      {youtubeUrl && (
        <ExternalA href={youtubeUrl}>
          <CirclePlay color="var(--chakra-colors-fg-error)" /> YouTube
        </ExternalA>
      )}
      {chordUrl && (
        <ExternalA href={chordUrl}>
          <FileMusic /> คอร์ด
        </ExternalA>
      )}
    </HStack>
  )
}

export function TabLink({ href }: { href: string }): React.JSX.Element {
  return (
    <ExternalA href={href} px="0">
      <ExternalLink /> เปิด Tab
    </ExternalA>
  )
}

const STATUS_TONE: Record<SongStatus, BadgeTone> = {
  ready: 'success',
  learning: 'warning',
  idea: 'neutral'
}

export function SongStatusBadge({ status }: { status: SongStatus }): React.JSX.Element {
  return <Badge tone={STATUS_TONE[status]}>{SONG_STATUS_LABEL[status]}</Badge>
}
