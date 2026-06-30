# Plan 010c: Migrate useBubbleCrud off crudDepsRef (the hard one)

> Part 3 of 4 (after 010b). Sequence: 010a → 010b → **010c** → 010d.
>
> **Base / drift**: `git checkout -b advisor/010c-usebubblecrud && git merge main --no-edit`; confirm HEAD == main. Requires **010a + 010b merged** (store exists, only `crudDepsRef` remains). Verify `grep -rn "tagPageDepsRef\|filterPageDepsRef" src` → none before starting; if other bridges still exist, STOP — prerequisites not landed.
>
> **This is the step where the monolithic Plan 010 stalled twice.** Go slowly, callback-by-callback, commit per handler, verify after each. Do NOT settle for a "dynamic crudDepsRef built from the store" half-measure — the ref must be DELETED.

## Status
- **Priority**: P1 · **Effort**: M-L · **Risk**: HIGH · **Depends on**: 010a, 010b · **Category**: tech-debt
- **Planned at**: commit `000ca27`, 2026-06-30

## Why this matters
`crudDepsRef` is the last and largest ref bridge. `useBubbleCrud` reads many page values at call-time through it; moving the shared ones into the store and passing the genuinely page-local ones as explicit args removes the final bridge and lets 010d collapse the dialog forwarder.

## Current state
`src/pages/BubblesPage.jsx`: `crudDepsRef = useRef({})` (~line 67), passed as `deps: crudDepsRef` to `useBubbleCrud(...)` (~line 91/102), reassigned every render (~line 343) with: `{ tags, selectedTagId, setSelectedTagId, selectedCategory, getBubbleFillStyle, canvasSize, dueDate, setDueDate, createNotifications, setCreateNotifications, createRecurrence, editDueDate, setEditDueDate, editNotifications, editRecurrence, manuallyStoppedPulsingRef }`. `useBubbleCrud` reads `deps.current.*` inside its handlers.

Classify those deps:
- **Shared domain (→ store)**: `tags`, `selectedTagId`/`setSelectedTagId`, `selectedCategory`, `getBubbleFillStyle` (registered in 010b).
- **Page-local UI (→ explicit props/args)**: `canvasSize`, `dueDate`/`setDueDate`, `createNotifications`/`setCreateNotifications`, `createRecurrence`, `editDueDate`/`setEditDueDate`, `editNotifications`, `editRecurrence`, `manuallyStoppedPulsingRef` (these come from `useBubbleNotifications`/page UI, not shared bubble/tag state).

### Conventions
4-space indent; reuse store + `applyBubbleFill` (plan 001). Keep `useBubbleNotifications` untouched.

## Commands
Same as 010a.

## Scope
**In scope**: `src/pages/BubblesPage.jsx`, `src/hooks/useBubbleCrud.js`, `src/state/BubblesStore.jsx` (add `selectedTagId`/`selectedCategory` to store if cleaner), tests.
**Out of scope**: `BubblesDialogs` (010d); `useBubbleNotifications` internals; `useMatterEngine`.

## Steps
1. **Move shared deps to store**: ensure `tags`, `selectedTagId`/`setSelectedTagId`, `selectedCategory`, `getBubbleFillStyle` are readable from `useBubblesStore()`.
2. **Convert `useBubbleCrud` signature**: replace `deps: crudDepsRef` with (a) store reads for the shared values and (b) explicit named props/args for the page-local UI values listed above. Do this handler-by-handler (`createNewBubble`, `handleSaveBubble`, `handleDeleteBubble`, `handleMarkAsDone`, `handleCloseDialog`, `clearAllBubbles`, `handleToggleEditUseRichText`, the open-bubble deep-link listener). **Commit after each handler compiles + tests pass.**
3. **Delete `crudDepsRef`** declaration + assignment + the `deps` prop. 
4. **Verify**: `grep -rn "crudDepsRef\|pageDeps\|DepsRef" src` → **no matches** (all five bridges gone). Smoke: create / edit / delete / mark-done a bubble; due-date + notifications on create and edit; deep-link `?bubbleId=`. `npm test` + `npm run lint` + `npm run build` green.

## Done criteria
- [ ] `grep -rn "pageDeps\|DepsRef\|crudDeps" src` → **no matches** (this is the milestone: all 5 bridges removed)
- [ ] `useBubbleCrud` takes store reads + explicit page-local props (no `deps` ref)
- [ ] `npm test` + `npm run lint` + `npm run build` exit 0
- [ ] `code-review/plans/README.md` row updated

## STOP conditions
- Any CRUD behavior (create/edit/delete/mark-done, due-date, notifications, recurrence, deep-link) changes and can't be restored in-step → revert that handler's commit, report.
- A page-local value (e.g. `manuallyStoppedPulsingRef`, notification state) cannot be passed explicitly without a timing change → report; do NOT re-introduce a ref bridge to paper over it.
- Verification fails twice after a reasonable fix.

## Maintenance notes
- After 010c, `BubblesDialogs` still takes ~123 props — 010d collapses it.
- Reviewer: the CRUD smoke checklist is the real gate; verify due-date/notification flows on both create and edit.
