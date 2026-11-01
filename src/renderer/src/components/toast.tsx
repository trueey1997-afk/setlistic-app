import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const toast = useCallback((msg: string) => {
    setMessage(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2500)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
      >
        {message && (
          <div className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ((message: string) => void) => useContext(ToastContext)

/** Runs an API call and shows its error as a toast instead of throwing. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRun(): <T>(task: Promise<T>) => Promise<T | undefined> {
  const toast = useToast()
  return useCallback(
    async <T,>(task: Promise<T>): Promise<T | undefined> => {
      try {
        return await task
      } catch (err) {
        toast((err as Error).message)
        return undefined
      }
    },
    [toast]
  )
}
