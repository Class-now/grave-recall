/**
 * App shell tests: first-gesture audio unlock and the Graveyard / Séance / Crypts switcher.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';

import { activeDeckId, addCard, cards, createDeck, decks, reviewLog, updateCardSrs } from './store';
import { cowardMode, locale } from './store/prefs';
import { resetAudioContext, hasGestureOccurred } from './audio/context';
import { en } from './i18n/en';
import { addDays } from './utils/date';

import { FakeAudioContext } from './__fixtures__/fake-audio';
import { App } from './app';

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  cowardMode.value = false;
}

beforeEach(() => {
  FakeAudioContext.reset();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  resetAudioContext();
  resetState();
});

afterEach(() => {
  cleanup();
  resetAudioContext();
  vi.unstubAllGlobals();
  resetState();
});

describe('first user gesture', () => {
  it('creates no AudioContext before any gesture', () => {
    render(h(App, null));
    expect(hasGestureOccurred()).toBe(false);
    expect(FakeAudioContext.created).toBe(0);
  });

  it.each(['pointerdown', 'keydown', 'touchstart'])('%s unlocks audio exactly once', async (type) => {
    render(h(App, null));
    await waitFor(() => {
      document.dispatchEvent(new Event(type, { bubbles: true }));
      expect(hasGestureOccurred()).toBe(true);
    });
    expect(FakeAudioContext.created).toBe(1);

    // The listeners removed themselves: further gestures create nothing new.
    for (const other of ['pointerdown', 'keydown', 'touchstart']) {
      document.dispatchEvent(new Event(other, { bubbles: true }));
    }
    expect(FakeAudioContext.created).toBe(1);
  });

  it('removes the listeners when the app unmounts', () => {
    const view = render(h(App, null));
    view.unmount();
    document.dispatchEvent(new Event('keydown', { bubbles: true }));
    expect(hasGestureOccurred()).toBe(false);
  });
});

describe('view switcher', () => {
  it('offers Graveyard, Séance, Ledger, Crypts and Settings in a labelled navigation', () => {
    render(h(App, null));
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(Array.from(nav.querySelectorAll('button')).map((b) => b.textContent)).toEqual([
      'The Graveyard',
      en['nav.seance'],
      'Ledger of the Dead',
      'Crypts',
      en['nav.settings'],
    ]);
  });

  it('shows the app name as the page h1 and marks the active tab', () => {
    render(h(App, null));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(en['app.name']);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    expect(buttons).toHaveLength(5);
    expect(buttons.filter((b) => b.getAttribute('aria-current') === 'page').map((b) => b.textContent)).toEqual([
      'Crypts',
    ]);
  });

  it('shows the Ledger of the Dead with its charts', () => {
    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: 'Ledger of the Dead' }));
    expect(screen.getByRole('button', { name: 'Ledger of the Dead' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 2, name: 'Ledger of the Dead' })).toBeTruthy();
    expect(screen.getByRole('region', { name: en['stats.retention'] })).toBeTruthy();
    expect(screen.getByRole('region', { name: en['stats.forecast'] })).toBeTruthy();
    expect(screen.getByText(en['stats.noData'])).toBeTruthy();
  });

  it('marks the current view with aria-current and shows its content', () => {
    render(h(App, null));
    expect(screen.getByRole('button', { name: 'Crypts' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'New Crypt' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'The Graveyard' }));
    expect(screen.getByRole('button', { name: 'The Graveyard' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'Crypts' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('group', { name: 'The Graveyard' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: en['nav.seance'] }));
    expect(screen.getByRole('heading', { level: 2, name: en['seance.title'] })).toBeTruthy();
    expect(screen.getByText('No cards to review')).toBeTruthy();
  });

  it('is operable from the keyboard (buttons are natively focusable)', () => {
    render(h(App, null));
    const seance = screen.getByRole('button', { name: en['nav.seance'] });
    seance.focus();
    expect(document.activeElement).toBe(seance);
    expect(seance.getAttribute('tabindex')).toBeNull();
  });

  it('returns to the graveyard when the séance queue empties', async () => {
    const deck = createDeck('Crypt');
    const card = addCard(deck.id, 'only', 'the answer', null);
    updateCardSrs(card.id, { ...card.srs, dueDate: addDays(new Date(), -1) });

    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.seance'] }));
    fireEvent.keyDown(document.body, { key: ' ' });
    await screen.findByRole('button', { name: 'Grade Again' });
    fireEvent.keyDown(document.body, { key: '3' });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'The Graveyard' }).getAttribute('aria-current')).toBe('page'),
    );
    expect(screen.getByRole('group', { name: 'The Graveyard' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(en['seance.complete']);

    // Choosing any view clears the completion notice.
    fireEvent.click(screen.getByRole('button', { name: 'Crypts' }));
    expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('empty Graveyard buttons (costume-polish CP-53, CP-55)', () => {
  it('"Open the Crypts" in the empty Graveyard switches to the Crypts view', () => {
    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.graveyard'] }));
    expect(screen.getByText(en['graveyard.noCards'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en['graveyard.openCrypts'] }));
    expect(screen.getByRole('button', { name: en['nav.crypts'] }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: 'New Crypt' })).toBeTruthy();
  });

  it('"Begin a seance" in the untouched Graveyard switches to the Seance view', () => {
    const deck = createDeck('Crypt');
    addCard(deck.id, 'only', 'the answer', null);
    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.graveyard'] }));
    expect(screen.getByText(en['graveyard.inviteNew'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: en['graveyard.beginSeance'] }));
    expect(screen.getByRole('button', { name: en['nav.seance'] }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('heading', { level: 2, name: en['seance.title'] })).toBeTruthy();
    expect(screen.queryByText(en['graveyard.inviteNew'])).toBeNull();
  });

  it('is gone from the Graveyard once a review has been logged', () => {
    const deck = createDeck('Crypt');
    const card = addCard(deck.id, 'only', 'the answer', null);
    reviewLog.value = [{ date: new Date(), cardId: card.id, grade: 2, correct: true }];
    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.graveyard'] }));
    expect(screen.queryByRole('button', { name: en['graveyard.beginSeance'] })).toBeNull();
  });
});