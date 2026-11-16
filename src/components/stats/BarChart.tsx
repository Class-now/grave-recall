/**
 * Accessible SVG bar chart shared by the Ledger charts. Each bar is an image
 * with an aria-label (and a matching <title> for pointer users). A bar is
 * one or more stacked segments, drawn bottom to top.
 */
import { h } from 'preact';

import './stats.css';

export interface BarSegment {
  value: number;
  /** CSS class that sets the segment fill from a design token. */
  className: string;
}

export interface Bar {
  key: string;
  label: string;
  segments: readonly BarSegment[];
}

export interface BarChartProps {
  bars: readonly Bar[];
  /** Accessible name of the whole chart. */
  label: string;
  /** Extra class on the <svg>, used by tests and styles. */
  className?: string;
}

/** The segment class that is drawn with the diagonal hatch (steering: incorrect is never colour alone). */
export const DANGER_FILL_CLASS = 'gr-chart__fill--danger';

const BAR_WIDTH = 10;
const BAR_GAP = 4;
const PLOT_HEIGHT = 100;

export function barTotal(bar: Bar): number {
  return bar.segments.reduce((sum, s) => sum + s.value, 0);
}

/** Id of this chart's hatch pattern, unique per chart because it comes from the chart's class. */
export function hatchId(className: string | undefined): string {
  const base = (className ?? 'gr-chart').trim().replace(/[^A-Za-z0-9_-]+/g, '-');
  return `${base}-hatch`;
}

export function BarChart(props: BarChartProps): h.JSX.Element {
  const { bars, label, className } = props;
  const patternId = hatchId(className);
  const hasDanger = bars.some((bar) => bar.segments.some((s) => s.className === DANGER_FILL_CLASS && s.value > 0));
  const peak = Math.max(1, ...bars.map(barTotal));
  const width = bars.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

  return (
    <svg
      class={className === undefined ? 'gr-chart' : `gr-chart ${className}`}
      viewBox={`0 0 ${Math.max(width, 1)} ${PLOT_HEIGHT}`}
      preserveAspectRatio="none"
      role="group"
      aria-label={label}
      style={{ '--gr-chart-hatch': `url(#${patternId})` }}
    >
      {hasDanger ? (
        <defs>
          <pattern id={patternId} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect class="gr-chart__hatch-base" width={4} height={4} />
            <line class="gr-chart__hatch-line" x1={2} y1={0} x2={2} y2={4} />
          </pattern>
        </defs>
      ) : null}
      <line class="gr-chart__axis" x1={0} y1={PLOT_HEIGHT} x2={Math.max(width, 1)} y2={PLOT_HEIGHT} />
      {bars.map((bar, index) => {
        const x = index * (BAR_WIDTH + BAR_GAP);
        let y = PLOT_HEIGHT;
        return (
          <g key={bar.key} class="gr-chart__bar" role="img" aria-label={bar.label}>
            <title>{bar.label}</title>
            {bar.segments.map((segment, i) => {
              if (segment.value <= 0) return null;
              const height = (segment.value / peak) * PLOT_HEIGHT;
              y -= height;
              return (
                <rect
                  key={i}
                  class={segment.className}
                  x={x}
                  y={y}
                  width={BAR_WIDTH}
                  height={height}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
