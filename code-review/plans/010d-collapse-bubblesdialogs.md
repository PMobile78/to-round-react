# Plan 010d: Collapse the BubblesDialogs prop forwarder

> Part 4 of 4 (after 010c). Sequence: 010a → 010b → 010c → **010d**.
>
> **Base / drift**: `git checkout -b advisor/010d-bubblesdialogs && git merge main --no-edit`; confirm HEAD == main. Requires **010a+010b+010c merged** — verify `grep -rn "pageDeps\|DepsRef" src` → none before starting; if any bridge remains, STOP (prerequisites not landed).

## Status
- **Priority**: P1 · **Effort**: M · **Risk**: MED · **Depends on**: 010a, 010b, 010c · **Category**: tech-debt
- **Planned at**: commit `000ca27`, 2026-06-30

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
