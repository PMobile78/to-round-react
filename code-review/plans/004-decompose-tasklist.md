# Plan 004: Decompose TaskList.jsx (extract action-button matrix and list-item subcomponent)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/components/TaskList.jsx`
> If `TaskList.jsx` changed since this plan was written, re-confirm the
> excerpts below before editing; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

`TaskList.jsx` is 737 lines and mixes filtering, sorting, and rendering in one component, with the per-task action buttons copy-pasted across four status blocks. The four blocks (ACTIVE / DONE / DELETED / POSTPONE) each render the same Edit/Restore/Delete icon buttons with minor variation; a change to button layout must be made four times. Extracting an action-matrix subcomponent and a list-item subcomponent removes ~115 lines of repetition and makes the render readable.

## Current state

The four near-identical action blocks (`src/components/TaskList.jsx:615-726`):

```jsx
// src/components/TaskList.jsx:614-642 (ACTIVE block — DONE/DELETED/POSTPONE blocks are the same shape)
<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
  {task.status === BUBBLE_STATUS.ACTIVE && (
    <>
      <IconButton size="small" onClick={() => handleEditTask(task)} sx={{ color: 'primary.main' }} title={t('bubbles.editBubble')}><Edit /></IconButton>
      <IconButton size="small" onClick={() => handleMarkTaskAsDone(task.id)} sx={{ color: 'success.main' }} title={t('bubbles.markAsDone')}><CheckCircle /></IconButton>
      <IconButton size="small" onClick={() => handleDeleteTask(task.id)} sx={{ color: 'error.main' }} title={t('bubbles.deleteBubble')}><DeleteOutlined /></IconButton>
    </>
  )}
  {task.status === BUBBLE_STATUS.DONE && ( /* Edit, Restore, Delete */ )}
  {task.status === BUBBLE_STATUS.DELETED && ( /* Edit, Restore, PermanentDelete */ )}
  {task.status === BUBBLE_STATUS.POSTPONE && ( /* Edit, Restore, Delete */ )}
</Box>
```

Action handlers in scope: `handleEditTask(task)`, `handleMarkTaskAsDone(task.id)`, `handleDeleteTask(task.id)`, `handleRestoreBubble(task.id)`, `handlePermanentDeleteTask(task.id)`. Note the icon colors here (`primary.main`, `success.main`, `error.main`) are already theme tokens — keep them.

The component receives 26 props (`src/components/TaskList.jsx:48-75`): `bubbles, setBubbles, tags, listFilter, setListFilter, listSortBy, setListSortBy, listSortOrder, setListSortOrder, listFilterTags, setListFilterTags, listShowNoTag, setListShowNoTag, listSearchQuery, setListSearchQuery, setSelectedBubble, setSelectedTagId, setEditDialog, handleListTagFilterChange, handleListNoTagFilterChange, clearAllListFilters, selectAllListFilters, getBubbleCountByTagForListView, themeMode, isAllListFiltersSelected, onOpenFilterMenu`.

`BUBBLE_STATUS` comes from `src/services/firestoreService.js` (`ACTIVE`, `DONE`, `DELETED`, `POSTPONE`).

### Conventions

- Functional components, props destructured at top, default export.
- 4-space indentation; keep `useTranslation`/`useTheme`/`useMediaQuery` usage as-is.
- Theme colors only (already satisfied in the action block).

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`   | exit 0              |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Build     | `npm run build`               | exit 0 (once, at end) |

## Scope

**In scope**:
- `src/components/TaskList.jsx`
- `src/components/TaskActionButtons.jsx` (create)
- `src/components/TaskListItem.jsx` (create — optional but recommended; see Step 2)

**Out of scope**:
- The filtering/sorting logic's behavior — you may move it but must not change results.
- Color literals elsewhere in the file (e.g. status chips) — Plan 005 owns those.
- `TasksFullScreenView.jsx` / `BubblesPage.jsx` prop wiring (Plan 009 reshapes props).

## Git workflow

- Branch: `advisor/004-decompose-tasklist`
- Conventional commits (`refactor(tasklist): extract TaskActionButtons matrix`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Extract `TaskActionButtons`

Create `src/components/TaskActionButtons.jsx`. Define a declarative matrix and render from it:

```jsx
// shape the action set per status; render Edit always-first, then status-specific
const ACTIONS = {
  [BUBBLE_STATUS.ACTIVE]:  ['edit', 'done', 'delete'],
  [BUBBLE_STATUS.DONE]:    ['edit', 'restore', 'delete'],
  [BUBBLE_STATUS.DELETED]: ['edit', 'restore', 'permanentDelete'],
  [BUBBLE_STATUS.POSTPONE]:['edit', 'restore', 'delete'],
};
```

Map each action key to its icon, color, title key, and handler call. Component props: `{ task, t, onEdit, onMarkDone, onDelete, onRestore, onPermanentDelete }`. Render `(ACTIONS[task.status] || []).map(renderButton)` inside the existing `<Box sx={{ display:'flex', flexDirection:'column', gap:1, flexShrink:0 }}>`.

Replace the four blocks at `TaskList.jsx:614-727` with `<TaskActionButtons task={task} t={t} onEdit={handleEditTask} onMarkDone={handleMarkTaskAsDone} onDelete={handleDeleteTask} onRestore={handleRestoreBubble} onPermanentDelete={handlePermanentDeleteTask} />`.

**Verify**: `grep -c "task.status === BUBBLE_STATUS" src/components/TaskList.jsx` → drops to the count used by non-action logic only (the four action-block conditionals are gone). `npm run lint` → exit 0.

### Step 2 (recommended): Extract `TaskListItem`

Move the per-task `<ListItem>` body (title, description via `HtmlRenderer` if used, timestamps, and `<TaskActionButtons/>`) into `src/components/TaskListItem.jsx`, props `{ task, tags, t, themeMode, handlers... }`. In `TaskList.jsx` the `.map` becomes `{tasks.map(task => <TaskListItem key={task.id} ... />)}`. This isolates rendering from the filter/sort logic.

**Verify**: `npm run lint` → exit 0; `wc -l src/components/TaskList.jsx` → meaningfully smaller (target < 600).

### Step 3: Full verification

**Verify**: `npm test` → all pass. `npm run build` → exit 0.

## Test plan

- If a `@testing-library/react` setup exists (check devDeps + existing `*.test.jsx`), add a render test for `TaskActionButtons` asserting that an ACTIVE task shows Edit/Done/Delete and a DELETED task shows Edit/Restore/PermanentDelete, and that clicking calls the right handler. Otherwise rely on lint + build + manual smoke.
- Manual smoke (report results): in the task list, verify each status row shows the correct buttons and each button still works (edit opens dialog, done/restore/delete mutate the row).
- Verification: `npm test` → all pass.

## Done criteria

- [ ] `src/components/TaskActionButtons.jsx` exists and is the only place the action icons are rendered
- [ ] The four `task.status === BUBBLE_STATUS.X && (<>...buttons...</>)` blocks are gone from `TaskList.jsx`
- [ ] `wc -l src/components/TaskList.jsx` is smaller than 737 (ideally < 600 with Step 2)
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- A status block contains an action not covered by the five handlers (some hidden conditional button) — extend the matrix only after reporting what you found.
- Extraction changes which handler a button calls (behavior drift) — revert and report.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- New task statuses or actions are now a one-line matrix edit — keep that property.
- Reviewer: confirm the DELETED block uses `permanentDelete` (not `delete`) — that's the one real difference between the four blocks.
- Plan 005 will replace remaining hardcoded colors in this file (status chips/backgrounds); leave them readable.
