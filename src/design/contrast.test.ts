/**
 * Contrast audit (WCAG AA) for the colour-token pairs in spooky-design-system §1.3,
 * plus the other foreground/background pairs the component CSS uses.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from './contrast';
import {
  COLOR_DANGER,
  COLOR_FOCUS_RING,
  COLOR_GRAVE_SOIL,
  COLOR_STONE_CRUMBLED,
  COLOR_STONE_DARK,
  COLOR_STONE_MID,
  COLOR_SKY_HORIZON,
  COLOR_SKY_TOP,
  COLOR_SUCCESS,
  COLOR_SURFACE_CARD,
  COLOR_SURFACE_PANEL,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_SECONDARY,
  COLOR_VOID,
  COLOR_WARNING,
  TOKEN_MAP,
} from './tokens';

interface Pair {
  name: string;
  fg: string;
  bg: string;
  min: number;
}

/** The pairs listed in spooky-design-system §1.3. */
const SECTION_1_3: Pair[] = [
  { name: 'text-primary on void', fg: COLOR_TEXT_PRIMARY, bg: COLOR_VOID, min: 4.5 },
  { name: 'text-secondary on void', fg: COLOR_TEXT_SECONDARY, bg: COLOR_VOID, min: 3 },
  { name: 'text-primary on surface-card', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SURFACE_CARD, min: 4.5 },
  { name: 'focus-ring on void', fg: COLOR_FOCUS_RING, bg: COLOR_VOID, min: 3 },
  // Grade buttons are drawn on the card surface (stone-dark on hover); the grade
  // colour is carried by the border, so the label is text-primary.
  { name: 'grade label on button', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SURFACE_CARD, min: 4.5 },
  { name: 'grade label on button (hover)', fg: COLOR_TEXT_PRIMARY, bg: COLOR_STONE_DARK, min: 4.5 },
];

/** Other pairs the component CSS relies on. */
const COMPONENT_PAIRS: Pair[] = [
  // AC-27.1: all normal text, including secondary text, is 4.5:1.
  { name: 'text-secondary on void', fg: COLOR_TEXT_SECONDARY, bg: COLOR_VOID, min: 4.5 },
  { name: 'text-secondary on surface-card', fg: COLOR_TEXT_SECONDARY, bg: COLOR_SURFACE_CARD, min: 4.5 },
  { name: 'text-secondary on surface-panel', fg: COLOR_TEXT_SECONDARY, bg: COLOR_SURFACE_PANEL, min: 4.5 },
  { name: 'text-secondary on stone-dark (hover)', fg: COLOR_TEXT_SECONDARY, bg: COLOR_STONE_DARK, min: 4.5 },
  { name: 'text-primary on surface-panel', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SURFACE_PANEL, min: 4.5 },
  { name: 'text-primary on stone-mid (primary button)', fg: COLOR_TEXT_PRIMARY, bg: COLOR_STONE_MID, min: 4.5 },
  // AC-27.3: focus indicators are 3:1 against every surface they sit on.
  { name: 'focus-ring on surface-card', fg: COLOR_FOCUS_RING, bg: COLOR_SURFACE_CARD, min: 3 },
  { name: 'focus-ring on surface-panel', fg: COLOR_FOCUS_RING, bg: COLOR_SURFACE_PANEL, min: 3 },
  { name: 'focus-ring on grave-soil', fg: COLOR_FOCUS_RING, bg: COLOR_GRAVE_SOIL, min: 3 },
  { name: 'focus-ring on stone-dark', fg: COLOR_FOCUS_RING, bg: COLOR_STONE_DARK, min: 3 },
  { name: 'focus-ring on stone-mid', fg: COLOR_FOCUS_RING, bg: COLOR_STONE_MID, min: 3 },
  // AC-27.2: component boundaries (buttons, inputs, caption bar) are 3:1.
  { name: 'button/input border on void', fg: COLOR_STONE_CRUMBLED, bg: COLOR_VOID, min: 3 },
  { name: 'button/input border on surface-card', fg: COLOR_STONE_CRUMBLED, bg: COLOR_SURFACE_CARD, min: 3 },
  { name: 'button/input border on surface-panel', fg: COLOR_STONE_CRUMBLED, bg: COLOR_SURFACE_PANEL, min: 3 },
  { name: 'danger border on surface-card', fg: COLOR_DANGER, bg: COLOR_SURFACE_CARD, min: 3 },
  { name: 'warning border on surface-card', fg: COLOR_WARNING, bg: COLOR_SURFACE_CARD, min: 3 },
  { name: 'success border on surface-card', fg: COLOR_SUCCESS, bg: COLOR_SURFACE_CARD, min: 3 },
];

/** Page frame (costume-polish CP-12, CP-63): the night-sky wash and the stone-slab tabs. */
const FRAME_PAIRS: Pair[] = [
  { name: 'text-primary on sky-top', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SKY_TOP, min: 4.5 },
  { name: 'text-primary on sky-horizon', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SKY_HORIZON, min: 4.5 },
  { name: 'text-secondary on sky-top', fg: COLOR_TEXT_SECONDARY, bg: COLOR_SKY_TOP, min: 4.5 },
  { name: 'text-secondary on sky-horizon', fg: COLOR_TEXT_SECONDARY, bg: COLOR_SKY_HORIZON, min: 4.5 },
  { name: 'focus-ring on sky-top', fg: COLOR_FOCUS_RING, bg: COLOR_SKY_TOP, min: 3 },
  { name: 'focus-ring on sky-horizon', fg: COLOR_FOCUS_RING, bg: COLOR_SKY_HORIZON, min: 3 },
  { name: 'tab border on stone-dark', fg: COLOR_STONE_CRUMBLED, bg: COLOR_STONE_DARK, min: 3 },
];

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#7eb8f7', '#7eb8f7')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio(COLOR_TEXT_PRIMARY, COLOR_VOID)).toBeCloseTo(contrastRatio(COLOR_VOID, COLOR_TEXT_PRIMARY), 10);
  });

  it('computes luminance of pure red as 0.2126', () => {
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 4);
  });

  it('rejects colours that are not #rrggbb', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow();
  });
});

describe.each([
  ['spooky-design-system §1.3', SECTION_1_3],
  ['component CSS', COMPONENT_PAIRS],
  ['page frame', FRAME_PAIRS],
])('WCAG AA: %s', (_label, pairs) => {
  it.each(pairs)('$name is at least $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('stone-slab tab pairs', () => {
  const known = new Set([...SECTION_1_3, ...COMPONENT_PAIRS].map((p) => `${p.fg}/${p.bg}/${p.min}`));

  it.each([
    ['text-primary on stone-dark', COLOR_TEXT_PRIMARY, COLOR_STONE_DARK, 4.5],
    ['text-primary on stone-mid', COLOR_TEXT_PRIMARY, COLOR_STONE_MID, 4.5],
    ['focus-ring on stone-dark', COLOR_FOCUS_RING, COLOR_STONE_DARK, 3],
    ['focus-ring on stone-mid', COLOR_FOCUS_RING, COLOR_STONE_MID, 3],
  ])('%s is already audited', (_name, fg, bg, min) => {
    expect(known.has(`${fg}/${bg}/${min}`)).toBe(true);
  });
});

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('index.css mirrors the TypeScript tokens', () => {
  const css = readFileSync(resolve(SRC, 'index.css'), 'utf8');

  it.each(Object.entries(TOKEN_MAP).filter(([, value]) => typeof value === 'string'))(
    '%s has the same value in CSS and TS',
    (name, value) => {
      const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
      expect(match?.[1]?.toLowerCase()).toBe(String(value).toLowerCase());
    },
  );
});

describe('known failing pair stays unused', () => {
  it('text-primary on danger red is below AA, so no button may use that combination', () => {
    expect(contrastRatio(COLOR_TEXT_PRIMARY, COLOR_DANGER)).toBeLessThan(4.5);
    const deckCss = readFileSync(resolve(SRC, 'components/deck/deck.css'), 'utf8');
    const danger = /\.gr-btn--danger\s*\{([^}]*)\}/.exec(deckCss)?.[1] ?? '';
    expect(danger).not.toMatch(/background:\s*var\(--color-danger\)/);
  });
});
