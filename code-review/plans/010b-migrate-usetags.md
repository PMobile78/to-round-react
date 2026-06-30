# Plan 010b: Migrate useTags off tagPageDepsRef

> Part 2 of 4 (after 010a). Sequence: 010a → **010b** → 010c → 010d.
>
> **Base / drift**: `git checkout -b advisor/010b-usetags && git merge main --no-edit`; confirm HEAD == main. No 996a2ce drift check. Requires **010a already merged** (BubblesStore must exist). If `src/state/BubblesStore.jsx` is absent, STOP — 010a not landed.
>
> **Reference**: branch `advisor/010-bubbles-store` migrated `useTags` too — read its `useTags.js` diff as a guide (but verify against the actual current code; that branch over-reported some steps).

## Status
- **Priority**: P1 · **Effort**: M · **Risk**: MED · **Depends on**: 010a · **Category**: tech-debt
- **Planned at**: commit `000ca27`, 2026-06-30

## Why this matters
`useTags` reads page-owned callbacks via `tagPageDepsRef` (a mutable ref bridge). With the store from 010a in place, those can come from the store instead, deleting the bridge.

## Current state
`src/pages/BubblesPage.jsx`: `tagPageDepsRef = useRef({})` (~line 106), reassigned every render (~line 273) with `{ setBubbles, setFilterTags, setListFilterTags, getBubbleFillStyle }`. `src/hooks/useTags.js` reads `pageDeps.current` (e.g. `handleSaveTag` ~line 91, `handleDeleteTag` ~line 143) for `setFilterTags/setListFilterTags` and `setBubbles/getBubbleFillStyle`. `getBubbleFillStyle` is defined in `BubblesPage` (~line 260) and depends on `bubbleBackgroundEnabled` (page state) + theme — so it must NOT move into the store wholesale; register the callback instead.

### Conventions
4-space indent; colors from theme; reuse 010a's store `register()` mechanism.

## Commands
Same as 010a (`npm ci --legacy-peer-deps`, `npm test`, `npm run lint`, `npm run build`).

## Scope
**In scope**: `src/pages/BubblesPage.jsx`, `src/hooks/useTags.js`, `src/state/BubblesStore.jsx` (only to add registration for `getBubbleFillStyle` if 010a didn't), `src/hooks/__tests__/` (useTags-related).
**Out of scope**: `crudDepsRef`/`useBubbleCrud` (010c), `BubblesDialogs` (010d).

## Steps
1. **Register `getBubbleFillStyle`**: in `BubblesPage`, register the page's `getBubbleFillStyle` callback into the store (mirror how 010a registers filter setters). Do NOT move `bubbleBackgroundEnabled`/theme into the store.
2. **Migrate `useTags`**: read `setBubbles`, `getBubbleFillStyle`, `setFilterTags`, `setListFilterTags` from `useBubblesStore()` instead of `pageDeps.current`. Keep tag CRUD + the "recolor bubbles when a tag is deleted" behavior (uses `applyBubbleFill` from plan 001) identical.
3. **Delete `tagPageDepsRef`** declaration + assignment + the `pageDeps` prop on the `useTags(...)` call.
4. **Verify**: `grep -n "tagPageDepsRef" src` → none; create a tag, edit a tag, delete a tag → bubbles recolor to default on tag delete; filter chips update. `npm test` + `npm run lint` + `npm run build` green.

## Done criteria
- [ ] `grep -rn "tagPageDepsRef" src` → no matches
- [ ] `useTags` reads all cross-hook deps from the store
- [ ] `npm test` + `npm run lint` + `npm run build` exit 0
- [ ] `code-review/plans/README.md` row updated

## STOP conditions
- Tag create/edit/delete or bubble recolor-on-delete changes behavior → revert, report.
- `getBubbleFillStyle` cannot be read fresh enough from the store (stale closure on `bubbleBackgroundEnabled`) → report the timing issue instead of forcing it.
- Verification fails twice.

## Maintenance notes
- `crudDepsRef` still remains after 010b — removed in 010c.
- Reviewer: smoke tag lifecycle + recolor specifically.
