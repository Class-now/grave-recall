# Accessibility audit

Target: Lighthouse accessibility score of 90 or higher (product success criteria, NFR).
The checks below split into what CI runs on every change and what needs a real browser.

## Automated checks (`npx vitest run`)

| Area | Test file | What it checks |
|---|---|---|
| axe-core, zero violations | `src/a11y.test.ts` | `GraveyardScene` (with ghosts and the detail panel open), `SeanceSession` (face-down, face-up, empty), `LedgerView`, `SettingsPanel` (en and ja), `CryptList` (list, form error, delete dialog), `CryptEditor`, and the whole `App` in every view with page-level rules on |
| SVG semantics | `src/a11y.test.ts` | Every tombstone has `role="button"`, an `aria-label` and Enter/Space handlers. Every ghost has `role="img"` and an `aria-label` (AC-17.2, AC-28.2) |
| Tab order, keyboard traps | `src/a11y.test.ts` | In each view Tab visits every control once in document order and leaves the last one. No positive `tabindex`. The graveyard is one Tab stop with arrow-key navigation (AC-28.1, AC-28.4) |
| Modal dialogs | `src/a11y.test.ts` | Delete dialogs move focus in, trap Tab and Shift+Tab, close on Escape and Cancel, and return focus to the trigger (AC-28.3) |
| Reduced motion at runtime | `src/store/reduced-motion.test.ts` | A `matchMedia` change event updates `reducedMotion` without a reload, and the user override wins (AC-24.4) |
| Caption live region | `src/components/captions/captions.test.ts` | `aria-live="polite"` region in the app root, auto-hide after duration + 500 ms, permanent mode (AC-25.1, AC-25.3, AC-25.4) |
| Colour contrast | `src/design/contrast.test.ts` | All pairs in spooky-design-system section 1.3, plus the other pairs used in component CSS, and that `index.css` matches `tokens.ts` |

axe cannot compute colour contrast in jsdom (no layout, no stylesheets), so the `color-contrast` rule is
off in the axe tests. Contrast is covered by `contrast.test.ts` from the token values instead.
Lighthouse (below) is the check that sees the real rendered colours.

## Lighthouse (manual run)

Lighthouse was not run as part of the build for Task 13. It needs a served production build and a
browser, and the project rules say to start the dev/preview server by hand. Run it like this:

1. Build and serve the production bundle.

   ```bash
   npm run build
   npm run preview        # serves dist/ on http://localhost:4173
   ```

2. In a second terminal, run Lighthouse against it (Chrome or Edge must be installed).
   Write the report outside the repository.

   ```bash
   npx lighthouse http://localhost:4173 --only-categories=accessibility --output=html --output-path=%TEMP%\grave-recall-lighthouse.html --chrome-flags="--headless=new"
   ```

   On macOS or Linux use `$TMPDIR` or `/tmp` for `--output-path`.
   Alternative without the CLI: open the preview URL in Chrome, open DevTools, choose the Lighthouse
   tab, select only Accessibility, mode Navigation, and click "Analyze page load".

3. Pass criteria: accessibility score of 90 or higher.
   Repeat after switching to each view, because Lighthouse only audits what is on screen at load:
   the app opens on Crypts, so also run it with the Graveyard, Séance, Ledger and Settings views
   open (use DevTools, Lighthouse, mode "Snapshot" while that view is showing).

4. Record the result in the table below (date, commit, view, score, notes).

| Date | Commit | View | Score | Notes |
|---|---|---|---|---|
| | | | | |

### Things Lighthouse can flag that the automated tests cannot

- `color-contrast`: the most likely source of a lower score. The pairs in the CSS were audited from the
  tokens. Two changes came out of that audit: the danger button no longer puts light text on the danger
  red (4.15:1), and button and input borders use `--color-stone-crumbled` instead of `--color-border`
  (1.6:1 on the page background) to reach 3:1 for component boundaries.
- Text drawn over the SVG scene and the Google Fonts fallback chain. Fonts load from Google Fonts at
  runtime, so contrast and size are checked with the fallback fonts as well.
- Touch target size on small screens.

## Manual keyboard and screen-reader pass

Before a release, also try the app with the keyboard only (no mouse) and with one screen reader
(NVDA with Firefox or Chrome on Windows, VoiceOver with Safari on macOS):

1. Tab from the address bar through the navigation into each view and back out with Shift+Tab.
2. Graveyard: Tab once into the scene, move with the arrow keys, Home and End, open a grave with
   Enter, close it with Escape, and check focus returns to that grave.
3. Séance: Space flips, 1 to 4 grade; each sound's caption is announced politely and does not
   interrupt reading the card.
4. Delete a crypt: focus stays inside the dialog until Cancel, Escape or Confirm.
5. Switch the OS "reduce motion" setting while the app is open; ghosts and the fog should stop
   moving without a reload.
6. Switch the language to Japanese and confirm the screen reader changes voice.
