/**
 * Read-only detail panel for one card: front, back, example, stability,
 * retrievability and due date. Non-modal: focus moves to the close button on
 * open, Escape or the close button dismisses it, and the caller restores
 * focus to the tombstone.
 */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { getCardRetrievability, type Card } from '../../store';
import { locale } from '../../store/prefs';
import { t } from '../../i18n';

import { formatDate } from './visuals';

import './graveyard.css';

export interface CardDetailPanelProps {
  card: Card;
  now: Date;
  onClose: () => void;
}

const TITLE_ID = 'gr-detail-title';

export function CardDetailPanel(props: CardDetailPanelProps): h.JSX.Element {
  const { card, now, onClose } = props;
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const retrievabilityPct = Math.round(getCardRetrievability(card, now) * 100);

  return (
    <div class="gr-detail" role="dialog" aria-labelledby={TITLE_ID}>
      <h3 id={TITLE_ID} class="gr-detail__title">
        {t('graveyard.detailTitle')}
      </h3>
      <dl class="gr-detail__list">
        <dt>{t('card.front')}</dt>
        <dd class="gr-detail__front">{card.front}</dd>
        <dt>{t('card.back')}</dt>
        <dd class="gr-detail__back">{card.back}</dd>
        {card.example !== null && (
          <>
            <dt>{t('card.exampleOptional')}</dt>
            <dd class="gr-detail__example">{card.example}</dd>
          </>
        )}
        <dt>{t('graveyard.stability')}</dt>
        <dd class="gr-detail__stat">
          {card.srs.stability.toFixed(1)} {t('stats.days')}
        </dd>
        <dt>{t('graveyard.retrievability')}</dt>
        <dd class="gr-detail__stat">{retrievabilityPct}%</dd>
        <dt>{t('graveyard.dueDate')}</dt>
        <dd class="gr-detail__stat">{formatDate(card.srs.dueDate, locale.value)}</dd>
      </dl>
      <button
        ref={closeRef}
        type="button"
        class="gr-detail__close"
        aria-label={t('a11y.closeDialog')}
        onClick={onClose}
      >
        {t('graveyard.close')}
      </button>
    </div>
  );
}
