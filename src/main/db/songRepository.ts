import {
  INSTRUMENTS,
  type Instrument,
  type InstrumentNote,
  type InstrumentNoteInput,
  type MusicalKey,
  type Song,
  type SongInput,
  type SongQuery,
  type SongStatus
} from '@shared/types'
import type { Db } from './connection'
import { NotFoundError } from './errors'
import { parseJsonArray } from './json'

export interface SongRow {
  id: number
  band_id: number
  title: string
  artist: string
  musical_key: string | null
  bpm: number | null
  duration_sec: number | null
  youtube_url: string
  chord_url: string
  status: string
  tags: string
  content: string
  notes: string
  created_at: string
  updated_at: string
}

interface NoteRow {
  id: number
  song_id: number
  instrument: string
  member_id: number | null
  member_name: string | null
  note: string
  tab_url: string
  updated_at: string
}

function toNote(row: NoteRow): InstrumentNote {
  return {
    id: row.id,
    instrument: (INSTRUMENTS.includes(row.instrument as Instrument)
      ? row.instrument
      : 'other') as Instrument,
    member: row.member_id !== null ? { id: row.member_id, name: row.member_name ?? '' } : null,
    note: row.note,
    tabUrl: row.tab_url,
    updatedAt: row.updated_at
  }
}

export function toSong(row: SongRow, notes: InstrumentNote[] = []): Song {
  return {
    id: row.id,
    bandId: row.band_id,
    title: row.title,
    artist: row.artist,
    key: row.musical_key as MusicalKey | null,
    bpm: row.bpm,
    durationSec: row.duration_sec,
    youtubeUrl: row.youtube_url,
    chordUrl: row.chord_url,
    status: row.status as SongStatus,
    tags: parseJsonArray<string>(row.tags),
    content: row.content,
    notes: row.notes,
    instrumentNotes: notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** Escapes LIKE wildcards so a search for "100%" matches literally. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export interface SongRepository {
  list(bandId: number, query?: SongQuery): Song[]
  get(id: number): Song
  create(bandId: number, input: SongInput): Song
  update(id: number, input: SongInput): Song
  /** Also removes the song from every setlist (ON DELETE CASCADE). */
  remove(id: number): void
  /** `memberBandId` is the band of input.memberId, checked against the song's band. */
  addNote(songId: number, input: InstrumentNoteInput, memberBandId: number | null): Song
  updateNote(noteId: number, input: InstrumentNoteInput, memberBandId: number | null): Song
  removeNote(noteId: number): Song
  /** Loads instrument notes for many songs at once (used by setlists). */
  notesFor(songIds: number[]): Map<number, InstrumentNote[]>
}

const NOTE_SELECT = `
  SELECT n.*, m.name AS member_name FROM instrument_notes n
  LEFT JOIN members m ON m.id = n.member_id
`

export function createSongRepository(db: Db): SongRepository {
  const byId = db.prepare<[number], SongRow>('SELECT * FROM songs WHERE id = ?')
  const notesOfSong = db.prepare<[number], NoteRow>(
    `${NOTE_SELECT} WHERE n.song_id = ? ORDER BY n.id`
  )
  const noteById = db.prepare<[number], { id: number; song_id: number }>(
    'SELECT id, song_id FROM instrument_notes WHERE id = ?'
  )
  const insert = db.prepare(`
    INSERT INTO songs (band_id, title, artist, musical_key, bpm, duration_sec, youtube_url, chord_url,
                       status, tags, content, notes)
    VALUES (@bandId, @title, @artist, @key, @bpm, @durationSec, @youtubeUrl, @chordUrl,
            @status, @tags, @content, @notes)
  `)
  const update = db.prepare(`
    UPDATE songs SET
      title = @title, artist = @artist, musical_key = @key, bpm = @bpm, duration_sec = @durationSec,
      youtube_url = @youtubeUrl, chord_url = @chordUrl, status = @status, tags = @tags,
      content = @content, notes = @notes, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `)
  const remove = db.prepare<[number]>('DELETE FROM songs WHERE id = ?')
  const insertNote = db.prepare(`
    INSERT INTO instrument_notes (song_id, member_id, instrument, note, tab_url)
    VALUES (@songId, @memberId, @instrument, @note, @tabUrl)
  `)
  const updateNote = db.prepare(`
    UPDATE instrument_notes SET member_id = @memberId, instrument = @instrument, note = @note,
      tab_url = @tabUrl, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `)
  const deleteNote = db.prepare<[number]>('DELETE FROM instrument_notes WHERE id = ?')

  function row(id: number): SongRow {
    const r = byId.get(id)
    if (!r) throw new NotFoundError('ไม่พบเพลงนี้')
    return r
  }

  function get(id: number): Song {
    return toSong(row(id), notesOfSong.all(id).map(toNote))
  }

  function noteSongId(noteId: number): number {
    const note = noteById.get(noteId)
    if (!note) throw new NotFoundError('ไม่พบโน้ตนี้')
    return note.song_id
  }

  function checkMember(songId: number, memberBandId: number | null): void {
    if (memberBandId !== null && memberBandId !== row(songId).band_id) {
      throw new Error('สมาชิกคนนี้ไม่ได้อยู่ในวงของเพลงนี้')
    }
  }

  function notesFor(songIds: number[]): Map<number, InstrumentNote[]> {
    const map = new Map<number, InstrumentNote[]>()
    if (songIds.length === 0) return map
    const placeholders = songIds.map(() => '?').join(',')
    const rows = db
      .prepare<number[], NoteRow>(
        `${NOTE_SELECT} WHERE n.song_id IN (${placeholders}) ORDER BY n.id`
      )
      .all(...songIds)
    for (const r of rows) {
      const list = map.get(r.song_id) ?? []
      list.push(toNote(r))
      map.set(r.song_id, list)
    }
    return map
  }

  return {
    list(bandId, query = {}) {
      const where = ['band_id = @bandId']
      const params: Record<string, string | number> = { bandId }
      if (query.search?.trim()) {
        where.push(`(title LIKE @search ESCAPE '\\' OR artist LIKE @search ESCAPE '\\')`)
        params.search = likePattern(query.search.trim())
      }
      if (query.key) {
        where.push('musical_key = @key')
        params.key = query.key
      }
      if (query.status) {
        where.push('status = @status')
        params.status = query.status
      }
      const rows = db
        .prepare<Record<string, string | number>, SongRow>(
          `SELECT * FROM songs WHERE ${where.join(' AND ')} ORDER BY title COLLATE NOCASE`
        )
        .all(params)
      const notes = notesFor(rows.map((r) => r.id))
      return rows.map((r) => toSong(r, notes.get(r.id)))
    },

    get,

    create(bandId, input) {
      const { lastInsertRowid } = insert.run({ ...toParams(input), bandId })
      return get(Number(lastInsertRowid))
    },

    update(id, input) {
      if (update.run({ ...toParams(input), id }).changes === 0)
        throw new NotFoundError('ไม่พบเพลงนี้')
      return get(id)
    },

    remove(id) {
      if (remove.run(id).changes === 0) throw new NotFoundError('ไม่พบเพลงนี้')
    },

    addNote(songId, input, memberBandId) {
      checkMember(songId, memberBandId)
      insertNote.run({ ...input, songId })
      return get(songId)
    },

    updateNote(noteId, input, memberBandId) {
      const songId = noteSongId(noteId)
      checkMember(songId, memberBandId)
      updateNote.run({ ...input, id: noteId })
      return get(songId)
    },

    removeNote(noteId) {
      const songId = noteSongId(noteId)
      deleteNote.run(noteId)
      return get(songId)
    },

    notesFor
  }
}

function toParams(input: SongInput): Record<string, string | number | null> {
  return {
    title: input.title.trim(),
    artist: input.artist.trim(),
    key: input.key,
    bpm: input.bpm,
    durationSec: input.durationSec,
    youtubeUrl: input.youtubeUrl.trim(),
    chordUrl: input.chordUrl.trim(),
    status: input.status,
    tags: JSON.stringify(input.tags),
    content: input.content,
    notes: input.notes.trim()
  }
}
