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
| Motion rules | `src/motion-rules.test.ts` | Every `@keyframes` animates only `transform` and `opacity`. No `animation` or `transition` has a literal duration. Every infinite animation has a paused rule for a hidden tab. With reduced motion on, the Graveyard, Seance and header render none of the animation classes (CP-60, CP-62) |
| Backdrop purity | `src/backdrop-purity.test.ts` | Graveyard backdrop, seance candle props and page frame ornaments render identical markup for an empty store, a populated store and `ja`, and are `aria-hidden` with no role, focusable element or text (CP-01, CP-02) |

### Colour pairs added by the costume polish (Tasks 1 to 7)

All rows are asserted in `src/design/contrast.test.ts`. "Min" is the WCAG AA ratio the test requires:
4.5:1 for text, 3:1 for focus indicators, component boundaries and graphics that carry meaning.

| Where | Foreground on background | Min | Test group |
|---|---|---|---|
| Page wash behind all views | text-primary, text-secondary on sky-top and sky-horizon | 4.5 | page frame |
| Page wash | focus-ring on sky-top and sky-horizon | 3 | page frame |
| Stone-slab tabs | text-primary on stone-dark and stone-mid (hover, current tab) | 4.5 | stone-slab tab pairs |
| Stone-slab tabs | focus-ring on stone-dark and stone-mid; tab border stone-crumbled on stone-dark | 3 | stone-slab tab pairs, page frame |
| Seance card | text-inverse and ink-secondary on parchment | 4.5 | seance table and parchment card |
| Seance card | ink-secondary border on parchment; parchment card on stone-dark and grave-soil (table) | 3 | sweep of tasks 1 to 7 |
| Seance candle | candle-flame on stone-dark and grave-soil (table) | 3 | sweep of tasks 1 to 7 |
| Ledger page | text-primary and text-secondary on surface-panel and on the stone-dark ruling | 4.5 | ledger page and charts |
| Ledger charts | chart-moss, chart-blood, chart-bone on surface-panel; void hatch line on chart-blood | 3 | ledger page and charts |
| Ledger page | frame border stone-crumbled on surface-panel | 3 | ledger page and charts |
| Fresh plot | stone-worn outline on hill-far, hill-near, ground-fore and void (depth shade) | 3 | empty and first-run states |
| Fresh plot, graves | focus-ring on hill-near and ground-fore | 3 | empty and first-run states |
| Moon | moon-full on moon-new (lit wedge on unlit disc) | 3 | graveyard backdrop and moon |
| Moon | stone-crumbled rim on moon-new, and on the halo at the rim (halo opacity about 0.2 over sky-horizon) | 3 | sweep of tasks 1 to 7, blended backdrop |
| Crow | stone-crumbled outline on the sky at the top of the crow, sky-horizon and hill-far | 3 | blended backdrop |
| Fog over a focused grave | focus-ring under maximum fog (0.6) on grave-soil | 3 | fog over grave focus |

The Task 8 sweep found one failing pair. The crow outline was stone-worn, which is 2.96:1 against the
sky at the top of the crow (the crow now sits on the sky and the far hill, not on the void). The outline
is now stone-crumbled (4.48:1).

#### Parchment two-tone focus ring

The flip control on the parchment card draws its focus indicator as two rings, because no single colour
reaches 3:1 against both the light parchment and the dark table:

| Ring | Colour | Drawn on | Ratio | Test |
|---|---|---|---|---|
| Inner (`box-shadow: 0 0 0 2px`) | void | parchment | 14.5:1, test requires 3 | `void (inner focus ring) on parchment` |
| Outer (`outline: 2px`, offset 2px) | focus-ring | table, between grave-soil and stone-dark | 8.8:1 and 6.8:1, test requires 3 | `focus-ring on grave-soil (table edge)`, `focus-ring on stone-dark (table centre)` |

#### Known gaps

- Tombstone boundaries. A tombstone is a `role="button"`, and its dark stones (stone-dark and nearby
  fills) are close to the backdrop hills (about 1.4:1 for stone-dark on hill-near). This is unchanged by
  the costume polish (stone-dark on the old void background was similar). The state of each grave is
  read from fill, cracks and moss, and every grave has an `aria-label` and a 3:1 focus stroke. A stronger
  outline would change the look of the stability gradient, so it is left for the owner to decide.
- Lighthouse has not been run for the costume polish. Use the manual run below.
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
