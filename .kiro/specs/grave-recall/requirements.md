---
inclusion: always
---

# Grave Recall — Requirements

## User Stories and EARS Acceptance Criteria

EARS notation key:
- **Ubiquitous:** `The <system> shall <action>.`
- **Event-driven:** `When <trigger>, the <system> shall <action>.`
- **State-driven:** `While <state>, the <system> shall <action>.`
- **Optional feature:** `Where <feature is included>, the <system> shall <action>.`
- **Unwanted behaviour:** `If <condition>, then the <system> shall <action>.`

---

## Epic 1 — Deck (Crypt) Management

### US-01 Create a Crypt
As a learner, I want to create a new named crypt so that I can organise vocabulary by topic or language.

**AC-01.1** When the user activates "New Crypt", the system shall create a crypt with a unique ID, a user-provided name (1–80 characters), and zero cards.
**AC-01.2** If the user submits an empty or whitespace-only name, then the system shall display a validation error and not create the crypt.
**AC-01.3** The system shall persist every new crypt to localStorage immediately upon creation.
**AC-01.4** When a crypt is created, the system shall navigate the user to that crypt's card list view.

### US-02 Rename a Crypt
As a learner, I want to rename a crypt so that I can correct mistakes or reorganise.

**AC-02.1** When the user submits a new name for a crypt, the system shall update the crypt name and persist the change.
**AC-02.2** If the new name is empty or whitespace-only, then the system shall display a validation error and retain the old name.
**AC-02.3** Renaming shall not alter any card data or scheduler state within the crypt.

### US-03 Delete a Crypt
As a learner, I want to delete a crypt and all its cards so that I can remove content I no longer need.

**AC-03.1** When the user confirms crypt deletion, the system shall remove the crypt and all its cards from the store and from localStorage.
**AC-03.2** The system shall require an explicit confirmation step (e.g., confirmation dialog) before executing deletion.
**AC-03.3** If a review session is active for the crypt being deleted, then the system shall end the session before deleting.

### US-04 Bundled Starter Crypts
As a new user, I want pre-loaded starter crypts so that I can begin reviewing immediately without manual data entry.

**AC-04.1** The system shall ship two starter crypts: "English Essentials" (100 words) and "Français Débutant" (50 words).
**AC-04.2** Starter crypts shall be loaded from `public/starter-crypts/` JSON files on first app launch (empty localStorage).
**AC-04.3** If starter crypts are already present in localStorage, then the system shall not overwrite them.
**AC-04.4** All starter crypt content shall be original; no copyrighted word lists may be included.

---

## Epic 2 — Card Authoring

### US-05 Add a Card
As a learner, I want to add individual vocabulary cards to a crypt so that I can study new words.

**AC-05.1** When the user submits a new card, the system shall create a card with a unique ID, a non-empty front (1–200 characters), a non-empty back (1–500 characters), an optional example sentence (0–500 characters), and an initial scheduler state (new card).
**AC-05.2** If front or back is empty, then the system shall display a field-level validation error and not create the card.
**AC-05.3** When a card is created, the system shall persist it to localStorage immediately.

### US-06 Edit a Card
As a learner, I want to edit a card's front, back, and example sentence so that I can fix errors.

**AC-06.1** When the user submits edited card content, the system shall update the card's text fields and persist the change.
**AC-06.2** Editing a card's text shall not reset its scheduler state.
**AC-06.3** If the edited front or back would be empty, then the system shall display a validation error and retain the original values.

### US-07 Delete a Card
As a learner, I want to delete individual cards so that I can remove words I no longer need to study.

**AC-07.1** When the user confirms card deletion, the system shall remove the card from its crypt and from localStorage.
**AC-07.2** The system shall require a single-step confirmation before deletion (e.g., a confirmation prompt or hold-to-delete).

### US-08 Bulk Import
As a learner, I want to paste TSV or CSV text to import multiple cards at once so that I can populate a crypt quickly.

**AC-08.1** When the user pastes text and submits the import form, the system shall parse each line as `front[delimiter]back[optional delimiter][example]`.
**AC-08.2** The system shall accept both tab-separated (TSV) and comma-separated (CSV) formats, auto-detecting the delimiter.
**AC-08.3** If a line is malformed (no delimiter, front empty, back empty), then the system shall skip that line and report the count of skipped lines to the user after import.
**AC-08.4** The system shall import a minimum of 1 and a maximum of 500 cards per bulk operation.
**AC-08.5** When import completes, the system shall display a summary: cards imported, cards skipped.
**AC-08.6** Bulk-imported cards shall each receive an initial scheduler state (new card) identical to manually added cards.

---

## Epic 3 — Scheduler

### US-09 Initial Card State
As a learner, I want new cards to start with a sensible default state so that the scheduler works correctly from the first review.

**AC-09.1** The system shall initialise every new card with: `stability = 1.0` day, `difficulty = 5.0` (scale 1–10), `retrievability = 1.0`, `lapses = 0`, `reps = 0`, `state = "new"`, `dueDate = now`.
**AC-09.2** Initial state shall be produced by the `initCard()` function in `src/scheduler/index.ts`.

### US-10 Review Scheduling
As a learner, I want the scheduler to compute my next review date based on my recall grade so that difficult words appear more often than easy ones.

**AC-10.1** When the user grades a card, the system shall compute a new `CardState` using `schedule(cardState, grade, now)`.
**AC-10.2** The system shall support four grades: `0 = Again`, `1 = Hard`, `2 = Good`, `3 = Easy`.
**AC-10.3** After a `Good` (2) grade, the new interval shall be greater than the previous interval.
**AC-10.4** After an `Again` (0) grade, the new interval shall be reset to a value ≤ 1 day and `lapses` shall be incremented.
**AC-10.5** After an `Easy` (3) grade, the new interval shall be strictly greater than after a `Good` (2) grade on the same card state.
**AC-10.6** `retrievability` at the moment of review shall be computed as `R(t) = e^(−t / (S · λ))` where `t` is days since last review, `S` is current stability, and `λ = ln(10/9) ≈ 0.10536` (the forgetting rate constant that gives R=0.9 after one stability period).
**AC-10.7** After a successful review (`grade ≥ 1`), new stability `S'` shall be computed using the SRS stability formula defined in design.md.
**AC-10.8** `difficulty` shall be adjusted after each review using the difficulty-update formula defined in design.md and clamped to `[1, 10]`.
**AC-10.9** The scheduler module shall be a pure function with no side effects.

### US-11 Due Cards
As a learner, I want to see only cards that are due today so that I am not overwhelmed.

**AC-11.1** The system shall expose a derived signal `dueCards` containing all cards with `dueDate ≤ now`.
**AC-11.2** The system shall expose a derived signal `overdueCards` containing all cards with `dueDate < today` (strictly before today's date).
**AC-11.3** `dueCards` shall be re-computed reactively whenever any card's `dueDate` changes or the current time crosses midnight.

---

## Epic 4 — Review Session (Séance)

### US-12 Start a Séance
As a learner, I want to start a review session for due cards so that I can study efficiently.

**AC-12.1** When the user starts a Séance for a crypt, the system shall load all `dueCards` for that crypt in random order into the session queue.
**AC-12.2** If there are no due cards, then the system shall display a "no cards due" message and not start a session.
**AC-12.3** The system shall display the count of cards remaining in the session header.

### US-13 Card Flip
As a learner, I want to flip a card to reveal the answer so that I can test my recall before seeing the answer.

**AC-13.1** When the user presses Space or taps the card, the system shall reveal the card's back face.
**AC-13.2** While the card is face-down, grade buttons shall be hidden or disabled.
**AC-13.3** When the card is face-up, grade buttons shall become visible and focusable.
**AC-13.4** The flip action shall play the `pageTurn` sound and display its caption.

### US-14 Grade a Card
As a learner, I want to grade my recall (Again / Hard / Good / Easy) so that the scheduler updates my next review date.

**AC-14.1** When the user presses 1–4 or taps a grade button, the system shall call `schedule()` with the corresponding grade and update the card's state.
**AC-14.2** Key bindings shall be: `1 = Again`, `2 = Hard`, `3 = Good`, `4 = Easy`.
**AC-14.3** When grade `Again` (1) is given, the system shall play `ghostScream()` (or `softChime()` in Coward mode) and display its caption.
**AC-14.4** When grade `Good` (3) or `Easy` (4) is given, the system shall play `candleSeal()` and display its caption.
**AC-14.5** When grade `Hard` (2) is given, the system shall play `hardThud()` and display its caption.
**AC-14.6** After grading, the system shall advance to the next card in the queue.
**AC-14.7** When the queue is empty, the system shall play `sessionEndToll()`, display the session summary, and navigate to the graveyard view.

### US-15 Keyboard-First Navigation
As a learner, I want to complete a full review session using only the keyboard so that I can review efficiently without a mouse.

**AC-15.1** All interactive elements in the Séance view shall be reachable and activatable by keyboard (Tab, Enter, Space, 1–4).
**AC-15.2** Focus shall move automatically to the flip button when a new card is shown.
**AC-15.3** Focus shall move automatically to the "Again" grade button when the card is flipped.
**AC-15.4** The system shall display a visible focus indicator on all focused elements meeting WCAG AA contrast requirements.

---

## Epic 5 — Graveyard View

### US-16 Graveyard Scene Generation
As a learner, I want to see my vocabulary as a visual graveyard so that I can intuitively understand the state of my knowledge.

**AC-16.1** The system shall render one tombstone SVG element per card in the active crypt.
**AC-16.2** Each tombstone's visual state (fill colour, crack opacity, moss opacity) shall be derived from the card's `stability` value using the formulas in the design system.
**AC-16.3** Each overdue card shall render an additional ghost element whose opacity is derived from `1 - retrievability`.
**AC-16.4** The fog layer opacity shall be derived from `overdueCount / totalCards`, clamped to `[0.05, 0.60]`.
**AC-16.5** The moon phase arc shall reflect `reviewsDoneToday / dailyGoal`.
**AC-16.6** The crow element shall display with glowing eye when `streakDays ≥ 3`.
**AC-16.7** The graveyard scene shall render within 16 ms for up to 200 cards (60 fps target).

### US-17 Card Inspection
As a learner, I want to click or focus a tombstone to inspect the card so that I can review its content without starting a session.

**AC-17.1** When the user clicks or presses Enter on a tombstone, the system shall display a card detail panel showing front, back, example, stability, retrievability, and due date.
**AC-17.2** Each tombstone shall have an `aria-label` containing the card front text and its due date.
**AC-17.3** The card detail panel shall be dismissible via Escape key or a close button.

---

## Epic 6 — Stats (Ledger of the Dead)

### US-18 Daily Review History
As a learner, I want to see how many cards I reviewed each day so that I can track my study habit.

**AC-18.1** The system shall record the count of reviews completed per calendar day.
**AC-18.2** The Ledger shall display a bar chart of reviews per day for the last 30 days.
**AC-18.3** The chart shall be accessible: bars shall have `aria-label` values describing the date and count.

### US-19 Retention Rate
As a learner, I want to see my current retention rate so that I can judge how well my studying is working.

**AC-19.1** The system shall compute retention as `correctReviews / totalReviews` over the last 30 days, displayed as a percentage.
**AC-19.2** If there are no reviews in the last 30 days, then the system shall display "No data yet" rather than a percentage.

### US-20 Forecast
As a learner, I want to see how many cards are due in the coming days so that I can plan my study schedule.

**AC-20.1** The system shall display a forecast chart showing the count of cards due on each of the next 14 days.
**AC-20.2** The forecast shall be computed from `dueDate` values of all cards across all crypts.

---

## Epic 7 — Persistence

### US-21 localStorage Persistence
As a learner, I want my data to survive page reloads so that I do not lose my progress.

**AC-21.1** The system shall write the full application state to localStorage whenever any card, crypt, or preference changes.
**AC-21.2** On app startup, the system shall read state from localStorage if present and restore it exactly.
**AC-21.3** If localStorage is unavailable (e.g., private browsing with storage blocked), then the system shall display a warning banner and continue operating in-memory.

### US-22 JSON Export
As a learner, I want to export all my data as a JSON file so that I can back it up or migrate to another device.

**AC-22.1** When the user triggers export, the system shall produce a JSON file conforming to the `AppExport` schema (version, crypts, cards with scheduler state, preferences, export timestamp).
**AC-22.2** The exported file shall be downloaded via the browser's file download mechanism with a timestamped filename.

### US-23 JSON Import
As a learner, I want to import a previously exported JSON file so that I can restore my data.

**AC-23.1** When the user selects a valid export file, the system shall replace the current state with the imported data and persist to localStorage.
**AC-23.2** If the file is invalid JSON or does not conform to the `AppExport` schema, then the system shall display an error and not modify existing state.
**AC-23.3** When import succeeds, the system shall play `importSuccess()` and display its caption.
**AC-23.4** The round-trip property shall hold: exporting then importing shall produce a state identical to the original (see design.md correctness properties).

---

## Epic 8 — Accessibility

### US-24 Reduced Motion
As a user with vestibular or motion-sensitivity conditions, I want animations to be suppressed so that the app does not cause discomfort.

**AC-24.1** The system shall read `prefers-reduced-motion: reduce` from the browser and store it as a reactive signal on startup.
**AC-24.2** While `reducedMotion` signal is true, the system shall disable all drifting, floating, and jumpscare animations.
**AC-24.3** State-change transitions (card flip, tombstone crack appearance) shall remain as instant cross-fades (≤ 150ms) even in reduced-motion mode.
**AC-24.4** The system shall respond to runtime changes to `prefers-reduced-motion` without requiring a page reload.

### US-25 Sound Captions
As a user who is deaf or hard-of-hearing, I want every synthesised sound to have a text caption so that I receive the same informational feedback as hearing users.

**AC-25.1** The system shall display a caption string in a live region (`aria-live="polite"`) whenever a sound plays.
**AC-25.2** Every sound in the sound catalogue shall have a corresponding caption key in both `en.ts` and `ja.ts`.
**AC-25.3** The caption bar shall auto-hide after the sound duration plus 500ms.
**AC-25.4** Users shall be able to permanently show the caption bar via a Settings toggle.

### US-26 Coward Mode
As a user sensitive to horror elements, I want a toggle to replace frightening sounds and visuals with gentler alternatives so that I can use the app comfortably.

**AC-26.1** When Coward mode is enabled, the system shall replace `ghostScream()` with `softChime()` for all subsequent reviews.
**AC-26.2** When Coward mode is enabled, the system shall suppress all jumpscare flash animations.
**AC-26.3** All other sounds and visual effects shall remain unchanged in Coward mode.
**AC-26.4** The Coward mode toggle shall be persistently stored in preferences and restored on reload.
**AC-26.5** Coward mode shall not suppress reduced-motion behaviour; the two settings are independent.

### US-27 WCAG AA Contrast
As a user with low vision, I want all text to meet WCAG AA contrast ratios so that the app is legible.

**AC-27.1** All normal text shall achieve a contrast ratio ≥ 4.5:1 against its background.
**AC-27.2** All large text (≥ 18pt or ≥ 14pt bold) and UI component boundaries shall achieve ≥ 3:1.
**AC-27.3** Focus indicators shall achieve ≥ 3:1 against adjacent colours.

### US-28 Full Keyboard Navigation
As a user who cannot use a mouse, I want to navigate and operate all features by keyboard so that the app is fully accessible.

**AC-28.1** All interactive elements shall be reachable via Tab and Shift+Tab.
**AC-28.2** All interactive SVG elements shall have `role`, `aria-label`, and keyboard event handlers.
**AC-28.3** Modal dialogs shall trap focus while open and restore focus to the trigger element on close.
**AC-28.4** No keyboard trap shall exist outside of intentional modal dialogs.

---

## Epic 9 — i18n

### US-29 Language Selection
As a Japanese-speaking learner, I want to switch the UI language to Japanese so that I can use the app in my native language.

**AC-29.1** The system shall support English (default) and Japanese UI strings.
**AC-29.2** When the user selects a language, all UI strings shall update immediately without a page reload.
**AC-29.3** The selected language shall be persisted in preferences and restored on reload.
**AC-29.4** If a translation key is missing in the active locale, then the system shall fall back to the English string and log a console warning.

---

## Non-Functional Requirements

### NFR-01 Performance
**AC-NFR-01.1** The graveyard scene shall render within 16ms per frame for up to 200 cards.
**AC-NFR-01.2** Initial page load (cold, no cache) shall transfer ≤ 150 KB of gzipped JavaScript.
**AC-NFR-01.3** The `schedule()` function shall complete in ≤ 0.1ms.

### NFR-02 Correctness
**AC-NFR-02.1** All scheduler property tests (fast-check) shall pass in CI on every commit.
**AC-NFR-02.2** The JSON round-trip property shall be verified by an automated test.

### NFR-03 Privacy
**AC-NFR-03.1** The system shall make no outbound network requests except to load the initial page assets and Google Fonts.
**AC-NFR-03.2** No analytics, telemetry, or third-party trackers shall be included.
