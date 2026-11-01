import { CirclePlay, ExternalLink, FileMusic } from 'lucide-react'
import { SONG_STATUS_LABEL, type SongStatus } from '@shared/types'
import { Badge, type BadgeTone } from './ui'

/** External link: setWindowOpenHandler in main sends it to the system browser. */
export function ExternalA({
  href,
  className = '',
  children
}: {
  href: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5 ${className}`}
    >
      {children}
    </a>
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
    <span className="inline-flex items-center gap-0.5">
      {youtubeUrl && (
        <ExternalA href={youtubeUrl}>
          <CirclePlay className="text-primary" /> YouTube
        </ExternalA>
      )}
      {chordUrl && (
        <ExternalA href={chordUrl}>
          <FileMusic /> คอร์ด
        </ExternalA>
      )}
    </span>
  )
}

export function TabLink({ href }: { href: string }): React.JSX.Element {
  return (
    <ExternalA href={href} className="px-0">
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
