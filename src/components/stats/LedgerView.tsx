/**
 * Ledger of the Dead: today's reviews, the streak, retention over the last
 * 30 days and the forecast of cards coming due. Drawn as a framed, ruled
 * ledger page; the ornament and ruling are constant decoration (CSS only).
 */
import { h } from 'preact';

import { reviewsDoneToday, streakDays } from '../../store';
import { t } from '../../i18n';

import { ForecastChart } from './ForecastChart';
import { RetentionChart } from './RetentionChart';

import './stats.css';

export function LedgerView(): h.JSX.Element {
  return (
    <section class="gr-stats" aria-labelledby="gr-ledger-title">
      <h2 id="gr-ledger-title" class="gr-stats__title">
        {t('stats.title')}
      </h2>
      <div class="gr-stats__ornament" aria-hidden="true" />
      <dl class="gr-stats__summary">
        <div class="gr-stats__stat">
          <dt>{t('stats.reviewsToday')}</dt>
          <dd>{reviewsDoneToday.value}</dd>
        </div>
        <div class="gr-stats__stat">
          <dt>{t('stats.streak')}</dt>
          <dd>{streakDays.value} {t('stats.days')}</dd>
        </div>
      </dl>
      <RetentionChart />
      <ForecastChart />
    </section>
  );
}
