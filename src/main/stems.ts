import { spawn, type ChildProcess } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { protocol } from 'electron'
import { STEM_NAMES, type StemName, type StemsState, type StemsTools } from '@shared/types'
import separateScript from '../../resources/stems/separate.py?asset'

/**
 * Splits a song's YouTube audio into 6 stems, entirely on this computer:
 * yt-dlp downloads the audio (ffmpeg converts it to 44.1 kHz WAV), then Demucs
 * (htdemucs_6s) separates it. Files live in <userData>/stems/<songId>/<stem>.flac and
 * reach the renderer through the `stems://` protocol.
 *
 * Needs Python with `yt-dlp demucs soundfile` and ffmpeg (on PATH, or where winget puts it).
 * Set SETLISTIC_PYTHON to use a specific interpreter (e.g. a venv).
 */

export const STEMS_SCHEME = 'stems'

/** Must run before app `ready`. */
export function registerStemsScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: STEMS_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
    }
  ])
}

const PYTHON =
  process.env['SETLISTIC_PYTHON'] || (process.platform === 'win32' ? 'python' : 'python3')
const SOURCE_FILE = 'source.json'

interface Job {
  state: StemsState
  child: ChildProcess | null
  cancelled: boolean
}

export interface StemsService {
  tools(): Promise<StemsTools>
  get(songId: number): Promise<StemsState>
  process(songId: number, youtubeUrl: string): Promise<StemsState>
  cancel(songId: number): void
  remove(songId: number): Promise<void>
  /** Kills running jobs; call when the app quits. */
  shutdown(): void
}

export function createStemsService(root: string): StemsService {
  const jobs = new Map<number, Job>()
  let toolsOk = false // Cached once everything is found; missing tools are re-checked
  /** ffmpeg.exe found outside PATH, handed to yt-dlp with --ffmpeg-location. */
  let ffmpegPath: string | null = null

  const dirOf = (songId: number): string => join(root, String(songId))

  // stems://songs/<songId>/<stem>.flac → the file; nothing else is served.
  // The id is in the path, not the host: as a standard scheme, a numeric host such as
  // "12" gets normalised to the IP "0.0.0.12".
  protocol.handle(STEMS_SCHEME, async (request) => {
    const url = new URL(request.url)
    const match = /^\/(\d+)\/([a-z]+)\.flac$/.exec(url.pathname)
    const songId = Number(match?.[1])
    const name = match?.[2] as StemName | undefined
    if (!Number.isInteger(songId) || songId <= 0 || !name || !STEM_NAMES.includes(name)) {
      return new Response('Not found', { status: 404 })
    }
    try {
      const data = await readFile(join(dirOf(songId), `${name}.flac`))
      return new Response(data, {
        headers: { 'content-type': 'audio/flac', 'access-control-allow-origin': '*' }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  async function readyState(songId: number): Promise<StemsState> {
    const dir = dirOf(songId)
    const files = existsSync(dir) ? await readdir(dir) : []
    const complete = STEM_NAMES.every((n) => files.includes(`${n}.flac`))
    if (!complete) {
      return { status: 'none', phase: null, progress: 0, error: null, sourceUrl: null, stems: [] }
    }
    let sourceUrl: string | null = null
    try {
      sourceUrl = JSON.parse(await readFile(join(dir, SOURCE_FILE), 'utf8')).url ?? null
    } catch {
      // Older or hand-made folder; fine
    }
    // Cache-buster so a re-processed song isn't served from the old fetch cache
    const version = (await stat(join(dir, 'vocals.flac'))).mtimeMs.toFixed(0)
    return {
      status: 'ready',
      phase: null,
      progress: 1,
      error: null,
      sourceUrl,
      stems: STEM_NAMES.map((name) => ({
        name,
        url: `${STEMS_SCHEME}://songs/${songId}/${name}.flac?v=${version}`
      }))
    }
  }

  /** Runs a command, feeding each output line (split on \r too, for progress bars) to onLine. */
  function run(
    job: Job,
    cmd: string,
    args: string[],
    onLine: (line: string) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        windowsHide: true,
        env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' }
      })
      job.child = child
      const tail: string[] = []
      const feed = (chunk: Buffer): void => {
        for (const line of chunk.toString('utf8').split(/[\r\n]+/)) {
          if (!line.trim()) continue
          tail.push(line)
          if (tail.length > 15) tail.shift()
          onLine(line)
        }
      }
      child.stdout.on('data', feed)
      child.stderr.on('data', feed)
      child.on('error', reject)
      child.on('close', (code) => {
        job.child = null
        if (job.cancelled) reject(new Error('ยกเลิกแล้ว'))
        else if (code === 0) resolve()
        else reject(new Error(lastError(tail) || `${cmd} หยุดทำงาน (code ${code})`))
      })
    })
  }

  async function runJob(songId: number, youtubeUrl: string, job: Job): Promise<void> {
    const dir = dirOf(songId)
    const work = join(dir, 'work')
    await rm(work, { recursive: true, force: true })
    await mkdir(work, { recursive: true })
    const set = (patch: Partial<StemsState>): void => {
      job.state = { ...job.state, ...patch }
    }

    try {
      set({ phase: 'download', progress: 0 })
      await run(
        job,
        PYTHON,
        [
          '-m',
          'yt_dlp',
          '--no-playlist',
          ...(ffmpegPath ? ['--ffmpeg-location', ffmpegPath] : []),
          '--newline',
          '-f',
          'bestaudio/best',
          '-x',
          '--audio-format',
          'wav',
          '--postprocessor-args',
          'ExtractAudio+ffmpeg_o:-ar 44100 -ac 2',
          '-o',
          join(work, 'source.%(ext)s'),
          '--',
          youtubeUrl
        ],
        (line) => {
          const m = /\[download\]\s+([\d.]+)%/.exec(line)
          if (m) set({ progress: Number(m[1]) / 100 })
        }
      )

      set({ phase: 'separate', progress: 0 })
      let saved = 0
      await run(job, PYTHON, [separateScript, join(work, 'source.wav'), work], (line) => {
        const m = /(\d+)%\|/.exec(line)
        if (m) set({ progress: (Number(m[1]) / 100) * 0.95 })
        if (line.startsWith('SAVED ')) set({ progress: 0.95 + (++saved / 6) * 0.05 })
      })

      // Swap the new stems in only once all six exist
      for (const name of STEM_NAMES) {
        await rename(join(work, `${name}.flac`), join(dir, `${name}.flac`))
      }
      await writeFile(join(dir, SOURCE_FILE), JSON.stringify({ url: youtubeUrl }))
      await rm(work, { recursive: true, force: true })
      jobs.delete(songId)
    } catch (err) {
      await rm(work, { recursive: true, force: true }).catch(() => {})
      if (job.cancelled) {
        jobs.delete(songId)
        return
      }
      set({ status: 'error', phase: null, error: (err as Error).message })
    }
  }

  function kill(job: Job): void {
    job.cancelled = true
    const pid = job.child?.pid
    if (!pid) return
    // yt-dlp starts ffmpeg; take the whole tree down
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
    } else {
      job.child?.kill('SIGTERM')
    }
  }

  return {
    async tools() {
      if (toolsOk) return { ready: true, missing: [] }
      const missing: string[] = []
      const modules = await probe(PYTHON, [
        '-c',
        "import importlib.util as u; print(','.join(m for m in ['yt_dlp','demucs','soundfile','torch'] if u.find_spec(m) is None))"
      ])
      if (modules === null) missing.push(`Python (${PYTHON})`)
      else if (modules.trim()) missing.push(...modules.trim().split(',').map(moduleLabel))
      if ((await probe('ffmpeg', ['-version'])) === null) {
        ffmpegPath = findWingetFfmpeg()
        if (!ffmpegPath || (await probe(ffmpegPath, ['-version'])) === null) missing.push('ffmpeg')
      }
      toolsOk = missing.length === 0
      return { ready: toolsOk, missing }
    },

    async get(songId) {
      return jobs.get(songId)?.state ?? readyState(songId)
    },

    async process(songId, youtubeUrl) {
      const running = jobs.get(songId)
      if (running?.state.status === 'running') return running.state
      const previous = await readyState(songId)
      const job: Job = {
        state: { ...previous, status: 'running', phase: 'download', progress: 0, error: null },
        child: null,
        cancelled: false
      }
      jobs.set(songId, job)
      void runJob(songId, youtubeUrl, job)
      return job.state
    },

    cancel(songId) {
      const job = jobs.get(songId)
      if (!job) return
      if (job.state.status === 'running') kill(job)
      else jobs.delete(songId) // Dismisses an error
    },

    async remove(songId) {
      const job = jobs.get(songId)
      if (job) kill(job)
      jobs.delete(songId)
      await rm(dirOf(songId), { recursive: true, force: true })
    },

    shutdown() {
      for (const job of jobs.values()) kill(job)
    }
  }
}

/** Runs a command and returns its stdout, or null if it can't start or fails. */
function probe(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let out = ''
    const child = spawn(cmd, args, { windowsHide: true })
    child.stdout.on('data', (d: Buffer) => (out += d.toString()))
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 ? out : null))
  })
}

/**
 * winget adds ffmpeg to PATH, but apps already running (or started from an old terminal)
 * don't see the new PATH until restarted, so look in winget's package folder too.
 */
function findWingetFfmpeg(): string | null {
  const local = process.env['LOCALAPPDATA']
  if (process.platform !== 'win32' || !local) return null
  const links = join(local, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe')
  if (existsSync(links)) return links
  const packages = join(local, 'Microsoft', 'WinGet', 'Packages')
  try {
    for (const pkg of readdirSync(packages).filter((d) => /ffmpeg/i.test(d))) {
      for (const build of readdirSync(join(packages, pkg))) {
        const exe = join(packages, pkg, build, 'bin', 'ffmpeg.exe')
        if (existsSync(exe)) return exe
      }
    }
  } catch {
    // No winget packages folder
  }
  return null
}

function moduleLabel(module: string): string {
  return module === 'yt_dlp' ? 'yt-dlp' : module === 'torch' ? 'PyTorch' : module
}

/** The most useful line from a failed tool's output. */
function lastError(lines: string[]): string {
  const error = [...lines].reverse().find((l) => /error|exception|not found/i.test(l))
  return (error ?? lines[lines.length - 1] ?? '').trim().slice(0, 300)
}
