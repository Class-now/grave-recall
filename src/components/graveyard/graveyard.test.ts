/**
 * Graveyard scene tests (Task 9): pure visual mappings plus component behaviour.
 */
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
import { Ghost } from './Ghost';
import { MoonPhase } from './MoonPhase';
import {
  clamp,
  daysPastDue,
  ghostDriftSeconds,
  ghostOpacity,
  layoutGraves,
  moonArcPath,
  round,
  tombstoneCrackOpacity,
  tombstoneFill,
  tombstoneMossOpacity,
  MAX_COLUMNS,
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
        const layout = layoutGraves(n);
        const keys = new Set(layout.positions.map((p) => `${p.x},${p.y}`));
        return (
          layout.positions.length === n &&
          keys.size === n &&
          layout.columns <= MAX_COLUMNS &&
          layout.positions.every((p) => p.x >= 0 && p.x + 40 <= layout.width && p.y + 52 <= layout.height)
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
    expect(layer?.getAttribute('filter')).toBe('url(#gr-fog-filter)');
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

describe('card detail panel', () => {
  function openFirstGrave(container: Element): HTMLElement {
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
