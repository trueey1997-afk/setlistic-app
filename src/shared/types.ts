// Data shapes shared by the main process (SQLite) and the renderer (React).

// prettier-ignore
export const MUSICAL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm'
] as const
export type MusicalKey = (typeof MUSICAL_KEYS)[number]

export const INSTRUMENTS = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'other'] as const
export type Instrument = (typeof INSTRUMENTS)[number]
export const INSTRUMENT_LABEL: Record<Instrument, string> = {
  vocal: 'Vocal',
  guitar: 'Guitar',
  bass: 'Bass',
  drums: 'Drums',
  keys: 'Keys',
  other: 'อื่นๆ'
}

export const SONG_STATUSES = ['ready', 'learning', 'idea'] as const
export type SongStatus = (typeof SONG_STATUSES)[number]
export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  ready: 'พร้อมเล่น',
  learning: 'กำลังแกะ',
  idea: 'ไอเดีย'
}

export const PRACTICE_STATUSES = ['not_started', 'practicing', 'ready'] as const
export type PracticeStatus = (typeof PRACTICE_STATUSES)[number]
export const PRACTICE_STATUS_LABEL: Record<PracticeStatus, string> = {
  not_started: 'ยังไม่เริ่ม',
  practicing: 'กำลังซ้อม',
  ready: 'ซ้อมแล้ว'
}

export const SETLIST_KINDS = ['gig', 'rehearsal'] as const
export type SetlistKind = (typeof SETLIST_KINDS)[number]
export const SETLIST_KIND_LABEL: Record<SetlistKind, string> = {
  gig: 'งานโชว์',
  rehearsal: 'นัดซ้อม'
}

// ── Bands ──

export interface Member {
  id: number
  name: string
  instruments: Instrument[]
}

export interface MemberInput {
  name: string
  instruments: Instrument[]
}

export interface BandSummary {
  id: number
  name: string
  memberCount: number
  songCount: number
}

export interface Band {
  id: number
  name: string
  members: Member[]
}

// ── Songs ──

export interface InstrumentNote {
  id: number
  instrument: Instrument
  /** Null when the member was removed from the band. */
  member: { id: number; name: string } | null
  note: string
  tabUrl: string
  updatedAt: string
}

export interface InstrumentNoteInput {
  memberId: number | null
  instrument: Instrument
  note: string
  tabUrl: string
}

export interface Song {
  id: number
  bandId: number
  title: string
  artist: string
  key: MusicalKey | null
  bpm: number | null
  durationSec: number | null
  youtubeUrl: string
  chordUrl: string
  status: SongStatus
  tags: string[]
  /** Lyrics and chords, plain text (monospace in the UI so chords line up). */
  content: string
  notes: string
  instrumentNotes: InstrumentNote[]
  createdAt: string
  updatedAt: string
}

export type SongInput = Omit<Song, 'id' | 'bandId' | 'instrumentNotes' | 'createdAt' | 'updatedAt'>

export interface SongQuery {
  /** Matches title or artist. */
  search?: string
  key?: MusicalKey
  status?: SongStatus
}

// ── Setlists ──

export interface SetlistSummary {
  id: number
  bandId: number
  name: string
  kind: SetlistKind
  /** YYYY-MM-DD, or null when not scheduled. */
  eventDate: string | null
  /** HH:MM, or null. */
  eventTime: string | null
  venue: string
  songCount: number
  /** Sum of known song durations. */
  totalSec: number
  /** Songs without a duration, so the UI can show the total as an estimate. */
  unknownDurationCount: number
}

export interface PracticeProgress {
  member: { id: number; name: string }
  status: PracticeStatus
}

/** Items come back in play order; array index is the position. */
export interface SetlistItem {
  /** Row id in setlist_songs, so the same song can appear twice. */
  id: number
  keyOverride: MusicalKey | null
  note: string
  /** Ticked off during the show. */
  played: boolean
  song: Song
  /** One entry per current band member; members who never ticked are 'not_started'. */
  progress: PracticeProgress[]
}

export interface SetlistDetail extends SetlistSummary {
  notes: string
  items: SetlistItem[]
}

export interface SetlistInput {
  name: string
  kind: SetlistKind
  eventDate: string | null
  eventTime: string | null
  venue: string
  notes: string
}

export interface SetlistItemInput {
  keyOverride: MusicalKey | null
  note: string
}
