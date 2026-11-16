/**
 * All cards, derived overdue/due collections.
 */
import { signal, computed } from '@preact/signals';
import type { CardId, DeckId, CardState } from '../scheduler/types';
import { generateId } from '../utils/id';
import { startOfDay } from '../utils/date';

export interface Card {
  readonly id: CardId;
  readonly deckId: DeckId;
  readonly front: string;
  readonly back: string;
  readonly example: string | null;
  readonly createdAt: Date;
  readonly srs: CardState;
}

// All cards
export const cards = signal<Card[]>([]);

// Review log for stats
export interface ReviewLogEntry {
  date: Date;
  cardId: CardId;
  grade: number; // 0-3
  correct: boolean;
}

export const reviewLog = signal<ReviewLogEntry[]>([]);

// Computed: cards due for review today
export const dueCards = computed(() => {
  const now = new Date();
  return cards.value.filter(card => card.srs.dueDate <= now);
});

// Computed: overdue cards (past due date, not including today)
export const overdueCards = computed(() => {
  const today = startOfDay(new Date());
  return cards.value.filter(card => card.srs.dueDate < today);
});

// Computed: count of overdue cards
export const overdueCount = computed(() => overdueCards.value.length);

// Computed: new cards (never reviewed)
export const newCards = computed(() =>
  cards.value.filter(card => card.srs.srsState === 'new')
);

// Computed: learning/review/relearning cards
export const reviewCards = computed(() =>
  cards.value.filter(card =>
    card.srs.srsState === 'learning' ||
    card.srs.srsState === 'review' ||
    card.srs.srsState === 'relearning'
  )
);

/**
 * Gets all cards for a specific deck.
 */
export function getCardsForDeck(deckId: DeckId): Card[] {
  return cards.value.filter(c => c.deckId === deckId);
}

/**
 * Adds a new card.
 */
export function addCard(
  deckId: DeckId,
  front: string,
  back: string,
  example: string | null
): Card {
  const card: Card = {
    id: generateId() as CardId,
    deckId,
    front: front.trim(),
    back: back.trim(),
    example: example?.trim() || null,
    createdAt: new Date(),
    srs: {
      id: generateId() as CardId,
      stability: 1.0,
      difficulty: 5.0,
      retrievability: 1.0,
      lapses: 0,
      reps: 0,
      srsState: 'new',
      dueDate: new Date(),
      lastReviewed: null,
    },
  };
  cards.value = [...cards.value, card];
  return card;
}

/**
 * Updates a card.
 */
export function editCard(
  id: CardId,
  updates: Partial<Pick<Card, 'front' | 'back' | 'example'>>
): void {
  cards.value = cards.value.map(c =>
    c.id === id
      ? {
          ...c,
          front: updates.front?.trim() ?? c.front,
          back: updates.back?.trim() ?? c.back,
          example: updates.example === undefined ? c.example : (updates.example?.trim() || null),
        }
      : c
  );
}

/**
 * Deletes a card.
 */
export function deleteCard(id: CardId): void {
  cards.value = cards.value.filter(c => c.id !== id);
}

/**
 * Updates a card's SRS state.
 */
export function updateCardSrs(id: CardId, srs: CardState): void {
  cards.value = cards.value.map(c =>
    c.id === id ? { ...c, srs } : c
  );
}

/**
 * Adds a review log entry.
 */
export function addReviewLog(entry: ReviewLogEntry): void {
  reviewLog.value = [...reviewLog.value, entry];
}

/**
 * Loads cards from a list (for import).
 */
export function loadCards(newCards: Card[]): void {
  cards.value = newCards;
}

/**
 * Loads review log from a list (for import).
 */
export function loadReviewLog(log: ReviewLogEntry[]): void {
  reviewLog.value = log;
}

/**
 * Clears all cards (for testing).
 */
export function clearCards(): void {
  cards.value = [];
}