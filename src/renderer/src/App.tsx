import { useEffect, useState } from 'react'
import { Flex, HStack, NativeSelect, Tabs, Text } from '@chakra-ui/react'
import type { BandSummary } from '@shared/types'
import { useAsync } from './hooks/useAsync'
import { AccentMenu, ThemeMenu } from './components/ThemeMenu'
import { ToastProvider } from './components/toast'
import { ShellProvider } from './components/shell'
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

function readStoredBand(): number | null {
  try {
    return Number(localStorage.getItem(BAND_KEY)) || null
  } catch {
    return null
  }
}

function App(): React.JSX.Element {
  return (
    <ToastProvider>
      <ShellProvider>
        <AppFrame />
      </ShellProvider>
    </ToastProvider>
  )
}

function AppFrame(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('setlists')
  const [storedBandId, setStoredBandId] = useState(readStoredBand)
  const [creatingBand, setCreatingBand] = useState(false)
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

  // Ctrl+1/2/3 switch screens
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const next = TABS[Number(e.key) - 1]
      if (!next) return
      e.preventDefault()
      setTab(next.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Flex direction="column" h="full">
      <Flex
        as="header"
        h="panel.headerH"
        flexShrink={0}
        align="center"
        justify="space-between"
        gap="4"
        borderBottomWidth="1px"
        px="panel.px"
      >
        <HStack minW="0" gap="4">
          <Text
            flexShrink={0}
            whiteSpace="nowrap"
            fontSize="sm"
            fontWeight="bold"
            letterSpacing="widest"
            textTransform="uppercase"
          >
            Setlistic
          </Text>
          {band && (
            <>
              <NativeSelect.Root
                size="xs"
                minW="0"
                maxW="control.select"
                flexShrink={1}
                aria-label="เลือกวง"
              >
                <NativeSelect.Field
                  value={band.id}
                  fontWeight="semibold"
                  whiteSpace="nowrap"
                  textOverflow="ellipsis"
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
                colorPalette="accent"
                size="sm"
                h="panel.headerH"
                flexShrink={0}
              >
                <Tabs.List h="full" borderBottomWidth="0">
                  {TABS.map((t, i) => (
                    <Tabs.Trigger
                      key={t.id}
                      value={t.id}
                      fontWeight="semibold"
                      h="full"
                      whiteSpace="nowrap"
                      flexShrink={0}
                      title={`Ctrl+${i + 1}`}
                    >
                      {t.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </Tabs.Root>
            </>
          )}
        </HStack>
        <HStack gap="1" flexShrink={0}>
          <ThemeMenu />
          <AccentMenu />
        </HStack>
      </Flex>

      {bands.error ? (
        <Text p="panel.px" color="fg.error">
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
        <SetlistsPage key={band.id} bandId={band.id} bandName={band.name} />
      ) : tab === 'songs' ? (
        <SongLibrary key={band.id} bandId={band.id} />
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
  )
}

export default App
