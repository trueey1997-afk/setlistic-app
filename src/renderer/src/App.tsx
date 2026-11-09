import { useState } from 'react'
import { Flex, HStack, IconButton, NativeSelect, Tabs, Text } from '@chakra-ui/react'
import { Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react'
import type { BandSummary } from '@shared/types'
import { useAsync } from './hooks/useAsync'
import { useTheme } from './lib/theme'
import { ToastProvider } from './components/toast'
import { BandOnboarding, BandPage } from './components/BandPage'
import { SongLibrary } from './components/SongLibrary'
import { SetlistsPage } from './components/SetlistsPage'

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
      <Flex direction="column" h="full">
        <Flex
          as="header"
          h="12"
          flexShrink={0}
          align="center"
          justify="space-between"
          gap="4"
          borderBottomWidth="1px"
          px="4"
        >
          <HStack minW="0" gap="5">
            {hasSidebar && (
              <IconButton
                variant="ghost"
                size="sm"
                color="fg.muted"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? 'ซ่อนรายการ' : 'แสดงรายการ'}
                aria-expanded={sidebarOpen}
                title={sidebarOpen ? 'ซ่อนรายการ' : 'แสดงรายการ'}
              >
                {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </IconButton>
            )}
            <Text fontSize="sm" fontWeight="bold" letterSpacing="0.2em" textTransform="uppercase">
              Setlistic
            </Text>
            {band && (
              <>
                <NativeSelect.Root size="xs" maxW="48" aria-label="เลือกวง">
                  <NativeSelect.Field
                    value={band.id}
                    fontWeight="semibold"
                    onChange={(e) =>
                      e.target.value === 'new'
                        ? setCreatingBand(true)
                        : selectBand(Number(e.target.value))
                    }
                  >
                    {bands.data?.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                    <option value="new">+ สร้างวงใหม่…</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                <Tabs.Root
                  value={tab}
                  onValueChange={(e) => setTab(e.value as Tab)}
                  variant="line"
                  colorPalette="brand"
                  size="sm"
                  h="12"
                >
                  <Tabs.List h="full" borderBottomWidth="0">
                    {TABS.map((t) => (
                      <Tabs.Trigger key={t.id} value={t.id} fontWeight="semibold" h="full">
                        {t.label}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </Tabs.Root>
              </>
            )}
          </HStack>
          <IconButton
            variant="ghost"
            size="sm"
            color="fg.muted"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
            title={theme === 'dark' ? 'โหมดสว่าง (สำหรับเวทีที่แสงจ้า)' : 'โหมดมืด'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </IconButton>
        </Flex>

        {bands.error ? (
          <Text p="6" color="fg.error">
            {bands.error}
          </Text>
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
      </Flex>
    </ToastProvider>
  )
}

export default App
