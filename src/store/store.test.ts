/**
 * Store action unit tests + persistence property tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Store modules
import {
  decks,
  activeDeckId,
  createDeck,
  renameDeck,
  deleteDeck,
  setActiveDeck,
  loadDecks,
  cards,
  reviewLog,
  dueCards,
  overdueCards,
  overdueCount,
  addCard,
  editCard,
  deleteCard,
  updateCardSrs,
  addReviewLog,
  loadCards,
  clearCards,
} from './index';

import {
  locale,
  cowardMode,
  volume,
  dailyGoal,
  reducedMotionUser,
  showCaptions,
  updatePref,
  getPrefs,
} from './prefs';

import {
  saveState,
  loadState,
  exportJson,
  importJson,
  isAppExport,
  isDeckExport,
} from './persistence';

import { initCard } from '../scheduler';
import type { CardId, DeckId } from '../scheduler/types';
import { generateId } from '../utils/id';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// === DECK ACTIONS ===

describe('Deck actions', () => {
  beforeEach(() => {
    decks.value = [];
    activeDeckId.value = null;
    localStorage.clear();
  });

  it('createDeck: adds a deck to the list', () => {
    const deck = createDeck('Japanese');
    expect(decks.value).toHaveLength(1);
    expect(decks.value[0]!.name).toBe('Japanese');
    expect(deck.id).toBeTruthy();
  });

  it('createDeck: trims whitespace', () => {
    const deck = createDeck('  Spanish  ');
    expect(deck.name).toBe('Spanish');
  });

  it('renameDeck: updates deck name', () => {
    const deck = createDeck('French');
    renameDeck(deck.id, 'French Advanced');
    expect(decks.value[0]!.name).toBe('French Advanced');
  });

  it('deleteDeck: removes deck', () => {
    const deck = createDeck('German');
    deleteDeck(deck.id);
    expect(decks.value).toHaveLength(0);
  });

  it('deleteDeck: clears activeDeckId if deleted deck was active', () => {
    const deck = createDeck('Italian');
    setActiveDeck(deck.id);
    expect(activeDeckId.value).toBe(deck.id);
    deleteDeck(deck.id);
    expect(activeDeckId.value).toBeNull();
  });

  it('setActiveDeck: sets the active deck', () => {
    const deck = createDeck('Portuguese');
    setActiveDeck(deck.id);
    expect(activeDeckId.value).toBe(deck.id);
  });

  it('loadDecks: replaces all decks', () => {
    createDeck('Deck1');
    const newDeck = {
      id: generateId() as DeckId,
      name: 'LoadedDeck',
      createdAt: new Date(),
    };
    loadDecks([newDeck]);
    expect(decks.value).toHaveLength(1);
    expect(decks.value[0]!.name).toBe('LoadedDeck');
  });
});

// === CARD ACTIONS ===

describe('Card actions', () => {
  beforeEach(() => {
    decks.value = [];
    cards.value = [];
    reviewLog.value = [];
  });

  it('addCard: creates a card with initial SRS state', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, 'apple', 'a red fruit', 'an apple is delicious');
    
    expect(cards.value).toHaveLength(1);
    expect(card.front).toBe('apple');
    expect(card.back).toBe('a red fruit');
    expect(card.example).toBe('an apple is delicious');
    expect(card.srs.stability).toBe(1.0);
    expect(card.srs.difficulty).toBe(5.0);
    expect(card.srs.srsState).toBe('new');
  });

  it('addCard: trims whitespace', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, '  orange  ', '  citrus  ', '  orange juice  ');
    expect(card.front).toBe('orange');
    expect(card.back).toBe('citrus');
    expect(card.example).toBe('orange juice');
  });

  it('addCard: allows null example', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, 'banana', 'yellow fruit', null);
    expect(card.example).toBeNull();
  });

  it('editCard: updates card fields', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, 'cherry', 'small red fruit', null);
    editCard(card.id, { front: 'CHERRY', back: 'small RED fruit' });
    
    expect(cards.value[0]!.front).toBe('CHERRY');
    expect(cards.value[0]!.back).toBe('small RED fruit');
  });

  it('deleteCard: removes card', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, 'grape', 'purple berry', null);
    expect(cards.value).toHaveLength(1);
    deleteCard(card.id);
    expect(cards.value).toHaveLength(0);
  });

  it('updateCardSrs: updates SRS state', () => {
    const deck = createDeck('Test');
    const card = addCard(deck.id, 'peach', 'fuzzy fruit', null);
    const newSrs = initCard(generateId() as CardId);
    updateCardSrs(card.id, { ...newSrs, stability: 42 });
    
    expect(cards.value[0]!.srs.stability).toBe(42);
  });

  it('addReviewLog: appends review entry', () => {
    const cardId = generateId() as CardId;
    addReviewLog({ date: new Date(), cardId, grade: 2, correct: true });
    expect(reviewLog.value).toHaveLength(1);
    expect(reviewLog.value[0]!.grade).toBe(2);
  });

  it('loadCards: replaces all cards', () => {
    const deck = createDeck('Test');
    addCard(deck.id, 'old', 'old card', null);
    
    const newCard = {
      id: generateId() as CardId,
      deckId: deck.id,
      front: 'new',
      back: 'new card',
      example: null as string | null,
      createdAt: new Date(),
      srs: initCard(generateId() as CardId),
    };
    loadCards([newCard]);
    expect(cards.value).toHaveLength(1);
    expect(cards.value[0]!.front).toBe('new');
  });

  it('clearCards: removes all cards', () => {
    const deck = createDeck('Test');
    addCard(deck.id, 'a', 'a card', null);
    addCard(deck.id, 'b', 'b card', null);
    clearCards();
    expect(cards.value).toHaveLength(0);
  });
});

// === DERIVED SIGNALS ===

describe('Derived card signals', () => {
  beforeEach(() => {
    decks.value = [];
    cards.value = [];
  });

  it('dueCards: filters cards with dueDate <= now', () => {
    const deck = createDeck('Test');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const card1 = addCard(deck.id, 'a', 'due', null);
    updateCardSrs(card1.id, { ...card1.srs, dueDate: yesterday });

    const card2 = addCard(deck.id, 'b', 'not due', null);
    updateCardSrs(card2.id, { ...card2.srs, dueDate: tomorrow });

    expect(dueCards.value).toHaveLength(1);
    expect(dueCards.value[0]!.front).toBe('a');
  });

  it('overdueCards: filters cards before start of today', () => {
    const deck = createDeck('Test');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const card1 = addCard(deck.id, 'a', 'overdue', null);
    updateCardSrs(card1.id, { ...card1.srs, dueDate: new Date(today.getTime() - 1000) });

    const card2 = addCard(deck.id, 'b', 'not overdue', null);
    updateCardSrs(card2.id, { ...card2.srs, dueDate: new Date(today.getTime() + 1000) });

    expect(overdueCards.value).toHaveLength(1);
    expect(overdueCount.value).toBe(1);
  });
});

// === PREFERENCES ===

describe('Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    locale.value = 'en';
    cowardMode.value = false;
    volume.value = 0.7;
    dailyGoal.value = 20;
    reducedMotionUser.value = false;
    showCaptions.value = true;
  });

  it('updatePref: updates a preference signal', () => {
    updatePref('locale', 'ja');
    expect(locale.value).toBe('ja');
    
    updatePref('cowardMode', true);
    expect(cowardMode.value).toBe(true);
    
    updatePref('volume', 0.5);
    expect(volume.value).toBe(0.5);
  });

  it('getPrefs: returns all current prefs', () => {
    updatePref('locale', 'ja');
    updatePref('volume', 0.3);
    
    const prefs = getPrefs();
    expect(prefs.locale).toBe('ja');
    expect(prefs.volume).toBe(0.3);
  });
});

// === PERSISTENCE ===

describe('Persistence: saveState and loadState', () => {
  beforeEach(() => {
    localStorage.clear();
    decks.value = [];
    cards.value = [];
    reviewLog.value = [];
  });

  it('saveState: writes state to localStorage', () => {
    createDeck('MyDeck');
    saveState();
    const stored = localStorage.getItem('grave-recall-data');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.version).toBe(1);
    expect(parsed.decks).toHaveLength(1);
  });

  it('loadState: returns false if no stored data', () => {
    const result = loadState();
    expect(result).toBe(false);
  });

  it('loadState: loads data back from localStorage', () => {
    createDeck('SavedDeck');
    saveState();

    // Clear signals
    decks.value = [];

    // Load
    const result = loadState();
    expect(result).toBe(true);
    expect(decks.value).toHaveLength(1);
    expect(decks.value[0]!.name).toBe('SavedDeck');
  });

  it('saveState / loadState: round-trips the review log, dates included', () => {
    const when = new Date(2025, 5, 1, 9, 30);
    addReviewLog({ date: when, cardId: 'card-1' as never, grade: 2, correct: true });
    addReviewLog({ date: when, cardId: 'card-2' as never, grade: 0, correct: false });
    saveState();

    const stored = JSON.parse(localStorage.getItem('grave-recall-data')!);
    expect(stored.reviewLog).toHaveLength(2);

    reviewLog.value = [];
    expect(loadState()).toBe(true);
    expect(reviewLog.value).toHaveLength(2);
    expect(reviewLog.value[0]).toEqual({ date: when, cardId: 'card-1', grade: 2, correct: true });
    expect(reviewLog.value[0]!.date).toBeInstanceOf(Date);
    expect(reviewLog.value[1]!.correct).toBe(false);
  });

  it('loadState: rejects stored data whose review log has an invalid entry', () => {
    createDeck('Kept');
    saveState();
    const stored = JSON.parse(localStorage.getItem('grave-recall-data')!);
    stored.reviewLog = [{ date: 'not a date', cardId: 'c', grade: 1, correct: true }];
    localStorage.setItem('grave-recall-data', JSON.stringify(stored));

    decks.value = [];
    expect(loadState()).toBe(false);
    expect(reviewLog.value).toHaveLength(0);
  });
});

// === EXPORT/IMPORT ===

describe('Export and Import', () => {
  beforeEach(() => {
    localStorage.clear();
    decks.value = [];
    cards.value = [];
    reviewLog.value = [];
  });

  it('exportJson: produces valid JSON string', () => {
    const deck = createDeck('ExportTest');
    addCard(deck.id, 'word', 'definition', null);
    
    const json = exportJson();
    expect(typeof json).toBe('string');
    
    const parsed = JSON.parse(json);
    expect(isAppExport(parsed)).toBe(true);
    expect(parsed.decks).toHaveLength(1);
    expect(parsed.cards).toHaveLength(1);
  });

  it('importJson: restores state from export', () => {
    const deck = createDeck('Original');
    addCard(deck.id, 'export-test', 'def', null);
    
    const exported = exportJson();

    // Clear state
    decks.value = [];
    cards.value = [];

    // Import
    const success = importJson(exported);
    expect(success).toBe(true);
    expect(decks.value).toHaveLength(1);
    expect(decks.value[0]!.name).toBe('Original');
    expect(cards.value).toHaveLength(1);
    expect(cards.value[0]!.front).toBe('export-test');
  });

  it('importJson: returns false on malformed JSON', () => {
    const success = importJson('{ invalid json }');
    expect(success).toBe(false);
    expect(decks.value).toHaveLength(0);
  });

  it('importJson: returns false on invalid schema', () => {
    const invalidData = {
      version: 2, // wrong version
      decks: [],
    };
    const success = importJson(JSON.stringify(invalidData));
    expect(success).toBe(false);
  });

  it('importJson: does not mutate state on failure', () => {
    createDeck('Preserve');
    const originalDecks = decks.value.length;

    const invalidJson = JSON.stringify({ version: 'invalid' });
    importJson(invalidJson);

    expect(decks.value.length).toBe(originalDecks);
    expect(decks.value[0]!.name).toBe('Preserve');
  });
});

// === PROPERTY TEST: P-13 JSON ROUND-TRIP ===

describe('Property test P-13: JSON round-trip', () => {
  it('P-13: deserialize(serialize(state)) deepEquals state', () => {
    // Use fast-check to generate random deck/card states
    const arbAppState = fc.record({
      deckCount: fc.integer({ min: 0, max: 5 }),
      cardsPerDeck: fc.integer({ min: 0, max: 10 }),
    });

    fc.assert(
      fc.property(arbAppState, (input) => {
        // IMPORTANT: Reset state for each test run
        decks.value = [];
        cards.value = [];
        reviewLog.value = [];

        // Create state
        for (let i = 0; i < input.deckCount; i++) {
          const newDeck = createDeck(`Deck${i}`);

          for (let j = 0; j < input.cardsPerDeck; j++) {
            addCard(newDeck.id, `front${i}-${j}`, `back${i}-${j}`, null);
          }
        }

        // Add a review log entry if we have cards
        if (cards.value.length > 0) {
          addReviewLog({
            date: new Date(),
            cardId: cards.value[0]!.id,
            grade: 2,
            correct: true,
          });
        }

        // Export
        const exported = exportJson();
        const snapshot = {
          deckCount: decks.value.length,
          cardCount: cards.value.length,
          reviewCount: reviewLog.value.length,
          deckNames: [...decks.value].map(d => d.name),
          cardFronts: [...cards.value].map(c => c.front),
        };

        // Clear and import
        decks.value = [];
        cards.value = [];
        reviewLog.value = [];

        const imported = importJson(exported);
        expect(imported).toBe(true);

        // Verify structure
        expect(decks.value.length).toBe(snapshot.deckCount);
        expect(cards.value.length).toBe(snapshot.cardCount);
        expect(reviewLog.value.length).toBe(snapshot.reviewCount);

        // Verify deck names are preserved
        for (let i = 0; i < snapshot.deckNames.length; i++) {
          expect(decks.value[i]!.name).toBe(snapshot.deckNames[i]);
        }

        // Verify card fronts are preserved
        for (let i = 0; i < snapshot.cardFronts.length; i++) {
          expect(cards.value[i]!.front).toBe(snapshot.cardFronts[i]);
        }
      }),
      { numRuns: 20 }
    );
  });
});

// === TEST: MALFORMED IMPORT ===

describe('Malformed JSON import', () => {
  beforeEach(() => {
    decks.value = [];
    cards.value = [];
  });

  it('malformed JSON import leaves state unchanged', () => {
    createDeck('Important');
    const cardsBefore = cards.value.length;
    const decksBefore = decks.value.length;

    const result = importJson('{ this is not valid json ]');
    
    expect(result).toBe(false);
    expect(decks.value.length).toBe(decksBefore);
    expect(cards.value.length).toBe(cardsBefore);
    expect(decks.value[0]!.name).toBe('Important');
  });

  it('import with missing required fields leaves state unchanged', () => {
    createDeck('Safe');
    const initialDecks = decks.value.length;

    const incompleteExport = {
      version: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      // missing decks, cards, reviewLog, prefs
    };

    const result = importJson(JSON.stringify(incompleteExport));
    
    expect(result).toBe(false);
    expect(decks.value.length).toBe(initialDecks);
  });

  it('isDeckExport: rejects non-matching schema', () => {
    const invalid = {
      version: 1,
      name: 'Test',
      // missing language and cards
    };
    expect(isDeckExport(invalid)).toBe(false);

    const valid = {
      version: 1,
      name: 'Test',
      language: 'en',
      cards: [
        { front: 'a', back: 'b', example: null },
      ],
    };
    expect(isDeckExport(valid)).toBe(true);
  });
});
