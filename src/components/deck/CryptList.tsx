/**
 * List of crypts (decks): open, rename inline, delete with confirmation, create.
 */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import {
  cards,
  createDeck,
  decks,
  deleteDeck,
  renameDeck,
  saveState,
  setActiveDeck,
  endSession,
  type Deck,
} from '../../store';
import { t, ti } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

import { ConfirmDialog } from './ConfirmDialog';
import { CRYPT_NAME_MAX } from './limits';

import './deck.css';

/** Returns the i18n key of the validation error for a crypt name, or null if valid. */
export function validateCryptName(name: string): TranslationKey | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'crypt.nameRequired';
  if (trimmed.length > CRYPT_NAME_MAX) return 'crypt.nameTooLong';
  return null;
}

interface NameFormProps {
  idPrefix: string;
  initialValue: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/** Name input with inline validation; shared by "New Crypt" and rename. */
function NameForm(props: NameFormProps): h.JSX.Element {
  const { idPrefix, initialValue, submitLabel, onSubmit, onCancel } = props;
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<TranslationKey | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit(e: Event): void {
    e.preventDefault();
    const err = validateCryptName(value);
    if (err !== null) {
      setError(err);
      inputRef.current?.focus();
      return;
    }
    onSubmit(value);
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  const inputId = `${idPrefix}-input`;
  const errorId = `${idPrefix}-error`;

  return (
    <form class="gr-form" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
      <div class="gr-field">
        <label class="gr-label" for={inputId}>{t('crypt.nameLabel')}</label>
        <input
          ref={inputRef}
          id={inputId}
          class="gr-input"
          type="text"
          value={value}
          aria-invalid={error !== null ? 'true' : 'false'}
          aria-describedby={error !== null ? errorId : undefined}
          onInput={(e) => {
            setValue((e.currentTarget as HTMLInputElement).value);
            if (error !== null) setError(null);
          }}
        />
        {error !== null && (
          <p id={errorId} class="gr-error" role="alert">{t(error)}</p>
        )}
      </div>
      <div>
        <button type="submit" class="gr-btn gr-btn--primary" aria-label={submitLabel}>
          {submitLabel}
        </button>{' '}
        <button type="button" class="gr-btn" aria-label={t('common.cancel')} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export function CryptList(): h.JSX.Element {
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Deck | null>(null);
  const [focusNewRequest, setFocusNewRequest] = useState(0);
  const [focusOpenId, setFocusOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);

  // After a deletion the opener no longer exists; send focus to a stable control.
  useEffect(() => {
    if (focusNewRequest > 0) newButtonRef.current?.focus();
  }, [focusNewRequest]);

  // After renaming, return focus to that crypt's open button.
  useEffect(() => {
    if (focusOpenId === null) return;
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[data-crypt-open]') ?? [];
    Array.from(buttons).find((b) => b.dataset.deckId === focusOpenId)?.focus();
    setFocusOpenId(null);
  }, [focusOpenId]);

  function cardCount(deckId: string): number {
    return cards.value.filter((c) => c.deckId === deckId).length;
  }

  function onCreate(name: string): void {
    const deck = createDeck(name);
    saveState();
    setCreating(false);
    // AC-01.4: go straight to the new crypt's card list.
    setActiveDeck(deck.id);
  }

  function onRename(deck: Deck, name: string): void {
    renameDeck(deck.id, name);
    saveState();
    setRenamingId(null);
    setFocusOpenId(deck.id);
  }

  function onConfirmDelete(): void {
    if (pendingDelete === null) return;
    // AC-03.3: end any active session before its cards disappear.
    endSession();
    deleteDeck(pendingDelete.id);
    saveState();
    setPendingDelete(null);
    setFocusNewRequest((n) => n + 1);
  }

  /** Arrow / Home / End move focus between crypt "open" buttons. */
  function onListKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (!target.hasAttribute('data-crypt-open')) return;
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-crypt-open]') ?? []);
    const index = items.indexOf(target);
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = Math.min(index + 1, items.length - 1);
    else if (e.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next !== null) {
      e.preventDefault();
      items[next]?.focus();
    }
  }

  const deckList = decks.value;

  return (
    <section class="gr-section" aria-labelledby="crypt-list-title">
      <h2 id="crypt-list-title" class="gr-heading">{t('crypt.listTitle')}</h2>

      {creating ? (
        <NameForm
          idPrefix="crypt-new"
          initialValue=""
          submitLabel={t('crypt.create')}
          onSubmit={onCreate}
          onCancel={() => {
            setCreating(false);
            setFocusNewRequest((n) => n + 1);
          }}
        />
      ) : (
        <button
          ref={newButtonRef}
          type="button"
          class="gr-btn gr-btn--primary"
          aria-label={t('crypt.newCrypt')}
          onClick={() => setCreating(true)}
        >
          {t('crypt.newCrypt')}
        </button>
      )}

      {deckList.length === 0 ? (
        <p class="gr-meta">{t('crypt.empty')}</p>
      ) : (
        <ul ref={listRef} class="gr-list" aria-label={t('crypt.listTitle')} onKeyDown={onListKeyDown}>
          {deckList.map((deck) => (
            <li key={deck.id} class="gr-list__item">
              {renamingId === deck.id ? (
                <NameForm
                  idPrefix={`crypt-rename-${deck.id}`}
                  initialValue={deck.name}
                  submitLabel={t('common.save')}
                  onSubmit={(name) => onRename(deck, name)}
                  onCancel={() => {
                    setRenamingId(null);
                    setFocusOpenId(deck.id);
                  }}
                />
              ) : (
                <div class="gr-list__main">
                  <button
                    type="button"
                    class="gr-link"
                    data-crypt-open=""
                    data-deck-id={deck.id}
                    aria-label={ti('crypt.open', { name: deck.name })}
                    onClick={() => setActiveDeck(deck.id)}
                  >
                    {deck.name}
                  </button>
                  <div class="gr-meta">{ti('crypt.cardsCount', { count: cardCount(deck.id) })}</div>
                </div>
              )}
              {renamingId !== deck.id && (
                <div>
                  <button
                    type="button"
                    class="gr-btn"
                    aria-label={ti('crypt.renameAria', { name: deck.name })}
                    onClick={() => setRenamingId(deck.id)}
                  >
                    {t('crypt.rename')}
                  </button>{' '}
                  <button
                    type="button"
                    class="gr-btn"
                    aria-label={ti('crypt.deleteAria', { name: deck.name })}
                    onClick={() => setPendingDelete(deck)}
                  >
                    {t('crypt.delete')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          id="crypt-delete-dialog"
          title={ti('crypt.deleteTitle', { name: pendingDelete.name })}
          description={t('crypt.deleteConfirm')}
          confirmLabel={t('crypt.delete')}
          onConfirm={onConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
