import {
  INSTRUMENTS,
  type Band,
  type BandSummary,
  type Member,
  type MemberInput
} from '@shared/types'
import type { Db } from './connection'
import { NotFoundError } from './errors'
import { parseJsonArray } from './json'

interface MemberRow {
  id: number
  band_id: number
  name: string
  instruments: string
}

function toMember(row: MemberRow): Member {
  return { id: row.id, name: row.name, instruments: parseJsonArray(row.instruments, INSTRUMENTS) }
}

export interface BandRepository {
  list(): BandSummary[]
  get(id: number): Band
  create(name: string): Band
  rename(id: number, name: string): Band
  /** Cascades to members, songs, setlists, notes and progress. */
  remove(id: number): void
  addMember(bandId: number, input: MemberInput): Band
  updateMember(memberId: number, input: MemberInput): Band
  removeMember(memberId: number): Band
  /** Band id of a member, for cross-checks in other repositories. */
  bandOfMember(memberId: number): number
}

export function createBandRepository(db: Db): BandRepository {
  const listAll = db.prepare<[], BandSummary>(`
    SELECT b.id, b.name,
           (SELECT COUNT(*) FROM members m WHERE m.band_id = b.id) AS memberCount,
           (SELECT COUNT(*) FROM songs s WHERE s.band_id = b.id)   AS songCount
    FROM bands b ORDER BY b.name COLLATE NOCASE
  `)
  const byId = db.prepare<[number], { id: number; name: string }>(
    'SELECT id, name FROM bands WHERE id = ?'
  )
  const membersOf = db.prepare<[number], MemberRow>(
    'SELECT * FROM members WHERE band_id = ? ORDER BY id'
  )
  const memberById = db.prepare<[number], MemberRow>('SELECT * FROM members WHERE id = ?')
  const insertBand = db.prepare<[string]>('INSERT INTO bands (name) VALUES (?)')
  const renameBand = db.prepare<[string, number]>(
    `UPDATE bands SET name = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`
  )
  const deleteBand = db.prepare<[number]>('DELETE FROM bands WHERE id = ?')
  const insertMember = db.prepare<[number, string, string]>(
    'INSERT INTO members (band_id, name, instruments) VALUES (?, ?, ?)'
  )
  const updateMemberRow = db.prepare<[string, string, number]>(
    'UPDATE members SET name = ?, instruments = ? WHERE id = ?'
  )
  const deleteMember = db.prepare<[number]>('DELETE FROM members WHERE id = ?')

  function get(id: number): Band {
    const band = byId.get(id)
    if (!band) throw new NotFoundError('ไม่พบวงนี้')
    return { ...band, members: membersOf.all(id).map(toMember) }
  }

  function memberRow(memberId: number): MemberRow {
    const row = memberById.get(memberId)
    if (!row) throw new NotFoundError('ไม่พบสมาชิกคนนี้')
    return row
  }

  return {
    list: () => listAll.all(),
    get,
    create(name) {
      return get(Number(insertBand.run(name.trim()).lastInsertRowid))
    },
    rename(id, name) {
      if (renameBand.run(name.trim(), id).changes === 0) throw new NotFoundError('ไม่พบวงนี้')
      return get(id)
    },
    remove(id) {
      if (deleteBand.run(id).changes === 0) throw new NotFoundError('ไม่พบวงนี้')
    },
    addMember(bandId, input) {
      get(bandId)
      insertMember.run(bandId, input.name.trim(), JSON.stringify(input.instruments))
      return get(bandId)
    },
    updateMember(memberId, input) {
      const row = memberRow(memberId)
      updateMemberRow.run(input.name.trim(), JSON.stringify(input.instruments), memberId)
      return get(row.band_id)
    },
    removeMember(memberId) {
      const row = memberRow(memberId)
      deleteMember.run(memberId)
      return get(row.band_id)
    },
    bandOfMember: (memberId) => memberRow(memberId).band_id
  }
}
