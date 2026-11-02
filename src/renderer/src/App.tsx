import { useState } from 'react'
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import type { BandSummary } from '@shared/types'
import { useAsync } from './hooks/useAsync'
import { useTheme } from './lib/theme'
import { ToastProvider } from './components/toast'
import { BandOnboarding, BandPage } from './components/BandPage'
import { SongLibrary } from './components/SongLibrary'
import { SetlistsPage } from './components/SetlistsPage'
import logo from './assets/logo.png'

type Tab = 'setlists' | 'songs' | 'band'
const TABS: { id: Tab; label: string }[] = [
  { id: 'setlists', label: 'เซ็ตลิสต์' },
  { id: 'songs', label: 'เพลง' },
  { id: 'band', label: 'วง & สมาชิก' }
]
const BAND_KEY = 'setlistic-band'
const SIDEBAR_KEY = 'setlistic-sidebar'

function readStoredBand(): number | null {
  try {
    return Number(localStorage.getItem(BAND_KEY)) || null
  } catch {
    return null
  }
}

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'closed'
  } catch {
    return true
  }
}

function App(): React.JSX.Element {
  const [theme, toggleTheme] = useTheme()
  const [tab, setTab] = useState<Tab>('setlists')
  const [storedBandId, setStoredBandId] = useState(readStoredBand)
  const [creatingBand, setCreatingBand] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const bands = useAsync(() => window.setlistic.bands.list(), 'bands')

  // Fall back to the first band if the remembered one was deleted
  const band: BandSummary | undefined =
    bands.data?.find((b) => b.id === storedBandId) ?? bands.data?.[0]

  function selectBand(id: number): void {
    setStoredBandId(id)
    try {
      localStorage.setItem(BAND_KEY, String(id))
    } catch {
      // Selection still works for this session
    }
  }

  function toggleSidebar(): void {
    setSidebarOpen(!sidebarOpen)
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? 'closed' : 'open')
    } catch {
      // Still toggles for this session
    }
  }

  // Only the setlist and song pages have a list pane
  const hasSidebar = !!band && !creatingBand && tab !== 'band'

  return (
    <ToastProvider>
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
          <div className="flex min-w-0 items-center gap-5">
                  {hasSidebar && (
              <button
                onClick={toggleSidebar}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={sidebarOpen ? 'ซ่อนรายการ' : 'แสดงรายการ'}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? 'ซ่อนรายการ' : 'แสดงรายการ'}
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
              </button>
            )}
            <span className="flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase">
              <img src={logo} alt="" className="size-8 rounded-md" />
              Setlistic
            </span>
            {band && (
              <>
                <select
                  value={band.id}
                  onChange={(e) =>
                    e.target.value === 'new'
                      ? setCreatingBand(true)
                      : selectBand(Number(e.target.value))
                  }
                  className="h-8 max-w-48 truncate rounded-md border border-border bg-background px-2 text-sm font-semibold"
                  aria-label="เลือกวง"
                >
                  {bands.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="new">+ สร้างวงใหม่…</option>
                </select>
                <nav className="flex h-12 items-stretch text-sm font-semibold">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      aria-current={tab === t.id ? 'page' : undefined}
                      className={`border-b-2 px-3 ${
                        tab === t.id
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={toggleTheme}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
              title={theme === 'dark' ? 'โหมดสว่าง (สำหรับเวทีที่แสงจ้า)' : 'โหมดมืด'}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>

        {bands.error ? (
          <p className="p-6 text-primary">{bands.error}</p>
        ) : !bands.data ? null : !band || creatingBand ? (
          <BandOnboarding
            first={!band}
            onCancel={band ? () => setCreatingBand(false) : undefined}
            onCreated={(created) => {
              setCreatingBand(false)
              selectBand(created.id)
              setTab('band')
              bands.reload()
            }}
          />
        ) : tab === 'setlists' ? (
          <SetlistsPage
            key={band.id}
            bandId={band.id}
            bandName={band.name}
            sidebarOpen={sidebarOpen}
          />
        ) : tab === 'songs' ? (
          <SongLibrary key={band.id} bandId={band.id} sidebarOpen={sidebarOpen} />
        ) : (
          <BandPage
            key={band.id}
            bandId={band.id}
            onChanged={bands.reload}
            onDeleted={() => {
              setTab('setlists')
              bands.reload()
            }}
          />
        )}
      </div>
    </ToastProvider>
  )
}

export default App
