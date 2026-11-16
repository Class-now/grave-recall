# Grave Recall

A spaced-repetition vocabulary app where every word is a grave in a procedurally generated graveyard. Each spooky element shows a real memory-model value:

| You see | It means |
|---|---|
| Fog over the graveyard | How many cards are overdue |
| A ghost over a grave | The card is overdue. The fainter it is, the better you still remember it |
| Cracks and moss on a tombstone | The card's stability |
| Moon phase | Today's progress toward the daily goal |
| Crow on the gate | Your streak in days |

Scheduling uses an FSRS-style model (stability, difficulty, retrievability) in a pure TypeScript module with property-based tests.

The app runs entirely in the browser. There is no account and no backend. Data stays in `localStorage`, and you can back it up with JSON export and import. Sounds are synthesised with the Web Audio API, so there are no audio files.

Features: crypts (decks) with bundled English (100 words) and French (50 words) starters, card authoring with TSV/CSV bulk import, a keyboard-first review session (Space flips, 1 to 4 grades), the graveyard view, a stats view ("Ledger of the Dead"), English and Japanese UI, reduced-motion support, sound captions and a Coward mode that replaces screams with a soft chime.

## Local setup

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc --noEmit` (strict mode) |
| `npx vitest run` | All tests once, including the scheduler property tests |
| `npm run test:coverage` | Tests with a coverage report |
| `npm run build` | Type-check, then build the static site into `dist/` |
| `npm run preview` | Serve `dist/` locally |

CI should run `typecheck`, `npx vitest run` and `build` on every pull request.

## Deploy to Cloudflare Pages

The site is static, and `wrangler.toml` sets `pages_build_output_dir = "dist"`. Nothing is deployed from this repository automatically.

**Option A: Git integration (recommended).** In the Cloudflare dashboard, go to Workers & Pages, then Create, then Pages, then Connect to Git. Pick this repository and use:

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION` = `20`

**Option B: Direct upload from your machine.** This needs a Cloudflare login, so run it yourself:

```bash
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name grave-recall
```

## Performance and privacy checks

Most budgets are enforced by tests, so `npx vitest run` covers them.

| Requirement | Budget | How it is checked |
|---|---|---|
| AC-NFR-01.1 | Graveyard with 200 cards renders within 16 ms | `src/perf.test.ts` re-renders the scene after a grade and asserts the median is at most 16 ms. It runs in jsdom, which is slower than a browser. Manual check below |
| AC-NFR-01.2 | Initial JS at most 150 KB gzipped | `src/bundle.test.ts` runs the production build in memory and gzips each JS chunk (currently about 28 KB). It also fails if `preact/compat`, `preact/debug` or `preact/devtools` get bundled |
| AC-NFR-01.3 | `schedule()` at most 0.1 ms | `src/perf.test.ts` times 20,000 calls and asserts the mean per call |
| AC-NFR-03.1 | No outbound requests except page assets and Google Fonts | `src/privacy.test.ts` scans the source for network APIs (the only `fetch` is the same-origin load of the starter crypts) and runs the app with all network APIs stubbed. `src/bundle.test.ts` checks the built files reference only `fonts.googleapis.com` and `fonts.gstatic.com`, and that every local file linked from `index.html` exists |
| AC-NFR-03.2 | No analytics or trackers | `src/bundle.test.ts` scans the built files for common tracker snippets |

### Manual check: frame time with 200 cards

1. `npm run build && npm run preview`, then open the app in Chrome.
2. Import a backup with 200 cards (or paste 200 rows into Bulk Import) and open The Graveyard.
3. Open DevTools, then Performance. Record while you grade one card in Seance, then return to the graveyard.
4. The scripting and rendering work for the update should fit in one 16 ms frame.

### Manual check: network audit

1. Open DevTools, then Network, tick Disable cache and reload with local storage cleared (Application, then Storage, then Clear site data).
2. Expected requests: `index.html`, one JS file, one CSS file, `grave.svg`, the two `/starter-crypts/*.json` files, and the Google Fonts stylesheet and font files.
3. Nothing else should appear while you create a crypt, review cards, change settings, and export or import data.

### Manual smoke test: JSON round-trip

An automated version of this is in `src/roundtrip.test.ts`. To check it in a real browser:

1. Open The Graveyard and note the scene: the number of graves and ghosts, the fog, the moon and the crow. Take a screenshot.
2. Open Settings and choose Export Data. A JSON file is downloaded.
3. In DevTools, go to Application, then Local Storage, and clear the site's entries. Reload. The app starts from the starter crypts.
4. Open Settings, choose Import Data and select the exported file.
5. Open The Graveyard again. It should match the screenshot, apart from the ghost opacities, which drift slowly with the clock.

## Project layout

```
src/scheduler/   Pure FSRS-style module (no DOM, no storage, no signals)
src/store/       Signals, persistence, JSON export and import
src/components/  Graveyard, review, deck, stats and settings views
src/audio/       Web Audio synthesis and sound captions
src/i18n/        English and Japanese strings
src/design/      Design tokens and contrast helpers
src/utils/       CSV parser, IDs, date helpers
public/          Starter crypts and the favicon
```

## License

MIT. See [LICENSE](LICENSE).
