/**
 * Séance tests (Task 10): flip, grade, keyboard flow, completion, jumpscare, focus.
 * Sounds are not mocked: a fake AudioContext lets the real sound functions run, and
 * the published caption identifies which sound played.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';

import {
  activeDeckId,
  addCard,
  cards,
  createDeck,
  currentCard,
  decks,
  loadState,
  reviewLog,
  updateCardSrs,
  type Card,
} from '../../store';
import { cowardMode, locale, reducedMotion, reducedMotionUser } from '../../store/prefs';
import { captionEvent, resetCaptions, type SoundId } from '../../audio/captions';
import { markGestureOccurred, resetAudioContext } from '../../audio/context';
import { en } from '../../i18n/en';
import { ja } from '../../i18n/ja';
import { addDays } from '../../utils/date';

import { FakeAudioContext } from '../../__fixtures__/fake-audio';

import { FlipCard } from './FlipCard';
import { GradeButtons } from './GradeButtons';
import { SeanceSession } from './SeanceSession';

// ---- Helpers -----------------------------------------------------------------

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  cowardMode.value = false;
  reducedMotionUser.value = false;
  reducedMotion.value = false;
  resetCaptions();
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeAudioContext);
  resetAudioContext();
  resetState();
  markGestureOccurred();
});

afterEach(() => {
  cleanup();
  resetAudioContext();
  vi.unstubAllGlobals();
  resetState();
});

/** Adds a card that is already due. */
function dueCard(front: string, srs: { stability?: number } = {}, deckId = createDeck('Crypt').id): Card {
  const card = addCard(deckId, front, `${front} back`, `${front} example`);
  updateCardSrs(card.id, { ...card.srs, ...srs, dueDate: addDays(new Date(), -1) });
  return cards.value.find((c) => c.id === card.id) ?? card;
}

function lastSound(): SoundId | undefined {
  return captionEvent.value?.soundId;
}

async function flipWithSpace(): Promise<void> {
  fireEvent.keyDown(document.body, { key: ' ' });
  await screen.findByRole('button', { name: 'Grade Again' });
}

function renderSeance(props: { deckId?: string | null; onComplete?: () => void } = {}): void {
  render(h(SeanceSession, props as never));
}

// ---- Tests -------------------------------------------------------------------

describe('queue start', () => {
  it('shows a message and plays nothing when no cards are due', () => {
    const deck = createDeck('Empty');
    const card = addCard(deck.id, 'later', 'b', null);
    updateCardSrs(card.id, { ...card.srs, dueDate: addDays(new Date(), 3) });
    const onComplete = vi.fn();
    renderSeance({ onComplete });

    expect(screen.getByText('No cards to review')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(captionEvent.value).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the front face and the remaining count', () => {
    const deckId = createDeck('Crypt').id;
    dueCard('one', {}, deckId);
    dueCard('two', {}, deckId);
    renderSeance();

    expect(screen.getByText('2 remaining')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Press Space or tap to reveal/ })).toBeTruthy();
  });

  it('limits the queue to the given crypt', () => {
    dueCard('mine');
    dueCard('theirs');
    const mine = cards.value.find((c) => c.front === 'mine');
    renderSeance({ deckId: mine?.deckId ?? null });

    expect(screen.getByText('1 remaining')).toBeTruthy();
    expect(screen.getByText('mine')).toBeTruthy();
    expect(screen.queryByText('theirs')).toBeNull();
  });

  it('ends the session on unmount', () => {
    dueCard('one');
    renderSeance();
    expect(currentCard.value).not.toBeNull();
    cleanup();
    expect(currentCard.value).toBeNull();
  });
});

describe('flip', () => {
  it('hides the grade buttons until the card is flipped', () => {
    dueCard('one');
    renderSeance();
    expect(screen.queryByRole('button', { name: 'Grade Again' })).toBeNull();
    expect(screen.queryByText('one back')).toBeNull();
  });

  it('Space reveals the back, shows the grade buttons and plays the page turn', async () => {
    dueCard('one');
    renderSeance();
    await flipWithSpace();

    expect(screen.getByText('one back')).toBeTruthy();
    expect(screen.getByText('one example')).toBeTruthy();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Grade Again',
      'Grade Hard',
      'Grade Good',
      'Grade Easy',
    ]);
    expect(lastSound()).toBe('page-turn');
  });

  it('a tap on the card reveals the back', async () => {
    dueCard('one');
    renderSeance();
    fireEvent.click(screen.getByRole('button', { name: /Press Space or tap to reveal/ }));
    await screen.findByRole('button', { name: 'Grade Good' });
    expect(screen.getByText('one back')).toBeTruthy();
  });

  it('puts focus on the flip button for a new card and on Again after the flip', async () => {
    dueCard('one');
    renderSeance();
    const flip = screen.getByRole('button', { name: /Press Space or tap to reveal/ });
    await waitFor(() => expect(document.activeElement).toBe(flip));

    await flipWithSpace();
    const again = screen.getByRole('button', { name: 'Grade Again' });
    await waitFor(() => expect(document.activeElement).toBe(again));
  });

  it('lets the focused Again button read the answer', async () => {
    dueCard('one');
    renderSeance();
    await flipWithSpace();
    const describedBy = screen.getByRole('button', { name: 'Grade Again' }).getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')?.textContent).toContain('one back');
  });

  it('does not react to Space pressed in a text field outside the séance', () => {
    dueCard('one');
    renderSeance();
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: ' ' });
    input.remove();
    expect(screen.queryByText('one back')).toBeNull();
  });

  it('plays the flip animation class in full motion and omits it under reduced motion', () => {
    const card = dueCard('one');
    const props = { card, flipped: true, onFlip: () => undefined, backId: 'back' };

    const full = render(h(FlipCard, props));
    expect(full.container.querySelector('.gr-flipcard__back--flip')).not.toBeNull();
    full.unmount();

    reducedMotionUser.value = true;
    const reduced = render(h(FlipCard, props));
    expect(reduced.container.querySelector('.gr-flipcard__back')).not.toBeNull();
    expect(reduced.container.querySelector('.gr-flipcard__back--flip')).toBeNull();
  });
});

describe('grading', () => {
  it('key 1 grades Again, plays the ghost scream and records the failure', async () => {
    dueCard('one');
    dueCard('spare');
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '1' });

    expect(lastSound()).toBe('ghost-scream');
    expect(reviewLog.value).toHaveLength(1);
    expect(reviewLog.value[0]).toMatchObject({ grade: 0, correct: false });
    const graded = cards.value.find((c) => c.id === reviewLog.value[0]?.cardId);
    expect(graded?.srs.reps).toBe(1);
    expect(graded?.srs.lapses).toBe(1);
  });

  it('key 1 plays the soft chime instead in Coward mode', async () => {
    cowardMode.value = true;
    dueCard('one');
    dueCard('spare');
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '1' });

    expect(lastSound()).toBe('coward-chime');
    expect(reviewLog.value[0]?.grade).toBe(0);
  });

  it.each([
    ['2', 1, 'hard-thud'],
    ['3', 2, 'candle-seal'],
    ['4', 3, 'candle-seal'],
  ] as const)('key %s grades %i and plays %s', async (key, grade, sound) => {
    dueCard('one');
    dueCard('spare');
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key });

    expect(reviewLog.value[0]?.grade).toBe(grade);
    expect(lastSound()).toBe(sound);
  });

  it('clicking a grade button grades the card', async () => {
    dueCard('one');
    renderSeance();
    await flipWithSpace();
    fireEvent.click(screen.getByRole('button', { name: 'Grade Good' }));
    expect(reviewLog.value[0]).toMatchObject({ grade: 2, correct: true });
  });

  it('ignores grade keys while the card is face-down', () => {
    dueCard('one');
    renderSeance();
    fireEvent.keyDown(document.body, { key: '1' });
    expect(reviewLog.value).toHaveLength(0);
    expect(captionEvent.value).toBeNull();
  });

  it('ignores grade keys with a modifier held or auto-repeat', async () => {
    dueCard('one');
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '3', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: '3', repeat: true });
    expect(reviewLog.value).toHaveLength(0);
  });

  it('ignores a second grade key pressed before the next card is flipped', async () => {
    const deckId = createDeck('Crypt').id;
    dueCard('one', {}, deckId);
    dueCard('two', {}, deckId);
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '3' });
    fireEvent.keyDown(document.body, { key: '3' });
    expect(reviewLog.value).toHaveLength(1);
  });

  it('swallows a Space keyup that did not start on a grade button', async () => {
    dueCard('one');
    renderSeance();
    await flipWithSpace();
    const again = screen.getByRole('button', { name: 'Grade Again' });

    // fireEvent returns false when the event's default action was prevented.
    expect(fireEvent.keyUp(again, { key: ' ' })).toBe(false);
    fireEvent.keyDown(again, { key: ' ' });
    expect(fireEvent.keyUp(again, { key: ' ' })).toBe(true);
  });

  it('GradeButtons maps buttons and keys 1 to 4 to grades 0 to 3', () => {
    const onGrade = vi.fn();
    render(h(GradeButtons, { onGrade }));
    for (const key of ['1', '2', '3', '4']) fireEvent.keyDown(document.body, { key });
    expect(onGrade.mock.calls.map((c) => c[0])).toEqual([0, 1, 2, 3]);
    fireEvent.keyDown(document.body, { key: '5' });
    expect(onGrade).toHaveBeenCalledTimes(4);
  });
});

describe('full session', () => {
  it('Space then 2 advances to the next card', async () => {
    const deckId = createDeck('Crypt').id;
    dueCard('one', {}, deckId);
    dueCard('two', {}, deckId);
    renderSeance();
    const first = currentCard.value?.front;

    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '2' });

    await screen.findByText('1 remaining');
    expect(currentCard.value?.front).not.toBe(first);
    // The next card starts face-down, with the flip button focused.
    const flip = await screen.findByRole('button', { name: /Press Space or tap to reveal/ });
    expect(screen.queryByRole('button', { name: 'Grade Again' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(flip));
  });

  it('an empty queue tolls the bell, shows the completion screen and calls onComplete once', async () => {
    dueCard('only');
    const onComplete = vi.fn();
    renderSeance({ onComplete });

    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '3' });

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(lastSound()).toBe('session-end-toll');
    expect(screen.getByRole('heading', { name: en['seance.complete'] })).toBeTruthy();
    expect(screen.getByText('1 reviewed')).toBeTruthy();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders Japanese strings', () => {
    locale.value = 'ja';
    dueCard('one');
    renderSeance();
    expect(screen.getByRole('heading', { name: ja['seance.title'] })).toBeTruthy();
    expect(screen.getByText(ja['seance.remaining'].replace('{count}', '1'))).toBeTruthy();
  });
});

describe('jumpscare flash', () => {
  const flash = (): Element | null => document.querySelector('.gr-jumpscare');

  async function againOn(stability: number, key = '1'): Promise<void> {
    dueCard('one', { stability });
    dueCard('spare', { stability });
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key });
  }

  it('flashes on Again for a card with stability above 20', async () => {
    await againOn(30);
    expect(flash()).not.toBeNull();
    expect(flash()?.getAttribute('aria-hidden')).toBe('true');
  });

  it('removes the overlay when its animation ends', async () => {
    await againOn(30);
    const overlay = flash();
    expect(overlay).not.toBeNull();
    if (overlay) fireEvent.animationEnd(overlay);
    await waitFor(() => expect(flash()).toBeNull());
  });

  it('does not flash at stability 20 or below', async () => {
    await againOn(20);
    expect(flash()).toBeNull();
  });

  it('does not flash for other grades', async () => {
    await againOn(30, '2');
    expect(flash()).toBeNull();
  });

  it('is suppressed by reduced motion', async () => {
    reducedMotionUser.value = true;
    await againOn(30);
    expect(flash()).toBeNull();
    expect(lastSound()).toBe('ghost-scream');
  });

  it('is suppressed by Coward mode', async () => {
    cowardMode.value = true;
    await againOn(30);
    expect(flash()).toBeNull();
    expect(lastSound()).toBe('coward-chime');
  });
});

describe('persistence', () => {
  afterEach(() => localStorage.clear());

  it('saves the graded card and the review log, so history survives a reload', async () => {
    localStorage.clear();
    const card = dueCard('persisted');
    renderSeance();
    await flipWithSpace();
    fireEvent.keyDown(document.body, { key: '3' });

    const stored = JSON.parse(localStorage.getItem('grave-recall-data') ?? 'null');
    expect(stored.reviewLog).toHaveLength(1);
    expect(stored.reviewLog[0]).toMatchObject({ cardId: card.id, grade: 2, correct: true });

    // Reload: clear the in-memory log and restore it from storage.
    reviewLog.value = [];
    expect(loadState()).toBe(true);
    expect(reviewLog.value).toHaveLength(1);
    expect(reviewLog.value[0]!.date).toBeInstanceOf(Date);
  });
});
