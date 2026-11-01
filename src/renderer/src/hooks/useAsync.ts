import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data from `window.setlistic`. Re-runs when `key` changes (encode the inputs in it)
 * or when `reload()` is called. Stale responses from a previous key are ignored.
 */
export function useAsync<T>(
  load: () => Promise<T>,
  key: string
): {
  data: T | null
  error: string | null
  reload: () => void
  setData: (data: T) => void
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const loadRef = useRef(load)

  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => {
    let cancelled = false
    loadRef.current().then(
      (result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      },
      (err: Error) => {
        if (!cancelled) setError(err.message)
      }
    )
    return () => {
      cancelled = true
    }
  }, [key, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, reload, setData }
}
