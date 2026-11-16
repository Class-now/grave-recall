/**
 * One grave per card. Visual state comes from `card.srs.stability`:
 * fill (stone-crumbled to stone-dark), crack opacity (inverse), moss opacity.
 */
import { h } from 'preact';

import type { Card } from '../../store';
import { locale } from '../../store/prefs';
import { ti } from '../../i18n';

import {
  formatDate,
  round,
  tombstoneCrackOpacity,
  tombstoneFill,
  tombstoneMossOpacity,
} from './visuals';

import './graveyard.css';

export interface TombstoneProps {
  card: Card;
  /** Left edge in scene coordinates. */
  x: number;
  /** Top edge in scene coordinates. */
  y: number;
  /** Called on click, Enter or Space. */
  onOpen: (card: Card) => void;
  /**
   * Whether this grave is the scene's single Tab stop (roving tabindex).
   * Defaults to true so a lone tombstone is always reachable.
   */
  tabStop?: boolean;
  /** Called when the grave receives focus, so the scene can move the Tab stop to it. */
  onFocus?: (card: Card) => void;
}

export function Tombstone(props: TombstoneProps): h.JSX.Element {
  const { card, x, y, onOpen, tabStop = true, onFocus } = props;
  const stability = card.srs.stability;

  const label = ti('a11y.tombstoneDue', {
    front: card.front,
    date: formatDate(card.srs.dueDate, locale.value),
  });

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(card);
    }
  }

  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        class="gr-tombstone"
        role="button"
        tabindex={tabStop ? 0 : -1}
        aria-label={label}
        data-card-id={card.id}
        style={{
          '--tombstone-fill': tombstoneFill(stability),
          '--tombstone-crack-opacity': round(tombstoneCrackOpacity(stability)),
          '--tombstone-moss-opacity': round(tombstoneMossOpacity(stability)),
        }}
        onClick={() => onOpen(card)}
        onKeyDown={onKeyDown}
        onFocus={() => onFocus?.(card)}
      >
        <path class="gr-tombstone__stone" d="M2 52 V18 A18 18 0 0 1 38 18 V52 Z" />
        <path class="gr-tombstone__moss" d="M2 52 V40 Q10 35 14 42 Q22 33 30 42 Q35 38 38 40 V52 Z" />
        <path class="gr-tombstone__crack" d="M20 4 L17 14 L22 22 L16 32 L21 42" />
      </g>
    </g>
  );
}
