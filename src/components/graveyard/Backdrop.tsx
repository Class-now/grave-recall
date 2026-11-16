/**
 * Static backdrop of the graveyard scene (spooky-design-system section 6).
 *
 * Night sky, moon halo, two hills, bare trees, iron fence and ground, plus the
 * foreground ground strip. Everything here is a hand-authored constant: no
 * randomness, no clock, no store reads, no text. The markup is identical for
 * every user and every store state, carries no data and is inert for assistive
 * technology and pointer input. Colours come from the section 6.2 palette via
 * the classes in graveyard.css.
 */
import { h } from 'preact';

import { MOON_CX, MOON_CY, MOON_HALO_RADIUS, YARD_HEIGHT, YARD_WIDTH } from './visuals';

import './graveyard.css';

export const SKY_GRADIENT_ID = 'gr-sky-gradient';
export const HALO_GRADIENT_ID = 'gr-moon-halo-gradient';
export const GROUND_GRADIENT_ID = 'gr-ground-gradient';

/** Where the sky stops and the ground begins (scene units). */
const SKY_HEIGHT = 340;
const GROUND_TOP = 322;

const FAR_HILL_PATH =
  'M0 340 V250 C80 232 160 226 240 238 C330 252 400 262 480 250 C570 236 640 214 740 218 ' +
  'C830 222 900 246 980 244 C1070 242 1130 226 1200 236 V340 Z';
const NEAR_HILL_PATH =
  'M0 340 V282 C100 268 190 272 290 284 C400 298 470 290 570 278 C680 264 760 270 860 284 ' +
  'C960 298 1060 280 1200 270 V340 Z';

/** Two tree shapes, drawn upward from the origin (the foot of the trunk). */
const TREE_A = {
  trunk: 'M-4 0 L-2.5 -62 L-1 -110 L0 -150 L1.5 -108 L3 -62 L5 0 Z',
  branches:
    'M-2 -62 L-26 -88 L-38 -110 M-26 -88 L-44 -92 M1 -90 L24 -112 L32 -140 M24 -112 L42 -116 ' +
    'M-1 -118 L-12 -138 M0 -130 L10 -150',
} as const;
const TREE_B = {
  trunk: 'M-5 0 L-3 -40 L-8 -80 L-6 -118 L-3 -78 L-1 -40 L5 0 Z',
  branches:
    'M-3 -40 L18 -62 L34 -66 M18 -62 L26 -84 M-8 -80 L-30 -96 L-46 -94 M-30 -96 L-36 -118 ' +
    'M-6 -100 L6 -122',
} as const;

interface TreePlacement {
  readonly shape: typeof TREE_A | typeof TREE_B;
  readonly x: number;
  readonly y: number;
  readonly sx: number;
  readonly sy: number;
}

/** Five trees at fixed places along the horizon, clear of the moon. */
const TREES: readonly TreePlacement[] = [
  { shape: TREE_A, x: 60, y: 312, sx: 1, sy: 1 },
  { shape: TREE_B, x: 470, y: 312, sx: -1, sy: 0.8 },
  { shape: TREE_A, x: 700, y: 312, sx: 0.7, sy: 0.7 },
  { shape: TREE_B, x: 900, y: 312, sx: 1.1, sy: 1.1 },
  { shape: TREE_A, x: 1150, y: 312, sx: -0.9, sy: 0.9 },
];

/** Fence: 60 picket slots across the scene, minus the span taken by the gate. */
const FENCE_TOP = 292;
const FENCE_BOTTOM = 330;
const GATE_GAP_START = 1000;
const GATE_GAP_END = 1100;
const PICKET_SLOTS = 60;

const PICKET_XS: readonly number[] = Array.from({ length: PICKET_SLOTS }, (_, i) => 10 + i * 20).filter(
  (x) => x < GATE_GAP_START || x > GATE_GAP_END,
);
const PICKETS_PATH = PICKET_XS.map(
  (x) => `M${x - 3} ${FENCE_BOTTOM} V${FENCE_TOP + 6} L${x} ${FENCE_TOP} L${x + 3} ${FENCE_TOP + 6} V${FENCE_BOTTOM} Z`,
).join(' ');
const FENCE_RAILS_PATH =
  `M0 302 H${GATE_GAP_START} M${GATE_GAP_END} 302 H${YARD_WIDTH} ` +
  `M0 320 H${GATE_GAP_START} M${GATE_GAP_END} 320 H${YARD_WIDTH}`;

/** Foreground ground strip with an irregular top edge. It stays inside the clear strip (y >= 564). */
const FRONT_STRIP_PATH =
  'M0 600 V584 C60 572 120 580 190 574 C270 567 330 580 420 576 C520 571 590 582 680 575 ' +
  'C770 568 850 580 940 574 C1030 568 1110 580 1200 572 V600 Z';

/** Sky, halo, hills, trees, fence and ground: everything behind the graves. */
export function BackdropBack(): h.JSX.Element {
  return (
    <g class="gr-backdrop gr-backdrop--back" aria-hidden="true">
      <defs>
        <linearGradient id={SKY_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <stop class="gr-backdrop__sky-stop gr-backdrop__sky-stop--top" offset="0" />
          <stop class="gr-backdrop__sky-stop gr-backdrop__sky-stop--horizon" offset="1" />
        </linearGradient>
        <radialGradient id={HALO_GRADIENT_ID}>
          <stop class="gr-backdrop__halo-stop" offset="0" stop-opacity="0.35" />
          <stop class="gr-backdrop__halo-stop" offset="0.45" stop-opacity="0.18" />
          <stop class="gr-backdrop__halo-stop" offset="1" stop-opacity="0" />
        </radialGradient>
        <linearGradient id={GROUND_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          <stop class="gr-backdrop__ground-stop gr-backdrop__ground-stop--top" offset="0" />
          <stop class="gr-backdrop__ground-stop gr-backdrop__ground-stop--bottom" offset="1" />
        </linearGradient>
      </defs>
      <rect
        class="gr-backdrop__sky"
        x="0"
        y="0"
        width={YARD_WIDTH}
        height={SKY_HEIGHT}
        fill={`url(#${SKY_GRADIENT_ID})`}
      />
      <circle
        class="gr-backdrop__halo"
        cx={MOON_CX}
        cy={MOON_CY}
        r={MOON_HALO_RADIUS}
        fill={`url(#${HALO_GRADIENT_ID})`}
      />
      <path class="gr-backdrop__hill gr-backdrop__hill--far" d={FAR_HILL_PATH} />
      <path class="gr-backdrop__hill gr-backdrop__hill--near" d={NEAR_HILL_PATH} />
      {TREES.map((tree) => (
        <g
          key={`${tree.x}`}
          class="gr-backdrop__tree"
          transform={`translate(${tree.x} ${tree.y}) scale(${tree.sx} ${tree.sy})`}
        >
          <path class="gr-backdrop__trunk" d={tree.shape.trunk} />
          <path class="gr-backdrop__branches" d={tree.shape.branches} />
        </g>
      ))}
      <rect
        class="gr-backdrop__ground"
        x="0"
        y={GROUND_TOP}
        width={YARD_WIDTH}
        height={YARD_HEIGHT - GROUND_TOP}
        fill={`url(#${GROUND_GRADIENT_ID})`}
      />
      <g class="gr-backdrop__fence">
        <path class="gr-backdrop__fence-rails" d={FENCE_RAILS_PATH} />
        <path class="gr-backdrop__fence-pickets" d={PICKETS_PATH} />
      </g>
    </g>
  );
}

/** Foreground ground strip, drawn in front of the last row of graves. */
export function BackdropFront(): h.JSX.Element {
  return (
    <g class="gr-backdrop gr-backdrop--front" aria-hidden="true">
      <path class="gr-backdrop__front-strip" d={FRONT_STRIP_PATH} />
    </g>
  );
}
