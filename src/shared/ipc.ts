import type {
  Band,
  BandSummary,
  InstrumentNoteInput,
  MemberInput,
  PracticeStatus,
  SetlistDetail,
  SetlistInput,
  SetlistItemInput,
  SetlistSummary,
  Song,
  SongInput,
  SongQuery,
  StemsState,
  StemsTools
} from './types'

/**
 * Everything the renderer can ask the main process to do.
 * The preload exposes exactly this object as `window.setlistic`, and the main process
 * must implement every method (enforced by the `IpcHandlers` type below).
 */
export interface SetlisticApi {
  bands: {
    list(): Promise<BandSummary[]>
    get(id: number): Promise<Band>
    create(name: string): Promise<Band>
    rename(id: number, name: string): Promise<Band>
    /** Deletes the band with all its songs and setlists. */
    remove(id: number): Promise<void>
    addMember(bandId: number, input: MemberInput): Promise<Band>
    updateMember(memberId: number, input: MemberInput): Promise<Band>
    removeMember(memberId: number): Promise<Band>
  }
  songs: {
    list(bandId: number, query?: SongQuery): Promise<Song[]>
    get(id: number): Promise<Song>
    create(bandId: number, input: SongInput): Promise<Song>
    update(id: number, input: SongInput): Promise<Song>
    remove(id: number): Promise<void>
    addNote(songId: number, input: InstrumentNoteInput): Promise<Song>
    updateNote(noteId: number, input: InstrumentNoteInput): Promise<Song>
    removeNote(noteId: number): Promise<Song>
  }
  setlists: {
    list(bandId: number): Promise<SetlistSummary[]>
    get(id: number): Promise<SetlistDetail>
    create(bandId: number, input: SetlistInput): Promise<SetlistDetail>
    update(id: number, input: SetlistInput): Promise<SetlistDetail>
    remove(id: number): Promise<void>
    addSong(setlistId: number, songId: number): Promise<SetlistDetail>
    updateItem(itemId: number, input: SetlistItemInput): Promise<SetlistDetail>
    removeItem(itemId: number): Promise<SetlistDetail>
    /** Pass every item id of the setlist in the new order. */
    reorder(setlistId: number, itemIds: number[]): Promise<SetlistDetail>
    setProgress(itemId: number, memberId: number, status: PracticeStatus): Promise<SetlistDetail>
    setPlayed(itemId: number, played: boolean): Promise<SetlistDetail>
  }
  stems: {
    /** Checks that Python, yt-dlp, Demucs and ffmpeg are installed. */
    tools(): Promise<StemsTools>
    get(songId: number): Promise<StemsState>
    /** Starts splitting the song's YouTube audio; poll `get` for progress. */
    process(songId: number): Promise<StemsState>
    /** Stops a running job, or dismisses a failed one. */
    cancel(songId: number): Promise<void>
    remove(songId: number): Promise<void>
  }
  system: {
    /** Clipboard lives in the main process; the sandboxed renderer can't reach it reliably. */
    copyText(text: string): Promise<void>
    /** Opens an http(s) link in the system browser. */
    openExternal(url: string): Promise<void>
  }
}

type Namespace = keyof SetlisticApi

/** Runtime list of methods, checked against SetlisticApi so the two can't drift apart. */
export const API_METHODS = {
  bands: {
    list: true,
    get: true,
    create: true,
    rename: true,
    remove: true,
    addMember: true,
    updateMember: true,
    removeMember: true
  },
  songs: {
    list: true,
    get: true,
    create: true,
    update: true,
    remove: true,
    addNote: true,
    updateNote: true,
    removeNote: true
  },
  setlists: {
    list: true,
    get: true,
    create: true,
    update: true,
    remove: true,
    addSong: true,
    updateItem: true,
    removeItem: true,
    reorder: true,
    setProgress: true,
    setPlayed: true
  },
  stems: { tools: true, get: true, process: true, cancel: true, remove: true },
  system: { copyText: true, openExternal: true }
} as const satisfies { [N in Namespace]: { [M in keyof SetlisticApi[N]]: true } }

export function channelName(ns: string, method: string): string {
  return `setlistic:${ns}.${method}`
}

/**
 * Main-process implementation of the API. Arguments arrive from the renderer as `unknown`
 * and must be validated by the handler before use.
 */
export type IpcHandlers = {
  [N in Namespace]: {
    [M in keyof SetlisticApi[N]]: SetlisticApi[N][M] extends (...args: infer A) => Promise<infer R>
      ? (...args: { [I in keyof A]: unknown }) => R | Promise<R>
      : never
  }
}

/**
 * Errors thrown in ipcMain.handle reach the renderer with Electron's prefix and lose their
 * type, so handlers return this envelope and the preload turns failures back into Errors.
 */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
