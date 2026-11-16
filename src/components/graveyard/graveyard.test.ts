/**
 * Graveyard scene tests (Task 9): pure visual mappings plus component behaviour.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';

import {
  activeDeckId,
  addCard,
  addReviewLog,
  cards,
  createDeck,
  dailyGoal,
  decks,
  getCardRetrievability,
  reviewLog,
  updateCardSrs,
  type Card,
} from '../../store';
import { locale, reducedMotion, reducedMotionUser } from '../../store/prefs';
import { crowCaw } from '../../audio/sounds';
import {
  COLOR_STONE_CRUMBLED,
  COLOR_STONE_DARK,
} from '../../design/tokens';
import { addDays } from '../../utils/date';

import { CrowKeeper, resetCrowKeeperMemory } from './CrowKeeper';
import { FogLayer } from './FogLayer';
import { GraveyardScene } from './GraveyardScene';
import { Ghost, GHOST_HEIGHT, GHOST_WIDTH } from './Ghost';
import { MoonPhase } from './MoonPhase';
import {
  clamp,
  daysPastDue,
  ghostDriftSeconds,
  ghostOpacity,
  layoutYard,
  moonArcPath,
  round,
  tombstoneCrackOpacity,
  tombstoneFill,
  tombstoneMossOpacity,
  BACK_SCALE,
  CLEAR_STRIP_HEIGHT,
  FRONT_SCALE,
  MAX_COLUMNS,
  MAX_DEPTH_SHADE,
  MAX_TILT_DEGREES,
  TOMBSTONE_HEIGHT,
  TOMBSTONE_WIDTH,
  YARD_HEIGHT,
  YARD_WIDTH,
} from './visuals';

vi.mock('../../audio/sounds', () => ({ crowCaw: vi.fn() }));

const DAY_MS = 24 * 60 * 60 * 1000;

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  dailyGoal.value = 20;
  reducedMotionUser.value = false;
  reducedMotion.value = false;
  resetCrowKeeperMemory();
  vi.clearAllMocks();
}

beforeEach(resetState);
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, 'visibilityState');
  resetState();
});

/** Adds a card to a (new or given) crypt and applies SRS overrides. */
function makeCard(
  front: string,
  srs: { stability?: number; dueDate?: Date; lastReviewed?: Date | null } = {},
  deckId = createDeck('Crypt').id,
): Card {
  const card = addCard(deckId, front, `${front} (back)`, null);
  updateCardSrs(card.id, { ...card.srs, ...srs });
  const updated = cards.value.find((c) => c.id === card.id);
  if (updated === undefined) throw new Error('card missing');
  return updated;
}

/** A card that is overdue: due `daysAgo` calendar days ago, last reviewed before that. */
function makeOverdueCard(front: string, daysAgo = 3): Card {
  return makeCard(front, {
    stability: 2,
    dueDate: addDays(new Date(), -daysAgo),
    lastReviewed: addDays(new Date(), -daysAgo - 2),
  });
}

function logReviewsOnDaysAgo(daysAgoList: number[]): void {
  const first = cards.value[0];
  if (first === undefined) throw new Error('need a card first');
  for (const d of daysAgoList) {
    addReviewLog({ date: new Date(Date.now() - d * DAY_MS), cardId: first.id, grade: 2, correct: true });
  }
}

/** Standalone SVG parts need an <svg> ancestor so their elements get the SVG namespace. */
function inSvg(child: h.JSX.Element): h.JSX.Element {
  return h('svg', null, child);
}

function graves(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.gr-tombstone'));
}

function ghosts(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.gr-ghost'));
}

describe('visual mappings (spooky-design-system master table)', () => {
  it('tombstone fill runs from stone-crumbled at 0 to stone-dark at 60+ days', () => {
    expect(tombstoneFill(0)).toBe(COLOR_STONE_CRUMBLED);
    expect(tombstoneFill(60)).toBe(COLOR_STONE_DARK);
    expect(tombstoneFill(500)).toBe(COLOR_STONE_DARK);
    expect(tombstoneFill(30)).toBe('#5d554c');
  });

  it('crack opacity is 1 - stability/60 and moss is stability/60 capped at 0.6', () => {
    expect(tombstoneCrackOpacity(0)).toBe(1);
    expect(tombstoneCrackOpacity(30)).toBe(0.5);
    expect(tombstoneCrackOpacity(60)).toBe(0);
    expect(tombstoneMossOpacity(0)).toBe(0);
    expect(tombstoneMossOpacity(30)).toBe(0.5);
    expect(tombstoneMossOpacity(60)).toBe(0.6);
  });

  it('ghost opacity is clamp(1 - R, 0.15, 0.95)', () => {
    expect(ghostOpacity(1)).toBe(0.15);
    expect(ghostOpacity(0.5)).toBe(0.5);
    expect(ghostOpacity(0)).toBe(0.95);
  });

  it('ghost drift is max(3, 12 - days * 1.5) seconds', () => {
    expect(ghostDriftSeconds(0)).toBe(12);
    expect(ghostDriftSeconds(2)).toBe(9);
    expect(ghostDriftSeconds(6)).toBe(3);
    expect(ghostDriftSeconds(100)).toBe(3);
  });

  it('daysPastDue is 0 for future due dates', () => {
    const now = new Date();
    expect(daysPastDue(addDays(now, 4), now)).toBe(0);
    expect(daysPastDue(now, now)).toBe(0);
  });

  it('moon arc: nothing at 0, wedge in between, full circle at 1', () => {
    expect(moonArcPath(0, 10, 10, 5)).toBe('');
    expect(moonArcPath(0.25, 10, 10, 5)).toBe('M 10 10 L 10 5 A 5 5 0 0 1 15 10 Z');
    expect(moonArcPath(0.75, 10, 10, 5)).toBe('M 10 10 L 10 5 A 5 5 0 1 1 5 10 Z');
    expect(moonArcPath(1, 10, 10, 5)).toContain('A 5 5 0 1 1 10 15');
    expect(moonArcPath(7, 10, 10, 5)).toBe(moonArcPath(1, 10, 10, 5));
  });

  it('properties: outputs stay inside their documented ranges', () => {
    fc.assert(
      fc.property(fc.double({ min: -10, max: 1000, noNaN: true }), (s) => {
        const crack = tombstoneCrackOpacity(s);
        const moss = tombstoneMossOpacity(s);
        return crack >= 0 && crack <= 1 && moss >= 0 && moss <= 0.6 && /^#[0-9a-f]{6}$/.test(tombstoneFill(s));
      }),
    );
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const o = ghostOpacity(lo);
        return o >= 0.15 && o <= 0.95 && ghostOpacity(hi) <= o;
      }),
    );
    fc.assert(
      fc.property(fc.nat({ max: 400 }), fc.nat({ max: 400 }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const d = ghostDriftSeconds(lo);
        return d >= 3 && d <= 12 && ghostDriftSeconds(hi) <= d;
      }),
    );
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (p) => {
        const path = moonArcPath(p, 50, 50, 20);
        return p === 0 ? path === '' : path.startsWith('M ') && path.endsWith('Z');
      }),
    );
  });

  it('layout gives every grave a distinct in-bounds position (up to 250 cards)', () => {
    fc.assert(
      fc.property(fc.nat({ max: 250 }), (n) => {
        const layout = layoutYard(n);
        const keys = new Set(layout.positions.map((p) => `${p.x},${p.y}`));
        return (
          layout.positions.length === n &&
          keys.size === n &&
          layout.columns <= MAX_COLUMNS &&
          layout.positions.every(
            (p) =>
              p.x - (TOMBSTONE_WIDTH * p.scale) / 2 >= 0 &&
              p.x + (TOMBSTONE_WIDTH * p.scale) / 2 <= YARD_WIDTH &&
              p.y - TOMBSTONE_HEIGHT * p.scale >= 0 &&
              p.y <= YARD_HEIGHT,
          )
        );
      }),
    );
  });
  it('clamp and round behave', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(round(0.123456)).toBe(0.123);
  });
});

describe('layoutYard', () => {
  /** Vertical overlap of each row with the row behind it, as a fraction of the rear grave's height. */
  function worstRowOverlap(count: number): number {
    const { positions } = layoutYard(count);
    const firstOfRow = new Map<number, (typeof positions)[number]>();
    for (const p of positions) if (!firstOfRow.has(p.row)) firstOfRow.set(p.row, p);
    let worst = 0;
    for (const [row, front] of firstOfRow) {
      const rear = firstOfRow.get(row - 1);
      if (rear === undefined) continue;
      const overlap = rear.y - (front.y - TOMBSTONE_HEIGHT * front.scale);
      worst = Math.max(worst, overlap / (TOMBSTONE_HEIGHT * rear.scale));
    }
    return worst;
  }

  it('lays out counts 0 to 250 inside the viewBox, in rows, within the steering limits', () => {
    fc.assert(
      fc.property(fc.nat({ max: 250 }), (n) => {
        const { positions, columns, rows } = layoutYard(n);
        expect(positions).toHaveLength(n);
        expect(rows).toBe(Math.ceil(n / columns));
        expect(new Set(positions.map((p) => `${p.x},${p.y}`)).size).toBe(n);

        const rowScale = new Map<number, number>();
        const byRow = new Map<number, typeof positions[number][]>();
        positions.forEach((p, i) => {
          // Index maps to row and column, so arrow-key movement by `columns` stays a grid move.
          expect(p.row).toBe(Math.floor(i / columns));
          expect(p.col).toBe(i % columns);

          const halfWidth = (TOMBSTONE_WIDTH * p.scale) / 2;
          expect(p.x - halfWidth).toBeGreaterThanOrEqual(0);
          expect(p.x + halfWidth).toBeLessThanOrEqual(YARD_WIDTH);
          expect(p.y - TOMBSTONE_HEIGHT * p.scale).toBeGreaterThanOrEqual(0);
          // Nothing in the clear strip at the bottom of the stage.
          expect(p.y).toBeLessThanOrEqual(YARD_HEIGHT - CLEAR_STRIP_HEIGHT);

          expect(p.scale).toBeGreaterThanOrEqual(BACK_SCALE);
          expect(p.scale).toBeLessThanOrEqual(FRONT_SCALE);
          expect(Math.abs(p.tilt)).toBeLessThanOrEqual(MAX_TILT_DEGREES);
          expect(p.shade).toBeGreaterThanOrEqual(0);
          expect(p.shade).toBeLessThanOrEqual(MAX_DEPTH_SHADE);

          rowScale.set(p.row, p.scale);
          byRow.set(p.row, [...(byRow.get(p.row) ?? []), p]);
        });

        // Scale does not shrink toward the front.
        const scales = [...rowScale.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
        scales.forEach((s, i) => {
          if (i > 0) expect(s).toBeGreaterThanOrEqual(scales[i - 1] ?? 0);
        });

        // No horizontal overlap within a row.
        for (const row of byRow.values()) {
          const sorted = [...row].sort((a, b) => a.x - b.x);
          sorted.forEach((p, i) => {
            const next = sorted[i + 1];
            if (next === undefined) return;
            const gap = next.x - p.x - (TOMBSTONE_WIDTH * (p.scale + next.scale)) / 2;
            expect(gap).toBeGreaterThanOrEqual(0);
          });
        }
      }),
    );
  });

  it('runs scale from 0.7 at the back row to 1.0 at the front row', () => {
    const { positions, rows } = layoutYard(150);
    expect(rows).toBeGreaterThan(1);
    expect(positions[0]?.scale).toBe(BACK_SCALE);
    expect(positions[positions.length - 1]?.scale).toBe(FRONT_SCALE);
  });

  it('is deterministic and depends only on the count', () => {
    fc.assert(
      fc.property(fc.nat({ max: 250 }), (n) => {
        expect(layoutYard(n)).toEqual(layoutYard(n));
      }),
    );
  });

  it('keeps vertical overlap with the row behind at most 30% up to 150 cards', () => {
    for (let n = 1; n <= 150; n++) expect(worstRowOverlap(n)).toBeLessThanOrEqual(0.3);
  });

  it('keeps vertical overlap with the row behind at most 45% up to 200 cards', () => {
    for (let n = 1; n <= 200; n++) expect(worstRowOverlap(n)).toBeLessThanOrEqual(0.45);
  });

  it('keeps every grave at least 24 px wide on the 720p stage (1040 px for 1200 units)', () => {
    const pxPerUnit = 1040 / YARD_WIDTH;
    for (let n = 1; n <= 200; n++) {
      const narrowest = Math.min(...layoutYard(n).positions.map((p) => TOMBSTONE_WIDTH * p.scale));
      expect(narrowest * pxPerUnit).toBeGreaterThanOrEqual(24);
    }
  });

  it('stays inside the viewBox and free of horizontal overlap beyond 250 cards', () => {
    for (const n of [251, 400, 1000]) {
      const { positions } = layoutYard(n);
      expect(positions).toHaveLength(n);
      for (const p of positions) {
        expect(p.x - (TOMBSTONE_WIDTH * p.scale) / 2).toBeGreaterThanOrEqual(0);
        expect(p.x + (TOMBSTONE_WIDTH * p.scale) / 2).toBeLessThanOrEqual(YARD_WIDTH);
        expect(p.y).toBeLessThanOrEqual(YARD_HEIGHT - CLEAR_STRIP_HEIGHT);
      }
    }
  });
});

describe('graveyard stage', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const stageCss = readFileSync(resolve(here, 'graveyard.css'), 'utf8');
  const frameCss = readFileSync(resolve(here, '../frame/frame.css'), 'utf8');
  const indexCss = readFileSync(resolve(here, '../../index.css'), 'utf8');

  function viewBoxFor(count: number): string | null {
    const deck = createDeck(`Crypt ${count}`);
    for (let i = 0; i < count; i++) addCard(deck.id, `w${i}`, 'x', null);
    const { container, unmount } = render(h(GraveyardScene, null));
    const viewBox = container.querySelector('svg.gr-scene')?.getAttribute('viewBox') ?? null;
    unmount();
    decks.value = [];
    cards.value = [];
    activeDeckId.value = null;
    return viewBox;
  }

  it('renders the same fixed viewBox for 0, 1, 150 and 200 cards', () => {
    const boxes = [0, 1, 150, 200].map(viewBoxFor);
    expect(boxes[0]).toBe(`0 0 ${YARD_WIDTH} ${YARD_HEIGHT}`);
    expect(new Set(boxes).size).toBe(1);
  });

  it('wraps the svg in a scrolling wrapper and a stage, with meet scaling', () => {
    makeCard('one');
    const { container } = render(h(GraveyardScene, null));
    const svg = container.querySelector('.gr-stage-scroll > .gr-stage > svg.gr-scene');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
  });

  it('draws a depth-shade overlay on each grave without touching the mapped fill', () => {
    const deck = createDeck('Shade');
    for (let i = 0; i < 40; i++) addCard(deck.id, `w${i}`, 'x', null);
    const { container } = render(h(GraveyardScene, null));
    const all = graves(container);
    expect(all.every((g) => g.querySelector('.gr-tombstone__shade') !== null)).toBe(true);
    all.forEach((g, i) => {
      const stability = cards.value[i]?.srs.stability ?? Number.NaN;
      expect(g.style.getPropertyValue('--tombstone-fill')).toBe(tombstoneFill(stability));
    });
    const shades = all.map((g) => Number(g.style.getPropertyValue('--depth-shade')));
    expect(Math.max(...shades)).toBeLessThanOrEqual(MAX_DEPTH_SHADE);
    expect(Math.min(...shades)).toBe(0);
  });

  it('sizes the stage from aspect-ratio and the dynamic viewport height', () => {
    expect(stageCss).toContain('aspect-ratio');
    expect(stageCss).toMatch(/width:\s*min\([^;]*100dvh[^;]*\)/);
    expect(stageCss).not.toContain('80vh');
    expect(stageCss).toMatch(/\.gr-stage-scroll\s*\{[^}]*overflow-x:\s*auto/);
    expect(stageCss).toMatch(/\.gr-stage\s*\{[^}]*min-width:\s*45rem/);
  });

  it('sets no min-height above 100vh on the root, the frame or the graveyard', () => {
    const selectors: ReadonlyArray<readonly [string, string]> = [
      ['#grave-recall-root', indexCss + frameCss + stageCss],
      ['.gr-frame', indexCss + frameCss + stageCss],
      ['.gr-graveyard', indexCss + frameCss + stageCss],
    ];
    for (const [selector, css] of selectors) {
      const escaped = selector.replace(/[.#]/g, '\\$&');
      const blocks = [...css.matchAll(new RegExp(`(?:^|[\\n}])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
      for (const block of blocks) {
        for (const decl of (block[1] ?? '').matchAll(/min-height:\s*([^;]+);/g)) {
          const value = decl[1]?.trim() ?? '';
          const vh = /^(\d+(?:\.\d+)?)(?:vh|dvh|svh|lvh)$/.exec(value);
          // Any min-height here must be a viewport fraction of at most 100.
          expect(vh, `${selector} min-height: ${value}`).not.toBeNull();
          expect(Number(vh?.[1])).toBeLessThanOrEqual(100);
        }
      }
    }
  });
});
describe('<GraveyardScene>', () => {
  it('renders one tombstone per card', () => {
    const deck = createDeck('A');
    for (const word of ['one', 'two', 'three']) addCard(deck.id, word, 'x', null);
    const { container } = render(h(GraveyardScene, null));
    expect(graves(container)).toHaveLength(3);
  });

  it('renders 200 cards', () => {
    const deck = createDeck('Big');
    for (let i = 0; i < 200; i++) addCard(deck.id, `w${i}`, 'x', null);
    const { container } = render(h(GraveyardScene, null));
    expect(graves(container)).toHaveLength(200);
  });

  it('shows only the active crypt, or an explicit deckId, and all cards when neither', () => {
    const a = createDeck('A');
    const b = createDeck('B');
    addCard(a.id, 'a1', 'x', null);
    addCard(a.id, 'a2', 'x', null);
    addCard(b.id, 'b1', 'x', null);

    const all = render(h(GraveyardScene, null));
    expect(graves(all.container)).toHaveLength(3);
    all.unmount();

    activeDeckId.value = b.id;
    const active = render(h(GraveyardScene, null));
    expect(graves(active.container)).toHaveLength(1);
    active.unmount();

    const explicit = render(h(GraveyardScene, { deckId: a.id }));
    expect(graves(explicit.container)).toHaveLength(2);
  });

  it('shows an empty-state message when there are no cards', () => {
    const { container } = render(h(GraveyardScene, null));
    expect(screen.getByText('No graves yet. Add cards to a crypt to begin.')).toBeTruthy();
    expect(graves(container)).toHaveLength(0);
  });

  it('updates reactively when a card is added', async () => {
    const deck = createDeck('A');
    addCard(deck.id, 'one', 'x', null);
    const { container } = render(h(GraveyardScene, null));
    expect(graves(container)).toHaveLength(1);
    await act(() => {
      addCard(deck.id, 'two', 'x', null);
    });
    expect(graves(container)).toHaveLength(2);
  });

  it('renders a ghost only for overdue cards', () => {
    const overdue = makeOverdueCard('haunted');
    makeCard('fresh', { dueDate: addDays(new Date(), 5), lastReviewed: new Date() });
    makeCard('today', { dueDate: new Date(), lastReviewed: null });
    const { container } = render(h(GraveyardScene, null));

    expect(graves(container)).toHaveLength(3);
    const found = ghosts(container);
    expect(found).toHaveLength(1);
    expect(found[0]?.getAttribute('data-ghost-for')).toBe(overdue.id);
  });

  it('sets ghost opacity and drift speed from retrievability and days past due', () => {
    const card = makeOverdueCard('haunted', 3);
    const now = new Date();
    const { container } = render(h(GraveyardScene, null));
    const ghost = ghosts(container)[0];
    expect(ghost?.style.getPropertyValue('--ghost-opacity')).toBe(
      String(round(ghostOpacity(getCardRetrievability(card, now)))),
    );
    expect(ghost?.style.getPropertyValue('--ghost-drift-speed')).toBe(
      `${round(ghostDriftSeconds(daysPastDue(card.srs.dueDate, now)))}s`,
    );
  });

  it('applies the drift animation class normally and removes it under reduced motion', async () => {
    makeOverdueCard('haunted');
    const { container } = render(h(GraveyardScene, null));
    expect(ghosts(container)[0]?.classList.contains('gr-ghost--drift')).toBe(true);

    await act(() => {
      reducedMotion.value = true;
    });
    expect(ghosts(container)).toHaveLength(1); // still shown as a static icon
    expect(ghosts(container)[0]?.classList.contains('gr-ghost--drift')).toBe(false);
    expect(container.querySelector('.gr-fog__layer--pulse')).toBeNull();
  });

  it('removes the drift class when the user override is switched on', async () => {
    makeOverdueCard('haunted');
    const { container } = render(inSvg(h(Ghost, { card: cards.value[0] as Card, x: 0, y: 0, now: new Date() })));
    expect(container.querySelector('.gr-ghost--drift')).not.toBeNull();
    await act(() => {
      reducedMotionUser.value = true;
    });
    expect(container.querySelector('.gr-ghost--drift')).toBeNull();
  });

  it('pauses fog and ghosts while the tab is hidden', async () => {
    makeOverdueCard('haunted');
    const { container } = render(h(GraveyardScene, null));
    expect(container.querySelector('.gr-fog__layer--paused')).toBeNull();

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    await act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(container.querySelector('.gr-fog__layer--paused')).not.toBeNull();
    expect(container.querySelector('.gr-scene--hidden')).not.toBeNull();
  });
});

describe('<Tombstone>', () => {
  it('has role, tabindex and an aria-label with the front text and due date', () => {
    const due = new Date(2031, 4, 17);
    makeCard('revenant', { dueDate: due, lastReviewed: null });
    const { container } = render(h(GraveyardScene, null));
    const grave = graves(container)[0];
    expect(grave?.getAttribute('role')).toBe('button');
    expect(grave?.getAttribute('tabindex')).toBe('0');
    expect(grave?.getAttribute('aria-label')).toBe('Grave for revenant, due 17 May 2031');
  });

  it('localises the aria-label', () => {
    locale.value = 'ja';
    makeCard('revenant', { dueDate: new Date(2031, 4, 17), lastReviewed: null });
    const { container } = render(h(GraveyardScene, null));
    const label = graves(container)[0]?.getAttribute('aria-label') ?? '';
    expect(label).toContain('revenant');
    expect(label).toContain('2031');
    expect(label).not.toContain('Grave for');
  });

  it('derives CSS custom properties from stability', () => {
    makeCard('fragile', { stability: 0 });
    makeCard('solid', { stability: 60 });
    const { container } = render(h(GraveyardScene, null));
    const [fragile, solid] = graves(container);

    expect(fragile?.style.getPropertyValue('--tombstone-fill')).toBe(COLOR_STONE_CRUMBLED);
    expect(fragile?.style.getPropertyValue('--tombstone-crack-opacity')).toBe('1');
    expect(fragile?.style.getPropertyValue('--tombstone-moss-opacity')).toBe('0');

    expect(solid?.style.getPropertyValue('--tombstone-fill')).toBe(COLOR_STONE_DARK);
    expect(solid?.style.getPropertyValue('--tombstone-crack-opacity')).toBe('0');
    expect(solid?.style.getPropertyValue('--tombstone-moss-opacity')).toBe('0.6');
  });
});

describe('<FogLayer>', () => {
  it('uses the fogOpacity signal and an feTurbulence + feDisplacementMap filter', () => {
    makeOverdueCard('late');
    makeCard('fresh', { dueDate: addDays(new Date(), 3), lastReviewed: new Date() });
    const { container } = render(inSvg(h(FogLayer, { width: 400, height: 300 })));
    const layer = container.querySelector<SVGElement>('.gr-fog__layer');
    expect(layer?.style.getPropertyValue('--fog-opacity')).toBe('0.5');
    expect(container.querySelector('filter feTurbulence')).not.toBeNull();
    expect(container.querySelector('filter feDisplacementMap')).not.toBeNull();
    // The filter moved from the wrapper to the static wisps group (costume-polish Task 4),
    // so the drifting banks are never filtered.
    expect(layer?.querySelector('.gr-fog__wisps')?.getAttribute('filter')).toBe('url(#gr-fog-filter)');
  });

  it('clamps to the 0.05 floor and 0.6 ceiling', () => {
    const empty = render(inSvg(h(FogLayer, { width: 400, height: 300 })));
    expect(empty.container.querySelector<SVGElement>('.gr-fog__layer')?.style.getPropertyValue('--fog-opacity')).toBe('0.05');
    empty.unmount();

    makeOverdueCard('late1');
    makeOverdueCard('late2');
    const all = render(inSvg(h(FogLayer, { width: 400, height: 300 })));
    expect(all.container.querySelector<SVGElement>('.gr-fog__layer')?.style.getPropertyValue('--fog-opacity')).toBe('0.6');
  });
});

describe('<MoonPhase>', () => {
  it('describes daily goal progress and draws the matching wedge', () => {
    makeCard('seed');
    dailyGoal.value = 10;
    logReviewsOnDaysAgo([0, 0, 0, 0, 0]);
    const { container } = render(inSvg(h(MoonPhase, { cx: 50, cy: 50, r: 20 })));
    expect(container.querySelector('.gr-moon')?.getAttribute('aria-label')).toBe(
      'Moon phase: 5 of 10 daily reviews done (50%)',
    );
    expect(container.querySelector('.gr-moon__lit')?.getAttribute('d')).toBe(moonArcPath(0.5, 50, 50, 20));
  });

  it('draws no wedge at 0% and a full circle at 100%', async () => {
    makeCard('seed');
    dailyGoal.value = 2;
    const { container } = render(inSvg(h(MoonPhase, null)));
    expect(container.querySelector('.gr-moon__lit')).toBeNull();

    await act(() => {
      logReviewsOnDaysAgo([0, 0, 0]);
    });
    expect(container.querySelector('.gr-moon')?.getAttribute('data-progress')).toBe('100');
    expect(container.querySelector('.gr-moon__lit')?.getAttribute('d')).toBe(moonArcPath(1, 64, 64, 28));
  });

  it('plays the wax animation on change, but not under reduced motion', async () => {
    makeCard('seed');
    dailyGoal.value = 10;
    const { container } = render(inSvg(h(MoonPhase, null)));
    await act(() => {
      logReviewsOnDaysAgo([0]);
    });
    expect(container.querySelector('.gr-moon__lit--wax')).not.toBeNull();

    reducedMotion.value = true;
    await act(() => {
      logReviewsOnDaysAgo([0]);
    });
    expect(container.querySelector('.gr-moon__lit')).not.toBeNull();
    expect(container.querySelector('.gr-moon__lit--wax')).toBeNull();
  });
});

describe('<CrowKeeper>', () => {
  it('shows only the gate when there is no streak', () => {
    const { container } = render(inSvg(h(CrowKeeper, null)));
    expect(container.querySelector('.gr-gate')).not.toBeNull();
    expect(container.querySelector('.gr-crow')).toBeNull();
  });

  it('glows the eye from a 3-day streak, not before', () => {
    makeCard('seed');
    logReviewsOnDaysAgo([1, 0]);
    const two = render(inSvg(h(CrowKeeper, null)));
    expect(two.container.querySelector('.gr-crow__eye')).not.toBeNull();
    expect(two.container.querySelector('.gr-crow__eye--glow')).toBeNull();
    two.unmount();

    logReviewsOnDaysAgo([2]);
    const three = render(inSvg(h(CrowKeeper, null)));
    expect(three.container.querySelector('.gr-crow__eye--glow')).not.toBeNull();
    expect(three.container.querySelector('.gr-crow')?.getAttribute('aria-label')).toBe(
      'Crow keeper: 3-day streak',
    );
  });

  it('does not hop or caw for a streak that already existed on first mount', () => {
    makeCard('seed');
    logReviewsOnDaysAgo([2, 1, 0]);
    const { container } = render(inSvg(h(CrowKeeper, null)));
    expect(container.querySelector('.gr-crow--hop')).toBeNull();
    expect(crowCaw).not.toHaveBeenCalled();
  });

  it('hops once and plays crowCaw() when the streak grows', async () => {
    makeCard('seed');
    logReviewsOnDaysAgo([1]);
    const { container } = render(inSvg(h(CrowKeeper, null)));
    expect(crowCaw).not.toHaveBeenCalled();

    await act(() => {
      logReviewsOnDaysAgo([0]);
    });
    expect(crowCaw).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.gr-crow--hop')).not.toBeNull();

    fireEvent.animationEnd(container.querySelector('.gr-crow') as Element);
    await waitFor(() => expect(container.querySelector('.gr-crow--hop')).toBeNull());
  });

  it('still caws but does not animate under reduced motion', async () => {
    makeCard('seed');
    reducedMotion.value = true;
    logReviewsOnDaysAgo([1]);
    const { container } = render(inSvg(h(CrowKeeper, null)));
    await act(() => {
      logReviewsOnDaysAgo([0]);
    });
    expect(crowCaw).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.gr-crow--hop')).toBeNull();
  });

  it('notices a streak earned while the graveyard was unmounted', () => {
    makeCard('seed');
    logReviewsOnDaysAgo([1]);
    render(inSvg(h(CrowKeeper, null))).unmount();

    logReviewsOnDaysAgo([0]); // a session happens elsewhere
    const { container } = render(inSvg(h(CrowKeeper, null)));
    expect(crowCaw).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.gr-crow--hop')).not.toBeNull();
  });
});

describe('backdrop (spooky-design-system section 6)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const backdropSource = readFileSync(resolve(here, 'Backdrop.tsx'), 'utf8');
  const stageCss = readFileSync(resolve(here, 'graveyard.css'), 'utf8');

  /** Renders the scene after `setup` and returns the serialised `.gr-backdrop` markup. */
  function backdropMarkup(setup: () => void): string {
    resetState();
    setup();
    const { container, unmount } = render(h(GraveyardScene, null));
    const markup = Array.from(container.querySelectorAll('.gr-backdrop'))
      .map((el) => el.outerHTML)
      .join('\n');
    unmount();
    resetState();
    return markup;
  }

  function populate150(): void {
    const deck = createDeck('Many');
    for (let i = 0; i < 150; i++) {
      const card = addCard(deck.id, `w${i}`, 'x', null);
      const overdue = i % 3 === 0;
      updateCardSrs(card.id, {
        ...card.srs,
        stability: (i * 7) % 90,
        dueDate: addDays(new Date(), overdue ? -4 : 6),
        lastReviewed: addDays(new Date(), overdue ? -8 : -1),
      });
    }
  }

  it('renders identical backdrop markup for an empty store, 150 cards, a streak and Japanese', () => {
    const empty = backdropMarkup(() => undefined);
    const many = backdropMarkup(populate150);
    const streak = backdropMarkup(() => {
      populate150();
      logReviewsOnDaysAgo([0, 1, 2, 3, 4]);
    });
    const japanese = backdropMarkup(() => {
      populate150();
      locale.value = 'ja';
    });
    expect(empty).not.toBe('');
    expect(many).toBe(empty);
    expect(streak).toBe(empty);
    expect(japanese).toBe(empty);
  });

  it('marks every backdrop element inert: aria-hidden, no role, tabindex, text or title', () => {
    populate150();
    logReviewsOnDaysAgo([0, 1, 2]);
    const { container } = render(h(GraveyardScene, null));
    const roots = Array.from(container.querySelectorAll('.gr-backdrop'));
    expect(roots.length).toBeGreaterThanOrEqual(3); // back, front, gate
    for (const root of roots) {
      expect(root.getAttribute('aria-hidden')).toBe('true');
      expect(root.hasAttribute('role')).toBe(false);
      expect(root.querySelector('[role], [tabindex], text, title')).toBeNull();
      expect(root.hasAttribute('tabindex')).toBe(false);
      expect(root.textContent).toBe('');
    }
  });

  it('keeps Backdrop.tsx free of randomness, clocks and store reads', () => {
    for (const banned of ['Math.random', 'Date', '@preact/signals', "from '../../store"]) {
      expect(backdropSource, banned).not.toContain(banned);
    }
  });

  it('keeps data-reserved colours out of the backdrop and gate CSS rules', () => {
    const reserved = [
      '--color-ghost-body',
      '--color-ghost-glow',
      '--color-fog-base',
      '--color-crow-eye',
      '--color-candle-flame',
      '--color-moon-full',
      '--color-danger',
      '--color-warning',
      '--color-success',
    ];
    const rules = [...stageCss.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([, selector]) =>
      /\.gr-backdrop|\.gr-gate/.test(selector ?? ''),
    );
    expect(rules.length).toBeGreaterThan(5);
    for (const [, selector, body] of rules) {
      for (const token of reserved) expect(body, `${selector?.trim()} uses ${token}`).not.toContain(token);
    }
    expect(stageCss).toMatch(/\.gr-backdrop\s*\{[^}]*pointer-events:\s*none/);
  });

  it('draws one sky gradient, two hills, at least three trees, a fence and the gate', () => {
    const { container } = render(h(GraveyardScene, null));
    expect(container.querySelectorAll('linearGradient#gr-sky-gradient')).toHaveLength(1);
    expect(container.querySelectorAll('.gr-backdrop__hill')).toHaveLength(2);
    expect(container.querySelectorAll('.gr-backdrop__tree').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector('.gr-backdrop__fence')).not.toBeNull();
    expect(container.querySelector('.gr-gate')).not.toBeNull();
  });

  it('paints the backdrop behind the graves and the foreground strip in front of them', () => {
    makeCard('one');
    const { container } = render(h(GraveyardScene, null));
    const all = Array.from(container.querySelectorAll('svg.gr-scene *'));
    const back = container.querySelector('.gr-backdrop--back') as Element;
    const front = container.querySelector('.gr-backdrop--front') as Element;
    const grave = container.querySelector('.gr-tombstone') as Element;
    expect(all.indexOf(back)).toBeLessThan(all.indexOf(grave));
    expect(all.indexOf(front)).toBeGreaterThan(all.indexOf(grave));
  });

  it('draws a moon of radius 56 or more whose wedge still comes from moonArcPath', () => {
    makeCard('seed');
    dailyGoal.value = 10;
    logReviewsOnDaysAgo([0, 0, 0, 0, 0]);
    const { container } = render(h(GraveyardScene, null));
    const disc = container.querySelector('.gr-moon__disc');
    expect(Number(disc?.getAttribute('r'))).toBeGreaterThanOrEqual(56);
    expect(container.querySelector('.gr-moon')?.getAttribute('data-progress')).toBe('50');
    expect(container.querySelector('.gr-moon__lit')?.getAttribute('d')).toBe(
      moonArcPath(
        0.5,
        Number(disc?.getAttribute('cx')),
        Number(disc?.getAttribute('cy')),
        Number(disc?.getAttribute('r')),
      ),
    );
  });

  it('centres the halo on the moon with a constant opacity of at most 0.35', () => {
    const { container } = render(h(GraveyardScene, null));
    const halo = container.querySelector('.gr-backdrop__halo');
    const disc = container.querySelector('.gr-moon__disc');
    expect(halo?.getAttribute('cx')).toBe(disc?.getAttribute('cx'));
    expect(halo?.getAttribute('cy')).toBe(disc?.getAttribute('cy'));
    const opacities = Array.from(container.querySelectorAll('.gr-backdrop__halo-stop')).map((s) =>
      Number(s.getAttribute('stop-opacity')),
    );
    expect(opacities.length).toBeGreaterThan(1);
    expect(Math.max(...opacities)).toBeLessThanOrEqual(0.35);
  });
});

describe('card detail panel', () => {  function openFirstGrave(container: Element): HTMLElement {
    const grave = graves(container)[0] as HTMLElement;
    grave.focus();
    fireEvent.keyDown(grave, { key: 'Enter' });
    return grave;
  }

  it('opens on Enter and shows front, back, example, stability, retrievability and due date', async () => {
    const deck = createDeck('A');
    const card = addCard(deck.id, 'spectre', 'a ghost', 'The spectre drifted by.');
    const lastReviewed = addDays(new Date(), -2);
    updateCardSrs(card.id, {
      ...card.srs,
      stability: 12.34,
      dueDate: new Date(2031, 4, 17),
      lastReviewed,
    });
    const { container } = render(h(GraveyardScene, null));
    openFirstGrave(container);

    const dialog = await screen.findByRole('dialog');
    const text = dialog.textContent ?? '';
    const stored = cards.value[0] as Card;
    expect(text).toContain('spectre');
    expect(text).toContain('a ghost');
    expect(text).toContain('The spectre drifted by.');
    expect(text).toContain('12.3 days');
    expect(text).toContain(`${Math.round(getCardRetrievability(stored) * 100)}%`);
    expect(text).toContain('17 May 2031');
  });

  it('opens on click and on Space, and omits the example when the card has none', async () => {
    makeCard('plain');
    const { container } = render(h(GraveyardScene, null));
    const grave = graves(container)[0] as HTMLElement;

    fireEvent.click(grave);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('.gr-detail__example')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.keyDown(grave, { key: ' ' });
    await screen.findByRole('dialog');
  });

  it('moves focus to the close button on open', async () => {
    makeCard('plain');
    const { container } = render(h(GraveyardScene, null));
    openFirstGrave(container);
    const close = await screen.findByRole('button', { name: 'Close dialog' });
    await waitFor(() => expect(document.activeElement).toBe(close));
  });

  it('closes on Escape and restores focus to the tombstone', async () => {
    makeCard('plain');
    const { container } = render(h(GraveyardScene, null));
    const grave = openFirstGrave(container);
    await screen.findByRole('dialog');

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(grave);
  });

  it('closes with the close button and restores focus to the tombstone', async () => {
    makeCard('plain');
    const { container } = render(h(GraveyardScene, null));
    const grave = openFirstGrave(container);
    fireEvent.click(await screen.findByRole('button', { name: 'Close dialog' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(grave);
  });

  it('closes itself if the card is deleted while open', async () => {
    makeCard('plain');
    const { container } = render(h(GraveyardScene, null));
    openFirstGrave(container);
    await screen.findByRole('dialog');
    await act(() => {
      cards.value = [];
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('soft layered fog and larger ghosts (costume-polish Task 4)', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(resolve(here, 'graveyard.css'), 'utf8');

  function fogLayer(container: Element): SVGElement | null {
    return container.querySelector<SVGElement>('.gr-fog__layer');
  }

  function banks(container: Element): SVGElement[] {
    return Array.from(container.querySelectorAll<SVGElement>('.gr-fog__bank'));
  }

  /** The body of @keyframes name { ... }, found by matching braces. */
  function keyframes(name: string): string {
    const start = css.indexOf('@keyframes ' + name);
    expect(start, name + ' keyframes exist').toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
    }
    throw new Error('unterminated keyframes ' + name);
  }

  /** Every CSS property name declared inside a keyframes body. */
  function animatedProperties(body: string): Set<string> {
    return new Set(Array.from(body.matchAll(/([a-z-]+)\s*:/g), (m) => m[1] ?? ''));
  }

  /** Sign of the translateX distance reached by the keyframe's last frame. */
  function driftSign(name: string): number {
    const body = keyframes(name);
    const to = /(?:to|100%)\s*\{[^}]*translateX\((-?\d+(?:\.\d+)?)px\)/.exec(body);
    expect(to, name + ' ends in a translateX').not.toBeNull();
    return Math.sign(Number(to?.[1]));
  }

  function populateFor150(): void {
    const deck = createDeck('Many');
    for (let i = 0; i < 150; i++) {
      const card = addCard(deck.id, 'w' + i, 'x', null);
      if (i % 3 === 0) {
        updateCardSrs(card.id, {
          ...card.srs,
          stability: 2,
          dueDate: addDays(new Date(), -3),
          lastReviewed: addDays(new Date(), -5),
        });
      }
    }
  }

  function follows(reference: Element, other: Element): boolean {
    return (reference.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  }

  describe('fog banks', () => {
    it('has at least three banks, each filled with a gradient that fades to alpha 0', () => {
      const { container } = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      const all = banks(container);
      expect(all.length).toBeGreaterThanOrEqual(3);
      for (const bank of all) {
        const fill = bank.getAttribute('fill') ?? '';
        const id = /^url\(#([^)]+)\)$/.exec(fill)?.[1];
        expect(id, 'bank fill is a url(#id) reference').toBeDefined();
        const gradient = container.querySelector('radialGradient[id="' + id + '"]');
        expect(gradient).not.toBeNull();
        const stops = Array.from(gradient?.querySelectorAll('stop') ?? []);
        const last = stops[stops.length - 1];
        expect(last?.getAttribute('offset')).toBe('1');
        expect(Number(last?.getAttribute('stop-opacity'))).toBe(0);
      }
    });

    it('owns its opacity on the wrapper only and filters only the static wisps', () => {
      makeOverdueCard('late');
      const { container } = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      const layer = fogLayer(container);
      expect(layer?.style.getPropertyValue('--fog-opacity')).toBe('0.6');
      for (const bank of banks(container)) {
        expect(bank.getAttribute('filter')).toBeNull();
        expect(bank.getAttribute('opacity')).toBeNull();
        expect(bank.getAttribute('style')).toBeNull();
        expect(bank.closest('.gr-fog__wisps')).toBeNull();
      }
      expect(container.querySelector('.gr-fog__wisps')?.getAttribute('filter')).toBe('url(#gr-fog-filter)');
      expect(container.querySelector('filter feGaussianBlur')).not.toBeNull();
    });

    it('keeps --fog-opacity at 0.05 with nothing overdue, 0.1 with 1 of 10 and 0.6 with 10 of 10', () => {
      const empty = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      expect(fogLayer(empty.container)?.style.getPropertyValue('--fog-opacity')).toBe('0.05');
      empty.unmount();

      const deck = createDeck('Ten');
      for (let i = 0; i < 10; i++) addCard(deck.id, 'w' + i, 'x', null);
      const first = cards.value[0] as Card;
      updateCardSrs(first.id, { ...first.srs, dueDate: addDays(new Date(), -2), lastReviewed: addDays(new Date(), -4) });
      const one = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      expect(fogLayer(one.container)?.style.getPropertyValue('--fog-opacity')).toBe('0.1');
      one.unmount();

      for (const card of cards.value) {
        updateCardSrs(card.id, { ...card.srs, dueDate: addDays(new Date(), -2), lastReviewed: addDays(new Date(), -4) });
      }
      const all = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      expect(fogLayer(all.container)?.style.getPropertyValue('--fog-opacity')).toBe('0.6');
    });

    it('drifts the banks under full motion, applies nothing under reduced motion, pauses when hidden', async () => {
      const { container } = render(inSvg(h(FogLayer, { width: 1200, height: 600 })));
      for (const suffix of ['a', 'b', 'c']) {
        expect(container.querySelector('.gr-fog__bank--drift-' + suffix)).not.toBeNull();
      }
      expect(container.querySelector('.gr-fog__layer--pulse')).not.toBeNull();

      await act(() => {
        reducedMotion.value = true;
      });
      expect(container.querySelector('[class*="--drift-"]')).toBeNull();
      expect(container.querySelector('.gr-fog__layer--pulse')).toBeNull();
      expect(banks(container).length).toBeGreaterThanOrEqual(3);

      await act(() => {
        reducedMotion.value = false;
      });
      expect(container.querySelector('.gr-fog__layer--paused')).toBeNull();
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      await act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(container.querySelector('.gr-fog__layer--paused')).not.toBeNull();
    });

    it('pauses the bank animations in CSS while hidden', () => {
      expect(css).toMatch(/\.gr-fog__layer--paused \.gr-fog__bank[^{]*\{[^}]*animation-play-state:\s*paused/);
    });
  });

  describe('fog CSS', () => {
    it.each(['fog-drift-a', 'fog-drift-b', 'fog-drift-c'])('%s animates transform only', (name) => {
      expect(Array.from(animatedProperties(keyframes(name)))).toEqual(
        expect.arrayContaining(['transform']),
      );
      const props = animatedProperties(keyframes(name));
      props.delete('from');
      props.delete('to');
      expect(Array.from(props)).toEqual(['transform']);
    });

    it('takes drift durations as calc(var(--motion-ambient) * N) with N of at least 5', () => {
      for (const suffix of ['a', 'b', 'c']) {
        const rule = new RegExp('\\.gr-fog__bank--drift-' + suffix + '\\s*\\{([^}]*)\\}').exec(css)?.[1] ?? '';
        const n = /animation:\s*fog-drift-[abc]\s+calc\(var\(--motion-ambient\)\s*\*\s*(\d+)\)/.exec(rule)?.[1];
        expect(n, 'duration of drift-' + suffix).toBeDefined();
        expect(Number(n)).toBeGreaterThanOrEqual(5);
        expect(rule).toContain('alternate');
        expect(rule).toContain('infinite');
      }
    });

    it('drifts a and c one way and b the other way', () => {
      expect(driftSign('fog-drift-a')).toBe(-1);
      expect(driftSign('fog-drift-c')).toBe(driftSign('fog-drift-a'));
      expect(driftSign('fog-drift-b')).toBe(-driftSign('fog-drift-a'));
    });

    it('extends ghost-drift with a rotate sway about the bottom centre, transform only', () => {
      const props = animatedProperties(keyframes('ghost-drift'));
      expect(Array.from(props)).toEqual(['transform']);
      expect(keyframes('ghost-drift')).toContain('rotate(');
      const rule = /\.gr-ghost--drift\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
      expect(rule).toContain('transform-box: fill-box');
      expect(rule).toContain('transform-origin: 50% 100%');
      expect(/\.gr-ghost\s*\{([^}]*)\}/.exec(css)?.[1]).toContain('pointer-events: none');
    });
  });

  describe('paint order', () => {
    it('draws the fog after the first 150 - 2 * columns graves and before every grave of the last two rows', () => {
      populateFor150();
      const { container } = render(h(GraveyardScene, null));
      const { columns, rows } = layoutYard(150);
      const fog = container.querySelector('.gr-fog');
      expect(fog).not.toBeNull();
      const all = graves(container);
      expect(all).toHaveLength(150);

      // Rows are whole: with 150 cards the last two rows hold 150 - (rows - 2) * columns graves.
      const frontStart = (rows - 2) * columns;
      expect(frontStart).toBeGreaterThanOrEqual(150 - 2 * columns);
      all.forEach((grave, i) => {
        expect(follows(grave, fog as Element), 'grave ' + i + ' before fog').toBe(i < frontStart);
      });
      for (const grave of all.slice(0, 150 - 2 * columns)) {
        expect(follows(grave, fog as Element)).toBe(true);
      }
    });

    it('keeps the DOM order of graves equal to card order', () => {
      populateFor150();
      const { container } = render(h(GraveyardScene, null));
      expect(graves(container).map((g) => g.getAttribute('data-card-id'))).toEqual(
        cards.value.map((c) => c.id),
      );
    });

    it('puts the fog behind only the last row when there are fewer than four rows', () => {
      const deck = createDeck('Few');
      for (let i = 0; i < 20; i++) addCard(deck.id, 'w' + i, 'x', null);
      const { rows, columns } = layoutYard(20);
      expect(rows).toBeLessThan(4);
      const { container } = render(h(GraveyardScene, null));
      const fog = container.querySelector('.gr-fog') as Element;
      graves(container).forEach((grave, i) => {
        expect(follows(grave, fog)).toBe(i < (rows - 1) * columns);
      });
    });

    it('draws every ghost after the fog and after the last graves', () => {
      populateFor150();
      const { container } = render(h(GraveyardScene, null));
      const fog = container.querySelector('.gr-fog') as Element;
      const found = Array.from(container.querySelectorAll('[data-ghost-for]'));
      expect(found.length).toBe(50);
      for (const ghost of found) expect(follows(fog, ghost)).toBe(true);
      const lastGrave = graves(container).at(-1) as Element;
      for (const ghost of found) expect(follows(lastGrave, ghost)).toBe(true);
    });
  });

  describe('ghosts', () => {
    it('are at least as tall as a tombstone and 0.9 times as wide', () => {
      expect(GHOST_HEIGHT).toBeGreaterThanOrEqual(TOMBSTONE_HEIGHT);
      expect(GHOST_WIDTH).toBeGreaterThanOrEqual(0.9 * TOMBSTONE_WIDTH);
    });

    it('draw their body, two eyes and a halo inside the ghost group, with no filter', () => {
      makeOverdueCard('haunted');
      const { container } = render(h(GraveyardScene, null));
      const ghost = ghosts(container)[0] as HTMLElement;
      expect(ghost.querySelector('.gr-ghost__body')).not.toBeNull();
      expect(ghost.querySelectorAll('.gr-ghost__eye')).toHaveLength(2);
      const halo = ghost.querySelector('.gr-ghost__halo');
      expect(halo?.getAttribute('fill')).toMatch(/^url\(#[^)]+\)$/);
      expect(ghost.querySelectorAll('[filter]')).toHaveLength(0);
      expect(ghost.hasAttribute('filter')).toBe(false);
      expect(ghost.getAttribute('role')).toBe('img');
      expect(ghost.getAttribute('data-ghost-for')).not.toBeNull();
    });

    it('refer to a halo gradient that exists once in the scene, in the ghost glow colour', () => {
      makeOverdueCard('one');
      makeOverdueCard('two');
      const { container } = render(h(GraveyardScene, null));
      const ids = Array.from(container.querySelectorAll('.gr-ghost__halo'), (el) =>
        /^url\(#([^)]+)\)$/.exec(el.getAttribute('fill') ?? '')?.[1],
      );
      expect(new Set(ids).size).toBe(1);
      expect(container.querySelectorAll('[id="' + ids[0] + '"]')).toHaveLength(1);
      expect(css).toMatch(/\.gr-ghost__halo-stop\s*\{[^}]*stop-color:\s*var\(--color-ghost-glow\)/);
    });

    it('sit above the stone, scaled with their row', () => {
      makeOverdueCard('haunted');
      const { container } = render(h(GraveyardScene, null));
      const pos = layoutYard(1).positions[0];
      const outer = ghosts(container)[0]?.parentElement;
      const [tx, ty] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(outer?.getAttribute('transform') ?? '')?.slice(1).map(Number) ?? [];
      expect(tx).toBe(pos?.x);
      expect(ty).toBeLessThan((pos?.y ?? 0) - TOMBSTONE_HEIGHT * (pos?.scale ?? 1));
    });
  });
});