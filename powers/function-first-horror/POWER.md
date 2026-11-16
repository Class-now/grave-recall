---
name: "function-first-horror"
displayName: "Function-First Horror"
description: "Every visual or audio effect in the UI declares the data it shows. Steering rules, a CSS token template and a read-only reviewer agent that finds effects with no data source."
keywords:
  - function-first
  - effect-to-data
  - data source
  - spooky
  - horror
  - atmosphere
  - animation catalogue
  - sound catalogue
  - design tokens
  - reduced motion
  - design-warden
author: "Grave Recall"
---

# Function-First Horror

## What it is

A design rule for apps that want a strong mood (horror, fantasy, noir) without decoration for its own sake: **every effect that moves, glows, changes colour or shape, or makes a sound must show a named piece of data.** Fog density shows a backlog size, a flicker shows a state, a chime shows an event. If an effect has no data source it does not ship.

The power packages four things:

| File | Purpose |
|---|---|
| `steering/function-first-horror.md` | The rules: effect-to-data table, token, motion and sound rules, the closed exception for static backdrop |
| `templates/tokens.css` | CSS custom properties to start from: palette roles, data-mapped tokens, motion timing |
| `agents/design-warden.json` | A read-only reviewer agent that checks a diff against the rules |
| `plugin.json` | Manifest with the activation keywords |

## When to activate

Activate when the user is:

- adding or reviewing an animation, glow, particle, fog, shake, flash or colour change that reacts to app state,
- adding a sound effect or its caption,
- choosing colours, durations or easing for atmosphere,
- asking whether a decoration is "allowed", or asking for an effect with no obvious meaning,
- setting up a design review for a themed UI.

Keywords: function-first, effect-to-data, data source, spooky, horror, atmosphere, animation catalogue, sound catalogue, design tokens, reduced motion, design-warden.

## Onboarding

Do these once per project.

1. Copy `steering/function-first-horror.md` to `.kiro/steering/function-first-horror.md`.
2. Copy `templates/tokens.css` into the project's stylesheet entry point (for example `src/tokens.css`), rename the example data tokens, and mirror every value in a TypeScript constants file if SVG attributes need them at runtime.
3. Create the project's own **Effect-to-Data Master Table** in the steering file, section 5. Start it empty. It is the single source of truth.
4. Copy `agents/design-warden.json` to `.kiro/agents/design-warden.json`. Edit the `resources` list if the steering file has another name or location.
5. Check that the Playwright MCP server is available if you want the reviewer to look at a served build. The agent file declares it, so no other setup is needed.
6. Validate the agent: `kiro-cli agent validate --path .kiro/agents/design-warden.json`.

## How to use

Adding an effect:

1. Name the data. Write the row in the Master Table first: effect, type (visual, motion or audio), data source, formula, reduced-motion substitute.
2. Implement it using tokens only. No colour literal, no millisecond literal, no random values.
3. Add a caption for any new sound and an entry in the animation or sound catalogue.
4. Run the reviewer: `kiro-cli chat --agent design-warden` and give it the diff or the file list.

Reviewing:

- Start the reviewer with the changed files. It reports effects with no data source, hard-coded colour or time values outside the tokens, and sounds without a caption key. It ends with `VERDICT: PASS` or `VERDICT: FAIL`.
- Pass a localhost URL of a served build if you want it to look at the rendered result. It only observes.

Static backdrop (sky, silhouettes, frames) is allowed without a data source only if it is on the closed list in the steering file, is hand-authored, never varies with state, and is hidden from assistive technology.

## Steering files

- `steering/function-first-horror.md`

## Agent

- `agents/design-warden.json`: read-only (read tools plus read-only browser tools), no write or shell tools.
