/**
 * Contrast audit (WCAG AA) for the colour-token pairs in spooky-design-system §1.3,
 * plus the other foreground/background pairs the component CSS uses.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { contrastRatio, parseHex, relativeLuminance } from './contrast';
import {
  COLOR_CHART_BLOOD,
  COLOR_CHART_BONE,
  COLOR_CANDLE_FLAME,
  COLOR_CHART_MOSS,
  COLOR_DANGER,
  COLOR_FOCUS_RING,
  COLOR_FOG_BASE,
  COLOR_GRAVE_SOIL,
  COLOR_GROUND_FORE,
  COLOR_HALO,
  COLOR_HILL_FAR,
  COLOR_HILL_NEAR,
  COLOR_INK_SECONDARY,
  COLOR_IRON,
  COLOR_MOON_FULL,
  COLOR_MOON_NEW,
  COLOR_PARCHMENT,
  COLOR_TREE,
  COLOR_STONE_CRUMBLED,
  COLOR_STONE_DARK,
  COLOR_STONE_MID,
  COLOR_STONE_WORN,
  COLOR_SKY_HORIZON,
  COLOR_SKY_TOP,
  COLOR_SUCCESS,
  COLOR_SURFACE_CARD,
  COLOR_SURFACE_PANEL,
  COLOR_TEXT_PRIMARY,
  COLOR_TEXT_INVERSE,
  COLOR_TEXT_SECONDARY,
  COLOR_VOID,
  COLOR_WARNING,
  TOKEN_MAP,
} from './tokens';
import { MOON_HALO_RADIUS, MOON_RADIUS } from '../components/graveyard/visuals';

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

/** Seance parchment card and table (costume-polish CP-45 to CP-48). */
const SEANCE_PAIRS: Pair[] = [
  { name: 'text-inverse on parchment', fg: COLOR_TEXT_INVERSE, bg: COLOR_PARCHMENT, min: 4.5 },
  { name: 'ink-secondary on parchment', fg: COLOR_INK_SECONDARY, bg: COLOR_PARCHMENT, min: 4.5 },
  // The inner ring of the two-tone focus ring sits on the parchment.
  { name: 'void (inner focus ring) on parchment', fg: COLOR_VOID, bg: COLOR_PARCHMENT, min: 3 },
  // The outer ring sits on the table, which is a gradient from stone-dark to grave-soil.
  { name: 'focus-ring on grave-soil (table edge)', fg: COLOR_FOCUS_RING, bg: COLOR_GRAVE_SOIL, min: 3 },
  { name: 'focus-ring on stone-dark (table centre)', fg: COLOR_FOCUS_RING, bg: COLOR_STONE_DARK, min: 3 },
];

/** Ledger page and charts (costume-polish CP-49 to CP-51, CP-63). */
const LEDGER_PAIRS: Pair[] = [
  { name: 'chart-moss on surface-panel', fg: COLOR_CHART_MOSS, bg: COLOR_SURFACE_PANEL, min: 3 },
  { name: 'chart-blood on surface-panel', fg: COLOR_CHART_BLOOD, bg: COLOR_SURFACE_PANEL, min: 3 },
  { name: 'chart-bone on surface-panel', fg: COLOR_CHART_BONE, bg: COLOR_SURFACE_PANEL, min: 3 },
  // The ledger page is surface-panel with stone-dark ruled lines behind the text.
  { name: 'text-primary on ledger page', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SURFACE_PANEL, min: 4.5 },
  { name: 'text-primary on ledger ruling', fg: COLOR_TEXT_PRIMARY, bg: COLOR_STONE_DARK, min: 4.5 },
  { name: 'text-secondary on ledger page', fg: COLOR_TEXT_SECONDARY, bg: COLOR_SURFACE_PANEL, min: 4.5 },
  { name: 'text-secondary on ledger ruling', fg: COLOR_TEXT_SECONDARY, bg: COLOR_STONE_DARK, min: 4.5 },
  // The hatch lines are void drawn over the blood fill.
  { name: 'void (hatch line) on chart-blood', fg: COLOR_VOID, bg: COLOR_CHART_BLOOD, min: 3 },
  { name: 'ledger frame border on surface-panel', fg: COLOR_STONE_CRUMBLED, bg: COLOR_SURFACE_PANEL, min: 3 },
];

/**
 * Empty and first-run states (costume-polish CP-63). The fresh plot is outlined in
 * stone-worn against the backdrop ground; its focus stroke is the focus ring.
 * Text on the blank seance card and the blank ledger page reuses the parchment and
 * ledger pairs above; the invitation lines sit on the page wash (frame pairs).
 */
const EMPTY_STATE_PAIRS: Pair[] = [
  { name: 'fresh plot outline on hill-far', fg: COLOR_STONE_WORN, bg: COLOR_HILL_FAR, min: 3 },
  { name: 'fresh plot outline on hill-near', fg: COLOR_STONE_WORN, bg: COLOR_HILL_NEAR, min: 3 },
  { name: 'fresh plot outline on ground-fore', fg: COLOR_STONE_WORN, bg: COLOR_GROUND_FORE, min: 3 },
  { name: 'fresh plot outline on void (depth shade)', fg: COLOR_STONE_WORN, bg: COLOR_VOID, min: 3 },
  { name: 'focus-ring on hill-near', fg: COLOR_FOCUS_RING, bg: COLOR_HILL_NEAR, min: 3 },
  { name: 'focus-ring on ground-fore', fg: COLOR_FOCUS_RING, bg: COLOR_GROUND_FORE, min: 3 },
  { name: 'text-primary on blank ledger page', fg: COLOR_TEXT_PRIMARY, bg: COLOR_SURFACE_PANEL, min: 4.5 },
  { name: 'text-inverse on blank seance card', fg: COLOR_TEXT_INVERSE, bg: COLOR_PARCHMENT, min: 4.5 },
  { name: 'ink-secondary on blank seance card', fg: COLOR_INK_SECONDARY, bg: COLOR_PARCHMENT, min: 4.5 },
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
  ['seance table and parchment card', SEANCE_PAIRS],
  ['ledger page and charts', LEDGER_PAIRS],
  ['empty and first-run states', EMPTY_STATE_PAIRS],
])('WCAG AA: %s', (_label, pairs) => {
  it.each(pairs)('$name is at least $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('graveyard backdrop and moon (costume-polish CP-28, steering 6.2)', () => {
  it('moon-full on moon-new is at least 3:1, so the lit wedge reads against the unlit disc', () => {
    expect(contrastRatio(COLOR_MOON_FULL, COLOR_MOON_NEW)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['sky-top', COLOR_SKY_TOP],
    ['sky-horizon', COLOR_SKY_HORIZON],
    ['hill-far', COLOR_HILL_FAR],
    ['hill-near', COLOR_HILL_NEAR],
    ['tree', COLOR_TREE],
    ['iron', COLOR_IRON],
    ['ground-fore', COLOR_GROUND_FORE],
  ])('%s is darker than stone-dark, so tombstones stay in the foreground', (_name, colour) => {
    expect(relativeLuminance(colour)).toBeLessThan(relativeLuminance(COLOR_STONE_DARK));
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

/** 	op laid over ottom at lpha (0 to 1), as '#rrggbb'. */
function blend(top: string, bottom: string, alpha: number): string {
  const t = parseHex(top);
  const b = parseHex(bottom);
  return (
    '#' +
    t
      .map((channel, i) => Math.round(channel * alpha + (b[i] ?? 0) * (1 - alpha)))
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  );
}

describe('fog over grave focus (costume-polish CP-26)', () => {
  const MAX_FOG_OPACITY = 0.6;

  it('blend mixes two colours by alpha', () => {
    expect(blend('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(blend('#123456', '#abcdef', 1)).toBe('#123456');
    expect(blend('#123456', '#abcdef', 0)).toBe('#abcdef');
  });

  it('the focus ring under maximum fog stays at least 3:1 against grave-soil', () => {
    const fogged = blend(COLOR_FOG_BASE, COLOR_FOCUS_RING, MAX_FOG_OPACITY);
    expect(contrastRatio(fogged, COLOR_GRAVE_SOIL)).toBeGreaterThanOrEqual(3);
  });
});
/**
 * Sweep of Tasks 1 to 7 (costume-polish Task 8, CP-63): pairs the component CSS introduced
 * that the groups above do not already list.
 */
const SWEEP_PAIRS: Pair[] = [
  // The parchment card is the boundary of the card; it sits on the table gradient
  // (stone-dark at the centre, grave-soil at the edge).
  { name: 'parchment card on stone-dark (table centre)', fg: COLOR_PARCHMENT, bg: COLOR_STONE_DARK, min: 3 },
  { name: 'parchment card on grave-soil (table edge)', fg: COLOR_PARCHMENT, bg: COLOR_GRAVE_SOIL, min: 3 },
  { name: 'ink-secondary card border on parchment', fg: COLOR_INK_SECONDARY, bg: COLOR_PARCHMENT, min: 3 },
  // A lit flame must read against the table whether or not the glow is drawn.
  { name: 'candle-flame on stone-dark (table centre)', fg: COLOR_CANDLE_FLAME, bg: COLOR_STONE_DARK, min: 3 },
  { name: 'candle-flame on grave-soil (table edge)', fg: COLOR_CANDLE_FLAME, bg: COLOR_GRAVE_SOIL, min: 3 },
  // The unlit moon disc is told apart from the sky by its rim.
  { name: 'moon rim on moon-new (inner edge)', fg: COLOR_STONE_CRUMBLED, bg: COLOR_MOON_NEW, min: 3 },
];

describe.each([['sweep of tasks 1 to 7', SWEEP_PAIRS]])('WCAG AA: %s', (_label, pairs) => {
  it.each(pairs)('$name is at least $min:1', ({ fg, bg, min }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('sweep pairs that sit on a blended backdrop', () => {
  /** Halo opacity at the moon rim: linear between the 0.45 stop (0.18) and the centre stop (0.35). */
  const HALO_AT_RIM = 0.35 - ((0.35 - 0.18) * (MOON_RADIUS / MOON_HALO_RADIUS)) / 0.45;

  it('the halo opacity at the moon rim is the value the gradient gives', () => {
    expect(HALO_AT_RIM).toBeGreaterThan(0.18);
    expect(HALO_AT_RIM).toBeLessThan(0.35);
  });

  it('the moon rim is at least 3:1 against the halo at the rim, over the brightest sky', () => {
    const behind = blend(COLOR_HALO, COLOR_SKY_HORIZON, HALO_AT_RIM);
    expect(contrastRatio(COLOR_STONE_CRUMBLED, behind)).toBeGreaterThanOrEqual(3);
  });

  it('the crow outline is at least 3:1 against the sky at the top of the crow, and against the far hill', () => {
    // The crow perches at y = 258 and reaches 22 units above; the sky gradient runs over 340 units.
    const skyAtCrowTop = blend(COLOR_SKY_HORIZON, COLOR_SKY_TOP, (258 - 22) / 340);
    expect(contrastRatio(COLOR_STONE_CRUMBLED, skyAtCrowTop)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(COLOR_STONE_CRUMBLED, COLOR_HILL_FAR)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(COLOR_STONE_CRUMBLED, COLOR_SKY_HORIZON)).toBeGreaterThanOrEqual(3);
  });

  it('graveyard.css keeps the crow outline on stone-crumbled, the colour audited above', () => {
    const css = readFileSync(resolve(SRC, 'components/graveyard/graveyard.css'), 'utf8');
    const body = /\.gr-crow__body\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(body).toMatch(/stroke:\s*var\(--color-stone-crumbled\)/);
  });
});