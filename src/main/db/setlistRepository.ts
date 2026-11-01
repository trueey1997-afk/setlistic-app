import type {
  MusicalKey,
  PracticeStatus,
  SetlistDetail,
  SetlistInput,
  SetlistItem,
  SetlistItemInput,
  SetlistKind,
  SetlistSummary
} from '@shared/types'
import type { Db } from './connection'
import { NotFoundError } from './errors'
import { toSong, type SongRepository, type SongRow } from './songRepository'

interface SummaryRow {
  id: number
  band_id: number
  name: string
  kind: SetlistKind
  event_date: string | null
  event_time: string | null
  venue: string
  notes: string
  song_count: number
  total_sec: number
  unknown_duration_count: number
}

type ItemRow = SongRow & {
  item_id: number
  key_override: string | null
  item_note: string
  played: 0 | 1
}

// Duration totals are computed in SQL so the list view doesn't load every song
const SUMMARY_SELECT = `
  SELECT s.id, s.band_id, s.name, s.kind, s.event_date, s.event_time, s.venue, s.notes,
         COUNT(ss.id)                           AS song_count,
         COALESCE(SUM(so.duration_sec), 0)      AS total_sec,
         COUNT(ss.id) - COUNT(so.duration_sec)  AS unknown_duration_count
  FROM setlists s
  LEFT JOIN setlist_songs ss ON ss.setlist_id = s.id
  LEFT JOIN songs so         ON so.id = ss.song_id
`

function toSummary(row: SummaryRow): SetlistSummary {
  return {
    id: row.id,
    bandId: row.band_id,
    name: row.name,
    kind: row.kind,
    eventDate: row.event_date,
    eventTime: row.event_time,
    venue: row.venue,
    songCount: row.song_count,
    totalSec: row.total_sec,
    unknownDurationCount: row.unknown_duration_count
  }
}

export interface SetlistRepository {
  list(bandId: number): SetlistSummary[]
  get(id: number): SetlistDetail
  create(bandId: number, input: SetlistInput): SetlistDetail
  update(id: number, input: SetlistInput): SetlistDetail
  remove(id: number): void
  addSong(setlistId: number, songId: number): SetlistDetail
  updateItem(itemId: number, input: SetlistItemInput): SetlistDetail
  removeItem(itemId: number): SetlistDetail
  /** `itemIds` must contain every item of the setlist exactly once, in the new order. */
  reorder(setlistId: number, itemIds: number[]): SetlistDetail
  setProgress(itemId: number, memberId: number, status: PracticeStatus): SetlistDetail
  setPlayed(itemId: number, played: boolean): SetlistDetail
}

export function createSetlistRepository(db: Db, songs: SongRepository): SetlistRepository {
  const listOfBand = db.prepare<[number], SummaryRow>(
    `${SUMMARY_SELECT} WHERE s.band_id = ? GROUP BY s.id
     ORDER BY s.event_date IS NULL, s.event_date DESC, s.event_time DESC, s.id DESC`
  )
  const summaryById = db.prepare<[number], SummaryRow>(
    `${SUMMARY_SELECT} WHERE s.id = ? GROUP BY s.id`
  )
  const itemsOf = db.prepare<[number], ItemRow>(`
    SELECT ss.id AS item_id, ss.key_override, ss.note AS item_note, ss.played, so.*
    FROM setlist_songs ss JOIN songs so ON so.id = ss.song_id
    WHERE ss.setlist_id = ?
    ORDER BY ss.position
  `)
  const membersOf = db.prepare<[number], { id: number; name: string }>(
    'SELECT id, name FROM members WHERE band_id = ? ORDER BY id'
  )
  const progressOf = db.prepare<
    [number],
    { item_id: number; member_id: number; status: PracticeStatus }
  >(`
    SELECT p.item_id, p.member_id, p.status FROM practice_progress p
    JOIN setlist_songs ss ON ss.id = p.item_id WHERE ss.setlist_id = ?
  `)
  const insert = db.prepare(`
    INSERT INTO setlists (band_id, name, kind, event_date, event_time, venue, notes)
    VALUES (@bandId, @name, @kind, @eventDate, @eventTime, @venue, @notes)
  `)
  const update = db.prepare(`
    UPDATE setlists SET name = @name, kind = @kind, event_date = @eventDate, event_time = @eventTime,
      venue = @venue, notes = @notes, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `)
  const remove = db.prepare<[number]>('DELETE FROM setlists WHERE id = ?')
  const bandExists = db.prepare<[number], { id: number }>('SELECT id FROM bands WHERE id = ?')
  const songBand = db.prepare<[number], { band_id: number }>(
    'SELECT band_id FROM songs WHERE id = ?'
  )
  const memberBand = db.prepare<[number], { band_id: number }>(
    'SELECT band_id FROM members WHERE id = ?'
  )
  const itemById = db.prepare<[number], { id: number; setlist_id: number; band_id: number }>(`
    SELECT ss.id, ss.setlist_id, s.band_id FROM setlist_songs ss
    JOIN setlists s ON s.id = ss.setlist_id WHERE ss.id = ?
  `)
  const nextPosition = db.prepare<[number], { next: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM setlist_songs WHERE setlist_id = ?'
  )
  const insertItem = db.prepare<[number, number, number]>(
    'INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)'
  )
  const updateItem = db.prepare<[string | null, string, number]>(
    'UPDATE setlist_songs SET key_override = ?, note = ? WHERE id = ?'
  )
  const updatePlayed = db.prepare<[number, number]>(
    'UPDATE setlist_songs SET played = ? WHERE id = ?'
  )
  const deleteItem = db.prepare<[number]>('DELETE FROM setlist_songs WHERE id = ?')
  const itemIdsOf = db.prepare<[number], { id: number }>(
    'SELECT id FROM setlist_songs WHERE setlist_id = ? ORDER BY position'
  )
  const setPosition = db.prepare<[number, number]>(
    'UPDATE setlist_songs SET position = ? WHERE id = ?'
  )
  const upsertProgress = db.prepare<[number, number, PracticeStatus]>(`
    INSERT INTO practice_progress (item_id, member_id, status) VALUES (?, ?, ?)
    ON CONFLICT (item_id, member_id) DO UPDATE SET
      status = excluded.status, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `)

  function get(id: number): SetlistDetail {
    const row = summaryById.get(id)
    if (!row) throw new NotFoundError('ไม่พบเซ็ตลิสต์นี้')

    const rows = itemsOf.all(id)
    const notes = songs.notesFor([...new Set(rows.map((r) => r.id))])
    const members = membersOf.all(row.band_id)
    const progress = new Map(
      progressOf.all(id).map((p) => [`${p.item_id}:${p.member_id}`, p.status])
    )

    const items: SetlistItem[] = rows.map((r) => ({
      id: r.item_id,
      keyOverride: r.key_override as MusicalKey | null,
      note: r.item_note,
      played: r.played === 1,
      song: toSong(r, notes.get(r.id)),
      // Every current member appears; no row yet means they haven't started
      progress: members.map((m) => ({
        member: m,
        status: progress.get(`${r.item_id}:${m.id}`) ?? 'not_started'
      }))
    }))
    return { ...toSummary(row), notes: row.notes, items }
  }

  function item(itemId: number): { id: number; setlist_id: number; band_id: number } {
    const it = itemById.get(itemId)
    if (!it) throw new NotFoundError('ไม่พบเพลงนี้ในเซ็ตลิสต์')
    return it
  }

  /**
   * Writes positions 0..n-1 in the given order. Positions are UNIQUE per setlist, so rows
   * are first moved to negative positions to avoid collisions mid-update.
   */
  const writeOrder = db.transaction((itemIds: number[]) => {
    itemIds.forEach((itemId, i) => setPosition.run(-(i + 1), itemId))
    itemIds.forEach((itemId, i) => setPosition.run(i, itemId))
  })

  return {
    list: (bandId) => listOfBand.all(bandId).map(toSummary),

    get,

    create(bandId, input) {
      if (!bandExists.get(bandId)) throw new NotFoundError('ไม่พบวงนี้')
      const { lastInsertRowid } = insert.run({ ...normalize(input), bandId })
      return get(Number(lastInsertRowid))
    },

    update(id, input) {
      if (update.run({ ...normalize(input), id }).changes === 0)
        throw new NotFoundError('ไม่พบเซ็ตลิสต์นี้')
      return get(id)
    },

    remove(id) {
      if (remove.run(id).changes === 0) throw new NotFoundError('ไม่พบเซ็ตลิสต์นี้')
    },

    addSong: db.transaction((setlistId: number, songId: number): SetlistDetail => {
      const setlist = get(setlistId)
      const song = songBand.get(songId)
      if (!song) throw new NotFoundError('ไม่พบเพลงนี้')
      if (song.band_id !== setlist.bandId) throw new Error('เพลงนี้ไม่ได้อยู่ในคลังของวงนี้')
      insertItem.run(setlistId, songId, nextPosition.get(setlistId)!.next)
      return get(setlistId)
    }),

    updateItem(itemId, input) {
      const it = item(itemId)
      updateItem.run(input.keyOverride, input.note.trim(), itemId)
      return get(it.setlist_id)
    },

    removeItem: db.transaction((itemId: number): SetlistDetail => {
      const it = item(itemId)
      deleteItem.run(itemId)
      // Close the gap so positions stay 0..n-1
      writeOrder(itemIdsOf.all(it.setlist_id).map((r) => r.id))
      return get(it.setlist_id)
    }),

    reorder: db.transaction((setlistId: number, itemIds: number[]): SetlistDetail => {
      const current = itemIdsOf.all(setlistId).map((r) => r.id)
      const same =
        current.length === itemIds.length &&
        new Set(itemIds).size === itemIds.length &&
        itemIds.every((id) => current.includes(id))
      if (!same) throw new Error('ลำดับเพลงไม่ตรงกับเซ็ตลิสต์ กรุณาโหลดใหม่')
      writeOrder(itemIds)
      return get(setlistId)
    }),

    setProgress(itemId, memberId, status) {
      const it = item(itemId)
      const member = memberBand.get(memberId)
      if (!member) throw new NotFoundError('ไม่พบสมาชิกคนนี้')
      if (member.band_id !== it.band_id) throw new Error('สมาชิกคนนี้ไม่ได้อยู่ในวงนี้')
      upsertProgress.run(itemId, memberId, status)
      return get(it.setlist_id)
    },

    setPlayed(itemId, played) {
      const it = item(itemId)
      updatePlayed.run(played ? 1 : 0, itemId)
      return get(it.setlist_id)
    }
  }
}

function normalize(input: SetlistInput): Record<string, string | null> {
  return {
    name: input.name.trim(),
    kind: input.kind,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    venue: input.venue.trim(),
    notes: input.notes.trim()
  }
}
