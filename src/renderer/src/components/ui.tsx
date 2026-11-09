/**
 * Small app-level wrappers around Chakra UI components. Everything else uses Chakra directly
 * (`import { Button, Input, … } from '@chakra-ui/react'`), so the Chakra docs apply as-is:
 * https://chakra-ui.com/docs/components
 */
import {
  Badge as ChakraBadge,
  Box,
  CloseButton,
  Dialog as ChakraDialog,
  EmptyState as ChakraEmptyState,
  Field as ChakraField,
  InputGroup,
  Portal,
  chakra,
  type BadgeProps,
  type BoxProps,
  type FieldRootProps
} from '@chakra-ui/react'
import { Search } from 'lucide-react'

/** Label above a form control. Pass layout props (e.g. `gridColumn`) straight to Field.Root. */
export function Field({
  label,
  children,
  ...props
}: FieldRootProps & { label: string }): React.JSX.Element {
  return (
    <ChakraField.Root gap="1.5" {...props}>
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
          <ChakraDialog.Content maxW="min(720px, calc(100% - 2rem))" bg="bg.panel">
            <ChakraDialog.Header borderBottomWidth="1px" py="3" px="5">
              <ChakraDialog.Title fontSize="md">{title}</ChakraDialog.Title>
            </ChakraDialog.Header>
            <ChakraDialog.Body p="5">{children}</ChakraDialog.Body>
            <ChakraDialog.CloseTrigger asChild top="2" insetEnd="3">
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
  primary: { variant: 'outline', colorPalette: 'brand' },
  /** Solid accent, for the musical key */
  key: { variant: 'solid', colorPalette: 'brand' },
  success: { variant: 'surface', colorPalette: 'green' },
  warning: { variant: 'surface', colorPalette: 'orange' }
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

/** Left list pane; when closed it is gone entirely (the toggle lives in the app header). */
export function SidePane({
  open,
  label,
  children,
  ...props
}: BoxProps & {
  open: boolean
  label: string
}): React.JSX.Element | null {
  if (!open) return null
  return (
    <Box
      as="aside"
      aria-label={label}
      display="flex"
      flexDirection="column"
      flexShrink={0}
      borderRightWidth="1px"
      {...props}
    >
      {children}
    </Box>
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

/** Small uppercase section label used above lists and panels. */
export function SectionLabel({ children, ...props }: BoxProps): React.JSX.Element {
  return (
    <Box
      as="h2"
      fontSize="xs"
      fontWeight="bold"
      letterSpacing="widest"
      textTransform="uppercase"
      color="fg.muted"
      {...props}
    >
      {children}
    </Box>
  )
}

/** Selectable row in a side-pane list, with an accent bar on the left when selected. */
export function ListRow({
  selected,
  borderWidth = '2px',
  ...props
}: React.ComponentProps<typeof chakra.button> & {
  selected: boolean
}): React.JSX.Element {
  return (
    <chakra.button
      aria-current={selected}
      display="flex"
      w="full"
      alignItems="center"
      gap="3"
      borderLeftWidth={borderWidth}
      borderColor={selected ? 'brand.solid' : 'transparent'}
      bg={selected ? 'bg.muted' : undefined}
      _hover={{ bg: 'bg.muted' }}
      px="3"
      py="2.5"
      textAlign="left"
      cursor="pointer"
      {...props}
    />
  )
}
