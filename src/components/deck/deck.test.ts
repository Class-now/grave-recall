/**
 * Component tests for deck and card management (Task 8).
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';

import {
  activeDeckId,
  addCard,
  cards,
  createDeck,
  decks,
  getCardsForDeck,
} from '../../store';
import { locale } from '../../store/prefs';
import { App } from '../../app';

import { BulkImport, parseBulkText } from './BulkImport';
import { CardEditor, validateCard } from './CardEditor';
import { CryptEditor } from './CryptEditor';
import { CryptList, validateCryptName } from './CryptList';

function resetState(): void {
  decks.value = [];
  cards.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  localStorage.clear();
}

function typeInto(el: HTMLElement, value: string): void {
  fireEvent.input(el, { target: { value } });
}

beforeEach(resetState);
afterEach(() => {
  cleanup();
  resetState();
});

describe('CryptList', () => {
  it('creates a crypt (happy path), persists it, and opens it', () => {
    render(h(CryptList, null));

    fireEvent.click(screen.getByRole('button', { name: 'New Crypt' }));
    typeInto(screen.getByLabelText('Crypt name'), '  Spanish  ');
    fireEvent.click(screen.getByRole('button', { name: 'Create Crypt' }));

    expect(decks.value).toHaveLength(1);
    expect(decks.value[0]?.name).toBe('Spanish');
    expect(activeDeckId.value).toBe(decks.value[0]?.id);
    expect(localStorage.getItem('grave-recall-data')).toContain('Spanish');
  });

  it('shows a validation error for an empty or whitespace-only name and creates nothing', () => {
    render(h(CryptList, null));

    fireEvent.click(screen.getByRole('button', { name: 'New Crypt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Crypt' }));
    expect(screen.getByRole('alert').textContent).toBe('Crypt name is required');
    expect(screen.getByLabelText('Crypt name').getAttribute('aria-invalid')).toBe('true');

    typeInto(screen.getByLabelText('Crypt name'), '   ');
    fireEvent.click(screen.getByRole('button', { name: 'Create Crypt' }));
    expect(screen.getByRole('alert').textContent).toBe('Crypt name is required');
    expect(decks.value).toHaveLength(0);
  });

  it('rejects names longer than 80 characters', () => {
    expect(validateCryptName('x'.repeat(80))).toBeNull();
    expect(validateCryptName('x'.repeat(81))).toBe('crypt.nameTooLong');
    expect(validateCryptName('')).toBe('crypt.nameRequired');
  });

  it('renames inline, and keeps the old name when the new one is empty', () => {
    const deck = createDeck('Old');
    render(h(CryptList, null));

    fireEvent.click(screen.getByRole('button', { name: 'Rename crypt Old' }));
    typeInto(screen.getByLabelText('Crypt name'), '');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toBe('Crypt name is required');
    expect(decks.value[0]?.name).toBe('Old');

    typeInto(screen.getByLabelText('Crypt name'), 'New');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(decks.value[0]?.name).toBe('New');
    expect(decks.value[0]?.id).toBe(deck.id);
    expect(screen.queryByLabelText('Crypt name')).toBeNull();
  });

  it('moves focus between crypts with the arrow keys, Home and End', () => {
    createDeck('A');
    createDeck('B');
    createDeck('C');
    render(h(CryptList, null));

    const open = ['A', 'B', 'C'].map((n) => screen.getByRole('button', { name: `Open crypt ${n}` }));
    open[0]?.focus();
    fireEvent.keyDown(open[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(open[1]);
    fireEvent.keyDown(open[1] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(open[2]);
    fireEvent.keyDown(open[2] as HTMLElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(open[1]);
    fireEvent.keyDown(open[1] as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(open[0]);
  });

  describe('delete confirmation dialog', () => {
    it('traps focus, closes on Escape and restores focus to the opener', async () => {
      const user = userEvent.setup();
      createDeck('Doomed');
      render(h(CryptList, null));

      const deleteButton = screen.getByRole('button', { name: 'Delete crypt Doomed' });
      deleteButton.focus();
      await user.click(deleteButton);

      const dialog = screen.getByRole('alertdialog');
      const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
      const confirm = within(dialog).getByRole('button', { name: 'Delete' });
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(document.activeElement).toBe(cancel);

      await user.tab();
      expect(document.activeElement).toBe(confirm);
      await user.tab(); // wraps instead of leaving the dialog
      expect(document.activeElement).toBe(cancel);
      await user.tab({ shift: true }); // wraps backwards
      expect(document.activeElement).toBe(confirm);

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(decks.value).toHaveLength(1);
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete crypt Doomed' }));
    });

    it('deletes the crypt and its cards only after confirmation', () => {
      const doomed = createDeck('Doomed');
      const kept = createDeck('Kept');
      addCard(doomed.id, 'a', 'b', null);
      addCard(kept.id, 'c', 'd', null);
      render(h(CryptList, null));

      fireEvent.click(screen.getByRole('button', { name: 'Delete crypt Doomed' }));
      expect(decks.value).toHaveLength(2);

      fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
      expect(decks.value.map((d) => d.name)).toEqual(['Kept']);
      expect(getCardsForDeck(doomed.id)).toHaveLength(0);
      expect(getCardsForDeck(kept.id)).toHaveLength(1);
      expect(screen.queryByRole('alertdialog')).toBeNull();
    });
  });
});

describe('CardEditor', () => {
  it('shows field-level errors for empty front and back and adds nothing', () => {
    const deck = createDeck('D');
    render(h(CardEditor, { deckId: deck.id }));

    fireEvent.click(screen.getByRole('button', { name: 'Add Card' }));

    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(['Front is required', 'Back is required']);
    expect(screen.getByLabelText('Front').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(screen.getByLabelText('Front'));
    expect(cards.value).toHaveLength(0);
  });

  it('adds a card with a new-card scheduler state and clears the form', () => {
    const deck = createDeck('D');
    render(h(CardEditor, { deckId: deck.id }));

    typeInto(screen.getByLabelText('Front'), ' bonjour ');
    typeInto(screen.getByLabelText('Back'), 'hello');
    fireEvent.click(screen.getByRole('button', { name: 'Add Card' }));

    expect(cards.value).toHaveLength(1);
    const card = cards.value[0];
    expect(card?.front).toBe('bonjour');
    expect(card?.example).toBeNull();
    expect(card?.srs.srsState).toBe('new');
    expect((screen.getByLabelText('Front') as HTMLInputElement).value).toBe('');
    expect(localStorage.getItem('grave-recall-data')).toContain('bonjour');
  });

  it('edits text without resetting scheduler state, and keeps originals on invalid edit', () => {
    const deck = createDeck('D');
    const card = addCard(deck.id, 'front', 'back', 'ex');
    const srs = { ...card.srs, reps: 4, stability: 12 };
    cards.value = cards.value.map((c) => ({ ...c, srs }));
    const current = cards.value[0];
    if (current === undefined) throw new Error('card missing');

    let done = 0;
    render(h(CardEditor, { deckId: deck.id, card: current, onDone: () => { done++; } }));

    typeInto(screen.getByLabelText('Front'), '');
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }));
    expect(screen.getByRole('alert').textContent).toBe('Front is required');
    expect(cards.value[0]?.front).toBe('front');
    expect(done).toBe(0);

    typeInto(screen.getByLabelText('Front'), 'new front');
    typeInto(screen.getByLabelText('Example (optional)'), '');
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }));
    expect(cards.value[0]?.front).toBe('new front');
    expect(cards.value[0]?.example).toBeNull();
    expect(cards.value[0]?.srs).toEqual(srs);
    expect(done).toBe(1);
  });

  it('validates length limits', () => {
    expect(validateCard('x'.repeat(200), 'b', '')).toEqual({});
    expect(validateCard('x'.repeat(201), 'b', '').front).toBe('card.frontTooLong');
    expect(validateCard('f', 'x'.repeat(501), '').back).toBe('card.backTooLong');
    expect(validateCard('f', 'b', 'x'.repeat(501)).example).toBe('card.exampleTooLong');
  });
});

describe('BulkImport', () => {
  it('imports valid rows and reports imported and skipped counts', () => {
    const deck = createDeck('D');
    render(h(BulkImport, { deckId: deck.id }));

    typeInto(
      screen.getByLabelText('Paste TSV or CSV data'),
      'hello,world\nfoo,bar,An example\nno-delimiter-line\nempty-back,\n'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Imported 2 cards');
    expect(status.textContent).toContain('Skipped 2 malformed rows');

    const imported = getCardsForDeck(deck.id);
    expect(imported.map((c) => [c.front, c.back, c.example])).toEqual([
      ['hello', 'world', null],
      ['foo', 'bar', 'An example'],
    ]);
    expect(imported.every((c) => c.srs.srsState === 'new')).toBe(true);
  });

  it('accepts TSV with Windows line endings', () => {
    const deck = createDeck('D');
    render(h(BulkImport, { deckId: deck.id }));

    typeInto(screen.getByLabelText('Paste TSV or CSV data'), 'a\tb\r\nc\td\r\n');
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(getCardsForDeck(deck.id).map((c) => c.back)).toEqual(['b', 'd']);
  });

  it('imports at most 500 cards per operation and says so', () => {
    const deck = createDeck('D');
    render(h(BulkImport, { deckId: deck.id }));

    const lines = Array.from({ length: 502 }, (_, i) => `w${i},d${i}`).join('\n');
    typeInto(screen.getByLabelText('Paste TSV or CSV data'), lines);
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));

    expect(getCardsForDeck(deck.id)).toHaveLength(500);
    const status = screen.getByRole('status').textContent ?? '';
    expect(status).toContain('Imported 500 cards');
    expect(status).toContain('Maximum 500 cards per import. 2 valid rows were not imported.');
  });

  it('shows an error and imports nothing for empty input', () => {
    const deck = createDeck('D');
    render(h(BulkImport, { deckId: deck.id }));

    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByRole('alert').textContent).toBe('Paste at least one row to import');
    expect(cards.value).toHaveLength(0);
  });

  it('parseBulkText skips single-cell rows, blank cells and over-length fields', () => {
    const result = parseBulkText(`ok,fine\nlonely\n${'x'.repeat(201)},back\n   ,back`);
    expect(result.rows).toEqual([{ front: 'ok', back: 'fine', example: null }]);
    expect(result.skipped).toBe(3);
  });
});

describe('CryptEditor and App flow', () => {
  it('deletes a card only after confirmation', () => {
    const deck = createDeck('D');
    addCard(deck.id, 'keep', 'k', null);
    addCard(deck.id, 'drop', 'd', null);
    activeDeckId.value = deck.id;
    render(h(CryptEditor, null));

    fireEvent.click(screen.getByRole('button', { name: 'Delete card drop' }));
    expect(cards.value).toHaveLength(2);
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete Card' }));

    expect(cards.value.map((c) => c.front)).toEqual(['keep']);
  });

  it('edits a card in place from the card list', () => {
    const deck = createDeck('D');
    addCard(deck.id, 'old', 'back', null);
    activeDeckId.value = deck.id;
    render(h(CryptEditor, null));

    fireEvent.click(screen.getByRole('button', { name: 'Edit card old' }));
    const front = within(screen.getByRole('form', { name: 'Edit Card' })).getByLabelText('Front');
    typeInto(front, 'newer');
    fireEvent.click(screen.getByRole('button', { name: 'Save Card' }));

    expect(cards.value[0]?.front).toBe('newer');
    expect(screen.getByText('newer')).toBeTruthy();
  });

  it('navigates to the new crypt after creating it', () => {
    render(h(App, null));

    fireEvent.click(screen.getByRole('button', { name: 'New Crypt' }));
    typeInto(screen.getByLabelText('Crypt name'), 'Latin');
    fireEvent.click(screen.getByRole('button', { name: 'Create Crypt' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Latin' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to crypts' }));
    expect(screen.getByRole('button', { name: 'Open crypt Latin' })).toBeTruthy();
  });

  it('renders Japanese strings when the locale is ja', () => {
    locale.value = 'ja';
    render(h(CryptList, null));
    expect(screen.getByRole('button', { name: '新しい墓所' })).toBeTruthy();
  });
});
