/**
 * The one app shell every screen uses: Sidebar | Main | Inspector.
 *
 * - Sidebar: 240–320px, drag its right edge to resize. Ctrl+B folds it to a 56px icon rail
 *   and back. Windows under 1024px (`lg`) start folded.
 * - Inspector: 280–360px, drag its left edge to resize. Docked beside Main from 1280px (`xl`);
 *   narrower windows show it as a drawer over the right edge (Esc closes). Ctrl+I or ✕ hides it.
 * - Ctrl+K expands the sidebar if needed and asks the screen to focus its search field.
 *
 * Widths and the folded/hidden states are remembered in localStorage.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, chakra, useBreakpointValue, type FlexProps } from '@chakra-ui/react'
import { PanelLeftClose, PanelLeftOpen, PanelRightOpen, X } from 'lucide-react'
import { Panel, PanelAction, PanelFooter, PanelHeader, Tip, selectedBar } from './ui'

const SIDEBAR_KEY = 'setlistic-sidebar' // 'open' | 'closed' (closed = rail)
const SIDEBAR_WIDTH_KEY = 'setlistic-sidebar-width'
const INSPECTOR_KEY = 'setlistic-inspector'
const INSPECTOR_WIDTH_KEY = 'setlistic-inspector-width'

function readOpen(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'closed'
  } catch {
    return true
  }
}

function writeOpen(key: string, open: boolean): void {
  try {
    localStorage.setItem(key, open ? 'open' : 'closed')
  } catch {
    // Still toggles for this session
  }
}

function readWidth(key: string): number | null {
  try {
    const n = Number(localStorage.getItem(key))
    return n > 0 ? n : null
  } catch {
    return null
  }
}

function writeWidth(key: string, width: number | null): void {
  try {
    if (width === null) localStorage.removeItem(key)
    else localStorage.setItem(key, String(Math.round(width)))
  } catch {
    // Still resizes for this session
  }
}

type ShellState = {
  /** Sidebar is folded to the icon rail. */
  sidebarRail: boolean
  toggleSidebar: () => void
  /** Window is wide enough to dock the inspector. */
  wide: boolean
  inspectorVisible: boolean
  toggleInspector: () => void
  /** Bring the inspector into view after picking an item (opens the drawer when narrow). */
  showInspector: () => void
  hideInspector: () => void
  /** User-dragged widths in px; null = the token default. */
  sidebarWidth: number | null
  setSidebarWidth: (width: number | null) => void
  inspectorWidth: number | null
  setInspectorWidth: (width: number | null) => void
  /** Bumped by Ctrl+K (and Ctrl+F on the song page); screens focus their search field when it changes. */
  searchTick: number
  requestSearch: () => void
}

const ShellContext = createContext<ShellState | null>(null)

export function ShellProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [sidebarExpanded, setSidebarExpanded] = useState(() => readOpen(SIDEBAR_KEY))
  // Under 1024px the sidebar starts folded; expanding it there lasts for the session only
  const [narrowExpanded, setNarrowExpanded] = useState(false)
  const [dockedOpen, setDockedOpen] = useState(() => readOpen(INSPECTOR_KEY))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarWidth, setSidebarWidthState] = useState(() => readWidth(SIDEBAR_WIDTH_KEY))
  const [inspectorWidth, setInspectorWidthState] = useState(() => readWidth(INSPECTOR_WIDTH_KEY))
  const [searchTick, setSearchTick] = useState(0)
  const wide = useBreakpointValue({ base: false, xl: true }) ?? true
  const roomy = useBreakpointValue({ base: false, lg: true }) ?? true

  const sidebarRail = roomy ? !sidebarExpanded : !narrowExpanded

  const setSidebarOpen = useCallback(
    (open: boolean) => {
      if (roomy) {
        writeOpen(SIDEBAR_KEY, open)
        setSidebarExpanded(open)
      } else {
        setNarrowExpanded(open)
      }
    },
    [roomy]
  )

  const toggleSidebar = useCallback(
    () => setSidebarOpen(sidebarRail),
    [setSidebarOpen, sidebarRail]
  )

  const setDocked = useCallback((open: boolean) => {
    writeOpen(INSPECTOR_KEY, open)
    setDockedOpen(open)
  }, [])

  const toggleInspector = useCallback(() => {
    if (wide) setDocked(!dockedOpen)
    else setDrawerOpen((open) => !open)
  }, [wide, dockedOpen, setDocked])

  const showInspector = useCallback(() => {
    if (!wide) setDrawerOpen(true)
  }, [wide])

  const hideInspector = useCallback(() => {
    if (wide) setDocked(false)
    else setDrawerOpen(false)
  }, [wide, setDocked])

  const setSidebarWidth = useCallback((width: number | null) => {
    writeWidth(SIDEBAR_WIDTH_KEY, width)
    setSidebarWidthState(width)
  }, [])

  const setInspectorWidth = useCallback((width: number | null) => {
    writeWidth(INSPECTOR_WIDTH_KEY, width)
    setInspectorWidthState(width)
  }, [])

  const requestSearch = useCallback(() => {
    if (sidebarRail) setSidebarOpen(true)
    setSearchTick((t) => t + 1)
  }, [sidebarRail, setSidebarOpen])

  // Ctrl+B sidebar, Ctrl+I inspector, Ctrl+K search
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        toggleSidebar()
      } else if (key === 'i') {
        e.preventDefault()
        toggleInspector()
      } else if (key === 'k') {
        e.preventDefault()
        requestSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar, toggleInspector, requestSearch])

  const value = useMemo<ShellState>(
    () => ({
      sidebarRail,
      toggleSidebar,
      wide,
      inspectorVisible: wide ? dockedOpen : drawerOpen,
      toggleInspector,
      showInspector,
      hideInspector,
      sidebarWidth,
      setSidebarWidth,
      inspectorWidth,
      setInspectorWidth,
      searchTick,
      requestSearch
    }),
    [
      sidebarRail,
      toggleSidebar,
      wide,
      dockedOpen,
      drawerOpen,
      toggleInspector,
      showInspector,
      hideInspector,
      sidebarWidth,
      setSidebarWidth,
      inspectorWidth,
      setInspectorWidth,
      searchTick,
      requestSearch
    ]
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShell(): ShellState {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell must be used inside <ShellProvider>')
  return shell
}

/** Row that holds a screen's sidebar, main panel and inspector. */
export function Shell(props: FlexProps): React.JSX.Element {
  return <Flex position="relative" minH="0" flex="1" {...props} />
}

/**
 * Drag handle on a pane's inner edge. Resizes the DOM directly while dragging (no re-render
 * per pixel), clamped by the pane's own min/max width tokens, then commits once on release.
 * Arrow keys resize by 16px; double-click resets to the default width.
 */
function ResizeHandle({
  edge,
  label,
  onResize
}: {
  /** Which edge of the pane the handle sits on */
  edge: 'left' | 'right'
  label: string
  onResize: (width: number | null) => void
}): React.JSX.Element {
  const sign = edge === 'right' ? 1 : -1

  function clamp(pane: HTMLElement, width: number): number {
    const style = getComputedStyle(pane)
    const min = parseFloat(style.minWidth) || 0
    const max = parseFloat(style.maxWidth) || Infinity
    return Math.min(max, Math.max(min, width))
  }

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      position="absolute"
      insetY="0"
      {...(edge === 'right' ? { right: '-1' } : { left: '-1' })}
      w="2"
      zIndex="1"
      cursor="col-resize"
      _hover={{ bg: 'accent.muted' }}
      _focusVisible={{ bg: 'accent.solid', outline: 'none' }}
      onPointerDown={(e) => {
        const handle = e.currentTarget
        const pane = handle.parentElement
        if (!pane || e.button !== 0) return
        e.preventDefault()
        const startX = e.clientX
        const startWidth = pane.getBoundingClientRect().width
        let width = startWidth
        handle.setPointerCapture(e.pointerId)
        const move = (ev: PointerEvent): void => {
          width = clamp(pane, startWidth + sign * (ev.clientX - startX))
          pane.style.width = `${width}px`
        }
        const up = (): void => {
          handle.removeEventListener('pointermove', move)
          handle.removeEventListener('pointerup', up)
          handle.removeEventListener('pointercancel', up)
          if (width !== startWidth) onResize(width)
        }
        handle.addEventListener('pointermove', move)
        handle.addEventListener('pointerup', up)
        handle.addEventListener('pointercancel', up)
      }}
      onKeyDown={(e) => {
        const pane = e.currentTarget.parentElement
        if (!pane) return
        const step = e.key === 'ArrowRight' ? 16 : e.key === 'ArrowLeft' ? -16 : 0
        if (!step) return
        e.preventDefault()
        onResize(clamp(pane, pane.getBoundingClientRect().width + sign * step))
      }}
      onDoubleClick={(e) => {
        const pane = e.currentTarget.parentElement
        if (pane) pane.style.width = ''
        onResize(null)
      }}
    />
  )
}

/**
 * Left list pane. Pass the full pane as children and its folded form as `rail`
 * (a <ShellRail> of <RailItem>s).
 */
export function ShellSidebar({
  label,
  rail,
  children
}: {
  label: string
  rail?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  const { sidebarRail, sidebarWidth, setSidebarWidth } = useShell()
  if (sidebarRail) {
    return (
      <Panel as="aside" aria-label={label} w="pane.rail" flexShrink={0} borderRightWidth="1px">
        {rail ?? <ShellRail>{null}</ShellRail>}
      </Panel>
    )
  }
  return (
    <Panel
      as="aside"
      aria-label={label}
      position="relative"
      w="pane.sidebar"
      minW="pane.sidebar.min"
      maxW="pane.sidebar.max"
      style={sidebarWidth ? { width: sidebarWidth } : undefined}
      flexShrink={0}
      borderRightWidth="1px"
    >
      {children}
      <ResizeHandle edge="right" label="ปรับความกว้างรายการ" onResize={setSidebarWidth} />
    </Panel>
  )
}

/** Fold-to-rail button; goes last in the sidebar's PanelHeader actions. */
export function SidebarCollapse(): React.JSX.Element {
  const { toggleSidebar } = useShell()
  return (
    <PanelAction label="ย่อรายการ" shortcut="Ctrl+B" aria-expanded onClick={toggleSidebar}>
      <PanelLeftClose />
    </PanelAction>
  )
}

/**
 * Brings the inspector back; goes last in Main's PanelHeader actions. Only shows while the
 * inspector is closed (when open, its own ✕ closes it).
 */
export function InspectorToggle(): React.JSX.Element | null {
  const { inspectorVisible, toggleInspector } = useShell()
  if (inspectorVisible) return null
  return (
    <PanelAction
      label="แสดงรายละเอียด"
      shortcut="Ctrl+I"
      aria-expanded={false}
      onClick={toggleInspector}
    >
      <PanelRightOpen />
    </PanelAction>
  )
}

/** Folded sidebar: expand button on top, one square item per row, footer for alignment. */
export function ShellRail({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toggleSidebar } = useShell()
  return (
    <>
      <PanelHeader px="0" justifyContent="center">
        <PanelAction label="ขยายรายการ" shortcut="Ctrl+B" onClick={toggleSidebar}>
          <PanelLeftOpen />
        </PanelAction>
      </PanelHeader>
      <Stack as="ul" flex="1" minH="0" overflowY="auto" gap="0">
        {children}
      </Stack>
      <PanelFooter px="0" />
    </>
  )
}

/** One item of the rail: a centered tile, the name in a tooltip, the accent bar when picked. */
export function RailItem({
  label,
  selected,
  onClick,
  children
}: {
  label: string
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <li>
      <Tip label={label}>
        <chakra.button
          aria-label={label}
          aria-current={selected}
          display="flex"
          w="full"
          h="row.h"
          alignItems="center"
          justifyContent="center"
          bg={selected ? 'bg.selected' : undefined}
          _hover={{ bg: selected ? 'bg.selected' : 'bg.muted' }}
          cursor="pointer"
          onClick={onClick}
          {...selectedBar(selected)}
        >
          {children}
        </chakra.button>
      </Tip>
    </li>
  )
}

export function ShellMain(props: FlexProps): React.JSX.Element {
  return <Panel as="section" flex="1" {...props} />
}

/**
 * Right detail pane. Renders its own PanelHeader (title, actions, ✕) so every screen gets the
 * same close button; pass the body and footer as children.
 */
export function ShellInspector({
  label,
  title,
  actions,
  children
}: {
  label: string
  title: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element | null {
  const { wide, inspectorVisible, hideInspector, inspectorWidth, setInspectorWidth } = useShell()
  if (!inspectorVisible) return null
  return (
    <Panel
      as="aside"
      aria-label={label}
      position="relative"
      w="pane.inspector"
      minW="pane.inspector.min"
      maxW="pane.inspector.max"
      style={inspectorWidth ? { width: inspectorWidth } : undefined}
      flexShrink={0}
      borderLeftWidth="1px"
      {...(!wide && {
        position: 'absolute',
        insetY: '0',
        right: '0',
        zIndex: 'docked',
        bg: 'bg.panel',
        shadow: 'lg'
      })}
      onKeyDown={(e) => {
        if (!wide && e.key === 'Escape') hideInspector()
      }}
    >
      <PanelHeader
        title={title}
        actions={
          <>
            {actions}
            <PanelAction
              label="ปิดรายละเอียด"
              shortcut={wide ? 'Ctrl+I' : 'Esc'}
              onClick={hideInspector}
            >
              <X />
            </PanelAction>
          </>
        }
      />
      {children}
      {wide && (
        <ResizeHandle edge="left" label="ปรับความกว้างรายละเอียด" onResize={setInspectorWidth} />
      )}
    </Panel>
  )
}
