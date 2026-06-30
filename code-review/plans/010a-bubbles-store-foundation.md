# Plan 010a: Introduce BubblesStore context + migrate the 3 low-risk ref-bridges

> Part 1 of 4 splitting the original monolithic Plan 010 (which proved too large for one executor pass). Sequence: **010a → 010b → 010c → 010d**.
>
> **Executor instructions**: Follow step by step; run every verification before continuing; honor STOP conditions; commit per step. When done, update the status row in `code-review/plans/README.md`.
>
> **Base / drift**: Your worktree may branch from an older commit. FIRST: `git checkout -b advisor/010a-store-foundation && git merge main --no-edit` so you are on top of current `main` (which contains plans 001–009). Confirm `git rev-parse --short HEAD == git rev-parse --short main`. There is no 996a2ce drift check for this plan.
>
> **Reference implementation**: branch `advisor/010-bubbles-store` (the abandoned monolith) already implemented this foundation and passed tests — read its `src/state/BubblesStore.jsx` and its diffs to `useBubbleImportExport/useBubbleFilters/useListFilters` as a proven starting point. Reuse what works; do not merge that branch.

## Status
- **Priority**: P1 · **Effort**: M · **Risk**: MED · **Depends on**: plans 001,002,003,009 (all merged in main) · **Category**: tech-debt
- **Planned at**: commit `000ca27` (state of PR #84), 2026-06-30

## Why this matters
`BubblesPage.jsx` wires five mutable "ref bridges" (`crudDepsRef`, `tagPageDepsRef`, `filterPageDepsRef`, `listFilterPageDepsRef`, `importExportPageDepsRef`) because feature hooks share `bubbles`/`tags` state. This plan introduces a single owner — a `BubblesStore` context — and removes the 3 lowest-risk bridges. The harder two (tags, crud) follow in 010b/010c.

## Current state
In `src/pages/BubblesPage.jsx`: `bubbles` is `useState` on the page; `importExportPageDepsRef` (declared ~line 179, assigned ~524), `filterPageDepsRef` (~136/507), `listFilterPageDepsRef` (~162/515) are `useRef({})` reassigned every render and read at call-time inside `useBubbleImportExport`/`useBubbleFilters`/`useListFilters` via `pageDeps.current`. (Line numbers approximate — re-read the file.)

### Conventions
- React context under `src/state/`. 4-space indent. Colors from theme. Match existing hook signatures where possible.

## Commands
| Purpose | Command | Expected |
|---|---|---|
| Install | `npm ci --legacy-peer-deps` | exit 0 |
| Tests | `npm test` | all pass |
| Lint | `npm run lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope
**In scope**: `src/state/BubblesStore.jsx` (create), `src/App.jsx` (provider wrap), `src/pages/BubblesPage.jsx`, `src/hooks/useBubbleImportExport.js`, `src/hooks/useBubbleFilters.js`, `src/hooks/useListFilters.js`, the filter hooks' tests in `src/hooks/__tests__/`.
**Out of scope**: `useTags` (010b), `useBubbleCrud` (010c), `BubblesDialogs` (010d). Do NOT touch `crudDepsRef` or `tagPageDepsRef` yet — they stay until their plans.

## Steps
1. **Safety net**: `npm test` green before changes; if filter-hook tests don't cover the `pageDeps`-fed callbacks (`getBubbleCountByTagForBubblesView`, `getBubbleCountByTagForListView`), add tests pinning current outputs.
2. **Create `BubblesStore.jsx`**: context provider owning `bubbles`/`setBubbles` (move the `useState` from the page) + `tags`/`setTags` (still set by useTags for now — expose a setter the page registers) + a `register(callbacks)` method so hooks can publish setters/callbacks for cross-hook use. Expose `useBubblesStore()`. Wrap `<BubblesPage>`'s subtree in `<BubblesStoreProvider>` in `App.jsx`. **Verify**: `npm run build` exit 0; app renders.
3. **Migrate `useBubbleImportExport`** to read `bubbles`/`tags` from `useBubblesStore()`; delete `importExportPageDepsRef` + its assignment + the prop. **Verify**: `grep -n importExportPageDepsRef src/pages/BubblesPage.jsx` → none; `npm test` green.
4. **Migrate `useListFilters`** then **`useBubbleFilters`** to read `bubbles` + search/list state from the store (register their `setFilterTags`/`setListFilterTags` into the store for 010b's useTags to consume). Delete `listFilterPageDepsRef` then `filterPageDepsRef`. Update their tests. **Verify after each**: `npm test` green; the two refs gone.
5. **Full verify**: `npm test`, `npm run lint`, `npm run build` all green.

## Done criteria
- [ ] `grep -rn "importExportPageDepsRef\|filterPageDepsRef\|listFilterPageDepsRef" src` → no matches
- [ ] `src/state/BubblesStore.jsx` exists; `useTags`/`useBubbleCrud` still use their refs (untouched)
- [ ] `npm test` + `npm run lint` + `npm run build` all exit 0
- [ ] `code-review/plans/README.md` row updated

## STOP conditions
- Any filter/count/search/import behavior changes and can't be restored in-step → revert that step, report.
- The store boundary reintroduces the `useTags ↔ useBubbleFilters` cycle as a real cycle → STOP, report.
- Verification fails twice after a reasonable fix.

## Maintenance notes
- After 010a, the page still has `crudDepsRef` + `tagPageDepsRef` — that's expected; 010b/010c remove them.
- Reviewer: confirm bubble counts (per-tag, planned), list filters, search highlight, and JSON import/export all behave identically (manual smoke).
