import { useCallback } from 'react'
import { Portal, Toast, Toaster, createToaster } from '@chakra-ui/react'

/** App-wide Chakra toaster: https://chakra-ui.com/docs/components/toast */
// eslint-disable-next-line react-refresh/only-export-components
export const toaster = createToaster({ placement: 'bottom', duration: 2500, max: 3 })

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      {children}
      <Portal>
        <Toaster toaster={toaster}>
          {(t) => (
            <Toast.Root width="auto" minW="auto" px="4" py="2">
              <Toast.Title fontSize="sm">{t.title}</Toast.Title>
            </Toast.Root>
          )}
        </Toaster>
      </Portal>
    </>
  )
}

const show = (message: string): void => {
  toaster.create({ title: message })
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ((message: string) => void) => show

/** Runs an API call and shows its error as a toast instead of throwing. */
// eslint-disable-next-line react-refresh/only-export-components
export function useRun(): <T>(task: Promise<T>) => Promise<T | undefined> {
  return useCallback(async <T,>(task: Promise<T>): Promise<T | undefined> => {
    try {
      return await task
    } catch (err) {
      toaster.create({ title: (err as Error).message, type: 'error' })
      return undefined
    }
  }, [])
}
