/**
 * Moon whose lit wedge sweeps 360deg * (reviewsDoneToday / dailyGoal).
 * A full circle is a full moon. The `moon-wax` fade plays when progress
 * changes while mounted; with reduced motion the path changes instantly.
 */
import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { dailyGoal, moonPhasePct, reducedMotion, reviewsDoneToday } from '../../store';
import { ti } from '../../i18n';

import { moonArcPath } from './visuals';

import './graveyard.css';

export const MOON_LIT_GRADIENT_ID = 'gr-moon-lit-gradient';
export const MOON_SHINE_GRADIENT_ID = 'gr-moon-shine-gradient';

export interface MoonPhaseProps {
  cx?: number;
  cy?: number;
  r?: number;
}

export function MoonPhase(props: MoonPhaseProps): h.JSX.Element {
  const { cx = 64, cy = 64, r = 28 } = props;
  const progress = moonPhasePct.value;
  const percent = Math.round(progress * 100);
  const path = moonArcPath(progress, cx, cy, r);

  const previous = useRef<number>(progress);
  const [waxing, setWaxing] = useState(false);
  useEffect(() => {
    if (previous.current !== progress) {
      previous.current = progress;
      setWaxing(true);
    }
  }, [progress]);

  const animate = waxing && !reducedMotion.value;

  return (
    <g
      class="gr-moon"
      role="img"
      aria-label={ti('a11y.moonProgress', {
        done: reviewsDoneToday.value,
        goal: dailyGoal.value,
        percent,
      })}
      data-progress={percent}
    >
      <defs>
        {/* Surface shading only: constants of the disc geometry, never read from data. */}
        <radialGradient
          id={MOON_LIT_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          cx={cx - r * 0.25}
          cy={cy - r * 0.25}
          r={r * 1.3}
        >
          <stop class="gr-moon__stop" offset="0" stop-opacity="1" />
          <stop class="gr-moon__stop" offset="0.7" stop-opacity="0.95" />
          <stop class="gr-moon__stop" offset="1" stop-opacity="0.8" />
        </radialGradient>
        <radialGradient
          id={MOON_SHINE_GRADIENT_ID}
          gradientUnits="userSpaceOnUse"
          cx={cx - r * 0.25}
          cy={cy - r * 0.25}
          r={r * 1.3}
        >
          <stop class="gr-moon__stop" offset="0" stop-opacity="0.22" />
          <stop class="gr-moon__stop" offset="1" stop-opacity="0.06" />
        </radialGradient>
      </defs>
      <circle class="gr-moon__disc" cx={cx} cy={cy} r={r} />
      {/* Pale cast on the unlit side, so the disc reads as a moon at any progress. */}
      <circle class="gr-moon__shine" cx={cx} cy={cy} r={r} fill={`url(#${MOON_SHINE_GRADIENT_ID})`} />
      {path !== '' && (
        <path
          key={percent}
          class={animate ? 'gr-moon__lit gr-moon__lit--wax' : 'gr-moon__lit'}
          fill={`url(#${MOON_LIT_GRADIENT_ID})`}
          d={path}
          onAnimationEnd={() => setWaxing(false)}
        />
      )}
    </g>
  );
}
