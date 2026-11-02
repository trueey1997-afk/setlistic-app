import { app, shell, session, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { openDatabase, type Db } from './db/connection'
import { createBandRepository } from './db/bandRepository'
import { createSongRepository } from './db/songRepository'
import { createSetlistRepository } from './db/setlistRepository'
import { createHandlers, registerIpc } from './ipc'

let db: Db | undefined

/** True only for our own renderer: the dev server in development, the bundled file otherwise. */
function isAppUrl(url: string): boolean {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return url.startsWith(process.env['ELECTRON_RENDERER_URL'])
  }
  return url.startsWith('file://')
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  return frame !== null && frame.parent === null && isAppUrl(frame.url)
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Setlistic',
    show: false,
    // Matches the dark theme so there's no white flash on stage
    backgroundColor: '#0d0d0d',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // For the in-app chord viewer; locked down in will-attach-webview below
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Links (YouTube, chord sites) open in the system browser, never inside the app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })

  // Webviews only ever show web pages, with no preload and no Node
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload
    webPreferences.nodeIntegration = false
    webPreferences.contextIsolation = true
    webPreferences.sandbox = true
    if (!/^https?:\/\//.test(params.src)) event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.setlistic.app')

  // A file:// page sends no Referer and YouTube then refuses to play embeds (error 153).
  // YouTube asks embedding apps to identify themselves as https://<app id>.
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube-nocookie.com/*'] },
    ({ requestHeaders }, callback) => {
      requestHeaders['Referer'] ??= 'https://com.setlistic.app/'
      callback({ requestHeaders })
    }
  )

  // Chord sites' pop-ups (mostly ads) are dropped; their links stay in the viewer
  app.on('web-contents-created', (_, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    }
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // One local database per OS user, e.g. %APPDATA%\setlistic\setlistic.db on Windows
  db = openDatabase(join(app.getPath('userData'), 'setlistic.db'))
  const songs = createSongRepository(db)
  registerIpc(
    createHandlers(createBandRepository(db), songs, createSetlistRepository(db, songs)),
    isTrustedSender
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  db?.close()
})
