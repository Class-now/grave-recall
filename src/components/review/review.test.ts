/**
 * Séance tests (Task 10): flip, grade, keyboard flow, completion, jumpscare, focus.
 * Sounds are not mocked: a fake AudioContext lets the real sound functions run, and
 * the published caption identifies which sound played.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

import { Candle } from './Candle';
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

// ---- Candles, table and 3D flip (costume-polish Task 5) ----------------------

describe('seance candles', () => {
  const candles = (): Element[] => Array.from(document.querySelectorAll('.gr-candle'));
  const lit = (): (string | null)[] => candles().map((c) => c.getAttribute('data-lit'));

  /** Starts a session of `count` due cards and grades the current card with `key`. */
  async function gradeWith(key: string): Promise<void> {
    fireEvent.keyDown(document.body, { key: ' ' });
    await screen.findByRole('button', { name: 'Grade Again' });
    fireEvent.keyDown(document.body, { key });
  }

  function startSession(count: number, srs: { stability?: number } = {}): void {
    const deckId = createDeck('Crypt').id;
    for (let i = 0; i < count; i += 1) dueCard(`card ${i}`, srs, deckId);
    renderSeance();
  }

  it('shows one candle on each side of the card, unlit at session start', () => {
    startSession(2);
    expect(candles()).toHaveLength(2);
    expect(lit()).toEqual(['false', 'false']);
    const table = document.querySelector('.gr-table');
    expect(table?.children[0]?.querySelector('.gr-candle')).not.toBeNull();
    expect(table?.children[1]?.classList.contains('gr-flipcard')).toBe(true);
    expect(table?.children[2]?.querySelector('.gr-candle')).not.toBeNull();
    expect(document.querySelectorAll('.gr-candle__ember')).toHaveLength(2);
    expect(document.querySelector('.gr-candle__fire')).toBeNull();
  });

  it.each(['3', '4'])('key %s (Good or Easy) lights both candles', async (key) => {
    startSession(2);
    await gradeWith(key);
    expect(lit()).toEqual(['true', 'true']);
    expect(document.querySelectorAll('.gr-candle__fire')).toHaveLength(2);
    expect(document.querySelector('.gr-candle__ember')).toBeNull();
  });

  it.each(['1', '2'])('key %s (Again or Hard) leaves both candles unlit', async (key) => {
    startSession(2);
    await gradeWith(key);
    expect(lit()).toEqual(['false', 'false']);
  });

  it('Good then Again puts the flames out again', async () => {
    startSession(3);
    await gradeWith('3');
    expect(lit()).toEqual(['true', 'true']);
    await gradeWith('1');
    expect(lit()).toEqual(['false', 'false']);
  });

  it('Good then Hard puts the flames out too', async () => {
    startSession(3);
    await gradeWith('4');
    await gradeWith('2');
    expect(lit()).toEqual(['false', 'false']);
  });

  it('renders the flare and flicker classes under full motion', async () => {
    startSession(2);
    expect(document.querySelector('.gr-candle__flame--flare')).toBeNull();
    await gradeWith('3');
    expect(document.querySelectorAll('.gr-candle__flame--flare')).toHaveLength(2);
    expect(document.querySelectorAll('.gr-candle__flame--flicker')).toHaveLength(2);
  });

  it('restarts the flare on every Good or Easy by remounting the flame', async () => {
    startSession(3);
    await gradeWith('3');
    const first = document.querySelector('.gr-candle__flame--flare');
    await gradeWith('4');
    const second = document.querySelector('.gr-candle__flame--flare');
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
  });

  it('adds neither flare nor flicker under reduced motion, while data-lit still updates', async () => {
    reducedMotionUser.value = true;
    startSession(3);
    await gradeWith('3');
    expect(lit()).toEqual(['true', 'true']);
    expect(document.querySelector('.gr-candle__flame--flare')).toBeNull();
    expect(document.querySelector('.gr-candle__flame--flicker')).toBeNull();
    expect(document.querySelectorAll('.gr-candle__fire')).toHaveLength(2);
    await gradeWith('1');
    expect(lit()).toEqual(['false', 'false']);
  });

  it('Coward mode: Again leaves the candles unlit with no jumpscare, and Good still lights them', async () => {
    cowardMode.value = true;
    startSession(3, { stability: 30 });
    await gradeWith('1');
    expect(lit()).toEqual(['false', 'false']);
    expect(document.querySelector('.gr-jumpscare')).toBeNull();
    await gradeWith('3');
    expect(lit()).toEqual(['true', 'true']);
    expect(document.querySelector('.gr-jumpscare')).toBeNull();
  });

  it('the candles are hidden from assistive technology and have no focusable descendants', async () => {
    startSession(2);
    await gradeWith('3');
    for (const candle of candles()) {
      expect(candle.getAttribute('aria-hidden')).toBe('true');
      expect(candle.getAttribute('focusable')).toBe('false');
      expect(candle.querySelectorAll('a, button, input, select, textarea, [tabindex], [role]')).toHaveLength(0);
      expect(candle.textContent).toBe('');
    }
  });

  it('Candle pauses its animations while the tab is hidden and gives each instance its own gradient id', () => {
    const { container } = render(
      h('div', null, [
        h(Candle, { lit: true, flare: 1, paused: true, motion: true }),
        h(Candle, { lit: true, flare: 1, paused: false, motion: true }),
      ]),
    );
    const [a, b] = Array.from(container.querySelectorAll('.gr-candle'));
    expect(a?.classList.contains('gr-candle--paused')).toBe(true);
    expect(b?.classList.contains('gr-candle--paused')).toBe(false);
    const ids = Array.from(container.querySelectorAll('radialGradient')).map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('3D flip and parchment card', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'review.css'), 'utf8');

  /** The body of `@keyframes name { ... }`, found by matching braces. */
  function keyframes(name: string): string {
    const start = css.indexOf(`@keyframes ${name}`);
    expect(start, `@keyframes ${name} exists`).toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}' && (depth -= 1) === 0) return css.slice(open + 1, i);
    }
    throw new Error(`unterminated @keyframes ${name}`);
  }

  function animatedProperties(body: string): string[] {
    const props = new Set<string>();
    for (const block of body.matchAll(/\{([^}]*)\}/g)) {
      for (const decl of (block[1] ?? '').split(';')) {
        const prop = decl.split(':')[0]?.trim();
        if (prop) props.add(prop);
      }
    }
    return [...props].sort();
  }

  it('review.css sets up a perspective container with hidden back faces', () => {
    expect(css).toContain('perspective');
    expect(css).toContain('transform-style: preserve-3d');
    expect(css).toContain('backface-visibility: hidden');
    expect(css).toContain('rotateY(180deg)');
    expect(css).toMatch(/\.gr-flipcard\[data-flipped='true'\] \.gr-flipcard__inner\s*\{[^}]*rotateY\(180deg\)/);
  });

  it.each(['card-flip', 'candle-flare', 'candle-flicker'])('the %s keyframes animate only transform and opacity', (name) => {
    for (const prop of animatedProperties(keyframes(name))) {
      expect(['opacity', 'transform']).toContain(prop);
    }
  });

  it('uses motion tokens for the flip and candle durations', () => {
    expect(css).toMatch(/\.gr-flipcard__inner--flip\s*\{\s*animation: card-flip var\(--motion-normal\) cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
    expect(css).toMatch(/animation: candle-flare var\(--motion-slow\)/);
    expect(css).toMatch(/animation: candle-flicker calc\(var\(--motion-fast\) \* 2\) steps\(3\)/);
    expect(css).toMatch(/\.gr-candle--paused[^{]*\{[^}]*animation-play-state: paused/);
  });

  it('puts the parchment card on the table and keeps text inside the token palette', () => {
    expect(css).toMatch(/background: var\(--color-parchment\)/);
    expect(css).toContain('var(--color-text-inverse)');
    expect(css).toContain('var(--color-ink-secondary)');
    expect(css).toContain('var(--color-grave-soil)');
    expect(css).toContain('var(--color-stone-dark)');
    expect(css).toMatch(/\.gr-flipcard__flip:focus-visible\s*\{[^}]*var\(--color-focus-ring\)[^}]*var\(--color-void\)/);
    expect(css).toMatch(/@media \(max-width: 40rem\)/);
  });

  it('full motion: the inner box and the back carry the flip classes once flipped', () => {
    const card = dueCard('one');
    const props = { card, flipped: true, onFlip: () => undefined, backId: 'back' };
    const { container } = render(h(FlipCard, props));
    expect(container.querySelector('.gr-flipcard__inner--flip')).not.toBeNull();
    expect(container.querySelector('.gr-flipcard__back--flip')).not.toBeNull();
  });

  it('full motion: the inner box does not animate while the card is face-down', () => {
    const card = dueCard('one');
    const { container } = render(h(FlipCard, { card, flipped: false, onFlip: () => undefined, backId: 'back' }));
    expect(container.querySelector('.gr-flipcard__inner--flip')).toBeNull();
    expect(container.querySelector('.gr-flipcard__back')).toBeNull();
  });

  it('reduced motion: neither flip class is present and the back is still rendered', () => {
    reducedMotionUser.value = true;
    const card = dueCard('one');
    const { container } = render(h(FlipCard, { card, flipped: true, onFlip: () => undefined, backId: 'back' }));
    expect(container.querySelector('.gr-flipcard__inner--flip')).toBeNull();
    expect(container.querySelector('.gr-flipcard__back--flip')).toBeNull();
    expect(container.querySelector('.gr-flipcard[data-flipped="true"] .gr-flipcard__back')).not.toBeNull();
  });

  it('shows the front word once, never repeated as a text node on the back', () => {
    const card = dueCard('unique');
    const { container } = render(h(FlipCard, { card, flipped: true, onFlip: () => undefined, backId: 'back' }));
    expect(screen.getAllByText('unique')).toHaveLength(1);
    expect(container.querySelector('#back')?.getAttribute('data-front')).toBe('unique');
  });
});

describe('empty seance table (costume-polish CP-56)', () => {
  it('shows the table, two unlit candles and a blank parchment card with the existing messages', () => {
    const { container } = render(h(SeanceSession, { deckId: null }));
    expect(container.querySelector('.gr-table')).not.toBeNull();
    const candles = Array.from(container.querySelectorAll('.gr-candle'));
    expect(candles).toHaveLength(2);
    expect(candles.every((c) => c.getAttribute('data-lit') === 'false')).toBe(true);
    const card = container.querySelector('.gr-flipcard--blank') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.textContent).toContain(en['seance.noCards']);
    expect(card.textContent).toContain(en['seance.noCardsDesc']);
    expect(screen.getAllByText(en['seance.noCards'])).toHaveLength(1);
    expect(screen.getByText(en['seance.tableEmpty'])).toBeTruthy();
  });

  it('has no flip control, no grade buttons and no button at all', () => {
    const { container } = render(h(SeanceSession, { deckId: null }));
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('.gr-flipcard__flip')).toBeNull();
    expect(container.querySelector('.gr-grades')).toBeNull();
    expect(container.querySelector('[data-flipped]')).toBeNull();
  });

  it('shows the same table when cards exist but none is due', () => {
    const deck = createDeck('Later');
    const card = addCard(deck.id, 'later', 'b', null);
    updateCardSrs(card.id, { ...card.srs, dueDate: addDays(new Date(), 3) });
    const { container } = render(h(SeanceSession, { deckId: null }));
    expect(container.querySelectorAll('.gr-candle[data-lit="false"]')).toHaveLength(2);
    expect(container.querySelector('.gr-flipcard--blank')).not.toBeNull();
  });

  it('keeps the candles hidden from assistive technology and unlit under reduced motion', () => {
    reducedMotion.value = true;
    const { container } = render(h(SeanceSession, { deckId: null }));
    for (const candle of Array.from(container.querySelectorAll('.gr-candle'))) {
      expect(candle.getAttribute('aria-hidden')).toBe('true');
      expect(candle.getAttribute('data-lit')).toBe('false');
    }
    expect(container.querySelector('.gr-candle__flame--flare, .gr-candle__flame--flicker')).toBeNull();
  });

  it('renders in Japanese', () => {
    locale.value = 'ja';
    render(h(SeanceSession, { deckId: null }));
    expect(screen.getByText(ja['seance.noCards'])).toBeTruthy();
    expect(screen.getByText(ja['seance.tableEmpty'])).toBeTruthy();
  });
});