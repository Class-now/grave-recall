/**
 * Ghost of an overdue card. Opacity comes from `1 - retrievability`, drift
 * speed from days past due. With reduced motion the ghost stays as a static icon.
 *
 * The ghost is drawn at least as large as a tombstone, with a faint halo drawn
 * inside its own group: the group opacity scales body and halo together, so the
 * glow is not a second data channel. There is no SVG filter on a ghost.
 */
import { h } from 'preact';

import { getCardRetrievability, reducedMotion, type Card } from '../../store';
import { ti } from '../../i18n';

import { daysPastDue, ghostDriftSeconds, ghostOpacity, round, TOMBSTONE_HEIGHT } from './visuals';

import './graveyard.css';

/** Ghost size in scene units at scale 1, hem included. A stone is 40 by 52. */
export const GHOST_WIDTH = 44;
export const GHOST_HEIGHT = 60;

/** Gap between the top of the stone and the ghost's hem, in scale-1 units. */
const GHOST_LIFT = 4;

/** Id of the shared halo gradient; the scene renders `GhostDefs` once. */
export const GHOST_HALO_ID = 'gr-ghost-halo';

/**
 * Local coordinates: x = 0 is the centre, y = 0 the hem line, the head dome
 * reaches y = -GHOST_HEIGHT. The hem is five scallops (Q then T segments).
 */
const BODY_PATH = 'M-22 -4 V-38 A22 22 0 0 1 22 -38 V-4 Q16.5 6 11 -4 T0 -4 T-11 -4 T-22 -4 Z';

/** The radial gradient the halo of every ghost refers to. Render once per scene. */
export function GhostDefs(): h.JSX.Element {
  return (
    <defs>
      <radialGradient id={GHOST_HALO_ID}>
        <stop class="gr-ghost__halo-stop" offset="0" stop-opacity="0.45" />
        <stop class="gr-ghost__halo-stop" offset="1" stop-opacity="0" />
      </radialGradient>
    </defs>
  );
}

export interface GhostProps {
  card: Card;
  /** Horizontal centre of the ghost's grave in scene coordinates. */
  x: number;
  /** Baseline of the ghost's grave in scene coordinates. */
  y: number;
  /** Row scale of the ghost's grave. Defaults to 1. */
  scale?: number;
  now: Date;
}

export function Ghost(props: GhostProps): h.JSX.Element {
  const { card, x, y, scale = 1, now } = props;

  const opacity = ghostOpacity(getCardRetrievability(card, now));
  const driftSeconds = ghostDriftSeconds(daysPastDue(card.srs.dueDate, now));
  const drifting = !reducedMotion.value;
  const hemY = y - (TOMBSTONE_HEIGHT + GHOST_LIFT) * scale;

  return (
    // The outer group positions and scales the ghost (SVG attribute); the inner group
    // carries the CSS animation, which would otherwise override the positioning transform.
    <g transform={`translate(${x} ${round(hemY, 2)}) scale(${scale})`}>
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
        <ellipse
          class="gr-ghost__halo"
          cx="0"
          cy={-GHOST_HEIGHT / 2}
          rx={GHOST_WIDTH * 0.85}
          ry={GHOST_HEIGHT * 0.78}
          fill={`url(#${GHOST_HALO_ID})`}
        />
        <path class="gr-ghost__body" d={BODY_PATH} />
        <ellipse class="gr-ghost__eye" cx="-8" cy="-38" rx="3" ry="4.5" />
        <ellipse class="gr-ghost__eye" cx="8" cy="-38" rx="3" ry="4.5" />
      </g>
    </g>
  );
}
