import { formatTotal } from './format'
import type { SetlistDetail, SetlistItem, SetlistKind } from './types'
import { buildYouTubePlaylist } from './youtube'

export interface LineSummaryOptions {
  bandName?: string
  includeLinks?: boolean
  /** Who still hasn't practised each song. Useful as a reminder the day before. */
  includeProgress?: boolean
  includeNotes?: boolean
}

const KIND_LABEL: Record<SetlistKind, string> = {
  gig: '🎤 งานโชว์',
  rehearsal: '🎸 นัดซ้อม'
}

/** Every band member has marked the song as practised. */
export function isItemReady(item: SetlistItem): boolean {
  return item.progress.length > 0 && item.progress.every((p) => p.status === 'ready')
}

const NUMBER_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
const DIVIDER = '━━━━━━━━━━━━━━'

/** "2026-11-07" + "19:00" -> "ส. 7 พ.ย. 2569 19:00" */
export function formatThaiDate(date: string, time?: string | null): string {
  const text = new Intl.DateTimeFormat('th-TH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`))
  return time ? `${text} ${time}` : text
}

/**
 * Plain-text setlist summary for pasting into a LINE group.
 * LINE does not render Markdown, so formatting is emoji + line breaks only,
 * and every URL sits on its own line so LINE turns it into a tappable link.
 */
export function generateLineSummary(
  setlist: SetlistDetail,
  options: LineSummaryOptions = {}
): string {
  const { bandName, includeLinks = true, includeProgress = false, includeNotes = true } = options
  const lines: string[] = []

  lines.push(`${KIND_LABEL[setlist.kind]} | ${setlist.name}`)
  if (bandName) lines.push(`🎶 วง ${bandName}`)
  if (setlist.eventDate) lines.push(`📅 ${formatThaiDate(setlist.eventDate, setlist.eventTime)}`)
  if (setlist.venue) lines.push(`📍 ${setlist.venue}`)
  lines.push(
    `🎵 ทั้งหมด ${setlist.items.length} เพลง` +
      (setlist.totalSec > 0 ? ` (~${formatTotal(setlist.totalSec)})` : '')
  )

  // A playlist only helps when there's more than one video to queue
  const playlist = includeLinks ? buildYouTubePlaylist(setlist.items.map((it) => it.song)) : null
  if (playlist && playlist.videoCount > 1) {
    lines.push(`📺 เปิดทุกเพลงเป็น Playlist (เล่นตามลำดับ ${playlist.videoCount} เพลง):`)
    lines.push(playlist.url)
  }
  lines.push(DIVIDER)

  setlist.items.forEach((item, i) => {
    const { song } = item
    const key = item.keyOverride || song.key
    lines.push('')
    lines.push(
      `${NUMBER_EMOJI[i] ?? `${i + 1}.`} ${song.title}${song.artist ? ` - ${song.artist}` : ''}`
    )

    const meta = [
      key &&
        `🎼 Key: ${key}${item.keyOverride && item.keyOverride !== song.key ? ' (เปลี่ยนคีย์)' : ''}`,
      song.bpm && `⏱ ${song.bpm} BPM`
    ].filter(Boolean)
    if (meta.length) lines.push(`   ${meta.join(' | ')}`)

    if (includeLinks) {
      if (song.youtubeUrl) lines.push(`   ▶️ ${song.youtubeUrl}`)
      if (song.chordUrl) lines.push(`   📄 ${song.chordUrl}`)
    }
    if (includeNotes && item.note) lines.push(`   📝 ${item.note}`)

    if (includeProgress && item.progress.length) {
      const notReady = item.progress.filter((p) => p.status !== 'ready').map((p) => p.member.name)
      lines.push(notReady.length ? `   ⏳ ยังไม่พร้อม: ${notReady.join(', ')}` : '   ✅ ทุกคนพร้อม')
    }
  })

  lines.push('')
  lines.push(DIVIDER)
  if (includeProgress) {
    const ready = setlist.items.filter(isItemReady).length
    lines.push(`📊 พร้อมแล้ว ${ready}/${setlist.items.length} เพลง`)
  }
  lines.push('ซ้อมมาให้พร้อมนะทุกคน 🔥')
  return lines.join('\n')
}

/** Opens LINE's "choose a chat" screen with the text pre-filled. */
export function lineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`
}
