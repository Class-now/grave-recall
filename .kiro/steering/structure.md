---
inclusion: always
---

# Grave Recall — Project Structure Steering

## Directory Layout

```
grave-recall/
├── .kiro/
│   ├── steering/
│   │   ├── product.md
│   │   ├── tech.md
│   │   ├── structure.md
│   │   └── spooky-design-system.md
│   └── specs/
│       └── grave-recall/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
├── docs/
│   └── vision.md
├── public/
│   └── starter-crypts/
│       ├── english-100.json
│       └── french-50.json
├── src/
│   ├── main.ts                  # App entry point; mounts Preact root
│   ├── app.tsx                  # Root component; router / view switcher
│   │
│   ├── scheduler/               # PURE module — no DOM, no localStorage, no signals
│   │   ├── index.ts             # Public API: schedule(), retrievability(), initCard()
│   │   ├── types.ts             # CardState, Grade, ScheduleResult
│   │   ├── fsrs.ts              # Core FSRS-style math
│   │   └── scheduler.test.ts    # Vitest + fast-check property tests
│   │
│   ├── store/                   # Reactive state (signals)
│   │   ├── index.ts             # Re-exports all signals and actions
│   │   ├── decks.ts             # Crypt list, active crypt
│   │   ├── cards.ts             # All cards, derived overdue/due collections
│   │   ├── session.ts           # Active review session state
│   │   ├── stats.ts             # Derived stats signals
│   │   ├── prefs.ts             # User preferences: volume, coward mode, language
│   │   └── persistence.ts       # localStorage read/write, JSON export/import
│   │
│   ├── components/
│   │   ├── frame/               # Page frame: header, logo, stone-slab tabs
│   │   │   ├── SiteHeader.tsx
│   │   │   ├── TombstoneLogo.tsx
│   │   │   ├── frame.css
│   │   │   └── frame.test.ts
│   │   │
│   │   ├── graveyard/           # The main graveyard SVG scene
│   │   │   ├── GraveyardScene.tsx
│   │   │   ├── Tombstone.tsx    # Per-card grave, visual state from stability
│   │   │   ├── Ghost.tsx        # Per-overdue-card ghost, opacity from retrievability
│   │   │   ├── FogLayer.tsx     # Fog SVG filter, intensity from overdue count
│   │   │   ├── MoonPhase.tsx    # Moon SVG, phase from daily progress
│   │   │   ├── CrowKeeper.tsx   # Crow SVG, visible/animated by streak
│   │   │   ├── mapping-freeze.test.ts  # Golden outputs of the data-to-visual mappings
│   │   │   └── graveyard.test.ts
│   │   │
│   │   ├── review/              # Séance review session
│   │   │   ├── SeanceSession.tsx
│   │   │   ├── FlipCard.tsx
│   │   │   ├── GradeButtons.tsx
│   │   │   └── review.test.ts
│   │   │
│   │   ├── deck/                # Crypt management and card authoring
│   │   │   ├── CryptList.tsx
│   │   │   ├── CryptEditor.tsx
│   │   │   ├── CardEditor.tsx
│   │   │   ├── BulkImport.tsx
│   │   │   └── deck.test.ts
│   │   │
│   │   ├── stats/               # Ledger of the Dead
│   │   │   ├── LedgerView.tsx
│   │   │   ├── RetentionChart.tsx
│   │   │   ├── ForecastChart.tsx
│   │   │   └── stats.test.ts
│   │   │
│   │   └── settings/            # Preferences panel
│   │       ├── SettingsPanel.tsx
│   │       ├── CowardModeToggle.tsx
│   │       ├── LanguageSelector.tsx
│   │       ├── ExportImport.tsx
│   │       └── settings.test.ts
│   │
│   ├── audio/                   # Web Audio synthesis (no audio files)
│   │   ├── context.ts           # Lazy AudioContext singleton
│   │   ├── synth.ts             # Low-level oscillator/filter helpers
│   │   ├── sounds.ts            # Named sounds: ghostScream(), candleSeal(), softChime()
│   │   ├── captions.ts          # Caption strings for every sound (referenced by i18n)
│   │   └── audio.test.ts
│   │
│   ├── i18n/
│   │   ├── index.ts             # t(key) helper; locale signal
│   │   ├── types.ts             # TranslationKey union type
│   │   ├── en.ts                # English strings
│   │   └── ja.ts                # Japanese strings
│   │
│   ├── design/
│   │   └── tokens.ts            # Re-exports design token constants from spooky-design-system
│   │
│   └── utils/
│       ├── csv.ts               # TSV/CSV parser
│       ├── id.ts                # Deterministic ID generation (crypto.randomUUID fallback)
│       ├── date.ts              # Date arithmetic helpers (days since, days until)
│       └── utils.test.ts
│
├── index.html
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

## Module Boundary Rules

### 1. `scheduler/` is an island
- Zero imports from anywhere outside `scheduler/`.
- No Preact, no DOM APIs, no `localStorage`, no signals.
- Only dependency: TypeScript built-ins and `Date`.
- Violation of this rule is a build error (enforced via a path alias restriction in `tsconfig.json` `paths`).

### 2. `audio/` never imports from `components/`
- Audio is triggered by store actions or component event handlers, not by component internals.
- Components call named functions from `audio/sounds.ts`; they do not construct oscillators themselves.

### 3. `store/` never imports from `components/`
- Store is the single source of truth; components read from it and dispatch actions to it.
- No circular deps: `components → store → scheduler/utils`; never the reverse.

### 4. `i18n/` depends only on `store/prefs.ts`
- The locale signal lives in `store/prefs.ts`; `i18n/index.ts` reads it.

### 5. `design/tokens.ts` is a leaf
- No imports from any other `src/` module.
- All other modules may import from it.

## File Naming Conventions

| Pattern | Usage |
|---|---|
| `PascalCase.tsx` | Preact components |
| `camelCase.ts` | Non-component TypeScript modules |
| `*.test.ts` | Vitest test files, co-located with source |
| `types.ts` | Type-only files (interfaces, enums, branded types) |
| `index.ts` | Public API barrel; only re-exports, no logic |

## Co-location Policy

- Tests live next to the source file they test (`scheduler/fsrs.ts` → `scheduler/scheduler.test.ts`).
- No separate `__tests__` directories.
- Shared test fixtures go in `src/__fixtures__/` if needed across modules.

## Starter Crypt Format

`public/starter-crypts/*.json` files must conform to the `DeckExport` type (defined in `store/persistence.ts`):

```jsonc
{
  "version": 1,
  "name": "string",
  "language": "en | fr | ja | ...",
  "cards": [
    {
      "front": "string",
      "back": "string",
      "example": "string | null"
    }
  ]
}
```

Content must be original (no copyrighted word lists). Each starter crypt ships with at minimum:
- English: 100 common vocabulary words with plain English definitions.
- French: 50 common French words with English translations.

## Import Order Convention

Within any `.ts` / `.tsx` file, imports are ordered:

1. External packages (e.g., `preact`, `@preact/signals`)
2. Internal absolute paths by layer depth (scheduler → store → audio → i18n → design → utils → components)
3. Relative imports within the same directory

Separate each group with a blank line.
