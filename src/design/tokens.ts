// Design token constants mirroring the CSS custom properties in src/index.css.
// This file is a leaf — zero imports from any other src/ module.

// ---------------------------------------------------------------------------
// Base Palette — colour tokens
// ---------------------------------------------------------------------------

export const COLOR_VOID = '#0a0a0f' as const;
export const COLOR_GRAVE_SOIL = '#1a1410' as const;
export const COLOR_STONE_DARK = '#2e2a26' as const;
export const COLOR_STONE_MID = '#4a4540' as const;
export const COLOR_STONE_WORN = '#6b635a' as const;
export const COLOR_STONE_CRUMBLED = '#8c7f72' as const;
export const COLOR_MOSS = '#2d4a2e' as const;
export const COLOR_FOG_BASE = '#c8d4e0' as const;
export const COLOR_GHOST_BODY = '#dce8f5' as const;
export const COLOR_GHOST_GLOW = '#a0c4ff' as const;
export const COLOR_CANDLE_FLAME = '#ffb347' as const;
export const COLOR_CANDLE_WAX = '#f5e6c8' as const;
export const COLOR_MOON_FULL = '#f0e8d0' as const;
export const COLOR_MOON_NEW = '#1e1e2a' as const;
export const COLOR_CROW = '#1a1a1f' as const;
export const COLOR_CROW_EYE = '#ff4444' as const;
export const COLOR_DANGER = '#c0392b' as const;
export const COLOR_WARNING = '#e67e22' as const;
export const COLOR_SUCCESS = '#27ae60' as const;
export const COLOR_TEXT_PRIMARY = '#e8e0d4' as const;
export const COLOR_TEXT_SECONDARY = '#9e9488' as const;
export const COLOR_TEXT_INVERSE = '#0a0a0f' as const;
export const COLOR_SURFACE_CARD = '#1e1a16' as const;
export const COLOR_SURFACE_PANEL = '#151210' as const;
export const COLOR_BORDER = '#3a342e' as const;
export const COLOR_FOCUS_RING = '#7eb8f7' as const;

// ---------------------------------------------------------------------------
// Motion timing tokens (milliseconds as numbers)
// ---------------------------------------------------------------------------

export const MOTION_INSTANT = 0 as const;
export const MOTION_FAST = 150 as const;
export const MOTION_NORMAL = 350 as const;
export const MOTION_SLOW = 600 as const;
export const MOTION_AMBIENT = 8000 as const;

// ---------------------------------------------------------------------------
// Type-level mapping: every CSS token name → TS constant name
// This object also serves as the authoritative list for the type-level test.
// ---------------------------------------------------------------------------

/** Maps every CSS custom property name to its TypeScript constant value. */
export const TOKEN_MAP = {
  '--color-void': COLOR_VOID,
  '--color-grave-soil': COLOR_GRAVE_SOIL,
  '--color-stone-dark': COLOR_STONE_DARK,
  '--color-stone-mid': COLOR_STONE_MID,
  '--color-stone-worn': COLOR_STONE_WORN,
  '--color-stone-crumbled': COLOR_STONE_CRUMBLED,
  '--color-moss': COLOR_MOSS,
  '--color-fog-base': COLOR_FOG_BASE,
  '--color-ghost-body': COLOR_GHOST_BODY,
  '--color-ghost-glow': COLOR_GHOST_GLOW,
  '--color-candle-flame': COLOR_CANDLE_FLAME,
  '--color-candle-wax': COLOR_CANDLE_WAX,
  '--color-moon-full': COLOR_MOON_FULL,
  '--color-moon-new': COLOR_MOON_NEW,
  '--color-crow': COLOR_CROW,
  '--color-crow-eye': COLOR_CROW_EYE,
  '--color-danger': COLOR_DANGER,
  '--color-warning': COLOR_WARNING,
  '--color-success': COLOR_SUCCESS,
  '--color-text-primary': COLOR_TEXT_PRIMARY,
  '--color-text-secondary': COLOR_TEXT_SECONDARY,
  '--color-text-inverse': COLOR_TEXT_INVERSE,
  '--color-surface-card': COLOR_SURFACE_CARD,
  '--color-surface-panel': COLOR_SURFACE_PANEL,
  '--color-border': COLOR_BORDER,
  '--color-focus-ring': COLOR_FOCUS_RING,
  '--motion-instant': MOTION_INSTANT,
  '--motion-fast': MOTION_FAST,
  '--motion-normal': MOTION_NORMAL,
  '--motion-slow': MOTION_SLOW,
  '--motion-ambient': MOTION_AMBIENT,
} as const;

export type TokenMap = typeof TOKEN_MAP;
export type CssTokenName = keyof TokenMap;
