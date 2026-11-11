import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { nativeSelectAnatomy } from '@chakra-ui/react/anatomy'
import {
  ACCENTS,
  ACCENT_COLORS,
  ACCENT_CONTRAST,
  NEUTRALS,
  STAGE_ACCENT,
  STAGE_STATUS,
  withAlpha,
  type AccentName
} from './palette'

/**
 * Chakra UI theme for Setlistic: dark-first, built to be read at a glance on a dim stage.
 *
 * Themes are classes on <html> (set by lib/theme.ts):
 *   light → `light`   dark (default) → `dark`   stage → `dark stage`
 * The accent is `data-accent` on <html> (left off in stage, whose accent is fixed red).
 *
 * RULE: components use only the semantic tokens below — never a palette step like gray.800.
 *
 * Colors
 *   bg.canvas · bg.panel · bg.subtle · bg.muted · bg.emphasized · bg.selected · bg.media · bg.webpage
 *   fg.default · fg.muted · fg.subtle · fg.error
 *   border (dividers) · border.emphasized (form controls, ≥ 3:1)
 *   accent.*  — use `colorPalette="accent"` on Chakra components
 *   success · warning · danger · info — status palettes (`colorPalette="success"`…)
 *   stemVocals … stemOther — one palette per audio stem
 *   accentSwatch.<name> — each accent's own color, for the accent picker
 * Chakra's built-in `bg`, `fg` and `gray.*` are re-pointed at the same values so its own
 * components follow every theme.
 */

const capitalize = (s: string): string => s[0].toUpperCase() + s.slice(1)
/** Condition names for an accent: light-theme value and dark-theme value. */
const accentCond = (a: AccentName): [string, string] => [
  `accent${capitalize(a)}`,
  `accent${capitalize(a)}Dark`
]

/** Selectors are on <html>. Compound selectors outrank `.dark`, so order never matters. */
const conditions: Record<string, string> = { stage: '.dark.stage &' }
for (const a of ACCENTS) {
  if (a === 'lime') continue // the default: plain base / _dark values
  const [light, dark] = accentCond(a)
  conditions[light] = `[data-accent=${a}] &`
  conditions[dark] = `.dark[data-accent=${a}] &`
}
/**
 * Density is `data-density` on any container (not just <html>): everything inside picks up
 * the row height, control height and icon size for that density.
 *   comfortable (default) — preparing songs · compact — long setlists · stage — live view
 */
conditions.densityCompact = '[data-density=compact] &'
conditions.densityStage = '[data-density=stage] &'

/** A size that changes with density. */
const dense = (
  comfortable: string,
  compact: string,
  stage: string
): { value: Record<string, string> } => ({
  value: { base: comfortable, _densityCompact: compact, _densityStage: stage }
})

type Tri = { light: string; dark: string; stage: string }
const tri = ({ light, dark, stage }: Tri): { value: Record<string, string> } => ({
  value: { base: light, _dark: dark, _stage: stage }
})

type AccentKey =
  'solid' | 'hover' | 'contrast' | 'fg' | 'muted' | 'subtle' | 'emphasized' | 'focusRing' | 'border'

function accentValue(
  color: { solid: string; hover: string },
  contrast: string,
  key: AccentKey
): string {
  switch (key) {
    case 'hover':
      return color.hover
    case 'contrast':
      return contrast
    case 'muted':
      return withAlpha(color.solid, 0.25)
    case 'subtle':
      return withAlpha(color.solid, 0.1)
    case 'emphasized':
      return withAlpha(color.solid, 0.35)
    default:
      return color.solid
  }
}

function accentToken(key: AccentKey): { value: Record<string, string> } {
  const value: Record<string, string> = {
    base: accentValue(ACCENT_COLORS.lime.light, ACCENT_CONTRAST.light, key),
    _dark: accentValue(ACCENT_COLORS.lime.dark, ACCENT_CONTRAST.dark, key),
    _stage: accentValue(STAGE_ACCENT, STAGE_ACCENT.contrast, key)
  }
  for (const a of ACCENTS) {
    if (a === 'lime') continue
    const [light, dark] = accentCond(a)
    value[`_${light}`] = accentValue(ACCENT_COLORS[a].light, ACCENT_CONTRAST.light, key)
    value[`_${dark}`] = accentValue(ACCENT_COLORS[a].dark, ACCENT_CONTRAST.dark, key)
  }
  return { value }
}

const ACCENT_KEYS: AccentKey[] = [
  'solid',
  'hover',
  'contrast',
  'fg',
  'muted',
  'subtle',
  'emphasized',
  'focusRing',
  'border'
]

/** A status palette: Chakra's palette in light/dark, a dimmed warm hue in stage. */
function statusPalette(
  palette: string,
  stageHex: string
): Record<string, { value: Record<string, string> }> {
  const keys = ['solid', 'contrast', 'fg', 'muted', 'subtle', 'emphasized', 'focusRing', 'border']
  const stage = (k: string): string =>
    k === 'contrast'
      ? '#000000'
      : k === 'muted'
        ? withAlpha(stageHex, 0.25)
        : k === 'subtle'
          ? withAlpha(stageHex, 0.12)
          : k === 'emphasized'
            ? withAlpha(stageHex, 0.35)
            : stageHex
  return Object.fromEntries(
    keys.map((k) => [k, { value: { base: `{colors.${palette}.${k}}`, _stage: stage(k) } }])
  )
}

const n = NEUTRALS

const config = defineConfig({
  conditions,
  globalCss: {
    'html, body, #root': { height: '100%' },
    body: {
      margin: 0,
      bg: 'bg.canvas',
      color: 'fg.default',
      fontFamily: 'body'
    },
    '::selection': { bg: 'accent.solid', color: 'accent.contrast' },
    // Fallback ring for plain clickable elements that have no Chakra recipe of their own
    'button, a, summary, [role="button"], [tabindex]:not([tabindex="-1"])': {
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'accent.focusRing',
        outlineOffset: '-2px'
      }
    },
    '*, *::before, *::after': {
      _motionReduce: {
        animationDuration: '0.01ms !important',
        animationIterationCount: '1 !important',
        transitionDuration: '0.01ms !important',
        scrollBehavior: 'auto !important'
      }
    }
  },
  theme: {
    // Chakra's default breakpoints drive the shell: below `lg` (1024px) the sidebar folds to a
    // rail, below `xl` (1280px) the inspector becomes a drawer (see components/shell.tsx).
    tokens: {
      fonts: {
        // LINE Seed Sans TH for all UI text (Thai + Latin), bundled in assets/fonts so it
        // works offline; system fonts are only a fallback while it loads.
        body: {
          value: "'LINE Seed Sans TH', 'Leelawadee UI', 'Segoe UI', system-ui, sans-serif"
        },
        heading: {
          value: "'LINE Seed Sans TH', 'Leelawadee UI', 'Segoe UI', system-ui, sans-serif"
        },
        // LINE Seed has proportional digits and no `tnum`, so numbers that must line up in
        // columns (key, BPM, time, counts) and chord/lyric sheets stay monospaced.
        mono: { value: "'Cascadia Mono', Consolas, 'Noto Sans Mono', ui-monospace, monospace" }
      },
      sizes: {
        pane: {
          /** Left list pane: drag its edge between min and max (240–320px) */
          sidebar: {
            DEFAULT: { value: '18rem' },
            min: { value: '15rem' },
            max: { value: '20rem' }
          },
          /** Sidebar folded to icons (Ctrl+B, or windows under 1024px) */
          rail: { value: '3.5rem' },
          /** Right detail pane: drag its edge between min and max (280–360px) */
          inspector: {
            DEFAULT: { value: '20rem' },
            min: { value: '17.5rem' },
            max: { value: '22.5rem' }
          },
          /** Running order in stage mode */
          stageOrder: { value: '18rem' }
        },
        page: {
          /** Setlist workspace */
          default: { value: '64rem' },
          /** Band settings */
          narrow: { value: '42rem' },
          /** Single small form (create band) */
          form: { value: '24rem' }
        },
        dialog: {
          md: { value: '45rem' }
        },
        control: {
          /** Band switcher in the app header */
          select: { value: '12rem' }
        }
      }
    },
    semanticTokens: {
      colors: {
        bg: {
          /** Chakra's own default; same as bg.canvas */
          DEFAULT: tri(n.canvas),
          canvas: tri(n.canvas),
          /** Cards, dialogs, toolbars */
          panel: tri(n.panel),
          subtle: tri(n.subtle),
          muted: tri(n.muted),
          emphasized: tri(n.emphasized),
          inverted: tri({ light: n.fg.light, dark: n.fg.dark, stage: n.emphasized.stage }),
          /** Selected list row */
          selected: { value: '{colors.accent.subtle}' },
          /** Behind embedded video */
          media: tri({ light: '#000000', dark: '#000000', stage: '#000000' }),
          /** Behind embedded chord sites, which are styled for a white page */
          webpage: tri({ light: '#ffffff', dark: '#ffffff', stage: '#ffffff' })
        },
        fg: {
          /** Chakra's own default; same as fg.default */
          DEFAULT: tri(n.fg),
          default: tri(n.fg),
          muted: tri(n.fgMuted),
          subtle: tri(n.fgSubtle),
          error: tri(n.fgError),
          inverted: tri({ light: n.canvas.light, dark: n.canvas.dark, stage: n.fg.stage })
        },
        border: {
          /** Dividers and card edges (decorative) */
          DEFAULT: tri(n.border),
          muted: tri(n.borderMuted),
          subtle: tri(n.borderSubtle),
          /** Edges of inputs, selects, checkboxes: ≥ 3:1 against canvas and panel */
          emphasized: tri(n.borderEmphasized),
          error: tri(n.fgError)
        },
        accent: Object.fromEntries(ACCENT_KEYS.map((k) => [k, accentToken(k)])),
        accentSwatch: Object.fromEntries(
          ACCENTS.map((a) => [
            a,
            {
              value: {
                base: ACCENT_COLORS[a].light.solid,
                _dark: ACCENT_COLORS[a].dark.solid,
                _stage: ACCENT_COLORS[a].dark.solid
              }
            }
          ])
        ),
        // Default (gray) controls: neutral surfaces of the active theme, accent focus ring
        gray: {
          solid: tri(n.fg),
          contrast: tri({ light: '#ffffff', dark: n.canvas.dark, stage: '#000000' }),
          fg: tri(n.fg),
          subtle: tri(n.muted),
          muted: tri(n.emphasized),
          emphasized: tri({ light: '#c9ced6', dark: '#363c48', stage: '#331512' }),
          focusRing: { value: '{colors.accent.focusRing}' },
          border: tri(n.border)
        },
        /** Chord symbols above the lyrics in a typed chord sheet */
        chord: { fg: { value: '{colors.accent.fg}' } },
        success: statusPalette('green', STAGE_STATUS.success),
        warning: statusPalette('orange', STAGE_STATUS.warning),
        danger: statusPalette('red', STAGE_STATUS.danger),
        info: statusPalette('blue', STAGE_STATUS.info),
        stemVocals: statusPalette('pink', STAGE_STATUS.danger),
        stemDrums: statusPalette('orange', STAGE_STATUS.warning),
        stemBass: statusPalette('purple', STAGE_STATUS.info),
        stemGuitar: statusPalette('red', STAGE_STATUS.danger),
        stemPiano: statusPalette('blue', STAGE_STATUS.info),
        stemOther: statusPalette('gray', n.fgMuted.stage)
      },
      /**
       * Layout. Spacing in components stays on the 4px scale: 1, 2, 3, 4, 6, 8, 12
       * (4, 8, 12, 16, 24, 32, 48px). Panels use these:
       */
      spacing: {
        panel: {
          /** Inner padding of every panel, and the shared left edge of its content */
          px: { value: '{spacing.4}' },
          /** Space between sections inside a panel */
          gap: { value: '{spacing.6}' }
        }
      },
      sizes: {
        panel: {
          headerH: { value: '{sizes.12}' },
          footerH: { value: '{sizes.10}' }
        },
        /** Height of one list/table row */
        row: { h: dense('2.75rem', '2.25rem', '3.5rem') },
        /** Height (and min width) of buttons and icon buttons that follow density */
        control: { h: dense('2.25rem', '2rem', '3rem') },
        /** Icons inside rows and controls */
        icon: { size: dense('1rem', '1rem', '1.5rem') },
        /** Setlist table columns: grip · # · song · key · BPM · time · actions */
        setlistColumns: {
          value: '{sizes.8} {sizes.14} minmax(0,1fr) {sizes.12} {sizes.12} {sizes.14} {sizes.16}'
        }
      },
      radii: {
        /** Cards, panels, tables */
        card: { value: '{radii.xl}' },
        /** Blocks nested inside a card, media frames */
        inset: { value: '{radii.lg}' },
        /** Badges, small tiles */
        chip: { value: '{radii.md}' }
      },
      shadows: {
        /** A row being dragged */
        lifted: {
          value: {
            base: '0 8px 24px rgba(17,19,24,0.16)',
            _dark: '0 8px 24px rgba(0,0,0,0.6)',
            _stage: '0 8px 24px rgba(0,0,0,0.9)'
          }
        }
      }
    },
    textStyles: {
      /** At most these three heading levels on one screen: page › section › item. */
      title: {
        /** The thing the screen is about (setlist name, song title) */
        page: {
          value: {
            fontFamily: 'heading',
            fontSize: 'xl',
            fontWeight: 'bold',
            lineHeight: '1.75rem'
          }
        },
        /** Panel headers and sections */
        section: {
          value: {
            fontFamily: 'heading',
            fontSize: 'md',
            fontWeight: 'semibold',
            lineHeight: '1.5rem'
          }
        },
        /** List rows and small blocks */
        item: { value: { fontSize: 'sm', fontWeight: 'semibold', lineHeight: '1.25rem' } }
      },
      /** Small label above a value or list. 12px, never uppercase (Thai has no case). */
      caption: {
        value: { fontSize: 'xs', fontWeight: 'semibold', lineHeight: '1rem', color: 'fg.muted' }
      },
      /** Section heading inside a page */
      label: {
        value: { fontSize: 'sm', fontWeight: 'semibold', lineHeight: '1.25rem', color: 'fg.muted' }
      },
      /** Key / BPM / time values */
      stat: {
        value: {
          fontFamily: 'mono',
          fontSize: 'xl',
          fontWeight: 'bold',
          lineHeight: '1.2',
          fontVariantNumeric: 'tabular-nums'
        }
      },
      /** Live view, read from 1–2 m away */
      stage: {
        label: {
          value: {
            fontSize: 'sm',
            fontWeight: 'semibold',
            lineHeight: '1.25rem',
            color: 'fg.muted'
          }
        },
        title: { value: { fontSize: '4xl', fontWeight: 'bold', lineHeight: '1.15' } },
        stat: {
          value: {
            fontFamily: 'mono',
            fontSize: '4xl',
            fontWeight: 'bold',
            lineHeight: '1',
            fontVariantNumeric: 'tabular-nums'
          }
        },
        cue: { value: { fontSize: 'xl', fontWeight: 'semibold', lineHeight: '1.4' } }
      }
    },
    // Compact desktop density: controls default to 36px high
    recipes: {
      button: { defaultVariants: { size: 'sm' } },
      input: {
        defaultVariants: { size: 'sm' },
        variants: { variant: { outline: { borderColor: 'border.emphasized' } } }
      },
      textarea: {
        defaultVariants: { size: 'sm' },
        variants: { variant: { outline: { borderColor: 'border.emphasized' } } }
      }
    },
    slotRecipes: {
      nativeSelect: {
        slots: nativeSelectAnatomy.keys(),
        defaultVariants: { size: 'sm' },
        variants: { variant: { outline: { field: { borderColor: 'border.emphasized' } } } }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)
