/**
 * Motion rules sweep (costume-polish CP-60, CP-62, spooky-design-system section 3.4).
 *
 * The first part reads every stylesheet under `src/` and checks the animation rules
 * that can be checked from the text. The second part renders the animated parts of the
 * app with reduced motion on and checks that no animation class is applied.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';

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
  type Card,
} from './store';
import { cowardMode, locale, reducedMotion, reducedMotionUser } from './store/prefs';
import { addDays } from './utils/date';

import { SiteHeader } from './components/frame/SiteHeader';
import { resetCrowKeeperMemory } from './components/graveyard/CrowKeeper';
import { GraveyardScene } from './components/graveyard/GraveyardScene';
import { SeanceSession } from './components/review/SeanceSession';

const SRC = dirname(fileURLToPath(import.meta.url));
const DAY_MS = 24 * 60 * 60 * 1000;

// ---- Stylesheet helpers ---------------------------------------------------------

function cssFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...cssFiles(path));
    else if (entry.name.endsWith('.css')) found.push(path);
  }
  return found.sort();
}

interface Sheet {
  file: string;
  text: string;
}

const sheets: Sheet[] = cssFiles(SRC).map((path) => ({
  file: relative(SRC, path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''),
}));

interface Keyframes {
  file: string;
  name: string;
  /** Every declaration inside the block, as `[property, value]`. */
  declarations: Array<[string, string]>;
}

interface Rule {
  file: string;
  selector: string;
  body: string;
}

/** Splits `text` into the `@keyframes` blocks (found by matching braces) and everything else. */
function splitKeyframes(sheet: Sheet): { keyframes: Keyframes[]; rest: string } {
  const keyframes: Keyframes[] = [];
  let rest = '';
  let cursor = 0;
  const opener = /@keyframes\s+([\w-]+)\s*\{/g;
  for (let match = opener.exec(sheet.text); match !== null; match = opener.exec(sheet.text)) {
    let depth = 1;
    let end = opener.lastIndex;
    while (depth > 0 && end < sheet.text.length) {
      const char = sheet.text[end];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
      end += 1;
    }
    const inner = sheet.text.slice(opener.lastIndex, end - 1);
    const declarations: Array<[string, string]> = [];
    for (const frame of inner.matchAll(/[^{}]+\{([^{}]*)\}/g)) {
      for (const declaration of (frame[1] ?? '').split(';')) {
        const colon = declaration.indexOf(':');
        if (colon < 0) continue;
        declarations.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
      }
    }
    keyframes.push({ file: sheet.file, name: match[1] ?? '', declarations });
    rest += sheet.text.slice(cursor, match.index);
    cursor = end;
    opener.lastIndex = end;
  }
  rest += sheet.text.slice(cursor);
  return { keyframes, rest };
}

const allKeyframes: Keyframes[] = [];
const allRules: Rule[] = [];
for (const sheet of sheets) {
  const { keyframes, rest } = splitKeyframes(sheet);
  allKeyframes.push(...keyframes);
  for (const rule of rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    allRules.push({ file: sheet.file, selector: (rule[1] ?? '').trim(), body: rule[2] ?? '' });
  }
}

/** The `[property, value]` pairs of a rule body. */
function declarationsOf(body: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    pairs.push([declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]);
  }
  return pairs;
}

/** A literal time value such as `300ms`, `0.5s` or `12s`. Token names like `--motion-fast` do not match. */
const LITERAL_DURATION = /(?<![\w-])\d*\.?\d+m?s(?![\w-])/;

const TIMING_PROPERTIES = new Set([
  'animation',
  'animation-duration',
  'animation-delay',
  'transition',
  'transition-duration',
  'transition-delay',
]);

// ---- CSS rules ------------------------------------------------------------------

describe('motion rules in the stylesheets (CP-62, steering section 3.4)', () => {
  it('finds the stylesheets, keyframes and rules it is meant to check', () => {
    expect(sheets.map((s) => s.file)).toEqual(
      expect.arrayContaining([
        'index.css',
        'components/frame/frame.css',
        'components/graveyard/graveyard.css',
        'components/review/review.css',
        'components/stats/stats.css',
      ]),
    );
    const names = allKeyframes.map((k) => k.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'ghost-drift',
        'fog-pulse',
        'fog-drift-a',
        'fog-drift-b',
        'fog-drift-c',
        'moon-wax',
        'crow-hop',
        'candle-flare',
        'candle-flicker',
        'card-flip',
        'jumpscare-flash',
      ]),
    );
    expect(allRules.length).toBeGreaterThan(100);
  });

  it('every @keyframes block animates only transform and opacity', () => {
    for (const { file, name, declarations } of allKeyframes) {
      expect(declarations.length, `${file} @keyframes ${name} has declarations`).toBeGreaterThan(0);
      for (const [property] of declarations) {
        expect(['transform', 'opacity'], `${file} @keyframes ${name} animates ${property}`).toContain(property);
      }
    }
  });

  it('no animation or transition declaration contains a literal duration', () => {
    let checked = 0;
    for (const { file, selector, body } of allRules) {
      for (const [property, value] of declarationsOf(body)) {
        if (!TIMING_PROPERTIES.has(property)) continue;
        checked += 1;
        expect(value, `${file}: ${selector} { ${property}: ${value} }`).not.toMatch(LITERAL_DURATION);
        // Every duration comes from a --motion-* token, directly or inside calc().
        if (value !== 'none') {
          expect(value, `${file}: ${selector} { ${property} } uses a --motion token`).toMatch(/var\(--(motion-\w+|ghost-drift-speed)/);
        }
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('the literal-duration check recognises the forms it must reject', () => {
    for (const bad of ['300ms ease', '0.5s linear', '12s', 'x .2s', 'var(--a, 12s) ease']) {
      expect(bad, bad).toMatch(LITERAL_DURATION);
    }
    for (const good of [
      'var(--motion-fast) ease-out',
      'calc(var(--motion-ambient) * 6) ease-in-out infinite alternate',
      'steps(3) infinite',
      'var(--ghost-drift-speed, calc(var(--motion-ambient) * 3 / 2)) ease-in-out infinite',
    ]) {
      expect(good, good).not.toMatch(LITERAL_DURATION);
    }
  });

  it('every class that runs an infinite animation has a paused rule for the hidden state', () => {
    const infinite = allRules.filter((rule) =>
      declarationsOf(rule.body).some(([property, value]) => property === 'animation' && /\binfinite\b/.test(value)),
    );
    // ghost, three fog banks and the fog layer, and the candle flicker.
    expect(infinite.length).toBeGreaterThanOrEqual(6);

    const pausedSelectors = allRules
      .filter((rule) =>
        declarationsOf(rule.body).some(([property, value]) => property === 'animation-play-state' && value === 'paused'),
      )
      .flatMap((rule) => rule.selector.split(',').map((s) => s.trim()))
      // The hidden state is a class the component sets from document.visibilityState.
      .filter((selector) => /hidden|paused/.test(selector));
    expect(pausedSelectors.length).toBeGreaterThan(0);

    for (const rule of infinite) {
      for (const selector of rule.selector.split(',').map((s) => s.trim())) {
        const classes = selector.match(/\.[\w-]+/g) ?? [];
        const target = classes[classes.length - 1];
        expect(target, `${rule.file}: ${selector} names a class`).toBeDefined();
        // `.gr-ghost--drift` is covered by a rule on `.gr-ghost`, its block class. The fog layer
        // is covered by its `--paused` modifier, which the component adds while the tab is hidden.
        const block = (target as string).replace(/--[\w-]+$/, '');
        const names = [target as string, block, `${block}--paused`];
        const covered = pausedSelectors.some((paused) => names.some((name) => endsWithClass(paused, name)));
        expect(covered, `${rule.file}: ${selector} is paused while the tab is hidden`).toBe(true);
      }
    }
  });
});

/** True when the last compound selector of `selector` is exactly the class `name`. */
function endsWithClass(selector: string, name: string): boolean {
  const compounds = selector.split(/\s+/);
  const last = compounds[compounds.length - 1] ?? '';
  return last === name;
}

// ---- Reduced-motion sweep -------------------------------------------------------

/** Classes that start or run an animation. None may be rendered under reduced motion. */
const MOTION_CLASSES = [
  'gr-fog__layer--pulse',
  'gr-ghost--drift',
  'gr-candle__flame--flare',
  'gr-candle__flame--flicker',
  'gr-flipcard__inner--flip',
  'gr-flipcard__back--flip',
  'gr-moon__lit--wax',
  'gr-crow--hop',
  'gr-jumpscare',
] as const;

/** `gr-fog__bank--drift-a`, `-b`, `-c`: matched by prefix. */
const MOTION_SELECTORS = [...MOTION_CLASSES.map((name) => `.${name}`), '[class*="gr-fog__bank--drift-"]'];

function motionClassesIn(root: ParentNode): string[] {
  return MOTION_SELECTORS.filter((selector) => root.querySelector(selector) !== null);
}

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

beforeEach(resetState);
afterEach(() => {
  cleanup();
  resetState();
});

function overdueCard(front: string, deckId = createDeck('Crypt').id): Card {
  const card = addCard(deckId, front, `${front} back`, null);
  updateCardSrs(card.id, {
    ...card.srs,
    stability: 30,
    dueDate: addDays(new Date(), -3),
    lastReviewed: addDays(new Date(), -6),
  });
  return cards.value.find((c) => c.id === card.id) ?? card;
}

function logReviewsOnDaysAgo(daysAgoList: number[]): void {
  const first = cards.value[0];
  if (first === undefined) throw new Error('need a card first');
  for (const daysAgo of daysAgoList) {
    addReviewLog({ date: new Date(Date.now() - daysAgo * DAY_MS), cardId: first.id, grade: 2, correct: true });
  }
}

/** Starts a seance of three due cards, flips and grades the first with `key`. */
async function seanceAfterGrade(key: string): Promise<void> {
  const deckId = createDeck('Seance').id;
  for (let i = 0; i < 3; i += 1) {
    const card = addCard(deckId, `card ${i}`, 'back', null);
    updateCardSrs(card.id, { ...card.srs, stability: 30, dueDate: addDays(new Date(), -1) });
  }
  render(h(SeanceSession, null));
  fireEvent.keyDown(document.body, { key: ' ' });
  await screen.findByRole('button', { name: 'Grade Again' });
  fireEvent.keyDown(document.body, { key });
}

describe('reduced motion applies no animation class (CP-60)', () => {
  it('control: under full motion the same screens do render the animation classes', async () => {
    const graveyardCards = [overdueCard('one'), overdueCard('two')];
    expect(graveyardCards).toHaveLength(2);
    const graveyard = render(h(GraveyardScene, null));
    expect(graveyard.container.querySelector('.gr-fog__layer--pulse')).not.toBeNull();
    expect(graveyard.container.querySelector('[class*="gr-fog__bank--drift-"]')).not.toBeNull();
    expect(graveyard.container.querySelector('.gr-ghost--drift')).not.toBeNull();
    graveyard.unmount();

    await seanceAfterGrade('3');
    expect(document.querySelector('.gr-candle__flame--flare')).not.toBeNull();
    expect(document.querySelector('.gr-candle__flame--flicker')).not.toBeNull();
    // The next card is face-down; the flip class appears once it is turned over.
    fireEvent.keyDown(document.body, { key: ' ' });
    await screen.findByRole('button', { name: 'Grade Again' });
    expect(document.querySelector('.gr-flipcard__inner--flip')).not.toBeNull();
    expect(document.querySelector('.gr-flipcard__back--flip')).not.toBeNull();
  });

  it.each([
    ['reducedMotion', () => { reducedMotion.value = true; }],
    ['the user override', () => { reducedMotionUser.value = true; reducedMotion.value = true; }],
  ])('Graveyard with overdue ghosts and fog, then a new review and a longer streak (%s)', async (_label, enable) => {
    enable();
    overdueCard('one');
    overdueCard('two');
    overdueCard('three');
    logReviewsOnDaysAgo([2, 1]);
    const { container } = render(h(GraveyardScene, null));
    expect(container.querySelectorAll('.gr-ghost').length).toBeGreaterThan(0);
    expect(container.querySelector('.gr-fog__layer')).not.toBeNull();
    expect(motionClassesIn(container)).toEqual([]);

    // The moon waxes and the crow hops when the data changes; neither is animated.
    await act(() => {
      logReviewsOnDaysAgo([0, 0]);
    });
    expect(container.querySelector('.gr-moon__lit')).not.toBeNull();
    expect(container.querySelector('.gr-crow')).not.toBeNull();
    expect(motionClassesIn(container)).toEqual([]);
  });

  it('Seance mid-session after a Good grade shows lit candles with no flare, flicker or flip', async () => {
    reducedMotion.value = true;
    await seanceAfterGrade('3');
    expect(document.querySelectorAll('.gr-candle[data-lit="true"]')).toHaveLength(2);
    expect(motionClassesIn(document)).toEqual([]);

    fireEvent.keyDown(document.body, { key: ' ' });
    await screen.findByRole('button', { name: 'Grade Again' });
    expect(motionClassesIn(document)).toEqual([]);
  });

  it('an Again on a well-learned card shows no jumpscare under reduced motion', async () => {
    reducedMotion.value = true;
    await seanceAfterGrade('1');
    expect(document.querySelector('.gr-jumpscare')).toBeNull();
    expect(motionClassesIn(document)).toEqual([]);
  });

  it('the app header has no animation class', () => {
    reducedMotion.value = true;
    const { container } = render(h(SiteHeader, { view: 'graveyard', show: () => undefined }));
    expect(container.querySelector('.gr-header')).not.toBeNull();
    expect(motionClassesIn(container)).toEqual([]);
    for (const element of Array.from(container.querySelectorAll('[class]'))) {
      expect(element.getAttribute('class'), 'header classes name no animation').not.toMatch(/--(pulse|drift|flare|flicker|flip|wax|hop)/);
    }
  });
});
