/**
 * A seance candle. The wax body and the iron holder are table props (static,
 * steering section 6.1). The flame is data: it is lit while the most recent
 * grade in the session is Good or Easy, and it flares once on each such grade.
 * Unlit, only a dim ember sits on the wick.
 *
 * Animations are `transform` and `opacity` only. Under reduced motion (`motion`
 * false) neither the flicker nor the flare class is applied, so the flame shows
 * solid. The flicker pauses while the tab is hidden (`paused`).
 */
import { h } from 'preact';
import { useState } from 'preact/hooks';

import './review.css';

export interface CandleProps {
  /** Whether the flame is lit. */
  lit: boolean;
  /** Counts Good or Easy grades; a change restarts the one-shot flare. */
  flare: number;
  /** True while the tab is hidden, so infinite animations stop. */
  paused: boolean;
  /** False under reduced motion: no flicker and no flare. */
  motion: boolean;
}

let candleCount = 0;

export function Candle(props: CandleProps): h.JSX.Element {
  const { lit, flare, paused, motion } = props;
  // A stable id per instance, so two candles never share a gradient id.
  const [glowId] = useState(() => `gr-candle-glow-${(candleCount += 1)}`);

  const rootClass = paused ? 'gr-candle gr-candle--paused' : 'gr-candle';
  const flareClass = motion && flare > 0 ? 'gr-candle__flame gr-candle__flame--flare' : 'gr-candle__flame';
  const flickerClass = motion ? 'gr-candle__flicker gr-candle__flame--flicker' : 'gr-candle__flicker';

  return (
    <svg
      class={rootClass}
      viewBox="0 0 60 150"
      aria-hidden="true"
      focusable="false"
      data-lit={lit ? 'true' : 'false'}
    >
      <defs>
        <radialGradient id={glowId}>
          <stop class="gr-candle__glow-stop" offset="0" stop-opacity="0.55" />
          <stop class="gr-candle__glow-stop" offset="1" stop-opacity="0" />
        </radialGradient>
      </defs>
      <path class="gr-candle__holder" d="M8 146 H52 L48 134 H12 Z" />
      <rect class="gr-candle__holder" x="14" y="124" width="32" height="10" rx="2" />
      <rect class="gr-candle__wax" x="20" y="60" width="20" height="66" rx="2" />
      <path class="gr-candle__wick" d="M30 60 V53" />
      {lit ? (
        <g key={flare} class={flareClass}>
          <g class={flickerClass}>
            <circle class="gr-candle__glow" cx="30" cy="42" r="26" fill={`url(#${glowId})`} />
            <path class="gr-candle__fire" d="M30 26 C38 36 38 48 30 54 C22 48 22 36 30 26 Z" />
          </g>
        </g>
      ) : (
        <circle class="gr-candle__ember" cx="30" cy="52" r="1.6" />
      )}
    </svg>
  );
}
