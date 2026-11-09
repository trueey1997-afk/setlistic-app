import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { nativeSelectAnatomy } from '@chakra-ui/react/anatomy'

/**
 * Chakra UI theme for Setlistic.
 *
 * Light theme for bright stages, dark (default) for dim rooms. Dark mode follows the
 * `dark` / `light` class on <html> (see lib/theme.ts), which is what Chakra's `_dark` uses.
 *
 * Chakra's own semantic tokens (bg, fg, border…) are re-pointed at the app palette, so every
 * built-in component picks it up. `brand` is a full color palette: use it with
 * `colorPalette="brand"` on any Chakra component (Button, Badge, Checkbox, Slider…).
 */
const config = defineConfig({
  globalCss: {
    'html, body, #root': { height: '100%' },
    body: {
      margin: 0,
      bg: 'bg',
      color: 'fg',
      fontFamily: 'body'
    },
    '::selection': { bg: 'brand.solid', color: 'brand.contrast' }
  },
  theme: {
    tokens: {
      fonts: {
        // System fonts only, so the app looks right with no internet
        body: { value: "'Segoe UI', 'Leelawadee UI', 'Noto Sans Thai', system-ui, sans-serif" },
        heading: {
          value: "'Segoe UI', 'Leelawadee UI', 'Noto Sans Thai', system-ui, sans-serif"
        },
        mono: { value: "'Cascadia Mono', Consolas, 'Noto Sans Mono', ui-monospace, monospace" }
      }
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { base: '#f6f6f6', _dark: '#0f1115' } },
          /** Cards, dialogs, toolbars */
          panel: { value: { base: '#ffffff', _dark: '#1a1d24' } },
          muted: { value: { base: '#ededed', _dark: '#242832' } },
          subtle: { value: { base: '#f0f0f0', _dark: '#1d2028' } },
          emphasized: { value: { base: '#e2e2e2', _dark: '#2e3340' } }
        },
        fg: {
          DEFAULT: { value: { base: '#141414', _dark: '#ffffff' } },
          muted: { value: { base: '#666666', _dark: '#9ca3af' } },
          subtle: { value: { base: '#8a8a8a', _dark: '#6b7280' } },
          error: { value: { base: '#dc2626', _dark: '#f05252' } }
        },
        border: {
          DEFAULT: { value: { base: '#dddddd', _dark: '#2a2e37' } },
          muted: { value: { base: '#e6e6e6', _dark: '#23272f' } },
          subtle: { value: { base: '#eeeeee', _dark: '#1f232b' } },
          emphasized: { value: { base: '#cccccc', _dark: '#3a3f4b' } }
        },
        /** Electric lime (dark) / dark lime that reads as text on white (light) */
        brand: {
          solid: { value: { base: '#4d7c0f', _dark: '#d4ff00' } },
          hover: { value: { base: '#3f6212', _dark: '#bfe600' } },
          contrast: { value: { base: '#ffffff', _dark: '#0f1115' } },
          fg: { value: { base: '#4d7c0f', _dark: '#d4ff00' } },
          muted: { value: { base: 'rgba(77,124,15,0.25)', _dark: 'rgba(212,255,0,0.25)' } },
          subtle: { value: { base: 'rgba(77,124,15,0.10)', _dark: 'rgba(212,255,0,0.10)' } },
          emphasized: { value: { base: 'rgba(77,124,15,0.35)', _dark: 'rgba(212,255,0,0.35)' } },
          focusRing: { value: { base: '#4d7c0f', _dark: '#d4ff00' } },
          border: { value: { base: '#4d7c0f', _dark: '#d4ff00' } }
        }
      }
    },
    // Compact desktop density: controls default to 36px high
    recipes: {
      button: { defaultVariants: { size: 'sm' } },
      input: { defaultVariants: { size: 'sm' } },
      textarea: { defaultVariants: { size: 'sm' } }
    },
    slotRecipes: {
      nativeSelect: { slots: nativeSelectAnatomy.keys(), defaultVariants: { size: 'sm' } }
    }
  }
})

export const system = createSystem(defaultConfig, config)
