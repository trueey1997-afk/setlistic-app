import { contextBridge, ipcRenderer } from 'electron'
import { API_METHODS, channelName, type IpcResult, type SetlisticApi } from '@shared/ipc'

/**
 * Builds `window.setlistic` from the shared contract. The renderer only gets these
 * functions; it never touches ipcRenderer, Node or the database directly.
 */
function buildApi(): SetlisticApi {
  const api: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>> = {}
  for (const [ns, methods] of Object.entries(API_METHODS)) {
    api[ns] = {}
    for (const method of Object.keys(methods)) {
      api[ns][method] = async (...args) => {
        const result = (await ipcRenderer.invoke(
          channelName(ns, method),
          ...args
        )) as IpcResult<unknown>
        if (!result.ok) throw new Error(result.error)
        return result.data
      }
    }
  }
  return api as unknown as SetlisticApi
}

contextBridge.exposeInMainWorld('setlistic', buildApi())
