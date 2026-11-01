// YouTube's anonymous playlist endpoint accepts at most 50 video ids.
export const YOUTUBE_PLAYLIST_LIMIT = 50

const VIDEO_ID = /^[\w-]{11}$/

/** Extracts the video id from watch, youtu.be, shorts, embed and live URLs. */
export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null
  let id: string | null = null
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1)
    } else if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else id = /^\/(?:shorts|embed|live)\/([\w-]+)/.exec(u.pathname)?.[1] ?? null
    }
  } catch {
    return null
  }
  return id && VIDEO_ID.test(id) ? id : null
}

export interface YouTubePlaylist {
  /** Opens youtube.com with every video queued in setlist order. */
  url: string
  videoCount: number
  /** Songs skipped because they have no (valid) YouTube link. */
  missingCount: number
  /** True when there are more than YOUTUBE_PLAYLIST_LIMIT videos. */
  truncated: boolean
}

/**
 * Builds a play-in-order YouTube playlist from songs' links, without a Google account or
 * API key. `watch_videos` is an unofficial but long-standing YouTube endpoint that creates
 * a temporary playlist each time the link is opened.
 */
export function buildYouTubePlaylist(
  songs: { youtubeUrl?: string | null }[]
): YouTubePlaylist | null {
  const ids = songs.map((s) => getYouTubeId(s.youtubeUrl)).filter((id): id is string => !!id)
  if (ids.length === 0) return null
  const used = ids.slice(0, YOUTUBE_PLAYLIST_LIMIT)
  return {
    url: `https://www.youtube.com/watch_videos?video_ids=${used.join(',')}`,
    videoCount: used.length,
    missingCount: songs.length - ids.length,
    truncated: ids.length > used.length
  }
}
