---
inclusion: always
---

# Grave Recall — Product Steering

## Identity

**Grave Recall** is a spaced-repetition vocabulary app where every word lives as a grave in a procedurally generated graveyard. Its core differentiator is *function-first horror*: every spooky visual and audio element encodes a real memory-model value. The aesthetic is the UI, not a skin over it.

## Target User

University-level language learners who study two or more languages simultaneously (primary persona: Japanese speaker studying English and French). They are comfortable with technology, motivated, but prone to skipping review sessions when the interface feels like a sterile to-do list.

## Core Problems We Solve

1. **Invisible debt** — overdue cards accumulate silently; learners cannot feel the weight of forgetting. Grave Recall makes that debt visceral (fog, ghosts, restlessness).
2. **Boring obligation** — reviewing feels like a chore. The graveyard aesthetic creates curiosity ("which ghost is haunting me tonight?") that replaces dread with engagement.
3. **No backend friction** — privacy-first, no account required; all data stays in the browser.

## Product Pillars

| Pillar | Description |
|---|---|
| **Function-first horror** | Every spooky effect must map 1-to-1 to a measurable card/session state. Decoration for its own sake is rejected. |
| **Keyboard-first interaction** | All primary flows must be completable without a mouse. Touch is a first-class secondary input. |
| **Accessible by default** | `prefers-reduced-motion`, captions for every sound, WCAG AA contrast, "Coward mode" toggle — these are not optional add-ons. |
| **Pure-client, zero backend** | localStorage + JSON export/import. Static deploy. No login, no tracking. |
| **Scheduler correctness** | The FSRS-style memory model is a pure TypeScript module with property-based tests. Correctness > feature richness. |

## MVP Feature Scope

1. **Decks ("Crypts")** — create, rename, delete; two bundled starter crypts (100 English + 50 French common words, original content, no copyrighted datasets).
2. **Card authoring** — front / back / optional example sentence; bulk import from pasted TSV or CSV.
3. **Scheduler** — FSRS-style (stability, difficulty, retrievability) as an isolated pure module.
4. **Review session ("Séance")** — Space = flip, 1–4 = grade (Again / Hard / Good / Easy), keyboard-first, touch-friendly.
5. **Graveyard view** — SVG/Canvas scene generated from live card states; click a grave to inspect.
6. **Stats ("Ledger of the Dead")** — reviews per day, retention percentage, forecast of upcoming load.
7. **Persistence** — localStorage primary store; JSON export / import for backup/migration.
8. **Accessibility** — reduced-motion, captions, WCAG AA, full keyboard nav, Coward mode.
9. **i18n** — English (default) and Japanese UI strings.

## Out of Scope (v1)

- Cloud sync, user accounts, social features.
- Audio samples / pre-recorded sounds (Web Audio synthesis only).
- Copyrighted word lists or dictionary APIs.
- Mobile-native packaging (PWA installability is a nice-to-have but not required).

## Semantic Mapping (spooky ↔ data)

| Visual/Audio Effect | Data Source |
|---|---|
| Fog density over graveyard | Total overdue card count |
| Ghost opacity / restlessness | Per-card retrievability (how overdue) |
| Tombstone age / cracks | Card stability score |
| Moon phase in sky | Today's progress toward daily goal |
| Crow on gate | Current streak (days) |
| Ghost scream on failure | Incorrect recall event |
| Candle seal on grave | Successful review |

## Success Criteria (MVP Launch)

- A new user can create a crypt, add cards, and complete a review session within 5 minutes, with no tutorial.
- All spooky effects are legible: a sighted user can read card state from the graveyard without opening a card.
- Lighthouse accessibility score ≥ 90.
- All scheduler property tests pass in CI.
- JSON round-trip: export → clear localStorage → import restores identical state.
