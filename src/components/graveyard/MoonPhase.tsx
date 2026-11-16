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
      <circle class="gr-moon__disc" cx={cx} cy={cy} r={r} />
      {path !== '' && (
        <path
          key={percent}
          class={animate ? 'gr-moon__lit gr-moon__lit--wax' : 'gr-moon__lit'}
          d={path}
          onAnimationEnd={() => setWaxing(false)}
        />
      )}
    </g>
  );
}
