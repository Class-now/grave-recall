/**
 * End-to-end JSON round-trip (Task 14, AC-23.4, AC-NFR-02.2): export from the
 * app, clear all state and localStorage, import, and check the graveyard looks
 * exactly the same.
 *
 * The data-level property test (P-13) lives in store/store.test.ts. This one
 * compares what the user sees.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/preact';

import { initCard, schedule } from './scheduler';
import {
  activeDeckId,
  addCard,
  addReviewLog,
  cards,
  clearAllData,
  createDeck,
  decks,
  exportJson,
  importJson,
  reviewLog,
  updateCardSrs,
} from './store';
import { addDays } from './utils/date';

import { GraveyardScene } from './components/graveyard/GraveyardScene';

const NOW = new Date('2026-03-10T09:00:00Z');

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  localStorage.clear();
}

/** A small graveyard with new, reviewed, lapsed and overdue cards. */
function seed(): void {
  const english = createDeck('English');
  const french = createDeck('Français');
  const grades = [0, 1, 2, 3] as const;

  for (let i = 0; i < 24; i++) {
    const deck = i % 3 === 0 ? french : english;
    const card = addCard(deck.id, `mot${i}`, `word ${i}`, i % 2 === 0 ? `example ${i}` : null);
    if (i % 4 === 0) continue; // left as a new card

    let srs = initCard(card.srs.id, addDays(NOW, -20));
    for (let r = 0; r <= i % 3; r++) {
      const grade = grades[(i + r) % 4] ?? 2;
      const reviewedAt = addDays(NOW, -15 + r * 3);
      srs = schedule(srs, grade, reviewedAt).nextState;
      addReviewLog({ date: reviewedAt, cardId: card.id, grade, correct: grade > 0 });
    }
    updateCardSrs(card.id, srs);
  }
}

function sceneMarkup(): string {
  const { container, unmount } = render(h(GraveyardScene, { deckId: null }));
  const markup = container.innerHTML;
  unmount();
  return markup;
}

describe('export, clear, import', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    resetState();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    resetState();
  });

  it('restores an identical graveyard', () => {
    seed();
    const before = sceneMarkup();
    const exported = exportJson();
    const cardsBefore = JSON.stringify(cards.value);
    const logBefore = JSON.stringify(reviewLog.value);
    expect(before).toContain('data-card-id');

    // Clear everything, as a user wiping the browser's site data would.
    resetState();
    clearAllData();
    expect(localStorage.length).toBe(0);
    expect(sceneMarkup()).not.toContain('data-card-id');

    expect(importJson(exported)).toBe(true);

    expect(sceneMarkup()).toBe(before);
    expect(JSON.stringify(cards.value)).toBe(cardsBefore);
    expect(JSON.stringify(reviewLog.value)).toBe(logBefore);
  });

  it('exports the same text again after importing it', () => {
    seed();
    const first = exportJson();
    resetState();
    expect(importJson(first)).toBe(true);

    // exportedAt is the only field that may differ.
    const strip = (text: string): unknown => ({ ...JSON.parse(text), exportedAt: null });
    expect(strip(exportJson())).toEqual(strip(first));
  });
});
