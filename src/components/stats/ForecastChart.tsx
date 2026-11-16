/**
 * Forecast: cards due on each of the next 14 days, counted from every card's
 * due date across all crypts. Cards already overdue count on today.
 */
import { h } from 'preact';

import { forecastData } from '../../store';
import { t, ti } from '../../i18n';
import { formatDay } from '../../utils/date';

import { BarChart, type Bar } from './BarChart';

import './stats.css';

export function ForecastChart(): h.JSX.Element {
  const days = forecastData.value;

  const bars: Bar[] = days.map((day) => ({
    key: formatDay(day.date),
    label: ti('stats.barForecast', { date: formatDay(day.date), count: day.count }),
    segments: [{ value: day.count, className: 'gr-chart__fill--forecast' }],
  }));
  const peak = Math.max(0, ...days.map((d) => d.count));
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <section class="gr-stats__section" aria-labelledby="gr-forecast-title">
      <h3 id="gr-forecast-title" class="gr-stats__heading">
        {t('stats.forecast')}
      </h3>
      <BarChart bars={bars} label={t('stats.forecast')} className="gr-chart--forecast" />
      <div class="gr-chart__axis-labels" aria-hidden="true">
        <span>{first === undefined ? '' : formatDay(first.date)}</span>
        <span>{ti('stats.peak', { count: peak })}</span>
        <span>{last === undefined ? '' : formatDay(last.date)}</span>
      </div>
    </section>
  );
}
