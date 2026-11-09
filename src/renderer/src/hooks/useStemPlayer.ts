import { useCallback, useEffect, useRef, useState } from 'react'
import { STEM_NAMES, type StemName } from '@shared/types'

export interface StemMix {
  /** 0–1 */
  volume: number
  muted: boolean
  solo: boolean
}

const DEFAULT_MIX = Object.fromEntries(
  STEM_NAMES.map((n) => [n, { volume: 1, muted: false, solo: false }])
) as Record<StemName, StemMix>

/**
 * Plays several stems in perfect sync with Web Audio: every stem is decoded into memory and
 * started on the same AudioContext clock, each through its own gain (volume / mute / solo).
 * Stems load on the first play. Remount (change `key`) when the stem files change.
 */
export function useStemPlayer(stems: { name: StemName; url: string }[]): {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  loadedCount: number
  playing: boolean
  position: number
  duration: number
  mix: Record<StemName, StemMix>
  play: () => Promise<void>
  pause: () => void
  seek: (seconds: number) => void
  setMix: (name: StemName, patch: Partial<StemMix>) => void
} {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [mix, setMixState] = useState(DEFAULT_MIX)

  const ctxRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<{ name: StemName; buffer: AudioBuffer; gain: GainNode }[]>([])
  const sourcesRef = useRef<AudioBufferSourceNode[]>([])
  /** Context time when playback started, and the song position it started from. */
  const clockRef = useRef({ startedAt: 0, offset: 0 })
  const positionRef = useRef(0)

  const stopSources = useCallback(() => {
    for (const s of sourcesRef.current) {
      try {
        s.stop()
      } catch {
        // Already stopped
      }
      s.disconnect()
    }
    sourcesRef.current = []
  }, [])

  const load = useCallback(async (): Promise<boolean> => {
    if (buffersRef.current.length) return true
    setStatus('loading')
    setLoadedCount(0)
    try {
      const ctx = ctxRef.current ?? new AudioContext()
      ctxRef.current = ctx
      const loaded = await Promise.all(
        stems.map(async ({ name, url }) => {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`โหลด ${name} ไม่ได้`)
          const buffer = await ctx.decodeAudioData(await res.arrayBuffer())
          setLoadedCount((n) => n + 1)
          const gain = ctx.createGain()
          gain.connect(ctx.destination)
          return { name, buffer, gain }
        })
      )
      buffersRef.current = loaded
      setDuration(Math.max(...loaded.map((l) => l.buffer.duration)))
      setStatus('ready')
      return true
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
      return false
    }
  }, [stems])

  const startAt = useCallback(
    (offset: number) => {
      const ctx = ctxRef.current
      if (!ctx) return
      stopSources()
      const when = ctx.currentTime + 0.05 // Small lead so all sources start on the same tick
      sourcesRef.current = buffersRef.current.map(({ buffer, gain }) => {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(gain)
        source.start(when, Math.min(offset, buffer.duration))
        return source
      })
      clockRef.current = { startedAt: when, offset }
    },
    [stopSources]
  )

  const play = useCallback(async () => {
    if (!(await load())) return
    const ctx = ctxRef.current!
    if (ctx.state === 'suspended') await ctx.resume()
    const from = positionRef.current >= duration - 0.05 ? 0 : positionRef.current
    startAt(from)
    setPlaying(true)
  }, [load, startAt, duration])

  const pause = useCallback(() => {
    stopSources()
    setPlaying(false)
  }, [stopSources])

  const seek = useCallback(
    (seconds: number) => {
      positionRef.current = seconds
      setPosition(seconds)
      if (playing) startAt(seconds)
    },
    [playing, startAt]
  )

  const setMix = useCallback((name: StemName, patch: Partial<StemMix>) => {
    setMixState((m) => ({ ...m, [name]: { ...m[name], ...patch } }))
  }, [])

  // Apply volume / mute / solo to the gains
  useEffect(() => {
    const anySolo = STEM_NAMES.some((n) => mix[n].solo)
    const ctx = ctxRef.current
    for (const { name, gain } of buffersRef.current) {
      const m = mix[name]
      const audible = anySolo ? m.solo : !m.muted
      gain.gain.setTargetAtTime(audible ? m.volume : 0, ctx?.currentTime ?? 0, 0.015)
    }
  }, [mix, status])

  // Move the playhead while playing; stop at the end
  useEffect(() => {
    if (!playing) return
    let frame = 0
    const tick = (): void => {
      const ctx = ctxRef.current!
      const { startedAt, offset } = clockRef.current
      const now = offset + Math.max(0, ctx.currentTime - startedAt)
      if (now >= duration) {
        stopSources()
        positionRef.current = duration
        setPosition(duration)
        setPlaying(false)
        return
      }
      positionRef.current = now
      setPosition(now)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration, stopSources])

  useEffect(
    () => () => {
      stopSources()
      ctxRef.current?.close()
    },
    [stopSources]
  )

  return {
    status,
    error,
    loadedCount,
    playing,
    position,
    duration,
    mix,
    play,
    pause,
    seek,
    setMix
  }
}
