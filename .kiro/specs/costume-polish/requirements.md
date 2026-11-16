# Costume Polish: Requirements

Grave Recall is entered in the Kiroween "Costume Contest" category, which is judged mainly on how polished and haunting the UI looks. The app works. This spec finishes the visual layer without changing behaviour, data mappings or accessibility guarantees.

Steering that governs this spec: `product.md`, `tech.md`, `structure.md`, and `spooky-design-system.md` (in particular section 6, "Decorative backdrop", added for this spec). The earlier spec is `.kiro/specs/grave-recall/`. Identifiers `AC-xx` refer to its requirements.

## Terms

- **720p viewport**: a browser viewport of 1280 by 720 CSS pixels.
- **Stage**: the framed box that holds the graveyard SVG.
- **Backdrop**: the static, data-free elements listed in steering section 6.1.
- **Fresh plot**: the drawing of a grave whose card has never been reviewed (a soil mound with a blank wooden marker).
- **Motion allowed**: `reducedMotion.value` is false. **Reduced motion**: it is true (OS setting or the in-app toggle).
- **Hidden**: `document.visibilityState === 'hidden'`.

## EARS key

- Ubiquitous: `The <system> shall <action>.`
- Event-driven: `When <trigger>, the <system> shall <action>.`
- State-driven: `While <state>, the <system> shall <action>.`
- Optional feature: `Where <feature is included>, the <system> shall <action>.`
- Unwanted behaviour: `If <condition>, then the <system> shall <action>.`

---

## A. Backdrop rules (steering section 6)

**CP-01** The backdrop elements of the graveyard, the séance and the page frame shall carry `aria-hidden="true"`, no `role`, no text, no `tabindex`, and `pointer-events: none`.

**CP-02** The rendered backdrop markup shall be identical for every combination of crypts, cards, review log, preferences and locale.

**CP-03** The backdrop modules shall contain no `Math.random`, no `Date`, and no read of any store signal. Counts of trees, pickets and candles shall be constants.

**CP-04** The backdrop shall take its colours only from the section 6.2 palette tokens and shall not use any data-reserved colour listed there. Each palette token shall be declared in `src/index.css` and mirrored in `src/design/tokens.ts` with the same value.

## B. Page frame

**CP-05** The system shall place the header, the status line and the active view inside one centred container with `max-width` of at most 75rem and horizontal padding of at least 1rem, so that no heading or text touches the viewport edge at any width of 320 px or more.

**CP-06** The system shall render the `<h1>` in `--font-display` at `--text-display` (reduced to no less than 1.75rem below 640 px), with `letter-spacing: 0.05em` and without synthetic bold.

**CP-07** The header shall show a tombstone logo, marked `aria-hidden`, that uses the silhouette of `public/grave.svg` (arched stone with a cross incision).

**CP-08** If the display font cannot be loaded, then the title shall remain legible through the existing fallback stack. The change shall add no host beyond `fonts.googleapis.com` and `fonts.gstatic.com`.

**CP-09** While the locale is `ja`, the title shall use a font stack that contains a Japanese-capable serif face, so that no glyph renders as a missing-character box.

**CP-10** The navigation shall keep its five items, their order, their accessible names, the `aria-label` on the `<nav>`, and `aria-current="page"` on the active item, and shall present them as stone-slab tabs.

**CP-11** The active tab shall differ from inactive tabs in shape (a raised slab without a bottom border) and in colour, so that it is identifiable without colour.

**CP-12** When a tab receives keyboard focus, the system shall draw a 2 px `--color-focus-ring` outline with at least 3:1 contrast against the tab and header backgrounds, and shall not clip it.

**CP-13** While the viewport is narrower than the combined tab width, the tabs shall wrap onto further lines, each at least 2.5rem tall, and the page shall not scroll horizontally at 320 px.

**CP-14** The tab order and the activation behaviour of the header shall not change. The logo and ornaments shall not be focusable.

**CP-15** When the séance-complete status message appears, the system shall show it without increasing the height of the page, so that no page scroll appears at 720p.

## C. Graveyard scene

**CP-16** While the active scope has 200 cards or fewer, the Graveyard view at 720p (header, view heading, hint line and stage) shall fit in the viewport height without page scroll. The stage height shall derive from the viewport height minus a chrome offset, and no ancestor shall set a `min-height` larger than the viewport.

**CP-17** The graveyard SVG shall use one fixed `viewBox` whose size does not depend on the number of cards.

**CP-18** While the viewport is narrower than 720 px, the stage shall scroll horizontally inside its own container, and the page shall not scroll horizontally.

**CP-19** The system shall lay graves out in rows with depth. For 200 cards or fewer, row scale shall run from 0.7 at the back row to 1.0 at the front row, and each grave's position, scale, tilt and shade shall be computed from its index and the card count only.

**CP-20** The depth cues shall obey the limits of steering section 6.4: tilt at most 3 degrees, depth shade at most 0.30 opacity, odd-row offset at most half a column pitch.

**CP-21** In every row, no two graves shall overlap horizontally. Every grave shall lie inside the `viewBox`. The bottom 6 percent of the stage shall hold no grave, so the fixed caption bar never covers one.

**CP-22** For 150 cards or fewer, the vertical overlap between a grave and the row behind it shall be at most 30 percent of the rear grave's height. For 200 cards or fewer, at most 45 percent.

**CP-23** At 720p and 200 cards or fewer, every grave shall be at least 24 CSS pixels wide.

**CP-24** The mappings in `visuals.ts` (tombstone fill, crack opacity, moss opacity, ghost opacity, ghost drift seconds, moon arc path) and `fogOpacity` shall keep their present formulas and results. Each grave shall keep its inline custom properties `--tombstone-fill`, `--tombstone-crack-opacity` and `--tombstone-moss-opacity`. The depth shade shall be a separate overlay and shall not change `--tombstone-fill`.

**CP-25** Each grave shall keep `role="button"`, the roving `tabindex`, its `aria-label`, `data-card-id`, Enter and Space to open the detail panel, and Arrow, Home and End navigation across the same logical grid (`index ± columns`). DOM order shall equal card order.

**CP-26** When a grave has keyboard focus, its focus indicator shall have at least 3:1 contrast against the backdrop beneath it, including when drawn under the maximum fog opacity.

**CP-27** The scene shall show a night-sky gradient, two far-hill silhouettes, at least three bare-tree silhouettes, a foreground ground strip, an iron fence and a gate.

**CP-28** The moon shall have a radius of at least 56 scene units and a halo of constant opacity. The lit wedge shall still come from `moonArcPath(moonPhasePct, …)`. The accessible name and `data-progress` shall not change. The lit wedge colour shall have at least 3:1 contrast against the unlit disc colour.

**CP-29** The gate shall be drawn with two posts, a top rail and vertical bars, and shall keep the class `gr-gate`. While the streak is 1 day or more, the crow shall perch on the gate; its eye-glow rule (streak of 3 or more) shall not change.

## D. Fog

**CP-30** The fog shall consist of at least three banks. Each bank shall be filled with a gradient whose alpha reaches zero at the bank's edge, so no bank has a hard edge.

**CP-31** While motion is allowed and the tab is visible, the banks shall drift horizontally, at least one in each direction, with cycle durations that are integer multiples (5 or more) of `--motion-ambient`.

**CP-32** While reduced motion is on, the fog shall be static at its computed opacity. While hidden, the fog animations shall be paused.

**CP-33** The fog shall be one group whose opacity equals `fogOpacity` (overdue count divided by total cards, clamped to 0.05 to 0.60; 0.05 with no cards). No bank shall add opacity on top of that value.

**CP-34** The fog shall be drawn in front of the back and middle rows of graves and behind the last two rows (the last row when there are fewer than four rows) and behind all ghosts.

## E. Ghosts

**CP-35** A ghost shall be at least as tall as the tombstone in its row and at least 0.9 times as wide, at that row's scale.

**CP-36** A ghost shall have a faint glow in `--color-ghost-glow`, drawn inside the ghost's own group so that the group opacity (`ghostOpacity`, equal to `clamp(1 - R, 0.15, 0.95)`) scales body and glow together. The glow shall not use a per-ghost SVG filter.

**CP-37** While motion is allowed and the tab is visible, each ghost shall sway gently with a period of `--ghost-drift-speed`. While reduced motion is on, the ghost shall be static. While hidden, the sway shall be paused.

**CP-38** Ghosts shall keep `role="img"`, their `aria-label`, `data-ghost-for`, `pointer-events: none`, one ghost per overdue card, and shall be drawn above the fog.

## F. Séance

**CP-39** The séance shall show a table surface, a parchment card centred on it, and a candle on each side. The candles shall be `aria-hidden`.

**CP-40** The candle flames shall be lit if and only if the most recent grade in the current session is Good or Easy. They shall be unlit at session start and after an Again or Hard grade.

**CP-41** When a Good or Easy grade is given, the lit flames shall flare once over `--motion-slow`. While the flames are lit and motion is allowed, they shall flicker (`candle-flicker`, 0.3 s, `steps(3)`). While reduced motion is on, the flames shall show a solid glow with no flare and no flicker. While hidden, the flicker shall be paused.

**CP-42** Coward mode and caption settings shall not change the candles. The `candleSeal()` sound and its caption shall play as they do now.

**CP-43** The parchment card shall have a front face and a back face inside a perspective container. When the card is flipped, it shall rotate 180 degrees about the vertical axis over `--motion-normal` with easing `cubic-bezier(0.4, 0, 0.2, 1)`, and neither face shall appear mirrored.

**CP-44** While reduced motion is on, the card shall show the back face at once, and the class `gr-flipcard__back--flip` shall be absent.

**CP-45** Flipping and grading shall keep their present keyboard behaviour: Space flips from anywhere in the séance, Enter or a tap on the card flips it, keys 1 to 4 grade, focus moves to the first grade button after the flip, and the back face content exists in the DOM only after the flip.

**CP-46** Text on the parchment shall have at least 4.5:1 contrast for both primary and secondary ink. Focus indicators on controls over the parchment shall have at least 3:1 contrast against both the parchment and the table.

**CP-47** At 720p, with a card whose front fits one line, back fits three lines and example fits two lines, the séance header, table, card and grade buttons shall fit without page scroll.

**CP-48** The grade buttons shall keep their labels, keys, order and per-grade border colours.

## G. Ledger

**CP-49** The Ledger charts shall fill correct segments with `--color-chart-moss`, incorrect segments with `--color-chart-blood`, and forecast bars with `--color-chart-bone`. No chart fill shall use `--color-success` or `--color-danger`.

**CP-50** Each chart fill shall have at least 3:1 contrast against `--color-surface-panel`. Incorrect segments shall also carry a diagonal hatch, repeated in the legend swatch, so that correct and incorrect differ without colour.

**CP-51** The Ledger shall be presented as a ledger page: ruled lines, display-face headings, monospace figures. The number of ruled lines shall be a constant.

**CP-52** `retentionSummary`, `reviewsPerDay`, `forecastData` and the chart structure (bar `aria-label`s, roles, class names `gr-chart__bar` and `gr-chart__fill--*`) shall not change.

## H. Empty states

**CP-53** While the active scope has no cards, the Graveyard shall draw the full backdrop, the moon, the gate and an empty yard, keep the message `graveyard.noCards`, and offer a button that opens the Crypts view.

**CP-54** While a card's `srs.srsState` is `new`, its grave shall be drawn as a fresh plot, without cracks or moss. The grave shall keep the role, label, tab stop, `data-card-id` and inline custom properties of every other grave. Its mapping shall be recorded in the steering master table before it is implemented.

**CP-55** While the review log is empty and the scope has cards, the Graveyard shall show an invitation line and a button that opens the Séance view. When the first review is logged, the line and button shall no longer render.

**CP-56** While the séance has no due cards, it shall show the table, unlit candles and a blank parchment card carrying the existing messages `seance.noCards` and `seance.noCardsDesc`, with no flip control and no grade buttons.

**CP-57** While the review log has no entries in the last 30 days, the Ledger shall show a blank ruled ledger page that contains the existing text `stats.noData` and an invitation line. The forecast chart shall still render.

**CP-58** Every new user-visible string shall exist in `en.ts` and `ja.ts` under a key in the `TranslationKey` union.

**CP-59** The empty-state buttons shall be reachable by keyboard in reading order and shall have accessible names. Empty-state ornaments shall add no tab stops.

## I. Cross-cutting

**CP-60** While reduced motion is on, no new animation or transition shall run. State changes shall be instant or a cross-fade of 150 ms or less.

**CP-61** Coward mode shall continue to replace `ghostScream()` with `softChime()` and to suppress the jumpscare. No new effect shall depend on it.

**CP-62** New animations shall animate only `transform` and `opacity`, shall take durations from `--motion-*` tokens (or integer multiples of them), and, when infinite, shall pause while hidden.

**CP-63** Every new foreground and background pair, and every new UI boundary, shall be listed in `src/design/contrast.test.ts` and meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI components). The existing pairs shall still pass.

**CP-64** axe-core shall report zero violations for each of the five views, in English and Japanese, both empty and populated.

**CP-65** The initial JavaScript shall stay at or below 150 KB gzipped (`bundle.test.ts`). The work shall add no runtime dependency, no raster image, no audio file and no host.

**CP-66** The 200-card graveyard tests in `perf.test.ts` shall keep passing. No per-card or per-ghost SVG filter shall be added.

**CP-67** All 411 existing tests shall keep passing. An existing test shall be edited only where the DOM or API change is intended and named in the task, and the mapping tests shall not be edited.

**CP-68** At the end of every task, `npm run typecheck`, `npm run test -- --run` and `npm run build` shall pass.

---

## Non-goals

- No redesign of the Crypts and Settings views beyond what the page frame gives them.
- No new sounds, captions, scheduler changes or data-model changes.
- No dedicated mobile layout. Below 720 px the stage scrolls inside itself (CP-18).
- No change to the default view on first launch.
- No self-hosted font files. The fonts already allowed in AC-NFR-03.1 are reused.

## Traceability

| Area | Criteria | Task |
|---|---|---|
| Page frame | CP-04 (tokens), CP-05 to CP-15 | 1 |
| Scene stage and depth | CP-16 to CP-26 | 2 |
| Backdrop, moon, gate | CP-01 to CP-03, CP-04 (use), CP-27 to CP-29 | 3 |
| Fog and ghosts | CP-30 to CP-38 | 4 |
| Séance | CP-39 to CP-48 | 5 |
| Ledger | CP-49 to CP-52 | 6 |
| Empty states | CP-53 to CP-59 | 7 |
| Cross-cutting | CP-60 to CP-68 | every task; swept in 8 |
