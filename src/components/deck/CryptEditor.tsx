/**
 * Card list view for one crypt: add, edit and delete cards, plus bulk import.
 */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import {
  activeDeck,
  cards,
  deleteCard,
  saveState,
  setActiveDeck,
  type Card,
} from '../../store';
import { t, ti } from '../../i18n';

import { BulkImport } from './BulkImport';
import { CardEditor } from './CardEditor';
import { ConfirmDialog } from './ConfirmDialog';

import './deck.css';

export function CryptEditor(): h.JSX.Element | null {
  const deck = activeDeck.value;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Card | null>(null);
  const [focusRequest, setFocusRequest] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // After an edit closes, return focus to that card's Edit button.
  useEffect(() => {
    if (focusRequest === null) return;
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[data-card-edit]') ?? [];
    const target = Array.from(buttons).find((b) => b.dataset.cardId === focusRequest);
    (target ?? backRef.current)?.focus();
    setFocusRequest(null);
  }, [focusRequest]);

  if (deck === null) return null;

  const deckCards = cards.value.filter((c) => c.deckId === deck.id);

  function onConfirmDelete(): void {
    if (pendingDelete === null) return;
    deleteCard(pendingDelete.id);
    saveState();
    setPendingDelete(null);
    // The opener is gone; hand focus to a stable control.
    setFocusRequest('');
  }

  return (
    <section class="gr-section" aria-labelledby="crypt-editor-title">
      <button
        ref={backRef}
        type="button"
        class="gr-btn"
        aria-label={t('crypt.back')}
        onClick={() => setActiveDeck(null)}
      >
        {t('crypt.back')}
      </button>

      <h2 id="crypt-editor-title" class="gr-heading">{deck.name}</h2>
      <p class="gr-meta">{ti('crypt.cardsCount', { count: deckCards.length })}</p>

      <section class="gr-section" aria-labelledby="card-add-title">
        <h3 id="card-add-title" class="gr-subheading">{t('card.addCard')}</h3>
        <CardEditor deckId={deck.id} />
      </section>

      <BulkImport deckId={deck.id} />

      <section class="gr-section" aria-labelledby="card-list-title">
        <h3 id="card-list-title" class="gr-subheading">{t('card.listTitle')}</h3>
        {deckCards.length === 0 ? (
          <p class="gr-meta">{t('card.listEmpty')}</p>
        ) : (
          <ul ref={listRef} class="gr-list" aria-label={t('card.listTitle')}>
            {deckCards.map((card) => (
              <li key={card.id} class="gr-list__item">
                {editingId === card.id ? (
                  <div class="gr-list__main">
                    <CardEditor
                      deckId={deck.id}
                      card={card}
                      onDone={() => {
                        setEditingId(null);
                        setFocusRequest(card.id);
                      }}
                      onCancel={() => {
                        setEditingId(null);
                        setFocusRequest(card.id);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div class="gr-list__main">
                      <div class="gr-card-front">{card.front}</div>
                      <div class="gr-card-back">{card.back}</div>
                      {card.example !== null && card.example !== '' && (
                        <div class="gr-card-example">{card.example}</div>
                      )}
                    </div>
                    <div>
                      <button
                        type="button"
                        class="gr-btn"
                        data-card-edit=""
                        data-card-id={card.id}
                        aria-label={ti('card.editAria', { front: card.front })}
                        onClick={() => setEditingId(card.id)}
                      >
                        {t('card.editCard')}
                      </button>{' '}
                      <button
                        type="button"
                        class="gr-btn"
                        aria-label={ti('card.deleteAria', { front: card.front })}
                        onClick={() => setPendingDelete(card)}
                      >
                        {t('card.deleteCard')}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingDelete !== null && (
        <ConfirmDialog
          id="card-delete-dialog"
          title={`${t('card.deleteCard')}: ${pendingDelete.front}`}
          description={t('card.deleteConfirm')}
          confirmLabel={t('card.deleteCard')}
          onConfirm={onConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
