# Costume Polish: Design

This document explains how to meet `requirements.md`. Numbers marked "initial" are starting values to tune against the criteria; the criteria and the tests, not these numbers, are the contract.

## 1. Baseline: what the app does today and why it looks unfinished

Read from `src/` at commit `9484bef`. 411 tests pass. The production build is 28.3 KB gzipped JavaScript against a 150 KB budget, so the budget is not a constraint on this work.

| Symptom | Cause in the code |
|---|---|
| Title is plain sans-serif, flush left | `app.tsx` renders a bare `<h1>`. `--font-display` exists in `index.css` and the Google Fonts link loads UnifrakturMaguntia, but no rule applies it to `h1`. `#grave-recall-root` has no width or padding. |
| Nav is five grey squares | The buttons use the generic `.gr-btn` class. The only nav rule is `flex-wrap` and an `aria-current` background. |
| Scene cut off at 720p | `layoutGraves` builds a 15 by 10 grid for 150 cards: `viewBox` 916 by 884, taller than wide. `.gr-scene` uses `height: auto; max-height: 80vh`, and the heading and nav add to the page height. |
| Flat brown scene | Sky and ground are two `<rect>`s in `--color-void` and `--color-grave-soil`. No horizon, trees, fence or gradient. |
| Moon small and dark, gate a thin outline | `MoonPhase` defaults to `r=28` at (64, 64). `CrowKeeper` draws three 8 px rectangles for the gate. |
| Fog is flat grey ovals | `FogLayer` draws four `<ellipse>`s in solid `--color-fog-base` and displaces them with `feDisplacementMap`. Hard edges remain. |
| Ghosts lost in fog | The ghost body is about 28 by 34 units against a 40 by 52 tombstone. `FogLayer` is the last child of the `<svg>`, so it paints over the ghosts. |
| Séance is a plain box | `.gr-flipcard` is a bordered rectangle. The back face is a block under the front, animated with `rotateX(90deg)` to 0 over a single element. There is no candle element; `candleSeal()` is audio only. |
| Ledger uses default green and red | `.gr-chart__fill--success` is `--color-success` (#27ae60) and `--danger` is `--color-danger` (#c0392b). |
| Empty state is a few lines of text | New starter cards are `srsState: 'new'`, due today, not overdue. The first-time user sees 150 identical cracked stones, no ghosts, 5 percent fog, a dark moon, and "No data yet". |

## 2. Decisions

### D1. Display font: reuse the already-allowed Google Fonts link

Options:

1. Self-host UnifrakturMaguntia (OFL). It works offline and adds one more file to vendor and license.
2. Apply the existing `--font-display` token, loaded from the existing `fonts.googleapis.com` link.
3. System-only blackletter stack. No common OS ships one.

Choice: 2. `bundle.test.ts` already allows these two hosts (AC-NFR-03.1), so no host is added and JavaScript size is unaffected. The fallback is the existing serif stack, which the design system already requires to be legible. The ornament (logo, divider rule) gives the header its look even in the fallback. `font-synthesis-weight: none` stops the browser from faking bold on a one-weight blackletter face. For `:lang(ja)` the `h1` gets a stack with a Japanese serif (`'Yu Mincho', 'Hiragino Mincho ProN', serif`) because UnifrakturMaguntia has no CJK glyphs.

### D2. The stage is a fixed-aspect box, not a stretching SVG

An SVG with `height: auto; max-height: X` and `preserveAspectRatio="meet"` letterboxes into transparent side bars, so the sky would not reach the edges. Instead the stage is a CSS box with `aspect-ratio: 2 / 1`, `width: min(100%, calc((100dvh - var(--gr-chrome)) * 2))`, centred, with a fixed `viewBox="0 0 1200 600"`. The SVG fills the box exactly. The stage gets a thin border and an inset vignette (a page frame ornament).

`--gr-chrome` is the sum of everything above the stage: header, frame padding, view heading and hint. Initial value `12.5rem` (200 px). At 720p the stage is 520 px tall and 1040 px wide, which fits the 1152 px content column. Taller viewports are limited by width instead. A `vh` fallback line precedes the `dvh` line.

Task 9 refinement: --gr-chrome is now 13.5rem (the measured chrome at 1280 by 720 is 212 px). In the Graveyard view the frame gets gr-frame--fit (one 100dvh flex column), and the stage width becomes max(45rem, min(100cqw, 200cqh)) over the leftover space, so extra lines such as the first-run invitation never push the page past the viewport. The calc() rule stays as the fallback.

Below 720 px the stage sits in a wrapper with `overflow-x: auto` and has `min-width: 45rem`. The wrapper is the only scroller.

### D3. Fixed `viewBox`, variable density

The old viewBox grew with the card count, which made the scene overflow and would make the backdrop depend on data. The new one is constant. Tombstones adapt to the card count inside it.

### D4. Fog: gradients for softness, one opacity owner

SVG filters on large animated groups are expensive. The design uses radial gradients (alpha to zero at the edge) for the three drifting banks, which cost almost nothing. The existing `feTurbulence` plus `feDisplacementMap` filter stays, extended with a small `feGaussianBlur`, but only on a static group of two wisps that never moves. Existing tests expect the filter to exist.

Opacity: `.gr-fog__layer` (the wrapper) keeps `opacity: var(--fog-opacity)` and the inline `--fog-opacity`. The banks inside draw at full strength, so the composite never exceeds the mapped value. This keeps `fogOpacity` the single owner of fog density. Existing tests read `--fog-opacity` from the first `.gr-fog__layer`, so the wrapper keeps that class.

### D5. Ghost glow: a gradient halo, not `drop-shadow`

CSS `filter: drop-shadow()` on SVG child elements is inconsistent across browsers and costs a filter pass per ghost; the scene can hold 200. A radial-gradient ellipse behind each ghost body, inside the ghost's own group, gives the same faint glow. It inherits the group opacity, so `1 - R` scales body and glow together and no second data channel appears.

### D6. Candle rule: one predicate

The brief says candles are "lit on correct answers, per existing data source". The existing sources are the `candle-seal` sound (Good or Easy) and the `candle-flicker` animation (active session). One predicate covers both: **flames are lit iff the most recent grade in this session is Good or Easy.** That matches the audio trigger exactly, needs no store change (a boolean and a counter in `SeanceSession`, like the existing `scare` counter), and is unlit at the start, which makes the first correct answer a visible event. Candle wax and holders are props (steering 6.1). The flame is data-mapped, so Task 5 adds its row to the master table before implementing.

### D7. Fresh plots

A new card currently renders as a cracked `--color-stone-crumbled` stone, which reads as "badly forgotten" when the truth is "not yet met". A fresh plot (soil mound, blank wooden marker) reads correctly and makes the first-run scene look intentional. It is a data mapping (`srsState === 'new'`), so Task 7 adds it to the master table first. The grave group keeps its class, role, label and inline custom properties, which keeps the existing mapping tests valid.

### D8. 3D flip with a keyframe on the inner box

The back face mounts at the same render that sets `data-flipped`, so a CSS transition has no "before" state. A keyframe animation on the inner box works from mount. Under full motion the inner box gets `gr-flipcard__inner--flip` (`rotateY(0)` to `rotateY(180deg)`), and the back face keeps the existing marker class `gr-flipcard__back--flip` so existing tests stay valid. Under reduced motion neither class is present and the static `[data-flipped="true"]` rule shows the back at once.

## 3. Scene geometry

`viewBox="0 0 1200 600"`. Initial zones, in scene units:

| Zone | y range | Contents |
|---|---|---|
| Sky | 0 to 260 | Gradient, moon at about (230, 130) with `r=64`, halo radius about 160 |
| Horizon | 200 to 300 | Far hill, near hill, bare trees at the edges |
| Fence line | 292 to 330 | Iron fence across the width, gate at the right (about x=1040) with the crow |
| Grave field | 318 to 548 | Rows of graves, back to front |
| Clear strip | 564 to 600 | Foreground ground silhouette; no graves (CP-21) |

Paint order, back to front:

1. Sky gradient (static)
2. Moon halo (static), then `MoonPhase` (data)
3. Far hills, near hills, trees (static)
4. Gate and `CrowKeeper` (static gate, data crow)
5. Fence, ground fill (static)
6. Graves of rows 0 to R-3
7. `FogLayer`
8. Graves of the last two rows (the last row when R < 4)
9. Foreground strip (static)
10. Ghosts

`Backdrop` is split into two static components, `BackdropBack` (items 1 to 5, minus the moon and crow) and `BackdropFront` (item 9), so the scene can interleave them with data layers.

## 4. Layout function

`layoutYard(count)` in `visuals.ts` replaces `layoutGraves`. It is pure and depends only on `count`.

```ts
interface YardPosition {
  readonly x: number;      // grave centre, scene units
  readonly y: number;      // grave baseline (bottom edge), scene units
  readonly scale: number;  // row scale times FRONT_SCALE
  readonly tilt: number;   // degrees, |tilt| <= 3
  readonly shade: number;  // 0 to 0.30, overlay opacity
  readonly row: number;
  readonly col: number;
}
interface Yard {
  readonly positions: readonly YardPosition[];
  readonly columns: number;
  readonly rows: number;
}
```

Rules (initial values):

- `columns = clamp(ceil(sqrt(count * 3.5)), 1, 23)`; `rows = ceil(count / columns)`. For 150 cards: 23 columns, 7 rows. For 200: 23 columns, 9 rows.
- Index `i` has `row = floor(i / columns)`, `col = i % columns`. Row 0 is the back. Arrow Up and Down keep moving by `columns`, so the keyboard grid is unchanged.
- `depth = rows === 1 ? 1 : row / (rows - 1)`. `rowScale = lerp(0.7, 1, depth)`. `FRONT_SCALE = 1`, so the front stone is 40 by 52 units and the back stone 28 by 36.4. At the 720p stage (1040 px for 1200 units) the smallest stone is 24.3 px wide, which meets CP-23.
- Row baselines: `y = lerp(BACK_Y, FRONT_Y, (0.7 * depth + 0.15 * depth ** 2) / 0.85)` with `BACK_Y = 330`, `FRONT_Y = 548`. The curve is the integral of the row scale, so the gap between rows is proportional to stone height and every row overlaps the one behind it by the same fraction.
- Column pitch for a row: `pitch = (1040 / (columns + 0.5)) * rowScale`. The row is centred on x=600, and odd rows shift by `pitch / 2`. Back rows are therefore narrower than front rows, a trapezoid that reads as perspective.
- `tilt = ((row * 7 + col * 13) % 7 - 3)` degrees. `shade = 0.30 * (1 - depth)`.
- For `count > 200`: `columns` may grow to 40 and the scale floor drops to 0.45. All graves stay inside the `viewBox`. This is a best-effort degradation and is outside CP-19 to CP-23.

`FRONT_Y - BACK_Y` is 218 units. With 150 cards (7 rows) the six rows behind the front row have stone heights summing to about 264 units, so each overlaps the next by about 17 percent, inside the 30 percent bound of CP-22. With 200 cards (9 rows) the eight rows sum to about 352 units and the overlap is about 38 percent, inside the 45 percent bound. Tune `BACK_Y` and the column divisor against the property tests in Task 2.

Depth shade is a `--color-void` path over the stone, with opacity from the CSS variable `--depth-shade`. It is separate from `--tombstone-fill` (CP-24), and at most 0.30 so the stability gradient stays readable within a row.

## 5. Components and files

New or changed files. `structure.md` is updated in the task that adds them.

| File | Change | Task |
|---|---|---|
| `src/components/frame/SiteHeader.tsx`, `TombstoneLogo.tsx`, `frame.css` | New. Header with logo, `<h1>`, nav tabs. `app.tsx` renders it. | 1 |
| `src/index.css`, `src/design/tokens.ts` | Add backdrop palette tokens, `--gr-chrome`, body sky wash. Remove the `#grave-recall-root nav` rules. | 1 |
| `src/components/graveyard/visuals.ts` | Add `layoutYard`; remove `layoutGraves` and the cell constants. Mapping functions untouched. | 2 |
| `src/components/graveyard/Tombstone.tsx` | Take `scale`, `tilt`, `shade`; bottom-centre anchor. | 2 |
| `src/components/graveyard/GraveyardScene.tsx` | Stage wrapper, fixed `viewBox`, paint order, empty-state props. | 2, 3, 4, 7 |
| `src/components/graveyard/Backdrop.tsx` | New. `BackdropBack`, `BackdropFront`, constants only. | 3 |
| `CrowKeeper.tsx`, `MoonPhase.tsx` | Gate redraw; moon props. `MoonPhase` defaults stay (a test pins them). | 3 |
| `FogLayer.tsx`, `Ghost.tsx`, `graveyard.css` | Banks, ghost redraw. | 4 |
| `src/components/review/Candle.tsx`, `FlipCard.tsx`, `SeanceSession.tsx`, `review.css` | Table, candles, 3D flip. | 5 |
| `src/components/stats/BarChart.tsx`, `stats.css`, `LedgerView.tsx` | Chart palette, hatch pattern, ledger page. | 6 |
| `src/i18n/types.ts`, `en.ts`, `ja.ts` | New keys. | 7 |

## 6. Tokens

Palette tokens from steering 6.2 are added in Task 1. Later tasks add, with the steering table updated first:

| Token | Initial hex | Task | Purpose and check |
|---|---|---|---|
| `--color-parchment` | `#e9dcc0` | 5 | Card face. `--color-text-inverse` on it is about 14:1. |
| `--color-ink-secondary` | `#5a4a36` | 5 | Secondary text on parchment, about 6.3:1. |
| `--color-chart-moss` | `#6a9a5c` | 6 | Correct segments. At least 3:1 on `--color-surface-panel`. |
| `--color-chart-blood` | `#b8322a` | 6 | Incorrect segments. About 3.1:1 on panel; the hatch is the non-colour cue. If the test fails, lighten it. |
| `--color-chart-bone` | `#b9b2a2` | 6 | Forecast bars. |

`--color-focus-ring` (`#7eb8f7`) is only 1.5:1 against parchment, so controls on the card use a two-tone ring: a 2 px `--color-void` inner ring plus the 2 px focus-ring outer ring. The inner ring has at least 3:1 against parchment and the outer ring has at least 3:1 against the table.

## 7. Motion plan

All new durations come from `--motion-*` or integer multiples of them. All animate `transform` and `opacity` only. "Hidden" pauses use the existing `useDocumentHidden` hook and a `--paused` class.

| Animation | Element | Duration | Data source | Reduced motion | Task |
|---|---|---|---|---|---|
| `fog-drift-a`, `fog-drift-b`, `fog-drift-c` | Fog banks | 6, 8 and 7 times `--motion-ambient`, `alternate`, opposite directions | Ambient overdue load (existing `fog-pulse` row) | Not applied | 4 |
| `ghost-sway` | Ghost (extends `ghost-drift`) | `--ghost-drift-speed` | Days past due (existing) | Not applied | 4 |
| `candle-flare` | Candle flame | `--motion-slow` | Good or Easy grade (new master-table row) | Not applied; flame shows solid | 5 |
| `candle-flicker` | Candle flame, while lit | `calc(var(--motion-fast) * 2)`, `steps(3)` | Existing catalogue row, now only while lit | Not applied | 5 |
| `card-flip` (3D) | `.gr-flipcard__inner` | `--motion-normal` | User flips card (existing) | Not applied; instant | 5 |

Static, no animation: the backdrop, fresh plots, hatch patterns, ledger ruling and the nav.

## 8. Séance structure

```
section.gr-seance
  header (title, remaining)
  div.gr-table                       ↁEtable surface (CSS gradient)
    Candle (left)  aria-hidden, data-lit
    FlipCard                          ↁEperspective container
      div.gr-flipcard__inner
        div.gr-flipcard__front  (button while face-down)
        div.gr-flipcard__back   (mounted after the flip, pre-rotated 180deg)
    Candle (right) aria-hidden, data-lit
  div.gr-seance__actions (GradeButtons)
```

Below 40 rem the candles move above the card, side by side. `Candle` takes `lit: boolean` and `flare: number` (a key that restarts the flare, as `scare` does for the jumpscare). `handleGrade` sets `lit = grade >= 2` and increments `flare` when `grade >= 2`.

Both faces share one grid cell so the container is as tall as the taller face; the container has a `min-height` so the flip does not change the page height for ordinary content. The front word is not repeated on the back face as a text node, because existing tests use `getByText` on card text. If a recap of the word is wanted on the back, it is drawn with a CSS pseudo-element from a `data-front` attribute.

## 9. Empty states

| View | Condition | Presentation |
|---|---|---|
| Graveyard | No cards in scope | Full backdrop and empty yard; message `graveyard.noCards`; button to Crypts |
| Graveyard | Cards exist, all `new`, review log empty | Fresh plots; invitation line; button to Séance. Fog 5 percent and dark moon follow from the data. |
| Séance | No due cards | Table, unlit candles, blank parchment card with the existing two messages |
| Ledger | No reviews in the last 30 days | Blank ruled ledger page with `stats.noData` and an invitation line; forecast chart unchanged |

`GraveyardScene` gains optional props `onBeginSeance` and `onOpenCrypts`; `app.tsx` passes `show('seance')` and `show('crypts')`. Existing tests render the scene without them, so the buttons render only when the matching prop is present.

Proposed i18n keys: `graveyard.inviteEmpty`, `graveyard.inviteNew`, `graveyard.openCrypts`, `graveyard.beginSeance`, `seance.tableEmpty`, `stats.ledgerEmpty`, `stats.ledgerEmptyHint`, `a11y.freshPlot` if the grave label needs a variant. Final names are set in Task 7.

## 10. Steering changes

Done before this spec was written: `spooky-design-system.md` section 6 "Decorative backdrop", with the closed element list (6.1), palette (6.2), data-free rules (6.3) and perspective-cue limits (6.4). Two intro sentences now point to it.

Section 6.4 goes slightly beyond the element list asked for: it permits depth scale, shade, offset and tilt on data-mapped tombstones, because the brief asks for them, and caps them so they cannot read as state.

Done inside tasks, before the code that needs them: master-table rows for the séance candle flames (Task 5) and fresh plots (Task 7); token rows for parchment, ink and chart colours (Tasks 5 and 6); animation-catalogue rows for the new animations (Tasks 4 and 5).

## 11. Test strategy

Layout cannot be measured in jsdom, so fit is checked in three ways: pure-function properties on `layoutYard`, structural checks on the rendered SVG, and text checks on the CSS files (the approach `contrast.test.ts` already uses for `index.css` and `deck.css`).

| Check | Where |
|---|---|
| Mapping freeze: golden outputs of `tombstoneFill`, crack, moss, `ghostOpacity`, `ghostDriftSeconds`, `moonArcPath`, `fogOpacity` | New `mapping-freeze.test.ts`, recorded in Task 2 before any visual change |
| `layoutYard` properties: in bounds, no row overlap, scale and tilt and shade limits, determinism, bottom clearance, 24 px minimum at nominal width, overlap bounds, for counts 0 to 250 | `graveyard.test.ts` (replaces the one layout test) |
| `viewBox` equal for 0, 1, 150, 200 cards | `graveyard.test.ts` |
| Stage CSS: `aspect-ratio`, `dvh` in `max`/`min` width, no `80vh`, no `min-height` over 100 | CSS text test |
| Backdrop markup identical across store states and locales; `aria-hidden`; no focusable, `role` or text; no `Math.random`, `Date` or store import in `Backdrop.tsx`; no reserved colours | `graveyard.test.ts` |
| Fog: three banks, opposite drift classes under full motion, none under reduced motion, paused when hidden, wrapper opacity equals `fogOpacity`, fog before the last two rows in DOM order | `graveyard.test.ts` |
| Ghost: height and width vs tombstone constants, no `filter` attribute on ghosts, drawn after fog | `graveyard.test.ts` |
| Candle lit predicate for each grade; flare and flicker classes absent under reduced motion; `data-lit` still updates | `review.test.ts` |
| Flip CSS text: `perspective`, `backface-visibility: hidden`, `rotateY(180deg)`; classes under full and reduced motion | `review.test.ts` |
| Contrast pairs for every new colour (nav, parchment, ink, chart fills, moon wedge, focus rings, focus ring under maximum fog) | `contrast.test.ts` |
| Chart fills use the chart tokens; hatch `<pattern>` present when incorrect segments exist | `stats.test.ts` |
| Fresh plot for `new` cards; custom properties still set; invitation appears and disappears with the review log | `graveyard.test.ts` |
| Keyframes animate only `transform` and `opacity`; no literal `ms` or `s` durations outside tokens; every infinite animation has a hidden-pause rule | New `motion-rules.test.ts` (Task 8) |
| Every new animation class is absent under reduced motion | `motion-rules.test.ts` (Task 8) |
| axe for all five views, empty and populated, en and ja | `a11y.test.ts` |

The 1280 by 720 fit also needs one human look. Per `tech.md` the dev server is not started by the agent, so each task ends with an owner check described as a plain line, outside the checkboxes.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Rows of 200 graves overlap and hide moss at the stone's base | Overlap bounds in CP-22 are tested. Tune `BACK_Y` and the column divisor. The detail panel stays the precise view. |
| Fog hides state on back rows at 60 percent | Fog is drawn behind the last two rows, so the nearest graves are always clear (CP-34). Back rows are meant to be hazy; the Ledger and detail panel carry exact numbers. |
| Drifting banks cost paint time | Banks are gradient-only, no filter; the only filter is on a static group. If a browser shows jank, drop the displacement filter and update the two filter tests deliberately. |
| `layoutYard` replaces `layoutGraves`, which a test imports | Task 2 replaces that one test with the new properties and says so. |
| Fog's `role="img"` label sits between two groups of graves in the DOM | Acceptable. Reading order of graves is unchanged; the fog label is announced once. |
| Parchment breaks the focus-ring contrast guarantee | Two-tone ring (section 6) and explicit contrast pairs. |
| Japanese title renders in a fallback face with a different weight | `:lang(ja)` stack; owner check in Task 1. |
