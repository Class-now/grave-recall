---
inclusion: always
---

# Grave Recall — Technical Steering

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Bundler | **Vite** (latest stable) | ESM-first, fast HMR, static output |
| Language | **TypeScript** (strict mode) | `"strict": true`, `"noUncheckedIndexedAccess": true` |
| UI framework | **Preact** | Smaller than React; hooks-compatible; signals available via `@preact/signals` |
| Graphics | **SVG** (primary) + Canvas fallback | SVG for the graveyard scene; Canvas for particle effects if SVG is too slow |
| Audio | **Web Audio API** only | Procedural synthesis; zero audio files; no external sound libraries |
| Testing | **Vitest** + **fast-check** | Unit + property-based tests; no Jest |
| Deploy | **Cloudflare Pages** | Static build, no server functions needed |
| License | **MIT** | |

## Project Layout (target)

```
src/
  scheduler/        # Pure TS module — FSRS-style math, zero DOM deps
  store/            # State management (signals or lightweight store)
  components/       # Preact components
    graveyard/      # SVG scene, ghost, tombstone, fog, moon, crow
    review/         # Séance session, flip card, grade buttons
    deck/           # Crypt list, card editor, bulk import
    stats/          # Ledger of the Dead charts
    settings/       # Coward mode, i18n selector, export/import
  audio/            # Web Audio synthesiser helpers
  i18n/             # String tables: en.ts, ja.ts
  design/           # Design-token constants (re-exports spooky-design-system)
  utils/            # Date helpers, CSV/TSV parser, ID generation
  main.ts           # Entry point
public/
  starter-crypts/   # bundled JSON decks (original content only)
docs/
.kiro/
  steering/
  specs/
```

## Coding Standards

### TypeScript

- All exported functions have explicit return types.
- No `any`; use `unknown` + narrowing or branded types.
- Pure functions are preferred; side effects are isolated to store and audio modules.
- The `scheduler/` module must have **zero** imports from anything outside `scheduler/`; it is a pure algebraic module.

### State Management

- Use `@preact/signals` for reactive state.
- Derive computed values (e.g., overdue count, fog density) as computed signals rather than duplicating state.
- Persistence is a side-effect triggered by a single store subscriber that writes to `localStorage`.

### Styling

- All style values come from design tokens defined in `src/design/` (see `spooky-design-system` steering).
- No inline styles except for values that must be computed from card state at runtime (e.g., ghost opacity).
- CSS custom properties (`--token-name`) bridge design tokens to SVG attributes and CSS.

### Audio

- All sound is synthesised procedurally using `OscillatorNode`, `BiquadFilterNode`, `GainNode`, etc.
- Every synthesised sound must have a corresponding caption string in the i18n tables.
- Volume is always controlled by a master `GainNode` that respects a user-set volume preference.
- Web Audio context is created lazily on first user gesture; never before.

### Accessibility

- All interactive SVG elements carry `role`, `aria-label`, and keyboard handlers.
- `prefers-reduced-motion` is read via `window.matchMedia` and stored as a reactive signal.
- Coward mode is a boolean signal that replaces screams with soft chimes.
- WCAG AA contrast is enforced by the design token system (see spooky-design-system steering).

### Scheduler Module Contract

- Input: current card state + grade (0–3) + timestamp.
- Output: next card state (new stability, difficulty, retrievability, next due date).
- Must be a pure function: `(CardState, Grade, Date) => CardState`.
- Must be deterministic given the same inputs.
- Must be covered by fast-check property tests (see design.md for properties).

### Testing

- `vitest` for all tests; no Jest globals.
- `fast-check` for scheduler property tests.
- Target: scheduler module at ≥ 95% line coverage.
- Component tests use `@testing-library/preact`.

### i18n

- All user-visible strings are looked up via a `t(key)` helper.
- Keys are typed (a `TranslationKey` union type ensures completeness).
- Adding a new language requires only a new locale file; no code changes.

## Build and CI

```bash
# Install
npm install

# Dev server (run manually — do not start programmatically)
npm run dev

# Type-check
npm run typecheck

# Tests (single run, no watch)
npm run test -- --run

# Build
npm run build

# Preview production build
npm run preview
```

- CI must pass `typecheck`, `test --run`, and `build` on every PR.
- No `@ts-ignore` or `eslint-disable` comments are permitted without a comment explaining why.

## Dependency Policy

- Prefer zero-dependency or low-dependency solutions.
- Pin all dependencies to exact versions in `package.json`.
- Do not add a dependency that can be replaced by ≤ 20 lines of utility code.
- Prohibited: jQuery, Lodash (use native equivalents), any audio file playback library.

## Performance Targets

- Graveyard scene renders ≤ 16 ms per frame (60 fps) for up to 200 cards.
- Initial page load (cold, no cache) ≤ 150 KB gzipped JS.
- Scheduler `schedule()` call ≤ 0.1 ms (pure math, no I/O).
