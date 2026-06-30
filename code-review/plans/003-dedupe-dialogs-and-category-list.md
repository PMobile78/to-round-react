# Plan 003: Collapse duplicated bubble dialogs, category lists, and filter checkboxes into shared components

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/components/CreateBubbleDialog.jsx src/components/EditBubbleDialog.jsx src/components/BubblesDialogs.jsx src/components/TasksCategoriesPanel.jsx src/components/TasksCategoriesDialog.jsx src/components/MobileCategorySelector.jsx src/components/FilterMenu.jsx src/components/TaskFilterDrawer.jsx`
> On any mismatch with the excerpts below, treat as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

Three UI concepts are each implemented two-to-three times with near-identical code: the create/edit bubble dialog, the category (tag) list, and the tag-filter checkboxes. Every change to any of them must currently be made in 2–3 places, and they have already diverged in small ways. Collapsing each into one shared component deletes ~250 lines and makes these flows change-once.

This plan has three independent parts (A, B, C). They can be done together or as separate commits; if time is short, Part A alone is the highest-value.

## Current state

### Part A — `CreateBubbleDialog` and `EditBubbleDialog` are the same wrapper

Both wrap `BubbleDialogForm` in an identical `Dialog`/`DialogTitle`/`DialogContent` shell and forward an almost-identical prop set. The shell is byte-identical:

```jsx
// IDENTICAL in CreateBubbleDialog.jsx:56-86 and EditBubbleDialog.jsx:63-93
<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isSmallScreen}
    PaperProps={{ sx: { borderRadius: isSmallScreen ? 0 : 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}>
  <DialogTitle sx={{ color: 'text.primary', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    {t('bubbles.createNewBubble') /* or editBubble */}
    <IconButton onClick={onClose} sx={{ color: 'text.primary' }}><CloseOutlined /></IconButton>
  </DialogTitle>
  <DialogContent sx={{ padding: isMobile ? 2 : 3, maxWidth: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
    <BubbleDialogForm ... />
```

Differences are only: the title key; `Create` holds local `title`/`description` reset on open and renders a 2-button `DialogActions` (Cancel / Create); `Edit` seeds `title`/`description` from `initialTitle`/`initialDescription` and renders a richer `DialogActions` (Delete / MarkAsDone / optional StopPulsing / Cancel / Save). Both are rendered by `BubblesDialogs.jsx`.

### Part B — category list rendered three times

`TasksCategoriesPanel.jsx` (fixed 320px sidebar), `TasksCategoriesDialog.jsx` (modal), and `MobileCategorySelector.jsx` (dropdown) each render the same per-tag row: color dot + name + active-bubble count + select handler, plus a synthetic "planned tasks" entry. They share `tags`, `selectedCategory`, `onCategorySelect`, `bubbleCounts`, `plannedTasksCount`, `bubbles`. (Confirm the row markup by opening each file; the shared shape is the per-tag `{ id, name, color }` → row.)

### Part C — tag-filter checkboxes duplicated

`FilterMenu.jsx` and `TaskFilterDrawer.jsx` both render a list of tag checkboxes bound to `listFilterTags` / `handleListTagFilterChange` plus a "no tag" checkbox and select-all/clear-all controls.

### Conventions

- Functional components, default export, props destructured at top (see the dialogs above).
- Colors/background from the MUI theme; header text uses `'text.primary'`, never `'white'` (`CLAUDE.md`).
- Any HTML rendering goes through `src/components/HtmlRenderer.jsx` — do not introduce `dangerouslySetInnerHTML`.
- 4-space indentation.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`   | exit 0              |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Build     | `npm run build`               | exit 0 (run once at the end) |

## Scope

**In scope**:
- Part A: create `src/components/BubbleDialog.jsx`; edit `src/components/BubblesDialogs.jsx`; delete `src/components/CreateBubbleDialog.jsx` and `src/components/EditBubbleDialog.jsx`.
- Part B: create `src/components/CategoryList.jsx`; edit `TasksCategoriesPanel.jsx`, `TasksCategoriesDialog.jsx`, `MobileCategorySelector.jsx`.
- Part C: create `src/components/TagFilterCheckboxes.jsx`; edit `FilterMenu.jsx`, `TaskFilterDrawer.jsx`.

**Out of scope**:
- `BubbleDialogForm.jsx` — the form body is already shared; do not change it.
- Color literal cleanup inside these components — that is Plan 005 (do not fix colors here; just preserve them).
- Prop wiring in `BubblesPage.jsx` beyond what Part A requires (the big prop reshape is Plan 009).

## Git workflow

- Branch: `advisor/003-dedupe-ui`
- One commit per part; conventional commits (`refactor(dialogs): merge Create/Edit bubble dialogs into BubbleDialog`).
- Do NOT push or open a PR unless instructed.

## Steps

### Part A

**A1.** Create `src/components/BubbleDialog.jsx` with a `mode` prop (`'create' | 'edit'`). Render the shared shell once. Manage local `title`/`description`: on `open`, reset to `''` when `mode==='create'`, else to `initialTitle`/`initialDescription`. Pass mode-appropriate values into `BubbleDialogForm` (create uses `dueDate`/`createNotifications`/`createRecurrence`/`bubbleSize`; edit uses `editDueDate`/`editNotifications`/`editRecurrence`/`editBubbleSize`). Render `DialogActions` conditionally: create → Cancel + Create (`onCreate({title, description})`, disabled when `!title.trim()`); edit → the Delete/MarkAsDone/optional StopPulsing group + Cancel/Save (`handleSaveBubble({title, description})`). Copy the exact JSX from the two existing files so styling/behavior is preserved.

**A2.** In `BubblesDialogs.jsx`, replace `<CreateBubbleDialog .../>` with `<BubbleDialog mode="create" .../>` and `<EditBubbleDialog .../>` with `<BubbleDialog mode="edit" .../>`, passing the same props each already received.

**A3.** Delete `CreateBubbleDialog.jsx` and `EditBubbleDialog.jsx`. Update any imports.

**Verify**: `grep -rn "CreateBubbleDialog\|EditBubbleDialog" src` → no matches except the deleted-file absence. `npm run lint` → exit 0.

### Part B

**B1.** Create `src/components/CategoryList.jsx` — a pure renderer taking `{ tags, selectedCategory, onCategorySelect, bubbleCounts, plannedTasksCount, bubbles, variant }` and rendering the tag rows + planned-tasks row. Lift the row markup from `TasksCategoriesPanel.jsx` (the most complete). Use `variant` only if the three containers need slightly different row chrome; otherwise omit it.

**B2.** Replace the inline row rendering in `TasksCategoriesPanel.jsx`, `TasksCategoriesDialog.jsx`, and `MobileCategorySelector.jsx` with `<CategoryList .../>`, keeping each file's own container (sidebar `Paper` / `Dialog` / dropdown `Menu`).

**Verify**: `npm run lint` → exit 0. Open each of the three files and confirm the category rows now come from `CategoryList`.

### Part C

**C1.** Create `src/components/TagFilterCheckboxes.jsx` taking `{ tags, selectedTagIds, onTagChange, showNoTag, onNoTagChange, getCount, isAllSelected, onSelectAll, onClearAll, t }`. Lift the checkbox list + select-all/clear-all from `FilterMenu.jsx`.

**C2.** Use it in both `FilterMenu.jsx` and `TaskFilterDrawer.jsx`.

**Verify**: `npm run lint` → exit 0.

### Final

**Verify**: `npm test` → all pass. `npm run build` → exit 0.

## Test plan

- These are presentational components without existing unit tests; add a light render test only if a `@testing-library/react` setup already exists (check `package.json` devDeps and any `*.test.jsx` for components). If none exists, do not add a new testing stack — rely on lint + build + the manual smoke test below.
- Manual smoke (document results in your report): open create dialog, open edit dialog (click a bubble), open the categories panel/dialog/mobile selector, open both filter UIs — each renders and behaves as before.
- Verification: `npm test` (unchanged suite passes) + `npm run build` exit 0.

## Done criteria

- [ ] `grep -rn "CreateBubbleDialog\|EditBubbleDialog" src` → no matches
- [ ] `src/components/BubbleDialog.jsx`, `CategoryList.jsx`, `TagFilterCheckboxes.jsx` exist and are used by their respective containers
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] No color literal was changed (Plan 005 owns those) — diff shows structural moves only
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `BubbleDialogForm`'s prop contract differs between the create and edit call sites in a way that can't be expressed with a single `mode` switch (e.g. different form fields, not just different state sources).
- The three category components turn out to render materially different rows (not just different containers) — then `CategoryList` needs a real `variant` API; describe the differences instead of forcing a merge.
- Deleting the old dialog files breaks an import you can't trace.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- After Plan 009 (store/context), `BubbleDialog` and `CategoryList` can read shared state from context, shrinking their prop lists further.
- Reviewer should diff `BubbleDialog.jsx` against the two deleted files to confirm no DialogActions branch or styling was dropped (especially the mobile StopPulsing button in edit mode).
- Plan 005 will revisit these files for color literals — keep them edit-friendly (don't inline-minify).
