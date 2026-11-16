# Costume Polish: Implementation Tasks

Eight tasks, in order. Each fits one session and leaves the app visually better and shippable. Every task ends with the same three gates: typecheck, vitest, build.

Rules for every task:

- Read `requirements.md` and `design.md` in this folder first. Follow the steering files (`tech.md` coding standards, `structure.md` import order and file naming, `spooky-design-system.md` including section 6).
- Do not start the dev server (`tech.md`). Each task ends with an owner visual check, written as plain text outside the checkboxes.
- Do not edit the mapping tests. An existing test may be edited only where a task names it.
- Prefer CSS and SVG for decoration. Add no dependency, raster image, audio file or external host.
- Remove temporary files before finishing.

Baseline before Task 1: 411 tests pass, JavaScript is 28.3 KB gzipped (budget 150 KB).

---

## Task 1 — Page frame: tokens, header, logo, stone-slab nav
*Prerequisites: none*
*Refs: CP-04 (palette tokens), CP-05 to CP-15, CP-60, CP-62, CP-63*

- [x] Add the eight backdrop palette tokens from steering section 6.2 to `src/index.css` and as constants in `src/design/tokens.ts` and `TOKEN_MAP` (`COLOR_SKY_TOP`, `COLOR_SKY_HORIZON`, `COLOR_HILL_FAR`, `COLOR_HILL_NEAR`, `COLOR_TREE`, `COLOR_IRON`, `COLOR_GROUND_FORE`, `COLOR_HALO`). Add the names to the lists in `tokens.test.ts`. The existing "index.css mirrors the TypeScript tokens" test then covers them.
- [x] Add `--gr-chrome: 12.5rem` to `index.css` (used from Task 2) and a body background wash: a vertical gradient from `--color-sky-top` to `--color-void`.
- [x] Create `src/components/frame/TombstoneLogo.tsx`: a small inline SVG with `aria-hidden="true"` and `focusable="false"`, using the silhouette of `public/grave.svg` (arched stone, cross incision) with design-token colours.
- [x] Create `src/components/frame/SiteHeader.tsx`: logo, `<h1>{t('app.name')}</h1>`, and the `<nav aria-label={t('nav.main')}>` with the same five buttons, order, labels and `aria-current` as in `app.tsx`. Add a divider-rule ornament below (aria-hidden). `app.tsx` renders `SiteHeader` and passes the current view and `show`. Keep the `role="status"` region and `<main>`.
- [x] Create `src/components/frame/frame.css`:
  - A centred container (`max-width: 75rem`, `margin-inline: auto`, inline padding at least `1rem`) around header, status and main.
  - `h1` in `var(--font-display)` at `var(--text-display)` (clamped down to 1.75rem on narrow screens), `letter-spacing: 0.05em`, `font-synthesis-weight: none`; a `:lang(ja)` rule that adds a Japanese serif stack.
  - Nav tabs: stone-slab look from `--color-stone-dark`, `--color-stone-mid`, `--color-border`; arched top corners; the active tab (`[aria-current="page"]`) raised, with no bottom border, and a lighter fill; hover state; at least 2.5rem tall; wrapping; a 2 px `--color-focus-ring` outline with offset so it is not clipped.
  - Remove the `#grave-recall-root nav` rules from `index.css`; keep the nav tabs independent of `.gr-btn`.
- [x] Make the séance-complete status line take no layout space (CP-15): reserve a fixed-height slot inside the header region or position it over the top edge of `<main>`. Keep `role="status"` and its text.
- [x] Steering: add `components/frame/` (`SiteHeader.tsx`, `TombstoneLogo.tsx`, `frame.css`) to the layout in `.kiro/steering/structure.md`.
- [x] Tests:
  - `app.test.ts`: the nav still has five buttons in the same order with the same names, the active one has `aria-current="page"`, and an `<h1>` with the app name exists. Do not change existing assertions.
  - New `frame.test.ts`: the logo has `aria-hidden="true"` and no focusable descendants; `frame.css` text contains `max-width`, `font-synthesis-weight: none`, `var(--font-display)`, an `[aria-current="page"]` rule and a `:focus-visible` rule using `var(--color-focus-ring)`; the CSS does not reference `.gr-btn`.
  - `contrast.test.ts`: the stone-slab pairs (`text-primary` on `stone-dark` and `stone-mid`, `focus-ring` on both) already exist; confirm they are present and add `text-primary` and `text-secondary` on `sky-top` and `sky-horizon` (4.5:1), `focus-ring` on `sky-top` and `sky-horizon` (3:1), and `stone-crumbled` on `stone-dark` (3:1) for the tab border.
  - `bundle.test.ts` is unchanged and must pass (no new host).
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes (411 existing tests plus the new ones).
- [x] Gate: `npm run build` passes.

*Owner check: open at 1280 by 720 and at 390 wide. The title is blackletter and centred with margins, the tabs read as slabs, the active tab is obvious, Tab shows the focus ring on each tab, and Japanese mode shows no missing-glyph boxes in the title.*

---

## Task 2 — Graveyard stage and depth layout
*Prerequisites: Task 1*
*Refs: CP-16 to CP-26, CP-60, CP-62, CP-66, CP-67*

- [x] Before changing anything, add `src/components/graveyard/mapping-freeze.test.ts` with golden values for `tombstoneFill`, `tombstoneCrackOpacity`, `tombstoneMossOpacity` (stability 0, 15, 30, 60, 90), `ghostOpacity` (R 0, 0.5, 1), `ghostDriftSeconds` (days 0, 2, 6, 10), `moonArcPath` (progress 0, 0.25, 0.5, 1 at 64, 64, 28) and `fogOpacity` (0 cards, 1 of 10, 5 of 10, 10 of 10 overdue). Run it green first.
- [x] In `visuals.ts`, add `layoutYard(count)` as specified in design section 4 (columns, rows, per-grave `x`, `y`, `scale`, `tilt`, `shade`, `row`, `col`), with exported constants for the `viewBox` size (`YARD_WIDTH = 1200`, `YARD_HEIGHT = 600`), `FRONT_Y`, `BACK_Y`, the scale range and the clear-strip height. Remove `layoutGraves` and the unused cell constants. Do not touch the mapping functions.
- [x] Update `Tombstone.tsx`: props `x`, `y` (centre and baseline), `scale`, `tilt`, `shade`. Outer group `translate(x y) rotate(tilt) scale(scale)` with the stone drawn from `(-20, -52)`. Add a `.gr-tombstone__shade` path over the stone whose opacity is `var(--depth-shade)`, set inline from `shade`. Keep the class `gr-tombstone`, the role, label, `tabindex`, `data-card-id`, handlers and the three inline mapping variables.
- [x] Update `GraveyardScene.tsx`: wrap the SVG in `.gr-stage-scroll > .gr-stage`; fixed `viewBox="0 0 1200 600"`; `preserveAspectRatio="xMidYMid meet"`; keep sky and ground rects for now (gradient sky from the new tokens); use `layoutYard`; keep arrow-key navigation on `columns`. Reposition `MoonPhase` and `CrowKeeper` by props for the new `viewBox`; leave the `MoonPhase` defaults alone (a test pins them). Pass the fixed `YARD_WIDTH` and `YARD_HEIGHT` to `FogLayer`.
- [x] Minimal `Ghost.tsx` change so the app stays shippable: place each ghost from the new grave anchor (`x`, `y`, `scale`) with its present drawing. The redesign is Task 4.
- [x] CSS in `graveyard.css`: `.gr-stage` with `aspect-ratio: 2 / 1`, `width: min(100%, calc((100vh - var(--gr-chrome)) * 2))` followed by the same line with `dvh`, `margin-inline: auto`, a thin border and an inset vignette; `.gr-scene` fills the stage; remove `max-height: 80vh`. `.gr-stage-scroll` gets `overflow-x: auto` and `.gr-stage` gets `min-width: 45rem`. Compact the view heading and hint so they fit the `--gr-chrome` budget. Keep tombstone focus styling.
- [x] Update the one existing test "layout gives every grave a distinct in-bounds position (up to 250 cards)" in `graveyard.test.ts` to use `layoutYard`. This is the only existing test edited in this task.
- [x] New tests in `graveyard.test.ts`:
  - `layoutYard` for counts 0 to 250 (property test): positions equal the count, distinct, inside the `viewBox` taking scale into account; no horizontal overlap within a row; scale between 0.7 and 1.0 and non-decreasing by row; `|tilt| <= 3`; `0 <= shade <= 0.30`; no grave below the clear strip; deterministic for equal input.
  - For 150 cards: the vertical overlap with the row behind is at most 30 percent of the rear grave's height. For 200 cards: at most 45 percent.
  - At the 720p stage width (1040 px for 1200 units) the narrowest grave is at least 24 px wide for counts up to 200.
  - The rendered `viewBox` is identical for 0, 1, 150 and 200 cards.
  - Stage CSS text checks: `aspect-ratio`, a `dvh` width rule, no `80vh`, no `min-height` above `100vh` on `#grave-recall-root`, the frame container or `.gr-graveyard`.
  - Existing arrow-key, Home, End and Enter tests still pass unchanged.
- [x] Steering: add `mapping-freeze.test.ts` to the graveyard folder in `structure.md`.
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes (including `perf.test.ts` at 200 cards).
- [x] Gate: `npm run build` passes.

*Owner check: at 1280 by 720 with the starter crypts (150 cards) the whole Graveyard view fits with no scrollbar; graves sit in perspective rows, smaller and darker toward the back, slightly tilted; Tab and the arrow keys move through the rows.*

---

## Task 3 — Backdrop: sky, hills, trees, fence, gate, large moon with halo
*Prerequisites: Task 2*
*Refs: CP-01 to CP-04, CP-27 to CP-29, CP-60, CP-62, CP-63*

- [x] Create `src/components/graveyard/Backdrop.tsx` with two components, `BackdropBack` and `BackdropFront`, built from module-level constants only (hand-authored path strings, fixed counts). Each root is `<g aria-hidden="true" class="gr-backdrop">` with `pointer-events: none` in CSS.
  - `BackdropBack`: night-sky gradient (`linearGradient` from `--color-sky-top` to `--color-sky-horizon`), moon halo (one `radialGradient` circle in `--color-halo` at a constant opacity of 0.35 or less, centred on the moon), two hill paths, at least three bare-tree paths, an iron fence (fixed picket count), the ground fill.
  - `BackdropFront`: the foreground ground strip in the bottom clear zone, with an irregular top edge drawn from a constant path.
  - No `Math.random`, no `Date`, no store imports, no text, no `role`, no `tabindex`. Colours via palette tokens through CSS classes or `var(--color-…)`; none of the data-reserved colours.
- [x] Update `GraveyardScene.tsx` to the paint order in design section 3 for the parts that exist now: `BackdropBack`, `MoonPhase`, gate and crow, graves, `BackdropFront`. Remove the old sky and ground rects.
- [x] Moon: render `MoonPhase` with props for a radius of at least 56 units at about (230, 130). Keep `moonArcPath`, the `aria-label`, `data-progress` and the `moon-wax` behaviour. Strengthen the disc rim so the unlit disc reads against the halo.
- [x] Gate: redraw the `.gr-gate` group in `CrowKeeper.tsx` with two stone posts with caps, a top rail with a small arch, and vertical bars, scaled for the new scene and placed on the fence line at the right. The crow keeps its class names, `data-streak`, hop, eye-glow rule and `crowCaw()` call, and perches on the top rail. Colours from `--color-iron` and the stone tokens.
- [x] Tests in `graveyard.test.ts`:
  - The serialised `.gr-backdrop` markup is identical when rendered with: no cards; 150 cards with mixed stability and overdue; a populated review log with a streak; locale `ja`.
  - Every `.gr-backdrop` element has `aria-hidden="true"`, and none contains a `role`, `tabindex`, `<text>` or `<title>`.
  - Source scan: `Backdrop.tsx` contains none of `Math.random`, `Date`, `@preact/signals`, `from '../../store`.
  - CSS scan: the `.gr-backdrop*` rules do not reference `--color-ghost-body`, `--color-ghost-glow`, `--color-fog-base`, `--color-crow-eye`, `--color-candle-flame`, `--color-moon-full`, `--color-danger`, `--color-warning` or `--color-success`.
  - The scene contains one sky gradient, two hills, at least three trees, a fence and `.gr-gate`.
  - The moon radius is at least 56; the `moonArcPath` result for the displayed progress is unchanged.
  - `contrast.test.ts`: `moon-full` on `moon-new` at least 3:1.
  - Existing `<CrowKeeper>` and `<MoonPhase>` tests pass unchanged.
- [x] Steering: add `Backdrop.tsx` to the graveyard folder in `structure.md`.
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes.
- [x] Gate: `npm run build` passes.

*Owner check: the scene now has a night sky, distant hills, dead trees on the horizon, an iron fence, a drawn gate with the crow on it, and a large moon with a soft halo. Nothing in the backdrop moves.*

---

## Task 4 — Soft layered fog and larger glowing ghosts
*Prerequisites: Task 3*
*Refs: CP-30 to CP-38, CP-26, CP-60, CP-62, CP-66*

- [x] Steering: add the new fog-drift and ghost-sway animations to the Animation Catalogue (section 3.2) of `spooky-design-system.md`, with their data meaning and reduced-motion substitute, as in design section 7.
- [x] Rewrite `FogLayer.tsx` (same props and the same `FOG_FILTER_ID`):
  - The root keeps `class="gr-fog"`, `role="img"` and the `a11y.fog` label.
  - The wrapper `.gr-fog__layer` keeps the inline `--fog-opacity` and the `--pulse` and `--paused` classes, and owns the opacity.
  - Inside: a static `.gr-fog__wisps` group using the existing filter (keep `feTurbulence` and `feDisplacementMap`, add a small `feGaussianBlur`), and three `.gr-fog__bank` shapes filled with `radialGradient`s whose alpha reaches 0 at the edge. Banks draw at full strength and carry no opacity of their own.
  - When motion is allowed, the banks get `gr-fog__bank--drift-a`, `--drift-b`, `--drift-c`. A and C drift left, B drifts right, with durations of 6, 8 and 7 times `--motion-ambient`, `alternate`, `transform` only.
  - Under reduced motion none of the drift or pulse classes is applied. While hidden, the paused rule covers the banks too.
- [x] Update `GraveyardScene.tsx` paint order: graves of rows 0 to R-3, `FogLayer`, graves of the last two rows (the last row when fewer than four rows), `BackdropFront`, ghosts. Keep DOM order of graves equal to card order.
- [x] Redraw `Ghost.tsx`: body at least as tall as a tombstone and at least 0.9 times as wide (export `GHOST_WIDTH`, `GHOST_HEIGHT`), with a wavy hem and two eyes. Anchor it above its tombstone using `x`, `y` and `scale` from `layoutYard`. Add a `radialGradient` halo ellipse in `--color-ghost-glow` inside the same group, so the group opacity scales body and glow together. No SVG `filter` on the ghost. Keep `role="img"`, `aria-label`, `data-ghost-for`, `--ghost-opacity`, `--ghost-drift-speed`, and the class `gr-ghost--drift` as the motion switch.
- [x] CSS: extend `ghost-drift` with a small `rotate` sway about the bottom centre (`transform-box: fill-box; transform-origin: 50% 100%`); `transform` only. Keep `pointer-events: none`. Paused while the scene is hidden.
- [x] Tests in `graveyard.test.ts`:
  - Fog has at least three `.gr-fog__bank` elements; each fill is a `url(#…)` gradient; the first `.gr-fog__layer` still carries `--fog-opacity` equal to `fogOpacity` for 0, 1 of 10 and 10 of 10 overdue (the existing assertions).
  - Full motion: the banks have `--drift-a`, `--drift-b` and `--drift-c`; reduced motion: no `--drift-*` and no `--pulse`; hidden: `.gr-fog__layer--paused` present.
  - CSS text: the drift keyframes contain only `transform`; their durations are `calc(var(--motion-ambient) * N)` with N at least 5; a drift-a/c and a drift-b keyframe have opposite signs.
  - DOM order: with 150 cards, `.gr-fog` comes after the graves of the first `150 - 2 * columns` cards and before the last `2 * columns`; every `[data-ghost-for]` comes after `.gr-fog`.
  - Ghost constants: `GHOST_HEIGHT >= TOMBSTONE height` and `GHOST_WIDTH >= 0.9 * TOMBSTONE width`; no `[filter]` attribute inside `.gr-ghost`.
  - `contrast.test.ts`: the focus ring (`#7eb8f7`) blended over `--color-grave-soil` under the maximum fog (0.60 of `--color-fog-base`) is at least 3:1 against `--color-grave-soil`. Add a small `blend` helper to the test file.
  - Existing fog, ghost and a11y tests pass unchanged (a11y `[data-ghost-for]` label checks included).
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes (including the 200-card perf tests).
- [x] Gate: `npm run build` passes.

*Owner check: with some overdue cards, fog banks drift slowly in opposite directions and have soft edges; ghosts are as large as the stones, glow faintly and sway; front rows stay clear of fog. With reduced motion on, nothing moves.*

---

## Task 5 — Séance table, parchment card, candles, 3D flip
*Prerequisites: Task 1*
*Refs: CP-39 to CP-48, CP-60 to CP-63*

- [x] Steering first, in `spooky-design-system.md`:
  - Master table (section 5): add the row "Séance candle flames | Visual | Most recent grade in the session is Good or Easy | Lit when true, unlit otherwise; flare once on each Good or Easy".
  - Animation catalogue (section 3.2): add `candle-flare` (`--motion-slow`, `ease-out`, Good or Easy grade, reduced-motion substitute: solid glow). Narrow the `candle-flicker` row to "while the flames are lit".
  - Colour table (section 1.1): add `--color-parchment` and `--color-ink-secondary` with the hex values in design section 6.
- [x] Add `--color-parchment` and `--color-ink-secondary` to `index.css`, `tokens.ts` and `TOKEN_MAP`; add both names to `tokens.test.ts`.
- [x] Create `src/components/review/Candle.tsx`: SVG candle with a wax body (`--color-candle-wax`), iron holder (`--color-iron`), wick and a flame (`--color-candle-flame`) with a radial glow inside the same group. Props `lit: boolean`, `flare: number`, `paused: boolean`, `motion: boolean`. Root is `aria-hidden="true"` with `data-lit`. When lit and motion allowed: class `gr-candle__flame--flicker`; when `flare` changes and motion allowed: `gr-candle__flame--flare`, keyed on `flare` so it restarts. When unlit: no flame, only a wick ember dot.
- [x] Update `SeanceSession.tsx`: state `lit` (false at start) and `flare` (0). In `handleGrade`, after the existing logic, set `lit` to `grade >= 2` and increment `flare` when `grade >= 2`. Wrap the card in `.gr-table` with a `Candle` on each side. Use `useDocumentHidden` (from `../graveyard/useDocumentHidden`) for the paused state. Do not change the sounds, jumpscare, Coward-mode logic or `onComplete`.
- [x] Rework `FlipCard.tsx` and `review.css` for a parchment card in a perspective container (design sections 6 and 8): `.gr-flipcard` has `perspective`; `.gr-flipcard__inner` has `transform-style: preserve-3d` and a static `rotateY(180deg)` when `data-flipped="true"`; both faces use `backface-visibility: hidden`; the back is pre-rotated 180 degrees; faces share one grid cell; the card has a `min-height`. Under full motion add `gr-flipcard__inner--flip` and keep `gr-flipcard__back--flip` on the back (keyframe from `rotateY(0)` to `rotateY(180deg)`, `--motion-normal`, `cubic-bezier(0.4, 0, 0.2, 1)`). Under reduced motion add neither class. Keep the front `<button>`, focus on mount, Space handling, `backId`, and the back mounted only after the flip. Do not repeat the front word as a second text node.
- [x] Table styling: a table surface from `--color-grave-soil` and `--color-stone-dark` with a soft lamplight radial gradient; text on the card uses `--color-text-inverse` and `--color-ink-secondary`; two-tone focus ring on controls over the parchment (inner `--color-void`, outer `--color-focus-ring`). Below 40rem the candles sit above the card side by side. The séance (header, table, card, grade buttons) fits 720p for ordinary card text.
- [x] Add the flame animations to `review.css`: `candle-flare` (`transform` and `opacity`, `var(--motion-slow)`) and `candle-flicker` (`calc(var(--motion-fast) * 2)`, `steps(3)`); a paused rule for hidden.
- [x] Tests in `review.test.ts`:
  - Candles are unlit at session start; after grading Good or Easy `data-lit="true"` on both; after Again or Hard `data-lit="false"`; Good then Again returns to unlit.
  - A Good or Easy grade renders the flare class under full motion; under reduced motion neither flare nor flicker class is present, while `data-lit` still updates.
  - Coward mode: grading Again in Coward mode leaves both candles unlit and the jumpscare absent, and Good still lights them.
  - Candles have `aria-hidden="true"` and no focusable descendants.
  - CSS text: `review.css` contains `perspective`, `backface-visibility: hidden`, `rotateY(180deg)`; the flip and candle keyframes contain only `transform` and `opacity`.
  - Full motion: the back has `gr-flipcard__back--flip` and the inner box has `gr-flipcard__inner--flip`. Reduced: neither. The existing flip, grading, keyboard and jumpscare tests pass unchanged.
  - `contrast.test.ts`: `text-inverse` on `parchment` at least 4.5; `ink-secondary` on `parchment` at least 4.5; `void` on `parchment` at least 3; `focus-ring` on `grave-soil` and on `stone-dark` (the table) at least 3.
- [x] Steering: add `Candle.tsx` to the review folder in `structure.md`.
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes.
- [x] Gate: `npm run build` passes.

*Owner check: the séance shows a table with a parchment card and a candle on each side. Space turns the card in 3D. Pressing 3 or 4 lights both flames with a flare; 1 or 2 puts them out. With reduced motion the card swaps instantly and the flames change without animation.*

---

## Task 6 — Ledger palette and ledger page
*Prerequisites: Task 1*
*Refs: CP-49 to CP-52, CP-60, CP-63*

- [x] Steering first: add `--color-chart-moss`, `--color-chart-blood` and `--color-chart-bone` to the colour table (section 1.1) of `spooky-design-system.md`, with their purpose.
- [x] Add the three tokens to `index.css`, `tokens.ts` and `TOKEN_MAP`; add the names to `tokens.test.ts`. If `chart-blood` fails the 3:1 check against `--color-surface-panel`, lighten it until it passes.
- [x] `BarChart.tsx`: add a `<defs>` with a diagonal-hatch `<pattern>` whose id is unique per chart instance (for example derived from the chart's `className`). The class `gr-chart__fill--danger` fills with `url(#…)` through an attribute or CSS variable so the hatch shows; keep all existing class names, roles and `aria-label`s.
- [x] `stats.css`: `gr-chart__fill--success` uses `--color-chart-moss`; `--danger` uses the hatch over `--color-chart-blood`; `--forecast` uses `--color-chart-bone`; legend swatches use the same colours, and the danger swatch uses a matching `repeating-linear-gradient` hatch. Remove every reference to `--color-success` and `--color-danger` from chart rules.
- [x] Ledger page look in `stats.css` and `LedgerView.tsx`: a framed page with a header ornament, ruled lines drawn with a CSS `repeating-linear-gradient` (a constant, not data), display-face section headings, monospace figures, spacing that matches the page frame. No change to the data or to heading structure and `aria-labelledby` ids.
- [x] Tests:
  - `stats.test.ts`: `stats.css` text contains `--color-chart-moss`, `--color-chart-blood` and `--color-chart-bone`, and the chart rules contain neither `--color-success` nor `--color-danger`; the rendered retention chart contains a `<pattern>` when incorrect segments exist; the existing bar `aria-label`, role and class assertions pass unchanged.
  - `contrast.test.ts`: each of the three chart tokens on `--color-surface-panel` at least 3:1; `text-primary` on the ledger page background at least 4.5.
  - The stats mapping tests (`retentionSummary`, `reviewsPerDay`, `forecastData`) pass unchanged.
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes.
- [x] Gate: `npm run build` passes.

*Owner check: with a few logged reviews (import a backup or grade some cards), the Ledger shows moss-green and blood-red bars with a hatch on the red, bone-coloured forecast bars, and a ruled ledger-page look.*

---

## Task 7 — Empty and first-run states
*Prerequisites: Tasks 2, 3, 5, 6*
*Refs: CP-53 to CP-59, CP-60, CP-63, CP-64*

- [x] Steering first: add the master-table row "Fresh plot | Visual | `card.srs.srsState === 'new'` | Soil mound and blank wooden marker instead of a stone; no cracks, no moss" to section 5 of `spooky-design-system.md`.
- [x] Add the new strings to `src/i18n/types.ts`, `en.ts` and `ja.ts` (proposed keys in design section 9): graveyard invitation for an empty crypt, graveyard invitation for untouched cards, the two button labels, the séance empty-table line, and the Ledger empty line and hint. Write natural Japanese. The existing i18n completeness test must pass.
- [x] `Tombstone.tsx`: when `card.srs.srsState === 'new'`, draw a fresh plot (mound path, blank marker) instead of the stone, moss and crack paths. Keep the `.gr-tombstone` group, role, label, tab stop, `data-card-id`, handlers, focus ring and the three inline custom properties. Add `gr-tombstone--plot`. The depth shade and tilt still apply.
- [x] `GraveyardScene.tsx`: add optional props `onBeginSeance` and `onOpenCrypts`. With no cards in scope, render the full backdrop, the moon and gate, the existing `graveyard.noCards` message and an "open crypts" button (when `onOpenCrypts` is given). With cards and an empty `reviewLog`, render the invitation line and a "begin séance" button (when `onBeginSeance` is given); these disappear once the review log has an entry. `app.tsx` passes `show('seance')` and `show('crypts')`. Buttons use the frame's button style and sit in reading order before the stage.
- [x] `SeanceSession.tsx`: when `total === 0`, render the table, two unlit candles and a blank parchment card with the existing `seance.noCards` and `seance.noCardsDesc` texts, plus the new table line if it adds anything. No flip control, no grade buttons.
- [x] `RetentionChart.tsx` and `LedgerView.tsx`: when there are no reviews in the window, render the blank ruled ledger page with the existing `stats.noData` text and an invitation line. The forecast chart still renders.
- [x] Tests:
  - `graveyard.test.ts`: with only `new` cards each grave has `gr-tombstone--plot`, still has the three custom properties, the same `role`, `aria-label` and `data-card-id`, and no `.gr-tombstone__crack` or `.gr-tombstone__moss`; a `review`-state card still draws the stone; with no cards the message and the crypts button render and zero graves exist; the invitation and its button render while `reviewLog` is empty and vanish after one entry is added.
  - `review.test.ts`: with no due cards the table, two candles (`data-lit="false"`), the existing messages and no `button` for flip or grade render.
  - `stats.test.ts`: the empty Ledger shows `stats.noData` once and the invitation; the forecast chart is present.
  - `app.test.ts`: the buttons in the empty Graveyard switch to the Séance and Crypts views; existing assertions pass unchanged.
  - `a11y.test.ts`: add axe runs for each of the five views in the empty state, in `en` and `ja`; and axe on a populated Graveyard with `new` cards. Verify the existing tab-order tests still pass (the new buttons are ordinary tab stops; ornaments add none).
  - `contrast.test.ts`: any new text/background pair introduced here.
- [x] Gate: `npm run typecheck` passes.
- [x] Gate: `npm run test -- --run` passes.
- [x] Gate: `npm run build` passes.

*Owner check: clear localStorage and reload. The first screens (Graveyard with 150 fresh plots, an invitation line, an empty Séance table, an empty Ledger page) look intentional, with no blank boxes.*

---

## Task 8 — Cross-cutting sweep and sign-off
*Prerequisites: Tasks 1 to 7*
*Refs: CP-01 to CP-04, CP-60 to CP-68*

- [ ] Add `src/motion-rules.test.ts` (reads the CSS files under `src/`):
  - Every `@keyframes` block animates only `transform` and `opacity`.
  - No `animation` or `transition` declaration contains a literal `ms` or `s` duration; durations come from `var(--motion-*)` or `calc()` over them. If this finds an existing violation, fix the CSS (not the test) and name the file in the commit message.
  - Every class that applies an infinite animation has a matching `animation-play-state: paused` rule for the hidden state.
- [ ] Add a reduced-motion sweep (in the same file or `graveyard.test.ts`/`review.test.ts`): with `reducedMotion` true, render the Graveyard (with overdue ghosts and fog), the Séance mid-session after a Good grade, and the app header, then assert that none of these classes appears: `gr-fog__layer--pulse`, `gr-fog__bank--drift-*`, `gr-ghost--drift`, `gr-candle__flame--flare`, `gr-candle__flame--flicker`, `gr-flipcard__inner--flip`, `gr-flipcard__back--flip`, `gr-moon__lit--wax`, `gr-crow--hop`, `gr-jumpscare`.
- [ ] Add a backdrop-purity sweep: re-run the "identical markup" check across every backdrop group in the app (graveyard back and front, séance table props, page frame ornaments) for an empty store, a populated store and locale `ja`; assert `aria-hidden="true"`, no focusable element and no `role` inside each.
- [ ] Contrast sweep: confirm every colour pair introduced in Tasks 1 to 7 appears in `contrast.test.ts` and passes. Add `docs/accessibility-audit.md` rows for the new pairs and the parchment two-tone focus ring.
- [ ] Budget and perf: run `npm run build` and record the gzipped JavaScript and CSS sizes in the task notes; confirm JavaScript is well under 150 KB and `perf.test.ts` passes.
- [ ] Mapping freeze: confirm `mapping-freeze.test.ts` and all mapping tests are unmodified since Task 2 (`git diff` against the Task 2 commit for those files shows nothing).
- [ ] Steering consistency: confirm `structure.md` lists every new file, `spooky-design-system.md` has the master-table, catalogue and token rows added in Tasks 4 to 7, and section 6 still matches what shipped. Update `README.md` only if it describes the old visuals.
- [ ] Clean up: no temporary files, no stray screenshots, no `.only`/`.skip` in tests.
- [ ] Gate: `npm run typecheck` passes.
- [ ] Gate: `npm run test -- --run` passes (all tests, 411 existing plus every addition).
- [ ] Gate: `npm run build` passes.

*Owner check: the full walk-through at 1280 by 720 in English and Japanese: first run with starter crypts, a séance of five cards, the Graveyard with fog and ghosts after back-dating some cards, the Ledger, Settings with Reduced Motion on, Coward mode on.*
