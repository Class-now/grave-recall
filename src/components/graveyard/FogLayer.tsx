/**
 * Fog over the graveyard. Density is the store's `fogOpacity` signal
 * (overdue / total, clamped to 0.05-0.60), applied once, on the wrapper group.
 *
 * Inside the wrapper: two static wisps (the only filtered group) and three
 * soft banks filled with radial gradients whose alpha reaches zero at the edge.
 * The banks draw at full strength and carry no opacity of their own, so the
 * composite never exceeds the mapped value. Unless reduced motion is on, the
 * banks drift sideways (two left, one right) with `transform` only. The pulse
 * and the drift pause while the tab is hidden.
 */
import { h } from 'preact';

import { fogOpacity, reducedMotion } from '../../store';
import { t } from '../../i18n';

import { round } from './visuals';
import { useDocumentHidden } from './useDocumentHidden';

import './graveyard.css';

export const FOG_FILTER_ID = 'gr-fog-filter';
export const FOG_BANK_GRADIENT_ID = 'gr-fog-bank-gradient';

export interface FogLayerProps {
  width: number;
  height: number;
}

interface Bank {
  /** Suffix of the `gr-fog__bank--drift-*` class that drifts this bank. */
  drift: 'a' | 'b' | 'c';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Bank geometry as fractions of the scene, sitting over the middle of the grave field. */
const BANKS: readonly Bank[] = [
  { drift: 'a', cx: 0.3, cy: 0.62, rx: 0.3, ry: 0.11 },
  { drift: 'b', cx: 0.68, cy: 0.56, rx: 0.32, ry: 0.12 },
  { drift: 'c', cx: 0.5, cy: 0.74, rx: 0.34, ry: 0.09 },
];

export function FogLayer(props: FogLayerProps): h.JSX.Element {
  const { width, height } = props;
  const hidden = useDocumentHidden();
  const drifting = !reducedMotion.value;

  const classes = ['gr-fog__layer'];
  if (drifting) classes.push('gr-fog__layer--pulse');
  if (hidden) classes.push('gr-fog__layer--paused');

  return (
    <g class="gr-fog" role="img" aria-label={t('a11y.fog')}>
      <defs>
        <filter id={FOG_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.018"
            numOctaves={2}
            seed={7}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={60}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation={3} />
        </filter>
        <radialGradient id={FOG_BANK_GRADIENT_ID}>
          <stop class="gr-fog__stop" offset="0" stop-opacity="0.9" />
          <stop class="gr-fog__stop" offset="0.55" stop-opacity="0.45" />
          <stop class="gr-fog__stop" offset="1" stop-opacity="0" />
        </radialGradient>
      </defs>
      <g class={classes.join(' ')} style={{ '--fog-opacity': round(fogOpacity.value) }}>
        <g class="gr-fog__wisps" filter={`url(#${FOG_FILTER_ID})`}>
          <ellipse cx={width * 0.2} cy={height * 0.8} rx={width * 0.4} ry={height * 0.12} />
          <ellipse cx={width * 0.85} cy={height * 0.35} rx={width * 0.3} ry={height * 0.08} />
        </g>
        {BANKS.map((bank) => (
          <ellipse
            key={bank.drift}
            class={
              drifting
                ? `gr-fog__bank gr-fog__bank--drift-${bank.drift}`
                : 'gr-fog__bank'
            }
            cx={round(width * bank.cx, 2)}
            cy={round(height * bank.cy, 2)}
            rx={round(width * bank.rx, 2)}
            ry={round(height * bank.ry, 2)}
            fill={`url(#${FOG_BANK_GRADIENT_ID})`}
          />
        ))}
      </g>
    </g>
  );
}
