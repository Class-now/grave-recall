import { describe, expect, it } from 'vitest';

import { isDeckExport } from './persistence';
import type { DeckExport } from './persistence';

import englishJson from '../../public/starter-crypts/english-100.json';
import frenchJson from '../../public/starter-crypts/french-50.json';

interface Fixture {
  file: string;
  data: unknown;
  name: string;
  language: string;
  cardCount: number;
}

const fixtures: Fixture[] = [
  { file: 'english-100.json', data: englishJson, name: 'English Essentials', language: 'en', cardCount: 100 },
  { file: 'french-50.json', data: frenchJson, name: 'Français Débutant', language: 'fr', cardCount: 50 },
];

describe.each(fixtures)('starter crypt $file', ({ data, name, language, cardCount }) => {
  it('passes the isDeckExport type guard', () => {
    expect(isDeckExport(data)).toBe(true);
  });

  it('is named as AC-04.1 requires', () => {
    expect((data as DeckExport).name).toBe(name);
  });

  it('has version 1, a non-empty name and the expected language', () => {
    const deck = data as DeckExport;
    expect(deck.version).toBe(1);
    expect(deck.name.trim().length).toBeGreaterThan(0);
    expect(deck.language).toBe(language);
  });

  it(`has exactly ${cardCount} cards`, () => {
    const deck = data as DeckExport;
    expect(Array.isArray(deck.cards)).toBe(true);
    expect(deck.cards).toHaveLength(cardCount);
  });

  it('gives every card a non-empty front and back', () => {
    const deck = data as DeckExport;
    deck.cards.forEach((card, i) => {
      expect(typeof card.front, `card ${i} front type`).toBe('string');
      expect(typeof card.back, `card ${i} back type`).toBe('string');
      expect(card.front.trim().length, `card ${i} front empty`).toBeGreaterThan(0);
      expect(card.back.trim().length, `card ${i} back empty`).toBeGreaterThan(0);
    });
  });

  it('has example as a non-empty string or null on every card', () => {
    const deck = data as DeckExport;
    deck.cards.forEach((card, i) => {
      const ok =
        card.example === null ||
        (typeof card.example === 'string' && card.example.trim().length > 0);
      expect(ok, `card ${i} example`).toBe(true);
    });
  });

  it('has no duplicate fronts', () => {
    const deck = data as DeckExport;
    const fronts = deck.cards.map((c) => c.front.trim().toLowerCase());
    expect(new Set(fronts).size).toBe(fronts.length);
  });
});
