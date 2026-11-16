---
inclusion: always
---

# Grave Recall — Spooky Design System

Every token, motion rule, and sound rule in this file exists to serve a functional purpose. Decoration for its own sake is rejected. If a new visual or audio effect is added, its data mapping must be documented here before it is implemented. The only exception is the closed list of static, data-free elements in section 6 (Decorative backdrop).

---

## 1. Color Tokens

All tokens are CSS custom properties declared on `:root`. TypeScript constants in `src/design/tokens.ts` mirror every value so they can be used in SVG `fill`/`stroke` attributes computed at runtime.

### 1.1 Base Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-void` | `#0a0a0f` | Page background, deepest shadow |
| `--color-grave-soil` | `#1a1410` | Graveyard ground, card back |
| `--color-stone-dark` | `#2e2a26` | Tombstone fill (high-stability card) |
| `--color-stone-mid` | `#4a4540` | Tombstone fill (medium-stability card) |
| `--color-stone-worn` | `#6b635a` | Tombstone fill (low-stability card) |
| `--color-stone-crumbled` | `#8c7f72` | Tombstone fill (near-zero stability / new card) |
| `--color-moss` | `#2d4a2e` | Moss overlay on old tombstones |
| `--color-fog-base` | `#c8d4e0` | Fog SVG fill (base, composited at low opacity) |
| `--color-ghost-body` | `#dce8f5` | Ghost silhouette fill |
| `--color-ghost-glow` | `#a0c4ff` | Ghost outer glow / filter |
| `--color-candle-flame` | `#ffb347` | Candle flame, successful recall flash |
| `--color-candle-wax` | `#f5e6c8` | Candle body |
| `--color-moon-full` | `#f0e8d0` | Moon at 100% daily progress |
| `--color-moon-new` | `#1e1e2a` | Moon at 0% daily progress |
| `--color-crow` | `#1a1a1f` | Crow silhouette |
| `--color-crow-eye` | `#ff4444` | Crow eye (streak ≥ 3 days) |
| `--color-danger` | `#c0392b` | Error states, Again grade button |
| `--color-warning` | `#e67e22` | Hard grade button |
| `--color-success` | `#27ae60` | Good / Easy grade buttons |
| `--color-text-primary` | `#e8e0d4` | Main readable text (≥ 4.5:1 on `--color-void`) |
| `--color-text-secondary` | `#9e9488` | Labels, hints (≥ 3:1 on `--color-void`) |
| `--color-text-inverse` | `#0a0a0f` | Text on light surfaces |
| `--color-surface-card` | `#1e1a16` | Card face background |
| `--color-parchment` | `#e9dcc0` | Seance card face (`--color-text-inverse` on it is at least 4.5:1) |
| `--color-ink-secondary` | `#5a4a36` | Secondary text on the parchment card (at least 4.5:1 on `--color-parchment`) |
| `--color-chart-moss` | `#6a9a5c` | Ledger chart fill for correct segments (at least 3:1 on `--color-surface-panel`) |
| `--color-chart-blood` | `#b8322a` | Ledger chart fill for incorrect segments, always drawn with a diagonal hatch so it differs from correct without colour (at least 3:1 on `--color-surface-panel`) |
| `--color-chart-bone` | `#b9b2a2` | Ledger forecast bars (at least 3:1 on `--color-surface-panel`) |
| `--color-surface-panel` | `#151210` | Side panel / settings background |
| `--color-border` | `#3a342e` | Subtle borders |
| `--color-focus-ring` | `#7eb8f7` | Keyboard focus outline (≥ 3:1 on all backgrounds) |

### 1.2 Semantic Tokens (data-mapped)

These tokens are set at runtime via inline CSS custom properties on the relevant SVG element; the base palette tokens above are their resolved fallbacks.

| Semantic Token | Resolved From | Data Source |
|---|---|---|
| `--tombstone-fill` | interpolated between `--color-stone-dark` and `--color-stone-crumbled` | `card.stability` (0–100 scale) |
| `--tombstone-crack-opacity` | `0` → `1` | inverse of `card.stability` |
| `--tombstone-moss-opacity` | `0` → `0.6` | `card.stability` (high stability = more moss, old but memorised) |
| `--ghost-opacity` | `0.15` → `0.95` | `1 - card.retrievability` (0 = perfectly recalled, 1 = completely forgotten) |
| `--ghost-drift-speed` | `12s` → `3s` animation-duration | how overdue the card is (days past due) |
| `--fog-opacity` | `0.05` → `0.60` | `overdueCount / totalCards` ratio |
| `--moon-phase-pct` | `0%` → `100%` | `reviewsDoneToday / dailyGoal` |
| `--candle-flicker-rate` | `2Hz` → `8Hz` | constant during active session (ornamental within session) |

### 1.3 Contrast Guarantees

All foreground/background combinations must meet WCAG AA (4.5:1 for normal text, 3:1 for large text and UI components):

| Pair | Minimum ratio |
|---|---|
| `--color-text-primary` on `--color-void` | 4.5:1 |
| `--color-text-secondary` on `--color-void` | 3:1 |
| `--color-text-primary` on `--color-surface-card` | 4.5:1 |
| `--color-focus-ring` on `--color-void` | 3:1 |
| Grade button labels on their button backgrounds | 4.5:1 |

---

## 2. Typography

### 2.1 Font Stack

```css
--font-display: 'UnifrakturMaguntia', 'MedievalSharp', serif;  /* headings, crypt names */
--font-body:    'IM Fell English', 'Palatino Linotype', Georgia, serif;  /* card content */
--font-mono:    'Courier Prime', 'Courier New', monospace;  /* stats, numbers */
--font-ui:      system-ui, -apple-system, sans-serif;  /* buttons, labels, captions */
```

Both display and body fonts are loaded from Google Fonts with `font-display: swap`. The fallback chain must be legible without the custom fonts.

### 2.2 Type Scale

| Token | Size | Line-height | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | `2.5rem` | 1.1 | 700 | View headings ("The Graveyard", "Séance") |
| `--text-crypt-name` | `1.75rem` | 1.2 | 700 | Crypt/deck name |
| `--text-card-front` | `2rem` | 1.3 | 400 | Card front (the word) |
| `--text-card-back` | `1.25rem` | 1.6 | 400 | Card back (definition) |
| `--text-card-example` | `1rem` | 1.6 | 400 | Example sentence (italic) |
| `--text-label` | `0.875rem` | 1.4 | 500 | Form labels, button text |
| `--text-caption` | `0.75rem` | 1.4 | 400 | Sound captions, footnotes |
| `--text-stat` | `1.5rem` | 1.2 | 700 | Stats numbers (mono) |

### 2.3 Rules

- Minimum body font size: `1rem` (16px equivalent). Never go below `0.75rem` for any visible text.
- Card front and back use `--font-body` for immersion. All interactive controls use `--font-ui`.
- Display font (`--font-display`) is used for decorative headings only; never for body copy or interactive labels.
- Letter-spacing on `--font-display`: `+0.05em` to improve legibility of fraktur glyphs at small sizes.

---

## 3. Motion Rules

All motion is opt-in at the browser level. The app reads `prefers-reduced-motion` once at startup and subscribes to changes.

### 3.1 Motion Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| **Full motion** | `prefers-reduced-motion: no-preference` and reduced-motion signal = false | All animations run |
| **Reduced motion** | `prefers-reduced-motion: reduce` OR user toggle in Settings | Drifting, floating, jumpscares disabled; state-change transitions retained as instant cross-fades (≤ 150ms) |

The reduced-motion signal is stored as a Preact signal in `store/prefs.ts`. Components read it; they never read `matchMedia` directly.

### 3.2 Animation Catalogue

| Animation | Element | Duration | Easing | Data meaning | Reduced-motion substitute |
|---|---|---|---|---|---|
| `ghost-drift` | `<Ghost>` | `--ghost-drift-speed` (3–12s) | `ease-in-out`, infinite | Card overdue-ness | Hidden entirely (ghost still shown as static icon) |
| `fog-pulse` | `<FogLayer>` | `8s` | `ease-in-out`, infinite | Ambient overdue load | Static fog at computed opacity |
| `fog-drift-a`, `fog-drift-b`, `fog-drift-c` | Fog banks inside `<FogLayer>` | 6, 8 and 7 times `--motion-ambient`, `alternate`, infinite | `ease-in-out` | Ambient overdue load (banks A and C drift left, B drifts right; the wrapper opacity is still `fogOpacity`, so drift carries no extra data) | Not applied; banks stay at rest at the computed opacity |
| `ghost-sway` | `<Ghost>` (a `rotate` of about 2 degrees about the bottom centre, part of the `ghost-drift` keyframes) | `--ghost-drift-speed` (3–12s) | `ease-in-out`, infinite | Card overdue-ness (the same duration as `ghost-drift`) | Not applied; ghost shown as a static icon |
| `candle-flicker` | Candle SVG | `0.3s` | `steps(3)` | While the flames are lit | Solid glow, no flicker |
| `candle-flare` | Candle flame in `<Candle>` | `--motion-slow` | `ease-out` | Good or Easy grade | Solid glow, no flare |
| `tombstone-crack-appear` | Crack SVG paths | `600ms` | `ease-out` | Stability decrease after failed review | Instant opacity change |
| `ghost-materialize` | `<Ghost>` | `400ms` | `ease-in` | Card becomes overdue | Instant opacity change |
| `ghost-dissolve` | `<Ghost>` | `500ms` | `ease-out` | Card reviewed successfully | Instant fade-out |
| `card-flip` | `<FlipCard>` | `350ms` | `cubic-bezier(0.4,0,0.2,1)` | User flips card in Séance | Instant display of back face |
| `moon-wax` | `<MoonPhase>` | `800ms` | `ease-in-out` | Progress toward daily goal | Instant SVG path change |
| `jumpscare-flash` | Full viewport overlay | `200ms` | `ease-out` | Again grade on a high-stability card (regression) | Suppressed entirely |
| `crow-hop` | `<CrowKeeper>` | `400ms` | `ease-in-out` | User extends streak | Static crow |

### 3.3 Transition Timing Tokens

```css
--motion-instant:   0ms;
--motion-fast:    150ms;
--motion-normal:  350ms;
--motion-slow:    600ms;
--motion-ambient: 8000ms;  /* fog, moon — background ambience */
```

### 3.4 Rules

- No animation may cause layout shift (use `transform` and `opacity` only for animated properties).
- `will-change: transform, opacity` may be added to animated elements but must be removed after the animation ends.
- Infinite animations (`ghost-drift`, `ghost-sway`, `fog-pulse`, `fog-drift-a`, `fog-drift-b`, `fog-drift-c`) must be paused via `animation-play-state: paused` when the tab is hidden (`document.visibilityState === 'hidden'`).
- Jumpscares (`jumpscare-flash`) are suppressed by both reduced-motion mode AND Coward mode independently.
- All duration values must reference the `--motion-*` tokens above; no hard-coded `ms` values in component CSS.

---

## 4. Sound Rules

### 4.1 Principles

1. **Synthesis only.** Every sound is built from `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `WaveShaperNode`, and `ConvolverNode`. No audio files, no samples, no external libraries.
2. **Every sound has a caption.** The caption string is defined in `src/audio/captions.ts` and referenced in both i18n locale files. Captions display in a visually hidden live region (`aria-live="polite"`) and in an optional on-screen caption bar.
3. **Master gain.** All sound output routes through a single master `GainNode` whose gain value mirrors the user's volume preference (0–1, stored in `store/prefs.ts`). Muting sets gain to 0; it never suspends the AudioContext.
4. **Coward mode.** A boolean signal in `store/prefs.ts`. When true, any sound classified as `SoundClass.SCARE` is replaced by the `softChime()` synthesis instead. No other sounds are affected.
5. **Lazy context.** `AudioContext` is created on the first user gesture (click, keydown, or touchstart) and reused thereafter. Pre-gesture calls to any `sounds.ts` function are no-ops (silently dropped, not errors).

### 4.2 Sound Catalogue

| Sound ID | Function | Classification | Data trigger | Synthesis sketch | Caption key |
|---|---|---|---|---|---|
| `ghost-scream` | `ghostScream()` | `SCARE` | Again grade (failure) | Sawtooth osc, 80–400Hz glide up over 0.6s, band-pass Q=8, decay 0.8s | `caption.ghostScream` |
| `coward-chime` | `softChime()` | `AMBIENT` | Replaces `ghost-scream` in Coward mode | Two sine oscs (C5+E5), triangle envelope 0.4s | `caption.softChime` |
| `candle-seal` | `candleSeal()` | `REWARD` | Successful review (Good or Easy) | Sine osc 440→880Hz over 0.2s, then harmonics fade, 0.5s total | `caption.candleSeal` |
| `hard-thud` | `hardThud()` | `NEUTRAL` | Hard grade | Low sine pulse 60Hz, 0.15s, felt more than heard | `caption.hardThud` |
| `page-turn` | `pageTurn()` | `AMBIENT` | Card flip | White noise burst filtered at 2kHz, 0.1s | `caption.pageTurn` |
| `crow-caw` | `crowCaw()` | `AMBIENT` | Streak extended | Three sawtooth chirps: 600→900Hz, 50ms each, 80ms apart | `caption.crowCaw` |
| `session-end-toll` | `sessionEndToll()` | `AMBIENT` | Review session completed | Sine osc 220Hz, slow attack 0.3s, 1.5s decay, slight reverb via ConvolverNode | `caption.sessionEndToll` |
| `import-success` | `importSuccess()` | `AMBIENT` | JSON import succeeds | Ascending pentatonic arpeggio, 5 sine pulses, 60ms each | `caption.importSuccess` |

### 4.3 Data Mapping

| Sound | Data meaning |
|---|---|
| `ghost-scream` | Memory regression: the word fought back |
| `candle-seal` | Memory consolidated: the grave is at rest |
| `hard-thud` | Partial recall: the stone weighs on your mind |
| `page-turn` | Crossing into knowledge: the séance page turns |
| `crow-caw` | Streak guardian acknowledges your persistence |
| `session-end-toll` | The séance is closed; the dead may rest |
| `import-success` | New souls have entered the graveyard |

### 4.4 Coward Mode Substitution Table

| Original sound | Coward mode replacement |
|---|---|
| `ghost-scream` | `soft-chime` |
| All others | Unchanged |

### 4.5 Caption Display Rules

- Captions appear in a fixed bar at the bottom of the viewport, `z-index` above all other content.
- Bar is visible only when a sound plays; it auto-hides after the sound's duration + 500ms.
- Caption text uses `--font-ui` at `--text-caption` size.
- The caption bar is always rendered (for screen-reader live region); it is visually hidden via `opacity: 0` when silent.
- Users may permanently show the caption bar via a toggle in Settings.

---

## 5. Effect-to-Data Master Table

This table is the single source of truth for every effect that reads, or can be mistaken for, application data. Any new such effect must be added here before implementation. Static backdrop elements that carry no data are governed by section 6 instead.

| Effect | Type | Data source | Formula / mapping |
|---|---|---|---|
| Fog density | Visual | `overdueCount`, `totalCards` | `opacity = clamp(overdueCount / totalCards, 0.05, 0.60)` |
| Ghost opacity | Visual | `card.retrievability` (0–1) | `opacity = clamp(1 - retrievability, 0.15, 0.95)` |
| Ghost drift speed | Motion | `card.daysPastDue` | `duration = max(3, 12 - daysPastDue * 1.5)` seconds |
| Tombstone fill | Visual | `card.stability` (days) | Linear interpolation from `--color-stone-crumbled` (stability=0) to `--color-stone-dark` (stability≥60) |
| Tombstone crack opacity | Visual | `card.stability` | `opacity = clamp(1 - stability/60, 0, 1)` |
| Tombstone moss opacity | Visual | `card.stability` | `opacity = clamp(stability/60, 0, 0.6)` |
| Moon phase arc | Visual | `reviewsDoneToday / dailyGoal` | SVG arc from 0° to `360° * progress`; full circle = full moon |
| Crow eye glow | Visual | `streakDays` | Glow active when `streakDays >= 3` |
| Crow wing-flap | Motion | `streakDays` just extended | One-shot `crow-hop` animation on streak increment |
| Ghost scream audio | Audio | Incorrect recall event | `ghostScream()` called; replaced by `softChime()` in Coward mode |
| Candle seal audio | Audio | Correct recall event (Good/Easy) | `candleSeal()` called |
| Seance candle flames | Visual | Most recent grade in the session is Good or Easy | Lit when true, unlit otherwise; flare once on each Good or Easy |
| Jumpscare flash | Visual | Again grade on card with `stability > 20` | `jumpscare-flash` animation; suppressed by reduced-motion or Coward mode |

---

## 6. Decorative backdrop

The rule "every effect has a data source" (sections 1 to 5) stays in force for anything that moves, glows, changes colour or changes shape in response to state. This section makes one narrow exception: a closed list of **static, data-free** elements that give the app a setting. They exist so the data-mapped effects have something to stand in front of. They must never carry, encode or imitate data.

### 6.1 Allowed elements (closed list)

| Element | Where | Constraints |
|---|---|---|
| Night-sky gradient | Graveyard sky, page background wash | Vertical gradient between `--color-sky-top` and `--color-sky-horizon`. No stars, clouds or other scattered items. |
| Far hills | Graveyard horizon | Two hand-authored silhouette paths (`--color-hill-far`, `--color-hill-near`). |
| Bare-tree silhouettes | Graveyard horizon and edges | A fixed set of hand-authored paths in `--color-tree`. The number and positions are constants. |
| Foreground ground | Graveyard bottom edge | A fixed silhouette strip in `--color-ground-fore`, drawn in front of the last row of graves. |
| Iron fence | Graveyard mid-ground | A fixed run of pickets in `--color-iron`. Picket count is a constant. |
| Gate | Graveyard, behind the crow | The gate structure only (posts, arch, bars). The crow perched on it stays data-mapped (streak) under section 5. |
| Moon halo | Around the moon disc | One soft radial glow in `--color-halo` at a constant opacity. It never varies with progress and never draws a second disc or wedge. The lit wedge inside it stays data-mapped (daily progress). |
| Page frame ornaments | App header, view headings, Ledger page ruling | Tombstone logo, divider rules, corner flourishes, ruled lines. Text content is never part of an ornament. |
| Séance table props | Séance view | Table surface, candle bodies (`--color-candle-wax`) and holders (`--color-iron`). The flames are not props. Flame behaviour is data-mapped and is documented in section 5. |

Anything not in this table is not decorative backdrop. Adding an element means editing this table first.

### 6.2 Backdrop palette

All values are CSS custom properties on `:root`, mirrored as constants in `src/design/tokens.ts`, and covered by the token mirror test.

| Token | Hex | Usage |
|---|---|---|
| `--color-sky-top` | `#05060c` | Top of the night-sky gradient |
| `--color-sky-horizon` | `#1a2238` | Bottom of the night-sky gradient |
| `--color-hill-far` | `#121826` | Farthest hill silhouette |
| `--color-hill-near` | `#0d1019` | Nearer hill silhouette |
| `--color-tree` | `#07080d` | Bare-tree silhouettes |
| `--color-iron` | `#1f2229` | Fence, gate, candle holders |
| `--color-ground-fore` | `#120d0a` | Foreground ground strip |
| `--color-halo` | `#6f86b8` | Moon halo (used at a constant opacity of 0.35 or less) |

Backdrop colours other than `--color-halo` must be darker (lower relative luminance) than `--color-stone-dark`, so that tombstones, ghosts and fog always read as the foreground. Backdrop elements must not use the data-reserved colours `--color-ghost-body`, `--color-ghost-glow`, `--color-fog-base`, `--color-crow-eye`, `--color-candle-flame`, `--color-moon-full`, `--color-danger`, `--color-warning` and `--color-success`.

### 6.3 Rules that keep the backdrop from becoming data

1. **No randomness.** Backdrop geometry is hand-authored constants. No `Math.random`, no time-based or card-derived seeds, no procedural scattering.
2. **No counts.** The number of trees, pickets, hills and candles is fixed. It is never derived from cards, crypts, reviews, streak or any other store value.
3. **No lookalikes.** The backdrop must not contain ghost-like figures, mist or fog-like shapes, cracks or moss on backdrop stone, bird shapes, or any second moon disc or phase. It must not use colour or opacity changes that could be read as a state.
4. **Identical for every user.** The rendered backdrop subtree is identical for every store state and every locale. A test must render the scene with different store contents and assert the backdrop markup is equal.
5. **Static.** Backdrop elements have no animation. Any motion near them belongs in the Animation Catalogue (section 3.2) with a data source.
6. **Inert for assistive technology and input.** Backdrop elements carry `aria-hidden="true"`, are not focusable, have no `role`, contain no text, and use `pointer-events: none`.
7. **Reduced motion and Coward mode.** Neither setting changes the backdrop, because it is already static and unscary.

### 6.4 Perspective cues on data elements

The graveyard scene may give tombstones depth so the scene reads as a place. These cues are layout, not data, and are therefore allowed on the data-mapped tombstone, provided they obey the limits below.

| Cue | Source | Limit |
|---|---|---|
| Scale by row (back rows smaller) | Row index and total row count only | Between 0.7 and 1.0 of full size |
| Depth shade (back rows darker) | Row index only | An overlay of `--color-void` at 0.30 opacity or less. It must not replace or alter `--tombstone-fill`. |
| Row offset (alternate rows shifted) | Row parity | At most half a column pitch |
| Tilt | A fixed function of row and column | At most 3 degrees, never read from card fields |

A cue must never use a card field (stability, retrievability, due date, state, text) as input. Depth shade must stay small enough that the stability gradient from `--color-stone-crumbled` to `--color-stone-dark` remains readable within a row.
