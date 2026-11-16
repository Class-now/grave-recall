/**
 * localStorage read/write, JSON export/import.
 */
import type { UserPrefs } from './prefs';
import type { Deck } from './decks';
import type { Card, ReviewLogEntry } from './cards';
import { decks, loadDecks } from './decks';
import { cards, loadCards, loadReviewLog, reviewLog } from './cards';
import { createDeck } from './decks';
import { addCard } from './cards';
import { loadPrefs, getPrefs } from './prefs';

const STORAGE_KEY = 'grave-recall-data';

/** Full app export format */
export interface AppExport {
  version: 1;
  exportedAt: string;
  decks: Deck[];
  cards: Card[];
  reviewLog: ReviewLogEntry[];
  prefs: UserPrefs;
}

/** Deck import/export format (for starter crypts) */
export interface DeckExport {
  version: 1;
  name: string;
  language: string;
  cards: Array<{
    front: string;
    back: string;
    example: string | null;
  }>;
}

/**
 * Type guard for AppExport.
 */
export function isAppExport(value: unknown): value is AppExport {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  if (obj.version !== 1) return false;
  if (typeof obj.exportedAt !== 'string') return false;
  if (!Array.isArray(obj.decks)) return false;
  if (!Array.isArray(obj.cards)) return false;
  if (!Array.isArray(obj.reviewLog)) return false;
  
  // Decks validation
  for (const deck of obj.decks) {
    if (typeof deck.id !== 'string' || typeof deck.name !== 'string') return false;
    if (!(deck.createdAt instanceof Date) && typeof deck.createdAt !== 'string') return false;
  }
  
  // Cards validation
  for (const card of obj.cards) {
    if (typeof card.id !== 'string' || typeof card.deckId !== 'string') return false;
    if (typeof card.front !== 'string' || typeof card.back !== 'string') return false;
  }
  
  // Review log validation: a bad entry would put an invalid Date into the Ledger charts.
  for (const entry of obj.reviewLog) {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.cardId !== 'string' || typeof e.grade !== 'number' || typeof e.correct !== 'boolean') return false;
    if (typeof e.date !== 'string' && !(e.date instanceof Date)) return false;
    if (Number.isNaN(new Date(e.date).getTime())) return false;
  }
  
  return true;
}

/**
 * Type guard for DeckExport.
 */
export function isDeckExport(value: unknown): value is DeckExport {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  
  if (obj.version !== 1) return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.language !== 'string') return false;
  if (!Array.isArray(obj.cards)) return false;
  
  for (const card of obj.cards) {
    if (typeof card !== 'object' || card === null) return false;
    const c = card as Record<string, unknown>;
    if (typeof c.front !== 'string' || typeof c.back !== 'string') return false;
  }
  
  return true;
}

/**
 * Saves the full app state to localStorage.
 */
export function saveState(): void {
  try {
    const data: AppExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      decks: decks.value,
      cards: cards.value,
      reviewLog: reviewLog.value,
      prefs: getPrefs(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

/**
 * Loads the app state from localStorage.
 * Returns true if state was loaded, false if starting fresh.
 */
export function loadState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const data = JSON.parse(stored);
    if (!isAppExport(data)) {
      console.warn('Invalid app export format');
      return false;
    }
    
    // Load decks
    if (data.decks.length > 0) {
      // Parse dates from serialized data
      const decksWithDates = data.decks.map(d => ({
        ...d,
        createdAt: new Date(d.createdAt),
      }));
      loadDecks(decksWithDates);
    }
    
    // Load cards with proper date handling
    if (data.cards.length > 0) {
      const cardsWithDates = data.cards.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        srs: {
          ...c.srs,
          dueDate: new Date(c.srs.dueDate),
          lastReviewed: c.srs.lastReviewed ? new Date(c.srs.lastReviewed) : null,
        },
      }));
      loadCards(cardsWithDates);
    }
    
    // Load review log
    if (data.reviewLog && data.reviewLog.length > 0) {
      const logWithDates = data.reviewLog.map(entry => ({
        ...entry,
        date: new Date(entry.date),
      }));
      loadReviewLog(logWithDates);
    }
    
    // Load preferences
    loadPrefs();
    
    return true;
  } catch (e) {
    console.warn('Failed to load state:', e);
    return false;
  }
}

/**
 * Exports the app state as JSON string.
 */
export function exportJson(): string {
  const data: AppExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    decks: decks.value,
    cards: cards.value,
    reviewLog: reviewLog.value,
    prefs: getPrefs(),
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Imports app state from JSON string.
 * Returns true on success, false on failure (leaves state unchanged).
 */
export function importJson(text: string): boolean {
  try {
    const data = JSON.parse(text);
    if (!isAppExport(data)) {
      console.warn('Invalid import format');
      return false;
    }
    
    // Validate and import decks
    if (data.decks.length > 0) {
      const decksWithDates = data.decks.map(d => ({
        ...d,
        createdAt: new Date(d.createdAt),
      }));
      loadDecks(decksWithDates);
    }
    
    // Validate and import cards
    if (data.cards.length > 0) {
      const cardsWithDates = data.cards.map(c => ({
        ...c,
        createdAt: new Date(c.createdAt),
        srs: {
          ...c.srs,
          dueDate: new Date(c.srs.dueDate),
          lastReviewed: c.srs.lastReviewed ? new Date(c.srs.lastReviewed) : null,
        },
      }));
      loadCards(cardsWithDates);
    }
    
    // Import review log
    if (data.reviewLog && data.reviewLog.length > 0) {
      const logWithDates = data.reviewLog.map(entry => ({
        ...entry,
        date: new Date(entry.date),
      }));
      loadReviewLog(logWithDates);
    }
    
    return true;
  } catch (e) {
    console.warn('Import failed:', e);
    return false;
  }
}

/**
 * Loads starter crypts from public folder.
 * This is called on first launch when localStorage is empty.
 */
export async function loadStarterCrypts(): Promise<void> {
  const starterFiles = ['english-100.json', 'french-50.json'];
  
  for (const file of starterFiles) {
    try {
      const response = await fetch(`/starter-crypts/${file}`);
      if (!response.ok) continue;
      
      const data = await response.json();
      if (!isDeckExport(data)) {
        console.warn(`Invalid starter crypt: ${file}`);
        continue;
      }
      
      // Create the deck
      const deck = createDeck(data.name);
      
      // Add all cards to the deck
      for (const card of data.cards) {
        addCard(deck.id, card.front, card.back, card.example);
      }
    } catch (e) {
      console.warn(`Failed to load starter crypt ${file}:`, e);
    }
  }
}

/**
 * Clears all stored data.
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('grave-recall-prefs');
}

