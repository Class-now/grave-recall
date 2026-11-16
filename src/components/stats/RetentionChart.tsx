/**
 * Retention over the last 30 days: the retention percentage
 * (correct / total reviews) and a bar chart of reviews per day. Each bar
 * stacks correct reviews (success colour) under the rest (danger colour).
 * With no reviews in the window, both are replaced by a blank ledger page:
 * "No data yet", an invitation line and a hint.
 */
import { h } from 'preact';

import { retentionSummary, reviewsPerDay } from '../../store';
import { t, ti } from '../../i18n';
import { formatDay } from '../../utils/date';

import { BarChart, type Bar } from './BarChart';

import './stats.css';

export function RetentionChart(): h.JSX.Element {
  const summary = retentionSummary.value;
  const days = reviewsPerDay.value;

  const heading = (
    <h3 id="gr-retention-title" class="gr-stats__heading">
      {t('stats.retention')}
    </h3>
  );

  if (summary.rate === null) {
    return (
      <section class="gr-stats__section" aria-labelledby="gr-retention-title">
        {heading}
        <div class="gr-stats__blank">
          <p class="gr-stats__empty">{t('stats.noData')}</p>
          <p class="gr-stats__invite">{t('stats.ledgerEmpty')}</p>
          <p class="gr-stats__empty">{t('stats.ledgerEmptyHint')}</p>
        </div>
      </section>
    );
  }

  const bars: Bar[] = days.map((day) => ({
    key: formatDay(day.date),
    label: ti('stats.barReviews', { date: formatDay(day.date), count: day.count, correct: day.correct }),
    segments: [
      { value: day.correct, className: 'gr-chart__fill--success' },
      { value: day.count - day.correct, className: 'gr-chart__fill--danger' },
    ],
  }));
  const peak = Math.max(...days.map((d) => d.count));
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <section class="gr-stats__section" aria-labelledby="gr-retention-title">
      {heading}
      <p class="gr-stats__figure">{ti('stats.retentionRate', { percent: Math.round(summary.rate * 100) })}</p>
      <BarChart bars={bars} label={t('stats.reviewsPerDay')} className="gr-chart--retention" />
      <div class="gr-chart__axis-labels" aria-hidden="true">
        <span>{first === undefined ? '' : formatDay(first.date)}</span>
        <span>{ti('stats.peak', { count: peak })}</span>
        <span>{last === undefined ? '' : formatDay(last.date)}</span>
      </div>
      <ul class="gr-chart__legend">
        <li>
          <span class="gr-chart__swatch gr-chart__swatch--success" aria-hidden="true" />
          {t('stats.legendCorrect')}
        </li>
        <li>
          <span class="gr-chart__swatch gr-chart__swatch--danger" aria-hidden="true" />
          {t('stats.legendIncorrect')}
        </li>
      </ul>
    </section>
  );
}
