# Function-First Horror: Design Rules

Every token, motion rule and sound rule here exists to serve a functional purpose. An effect is anything that moves, glows, changes colour, opacity or shape, or plays a sound. **Every effect declares the data it shows.** If an effect cannot name its data source, it is rejected. The only exception is the closed list of static, data-free elements in section 6.

The names in `like this` and the rows marked "example" are illustrations. Replace them with your project's own data.

---

## 1. Colour tokens

All colours are CSS custom properties on `:root`. A TypeScript constants file mirrors every value so that SVG attributes computed at runtime can use them. A test checks that the CSS and the constants agree.

Token roles:

| Role | Rule |
|---|---|
| Base surfaces and text | Page background, panel, card face, primary and secondary text, inverse text, border, focus ring |
| Data-reserved colours | Colours that only an effect may use because they encode a state (for example a danger red or a glow colour). Decoration must never use them |
| Semantic tokens | Set at runtime on the element they style, resolved from data (for example `--thing-opacity`). The base palette gives their fallback |
| Backdrop colours | Used only by the static backdrop (section 6). Each must be darker than the darkest data-mapped surface |

Contrast (WCAG AA), checked by a test, not by eye:

- Primary text on the page background and on card faces: at least 4.5:1.
- Secondary text and large text: at least 3:1.
- Focus ring on every background it appears on: at least 3:1.
- Button labels on their button colours: at least 4.5:1.
- A state shown by colour must also differ without colour (hatch, shape, label).

## 2. Typography

- Decorative display fonts only for headings. Body copy and interactive controls use a legible text face or the system UI face.
- Minimum body size 1rem. Never below 0.75rem for any visible text.
- Every custom font has a fallback chain that stays legible without it.

## 3. Motion

Motion is opt-in at the browser level. Read the reduced-motion preference once at startup, subscribe to changes, and store it as one reactive value. Components read that value and never call `matchMedia` themselves.

| Mode | Behaviour |
|---|---|
| Full motion | All animations run |
| Reduced motion (browser preference or user toggle) | Drifting, floating and flashes are off. State changes remain as instant cross-fades of 150 ms or less |

### 3.1 Animation catalogue

Keep a table of every animation. A row is required before an animation exists.

| Column | Meaning |
|---|---|
| Animation | Name of the keyframes |
| Element | The component it runs on |
| Duration and easing | Duration is a motion token |
| Data meaning | What state the viewer reads from it |
| Reduced-motion substitute | Static or instant replacement |

Example row: `drift` | `<Spirit>` | `--spirit-drift-speed` (3 to 12 s), ease-in-out, infinite | how overdue the item is | hidden, static icon shown.

### 3.2 Rules

- Animate only `transform` and `opacity`. No layout shift.
- `will-change` may be added during an animation and must be removed after it ends.
- Infinite animations pause when the tab is hidden (`document.visibilityState === 'hidden'`).
- Every duration references a `--motion-*` token. No millisecond literal in component CSS.
- Sudden or startling effects (a full-screen flash, a scare) are off in reduced-motion mode and also off in a separate "calm" setting, each independently.

Timing tokens: `--motion-instant` 0 ms, `--motion-fast` 150 ms, `--motion-normal` 350 ms, `--motion-slow` 600 ms, `--motion-ambient` 8000 ms for background ambience.

## 4. Sound

1. **Synthesis only.** Build every sound from Web Audio nodes (oscillators, gain, filters, wave shapers, convolver). No audio files, no samples, no sound libraries.
2. **Every sound has a caption.** One caption string per sound in a single captions module, referenced by every locale file. Captions show in a polite live region and in an optional on-screen bar.
3. **One master gain.** All output goes through a single master gain that mirrors the user's volume setting. Muting sets gain to 0 and never suspends the context.
4. **Calm mode.** A boolean setting that replaces every sound classified as a scare with a soft chime. Other sounds stay the same.
5. **Lazy context.** Create the audio context on the first user gesture. Calls before that are silent no-ops.

Keep a sound catalogue: sound ID, function, classification (scare, reward, neutral, ambient), data trigger, synthesis sketch, caption key. Each sound also has a data meaning, for example "memory regression: the word fought back".

## 5. Effect-to-Data Master Table

This table is the single source of truth. Add a row before implementing a new effect.

| Effect | Type | Data source | Formula or mapping |
|---|---|---|---|
| Example: haze density | Visual | `backlogCount`, `totalCount` | `opacity = clamp(backlogCount / totalCount, 0.05, 0.60)` |
| Example: crack opacity | Visual | `item.strength` | `opacity = clamp(1 - strength / 60, 0, 1)` |
| Example: failure sound | Audio | incorrect-answer event | `failureSound()`, replaced by `softChime()` in calm mode |

Each row must give: the effect, its type, the exact data field, and a formula with bounds. A formula that cannot be written is a sign the effect has no data source.

## 6. Decorative backdrop (closed exception)

Static, data-free elements may give the app a setting so that data effects have something to stand in front of. They must never carry, encode or imitate data.

### 6.1 Allowed elements (closed list)

List them in this table and add nothing without editing the table first. Typical entries: a sky gradient, distant hills, silhouettes, a ground strip, a fence, frame ornaments, table props. Props that hold a data-mapped flame or glow are props only. The flame or glow is an effect and belongs in section 5.

### 6.2 Backdrop palette

Backdrop colours are separate tokens. Each is darker than the darkest data-mapped surface, and none reuses a data-reserved colour.

### 6.3 Rules that keep the backdrop from becoming data

1. No randomness. Geometry is hand-authored. No random, time-based or data-derived seeds.
2. No counts. The number of trees, pickets or props is fixed and never read from the store.
3. No lookalikes. No shape that could be read as a state: no figures, mist, cracks, moss, birds or a second moon.
4. Identical for every user. A test renders the scene with different store contents and asserts the backdrop markup is equal.
5. Static. No animation. Motion near it belongs in the animation catalogue with a data source.
6. Inert. `aria-hidden="true"`, not focusable, no `role`, no text, `pointer-events: none`.
7. Reduced motion and calm mode never change it.

### 6.4 Perspective cues on data elements

Depth may be added to data-mapped elements as layout, within small limits: scale by row (0.7 to 1.0), a depth shade overlay of 0.30 opacity or less that does not replace the data colour, an alternate-row offset of half a column pitch at most, and a fixed tilt of 3 degrees at most. A cue must never read a data field.

## 7. Review checklist

A reviewer (human or the design-warden agent) reports three kinds of finding, each with file and line:

1. **Effect with no data source.** No row in the Master Table or catalogue, not on the backdrop list, or the formula differs from its row.
2. **Hard-coded value outside the tokens.** A colour literal or a millisecond or second duration that is not a token reference. Token declarations are the only place literals belong.
3. **Sound without a caption key.** No entry in the captions module, a caption key missing from a locale file, or a sound that is not synthesised.

Everything else (naming, structure, taste) is out of scope for this review.
