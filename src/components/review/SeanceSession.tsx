/**
 * The séance: a review session over the due cards.
 *
 * - Mount starts a session (optionally limited to one crypt); unmount ends it.
 * - No due cards: a message is shown and nothing else happens.
 * - Each card is shown face-down; flipping reveals the back and the grade buttons.
 * - Grading calls the store's `gradeCard()`, plays the grade's sound (which
 *   publishes the caption) and moves on. A jumpscare flash covers an "Again" on
 *   a well-learned card unless reduced motion or Coward mode is on.
 * - When the queue empties, `sessionEndToll()` plays and `onComplete` is called
 *   so the app can navigate to the graveyard.
 */
import { h } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

import type { DeckId, Grade } from '../../scheduler/types';
import {
  cowardMode,
  currentCard,
  endSession,
  flipCard,
  gradeCard,
  isCardFlipped,
  isSessionComplete,
  reducedMotion,
  remainingCount,
  saveState,
  startSession,
} from '../../store';
import { candleSeal, ghostScream, hardThud, pageTurn, sessionEndToll } from '../../audio/sounds';
import { t, ti } from '../../i18n';

import { FlipCard } from './FlipCard';
import { GradeButtons } from './GradeButtons';
import { SEANCE_ROOT_CLASS } from './keys';

import './review.css';

/** An Again on a card with more stability than this (days) triggers the jumpscare flash. */
export const JUMPSCARE_STABILITY_THRESHOLD = 20;

const BACK_ID = 'gr-seance-back';

function playGradeSound(grade: Grade): void {
  if (grade === 0) ghostScream(); // becomes softChime() in Coward mode
  else if (grade === 1) hardThud();
  else candleSeal();
}

export interface SeanceSessionProps {
  /** Review only this crypt's due cards. Omit to review every crypt. */
  deckId?: DeckId | null;
  /** Called once, after the last card is graded. */
  onComplete?: () => void;
}

export function SeanceSession(props: SeanceSessionProps): h.JSX.Element | null {
  const { deckId = null, onComplete } = props;
  /** Cards queued at session start; null until the session has started. */
  const [total, setTotal] = useState<number | null>(null);
  /** Non-zero while the jumpscare overlay is on screen; changes to restart it. */
  const [scare, setScare] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useLayoutEffect(() => {
    startSession(deckId);
    setTotal(remainingCount.peek());
    return () => endSession();
  }, [deckId]);

  const finished = total !== null && total > 0 && isSessionComplete.value;
  useEffect(() => {
    if (!finished) return;
    sessionEndToll();
    onCompleteRef.current?.();
  }, [finished]);

  function handleFlip(): void {
    if (isCardFlipped.peek() || !currentCard.peek()) return;
    flipCard();
    pageTurn();
  }

  function handleGrade(grade: Grade): void {
    const card = currentCard.peek();
    // Ignored while face-down, so a stray key or a double press cannot grade a card unseen.
    if (!card || !isCardFlipped.peek()) return;
    const wasWellLearned = card.srs.stability > JUMPSCARE_STABILITY_THRESHOLD;
    gradeCard(grade);
    // The graded card and the review log must survive a reload (AC-21.1).
    saveState();
    playGradeSound(grade);
    if (grade === 0 && wasWellLearned && !reducedMotion.peek() && !cowardMode.peek()) {
      setScare((n) => n + 1);
    }
  }

  if (total === null) return null;

  const card = currentCard.value ?? null;
  const flipped = isCardFlipped.value;

  const overlay =
    scare > 0 ? <div key={scare} class="gr-jumpscare" aria-hidden="true" onAnimationEnd={() => setScare(0)} /> : null;

  if (total === 0) {
    return (
      <section class={SEANCE_ROOT_CLASS} aria-labelledby="gr-seance-title">
        <h2 id="gr-seance-title" class="gr-seance__title">
          {t('seance.title')}
        </h2>
        <p class="gr-seance__message">{t('seance.noCards')}</p>
        <p class="gr-seance__hint">{t('seance.noCardsDesc')}</p>
      </section>
    );
  }

  if (card === null) {
    return (
      <section class={SEANCE_ROOT_CLASS} aria-labelledby="gr-seance-title">
        <h2 id="gr-seance-title" class="gr-seance__title">
          {t('seance.complete')}
        </h2>
        <p class="gr-seance__message" role="status">
          {t('seance.completeDesc')}
        </p>
        <p class="gr-seance__hint">{ti('seance.reviewed', { count: total })}</p>
        {overlay}
      </section>
    );
  }

  return (
    <section class={SEANCE_ROOT_CLASS} aria-labelledby="gr-seance-title">
      <header class="gr-seance__header">
        <h2 id="gr-seance-title" class="gr-seance__title">
          {t('seance.title')}
        </h2>
        <p class="gr-seance__remaining">{ti('seance.remaining', { count: remainingCount.value })}</p>
      </header>
      <FlipCard key={card.id} card={card} flipped={flipped} onFlip={handleFlip} backId={BACK_ID} />
      <div class="gr-seance__actions">
        {flipped && <GradeButtons key={card.id} onGrade={handleGrade} describedBy={BACK_ID} />}
      </div>
      {overlay}
    </section>
  );
}
