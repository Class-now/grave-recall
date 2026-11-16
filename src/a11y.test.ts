/**
 * Accessibility audit (Task 13): automated axe-core checks, SVG semantics, tab
 * order and keyboard traps, and modal focus handling.
 */
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';

import {
  activeDeckId,
  addCard,
  addReviewLog,
  cards,
  createDeck,
  decks,
  reviewLog,
  setActiveDeck,
  updateCardSrs,
} from './store';
import { cowardMode, locale, reducedMotion, reducedMotionUser, showCaptions } from './store/prefs';
import { resetCaptions } from './audio/captions';
import { resetAudioContext } from './audio/context';
import { en } from './i18n/en';
import { ja } from './i18n/ja';
import { addDays } from './utils/date';

import { expectNoAxeViolations, PAGE_LEVEL_RULES } from './__fixtures__/axe';
import { App } from './app';
import { CryptEditor } from './components/deck/CryptEditor';
import { CryptList } from './components/deck/CryptList';
import { GraveyardScene } from './components/graveyard/GraveyardScene';
import { SeanceSession } from './components/review/SeanceSession';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { LedgerView } from './components/stats/LedgerView';

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  cowardMode.value = false;
  showCaptions.value = false;
  reducedMotionUser.value = false;
  reducedMotion.value = false;
  resetCaptions();
}

/** Two crypts; some cards are overdue (they get ghosts), some are new, some are stable. */
function seed(cardCount = 6): void {
  const english = createDeck('English');
  createDeck('French');
  for (let i = 0; i < cardCount; i++) {
    const card = addCard(english.id, `word${i}`, `meaning ${i}`, i % 2 === 0 ? `Example ${i}.` : null);
    updateCardSrs(card.id, {
      ...card.srs,
      stability: i * 12,
      dueDate: addDays(new Date(), i % 3 === 0 ? -(i + 1) : i + 1),
      lastReviewed: addDays(new Date(), -3),
      srsState: 'review',
    });
  }
  const first = cards.value[0];
  if (first !== undefined) {
    addReviewLog({ date: new Date(), cardId: first.id, grade: 2, correct: true });
    addReviewLog({ date: addDays(new Date(), -1), cardId: first.id, grade: 0, correct: false });
  }
}

/** Makes every seeded card due now, so a séance has something to review. */
function makeAllDue(): void {
  cards.value = cards.value.map((c) => ({ ...c, srs: { ...c.srs, dueDate: addDays(new Date(), -1) } }));
}

beforeEach(() => {
  resetAudioContext();
  resetState();
});

afterEach(() => {
  cleanup();
  resetAudioContext();
  resetState();
});

const COMPONENT_RULES = { disable: PAGE_LEVEL_RULES };

describe('axe-core: zero violations', () => {
  it('the checker itself reports a real violation (a button with no name)', async () => {
    const { container } = render(h('button', { type: 'button' }));
    await expect(expectNoAxeViolations(container, COMPONENT_RULES)).rejects.toThrow(/button-name/);
  });

  it('<GraveyardScene> with graves, ghosts and the detail panel open', async () => {
    seed();
    const { container } = render(h(GraveyardScene, null));
    expect(container.querySelectorAll('[data-ghost-for]').length).toBeGreaterThan(0);
    await expectNoAxeViolations(container, COMPONENT_RULES);

    fireEvent.click(container.querySelector('[data-card-id]') as Element);
    await screen.findByRole('dialog');
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('<GraveyardScene> with no cards', async () => {
    const { container } = render(h(GraveyardScene, null));
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('<SeanceSession> face-down, face-up and with nothing due', async () => {
    seed();
    makeAllDue();
    const { container, unmount } = render(h(SeanceSession, { deckId: null }));
    await screen.findByRole('button', { name: /word/ });
    await expectNoAxeViolations(container, COMPONENT_RULES);

    fireEvent.keyDown(document.body, { key: ' ' });
    await screen.findByRole('button', { name: 'Grade Again' });
    await expectNoAxeViolations(container, COMPONENT_RULES);
    unmount();

    cards.value = [];
    const empty = render(h(SeanceSession, { deckId: null }));
    await expectNoAxeViolations(empty.container, COMPONENT_RULES);
  });

  it('<LedgerView> with and without review history', async () => {
    const empty = render(h(LedgerView, null));
    await expectNoAxeViolations(empty.container, COMPONENT_RULES);
    empty.unmount();

    seed();
    const { container } = render(h(LedgerView, null));
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it.each(['en', 'ja'] as const)('<SettingsPanel> in %s', async (lang) => {
    locale.value = lang;
    const { container } = render(h(SettingsPanel, null));
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('<CryptList> list, new-crypt form with an error, and the delete dialog', async () => {
    seed();
    const { container } = render(h(CryptList, null));
    await expectNoAxeViolations(container, COMPONENT_RULES);

    fireEvent.click(screen.getByRole('button', { name: en['crypt.newCrypt'] }));
    fireEvent.click(screen.getByRole('button', { name: en['crypt.create'] }));
    await screen.findByRole('alert');
    await expectNoAxeViolations(container, COMPONENT_RULES);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete crypt English' }));
    await screen.findByRole('alertdialog');
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('<CryptEditor> card list, forms and the delete dialog', async () => {
    seed();
    setActiveDeck(decks.value[0]?.id ?? null);
    const { container } = render(h(CryptEditor, null));
    await expectNoAxeViolations(container, COMPONENT_RULES);

    fireEvent.click(screen.getByRole('button', { name: 'Delete card word0' }));
    await screen.findByRole('alertdialog');
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('<App> shell in every view, with the page-level rules on', async () => {
    seed();
    const { container } = render(h(App, null));
    for (const view of [
      en['nav.crypts'],
      en['nav.graveyard'],
      en['nav.seance'],
      en['nav.stats'],
      en['nav.settings'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: view }));
      await expectNoAxeViolations(container);
    }
  });
});

describe('page language', () => {
  it('<html lang> follows the UI language without a reload', async () => {
    render(h(App, null));
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    act(() => {
      locale.value = 'ja';
    });
    await waitFor(() => expect(document.documentElement.lang).toBe('ja'));
    act(() => {
      locale.value = 'en';
    });
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });
});

describe('SVG semantics (AC-17.2, AC-28.2)', () => {
  it('every tombstone has role, aria-label, a tab stop and Enter/Space handlers', async () => {
    seed();
    const { container } = render(h(GraveyardScene, null));
    const graves = Array.from(container.querySelectorAll<SVGGElement>('[data-card-id]'));
    expect(graves).toHaveLength(6);
    for (const grave of graves) {
      expect(grave.getAttribute('role')).toBe('button');
      expect(grave.getAttribute('aria-label')).toMatch(/^Grave for word\d, due /);
      expect(grave.hasAttribute('tabindex')).toBe(true);
    }

    for (const key of ['Enter', ' ']) {
      const grave = graves[1] as SVGGElement;
      fireEvent.keyDown(grave, { key });
      await screen.findByRole('dialog');
      fireEvent.keyDown(document.body, { key: 'Escape' });
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('every ghost has role and aria-label naming its card', () => {
    seed();
    const { container } = render(h(GraveyardScene, null));
    const ghosts = Array.from(container.querySelectorAll('[data-ghost-for]'));
    expect(ghosts.length).toBeGreaterThan(0);
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('role')).toBe('img');
      expect(ghost.getAttribute('aria-label')).toMatch(/^Ghost of word\d$/);
    }
  });

  it('keeps role and aria-label after switching language', () => {
    seed();
    locale.value = 'ja';
    const { container } = render(h(GraveyardScene, null));
    const labels = Array.from(container.querySelectorAll('[data-card-id], [data-ghost-for]')).map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(labels.every((l) => typeof l === 'string' && l.length > 0)).toBe(true);
    expect(labels.some((l) => l?.includes('Grave for'))).toBe(false);
  });
});

/**
 * Everything a Tab key can land on, in document order (no tabindex="-1", nothing
 * disabled). A radio group is one Tab stop: the checked radio, else the first.
 */
function tabStops(root: ParentNode): HTMLElement[] {
  const selector = 'a[href], button, input, select, textarea, [tabindex]';
  const all = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('tabindex') !== '-1' &&
      !(el instanceof HTMLInputElement && el.type === 'hidden'),
  );
  return all.filter((el) => {
    if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || el.name === '') return true;
    const group = all.filter(
      (other): other is HTMLInputElement =>
        other instanceof HTMLInputElement && other.type === 'radio' && other.name === el.name,
    );
    return el === (group.find((r) => r.checked) ?? group[0]);
  });
}

describe('tab order and keyboard traps (AC-28.1, AC-28.4)', () => {
  const VIEWS = [
    en['nav.crypts'],
    en['nav.graveyard'],
    en['nav.seance'],
    en['nav.stats'],
    en['nav.settings'],
  ];

  it.each(VIEWS)('%s: no positive tabindex anywhere', (view) => {
    seed();
    const { container } = render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: view }));
    for (const el of Array.from(container.querySelectorAll('[tabindex]'))) {
      expect(Number(el.getAttribute('tabindex'))).toBeLessThanOrEqual(0);
    }
  });

  it.each(VIEWS)('%s: Tab visits every control once, in document order, and leaves', async (view) => {
    seed(12);
    makeAllDue();
    const user = userEvent.setup();
    const { container } = render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: view }));

    const stops = tabStops(container);
    expect(stops.length).toBeGreaterThan(0);

    // Start from outside the app so the first Tab lands on the first stop.
    (document.activeElement as HTMLElement | null)?.blur();
    const visited: Element[] = [];
    for (let i = 0; i < stops.length; i++) {
      await user.tab();
      visited.push(document.activeElement as Element);
    }
    expect(visited).toEqual(stops);

    // One more Tab leaves the last control: focus is not trapped.
    await user.tab();
    expect(document.activeElement).not.toBe(stops[stops.length - 1]);
  });

  it('Shift+Tab walks back out of the app from the last control', async () => {
    seed();
    const user = userEvent.setup();
    const { container } = render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.settings'] }));
    const stops = tabStops(container);
    (stops[stops.length - 1] as HTMLElement).focus();
    for (let i = stops.length - 1; i > 0; i--) {
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(stops[i - 1]);
    }
  });

  it('the graveyard is a single Tab stop however many graves it has', () => {
    seed(150);
    const { container } = render(h(GraveyardScene, null));
    const graves = Array.from(container.querySelectorAll('[data-card-id]'));
    expect(graves).toHaveLength(150);
    expect(graves.filter((g) => g.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(graves.filter((g) => g.getAttribute('tabindex') === '-1')).toHaveLength(149);
  });

  it('arrow keys, Home and End move between graves and the Tab stop follows focus', () => {
    seed(30);
    const { container } = render(h(GraveyardScene, null));
    const graves = Array.from(container.querySelectorAll<SVGGElement>('[data-card-id]'));
    const stop = () => graves.filter((g) => g.getAttribute('tabindex') === '0');

    graves[0]?.focus();
    fireEvent.keyDown(graves[0] as Element, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(graves[1]);
    expect(stop()).toEqual([graves[1]]);

    fireEvent.keyDown(graves[1] as Element, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(graves[0]);
    fireEvent.keyDown(graves[0] as Element, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(graves[0]);

    fireEvent.keyDown(graves[0] as Element, { key: 'End' });
    expect(document.activeElement).toBe(graves[29]);
    expect(stop()).toEqual([graves[29]]);
    fireEvent.keyDown(graves[29] as Element, { key: 'Home' });
    expect(document.activeElement).toBe(graves[0]);

    // Down moves one row; the row length is the layout's column count.
    fireEvent.keyDown(graves[0] as Element, { key: 'ArrowDown' });
    const row = graves.indexOf(document.activeElement as SVGGElement);
    expect(row).toBeGreaterThan(1);
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(graves[0]);
  });

  it('arrow keys do not move focus when a modifier is held', () => {
    seed(3);
    const { container } = render(h(GraveyardScene, null));
    const graves = Array.from(container.querySelectorAll<SVGGElement>('[data-card-id]'));
    graves[0]?.focus();
    fireEvent.keyDown(graves[0] as Element, { key: 'ArrowRight', altKey: true });
    expect(document.activeElement).toBe(graves[0]);
  });

  it('the non-modal grave details panel never swallows Tab', async () => {
    seed(3);
    const { container } = render(h(GraveyardScene, null));
    fireEvent.click(container.querySelector('[data-card-id]') as Element);
    const panel = await screen.findByRole('dialog');
    const notPrevented = fireEvent.keyDown(panel, { key: 'Tab' });
    expect(notPrevented).toBe(true);
  });

  it('the séance does not take Space or digit keys that are meant for other views', () => {
    seed();
    makeAllDue();
    render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.seance'] }));
    const nav = screen.getByRole('button', { name: en['nav.settings'] });
    nav.focus();
    // Focus on the view switcher is outside the séance root: Space must keep its default action.
    expect(fireEvent.keyDown(nav, { key: ' ' })).toBe(true);
    expect(fireEvent.keyDown(nav, { key: '1' })).toBe(true);
  });
});

describe.each([
  {
    name: 'crypt delete',
    open: (): HTMLElement => {
      seed();
      render(h(CryptList, null));
      return screen.getByRole('button', { name: 'Delete crypt English' });
    },
  },
  {
    name: 'card delete',
    open: (): HTMLElement => {
      seed();
      setActiveDeck(decks.value[0]?.id ?? null);
      render(h(CryptEditor, null));
      return screen.getByRole('button', { name: 'Delete card word0' });
    },
  },
])('modal dialog: $name (AC-28.3)', ({ open }) => {
  it('moves focus in, traps Tab and Shift+Tab, and exposes modal semantics', async () => {
    const user = userEvent.setup();
    const trigger = open();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).not.toBeNull();
    expect(dialog.getAttribute('aria-describedby')).not.toBeNull();

    const inDialog = Array.from(dialog.querySelectorAll<HTMLElement>('button'));
    expect(dialog.contains(document.activeElement)).toBe(true);

    for (let i = 0; i < inDialog.length * 3; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < inDialog.length * 3; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const trigger = open();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('closes with Cancel and returns focus to the trigger', async () => {
    const trigger = open();
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: en['common.cancel'] }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('after Confirm the trigger is gone and focus lands on a control, not on <body>', async () => {
    const trigger = open();
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('alertdialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find((b) => b.classList.contains('gr-btn--danger'));
    await act(() => {
      fireEvent.click(confirm as Element);
    });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(trigger.isConnected).toBe(false);
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('first-run and empty states (costume-polish CP-59, CP-64)', () => {
  const LANGS = [
    ['en', en],
    ['ja', ja],
  ] as const;

  it.each(LANGS)('<App> shows no axe violations in all five views, empty, in %s', async (lang, strings) => {
    locale.value = lang;
    const { container } = render(h(App, null));
    for (const view of [
      strings['nav.crypts'],
      strings['nav.graveyard'],
      strings['nav.seance'],
      strings['nav.stats'],
      strings['nav.settings'],
    ]) {
      fireEvent.click(screen.getByRole('button', { name: view }));
      await expectNoAxeViolations(container);
    }
  });

  it.each(LANGS)('<App> shows no axe violations with untouched cards, in %s', async (lang, strings) => {
    locale.value = lang;
    const deck = createDeck('Crypt');
    for (let i = 0; i < 20; i++) addCard(deck.id, `word${i}`, `meaning ${i}`, null);
    const { container } = render(h(App, null));
    for (const view of [strings['nav.graveyard'], strings['nav.seance'], strings['nav.stats']]) {
      fireEvent.click(screen.getByRole('button', { name: view }));
      await expectNoAxeViolations(container);
    }
  });

  it('<GraveyardScene> with fresh plots and the invitation has no axe violations', async () => {
    const deck = createDeck('Crypt');
    for (let i = 0; i < 30; i++) addCard(deck.id, `word${i}`, `meaning ${i}`, null);
    const { container } = render(h(GraveyardScene, { onBeginSeance: () => undefined, onOpenCrypts: () => undefined }));
    expect(container.querySelectorAll('.gr-tombstone--plot')).toHaveLength(30);
    await expectNoAxeViolations(container, COMPONENT_RULES);

    fireEvent.click(container.querySelector('[data-card-id]') as Element);
    await screen.findByRole('dialog');
    await expectNoAxeViolations(container, COMPONENT_RULES);
  });

  it('the empty Graveyard buttons are ordinary Tab stops with names, in reading order', async () => {
    const user = userEvent.setup();
    const { container } = render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.graveyard'] }));

    const stops = tabStops(container);
    const names = stops.map((el) => el.textContent);
    expect(names).toEqual([
      en['nav.graveyard'],
      en['nav.seance'],
      en['nav.stats'],
      en['nav.crypts'],
      en['nav.settings'],
      en['graveyard.openCrypts'],
    ]);
    // The scene and its ornaments add no Tab stop.
    expect(container.querySelector('.gr-stage [tabindex]')).toBeNull();

    (document.activeElement as HTMLElement | null)?.blur();
    const visited: Element[] = [];
    for (let i = 0; i < stops.length; i++) {
      await user.tab();
      visited.push(document.activeElement as Element);
    }
    expect(visited).toEqual(stops);
  });

  it('the untouched Graveyard has one extra Tab stop (the button) plus the single grave stop', () => {
    const deck = createDeck('Crypt');
    for (let i = 0; i < 40; i++) addCard(deck.id, `word${i}`, 'x', null);
    const { container } = render(h(App, null));
    fireEvent.click(screen.getByRole('button', { name: en['nav.graveyard'] }));
    const stops = tabStops(container);
    expect(stops.map((el) => el.textContent)).toContain(en['graveyard.beginSeance']);
    // Five nav buttons, the invitation button and one grave.
    expect(stops).toHaveLength(7);
    const button = screen.getByRole('button', { name: en['graveyard.beginSeance'] });
    expect(stops.indexOf(button)).toBe(5);
  });
});