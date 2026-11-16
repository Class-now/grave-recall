/**
 * Crow on the cemetery gate. Shown while the streak is at least 1 day; its eye
 * glows from 3 days. When the streak grows, the crow hops once (`crow-hop`,
 * skipped under reduced motion) and caws (`crowCaw()`).
 */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { reducedMotion, streakDays } from '../../store';
import { crowCaw } from '../../audio/sounds';
import { ti } from '../../i18n';

import './graveyard.css';

/** Streak length at which the crow's eye starts to glow. */
export const CROW_EYE_GLOW_STREAK = 3;

/**
 * Streak seen by the previous crow. Module-level so a streak earned during a
 * review session is noticed when the graveyard mounts again afterwards.
 * `null` until the first crow has mounted, so loading saved data never hops.
 */
let lastSeenStreak: number | null = null;

/** Test hook: forgets the last seen streak. */
export function resetCrowKeeperMemory(): void {
  lastSeenStreak = null;
}

export interface CrowKeeperProps {
  /** Gate centre in scene coordinates. */
  x?: number;
  y?: number;
}

export function CrowKeeper(props: CrowKeeperProps): h.JSX.Element {
  const { x = 0, y = 0 } = props;
  const streak = streakDays.value;
  const glowing = streak >= CROW_EYE_GLOW_STREAK;
  const [hopping, setHopping] = useState(false);

  useEffect(() => {
    const previous = lastSeenStreak;
    lastSeenStreak = streak;
    if (previous !== null && streak > previous) {
      if (!reducedMotion.value) setHopping(true);
      crowCaw();
    }
  }, [streak]);

  return (
    <g transform={`translate(${x} ${y})`} data-streak={streak}>
      <g class="gr-gate" aria-hidden="true">
        <rect class="gr-gate__post" x="-34" y="0" width="8" height="66" />
        <rect class="gr-gate__post" x="26" y="0" width="8" height="66" />
        <rect class="gr-gate__post" x="-34" y="0" width="68" height="6" />
      </g>
      {streak >= 1 && (
        <g
          class={hopping && !reducedMotion.value ? 'gr-crow gr-crow--hop' : 'gr-crow'}
          role="img"
          aria-label={ti('a11y.crowStreak', { days: streak })}
          onAnimationEnd={() => setHopping(false)}
        >
          <path
            class="gr-crow__body"
            d="M-14 -6 C-14 -22 4 -26 12 -18 L22 -22 L16 -12 C16 -4 8 0 -2 0 L-6 3 L-8 0 C-12 0 -14 -3 -14 -6 Z"
          />
          {glowing && <circle class="gr-crow__glow" cx="11" cy="-17" r="5" />}
          <circle
            class={glowing ? 'gr-crow__eye gr-crow__eye--glow' : 'gr-crow__eye'}
            cx="11"
            cy="-17"
            r="1.8"
          />
        </g>
      )}
    </g>
  );
}
