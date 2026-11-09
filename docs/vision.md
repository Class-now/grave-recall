# Grave Recall — product vision (input for Kiro)

Category: Kiroween 2026 "Costume Contest" (haunting, polished UI where spooky elements enhance function).

## Problem
Language learners (the author studies English and French at university) forget vocabulary because they skip reviews.
Spaced-repetition apps work, but their UI is a sterile to-do list, so the "debt" of overdue cards is invisible and boring.

## Concept
Your vocabulary is a graveyard. Every word you learn is buried under a tombstone.
As its memory decays (computed by a real spaced-repetition model), the grave visibly degrades: moss, cracks, fog.
When a word is overdue it rises as a ghost that drifts over the graveyard and gets more restless the longer you ignore it.
Reviewing a word = "laying the ghost to rest": you see the word, try to recall, flip, and grade yourself (Again / Hard / Good / Easy).
A correct recall seals the grave again with a candle; a failure makes the ghost scream (synthesized audio, no samples) and stay.

Spooky elements must carry meaning (function-first horror):
- Fog density over the graveyard = total overdue load.
- Ghost restlessness / opacity = how overdue each card is (retrievability).
- Tombstone age/cracks = card stability (how well-known it is).
- Moon phase in the sky = today's progress towards the daily goal.
- Crow on the gate = streak keeper.

## Features (MVP)
1. Decks ("Crypts"): create, rename, delete. Ship one bundled starter crypt (100 common English words with simple definitions, written by us, no copyrighted dataset) and one French starter crypt (50 words).
2. Add cards (front/back/optional example), bulk import from pasted TSV/CSV.
3. Scheduler: FSRS-style memory model (stability, difficulty, retrievability) implemented in TypeScript as a pure module, with property-based tests (fast-check).
4. Review session ("Séance"): keyboard-first (Space flip, 1-4 grade), touch friendly.
5. Graveyard view: SVG/Canvas scene generated from the card states; click a grave to inspect a card.
6. Stats ("Ledger of the Dead"): reviews per day, retention, forecast.
7. Persistence: localStorage + JSON export/import. No backend, no login.
8. Accessibility: prefers-reduced-motion disables drifting/jumpscares, captions for every sound, WCAG AA contrast, full keyboard navigation, "Coward mode" toggle turns screams into soft chimes.
9. i18n of UI: English (default) and Japanese.

## Tech
Vite + TypeScript + vanilla (or Preact) + SVG/Canvas, Web Audio API for all sound (procedurally synthesized). Vitest + fast-check. Static deploy to Cloudflare Pages. MIT license.
