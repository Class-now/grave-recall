/**
 * Backdrop purity sweep (costume-polish CP-01, CP-02; spooky-design-system section 6.3).
 *
 * Every static, data-free group in the app is rendered for an empty store, a populated
 * store and the Japanese locale. Its markup must be identical in all of them, and it must
 * be inert: aria-hidden, no role, nothing focusable, no text.
 *
 * Groups:
 * - graveyard backdrop: sky, hills, trees, fence, ground and gate (`.gr-backdrop`)
 * - seance table props: candle holders, wax bodies and wicks (the flames are data)
 * - page frame ornaments: tombstone logo, header divider and the Ledger page ornament
 */
import { h, type ComponentChild } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/preact';

import {
  activeDeckId,
  addCard,
  addReviewLog,
  cards,
  createDeck,
  dailyGoal,
  decks,
  reviewLog,
  updateCardSrs,
} from './store';
import { cowardMode, locale, reducedMotion, reducedMotionUser } from './store/prefs';
import { addDays } from './utils/date';

import { SiteHeader, type View } from './components/frame/SiteHeader';
import { resetCrowKeeperMemory } from './components/graveyard/CrowKeeper';
import { GraveyardScene } from './components/graveyard/GraveyardScene';
import { SeanceSession } from './components/review/SeanceSession';
import { LedgerView } from './components/stats/LedgerView';

type Scenario = 'empty' | 'populated' | 'ja';
const SCENARIOS: Scenario[] = ['empty', 'populated', 'ja'];
const DAY_MS = 24 * 60 * 60 * 1000;

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  activeDeckId.value = null;
  locale.value = 'en';
  dailyGoal.value = 20;
  cowardMode.value = false;
  reducedMotionUser.value = false;
  reducedMotion.value = false;
  resetCrowKeeperMemory();
}

/** 60 cards, a third overdue, a third due today, with a 5-day streak and today's reviews. */
function populate(): void {
  const deck = createDeck('Many');
  for (let i = 0; i < 60; i += 1) {
    const card = addCard(deck.id, `w${i}`, 'back', null);
    const offset = i % 3 === 0 ? -4 : i % 3 === 1 ? -1 : 6;
    updateCardSrs(card.id, {
      ...card.srs,
      stability: (i * 7) % 90,
      dueDate: addDays(new Date(), offset),
      lastReviewed: addDays(new Date(), offset - 3),
    });
  }
  const first = cards.value[0];
  if (first === undefined) throw new Error('no cards');
  for (const daysAgo of [0, 0, 1, 2, 3, 4]) {
    addReviewLog({ date: new Date(Date.now() - daysAgo * DAY_MS), cardId: first.id, grade: 2, correct: true });
  }
}

function setUp(scenario: Scenario): void {
  resetState();
  if (scenario !== 'empty') populate();
  if (scenario === 'ja') locale.value = 'ja';
}

beforeEach(resetState);
afterEach(() => {
  cleanup();
  resetState();
});

const FOCUSABLE =
  'a[href], area[href], button, input, select, textarea, iframe, summary, [contenteditable], [tabindex], [role]';

/** Asserts that `element` is inert for assistive technology and input. */
function expectInert(element: Element, label: string): void {
  expect(element.getAttribute('aria-hidden'), `${label} aria-hidden`).toBe('true');
  expect(element.hasAttribute('role'), `${label} role`).toBe(false);
  expect(element.hasAttribute('tabindex'), `${label} tabindex`).toBe(false);
  expect(element.matches(FOCUSABLE), `${label} is not focusable`).toBe(false);
  expect(element.querySelectorAll(FOCUSABLE), `${label} has no focusable or role descendants`).toHaveLength(0);
  expect(element.querySelectorAll('text, title, desc, foreignObject'), `${label} has no text elements`).toHaveLength(0);
  expect((element.textContent ?? '').trim(), `${label} text`).toBe('');
}

interface Group {
  name: string;
  /** Renders the screen holding the group in the given scenario and returns the group's roots. */
  roots: (scenario: Scenario) => Element[];
  /** Roots that must be inert. Defaults to `roots`. */
  inert?: (scenario: Scenario) => Element[];
  /** Markup that must be identical across scenarios. Defaults to the roots' outerHTML. */
  markup?: (roots: Element[]) => string;
  /** The least number of roots expected. */
  min: number;
}

function renderAndCollect(ui: ComponentChild, selector: string): Element[] {
  const { container } = render(ui);
  return Array.from(container.querySelectorAll(selector));
}

/** Serialises roots in a form that survives unmounting. */
const outer = (roots: Element[]): string => roots.map((root) => root.outerHTML).join('\n');

/** The static parts of a candle: holder, wax and wick. The flame and its glow id are data. */
const CANDLE_PROPS = '.gr-candle__holder, .gr-candle__wax, .gr-candle__wick';

const HEADER_VIEWS: View[] = ['graveyard', 'seance', 'ledger', 'crypts', 'settings'];

/** Renders each header view and returns the ornaments of all of them. */
function headerOrnaments(): Element[] {
  return HEADER_VIEWS.flatMap((view) => {
    const { container, unmount } = render(h(SiteHeader, { view, show: () => undefined }));
    // Detach copies so the nodes outlive the unmount.
    const copies = Array.from(container.querySelectorAll('.gr-logo, .gr-divider')).map((el) => el.cloneNode(true) as Element);
    unmount();
    return copies;
  });
}

const GROUPS: Group[] = [
  {
    name: 'graveyard backdrop (back, front and gate)',
    roots: (scenario) => {
      setUp(scenario);
      return renderAndCollect(h(GraveyardScene, null), '.gr-backdrop');
    },
    min: 3,
  },
  {
    name: 'seance table props (candle holders, wax and wicks)',
    roots: (scenario) => {
      setUp(scenario);
      return renderAndCollect(h(SeanceSession, null), '.gr-candle');
    },
    markup: (roots) => outer(roots.flatMap((root) => Array.from(root.querySelectorAll(CANDLE_PROPS)))),
    min: 2,
  },
  {
    name: 'page frame ornaments (logo and header divider, in every view)',
    roots: (scenario) => {
      setUp(scenario);
      return headerOrnaments();
    },
    min: 2 * HEADER_VIEWS.length,
  },
  {
    name: 'Ledger page ornament',
    roots: (scenario) => {
      setUp(scenario);
      return renderAndCollect(h(LedgerView, null), '.gr-stats__ornament');
    },
    min: 1,
  },
];

describe.each(GROUPS)('backdrop purity: $name', (group) => {
  // Nodes of a rendered tree are gone after cleanup, so serialise inside each scenario.
  const rendered = new Map<Scenario, { markup: string; count: number }>();

  function collect(scenario: Scenario): { markup: string; count: number } {
    const cached = rendered.get(scenario);
    if (cached !== undefined) return cached;
    const roots = group.roots(scenario);
    for (const root of roots) expectInert(root, `${group.name} [${scenario}] ${(root.getAttribute('class') ?? root.tagName)}`);
    const result = { markup: (group.markup ?? outer)(roots), count: roots.length };
    cleanup();
    resetState();
    rendered.set(scenario, result);
    return result;
  }

  it('renders at least the expected number of groups, and some markup', () => {
    for (const scenario of SCENARIOS) {
      const { markup, count } = collect(scenario);
      expect(count, scenario).toBeGreaterThanOrEqual(group.min);
      expect(markup, scenario).not.toBe('');
    }
  });

  it.each(SCENARIOS.filter((s) => s !== 'empty'))(
    'renders the same markup for the %s store as for the empty store',
    (scenario) => {
      expect(collect(scenario).markup).toBe(collect('empty').markup);
    },
  );

  it('is inert in every scenario: aria-hidden, no role, nothing focusable, no text', () => {
    for (const scenario of SCENARIOS) collect(scenario);
    expect(rendered.size).toBe(SCENARIOS.length);
  });
});
