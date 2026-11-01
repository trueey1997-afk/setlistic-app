/** 245 -> "4:05" */
export function formatClock(totalSec: number | null | undefined): string {
  if (totalSec == null) return '–:––'
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 3900 -> "1 ชม. 5 นาที" */
export function formatTotal(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.round((totalSec % 3600) / 60)
  return h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`
}

/** "4:05" or "245" -> 245. Returns null for empty input, undefined when unparseable. */
export function parseClock(input: string): number | null | undefined {
  const s = input.trim()
  if (!s) return null
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(s)
  if (m) return Number(m[1]) * 60 + Number(m[2])
  if (/^\d+$/.test(s)) return Number(s)
  return undefined
}
