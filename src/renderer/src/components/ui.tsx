/**
 * Small app-level wrappers around Chakra UI components. Everything else uses Chakra directly
 * (`import { Button, Input, … } from '@chakra-ui/react'`), so the Chakra docs apply as-is:
 * https://chakra-ui.com/docs/components
 *
 * Layout rules (see theme/system.ts):
 * - Every pane is a <Panel>: PanelHeader (48px: title left, actions right) › PanelToolbar
 *   (optional: search/filters) › PanelBody (the only part that scrolls) › PanelFooter
 *   (optional: summary). All share `panel.px` (16px), so content lines up on one left edge.
 * - Spacing stays on the 4px scale: 1, 2, 3, 4, 6, 8, 12.
 * - Header actions are <PanelAction> (one size, 20px icons); row actions are <RowAction>.
 *   Both show a tooltip with the label and, when given, the keyboard shortcut.
 */
import {
  Badge as ChakraBadge,
  Box,
  CloseButton,
  Collapsible,
  Dialog as ChakraDialog,
  EmptyState as ChakraEmptyState,
  Field as ChakraField,
  Flex,
  HStack,
  IconButton,
  InputGroup,
  Portal,
  Stack,
  Tooltip,
  chakra,
  type BadgeProps,
  type BoxProps,
  type FieldRootProps,
  type FlexProps,
  type IconButtonProps,
  type StackProps,
  type SystemStyleObject
} from '@chakra-ui/react'
import { ChevronRight, Search } from 'lucide-react'

/* ───────────────────────────── Panels ───────────────────────────── */

/** A pane of the app shell (sidebar, main, inspector) or any boxed region with a header. */
export function Panel(props: FlexProps): React.JSX.Element {
  return <Flex direction="column" minH="0" minW="0" {...props} />
}

/** 48px bar: title on the left, actions on the right. Children go between the two. */
export function PanelHeader({
  title,
  titleStyle = 'title.section',
  actions,
  children,
  ...props
}: Omit<FlexProps, 'title'> & {
  title?: React.ReactNode
  /** `title.page` for the thing the screen is about; panels default to `title.section`. */
  titleStyle?: 'title.page' | 'title.section'
  actions?: React.ReactNode
}): React.JSX.Element {
  return (
    <Flex
      as="header"
      h="panel.headerH"
      flexShrink={0}
      align="center"
      gap="2"
      px="panel.px"
      {...props}
    >
      {title !== undefined && (
        <Box as="h2" minW="0" flex="1" truncate textStyle={titleStyle}>
          {title}
        </Box>
      )}
      {children}
      {actions && (
        <HStack flexShrink={0} gap="1">
          {actions}
        </HStack>
      )}
    </Flex>
  )
}

/** Search and filters under the header; does not scroll. */
export function PanelToolbar(props: StackProps): React.JSX.Element {
  return <Stack flexShrink={0} gap="2" px="panel.px" pb="3" {...props} />
}

/**
 * The scrolling part of a panel. `inset` (default) pads it like the header; turn it off for
 * full-bleed lists whose rows carry their own `panel.px`.
 */
export function PanelBody({
  inset = true,
  ...props
}: StackProps & { inset?: boolean }): React.JSX.Element {
  return (
    <Stack
      flex="1"
      minH="0"
      overflowY="auto"
      gap="panel.gap"
      {...(inset && { px: 'panel.px', pt: '2', pb: 'panel.px' })}
      {...props}
    />
  )
}

/** Summary bar at the bottom (counts, totals). */
export function PanelFooter(props: FlexProps): React.JSX.Element {
  return (
    <Flex
      as="footer"
      h="panel.footerH"
      flexShrink={0}
      align="center"
      gap="3"
      px="panel.px"
      borderTopWidth="1px"
      textStyle="caption"
      fontWeight="normal"
      fontVariantNumeric="tabular-nums"
      {...props}
    />
  )
}

/**
 * Tooltip for a control: its label, plus the keyboard shortcut when there is one. Opens on
 * hover and on keyboard focus.
 */
export function Tip({
  label,
  shortcut,
  children
}: {
  label: React.ReactNode
  shortcut?: string
  children: React.ReactElement
}): React.JSX.Element {
  return (
    <Tooltip.Root openDelay={400} closeDelay={0} lazyMount unmountOnExit>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content>
            {label}
            {shortcut && (
              <Box as="kbd" ms="2" fontFamily="mono" opacity="0.75">
                {shortcut}
              </Box>
            )}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  )
}

type IconActionProps = Omit<IconButtonProps, 'aria-label'> & {
  label: string
  /** Shown in the tooltip, e.g. "Ctrl+B" */
  shortcut?: string
}

/** Icon button for panel headers and the app header: one size everywhere, 20px icon. */
export function PanelAction({ label, shortcut, ...props }: IconActionProps): React.JSX.Element {
  return (
    <Tip label={label} shortcut={shortcut}>
      <IconButton
        variant="ghost"
        size="sm"
        color="fg.muted"
        aria-label={label}
        aria-keyshortcuts={shortcut}
        _icon={{ boxSize: '5' }}
        {...props}
      />
    </Tip>
  )
}

/** Icon button inside a list row or toolbar; follows density. */
export function RowAction({ label, shortcut, ...props }: IconActionProps): React.JSX.Element {
  return (
    <Tip label={label} shortcut={shortcut}>
      <IconButton
        variant="ghost"
        size="xs"
        color="fg.muted"
        aria-label={label}
        aria-keyshortcuts={shortcut}
        _icon={{ boxSize: 'icon.size' }}
        {...props}
      />
    </Tip>
  )
}

/** Label / value list (inspector details): label left in fg.muted, value right. */
export function KeyValueList(props: BoxProps): React.JSX.Element {
  return <Box as="dl" {...props} />
}

export function KeyValue({
  label,
  numeric,
  children
}: {
  label: string
  /** Right-aligned mono digits, so values line up down the list */
  numeric?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Flex
      minH="9"
      align="center"
      justify="space-between"
      gap="4"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      fontSize="sm"
    >
      <Box as="dt" flexShrink={0} color="fg.muted">
        {label}
      </Box>
      <Box
        as="dd"
        minW="0"
        textAlign="right"
        fontWeight="semibold"
        {...(numeric && { fontFamily: 'mono', fontVariantNumeric: 'tabular-nums' })}
      >
        {children}
      </Box>
    </Flex>
  )
}

/**
 * A section that folds under its title (inspector). Folded content stays mounted, so a video
 * or the stems mixer keeps playing while it's tucked away.
 */
export function FoldSection({
  title,
  icon,
  open,
  onOpenChange,
  children
}: {
  title: string
  icon?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Collapsible.Root
      as="section"
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      borderTopWidth="1px"
    >
      <Collapsible.Trigger
        display="flex"
        w="full"
        h="row.h"
        alignItems="center"
        gap="2"
        textStyle="title.item"
        cursor="pointer"
        rounded="chip"
        _hover={{ color: 'accent.fg' }}
        _icon={{ boxSize: '4', flexShrink: 0 }}
      >
        <Box
          as="span"
          display="inline-flex"
          color="fg.muted"
          transform={open ? 'rotate(90deg)' : undefined}
          transition="transform 0.15s"
        >
          <ChevronRight />
        </Box>
        {icon}
        {title}
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Stack gap="3" pb="4">
          {children}
        </Stack>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

/* ───────────────────────────── Forms & overlays ───────────────────────────── */

/** Label above a form control. Pass layout props (e.g. `gridColumn`) straight to Field.Root. */
export function Field({
  label,
  children,
  ...props
}: FieldRootProps & { label: string }): React.JSX.Element {
  return (
    <ChakraField.Root gap="2" {...props}>
      <ChakraField.Label color="fg.muted" fontWeight="medium">
        {label}
      </ChakraField.Label>
      {children}
    </ChakraField.Root>
  )
}

/** Modal with a title bar and close button; content mounts only while open. */
export function Dialog({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ChakraDialog.Root
      open={open}
      placement="center"
      scrollBehavior="inside"
      onOpenChange={(e) => {
        if (!e.open) onClose()
      }}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <ChakraDialog.Backdrop />
        <ChakraDialog.Positioner>
          <ChakraDialog.Content
            w="calc(100% - {spacing.8})"
            maxW="dialog.md"
            rounded="card"
            bg="bg.panel"
          >
            <ChakraDialog.Header h="panel.headerH" py="0" px="panel.px" alignItems="center">
              <ChakraDialog.Title textStyle="title.section">{title}</ChakraDialog.Title>
            </ChakraDialog.Header>
            <ChakraDialog.Body px="panel.px" pt="2" pb="panel.px">
              {children}
            </ChakraDialog.Body>
            <ChakraDialog.CloseTrigger asChild top="2" insetEnd="2">
              <CloseButton size="sm" aria-label="ปิด" />
            </ChakraDialog.CloseTrigger>
          </ChakraDialog.Content>
        </ChakraDialog.Positioner>
      </Portal>
    </ChakraDialog.Root>
  )
}

const BADGE_TONES = {
  neutral: { variant: 'outline', color: 'fg.muted', shadowColor: 'border' },
  primary: { variant: 'outline', colorPalette: 'accent' },
  /** The musical key: tinted, so a column of keys doesn't outshout the primary action */
  key: { variant: 'subtle', colorPalette: 'accent' },
  success: { variant: 'surface', colorPalette: 'success' },
  warning: { variant: 'surface', colorPalette: 'warning' }
} satisfies Record<string, BadgeProps>
export type BadgeTone = keyof typeof BADGE_TONES

/** Chakra Badge with the app's color tones; other Badge props pass through. */
export function Badge({
  tone = 'neutral',
  ...props
}: BadgeProps & { tone?: BadgeTone }): React.JSX.Element {
  return <ChakraBadge fontWeight="semibold" {...BADGE_TONES[tone]} {...props} />
}

export function EmptyState({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <ChakraEmptyState.Root h="full" display="flex" alignItems="center" justifyContent="center">
      <ChakraEmptyState.Content>
        <ChakraEmptyState.Indicator>{icon}</ChakraEmptyState.Indicator>
        <ChakraEmptyState.Title fontSize="sm" fontWeight="normal" color="fg.muted">
          {title}
        </ChakraEmptyState.Title>
        {children}
      </ChakraEmptyState.Content>
    </ChakraEmptyState.Root>
  )
}

/** Dashed placeholder for an empty block inside a panel (one look everywhere). */
export function Placeholder({ children, ...props }: StackProps): React.JSX.Element {
  return (
    <Stack
      align="center"
      justify="center"
      gap="2"
      rounded="inset"
      borderWidth="1px"
      borderStyle="dashed"
      p="6"
      textAlign="center"
      fontSize="sm"
      color="fg.muted"
      {...props}
    >
      {children}
    </Stack>
  )
}

/** Input with a magnifier icon in front. Wrap a Chakra `<Input>`. */
export function SearchGroup({
  children
}: {
  children: React.ComponentProps<typeof InputGroup>['children']
}): React.JSX.Element {
  return (
    <InputGroup flex="1" startElement={<Search size={16} />}>
      {children}
    </InputGroup>
  )
}

/** Small section label used above lists and blocks inside a panel. */
export function SectionLabel({ children, ...props }: BoxProps): React.JSX.Element {
  return (
    <Box as="h3" textStyle="caption" {...props}>
      {children}
    </Box>
  )
}

/** Accent bar on the left edge of a selected row, drawn inside it so content never shifts. */
// eslint-disable-next-line react-refresh/only-export-components
export function selectedBar(
  selected: boolean,
  width: '0.5' | '1' = '0.5'
): { position: 'relative'; _before: SystemStyleObject | undefined } {
  return {
    position: 'relative',
    _before: selected
      ? {
          content: '""',
          position: 'absolute',
          insetY: '0',
          left: '0',
          w: width,
          bg: 'accent.solid'
        }
      : undefined
  }
}

/** Selectable row in a panel list: one row height (density), content on the panel edge. */
export function ListRow({
  selected,
  barWidth,
  ...props
}: React.ComponentProps<typeof chakra.button> & {
  selected: boolean
  barWidth?: '0.5' | '1'
}): React.JSX.Element {
  return (
    <chakra.button
      aria-current={selected}
      display="flex"
      w="full"
      h="row.h"
      alignItems="center"
      gap="3"
      bg={selected ? 'bg.selected' : undefined}
      _hover={{ bg: selected ? 'bg.selected' : 'bg.muted' }}
      px="panel.px"
      textAlign="left"
      cursor="pointer"
      {...selectedBar(selected, barWidth)}
      {...props}
    />
  )
}
