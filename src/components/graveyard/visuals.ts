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

/** Fixed `viewBox` of the graveyard scene. It never depends on the number of cards. */
export const YARD_WIDTH = 1200;
export const YARD_HEIGHT = 600;

/** Tombstone size in scene units at scale 1. */
export const TOMBSTONE_WIDTH = 40;
export const TOMBSTONE_HEIGHT = 52;

/** Where the sky meets the grave field. Static scene geometry, not data. */
export const HORIZON_Y = 300;

/** Baseline (bottom edge) of the back row and of the front row. */
export const BACK_Y = 330;
export const FRONT_Y = 548;

/** Bottom strip kept free of graves: 6 percent of the stage, under the caption bar. */
export const CLEAR_STRIP_HEIGHT = 36;

/** Row scale at the back and front rows (steering section 6.4: 0.7 to 1.0). */
export const BACK_SCALE = 0.7;
export const FRONT_SCALE = 1;

/** Perspective cue limits (steering section 6.4). */
export const MAX_TILT_DEGREES = 3;
export const MAX_DEPTH_SHADE = 0.3;

/** Most columns used while the yard holds at most `DENSE_YARD_COUNT` graves. */
export const MAX_COLUMNS = 23;
/** Above this many graves, columns grow and graves shrink so rows stay clear of each other. */
export const DENSE_YARD_COUNT = 250;
const MAX_DENSE_COLUMNS = 60;

/** Width of the band the columns are spread across, centred on the scene. */
const FIELD_WIDTH = 1040;
const CENTER_X = YARD_WIDTH / 2;
/** Columns per square-root of the card count: wider than tall, like a field. */
const COLUMN_ASPECT = 3.5;
/** Fraction of the column pitch a grave may fill when the yard is dense. */
const DENSE_FILL = 0.95;

export interface YardPosition {
  /** Grave centre, scene units. */
  readonly x: number;
  /** Grave baseline (bottom edge), scene units. */
  readonly y: number;
  /** Row scale (0.7 at the back to 1.0 at the front, smaller only in very dense yards). */
  readonly scale: number;
  /** Rotation in degrees, at most `MAX_TILT_DEGREES` either way. */
  readonly tilt: number;
  /** Depth-shade overlay opacity, 0 at the front to `MAX_DEPTH_SHADE` at the back. */
  readonly shade: number;
  readonly row: number;
  readonly col: number;
}

export interface Yard {
  readonly positions: readonly YardPosition[];
  readonly columns: number;
  readonly rows: number;
}

function lerp(a: number, b: number, k: number): number {
  return a + (b - a) * k;
}

/**
 * Grave layout in perspective rows. Pure: every value depends only on `count`
 * and the grave's index, never on card fields (steering section 6.4).
 *
 * Index `i` sits in row `floor(i / columns)`, column `i % columns`; row 0 is the
 * back, so Arrow Up and Down still move by `columns`.
 */
export function layoutYard(count: number): Yard {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const maxColumns = n <= DENSE_YARD_COUNT ? MAX_COLUMNS : MAX_DENSE_COLUMNS;
  const columns = clamp(Math.ceil(Math.sqrt(n * COLUMN_ASPECT)), 1, maxColumns);
  const rows = Math.ceil(n / columns);

  // Graves shrink only when the columns are too tight to hold a full-size stone.
  const basePitch = FIELD_WIDTH / (columns + 0.5);
  const fit = Math.min(1, (DENSE_FILL * basePitch) / TOMBSTONE_WIDTH);

  const positions: YardPosition[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const inRow = Math.min(columns, n - row * columns);
    const depth = rows === 1 ? 1 : row / (rows - 1);

    const rowScale = lerp(BACK_SCALE, FRONT_SCALE, depth);
    // The integral of the row scale, so the gap between rows follows stone height.
    const reach = (BACK_SCALE * depth + ((FRONT_SCALE - BACK_SCALE) / 2) * depth * depth) /
      ((BACK_SCALE + FRONT_SCALE) / 2);
    const pitch = basePitch * rowScale;
    // Alternate rows lean opposite ways by a quarter pitch each: half a pitch apart.
    const stagger = (row % 2 === 1 ? 1 : -1) * (pitch / 4);

    positions.push({
      x: round(CENTER_X + (col - (inRow - 1) / 2) * pitch + stagger, 2),
      y: round(lerp(BACK_Y, FRONT_Y, reach), 2),
      scale: round(rowScale * fit, 4),
      tilt: ((row * 7 + col * 13) % 7) - 3,
      shade: round(MAX_DEPTH_SHADE * (1 - depth), 4),
      row,
      col,
    });
  }
  return { positions, columns, rows };
}
/** Locale-aware short date used in labels and the detail panel. */
export function formatDate(date: Date, locale: 'en' | 'ja'): string {
  return dateFormatter(locale).format(date);
}

// Building an Intl.DateTimeFormat is far slower than using one, and every grave
// formats a date on each render, so one formatter per locale is kept.
const dateFormatters = new Map<'en' | 'ja', Intl.DateTimeFormat>();

function dateFormatter(locale: 'en' | 'ja'): Intl.DateTimeFormat {
  let formatter = dateFormatters.get(locale);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    dateFormatters.set(locale, formatter);
  }
  return formatter;
}
