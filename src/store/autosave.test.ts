/**
 * Autosave: decks, cards and the review log survive a reload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addCard, addReviewLog, cards, deleteCard, reviewLog } from './cards';
import { createDeck, decks, renameDeck } from './decks';
import { loadState, saveState, startAutoSave } from './persistence';
import { initCard } from '../scheduler';
import type { CardId } from '../scheduler/types';

const STORAGE_KEY = 'grave-recall-data';

function stored(): { decks: unknown[]; cards: unknown[]; reviewLog: unknown[] } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : JSON.parse(raw);
}

/** Simulates a page reload: empties the signals, then restores from localStorage. */
function reload(): boolean {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  return loadState();
}

describe('startAutoSave', () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    decks.value = [];
    cards.value = [];
    reviewLog.value = [];
    stop = startAutoSave(100);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('does not write anything on start-up', () => {
    vi.advanceTimersByTime(1000);
    expect(stored()).toBeNull();
  });

  it('saves a new deck after the debounce delay', () => {
    createDeck('Crypt');
    expect(stored()).toBeNull();
    vi.advanceTimersByTime(100);
    expect(stored()?.decks).toHaveLength(1);
  });

  it('writes once for a burst of changes', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const deck = createDeck('Crypt');
    addCard(deck.id, 'front 1', 'back 1', null);
    addCard(deck.id, 'front 2', 'back 2', null);
    renameDeck(deck.id, 'Renamed');
    vi.advanceTimersByTime(1000);
    expect(setItem.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(1);
    setItem.mockRestore();
  });

  it('restores decks, cards and review log after a reload', () => {
    const deck = createDeck('Crypt');
    const card = addCard(deck.id, 'ghost', 'fantôme', 'Un ghost.');
    addReviewLog({ date: new Date('2025-01-02T03:04:05Z'), cardId: card.id, grade: 2, correct: true });
    vi.advanceTimersByTime(100);

    expect(reload()).toBe(true);
    expect(decks.value.map((d) => d.name)).toEqual(['Crypt']);
    expect(cards.value).toHaveLength(1);
    expect(cards.value[0]?.front).toBe('ghost');
    expect(cards.value[0]?.srs.dueDate).toBeInstanceOf(Date);
    expect(reviewLog.value).toHaveLength(1);
    expect(reviewLog.value[0]?.date.toISOString()).toBe('2025-01-02T03:04:05.000Z');
  });

  it('saves card edits made by the scheduler (updated srs state)', () => {
    const deck = createDeck('Crypt');
    const card = addCard(deck.id, 'a', 'b', null);
    vi.advanceTimersByTime(100);
    const srs = { ...initCard(card.srs.id as CardId, new Date()), reps: 7 };
    cards.value = cards.value.map((c) => (c.id === card.id ? { ...c, srs } : c));
    vi.advanceTimersByTime(100);
    expect(reload()).toBe(true);
    expect(cards.value[0]?.srs.reps).toBe(7);
  });

  it('saves deletions so deleted cards do not come back', () => {
    const deck = createDeck('Crypt');
    const card = addCard(deck.id, 'a', 'b', null);
    vi.advanceTimersByTime(100);
    deleteCard(card.id);
    vi.advanceTimersByTime(100);
    expect(reload()).toBe(true);
    expect(cards.value).toHaveLength(0);
    expect(decks.value).toHaveLength(1);
  });

  it('flushes a pending write when the page is hidden', () => {
    createDeck('Crypt');
    expect(stored()).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    expect(stored()?.decks).toHaveLength(1);
  });

  it('stops saving, after flushing, once disposed', () => {
    createDeck('Before');
    stop();
    expect(stored()?.decks).toHaveLength(1);
    createDeck('After');
    vi.advanceTimersByTime(1000);
    expect(stored()?.decks).toHaveLength(1);
    // afterEach calls stop() again; disposing twice must be harmless.
  });

  it('leaves state written by saveState() intact on start-up', () => {
    stop();
    createDeck('Seeded');
    saveState();
    stop = startAutoSave(100);
    vi.advanceTimersByTime(1000);
    expect(stored()?.decks).toHaveLength(1);
  });
});
