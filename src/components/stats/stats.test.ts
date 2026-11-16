/**
 * Ledger of the Dead tests (Task 11): derived stats signals and the three views.
 * Time is pinned to local noon so day boundaries never fall inside a test.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { act, cleanup, render, screen, within } from '@testing-library/preact';

import {
  addCard,
  addReviewLog,
  cards,
  createDeck,
  decks,
  forecastData,
  retentionRate,
  retentionSummary,
  reviewLog,
  reviewsPerDay,
  updateCardSrs,
  type Card,
} from '../../store';
import { locale } from '../../store/prefs';
import { en } from '../../i18n/en';
import { ja } from '../../i18n/ja';
import { addDays, formatDay, startOfDay } from '../../utils/date';

import { ForecastChart } from './ForecastChart';
import { LedgerView } from './LedgerView';
import { RetentionChart } from './RetentionChart';

const NOW = new Date(2025, 5, 15, 12, 0, 0);

function resetState(): void {
  decks.value = [];
  cards.value = [];
  reviewLog.value = [];
  locale.value = 'en';
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetState();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  resetState();
});

/** Logs one review `daysAgo` days before NOW. */
function logReview(daysAgo: number, correct: boolean): void {
  addReviewLog({ date: addDays(NOW, -daysAgo), cardId: 'c' as Card['id'], grade: correct ? 2 : 0, correct });
}

/** Adds a card whose due date is `days` days from NOW (negative: overdue). */
function addCardDue(deckId: Card['deckId'], days: number): Card {
  const card = addCard(deckId, `front ${days}`, 'back', null);
  updateCardSrs(card.id, { ...card.srs, dueDate: addDays(NOW, days) });
  return card;
}

function bars(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.gr-chart__bar'));
}

describe('retentionRate / retentionSummary', () => {
  it('is correct / total over the review log', () => {
    logReview(0, true);
    logReview(0, true);
    logReview(1, true);
    logReview(2, false);
    expect(retentionRate.value).toBe(0.75);
    expect(retentionSummary.value).toEqual({ total: 4, correct: 3, rate: 0.75 });
  });

  it('has no rate when there are no reviews', () => {
    expect(retentionRate.value).toBe(0);
    expect(retentionSummary.value).toEqual({ total: 0, correct: 0, rate: null });
  });

  it('covers today and the 29 days before it, matching the chart', () => {
    logReview(29, true); // oldest day in the window
    logReview(30, false); // one day too old
    expect(retentionSummary.value).toEqual({ total: 1, correct: 1, rate: 1 });
  });

  it('has no rate when every review is older than 30 days', () => {
    logReview(45, true);
    expect(retentionSummary.value.rate).toBeNull();
  });

  it('property: rate equals correct / total for any mix of recent reviews', () => {
    fc.assert(
      fc.property(fc.array(fc.record({ ago: fc.integer({ min: 0, max: 29 }), ok: fc.boolean() }), { minLength: 1, maxLength: 60 }), (entries) => {
        reviewLog.value = [];
        for (const e of entries) logReview(e.ago, e.ok);
        const correct = entries.filter((e) => e.ok).length;
        expect(retentionSummary.value.rate).toBeCloseTo(correct / entries.length, 10);
        expect(retentionRate.value).toBeCloseTo(correct / entries.length, 10);
      }),
    );
  });
});

describe('reviewsPerDay', () => {
  it('has 30 days, oldest first, ending today', () => {
    const days = reviewsPerDay.value;
    expect(days).toHaveLength(30);
    expect(formatDay(days[29]!.date)).toBe(formatDay(NOW));
    expect(formatDay(days[0]!.date)).toBe(formatDay(addDays(NOW, -29)));
  });

  it('counts reviews and correct reviews per calendar day', () => {
    logReview(0, true);
    logReview(0, false);
    logReview(3, true);
    const days = reviewsPerDay.value;
    expect(days[29]).toMatchObject({ count: 2, correct: 1 });
    expect(days[26]).toMatchObject({ count: 1, correct: 1 });
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(3);
  });
});

describe('forecastData', () => {
  it('has 14 days starting today', () => {
    const days = forecastData.value;
    expect(days).toHaveLength(14);
    expect(formatDay(days[0]!.date)).toBe(formatDay(NOW));
    expect(formatDay(days[13]!.date)).toBe(formatDay(addDays(NOW, 13)));
  });

  it('counts cards by due date across all crypts', () => {
    const a = createDeck('A');
    const b = createDeck('B');
    addCardDue(a.id, 1);
    addCardDue(a.id, 1);
    addCardDue(b.id, 1);
    addCardDue(b.id, 5);
    addCardDue(a.id, 13);
    const counts = forecastData.value.map((d) => d.count);
    expect(counts[1]).toBe(3);
    expect(counts[5]).toBe(1);
    expect(counts[13]).toBe(1);
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(5);
  });

  it('counts overdue cards on today and ignores cards due after 14 days', () => {
    const deck = createDeck('A');
    addCardDue(deck.id, -3);
    addCardDue(deck.id, 0);
    addCardDue(deck.id, 14);
    addCardDue(deck.id, 40);
    const counts = forecastData.value.map((d) => d.count);
    expect(counts[0]).toBe(2);
    expect(counts.reduce((sum, n) => sum + n, 0)).toBe(2);
  });

  it('property: every card due within the window is counted exactly once', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -10, max: 30 }), { maxLength: 40 }), (offsets) => {
        cards.value = [];
        decks.value = [];
        const deck = createDeck('P');
        for (const o of offsets) addCardDue(deck.id, o);
        const expected = offsets.filter((o) => o < 14).length;
        expect(forecastData.value.reduce((sum, d) => sum + d.count, 0)).toBe(expected);
      }),
    );
  });
});

describe('<RetentionChart>', () => {
  it('shows "No data yet" and no chart when the review log is empty', () => {
    const { container } = render(h(RetentionChart, null));
    expect(screen.getByText(en['stats.noData'])).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows "No data yet" when all reviews are older than 30 days', () => {
    logReview(40, true);
    render(h(RetentionChart, null));
    expect(screen.getByText(en['stats.noData'])).toBeTruthy();
  });

  it('shows the retention percentage', () => {
    logReview(0, true);
    logReview(0, true);
    logReview(1, true);
    logReview(1, false);
    render(h(RetentionChart, null));
    expect(screen.getByText('75% retention')).toBeTruthy();
    expect(screen.queryByText(en['stats.noData'])).toBeNull();
  });

  it('draws 30 bars, each labelled with its date and count', () => {
    logReview(0, true);
    logReview(0, false);
    logReview(2, true);
    const { container } = render(h(RetentionChart, null));
    const all = bars(container);
    expect(all).toHaveLength(30);
    for (const bar of all) expect(bar.getAttribute('role')).toBe('img');

    const today = formatDay(NOW);
    expect(screen.getByRole('img', { name: `${today}: 2 reviews, 1 correct` })).toBeTruthy();
    expect(screen.getByRole('img', { name: `${formatDay(addDays(NOW, -2))}: 1 reviews, 1 correct` })).toBeTruthy();
    expect(screen.getByRole('img', { name: `${formatDay(addDays(NOW, -1))}: 0 reviews, 0 correct` })).toBeTruthy();
  });

  it('stacks success and danger fills from the design tokens', () => {
    logReview(0, true);
    logReview(0, false);
    const { container } = render(h(RetentionChart, null));
    const today = bars(container)[29]!;
    expect(today.querySelector('.gr-chart__fill--success')).toBeTruthy();
    expect(today.querySelector('.gr-chart__fill--danger')).toBeTruthy();
    // A day with only correct reviews has no danger segment.
    logReview(1, true);
    cleanup();
    const again = render(h(RetentionChart, null));
    const yesterday = bars(again.container)[28]!;
    expect(yesterday.querySelector('.gr-chart__fill--danger')).toBeNull();
  });

  it('is named by its heading and the chart has an accessible name', () => {
    logReview(0, true);
    render(h(RetentionChart, null));
    expect(screen.getByRole('region', { name: en['stats.retention'] })).toBeTruthy();
    expect(screen.getByRole('group', { name: en['stats.reviewsPerDay'] })).toBeTruthy();
  });

  it('updates when a review is logged', async () => {
    render(h(RetentionChart, null));
    expect(screen.getByText(en['stats.noData'])).toBeTruthy();
    await act(() => {
      logReview(0, true);
    });
    expect(screen.getByText('100% retention')).toBeTruthy();
  });
});

describe('<ForecastChart>', () => {
  it('draws 14 labelled bars even with no cards', () => {
    const { container } = render(h(ForecastChart, null));
    expect(bars(container)).toHaveLength(14);
    expect(screen.getByRole('img', { name: `${formatDay(NOW)}: 0 cards due` })).toBeTruthy();
  });

  it('bar labels match the counts of cards with that due date', () => {
    const deck = createDeck('A');
    const other = createDeck('B');
    addCardDue(deck.id, 2);
    addCardDue(other.id, 2);
    addCardDue(deck.id, 7);
    addCardDue(deck.id, -1);
    const { container } = render(h(ForecastChart, null));

    expect(screen.getByRole('img', { name: `${formatDay(addDays(NOW, 2))}: 2 cards due` })).toBeTruthy();
    expect(screen.getByRole('img', { name: `${formatDay(addDays(NOW, 7))}: 1 cards due` })).toBeTruthy();
    expect(screen.getByRole('img', { name: `${formatDay(NOW)}: 1 cards due` })).toBeTruthy();
    const labelled = bars(container).map((b) => b.getAttribute('aria-label'));
    expect(new Set(labelled).size).toBe(14);
  });

  it('scales bar heights to the busiest day', () => {
    const deck = createDeck('A');
    addCardDue(deck.id, 1);
    addCardDue(deck.id, 1);
    addCardDue(deck.id, 1);
    addCardDue(deck.id, 1);
    addCardDue(deck.id, 2);
    const { container } = render(h(ForecastChart, null));
    const height = (i: number): number => Number(bars(container)[i]!.querySelector('rect')!.getAttribute('height'));
    expect(height(1)).toBeCloseTo(100);
    expect(height(2)).toBeCloseTo(25);
  });
});

describe('<LedgerView>', () => {
  it('shows "No data yet" for retention when the review log is empty', () => {
    render(h(LedgerView, null));
    expect(screen.getByRole('heading', { level: 2, name: en['stats.title'] })).toBeTruthy();
    const region = screen.getByRole('region', { name: en['stats.retention'] });
    expect(within(region).getByText(en['stats.noData'])).toBeTruthy();
  });

  it('shows both charts, reviews today and the streak', () => {
    const deck = createDeck('A');
    addCardDue(deck.id, 3);
    logReview(0, true);
    logReview(1, true);
    const { container } = render(h(LedgerView, null));
    expect(container.querySelectorAll('.gr-chart')).toHaveLength(2);
    expect(screen.getByRole('region', { name: en['stats.forecast'] })).toBeTruthy();
    expect(screen.getByText('100% retention')).toBeTruthy();
    const today = screen.getByText(en['stats.reviewsToday']).parentElement!;
    expect(today.textContent).toContain('1');
    const streak = screen.getByText(en['stats.streak']).parentElement!;
    expect(streak.textContent).toContain(`2 ${en['stats.days']}`);
  });

  it('renders in Japanese', () => {
    locale.value = 'ja';
    logReview(0, true);
    render(h(LedgerView, null));
    expect(screen.getByRole('heading', { level: 2, name: ja['stats.title'] })).toBeTruthy();
    expect(screen.getByText('100%の記憶率')).toBeTruthy();
    expect(screen.getByRole('img', { name: `${formatDay(startOfDay(NOW))}: 復習1回、正解1回` })).toBeTruthy();
  });
});

describe('ledger palette and hatch (costume-polish CP-49, CP-50, CP-51)', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'stats.css'), 'utf8');

  it('stats.css uses the three chart tokens', () => {
    expect(css).toContain('--color-chart-moss');
    expect(css).toContain('--color-chart-blood');
    expect(css).toContain('--color-chart-bone');
  });

  it('stats.css uses neither --color-success nor --color-danger', () => {
    expect(css).not.toContain('--color-success');
    expect(css).not.toContain('--color-danger');
  });

  it('each chart fill and swatch rule uses its chart token', () => {
    const rule = (selector: string): string => {
      const start = css.indexOf(`${selector} {`);
      expect(start, `${selector} rule exists`).toBeGreaterThanOrEqual(0);
      return css.slice(start, css.indexOf('}', start));
    };
    expect(rule('.gr-chart__fill--success')).toContain('var(--color-chart-moss)');
    expect(rule('.gr-chart__fill--danger')).toContain('var(--color-chart-blood)');
    expect(rule('.gr-chart__fill--forecast')).toContain('var(--color-chart-bone)');
    expect(rule('.gr-chart__swatch--success')).toContain('var(--color-chart-moss)');
    expect(rule('.gr-chart__swatch--danger')).toContain('repeating-linear-gradient');
    expect(rule('.gr-chart__swatch--danger')).toContain('var(--color-chart-blood)');
  });

  it('the retention chart defines a hatch <pattern> when incorrect segments exist', () => {
    logReview(0, true);
    logReview(0, false);
    const { container } = render(h(RetentionChart, null));
    const svg = container.querySelector('svg.gr-chart--retention')!;
    const pattern = svg.querySelector('defs > pattern');
    expect(pattern).toBeTruthy();
    const id = pattern!.getAttribute('id')!;
    expect(id).toContain('gr-chart--retention');
    expect(svg.getAttribute('style')).toContain(`url(#${id})`);
    expect(container.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
  });

  it('has no hatch <pattern> when every review is correct', () => {
    logReview(0, true);
    const { container } = render(h(RetentionChart, null));
    expect(container.querySelector('pattern')).toBeNull();
  });

  it('gives the two charts on the Ledger page different pattern ids', () => {
    logReview(0, false);
    const { container } = render(h(LedgerView, null));
    const ids = Array.from(container.querySelectorAll('pattern')).map((p) => p.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps bar roles, labels and class names beside the new defs', () => {
    logReview(0, true);
    logReview(0, false);
    const { container } = render(h(RetentionChart, null));
    const today = bars(container)[29]!;
    expect(today.getAttribute('role')).toBe('img');
    expect(today.getAttribute('aria-label')).toBe(`${formatDay(NOW)}: 2 reviews, 1 correct`);
    expect(today.querySelector('rect.gr-chart__fill--danger')).toBeTruthy();
  });

  it('the Ledger page has a constant, inert header ornament', () => {
    const { container } = render(h(LedgerView, null));
    const ornament = container.querySelector('.gr-stats__ornament')!;
    expect(ornament.getAttribute('aria-hidden')).toBe('true');
    expect(ornament.textContent).toBe('');
    expect(ornament.getAttribute('tabindex')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: en['stats.title'] }).id).toBe('gr-ledger-title');
  });
});

describe('empty Ledger page (costume-polish CP-57)', () => {
  it('shows the blank page with "No data yet" once, the invitation and the hint', () => {
    const { container } = render(h(LedgerView, null));
    expect(screen.getAllByText(en['stats.noData'])).toHaveLength(1);
    expect(screen.getByText(en['stats.ledgerEmpty'])).toBeTruthy();
    expect(screen.getByText(en['stats.ledgerEmptyHint'])).toBeTruthy();
    const blank = container.querySelector('.gr-stats__blank') as HTMLElement;
    expect(blank).not.toBeNull();
    expect(blank.textContent).toContain(en['stats.noData']);
    expect(container.querySelector('.gr-chart--retention')).toBeNull();
  });

  it('still renders the forecast chart', () => {
    const deck = createDeck('A');
    addCardDue(deck.id, 2);
    const { container } = render(h(LedgerView, null));
    expect(container.querySelector('.gr-chart--forecast')).not.toBeNull();
    expect(screen.getByRole('region', { name: en['stats.forecast'] })).toBeTruthy();
  });

  it('is also shown when every review is older than 30 days', () => {
    logReview(45, true);
    const { container } = render(h(LedgerView, null));
    expect(container.querySelector('.gr-stats__blank')).not.toBeNull();
    expect(screen.getByText(en['stats.ledgerEmpty'])).toBeTruthy();
  });

  it('gives way to the charts once a review is logged', () => {
    logReview(0, true);
    const { container } = render(h(LedgerView, null));
    expect(container.querySelector('.gr-stats__blank')).toBeNull();
    expect(screen.queryByText(en['stats.ledgerEmpty'])).toBeNull();
    expect(container.querySelector('.gr-chart--retention')).not.toBeNull();
  });

  it('renders in Japanese', () => {
    locale.value = 'ja';
    render(h(LedgerView, null));
    expect(screen.getByText(ja['stats.noData'])).toBeTruthy();
    expect(screen.getByText(ja['stats.ledgerEmpty'])).toBeTruthy();
  });
});