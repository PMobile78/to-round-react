# Plan 006: Collapse the 5 hand-written design files into a data-driven factory

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/theme/`
> If any design file changed since this plan was written, re-read it before
> abstracting; on mismatch with the excerpt, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (isolated to `src/theme/`)
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

The five design skins (`classic`, `modern`, `clay`, `aurora`, `brutalist`) total ~1249 lines and are structurally identical key-for-key — same `palette`/`typography`/`shape`/`components`/`custom` shape, only the values differ. Four of the five define the same nine `Mui*` component overrides. There is no factory; each file re-declares the entire MUI theme object by hand. Adding or changing a shared override means editing five files in lockstep (and silently risking divergence). A data-driven factory + per-design value tables collapses the bulk of those lines and makes a new skin a small value object instead of a 250-line copy.

## Current state

Each design is a function `(mode) => themeObject`. Confirmed identical top-level keys across all five: `palette, typography, shape, shadows?, components, custom`. The `custom` block keys are identical in all five: `design, bubble{strokeWidth,highlightStrokeWidth,defaultStroke,fill{tagAlpha,defaultFill},effect,effectParams,label}, canvasBackground, headerStrip{show,sx}, backdrop, buttonStyles, outlinedButtonStyles, dialogPaper`.

The leanest design, in full, to show the shape (`src/theme/designs/classic.js`):

```js
export const classic = (mode) => {
  const palettes = { light: {...}, dark: {...} };
  const c = palettes[mode];
  // classic also builds a 24-element MUI shadows array via buildClassicShadows()
  return {
    palette: { mode, primary:{main:c.primary}, secondary:{main:'#FF6B6B'}, success:{main:'#4caf50'},
      warning:{main:'#ff9800'}, error:{main:'#f44336'}, info:{main:'#2196f3'},
      background:{default:c.backgroundDefault, paper:c.paper, bubbleView:c.bubbleView},
      text:{primary:c.textPrimary, secondary:c.textSecondary}, divider:c.divider },
    typography: { fontFamily: '...', h1..h6:{fontWeight:500}, button:{fontWeight:500, textTransform:'uppercase'} },
    shape: { borderRadius: 4 },
    shadows: buildClassicShadows(),
    components: { MuiCssBaseline:{...}, MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}}, MuiButton:{styleOverrides:{root:{borderRadius:4}}} },
    custom: { design:'classic', bubble:{...}, canvasBackground:c.bubbleView, headerStrip:{show:false,sx:{}}, backdrop:'none', buttonStyles:{...}, outlinedButtonStyles:{...}, dialogPaper:{borderRadius:'4px'} },
  };
};
```

`modern/clay/aurora/brutalist` add the same set of extra overrides (`MuiChip, MuiCssBaseline, MuiDialog, MuiDrawer, MuiFab, MuiLink, MuiOutlinedInput, MuiPaper, MuiButton`) — confirm by reading each.

The registry that consumes them (`src/theme/designs/index.js`):
```js
export const DESIGNS = { /* id -> { ...metadata, module } */ };
export const getDesignMetadata = (designId) => DESIGNS[designId];
export const getDesignModule = (designId) => { /* returns the design fn */ };
export const getAllDesignIds = () => Object.keys(DESIGNS);
export const getWorkingDesignIds = () => /* ... */;
```
The theme object each design returns is fed to MUI `createTheme` somewhere downstream (search `createTheme` — likely in `src/hooks/useThemeMode.js` or `src/App.jsx`). Do not change that consumer's contract: the factory output must be shape-identical to today's.

There are existing tests at `src/theme/designs/__tests__/designs.test.js` — they pin the contract. They must keep passing unchanged.

### Conventions

- ES modules, named exports, 2-space indentation in `src/theme/` (match the existing design files, which differ from the 4-space app code).
- `alpha` from `@mui/material/styles`.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`                      | exit 0              |
| Theme test| `npx vitest run src/theme/designs/__tests__/designs.test.js` | all pass |
| Tests     | `npm test`                                       | all pass            |
| Lint      | `npm run lint`                                   | exit 0              |
| Build     | `npm run build`                                  | exit 0 (once, at end) |

## Scope

**In scope**:
- `src/theme/buildDesign.js` (create — the factory)
- `src/theme/designs/classic.js`, `modern.js`, `clay.js`, `aurora.js`, `brutalist.js` (rewrite as value tables calling the factory)
- `src/theme/designs/index.js` (only if registry wiring needs a tweak)

**Out of scope**:
- The downstream `createTheme` consumer and `useThemeMode.js` — the factory output must match today's shape so they need no change.
- `src/theme/designs/__tests__/designs.test.js` — must pass unchanged; if it can't, that's a STOP condition (your factory changed the contract).
- Adding new design skins or new tokens.

## Git workflow

- Branch: `advisor/006-design-factory`
- Conventional commits (`refactor(theme): data-driven design factory`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Characterize the contract first (safety net)

Before refactoring, confirm the theme test pins enough. If `designs.test.js` only checks a few keys, ADD assertions first (in a separate commit) that snapshot the full returned object shape for each design in both modes (key presence + the `custom.*` values). This becomes your equivalence guard. Run it green against the CURRENT files.

**Verify**: `npx vitest run src/theme/designs/__tests__/designs.test.js` → all pass on the unmodified design files.

### Step 2: Write `buildDesign.js`

Create a factory that takes a per-design config and returns the theme object:
```js
// buildDesign(config) -> (mode) => themeObject
// config: { id, palette:{light,dark}, tokens:{ borderRadius, fontFamily, textTransform, shadows? },
//           bubble:{...}, headerStrip, backdrop, buttonStyles, outlinedButtonStyles, dialogPaper,
//           componentOverrides?(c, mode) }
export const buildDesign = (config) => (mode) => { /* assemble palette/typography/shape/components/custom from config */ };
```
The factory builds the shared structure (palette, typography defaults, shape, the common `Mui*` overrides) and merges per-design `componentOverrides` and `custom` values. Keep the exact default values the designs currently use so output is byte-equivalent where values are unchanged.

**Verify**: `npm run lint` → exit 0.

### Step 3: Convert one design (classic) and prove equivalence

Rewrite `classic.js` to `export const classic = buildDesign({ ...classic values... });`. Run the theme test. Output must equal the pre-refactor object (your Step 1 snapshot).

**Verify**: `npx vitest run src/theme/designs/__tests__/designs.test.js` → all pass.

### Step 4: Convert the remaining four

Repeat for `modern`, `clay`, `aurora`, `brutalist`. Move each one's unique `Mui*` overrides into its `componentOverrides`. Run the theme test after each.

**Verify after each**: `npx vitest run src/theme/designs/__tests__/designs.test.js` → all pass.

### Step 5: Full verification

**Verify**: `npm test` → all pass. `npm run build` → exit 0. `wc -l src/theme/designs/*.js` → total substantially reduced vs. ~1249.

## Test plan

- Strengthen `src/theme/designs/__tests__/designs.test.js` (Step 1) to assert, per design × mode: presence of `palette/typography/shape/components/custom`, and the concrete `custom.bubble.strokeWidth`, `custom.canvasBackground`, `custom.dialogPaper`, `palette.primary.main`, `shape.borderRadius` values. These are the equivalence guard.
- Verification: the theme test passes against the OLD files (Step 1) and the NEW files (Steps 3-4) with no assertion changes between.

## Done criteria

- [ ] `src/theme/buildDesign.js` exists; all five design files call it
- [ ] `npx vitest run src/theme/designs/__tests__/designs.test.js` passes (same assertions before and after)
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] Total LOC of `src/theme/designs/*.js` is well below 1249
- [ ] Downstream `createTheme` consumer unchanged (`git status` shows no edits outside scope)
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- A design's theme object cannot be reproduced byte-equivalently by the factory (some design has a genuinely unique structure, not just unique values) — keep that design hand-written and factor only the others; report which and why.
- The `designs.test.js` contract must change to make the factory pass — that means behavior drifted; STOP.
- `classic`'s 24-element shadows array (`buildClassicShadows`) differs from the other designs' shadows in a way the factory can't express cleanly — leave shadows per-design and factor the rest.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- A new skin is now a value object passed to `buildDesign` — document this in `src/theme/designs/index.js`.
- Reviewer: confirm the visual result is unchanged by switching through all five skins in the Appearance dialog in both light and dark mode.
- If a future token needs to vary per design, add it to the factory config rather than reintroducing a hand-written theme.
