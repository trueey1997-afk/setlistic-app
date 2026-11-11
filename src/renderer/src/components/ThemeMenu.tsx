import { Box, Menu, Portal, Text } from '@chakra-ui/react'
import { Moon, Palette, Sun, Theater } from 'lucide-react'
import { setAccent, setTheme, useThemeSettings } from '@renderer/lib/theme'
import {
  ACCENTS,
  ACCENT_LABEL,
  THEMES,
  THEME_LABEL,
  type AccentName,
  type ThemeName
} from '@renderer/theme/palette'
import { PanelAction } from './ui'

const THEME_ICON = { dark: Moon, light: Sun, stage: Theater }
const THEME_HINT: Record<ThemeName, string> = {
  dark: 'ค่าเริ่มต้น',
  light: 'เวทีที่แสงจ้า',
  stage: 'ดำสนิท สีแดงสลัว ถนอมสายตาในที่มืด'
}

/** Header button: theme (dark / light / stage). The icon shows the current one. Applies instantly. */
export function ThemeMenu(): React.JSX.Element {
  const { theme } = useThemeSettings()
  const Current = THEME_ICON[theme]

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <PanelAction label={`ธีม: ${THEME_LABEL[theme]}`}>
          <Current />
        </PanelAction>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="64">
            <Menu.RadioItemGroup
              value={theme}
              onValueChange={(e) => setTheme(e.value as ThemeName)}
            >
              <Menu.ItemGroupLabel>ธีม</Menu.ItemGroupLabel>
              {THEMES.map((t) => {
                const Icon = THEME_ICON[t]
                return (
                  <Menu.RadioItem key={t} value={t} py="2">
                    <Icon size={16} />
                    <Box flex="1">
                      <Text>{THEME_LABEL[t]}</Text>
                      <Text textStyle="caption" fontWeight="normal">
                        {THEME_HINT[t]}
                      </Text>
                    </Box>
                    <Menu.ItemIndicator />
                  </Menu.RadioItem>
                )
              })}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

/** Header button: accent color. The palette icon is tinted with the current accent. */
export function AccentMenu(): React.JSX.Element {
  const { theme, accent } = useThemeSettings()

  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <PanelAction label={`สีเน้น: ${ACCENT_LABEL[accent]}`} color="accent.fg">
          <Palette />
        </PanelAction>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="56">
            <Menu.RadioItemGroup
              value={accent}
              onValueChange={(e) => setAccent(e.value as AccentName)}
            >
              <Menu.ItemGroupLabel>สีเน้น</Menu.ItemGroupLabel>
              {theme === 'stage' && (
                <Text px="2" pb="1" textStyle="caption" fontWeight="normal">
                  ธีมเวทีใช้สีแดงเสมอ สีที่เลือกจะใช้ในธีมมืดและสว่าง
                </Text>
              )}
              {ACCENTS.map((a) => (
                <Menu.RadioItem key={a} value={a}>
                  <Box
                    boxSize="3.5"
                    rounded="full"
                    bg={`accentSwatch.${a}`}
                    borderWidth="1px"
                    borderColor="border.emphasized"
                  />
                  <Text flex="1">{ACCENT_LABEL[a]}</Text>
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
