/**
 * Raw color values for every theme and accent. Only theme/system.ts reads this file;
 * components use the semantic tokens built from it (bg.canvas, fg.default, accent.solid…).
 */

export const THEMES = ['dark', 'light', 'stage'] as const
export type ThemeName = (typeof THEMES)[number]

export const THEME_LABEL: Record<ThemeName, string> = {
  dark: 'มืด',
  light: 'สว่าง',
  stage: 'เวที (มืดสุด)'
}

export const ACCENTS = ['lime', 'blue', 'violet', 'emerald', 'amber', 'rose'] as const
export type AccentName = (typeof ACCENTS)[number]

export const ACCENT_LABEL: Record<AccentName, string> = {
  lime: 'Lime',
  blue: 'Blue',
  violet: 'Violet',
  emerald: 'Emerald',
  amber: 'Amber',
  rose: 'Rose'
}

/** Each accent's main color per theme: `fg` is ≥ 4.5:1 on the canvas, `contrast` sits on `solid`. */
export const ACCENT_COLORS: Record<
  AccentName,
  { light: { solid: string; hover: string }; dark: { solid: string; hover: string } }
> = {
  lime: {
    light: { solid: '#3f6212', hover: '#365314' },
    dark: { solid: '#d4ff00', hover: '#bfe600' }
  },
  blue: {
    light: { solid: '#1d4ed8', hover: '#1e40af' },
    dark: { solid: '#60a5fa', hover: '#93c5fd' }
  },
  violet: {
    light: { solid: '#6d28d9', hover: '#5b21b6' },
    dark: { solid: '#a78bfa', hover: '#c4b5fd' }
  },
  emerald: {
    light: { solid: '#047857', hover: '#065f46' },
    dark: { solid: '#34d399', hover: '#6ee7b7' }
  },
  amber: {
    light: { solid: '#b45309', hover: '#92400e' },
    dark: { solid: '#fbbf24', hover: '#fcd34d' }
  },
  rose: {
    light: { solid: '#be123c', hover: '#9f1239' },
    dark: { solid: '#fb7185', hover: '#fda4af' }
  }
}

/** Light accents carry white text; dark accents carry the dark canvas color. */
export const ACCENT_CONTRAST = { light: '#ffffff', dark: '#0b0d11' }

/**
 * Stage: pure black and dim red light only, so eyes stay adjusted to a dark stage
 * (rod cells are least sensitive to long-wavelength red). The accent is fixed to red here.
 */
export const STAGE_ACCENT = { solid: '#ff4433', hover: '#ff6a55', contrast: '#000000' }

/** Neutral surfaces and text per theme. All text pairs pass WCAG AA on canvas and panel. */
export const NEUTRALS = {
  canvas: { light: '#f4f5f7', dark: '#0b0d11', stage: '#000000' },
  panel: { light: '#ffffff', dark: '#15181f', stage: '#0c0606' },
  subtle: { light: '#eef0f3', dark: '#111419', stage: '#070303' },
  muted: { light: '#e7e9ed', dark: '#1e222b', stage: '#170a09' },
  emphasized: { light: '#d9dde3', dark: '#2a2f3a', stage: '#24100e' },
  fg: { light: '#111318', dark: '#f2f4f7', stage: '#f08a78' },
  fgMuted: { light: '#4f5663', dark: '#a7afbd', stage: '#cc6f60' },
  fgSubtle: { light: '#5f6673', dark: '#8c95a5', stage: '#bd6352' },
  fgError: { light: '#c81e1e', dark: '#f87171', stage: '#ff6a55' },
  /** Dividers and card edges (decorative) */
  border: { light: '#d3d7de', dark: '#2e3440', stage: '#2e1513' },
  borderMuted: { light: '#e1e4e9', dark: '#252a34', stage: '#241110' },
  borderSubtle: { light: '#eaecf0', dark: '#1c2028', stage: '#1a0c0b' },
  /** Form control edges: ≥ 3:1 against canvas and panel */
  borderEmphasized: { light: '#80878f', dark: '#6b7486', stage: '#a3443a' }
} as const

/** Status hues in Stage: dimmed and warm so they stay apart without bright green/blue light. */
export const STAGE_STATUS = {
  success: '#9fae5a',
  warning: '#e0913f',
  danger: '#ff6a55',
  info: '#c98a7a'
}

/** "#rrggbb" + alpha → "rgba(…)" */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
