# Plan 010: Introduce a bubbles/tags store (context) — remove the 5 pageDeps ref-bridges and the ~130-prop forwarder

> ⛔ **SUPERSEDED (2026-06-30).** This monolithic plan stalled twice (incl. an Opus pass): the executor introduced `BubblesStore` and removed 3/5 bridges but could not finish `crudDepsRef`/`tagPageDepsRef` or collapse `BubblesDialogs` in one pass. It has been **split into four sequential sub-plans — execute those instead**: `010a-bubbles-store-foundation.md` → `010b-migrate-usetags.md` → `010c-migrate-usebubblecrud.md` → `010d-collapse-bubblesdialogs.md`. The abandoned reference branch `advisor/010-bubbles-store` is kept for guidance. Keep this file only as design background.

> **Executor instructions**: This is the largest and riskiest plan. Follow it
> step by step, commit after each step, and run verification before moving on.
> If a STOP condition occurs, stop and report — do not improvise. When done,
> update the status row in `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/pages/BubblesPage.jsx src/hooks/ src/components/BubblesDialogs.jsx`
> If these changed since this plan was written (Plans 001-009 likely will have),
> the line numbers below are stale: re-read `BubblesPage.jsx` end to end and map
> the concepts (not the lines) before starting. The *approach* still holds.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 001 (helpers), 002 (storage), 003 (dialog dedup), 009 (robustness) — land these first so this refactor moves clean code, not duplicated code.
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

`BubblesPage.jsx` (1136 lines) was decomposed into feature hooks, but those hooks all operate on the same shared `bubbles`/`tags` state, so they aren't actually independent. To wire them up, the page threads **five mutable "ref bridges"** (`crudDepsRef`, `tagPageDepsRef`, `filterPageDepsRef`, `listFilterPageDepsRef`, `importExportPageDepsRef`), each reassigned every render and read at call-time inside the hooks. This defeats React's data flow, creates stale-closure hazards, and forces manual freshness management. It also produces a `BubblesDialogs` component that receives ~130 individual props purely to forward them. The line count dropped but the orchestration complexity didn't — it moved into bridges. A single owner of `bubbles`+`tags`+derived selectors, consumed via React context, deletes all five bridges and the prop forwarder, and lets the feature hooks read shared state directly.

## Current state

The five bridges (declared, then reassigned every render, then read in hooks):

```js
// src/pages/BubblesPage.jsx — declarations
const crudDepsRef = useRef({});            // :67   passed as deps: crudDepsRef to useBubbleCrud (:91)
const tagPageDepsRef = useRef({});         // :106  passed as pageDeps to useTags (:131)
const filterPageDepsRef = useRef({});      // :136  passed as pageDeps to useBubbleFilters (:156)
const listFilterPageDepsRef = useRef({});  // :162  passed as pageDeps to useListFilters (:174)
const importExportPageDepsRef = useRef({});// :179  passed as pageDeps to useBubbleImportExport (:183)

// ...reassigned mid-render every render:
tagPageDepsRef.current = { setBubbles, setFilterTags, setListFilterTags, getBubbleFillStyle };   // :273
crudDepsRef.current = { tags, selectedTagId, setSelectedTagId, selectedCategory, ... };           // :323
filterPageDepsRef.current = { bubbles, searchFoundBubbles, debouncedSearchQuery: ... };           // :507
listFilterPageDepsRef.current = { bubbles, listFilter, listSearchQuery };                         // :515
importExportPageDepsRef.current = { bubbles, tags };                                              // :523
```

Hook-side reads (the bridge consumers):
```js
// src/hooks/useTags.js:91,143      const { setFilterTags, setListFilterTags } = pageDeps.current; ...
// src/hooks/useBubbleFilters.js:299  const deps = (pageDeps && pageDeps.current) || {};
// src/hooks/useListFilters.js:153,166
// src/hooks/useBubbleImportExport.js:23
// src/hooks/useBubbleCrud.js — receives deps: crudDepsRef
```

The prop forwarder: `BubblesDialogs` is rendered with ~130 props (`src/pages/BubblesPage.jsx:979-1110`).

The shared state actually lives in `useState`/hook returns on the page: `bubbles` (`:59`), and `tags`/`selectedTagId`/… returned from `useTags` (`:107-131`), filter state from `useBubbleFilters`/`useListFilters`, CRUD/dialog state from `useBubbleCrud`, notification state from `useBubbleNotifications`.

### Conventions

- React context lives under `src/` (create `src/state/` or `src/context/`). Functional components, hooks named `useX`.
- 4-space indentation. Match existing hook signatures where you can to minimize churn.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`   | exit 0              |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Build     | `npm run build`               | exit 0              |

## Scope

**In scope**:
- `src/state/BubblesStore.jsx` (create — context provider owning `bubbles`, `tags`, and the cross-hook setters/selectors)
- `src/pages/BubblesPage.jsx`
- `src/hooks/useTags.js`, `useBubbleFilters.js`, `useListFilters.js`, `useBubbleImportExport.js`, `useBubbleCrud.js`
- `src/components/BubblesDialogs.jsx`
- The hooks' existing test files (`src/hooks/__tests__/*`) — update to the new signatures

**Out of scope**:
- `useMatterEngine.js`, `useBubbleNotifications.js` internals beyond reading shared state (don't rewrite the physics or rAF loops).
- Visual/behavioral changes of any kind — this is a pure structural refactor.
- Combining this with any other plan's concern.

## Git workflow

- Branch: `advisor/010-bubbles-store`
- Commit after EACH step. Conventional commits (`refactor(state): introduce BubblesStore context`, `refactor(tags): consume BubblesStore instead of pageDeps`).
- Do NOT push or open a PR unless instructed.

## Steps

> Strategy: strangler pattern. Introduce the store, migrate hooks off the
> bridges one at a time (each hook keeps working via the store), delete each
> bridge as its last consumer leaves, then finally collapse the prop forwarder.
> The app must build and pass tests after every step.

### Step 0: Safety net — characterize current behavior

Before changing structure, ensure the hook tests cover the bridge-fed callbacks. Existing tests: `src/hooks/__tests__/useBubbleFilters.test.js`, `useListFilters.test.js`, `tagColors.test.js`. If the bridge-dependent paths (e.g. `getBubbleCountByTagForBubblesView` reading `pageDeps.current.bubbles`) aren't covered, add tests that pin current outputs first. Run green.

**Verify**: `npm test` → all pass.

### Step 1: Create the store

`src/state/BubblesStore.jsx`: a context provider that owns `bubbles` (move the `useState` from the page) and exposes `tags` + setters. Start minimal — it holds `bubbles`, `setBubbles`, `tags`, `setTags`, and the derived values currently passed through bridges (`getBubbleFillStyle` will still be computed in the page initially; you can move it later). Provide a `useBubblesStore()` hook. Wrap `<BubblesPage/>`'s subtree in the provider (in `BubblesPage` or its parent).

**Verify**: `npm run build` → exit 0; app still renders (the store exists but nothing consumes it yet).

### Step 2: Migrate `useBubbleImportExport` off its bridge

It only needs `bubbles` + `tags` at call-time (`importExportPageDepsRef`). Have it call `useBubblesStore()` instead of receiving `pageDeps`. Delete `importExportPageDepsRef` (`:179`, `:523`) and its prop. Update the hook's tests if any.

**Verify**: `grep -n "importExportPageDepsRef" src/pages/BubblesPage.jsx` → no matches. `npm test` → all pass.

### Step 3: Migrate `useListFilters`, then `useBubbleFilters`

Each reads `bubbles` + search/list state via its bridge. Move those reads to `useBubblesStore()` (and pass the still-page-owned search/list-filter values explicitly if they don't belong in the store yet). Delete `listFilterPageDepsRef` then `filterPageDepsRef` once their last reads are gone. Update `useBubbleFilters.test.js` / `useListFilters.test.js` to the new signature.

**Verify after each**: `npm test` → all pass; `grep -n "filterPageDepsRef\|listFilterPageDepsRef" src/pages/BubblesPage.jsx` → no matches.

### Step 4: Migrate `useTags`

`useTags` reads `setBubbles, setFilterTags, setListFilterTags, getBubbleFillStyle` from its bridge. `setBubbles`/`getBubbleFillStyle` come from the store; `setFilterTags`/`setListFilterTags` belong to the filter hooks — expose them through the store (the store can hold the filter-tag state, or the filter hooks can register their setters with the store). Pick the smaller change. Delete `tagPageDepsRef`.

**Verify**: `npm test` → all pass; `grep -n "tagPageDepsRef" src/pages/BubblesPage.jsx` → no matches.

### Step 5: Migrate `useBubbleCrud`

It receives `deps: crudDepsRef` carrying `tags, selectedTagId, selectedCategory, getBubbleFillStyle, canvasSize, due/notification state…`. Move the bubble/tag/style parts to the store; pass the genuinely page-local UI state (canvasSize, notification dialog state) as normal props. Delete `crudDepsRef`.

**Verify**: `grep -rn "pageDeps\|DepsRef\|crudDeps" src/pages/BubblesPage.jsx src/hooks` → no matches. `npm test` → all pass.

### Step 6: Collapse the `BubblesDialogs` prop forwarder

With shared state in the store, `BubblesDialogs` and the dialogs it renders read `bubbles`/`tags`/setters from `useBubblesStore()` instead of receiving them as props. Remove the now-redundant props from the `<BubblesDialogs .../>` call (`:979-1110`) and from `BubblesDialogs`'s signature, keeping only genuinely page-local UI props (dialog open flags, handlers not in the store). Target: the prop list shrinks dramatically (aim < 40).

**Verify**: the `<BubblesDialogs` JSX prop count is far smaller; `npm run build` → exit 0; `npm test` → all pass.

### Step 7: Final verification + manual smoke

**Verify**: `npm test` → all pass. `npm run lint` → exit 0. `npm run build` → exit 0. `grep -rn "pageDeps\|DepsRef" src` → no matches. `wc -l src/pages/BubblesPage.jsx` → meaningfully smaller (target < 800).

## Test plan

- Strengthen hook tests first (Step 0) so the migration is guarded.
- After each hook migration, its test file must pass with the new signature.
- Manual smoke (report results) — exercise everything that touched the bridges: create/edit/delete/mark-done a bubble; add/edit/delete a tag and confirm bubbles recolor; bubble-view tag filters + counts; list-view filters + counts; search; JSON import/export; category panel selection. All must behave exactly as before.
- Verification: `npm test` → all pass.

## Done criteria

ALL must hold:
- [ ] `grep -rn "pageDeps\|DepsRef\|crudDeps" src` → no matches
- [ ] `src/state/BubblesStore.jsx` exists and is the single owner of shared `bubbles`/`tags`
- [ ] `<BubblesDialogs />` is called with far fewer props (target < 40; was ~130)
- [ ] `wc -l src/pages/BubblesPage.jsx` < 800
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] Manual smoke checklist passed (documented in report)
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:
- After migrating a hook, a behavior changes (counts wrong, filters off, bubbles don't recolor, import breaks) and you can't restore parity within the step — revert that step's commit and report.
- A bridge carries a value whose timing matters (it was read at call-time *specifically* to get a fresh value mid-render) and moving it to context changes when it updates — describe the timing dependency rather than forcing it.
- The render-order coupling the bridge comments describe (e.g. "useTags ↔ useBubbleFilters cycle") reappears as a real cycle in the store — STOP and report; the store boundary may need a different split.
- Any verification fails twice after a reasonable fix.
- `BubblesPage.jsx` has drifted so far from the excerpts that the mapping is unclear — re-read and re-plan before editing.

## Maintenance notes

- This is the keystone refactor; do it LAST (after 001/002/003/009) so it moves clean code.
- After it lands, new bubble/tag features consume `useBubblesStore()` — there must never be a new `pageDeps` bridge. Add that to PR review.
- Reviewer: scrutinize timing — context updates on render; the bridges were a (bad) workaround for call-time freshness. Verify no selector reads stale state. The manual smoke checklist is the real gate here, not just green tests.
- If the store grows too large, split into `BubblesStore` (data) and `BubblesUiStore` (dialog/filter UI state) — but only after this lands and is stable.
