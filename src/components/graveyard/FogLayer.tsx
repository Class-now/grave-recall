/**
 * Fog over the graveyard. Opacity is the store's `fogOpacity` signal
 * (overdue / total, clamped to 0.05-0.60). The fog pulses unless reduced
 * motion is on, and the pulse pauses while the tab is hidden.
 */
import { h } from 'preact';

import { fogOpacity, reducedMotion } from '../../store';
import { t } from '../../i18n';

import { round } from './visuals';
import { useDocumentHidden } from './useDocumentHidden';

import './graveyard.css';

export const FOG_FILTER_ID = 'gr-fog-filter';

export interface FogLayerProps {
  width: number;
  height: number;
}

export function FogLayer(props: FogLayerProps): h.JSX.Element {
  const { width, height } = props;
  const hidden = useDocumentHidden();

  const classes = ['gr-fog__layer'];
  if (!reducedMotion.value) classes.push('gr-fog__layer--pulse');
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
          />
        </filter>
      </defs>
      <g
        class={classes.join(' ')}
        filter={`url(#${FOG_FILTER_ID})`}
        style={{ '--fog-opacity': round(fogOpacity.value) }}
      >
        <ellipse cx={width * 0.2} cy={height * 0.8} rx={width * 0.4} ry={height * 0.12} />
        <ellipse cx={width * 0.7} cy={height * 0.65} rx={width * 0.45} ry={height * 0.14} />
        <ellipse cx={width * 0.45} cy={height * 0.92} rx={width * 0.5} ry={height * 0.1} />
        <ellipse cx={width * 0.85} cy={height * 0.35} rx={width * 0.3} ry={height * 0.08} />
      </g>
    </g>
  );
}
