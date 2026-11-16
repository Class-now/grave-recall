/**
 * One card in the séance. While face-down, the front is a single button: Space,
 * Enter or a tap reveals the back. The grade buttons live in <GradeButtons>,
 * which the parent renders only after the flip.
 *
 * Focus: the flip button takes focus whenever a new card appears. The parent
 * keys this component by card id, so mounting equals "new card".
 */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import type { Card } from '../../store';
import { reducedMotion } from '../../store';
import { t } from '../../i18n';

import { isSeanceKeyEvent } from './keys';

import './review.css';

export interface FlipCardProps {
  card: Card;
  flipped: boolean;
  /** Called when the user asks to reveal the back. Only called while face-down. */
  onFlip: () => void;
  /** Element id for the back face, so the grade buttons can reference it. */
  backId: string;
}

export function FlipCard(props: FlipCardProps): h.JSX.Element {
  const { card, flipped, onFlip, backId } = props;
  const flipRef = useRef<HTMLButtonElement>(null);
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  useEffect(() => {
    flipRef.current?.focus();
  }, []);

  // Space flips from anywhere in the séance. Enter and taps use the button's click.
  useEffect(() => {
    if (flipped) return undefined;
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key !== ' ' || !isSeanceKeyEvent(e)) return;
      e.preventDefault(); // no page scroll, no native button activation
      if (!e.repeat) onFlipRef.current();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [flipped]);

  const motion = !reducedMotion.value;
  // Under reduced motion neither flip class is present, so the static
  // `[data-flipped="true"]` rule shows the back at once.
  const innerClass = motion && flipped ? 'gr-flipcard__inner gr-flipcard__inner--flip' : 'gr-flipcard__inner';
  const backClass = motion ? 'gr-flipcard__back gr-flipcard__back--flip' : 'gr-flipcard__back';

  return (
    <div class="gr-flipcard" data-flipped={flipped ? 'true' : 'false'}>
      <div class={innerClass}>
        <div class="gr-flipcard__front" role="group" aria-label={t('a11y.flipCard')}>
          {flipped ? (
            <p class="gr-flipcard__word">{card.front}</p>
          ) : (
            <button ref={flipRef} type="button" class="gr-flipcard__flip" onClick={onFlip}>
              <span class="gr-flipcard__word">{card.front}</span>
              <span class="gr-flipcard__hint">{t('seance.flip')}</span>
            </button>
          )}
        </div>
        {flipped && (
          // data-front feeds a CSS-only recap of the word, so it is not a second text node.
          <div id={backId} class={backClass} data-front={card.front}>
            <p class="gr-flipcard__answer">{card.back}</p>
            {card.example !== null && card.example !== '' && (
              <p class="gr-flipcard__example">{card.example}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
