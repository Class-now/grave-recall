/**
 * Ghost of an overdue card. Opacity comes from `1 - retrievability`, drift
 * speed from days past due. With reduced motion the ghost stays as a static icon.
 */
import { h } from 'preact';

import { getCardRetrievability, reducedMotion, type Card } from '../../store';
import { ti } from '../../i18n';

import { daysPastDue, ghostDriftSeconds, ghostOpacity, round } from './visuals';

import './graveyard.css';

export interface GhostProps {
  card: Card;
  /** Left edge of the ghost's tombstone in scene coordinates. */
  x: number;
  /** Top edge of the ghost's tombstone in scene coordinates. */
  y: number;
  now: Date;
}

export function Ghost(props: GhostProps): h.JSX.Element {
  const { card, x, y, now } = props;

  const opacity = ghostOpacity(getCardRetrievability(card, now));
  const driftSeconds = ghostDriftSeconds(daysPastDue(card.srs.dueDate, now));
  const drifting = !reducedMotion.value;

  return (
    // The outer group positions the ghost (SVG attribute); the inner group carries
    // the CSS animation, which would otherwise override the positioning transform.
    <g transform={`translate(${x + 20} ${y - 18})`}>
      <g
        class={drifting ? 'gr-ghost gr-ghost--drift' : 'gr-ghost'}
        role="img"
        aria-label={ti('a11y.ghostOf', { front: card.front })}
        data-ghost-for={card.id}
        style={{
          '--ghost-opacity': round(opacity),
          '--ghost-drift-speed': `${round(driftSeconds)}s`,
        }}
      >
        <path
          class="gr-ghost__body"
          d="M-14 20 V-2 A14 14 0 0 1 14 -2 V20 L9 15 L4.5 20 L0 15 L-4.5 20 L-9 15 Z"
        />
        <circle class="gr-ghost__eye" cx="-5" cy="-1" r="2" />
        <circle class="gr-ghost__eye" cx="5" cy="-1" r="2" />
      </g>
    </g>
  );
}
