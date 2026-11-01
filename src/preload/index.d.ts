import type { SetlisticApi } from '../shared/ipc'

declare global {
  interface Window {
    setlistic: SetlisticApi
  }
}
