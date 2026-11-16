/**
 * Performance budgets (Task 14): schedule() (AC-NFR-01.3) and the graveyard
 * scene with 200 cards (AC-NFR-01.1, AC-16.7).
 *
 * These run in jsdom, whose DOM is slower than a browser's, so a pass here is a
 * conservative signal. The README lists the manual DevTools check.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/preact';

import { initCard, schedule } from './scheduler';
import type { CardId, Grade } from './scheduler/types';
import { activeDeckId, addCard, cards, createDeck, decks, updateCardSrs } from './store';
import { addDays } from './utils/date';

import { GraveyardScene } from './components/graveyard/GraveyardScene';

const FRAME_BUDGET_MS = 16;
const SCHEDULE_BUDGET_MS = 0.1;
const CARD_COUNT = 200;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

describe('schedule() speed (AC-NFR-01.3)', () => {
  it('averages at most 0.1 ms per call over every grade', () => {
    const now = new Date('2026-01-15T09:00:00Z');
    const grades: Grade[] = [0, 1, 2, 3];
    let state = initCard('bench' as CardId, now);

    // Warm-up so the JIT has compiled schedule() before timing starts.
    for (let i = 0; i < 2000; i++) {
      state = schedule(state, grades[i % 4] as Grade, now).nextState;
    }

    const calls = 20_000;
    state = initCard('bench' as CardId, now);
    const start = performance.now();
    for (let i = 0; i < calls; i++) {
      state = schedule(state, grades[i % 4] as Grade, addDays(now, i % 30)).nextState;
    }
    const perCall = (performance.now() - start) / calls;

    expect(Number.isFinite(state.stability)).toBe(true);
    expect(perCall).toBeLessThanOrEqual(SCHEDULE_BUDGET_MS);
  });
});

describe(`graveyard scene with ${CARD_COUNT} cards (AC-NFR-01.1)`, () => {
  beforeEach(() => {
    decks.value = [];
    cards.value = [];
    activeDeckId.value = null;
    const deck = createDeck('Bench');
    const now = new Date();
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = addCard(deck.id, `word${i}`, `meaning${i}`, null);
      // A mix of stabilities, with every other card overdue (so it also draws a ghost).
      updateCardSrs(card.id, {
        ...card.srs,
        stability: i % 60,
        dueDate: addDays(now, i % 2 === 0 ? -3 : 3),
      });
    }
  });

  afterEach(() => {
    cleanup();
    decks.value = [];
    cards.value = [];
  });

  it('draws one grave per card and a ghost for each overdue card', () => {
    const { container } = render(h(GraveyardScene, null));
    expect(container.querySelectorAll('[data-card-id]').length).toBe(CARD_COUNT);
    expect(container.querySelectorAll('[data-ghost-for]').length).toBe(CARD_COUNT / 2);
  });

  it('re-renders after a grade within one 16 ms frame (median)', () => {
    render(h(GraveyardScene, null));

    const times: number[] = [];
    for (let i = 0; i < 15; i++) {
      const card = cards.value[i];
      if (card === undefined) throw new Error('card missing');
      const start = performance.now();
      act(() => {
        updateCardSrs(card.id, { ...card.srs, stability: 30 + i });
      });
      times.push(performance.now() - start);
    }

    expect(median(times)).toBeLessThanOrEqual(FRAME_BUDGET_MS);
  });

  it('mounts in a bounded time (jsdom regression guard; browsers are faster)', () => {
    // Warm-up mount so module loading and JIT compilation are not counted.
    render(h(GraveyardScene, null));
    cleanup();

    const times: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      render(h(GraveyardScene, null));
      times.push(performance.now() - start);
      cleanup();
    }

    // Mounting is a one-off cost, not a per-frame one, and jsdom builds DOM
    // nodes several times slower than a browser. The bound catches a large
    // regression (for example per-card work creeping back into render).
    expect(median(times)).toBeLessThanOrEqual(250);
  });
});
