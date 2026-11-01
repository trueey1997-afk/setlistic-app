/** Reads a JSON array column, tolerating bad data instead of crashing the app. */
export function parseJsonArray<T>(value: string, allowed?: readonly T[]): T[] {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return allowed ? parsed.filter((v): v is T => allowed.includes(v as T)) : (parsed as T[])
  } catch {
    return []
  }
}
