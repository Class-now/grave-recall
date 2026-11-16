/**
 * One grave per card. Visual state comes from card.srs.stability:
 * fill (stone-crumbled to stone-dark), crack opacity (inverse), moss opacity.
 * A card that has never been reviewed (srsState === 'new') is a fresh plot
 * instead: a soil mound and a blank wooden marker, with no cracks and no moss.
 *
 * Perspective (`scale`, `tilt`, `shade`) comes from the grave's row in the yard
 * and never from card fields (steering section 6.4). The shade is a separate
 * overlay, so it cannot alter `--tombstone-fill`.
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
  /** Horizontal centre in scene coordinates. */
  x: number;
  /** Baseline (bottom edge) in scene coordinates. */
  y: number;
  /** Row scale; 1 is a full-size stone (40 by 52 units). */
  scale: number;
  /** Rotation in degrees about the baseline centre. */
  tilt: number;
  /** Depth-shade overlay opacity (0 to 0.30). */
  shade: number;
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

/** Arched stone, 40 wide by 52 tall, baseline at y = 0, centred on x = 0. */
const STONE_PATH = 'M-20 0 V-32 A20 20 0 0 1 20 -32 V0 Z';
const MOSS_PATH = 'M-20 0 V-12 Q-11 -17 -6 -10 Q2 -19 10 -10 Q16 -14 20 -12 V0 Z';
const CRACK_PATH = 'M0 -48 L-3 -38 L2 -30 L-4 -20 L1 -10';
/** Fresh plot: a low mound, 40 wide, and a blank marker (plaque on a post) behind it. */
const MOUND_PATH = 'M-20 0 Q-17 -13 0 -14 Q17 -13 20 0 Z';
const MARKER_PATH = 'M-8 -38 H8 V-20 H2 V-8 H-2 V-20 H-8 Z';
/** One shade path covering the whole plot. */
const PLOT_SHADE_PATH = MOUND_PATH + ' ' + MARKER_PATH;

export function Tombstone(props: TombstoneProps): h.JSX.Element {
  const { card, x, y, scale, tilt, shade, onOpen, tabStop = true, onFocus } = props;
  const stability = card.srs.stability;
  const isPlot = card.srs.srsState === 'new';

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
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
      <g
        class={isPlot ? 'gr-tombstone gr-tombstone--plot' : 'gr-tombstone'}
        role="button"
        tabindex={tabStop ? 0 : -1}
        aria-label={label}
        data-card-id={card.id}
        style={{
          '--tombstone-fill': tombstoneFill(stability),
          '--tombstone-crack-opacity': round(tombstoneCrackOpacity(stability)),
          '--tombstone-moss-opacity': round(tombstoneMossOpacity(stability)),
          '--depth-shade': round(shade, 4),
        }}
        onClick={() => onOpen(card)}
        onKeyDown={onKeyDown}
        onFocus={() => onFocus?.(card)}
      >
        {isPlot ? (
          <>
            <path class="gr-tombstone__marker" d={MARKER_PATH} />
            <path class="gr-tombstone__mound" d={MOUND_PATH} />
            <path class="gr-tombstone__shade" d={PLOT_SHADE_PATH} />
          </>
        ) : (
          <>
            <path class="gr-tombstone__stone" d={STONE_PATH} />
            <path class="gr-tombstone__moss" d={MOSS_PATH} />
            <path class="gr-tombstone__crack" d={CRACK_PATH} />
            <path class="gr-tombstone__shade" d={STONE_PATH} />
          </>
        )}
      </g>
    </g>
  );
}
