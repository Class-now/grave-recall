/**
 * Mapping freeze (costume-polish Task 2). Golden outputs of the data-to-visual
 * mappings, recorded before the layout rewrite. The costume work must not change
 * how card state maps to visuals, so these values must never be edited to make a
 * change pass.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { activeDeckId, addCard, cards, createDeck, decks, fogOpacity, updateCardSrs } from '../../store';
import { addDays } from '../../utils/date';

import {
  ghostDriftSeconds,
  ghostOpacity,
  moonArcPath,
  tombstoneCrackOpacity,
  tombstoneFill,
  tombstoneMossOpacity,
} from './visuals';

describe('mapping freeze', () => {
  it('tombstone fill, crack and moss at stability 0, 15, 30, 60, 90', () => {
    const golden: ReadonlyArray<readonly [number, string, number, number]> = [
      [0, '#8c7f72', 1, 0],
      [15, '#756a5f', 0.75, 0.25],
      [30, '#5d554c', 0.5, 0.5],
      [60, '#2e2a26', 0, 0.6],
      [90, '#2e2a26', 0, 0.6],
    ];
    for (const [stability, fill, crack, moss] of golden) {
      expect(tombstoneFill(stability)).toBe(fill);
      expect(tombstoneCrackOpacity(stability)).toBe(crack);
      expect(tombstoneMossOpacity(stability)).toBe(moss);
    }
  });

  it('ghost opacity at retrievability 0, 0.5, 1', () => {
    expect(ghostOpacity(0)).toBe(0.95);
    expect(ghostOpacity(0.5)).toBe(0.5);
    expect(ghostOpacity(1)).toBe(0.15);
  });

  it('ghost drift seconds at 0, 2, 6, 10 days past due', () => {
    expect(ghostDriftSeconds(0)).toBe(12);
    expect(ghostDriftSeconds(2)).toBe(9);
    expect(ghostDriftSeconds(6)).toBe(3);
    expect(ghostDriftSeconds(10)).toBe(3);
  });

  it('moon arc path at progress 0, 0.25, 0.5, 1 (cx 64, cy 64, r 28)', () => {
    expect(moonArcPath(0, 64, 64, 28)).toBe('');
    expect(moonArcPath(0.25, 64, 64, 28)).toBe('M 64 64 L 64 36 A 28 28 0 0 1 92 64 Z');
    expect(moonArcPath(0.5, 64, 64, 28)).toBe('M 64 64 L 64 36 A 28 28 0 0 1 64 92 Z');
    expect(moonArcPath(1, 64, 64, 28)).toBe('M 64 36 A 28 28 0 1 1 64 92 A 28 28 0 1 1 64 36 Z');
  });

  describe('fog opacity', () => {
    beforeEach(() => {
      decks.value = [];
      cards.value = [];
      activeDeckId.value = null;
    });
    afterEach(() => {
      decks.value = [];
      cards.value = [];
    });

    /** Ten cards, `overdue` of them due three days ago and the rest due in three days. */
    function seed(overdue: number): void {
      const deck = createDeck('Freeze');
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const card = addCard(deck.id, `w${i}`, 'x', null);
        updateCardSrs(card.id, { ...card.srs, dueDate: addDays(now, i < overdue ? -3 : 3) });
      }
    }

    it('is 0.05 with no cards', () => {
      expect(fogOpacity.value).toBe(0.05);
    });

    it('is 0.1, 0.5 and 0.6 for 1, 5 and 10 of 10 cards overdue', () => {
      seed(1);
      expect(fogOpacity.value).toBe(0.1);
      cards.value = [];
      seed(5);
      expect(fogOpacity.value).toBe(0.5);
      cards.value = [];
      seed(10);
      expect(fogOpacity.value).toBe(0.6);
    });
  });
});
