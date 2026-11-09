/**
 * Crypt (deck) list and active crypt signal.
 */
import { signal, computed } from '@preact/signals';
import type { DeckId } from '../scheduler/types';
import { generateId } from '../utils/id';

export interface Deck {
  readonly id: DeckId;
  readonly name: string;
  readonly createdAt: Date;
}

// All decks
export const decks = signal<Deck[]>([]);

// Active (selected) deck ID
export const activeDeckId = signal<DeckId | null>(null);

// Computed: active deck object
export const activeDeck = computed(() => {
  const id = activeDeckId.value;
  if (!id) return null;
  return decks.value.find(d => d.id === id) ?? null;
});

/**
 * Creates a new deck.
 */
export function createDeck(name: string): Deck {
  const deck: Deck = {
    id: generateId() as DeckId,
    name: name.trim(),
    createdAt: new Date(),
  };
  decks.value = [...decks.value, deck];
  return deck;
}

/**
 * Renames a deck.
 */
export function renameDeck(id: DeckId, newName: string): void {
  decks.value = decks.value.map(d =>
    d.id === id ? { ...d, name: newName.trim() } : d
  );
}

/**
 * Deletes a deck.
 */
export function deleteDeck(id: DeckId): void {
  decks.value = decks.value.filter(d => d.id !== id);
  // Clear active deck if it was deleted
  if (activeDeckId.value === id) {
    activeDeckId.value = null;
  }
}

/**
 * Sets the active deck.
 */
export function setActiveDeck(id: DeckId | null): void {
  activeDeckId.value = id;
}

/**
 * Loads decks from a list (for import).
 */
export function loadDecks(newDecks: Deck[]): void {
  decks.value = newDecks;
}