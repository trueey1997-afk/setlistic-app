import { formatTotal } from './format'
import type { SetlistDetail, SetlistItem, SetlistKind } from './types'
import { buildYouTubePlaylist, getYouTubeId } from './youtube'

/**
 * `full`: links per song, for LINE (no length limit).
 * `short`: one line per song plus the playlist, for chats with a length limit like IG DMs.
 */
export type SummaryFormat = 'full' | 'short'

/** Instagram DMs cut messages at 1,000 characters. */
export const SHORT_SUMMARY_LIMIT = 1000

export interface LineSummaryOptions {
  format?: SummaryFormat
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

const TRACKING_PARAM = /^(utm_\w+|fbclid|gclid|igshid|si|mibextid)$/

/**
 * Shortest working form of a link: YouTube becomes youtu.be/<id> (dropping radio/playlist
 * params), other links lose tracking params. Anything that isn't a URL is returned as is.
 */
export function shareUrl(url: string): string {
  const id = getYouTubeId(url)
  if (id) return `https://youtu.be/${id}`
  try {
    const u = new URL(url)
    for (const name of [...u.searchParams.keys()]) {
      if (TRACKING_PARAM.test(name)) u.searchParams.delete(name)
    }
    return u.toString()
  } catch {
    return url
  }
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
  if (options.format === 'short') return generateShortSummary(setlist, options)
  const { bandName, includeLinks = true, includeProgress = false, includeNotes = true } = options
  const lines: string[] = []

  lines.push(`${KIND_LABEL[setlist.kind]} | ${setlist.name}`)
  if (bandName) lines.push(`🎶 วง ${bandName}`)
  if (setlist.eventDate) lines.push(`📅 ${formatThaiDate(setlist.eventDate, setlist.eventTime)}`)
  if (setlist.venue) lines.push(`📍 ${shareUrl(setlist.venue)}`)
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
      if (song.youtubeUrl) lines.push(`   ▶️ ${shareUrl(song.youtubeUrl)}`)
      if (song.chordUrl) lines.push(`   📄 ${shareUrl(song.chordUrl)}`)
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

/**
 * Sectioned summary with one playlist link and no per-song links. Songs get the title on
 * one line and the artist under it; if that runs past the IG limit, one line per song.
 */
function generateShortSummary(setlist: SetlistDetail, options: LineSummaryOptions): string {
  const stacked = buildShortSummary(setlist, options, true)
  return stacked.length <= SHORT_SUMMARY_LIMIT
    ? stacked
    : buildShortSummary(setlist, options, false)
}

function buildShortSummary(
  setlist: SetlistDetail,
  { bandName, includeProgress = false }: LineSummaryOptions,
  stacked: boolean
): string {
  const lines: string[] = []

  // ── Event ──
  lines.push(`${KIND_LABEL[setlist.kind]} | ${setlist.name}${bandName ? ` | 🎶 ${bandName}` : ''}`)
  if (setlist.eventDate) lines.push(`📅 ${formatThaiDate(setlist.eventDate, setlist.eventTime)}`)
  if (setlist.venue) lines.push(`📍 ${shareUrl(setlist.venue)}`)

  // ── Songs ──
  lines.push(
    '',
    DIVIDER,
    `🎵 ${setlist.items.length} เพลง` +
      (setlist.totalSec > 0 ? ` · ~${formatTotal(setlist.totalSec)}` : ''),
    DIVIDER
  )
  setlist.items.forEach((item, i) => {
    const { song } = item
    const key = item.keyOverride || song.key
    const keyText = key
      ? ` 🎼${key}${item.keyOverride && song.key && item.keyOverride !== song.key ? ` (เดิม ${song.key})` : ''}`
      : ''
    const notReady = includeProgress
      ? item.progress.filter((p) => p.status !== 'ready').map((p) => p.member.name)
      : []
    const waiting = notReady.length ? ` ⏳${notReady.join(', ')}` : ''
    const no = `${String(i + 1).padStart(2, '0')}.`

    if (stacked) {
      lines.push(`${no} ${song.title}${keyText}`)
      if (song.artist || waiting) lines.push(`      ${song.artist}${waiting}`)
    } else {
      lines.push(`${no} ${song.title}${song.artist ? ` – ${song.artist}` : ''}${keyText}${waiting}`)
    }
  })

  // ── Listen / progress ──
  const playlist = buildYouTubePlaylist(setlist.items.map((it) => it.song))
  if (playlist || includeProgress) lines.push(DIVIDER)
  if (includeProgress) {
    const ready = setlist.items.filter(isItemReady).length
    lines.push(`📊 พร้อมแล้ว ${ready}/${setlist.items.length} เพลง`)
  }
  if (playlist) lines.push(`📺 ฟังทั้งเซ็ตตามลำดับ (${playlist.videoCount} เพลง)`, playlist.url)
  return lines.join('\n')
}

/** Opens LINE's "choose a chat" screen with the text pre-filled. */
export function lineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`
}
