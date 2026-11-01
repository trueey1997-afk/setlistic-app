import { clipboard, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z, ZodError } from 'zod'
import { API_METHODS, channelName, type IpcHandlers, type IpcResult } from '@shared/ipc'
import {
  INSTRUMENTS,
  MUSICAL_KEYS,
  PRACTICE_STATUSES,
  SETLIST_KINDS,
  SONG_STATUSES
} from '@shared/types'
import type { BandRepository } from './db/bandRepository'
import type { SongRepository } from './db/songRepository'
import type { SetlistRepository } from './db/setlistRepository'
import { NotFoundError } from './db/errors'

// ── Validation: the renderer is treated as untrusted input ──

const id = z.number().int().positive()
const text = (max: number): z.ZodString => z.string().max(max)
const name = (message: string): z.ZodString => z.string().trim().min(1, message).max(120)
// Links are opened in the browser, so only http(s); empty string means "no link"
const link = z.union([
  z.literal(''),
  z.url({ protocol: /^https?$/, message: 'ลิงก์ต้องขึ้นต้นด้วย http(s)://' })
])

const memberInput = z.object({
  name: name('กรุณาใส่ชื่อสมาชิก'),
  instruments: z.array(z.enum(INSTRUMENTS)).max(INSTRUMENTS.length)
})

const songInput = z.object({
  title: z.string().trim().min(1, 'กรุณาใส่ชื่อเพลง').max(200),
  artist: text(200),
  key: z.enum(MUSICAL_KEYS).nullable(),
  bpm: z.number().int().min(20).max(400).nullable(),
  durationSec: z.number().int().min(0).max(86_400).nullable(),
  youtubeUrl: link,
  chordUrl: link,
  status: z.enum(SONG_STATUSES),
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
  content: text(50_000),
  notes: text(5_000)
})

const songQuery = z
  .object({
    search: text(200).optional(),
    key: z.enum(MUSICAL_KEYS).optional(),
    status: z.enum(SONG_STATUSES).optional()
  })
  .optional()

const noteInput = z
  .object({
    memberId: id.nullable(),
    instrument: z.enum(INSTRUMENTS),
    note: text(1_000),
    tabUrl: link
  })
  .refine((v) => v.note.trim() || v.tabUrl, { message: 'ใส่โน้ตหรือลิงก์ Tab อย่างน้อยหนึ่งอย่าง' })

const setlistInput = z.object({
  name: name('กรุณาใส่ชื่อเซ็ตลิสต์'),
  kind: z.enum(SETLIST_KINDS),
  eventDate: z.iso.date().nullable(),
  eventTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'เวลาไม่ถูกต้อง')
    .nullable(),
  venue: text(200),
  notes: text(5_000)
})

const itemInput = z.object({
  keyOverride: z.enum(MUSICAL_KEYS).nullable(),
  note: text(500)
})

// ── Handlers ──

export function createHandlers(
  bands: BandRepository,
  songs: SongRepository,
  setlists: SetlistRepository
): IpcHandlers {
  const memberBand = (memberId: number | null): number | null =>
    memberId === null ? null : bands.bandOfMember(memberId)

  return {
    bands: {
      list: () => bands.list(),
      get: (bandId) => bands.get(id.parse(bandId)),
      create: (bandName) => bands.create(name('กรุณาใส่ชื่อวง').parse(bandName)),
      rename: (bandId, bandName) =>
        bands.rename(id.parse(bandId), name('กรุณาใส่ชื่อวง').parse(bandName)),
      remove: (bandId) => bands.remove(id.parse(bandId)),
      addMember: (bandId, input) => bands.addMember(id.parse(bandId), memberInput.parse(input)),
      updateMember: (memberId, input) =>
        bands.updateMember(id.parse(memberId), memberInput.parse(input)),
      removeMember: (memberId) => bands.removeMember(id.parse(memberId))
    },
    songs: {
      list: (bandId, query) => songs.list(id.parse(bandId), songQuery.parse(query)),
      get: (songId) => songs.get(id.parse(songId)),
      create: (bandId, input) => songs.create(id.parse(bandId), songInput.parse(input)),
      update: (songId, input) => songs.update(id.parse(songId), songInput.parse(input)),
      remove: (songId) => songs.remove(id.parse(songId)),
      addNote: (songId, input) => {
        const note = noteInput.parse(input)
        return songs.addNote(id.parse(songId), note, memberBand(note.memberId))
      },
      updateNote: (noteId, input) => {
        const note = noteInput.parse(input)
        return songs.updateNote(id.parse(noteId), note, memberBand(note.memberId))
      },
      removeNote: (noteId) => songs.removeNote(id.parse(noteId))
    },
    setlists: {
      list: (bandId) => setlists.list(id.parse(bandId)),
      get: (setlistId) => setlists.get(id.parse(setlistId)),
      create: (bandId, input) => setlists.create(id.parse(bandId), setlistInput.parse(input)),
      update: (setlistId, input) => setlists.update(id.parse(setlistId), setlistInput.parse(input)),
      remove: (setlistId) => setlists.remove(id.parse(setlistId)),
      addSong: (setlistId, songId) => setlists.addSong(id.parse(setlistId), id.parse(songId)),
      updateItem: (itemId, input) => setlists.updateItem(id.parse(itemId), itemInput.parse(input)),
      removeItem: (itemId) => setlists.removeItem(id.parse(itemId)),
      reorder: (setlistId, itemIds) =>
        setlists.reorder(id.parse(setlistId), z.array(id).max(500).parse(itemIds)),
      setProgress: (itemId, memberId, status) =>
        setlists.setProgress(
          id.parse(itemId),
          id.parse(memberId),
          z.enum(PRACTICE_STATUSES).parse(status)
        ),
      setPlayed: (itemId, played) => setlists.setPlayed(id.parse(itemId), z.boolean().parse(played))
    },
    system: {
      copyText: (value) => clipboard.writeText(text(100_000).parse(value)),
      openExternal: async (url) => {
        const parsed = z.url({ protocol: /^https$/ }).parse(url)
        await shell.openExternal(parsed)
      }
    }
  }
}

/**
 * Registers one ipcMain.handle per API method. `isTrustedSender` rejects calls from any
 * frame that isn't our own UI.
 */
export function registerIpc(
  handlers: IpcHandlers,
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean
): void {
  for (const [ns, methods] of Object.entries(API_METHODS)) {
    for (const method of Object.keys(methods)) {
      const fn = (handlers as Record<string, Record<string, (...args: unknown[]) => unknown>>)[ns][
        method
      ]
      ipcMain.handle(
        channelName(ns, method),
        async (event, ...args): Promise<IpcResult<unknown>> => {
          if (!isTrustedSender(event)) return { ok: false, error: 'Untrusted sender' }
          try {
            return { ok: true, data: await fn(...args) }
          } catch (err) {
            return { ok: false, error: toUserMessage(err, `${ns}.${method}`) }
          }
        }
      )
    }
  }
}

function toUserMessage(err: unknown, where: string): string {
  if (err instanceof ZodError) return err.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง'
  if (err instanceof NotFoundError) return err.message
  console.error(`[ipc ${where}]`, err)
  return err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
}
