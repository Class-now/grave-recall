/**
 * Add / edit form for a single card (front, back, optional example).
 * Pass `card` to edit; omit it to add a new card to `deckId`.
 */
import { h, type RefObject } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { addCard, editCard, saveState, type Card } from '../../store';
import type { DeckId } from '../../scheduler/types';
import { t } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

import { CARD_BACK_MAX, CARD_EXAMPLE_MAX, CARD_FRONT_MAX } from './limits';

import './deck.css';

export interface CardFieldErrors {
  front?: TranslationKey;
  back?: TranslationKey;
  example?: TranslationKey;
}

/** Field-level validation (AC-05.1, AC-05.2, AC-06.3). */
export function validateCard(front: string, back: string, example: string): CardFieldErrors {
  const errors: CardFieldErrors = {};
  const f = front.trim();
  const b = back.trim();
  const ex = example.trim();
  if (f.length === 0) errors.front = 'card.frontRequired';
  else if (f.length > CARD_FRONT_MAX) errors.front = 'card.frontTooLong';
  if (b.length === 0) errors.back = 'card.backRequired';
  else if (b.length > CARD_BACK_MAX) errors.back = 'card.backTooLong';
  if (ex.length > CARD_EXAMPLE_MAX) errors.example = 'card.exampleTooLong';
  return errors;
}

export interface CardEditorProps {
  deckId: DeckId;
  /** When set, the form edits this card instead of creating one. */
  card?: Card;
  /** Called after a successful edit (not after add, so several cards can be entered in a row). */
  onDone?: () => void;
  /** Called when the user cancels an edit. */
  onCancel?: () => void;
}

export function CardEditor(props: CardEditorProps): h.JSX.Element {
  const { deckId, card, onDone, onCancel } = props;
  const editing = card !== undefined;
  const idPrefix = editing ? `card-edit-${card.id}` : 'card-new';

  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [example, setExample] = useState(card?.example ?? '');
  const [errors, setErrors] = useState<CardFieldErrors>({});

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const exampleRef = useRef<HTMLInputElement>(null);

  function clearError(field: keyof CardFieldErrors): void {
    if (errors[field] !== undefined) setErrors({ ...errors, [field]: undefined });
  }

  function submit(e: Event): void {
    e.preventDefault();
    const found = validateCard(front, back, example);
    if (found.front !== undefined || found.back !== undefined || found.example !== undefined) {
      setErrors(found);
      const firstInvalid =
        found.front !== undefined ? frontRef : found.back !== undefined ? backRef : exampleRef;
      firstInvalid.current?.focus();
      return;
    }

    if (editing) {
      editCard(card.id, { front, back, example });
      saveState();
      onDone?.();
    } else {
      addCard(deckId, front, back, example.trim().length > 0 ? example : null);
      saveState();
      setFront('');
      setBack('');
      setExample('');
      setErrors({});
      frontRef.current?.focus();
    }
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && editing) {
      e.preventDefault();
      onCancel?.();
    }
  }

  function field(
    name: 'front' | 'back' | 'example',
    label: string,
    value: string,
    setValue: (v: string) => void,
    ref: RefObject<HTMLInputElement>
  ): h.JSX.Element {
    const inputId = `${idPrefix}-${name}`;
    const errorId = `${inputId}-error`;
    const errorKey = errors[name];
    return (
      <div class="gr-field">
        <label class="gr-label" for={inputId}>{label}</label>
        <input
          ref={ref}
          id={inputId}
          class="gr-input"
          type="text"
          value={value}
          aria-invalid={errorKey !== undefined ? 'true' : 'false'}
          aria-describedby={errorKey !== undefined ? errorId : undefined}
          onInput={(e) => {
            setValue((e.currentTarget as HTMLInputElement).value);
            clearError(name);
          }}
        />
        {errorKey !== undefined && (
          <p id={errorId} class="gr-error" role="alert">{t(errorKey)}</p>
        )}
      </div>
    );
  }

  return (
    <form
      class="gr-form"
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      aria-label={editing ? t('card.editCard') : t('card.addCard')}
    >
      {field('front', t('card.front'), front, setFront, frontRef)}
      {field('back', t('card.back'), back, setBack, backRef)}
      {field('example', t('card.example'), example, setExample, exampleRef)}
      <div>
        <button
          type="submit"
          class="gr-btn gr-btn--primary"
          aria-label={editing ? t('card.save') : t('card.addCard')}
        >
          {editing ? t('card.save') : t('card.addCard')}
        </button>
        {editing && (
          <>
            {' '}
            <button type="button" class="gr-btn" aria-label={t('card.cancel')} onClick={onCancel}>
              {t('card.cancel')}
            </button>
          </>
        )}
      </div>
    </form>
  );
}
