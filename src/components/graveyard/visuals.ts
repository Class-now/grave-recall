/**
 * Pure data-to-visual mappings for the graveyard scene.
 *
 * Every formula here comes from the "Effect-to-Data Master Table" in the
 * spooky-design-system steering. No DOM, no signals.
 */
import { COLOR_STONE_CRUMBLED, COLOR_STONE_DARK } from '../../design/tokens';
import { daysBetween } from '../../utils/date';

/** Stability (days) at which a tombstone reaches its "fully memorised" look. */
export const STABILITY_CAP_DAYS = 60;

/** Maximum moss opacity (design system: 0 to 0.6). */
export const MOSS_MAX_OPACITY = 0.6;

export const GHOST_OPACITY_MIN = 0.15;
export const GHOST_OPACITY_MAX = 0.95;

export const GHOST_DRIFT_MAX_SECONDS = 12;
export const GHOST_DRIFT_MIN_SECONDS = 3;
export const GHOST_DRIFT_SECONDS_PER_OVERDUE_DAY = 1.5;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Stability normalised to [0, 1] against STABILITY_CAP_DAYS. Non-finite input counts as 0. */
function stabilityRatio(stability: number): number {
  if (!Number.isFinite(stability)) return 0;
  return clamp(stability / STABILITY_CAP_DAYS, 0, 1);
}

function parseHex(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function toHex(channels: readonly number[]): string {
  return (
    '#' +
    channels
      .map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * `--tombstone-fill`: linear interpolation from stone-crumbled (stability 0)
 * to stone-dark (stability >= 60 days).
 */
export function tombstoneFill(stability: number): string {
  const k = stabilityRatio(stability);
  const from = parseHex(COLOR_STONE_CRUMBLED);
  const to = parseHex(COLOR_STONE_DARK);
  return toHex(from.map((c, i) => c + ((to[i] ?? c) - c) * k));
}

/** `--tombstone-crack-opacity` = clamp(1 - stability / 60, 0, 1). */
export function tombstoneCrackOpacity(stability: number): number {
  return 1 - stabilityRatio(stability);
}

/** `--tombstone-moss-opacity` = clamp(stability / 60, 0, 0.6). */
export function tombstoneMossOpacity(stability: number): number {
  return clamp(stabilityRatio(stability), 0, MOSS_MAX_OPACITY);
}

/** `--ghost-opacity` = clamp(1 - retrievability, 0.15, 0.95). */
export function ghostOpacity(retrievability: number): number {
  const r = Number.isFinite(retrievability) ? retrievability : 1;
  return clamp(1 - r, GHOST_OPACITY_MIN, GHOST_OPACITY_MAX);
}

/** Whole calendar days a card is past due; 0 when it is not overdue. */
export function daysPastDue(dueDate: Date, now: Date): number {
  return Math.max(0, daysBetween(dueDate, now));
}

/** `--ghost-drift-speed` in seconds = max(3, 12 - daysPastDue * 1.5). */
export function ghostDriftSeconds(pastDueDays: number): number {
  return Math.max(
    GHOST_DRIFT_MIN_SECONDS,
    GHOST_DRIFT_MAX_SECONDS - Math.max(0, pastDueDays) * GHOST_DRIFT_SECONDS_PER_OVERDUE_DAY,
  );
}

/** Rounds so inline CSS values stay short and stable. */
export function round(value: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/**
 * Moon progress wedge: an SVG path sweeping clockwise from 12 o'clock through
 * `360deg * progress`. Returns '' for no progress. A full circle is drawn as
 * two half arcs because a single arc cannot span 360 degrees.
 */
export function moonArcPath(progress: number, cx: number, cy: number, r: number): string {
  const p = Number.isFinite(progress) ? clamp(progress, 0, 1) : 0;
  if (p <= 0) return '';
  if (p >= 1) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
  }
  const angle = p * 2 * Math.PI;
  const x = round(cx + r * Math.sin(angle), 2);
  const y = round(cy - r * Math.cos(angle), 2);
  const largeArc = p > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} Z`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const CELL_WIDTH = 56;
export const CELL_HEIGHT = 72;
export const TOMBSTONE_WIDTH = 40;
export const TOMBSTONE_HEIGHT = 52;
export const SKY_HEIGHT = 140;
export const SCENE_PADDING = 24;
export const MIN_SCENE_WIDTH = 360;
export const MAX_COLUMNS = 16;

export interface GravePosition {
  /** Left edge of the tombstone in scene coordinates. */
  readonly x: number;
  /** Top edge of the tombstone in scene coordinates. */
  readonly y: number;
}

export interface GraveLayout {
  readonly positions: readonly GravePosition[];
  readonly columns: number;
  readonly rows: number;
  readonly width: number;
  readonly height: number;
}

/** Staggered grid: odd rows are shifted half a cell so graves do not line up like a table. */
export function layoutGraves(count: number): GraveLayout {
  const n = Math.max(0, Math.floor(count));
  const columns = Math.min(MAX_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(n * 1.5))));
  const rows = Math.ceil(n / columns);

  const positions: GravePosition[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const stagger = row % 2 === 1 ? CELL_WIDTH / 2 : 0;
    positions.push({
      x: SCENE_PADDING + col * CELL_WIDTH + stagger + (CELL_WIDTH - TOMBSTONE_WIDTH) / 2,
      y: SKY_HEIGHT + row * CELL_HEIGHT + (CELL_HEIGHT - TOMBSTONE_HEIGHT) / 2,
    });
  }

  const width = Math.max(MIN_SCENE_WIDTH, SCENE_PADDING * 2 + columns * CELL_WIDTH + CELL_WIDTH / 2);
  const height = SKY_HEIGHT + Math.max(rows, 1) * CELL_HEIGHT + SCENE_PADDING;
  return { positions, columns, rows, width, height };
}

/** Locale-aware short date used in labels and the detail panel. */
export function formatDate(date: Date, locale: 'en' | 'ja'): string {
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
