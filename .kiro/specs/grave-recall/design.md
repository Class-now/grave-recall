---
inclusion: always
---

# Grave Recall — Design

## 1. Architecture Overview

Grave Recall is a single-page application with a strict unidirectional data flow and a pure-functional scheduler core.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌──────────────┐   reads/dispatches   ┌────────────────┐  │
│  │  Components  │ ──────────────────── │     Store      │  │
│  │  (Preact)    │                      │  (@preact/     │  │
│  └──────┬───────┘                      │   signals)     │  │
│         │ calls                        └────┬───────────┘  │
│  ┌──────▼───────┐                           │ calls        │
│  │    Audio     │                      ┌────▼───────────┐  │
│  │  (Web Audio) │                      │   Scheduler    │  │
│  └──────────────┘                      │  (pure TS)     │  │
│                                        └────────────────┘  │
│                                             │ persists     │
│                                        ┌────▼───────────┐  │
│                                        │  localStorage  │  │
│                                        └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:** User gesture → Component event handler → Store action → (Scheduler called if review) → Signal update → Component re-renders + localStorage write + (Audio called if needed).

---

## 2. Module Boundaries

| Module | Depends on | Must not depend on |
|---|---|---|
| `scheduler/` | TypeScript built-ins, `Date` only | Everything else |
| `store/` | `scheduler/`, `utils/` | `components/`, `audio/` |
| `audio/` | `store/prefs` (for coward mode, volume) | `components/` |
| `i18n/` | `store/prefs` (locale signal) | All others |
| `design/tokens.ts` | Nothing | Everything |
| `utils/` | Nothing | Everything |
| `components/` | `store/`, `audio/`, `i18n/`, `design/`, `utils/` | `scheduler/` (via store only) |

---

## 3. Data Model

### 3.1 Core Types

```typescript
// src/scheduler/types.ts

type CardId   = string & { readonly __brand: 'CardId' };
type DeckId   = string & { readonly __brand: 'DeckId' };

type Grade = 0 | 1 | 2 | 3;  // Again | Hard | Good | Easy

type CardSRSState = 'new' | 'learning' | 'review' | 'relearning';

interface CardState {
  readonly id:             CardId;
  readonly stability:      number;      // S — interval in days at 90% retention
  readonly difficulty:     number;      // D — scale [1, 10]
  readonly retrievability: number;      // R — [0, 1], probability of recall
  readonly lapses:         number;      // count of Again grades
  readonly reps:           number;      // total review count
  readonly srsState:       CardSRSState;
  readonly dueDate:        Date;
  readonly lastReviewed:   Date | null;
}

interface ScheduleResult {
  readonly nextState: CardState;
  readonly intervalDays: number;
}
```

```typescript
// src/store/decks.ts / cards.ts (store-layer extensions)

interface Deck {
  readonly id:        DeckId;
  readonly name:      string;
  readonly createdAt: Date;
}

interface Card {
  readonly id:          CardId;
  readonly deckId:      DeckId;
  readonly front:       string;
  readonly back:        string;
  readonly example:     string | null;
  readonly createdAt:   Date;
  readonly srs:         CardState;
}
```

```typescript
// src/store/persistence.ts

interface DeckExport {
  version:  1;
  name:     string;
  language: string;
  cards: Array<{ front: string; back: string; example: string | null }>;
}

interface AppExport {
  version:    1;
  exportedAt: string;        // ISO 8601
  decks:      Deck[];
  cards:      Card[];
  prefs:      UserPrefs;
}

interface UserPrefs {
  locale:        'en' | 'ja';
  cowardMode:    boolean;
  volume:        number;     // [0, 1]
  dailyGoal:     number;     // cards per day
  reducedMotion: boolean;    // user override (OS signal is separate)
  showCaptions:  boolean;
}
```

### 3.2 Derived Signals

All of the following are computed signals in `src/store/`:

| Signal | Formula |
|---|---|
| `dueCards` | `cards.filter(c => c.srs.dueDate <= now)` |
| `overdueCards` | `cards.filter(c => c.srs.dueDate < startOfToday)` |
| `overdueCount` | `overdueCards.length` |
| `fogOpacity` | `clamp(overdueCount / max(totalCards, 1), 0.05, 0.60)` |
| `reviewsDoneToday` | count of review log entries with `date === today` |
| `moonPhasePct` | `min(reviewsDoneToday / dailyGoal, 1.0)` |
| `streakDays` | longest run of consecutive days with ≥ 1 review ending today |
| `retentionRate` | `correctReviews30d / totalReviews30d` (0 if no reviews) |

---

## 4. Scheduler Math (FSRS-Style)

The scheduler is a simplified variant of the FSRS (Free Spaced Repetition Scheduler) algorithm. All symbols are defined below.

### 4.1 Symbols

| Symbol | Type | Meaning |
|---|---|---|
| `S` | `number` (days) | **Stability** — the interval at which retrievability equals 0.9 |
| `D` | `number` [1,10] | **Difficulty** — how hard the card is to memorise |
| `R` | `number` [0,1] | **Retrievability** — estimated probability of recall at time `t` |
| `t` | `number` (days) | Time elapsed since last review |
| `G` | `Grade` {0,1,2,3} | User grade: Again=0, Hard=1, Good=2, Easy=3 |
| `λ` | constant | Forgetting-curve rate: `ln(10/9) ≈ 0.10536` |
| `w[i]` | constants | Tunable weight parameters (defaults below) |

### 4.2 Forgetting Curve

```
R(t, S) = exp(−λ · t / S)
         = exp(−0.10536 · t / S)
```

This gives `R = 0.9` exactly when `t = S`, defining stability as the "90% retention interval".

### 4.3 Initial Card State (`initCard`)

```
S₀ = 1.0   (days)
D₀ = 5.0
R₀ = 1.0
lapses = 0
reps   = 0
srsState = 'new'
dueDate  = now
```

### 4.4 Stability After Successful Review (G ≥ 1)

```
S' = S · (e^(w₁ · (11 − D) · S^(−w₂)) · e^(w₃ · (G − 3)) − w₄ + 1)
```

Default weights:

| Weight | Default |
|---|---|
| `w₁` | `0.40` |
| `w₂` | `0.15` |
| `w₃` | `0.30` |
| `w₄` | `0.30` |

Simplified per-grade interpretations:
- **Hard (1):** `G − 3 = −2` → exponent is negative → S' < S × e^(w₁…) × e^(−2w₃) → short interval growth
- **Good (2):** `G − 3 = −1` → moderate growth
- **Easy (3):** `G − 3 = 0` → maximum growth factor

**Post-lapse stability** (when `srsState === 'relearning'` and G ≥ 1):

```
S' = max(S_min, w₅ · D^(−w₆) · ((S + 1)^w₇ − 1) · R)
```

where `S_min = 1.0`, and:

| Weight | Default |
|---|---|
| `w₅` | `11.0` |
| `w₆` | `0.10` |
| `w₇` | `0.90` |

### 4.5 Stability After Failure (G = 0, `Again`)

```
S' = w₈ · D^(−w₉) · ((S + 1)^w₁₀ − 1) · R
S' = max(S', S_min)   where S_min = 1.0
```

Default weights:

| Weight | Default |
|---|---|
| `w₈` | `0.20` |
| `w₉` | `0.10` |
| `w₁₀` | `0.80` |

### 4.6 Difficulty Update

```
D' = D − w₁₁ · (G − 2)
D' = clamp(D', 1, 10)
```

Default: `w₁₁ = 0.15`

- Again (0): `G − 2 = −2` → D increases by 0.30 (harder)
- Hard (1): `G − 2 = −1` → D increases by 0.15
- Good (2): `G − 2 = 0` → D unchanged
- Easy (3): `G − 2 = +1` → D decreases by 0.15 (easier)

### 4.7 Next Interval and Due Date

```
intervalDays = round(S')
dueDate      = lastReviewed + intervalDays days
```

For `Again` (G = 0): `intervalDays = 1`, `dueDate = now + 1 day`, `srsState = 'relearning'`.

For first review of a `new` card: `srsState` transitions:
- `new → learning` after any review
- `learning → review` after first successful review (G ≥ 1)
- `review → relearning` after Again (G = 0)
- `relearning → review` after any successful re-review (G ≥ 1)

### 4.8 Retrievability at Review Time

Before calling `schedule()`, compute current retrievability:

```
t = daysSince(card.lastReviewed ?? card.dueDate)
R = exp(−λ · t / card.stability)
R = clamp(R, 0.0, 1.0)
```

This value is stored on the card before scheduling and drives the ghost opacity in the graveyard.

---

## 5. Correctness Properties for Property-Based Testing

All properties are implemented in `src/scheduler/scheduler.test.ts` using `fast-check`. Requirement references are noted.

### P-01 — Monotone interval growth on success (refs: AC-10.3, AC-10.5)
```
∀ cardState, ∀ grade ∈ {1, 2, 3}:
  schedule(cardState, grade).intervalDays > 0

∀ cardState:
  schedule(cardState, 3).intervalDays > schedule(cardState, 2).intervalDays
  schedule(cardState, 2).intervalDays > schedule(cardState, 1).intervalDays
```

### P-02 — Failure resets to short interval (ref: AC-10.4)
```
∀ cardState with cardState.stability ≥ 1:
  schedule(cardState, 0).intervalDays === 1
  schedule(cardState, 0).nextState.lapses === cardState.lapses + 1
```

### P-03 — Difficulty bounds (ref: AC-10.8)
```
∀ cardState, ∀ grade:
  1 ≤ schedule(cardState, grade).nextState.difficulty ≤ 10
```

### P-04 — Difficulty direction (ref: AC-10.8)
```
∀ cardState with D ∈ (1, 10):
  schedule(cardState, 0).nextState.difficulty > cardState.difficulty   -- harder
  schedule(cardState, 3).nextState.difficulty < cardState.difficulty   -- easier
  schedule(cardState, 2).nextState.difficulty === cardState.difficulty  -- unchanged
```
(Edge: clamped when D already at bounds.)

### P-05 — Stability strictly positive (safety invariant)
```
∀ cardState, ∀ grade:
  schedule(cardState, grade).nextState.stability > 0
```

### P-06 — Retrievability range
```
∀ cardState, ∀ t ≥ 0:
  0 ≤ retrievability(cardState, t) ≤ 1
```

### P-07 — Retrievability monotone decreasing in time
```
∀ cardState, ∀ t1 < t2:
  retrievability(cardState, t1) ≥ retrievability(cardState, t2)
```

### P-08 — Retrievability at t=0 is 1.0
```
∀ cardState:
  retrievability(cardState, 0) === 1.0
```

### P-09 — Due date is in the future after successful review (ref: AC-10.3)
```
∀ cardState, ∀ grade ∈ {1, 2, 3}, ∀ now:
  schedule(cardState, grade, now).nextState.dueDate > now
```

### P-10 — SRS state machine transitions are valid
```
Valid transitions: new→learning, learning→review, review→relearning, relearning→review
Invalid transitions: any→new, review→learning
∀ cardState, ∀ grade:
  schedule(cardState, grade).nextState.srsState ∈ validTransitions[cardState.srsState][grade]
```

### P-11 — Reps always increments (ref: AC-09.1)
```
∀ cardState, ∀ grade:
  schedule(cardState, grade).nextState.reps === cardState.reps + 1
```

### P-12 — Determinism
```
∀ cardState, ∀ grade, ∀ now:
  schedule(cardState, grade, now) deepEquals schedule(cardState, grade, now)
```

### P-13 — JSON round-trip for AppExport (ref: AC-23.4)
```
∀ appState:
  deserialize(serialize(appState)) deepEquals appState
```
(Types: all Date fields serialised as ISO strings, restored as Date objects.)

---

## 6. Error Handling

### 6.1 Validation Errors (user input)

All user-input validation returns a typed `ValidationResult` rather than throwing:

```typescript
type ValidationResult<T> =
  | { ok: true;  value: T }
  | { ok: false; errors: ValidationError[] };

interface ValidationError {
  field: string;
  messageKey: TranslationKey;
}
```

Components render inline error messages from `messageKey` via `t()`. No exceptions are thrown for validation failures.

### 6.2 Scheduler Errors

The `schedule()` function must never throw. If inputs are out of expected ranges, clamp them silently:
- `stability < 0.01` → treated as `0.01`
- `difficulty < 1` or `> 10` → clamped before formula application
- `grade` outside `{0,1,2,3}` → TypeScript prevents this at compile time (union type)

### 6.3 localStorage Errors

Wrapped in try/catch in `persistence.ts`. On write failure: log warning, continue in-memory. On read failure: treat as empty state and show a non-blocking toast notification.

### 6.4 JSON Import Errors

Schema validation is performed with a hand-written type guard (`isAppExport(unknown): boolean`) before any state mutation. If validation fails, no state is modified and the user sees a localised error message. The error details are logged to the console.

### 6.5 AudioContext Errors

Any `AudioContext` operation is wrapped in try/catch. On error: log, skip sound. The app never crashes due to audio failure. Captions are displayed regardless of whether audio succeeds.

### 6.6 Web Font Load Failures

CSS `font-display: swap` ensures legible fallback fonts are used. No JavaScript font-load handling required.

---

## 7. Testing Strategy

### 7.1 Scheduler (Unit + Property-Based)

- **File:** `src/scheduler/scheduler.test.ts`
- **Framework:** Vitest + fast-check
- **Coverage target:** ≥ 95% line coverage
- **Approach:**
  1. Unit tests for each formula with known inputs/outputs (regression guard).
  2. Property tests P-01 through P-13 (see §5) with `fc.record` arbitraries over the full valid input space.
  3. `fc.statistics` runs to verify distribution of generated intervals.

fast-check arbitraries for `CardState`:
```typescript
const arbCardState = fc.record({
  stability:      fc.float({ min: 0.01, max: 365 }),
  difficulty:     fc.float({ min: 1,    max: 10 }),
  retrievability: fc.float({ min: 0,    max: 1 }),
  lapses:         fc.nat({ max: 50 }),
  reps:           fc.nat({ max: 200 }),
  srsState:       fc.constantFrom('new','learning','review','relearning'),
  // id, dueDate, lastReviewed generated separately
});
```

### 7.2 Store (Unit)

- **File:** `src/store/*.test.ts` (co-located)
- Test each action (createDeck, deleteCard, gradeCard, etc.) in isolation by calling actions and asserting signal values.
- Mock `persistence.ts` to avoid real localStorage in tests.

### 7.3 Persistence (Integration)

- Test serialise → deserialise round-trip (property P-13).
- Test that `loadState()` with empty localStorage returns default state.
- Test that malformed JSON import leaves state unchanged.

### 7.4 Components (Rendering)

- **Framework:** `@testing-library/preact`
- Test gradeCard flow: render `<SeanceSession>`, simulate Space, assert card back visible, simulate `1` key, assert next card shown.
- Test `<GraveyardScene>` with a controlled signal fixture: assert tombstone count matches card count.
- Test keyboard navigation: Tab order, Enter on tombstone opens detail panel, Escape closes it.
- Test `reducedMotion` signal: when true, assert no `ghost-drift` animation class applied.

### 7.5 Accessibility (Automated)

- Use `axe-core` via `vitest-axe` to run automated a11y checks on all major views.
- Manual keyboard navigation smoke test documented in `docs/a11y-checklist.md`.

### 7.6 Audio (Unit)

- Mock `AudioContext` (Web Audio API not available in Node/jsdom).
- Test that `ghostScream()` is called on Again grade and `softChime()` is called instead when `cowardMode = true`.
- Test that all sounds are no-ops when AudioContext has not been initialised.

### 7.7 CI Pipeline

```
npm run typecheck  →  tsc --noEmit
npm run test -- --run  →  vitest run (all *.test.ts files)
npm run build  →  vite build
```

All three must pass; any failure blocks merge.
