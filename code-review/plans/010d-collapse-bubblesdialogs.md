# Plan 010d: Collapse the BubblesDialogs prop forwarder

> Part 4 of 4 (after 010c). Sequence: 010a → 010b → 010c → **010d**.
>
> **Base / drift**: `git checkout -b advisor/010d-bubblesdialogs && git merge main --no-edit`; confirm HEAD == main. Requires **010a+010b+010c merged** — verify `grep -rn "pageDeps\|DepsRef" src` → none before starting; if any bridge remains, STOP (prerequisites not landed).

## Status
- **Priority**: P1 · **Effort**: M · **Risk**: MED · **Depends on**: 010a, 010b, 010c · **Category**: tech-debt
- **Planned at**: commit `000ca27`, 2026-06-30
- **Progress (2026-07-01)**: IN PROGRESS on local `main` — call-site prop count **126 → 48** (target `<40`), `BubblesPage.jsx` 1027 → 965. Staged store migrations A–G done; H remains (ahead of the original per-stage estimate).

## Progress — staged execution (A–H)

Executed as small, individually-verifiable stages (each a commit on local `main` with
`npm test`/`lint`/`build` + browser smoke). State moves into the **existing `BubblesStore`**,
not a new `BubblesUiStore` (that split stays the optional post-010d follow-up in the note below).

| Stage | What | Commit(s) | Props |
|-------|------|-----------|-------|
| A | tags live in store | `a0e4b4c` | — |
| B | selectedTagId live | `1b457b7` | −2 |
| C | bubble-view filters + derived | `13625d5` | 126→118 |
| D | list-view filters/sort | `928a0b6` | 118→100 |
| E | create/edit form + notification state | `58c9f5b`, `7be358c` | 100→82 |
| F1 | dialog open-flags + settings values | `eb65d79` | 82→63 |
| F2 | theme/design controls (App→provider) | `d7499fb` | 63→55 |
| G | shared context (t/isMobile/themeMode/bubbles); dialogs call hooks directly | `7adc64f` | 55→48 |
| H | tag-editor state + getBubbleCountByTag | _todo_ | ~48→~33 |

**Stage-E note (the risk that wasn't):** the create/edit form state lived *inside*
`useBubbleNotifications` next to the rAF pulse loop, but the loop reads `bubble.dueDate`
(a bubble property) + refs, never the form state — so extracting it (its `useState` + return
fields only) left the pulse loop and its refs untouched.

**Stage-F note (theme came from App, not the page):** the 8 theme/design controls
(themeModeState/setThemeMode/design/setDesign/designs/toggleTheme/themeToggleProps/onOpenMindMap)
were pure pass-through props threaded App → BubblesPage → BubblesDialogs. F2 fed them straight
into `<BubblesStoreProvider>` (App still owns the single `useThemeMode` instance; the store just
re-exposes them via context) and BubblesPage's signature shrank to `{ user, themeMode }`.
`themeMode` (ambient, used by the page's own render) stays a prop → G. Open-flag/settings
migration (F1) followed the E pattern exactly (live store fields + lsGet initializers; no
derived/register churn, so no TDZ risk).

**Stage-G note (ambient context via hooks):** t/isMobile/isSmallScreen/themeMode/getDialogPaperStyles
were pure ambient context — BubblesDialogs now derives them itself (useTranslation / useMediaQuery /
useTheme). ⚠️ themeMode = `useTheme().palette.mode` (resolved 'light'/'dark'), NOT a 2nd
`useThemeMode()` (has own useState → would desync from App); confirmed reactive in smoke (Light
re-themed the dialogs). getDialogPaperStyles was only forwarded, so its BubblesPage def was dropped
and re-derived locally in the dialogs. bubbles/setBubbles read from the store (already the owner).
getBubbleCountByTag deferred to H (semantically coupled to TasksCategoriesDialog; from useTags).

**Remaining 48-prop map (after G):** tag-editor + categories (~18 → H: tagDialog/handleCloseTagDialog/
COLOR_PALETTE/editingTag/tagName/setTagName/tagColor/setTagColor/isColorAvailable/canCreateMoreTags/
handleSaveTag/handleOpenTagDialog/handleDeleteTag/handleUndoDeleteTag/categoriesDialog/setCategoriesDialog/
deletingTags/getBubbleCountByTag) · bubble create/edit flags+handlers (~21: flags→store, handlers stay
page-local per STOP condition) · page-local menu/settings handlers kept as props in F (~9:
handleToggleBubbleBackground/handleToggleMainView/handleToggleCategoriesPanel/handleLogout/confirmLogout/
handleFontSizeChange/handleExportJson/handleImportJson). `<40` is reachable but tight — the last ~15–20
page-local handlers may need the `register()` bridge, else the honest floor is ~42–45.

## Why this matters
`BubblesDialogs` receives ~123 individual props and forwards them to ~10 child dialogs — an identity/pass-through abstraction. With shared state in the store (010a-c), the dialogs can read `bubbles`/`tags`/setters/`getBubbleFillStyle` directly, shrinking the forwarder dramatically.

## Current state
`src/pages/BubblesPage.jsx` renders `<BubblesDialogs ... />` with ~123 props (the large JSX block near the end of the file). `src/components/BubblesDialogs.jsx` destructures them and passes them to child dialogs (`BubbleDialog`, tag dialog, filter drawers, font/appearance/about/change-password/logout dialogs, list view, categories dialog).

### Conventions
4-space indent; child dialogs read shared state via `useBubblesStore()`; keep only genuinely page-local UI props (open flags, page-only handlers).

## Commands
Same as 010a.

## Scope
**In scope**: `src/pages/BubblesPage.jsx` (the `<BubblesDialogs>` call site), `src/components/BubblesDialogs.jsx`, and the child dialog components that consume shared bubble/tag state (read from store instead of props). 
**Out of scope**: dialog visual behavior; adding new features. This is a prop-plumbing reduction only.

## Steps
1. **Identify shared-state props**: of the ~123, mark which are shared bubble/tag/store state (`bubbles`, `setBubbles`, `tags`, `setTags`, `selectedTagId`, `getBubbleFillStyle`, filter state, etc.) vs page-local UI (dialog open booleans + their setters, page-only handlers).
2. **Have child dialogs read shared state from `useBubblesStore()`** where they currently get it via props. Do this dialog-by-dialog; build + test after each.
3. **Remove the now-redundant props** from both `BubblesDialogs.jsx`'s signature and the `<BubblesDialogs ... />` call site. Keep only page-local UI props.
4. **Verify**: prop count at the call site `< 40` (was ~123). `npm test` + `npm run lint` + `npm run build` green. Smoke: open each dialog (create, edit, tag, filters, font, appearance, about, change-password, logout, list view, categories) — all open and function.

## Done criteria
- [ ] `<BubblesDialogs>` call-site prop count `< 40` (count the `name=` lines)
- [ ] `BubblesDialogs.jsx` no longer forwards shared bubble/tag state it can read from the store
- [ ] `BubblesPage.jsx` is meaningfully smaller (target: under 800 lines combined with 010a-c)
- [ ] `npm test` + `npm run lint` + `npm run build` exit 0
- [ ] `code-review/plans/README.md` row updated

## STOP conditions
- Any dialog stops opening or loses data → revert that dialog's change, report.
- A "shared" prop turns out to carry page-local timing that the store can't provide → keep it as an explicit prop and note why.
- Verification fails twice after a reasonable fix.

## Maintenance notes
- This completes the original Plan 010 goal: all 5 ref-bridges gone + forwarder collapsed + BubblesPage shrunk.
- Reviewer: open every dialog in a manual smoke pass — prop-plumbing bugs surface only at runtime.
- After this lands, consider splitting the store into data (`BubblesStore`) vs UI (`BubblesUiStore`) if it grew large.
