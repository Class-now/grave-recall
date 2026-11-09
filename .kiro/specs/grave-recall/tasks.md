# Grave Recall — Implementation Tasks

Tasks are ordered for incremental, always-buildable delivery. Each task leaves the project in a working (or intentionally stub-complete) state. Complete tasks in order; later tasks assume earlier ones are done.

Property-test sub-tasks are marked **[property-test]** and must pass before the parent task is marked complete.

---

## Task 1 — Project Scaffold
*Prerequisites: none*
*Refs: NFR-01, NFR-02 (CI infrastructure)*

- [x] Initialise Vite + Preact + TypeScript project at workspace root (`npm create vite@latest`)
- [x] Configure `tsconfig.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`
- [x] Configure `vitest.config.ts` with jsdom environment and coverage provider
- [x] Install exact-pinned dependencies: `preact`, `@preact/signals`, `vitest`, `fast-check`, `@testing-library/preact`, `@testing-library/user-event`
- [x] Create `src/` directory tree matching structure steering (empty barrel `index.ts` files as placeholders)
- [x] Add `npm run typecheck`, `npm run test -- --run`, `npm run build` scripts to `package.json`
- [x] Verify CI pipeline: all three commands pass with empty stubs

---

## Task 2 — Design Tokens
*Prerequisites: Task 1*
*Refs: spooky-design-system §1, §2, §3.3*

- [x] Create `src/design/tokens.ts` exporting every base palette colour token as a TypeScript constant (`COLOR_VOID`, etc.) mirroring the CSS hex values
- [x] Create `src/index.css` declaring all `--color-*`, `--font-*`, `--text-*`, and `--motion-*` custom properties on `:root`
- [x] Add Google Fonts `<link>` tags for UnifrakturMaguntia, IM Fell English, Courier Prime to `index.html` with `font-display: swap`
- [x] Verify `tokens.ts` has zero imports from any other `src/` module (leaf constraint)
- [x] Write a type-level test asserting every CSS token name has a corresponding TS constant (use a mapped type or object literal check)

---

## Task 3 — Scheduler Core
*Prerequisites: Task 1*
*Refs: US-09, US-10, AC-09.1, AC-10.1–10.9, NFR-02*

- [x] Define `CardState`, `Grade`, `ScheduleResult`, `CardSRSState` types in `src/scheduler/types.ts`
- [x] Implement `initCard(id: CardId): CardState` in `src/scheduler/fsrs.ts`
- [x] Implement `retrievability(state: CardState, now: Date): number` using the forgetting curve formula `R = exp(−λ·t/S)`
- [x] Implement `schedule(state: CardState, grade: Grade, now: Date): ScheduleResult` with:
  - Stability update formula for success (§4.4)
  - Stability update formula for failure (§4.5)
  - Post-lapse stability formula (§4.4)
  - Difficulty update with clamping (§4.6)
  - Interval and due-date computation (§4.7)
  - SRS state machine transitions (§4.7)
  - Reps increment
- [x] Export public API from `src/scheduler/index.ts`
- [x] Verify zero imports outside `scheduler/` in the module
- [x] **[property-test]** Implement P-01 (monotone interval growth on success)
- [x] **[property-test]** Implement P-02 (failure resets to interval=1, lapses++)
- [x] **[property-test]** Implement P-03 (difficulty clamped to [1,10])
- [x] **[property-test]** Implement P-04 (difficulty direction per grade)
- [x] **[property-test]** Implement P-05 (stability always positive)
- [x] **[property-test]** Implement P-06 (retrievability in [0,1])
- [x] **[property-test]** Implement P-07 (retrievability monotone decreasing in t)
- [x] **[property-test]** Implement P-08 (retrievability at t=0 is 1.0)
- [x] **[property-test]** Implement P-09 (due date in future after successful review)
- [x] **[property-test]** Implement P-10 (valid SRS state transitions)
- [x] **[property-test]** Implement P-11 (reps always increments)
- [x] **[property-test]** Implement P-12 (determinism)
- [x] Achieve ≥ 95% line coverage on `src/scheduler/`

---

## Task 4 — Utilities and i18n Foundation
*Prerequisites: Task 1*
*Refs: US-08 (CSV), US-29, AC-29.4*

- [x] Implement `src/utils/id.ts`: `generateId()` using `crypto.randomUUID()` with a nano-ID fallback
- [x] Implement `src/utils/date.ts`: `daysBetween(a: Date, b: Date)`, `startOfDay(d: Date)`, `addDays(d: Date, n: number)`
- [x] Implement `src/utils/csv.ts`: `parseTsvCsv(text: string): ParseResult` auto-detecting tab vs. comma delimiter, skipping malformed rows, returning `{rows, skippedCount}`
- [x] Define `TranslationKey` union type in `src/i18n/types.ts` (all keys as string literals)
- [x] Create `src/i18n/en.ts` with complete English strings (UI labels, validation errors, caption keys, a11y labels)
- [x] Create `src/i18n/ja.ts` mirroring every key in `en.ts` with Japanese translations
- [x] Implement `src/i18n/index.ts`: `t(key: TranslationKey): string` helper reading the locale signal from `store/prefs`
- [x] Write unit tests for `parseTsvCsv` covering: tab delimiter, comma delimiter, mixed-quote CSV, malformed rows, empty input
- [x] **[property-test]** Property: `∀ rows: parseTsvCsv(toTsv(rows)).rows deepEquals rows` (round-trip for well-formed input)
- [x] Write unit test: missing key in active locale falls back to English and logs a warning

---

## Task 5 — Store and Persistence
*Prerequisites: Tasks 3, 4*
*Refs: US-01–04, US-21–23, AC-21.1–21.3, AC-22.1–22.2, AC-23.1–23.4*

- [x] Define `UserPrefs`, `Deck`, `Card`, `AppExport`, `DeckExport` types in `src/store/` type files
- [x] Implement `src/store/prefs.ts`: signals for `locale`, `cowardMode`, `volume`, `dailyGoal`, `reducedMotion`, `showCaptions`; read `prefers-reduced-motion` via `matchMedia` on init and subscribe to changes
- [x] Implement `src/store/decks.ts`: `decks` signal; actions `createDeck`, `renameDeck`, `deleteDeck`
- [x] Implement `src/store/cards.ts`: `cards` signal; actions `addCard`, `editCard`, `deleteCard`; derived signals `dueCards`, `overdueCards`, `overdueCount`
- [x] Implement `src/store/session.ts`: session queue, current card, `startSession`, `flipCard`, `gradeCard` actions (calls `scheduler.schedule()`)
- [x] Implement `src/store/stats.ts`: derived signals `reviewsDoneToday`, `moonPhasePct`, `streakDays`, `retentionRate`, `fogOpacity`; review log append
- [x] Implement `src/store/persistence.ts`: `saveState()` / `loadState()` for localStorage; `exportJson()` / `importJson(text)` with `isAppExport` type-guard validation
- [x] Implement `src/store/index.ts` as re-export barrel
- [x] Load starter crypts from `public/starter-crypts/` on first launch (empty localStorage)
- [x] Write store unit tests: each action mutates signals correctly; mock `persistence.ts`
- [x] **[property-test]** Implement P-13 (JSON round-trip: `deserialize(serialize(state)) deepEquals state`)
- [x] Test: malformed JSON import leaves state unchanged

---

## Task 6 — Starter Crypts Content
*Prerequisites: Task 5*
*Refs: US-04, AC-04.1–04.4*

- [x] Create `public/starter-crypts/english-100.json` with 100 original English vocabulary entries conforming to `DeckExport` schema (no copyrighted lists)
- [x] Create `public/starter-crypts/french-50.json` with 50 original French–English vocabulary entries conforming to `DeckExport` schema
- [ ] Write a schema-validation test that loads both JSON files and asserts they conform to `DeckExport` (version, name, language, cards array, each card has non-empty front + back)

---

## Task 7 — Audio System
*Prerequisites: Task 5*
*Refs: US-13, US-14, US-23, US-25, US-26, AC-25.1–25.4, AC-26.1–26.2*

- [ ] Implement `src/audio/context.ts`: lazy `AudioContext` singleton; `ensureContext()` no-op before first gesture; `markGestureOccurred()` to initialise
- [ ] Implement `src/audio/synth.ts`: low-level helpers `createOscillator`, `createGain`, `createFilter`, `createNoise`, `scheduleEnvelope`
- [ ] Implement all 8 sounds in `src/audio/sounds.ts`: `ghostScream`, `softChime`, `candleSeal`, `hardThud`, `pageTurn`, `crowCaw`, `sessionEndToll`, `importSuccess` — each routes through master `GainNode`; reads `cowardMode` signal to substitute `ghostScream` → `softChime`
- [ ] Implement `src/audio/captions.ts` mapping each sound ID to its `TranslationKey`
- [ ] Write audio unit tests with a mocked `AudioContext`; assert `softChime` is called instead of `ghostScream` when `cowardMode = true`; assert all sounds are no-ops pre-gesture
- [ ] Verify `audio/` has no imports from `components/`

---

## Task 8 — Deck and Card Management UI
*Prerequisites: Tasks 5, 7*
*Refs: US-01–08, AC-01–08*

- [ ] Implement `<CryptList>`: list of decks with keyboard navigation; "New Crypt" button; delete with confirmation dialog (focus-trapped); rename inline
- [ ] Implement `<CryptEditor>` / `<CardEditor>`: form with front, back, example fields; field-level validation errors via `t()` keys; submit creates/edits card; validation error on empty front or back
- [ ] Implement `<BulkImport>`: textarea for TSV/CSV paste; calls `parseTsvCsv`; shows summary of imported/skipped counts; imports up to 500 cards per operation
- [ ] All interactive elements: `role`, `aria-label`, keyboard handlers, visible focus ring using `--color-focus-ring`
- [ ] Write component tests: create crypt happy path; empty-name validation shows error; bulk import with mixed valid/skipped rows shows correct summary; delete confirmation dialog traps focus

---

## Task 9 — Graveyard Scene
*Prerequisites: Tasks 5, 2*
*Refs: US-16, US-17, AC-16.1–16.7, AC-17.1–17.3*

- [ ] Implement `<GraveyardScene>`: SVG viewport; lays out tombstones in a grid/staggered arrangement for up to 200 cards; reads card signals reactively
- [ ] Implement `<Tombstone>`: SVG shape; runtime CSS custom properties `--tombstone-fill`, `--tombstone-crack-opacity`, `--tombstone-moss-opacity` derived from `card.stability` using spooky-design-system formulas; `aria-label` with front text + due date; keyboard Enter → open detail panel
- [ ] Implement `<Ghost>`: SVG shape; `--ghost-opacity` from `1 - retrievability`; `--ghost-drift-speed` from days-past-due; `ghost-drift` animation; static icon (no animation) when `reducedMotion = true`
- [ ] Implement `<FogLayer>`: SVG `<feTurbulence>` + `<feDisplacementMap>` filter; `--fog-opacity` from `fogOpacity` signal; paused when tab hidden
- [ ] Implement `<MoonPhase>`: SVG arc path computed from `moonPhasePct` signal; `moon-wax` transition; `aria-label` describing progress
- [ ] Implement `<CrowKeeper>`: SVG crow; eye glow when `streakDays ≥ 3`; `crow-hop` animation on streak increment; plays `crowCaw()` on hop
- [ ] Implement card detail panel: shows front, back, example, stability, retrievability, due date; dismissible with Escape or close button; focus restored to tombstone on close
- [ ] Write graveyard component tests: tombstone count matches card count; ghost rendered only for overdue cards; `reducedMotion=true` removes drift animation class; Escape closes detail panel and restores focus

---

## Task 10 — Review Session (Séance)
*Prerequisites: Tasks 5, 7, 9*
*Refs: US-12–15, AC-12.1–12.3, AC-13.1–13.4, AC-14.1–14.7, AC-15.1–15.4*

- [ ] Implement `<SeanceSession>`: loads due cards into queue; shows "no cards due" message if queue is empty; displays remaining count
- [ ] Implement `<FlipCard>`: front face shown initially; grade buttons hidden; Space or tap reveals back; focus moves to "Again" button on flip; `card-flip` animation (instant cross-fade when `reducedMotion = true`); plays `pageTurn()` on flip
- [ ] Implement `<GradeButtons>`: Again / Hard / Good / Easy buttons; keys 1–4; each grade: calls `gradeCard()` action, plays appropriate sound, displays caption; advances queue; plays `sessionEndToll()` and navigates to graveyard when queue empty
- [ ] Implement jumpscare flash overlay: `jumpscare-flash` animation on Again for card with `stability > 20`; suppressed by `reducedMotion` OR `cowardMode`
- [ ] Focus management: auto-focus flip button on new card; auto-focus Again button after flip; visible focus ring
- [ ] Write review session tests: Space flips card; key `1` calls Again grade and plays ghost scream (or soft chime in coward mode); empty queue shows completion screen; full keyboard flow (Space → `2`) advances to next card

---

## Task 11 — Stats View (Ledger of the Dead)
*Prerequisites: Task 5*
*Refs: US-18–20, AC-18.1–18.3, AC-19.1–19.2, AC-20.1–20.2*

- [ ] Implement `<LedgerView>` as the stats page container
- [ ] Implement `<RetentionChart>`: SVG bar chart of reviews per day for last 30 days; each bar has `aria-label` with date and count; uses `--color-success` / `--color-danger` fill; shows "No data yet" when no reviews
- [ ] Implement `<ForecastChart>`: SVG bar chart of cards due per day for next 14 days; computed from card `dueDate` values across all crypts; each bar has `aria-label`
- [ ] Display retention percentage: `correctReviews30d / totalReviews30d`; "No data yet" when zero reviews
- [ ] Write stats tests: `retentionRate` signal computes correctly from review log; forecast counts match cards with matching due dates; "No data yet" rendered when review log empty

---

## Task 12 — Settings Panel
*Prerequisites: Tasks 5, 7*
*Refs: US-24–29, AC-24.1–24.4, AC-25.4, AC-26.1–26.5, AC-27.1–27.3, AC-28.1–28.4, AC-29.1–29.4*

- [ ] Implement `<SettingsPanel>`: accessible panel with sections for Audio, Appearance, Language, Data
- [ ] Implement `<CowardModeToggle>`: checkbox that updates `cowardMode` signal; persisted; visually labelled; independent of `reducedMotion`
- [ ] Implement reduced-motion user override toggle: sets `reducedMotion` signal override; labelled clearly as separate from OS setting
- [ ] Implement volume slider: range [0,1]; updates master `GainNode` gain; persisted
- [ ] Implement show-captions toggle: persisted; described in AC-25.4
- [ ] Implement `<LanguageSelector>`: radio or select for `en` / `ja`; updates locale signal; UI updates immediately without reload; persisted
- [ ] Implement `<ExportImport>`: Export button triggers `exportJson()` → downloads file with timestamped name; Import file input triggers `importJson()`; plays `importSuccess()` on success; shows localised error on failure
- [ ] Write settings tests: coward mode toggle persists to prefs signal; language switch updates rendered text immediately; export produces valid JSON; import with invalid JSON shows error and does not mutate state

---

## Task 13 — Accessibility Audit and Polish
*Prerequisites: Tasks 8–12*
*Refs: US-24–28, AC-15.1–15.4, AC-17.2–17.3, AC-27.1–27.3, AC-28.1–28.4, NFR (Lighthouse ≥ 90)*

- [ ] Add `axe-core` / `vitest-axe` and run automated accessibility checks on `<GraveyardScene>`, `<SeanceSession>`, `<LedgerView>`, `<SettingsPanel>`, `<CryptList>` — all must pass with zero violations
- [ ] Audit and fix Tab order across all views; ensure no keyboard traps outside modals
- [ ] Verify all modal dialogs trap focus and restore focus on close (AC-28.3)
- [ ] Verify `prefers-reduced-motion` runtime change (via `matchMedia` listener) updates signal without reload (AC-24.4)
- [ ] Implement caption live region `<div aria-live="polite">` in app root; wire to audio caption display (AC-25.1); implement auto-hide timer (AC-25.3)
- [ ] Verify WCAG AA contrast ratios for all colour token pairs in §1.3 of spooky-design-system (use automated contrast-check utility or manual audit)
- [ ] Verify all tombstone and ghost SVG elements have `role` and `aria-label` (AC-17.2, AC-28.2)
- [ ] Run Lighthouse in CI (or document manual Lighthouse run); achieve accessibility score ≥ 90

---

## Task 14 — Build, Performance, and Deployment
*Prerequisites: Tasks 1–13*
*Refs: NFR-01 (performance), NFR-03 (privacy), product success criteria*

- [ ] Profile graveyard scene with 200 cards; assert render time ≤ 16ms per frame; optimise SVG reuse with `<use>` elements if needed
- [ ] Measure and verify initial gzipped JS bundle ≤ 150 KB; tree-shake any unused Preact features
- [ ] Verify `schedule()` call executes in ≤ 0.1ms using `performance.now()` benchmark in a test
- [ ] Confirm no outbound network requests beyond page assets and Google Fonts (AC-NFR-03.1); audit network tab
- [ ] Add `cloudflare pages` deploy configuration (`wrangler.toml` or Pages project settings); static output from `dist/`
- [ ] Write `README.md`: project overview, local setup, build, test, deploy instructions, license
- [ ] Final CI check: `typecheck` + `test --run` (all property tests included) + `build` all pass
- [ ] Verify JSON round-trip end-to-end: export from app → clear localStorage → import → assert identical graveyard state (manual smoke test documented in README)
