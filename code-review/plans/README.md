# Implementation Plans — structural review of 2026-06-30

Generated from [`../2026-06-30-structural-review.md`](../2026-06-30-structural-review.md) on 2026-06-30, planned against commit `996a2ce` (branch `main`).

Each plan file is **self-contained**: an executor (a separate session or a cheaper model) needs only the plan file + the repo. Read the whole plan, honor its `STOP conditions`, run its `Drift check` first, and update your status row here when done.

**Project facts (all plans):** React + Vite 8 + MUI v7 + Matter.js + Firebase, plain JavaScript (no TypeScript).
Verify with: `npm ci --legacy-peer-deps` → `npm test` (vitest) → `npm run lint` (eslint) → `npm run build` (only where a plan asks). Cloud Functions tests: `npm run test:functions`.

## Execution outcome (2026-06-30)

Executed via parallel executor agents (Sonnet; 010 on Opus), each reviewed by the advisor, then merged to **local `main`** (not pushed — push/PR is the maintainer's call). Final gate on `main` @ `000ca27`: **eslint 0 errors, vitest 301 passed, functions tests 17 passed, vite build ok.**

- **001–009: DONE** (merged). Notes: 004 took 1 revision (restore passed `task` instead of `task.id`); 003 Part B took 1 revision (CategoryList was a 528-line 3-branch dup → shared `renderRowContent`); 1 advisor integration fix (`TaskList` called `useTheme()` inside `useCallback` → rules-of-hooks, hoisted). 005 cleaned colors in its 7 target files only — colors in ~33 other components remain (out of scope; future sweep).
- **010 (store/context capstone): BLOCKED — NOT merged.** Two executor rounds (incl. Opus) introduced `BubblesStore` and removed 3 of 5 ref-bridges, but could not remove `crudDepsRef`/`tagPageDepsRef` or collapse `BubblesDialogs` (still ~123 props), and `BubblesPage` grew. The partial state (store + 2 bridges + big forwarder) is a worse dual-pattern, so it was not merged. Branch `advisor/010-bubbles-store` kept for reference. **DONE — split into four sequential sub-plans** (execute in order, each leaves a verifiable state): `010a` (store foundation + 3 low-risk bridges) → `010b` (migrate useTags) → `010c` (migrate useBubbleCrud — the hard one) → `010d` (collapse BubblesDialogs forwarder). The original `010` file is retained as design background, marked SUPERSEDED.

The per-plan TODO statuses below are superseded by this outcome.

## Execution order & status

| Plan | Title | Priority | Effort | Risk | Depends on | Track | Status |
|------|-------|----------|--------|------|------------|-------|--------|
| [001](001-canonical-helpers.md) | Use canonical helpers (getOffsetMs, applyBubbleFill, shouldShowStopPulsing) | P1 | M | MED | — | B | TODO |
| [002](002-storage-util-adoption.md) | Route localStorage through storage util + key registry | P2 | M | LOW | — | B | TODO |
| [003](003-dedupe-dialogs-and-category-list.md) | Collapse duplicated dialogs, category lists, filter checkboxes | P2 | L | MED | — | A | TODO |
| [004](004-decompose-tasklist.md) | Decompose TaskList.jsx (action matrix + list item) | P2 | M | MED | — | A | TODO |
| [005](005-hardcoded-colors-to-theme.md) | Remove hardcoded colors; route through theme | P2 | M | MED | 003, 004 | A | TODO |
| [006](006-design-factory.md) | Collapse 5 design files into a factory | P2 | M | MED | — | A | TODO |
| [007](007-decompose-richtexteditor.md) | Decompose RichTextEditor.jsx | P3 | M | MED | — | A | TODO |
| [008](008-remove-legacy-bubbles-array.md) | Remove legacy bubbles[] dual-schema | P2 | M | MED | — (Step 0 gate) | C | TODO |
| [009](009-robustness-import-atomicity-and-hex-guard.md) | Atomic JSON import + safe shadow-color parse | P1 | S | LOW | — | B | TODO |
| [010](010-bubbles-store-context.md) | Bubbles/tags store (remove 5 ref-bridges + 130-prop forwarder) | P1 | L | HIGH | 001, 002, 003, 009 | B | TODO |

Status values: `TODO | IN PROGRESS | DONE | BLOCKED (reason) | REJECTED (rationale)`.

## How to split across sessions / agents

The plans fall into three tracks by which part of the codebase they touch. **Track A and Track C never touch the same files as each other or as Track B's bubble-cluster work, so they run fully in parallel.** Track B is the `BubblesPage` + bubble-hooks zone and must be serialized.

```
TIME ──►

Track A (components / theme / richtext — parallel agents, independent):
   ├─ 006 design factory      (src/theme/**)            ─ isolated
   ├─ 007 RichTextEditor      (RichText cluster)         ─ isolated
   ├─ 003 dialog/category dedup (src/components/**) ─┐
   └─ 004 TaskList decompose    (TaskList.jsx)      ─┴─► 005 colors (needs 003+004)

Track C (backend — parallel agent, independent):
   └─ 008 legacy schema       (firestoreService.js, functions/index.js)   [Step 0 gate first]

Track B (BubblesPage + bubble hooks — SERIALIZE, one agent):
   002 storage ─► 001 helpers ─► 009 robustness ─►  010 store/context (capstone)
   (002 first because it rewrites many of the same files; 010 last, the keystone)
```

### Recommended assignment (max parallelism)
- **Agent 1 (Track B, serial):** 002 → 001 → 009 → 010. This is the critical path and the longest. Start it first.
- **Agent 2 (Track A, components):** 003 → 004 → 005.
- **Agent 3 (Track A, isolated):** 006, then 007 (or two agents, one each — both are isolated).
- **Agent 4 (Track C):** 008 (do Step 0 gate before any code).

If you only have one executor, run in numeric order — it already respects dependencies.

## Dependency notes

- **010 depends on 001, 002, 003, 009.** It physically rewrites `BubblesPage.jsx`, the bubble hooks, and `BubblesDialogs.jsx`. Running it last means it moves *clean, deduplicated* code instead of re-doing 001/003's work. Do not start 010 until those are DONE.
- **005 depends on 003 + 004.** Those rewrite `TaskList.jsx` and the category components; 005 then fixes colors in the settled files instead of editing soon-to-move lines.
- **002 should run before 001, 004, 005, 008, 010** within its conflict window — it's a broad mechanical pass touching many files those plans also edit. Cheapest to do first, then everyone rebases on the storage convention.

## File conflict map (who touches what — coordinate before parallel edits)

- `src/pages/BubblesPage.jsx`: 001, 002, 010 → all Track B, already serialized. ✅
- `src/components/TaskList.jsx`: 002, 004, 005 → run 002→004→005 in that order.
- `src/components/BubbleDialogForm.jsx`: 002 only (003 keeps it out of scope). ✅
- `src/services/firestoreService.js`: 002, 008 → run 002 before 008.
- `src/hooks/useBubbleFilters.js` / `useListFilters.js` / `useTags.js`: 002, 010 (and 001 for useTags) → all Track B. ✅
- `src/hooks/useBubbleNotifications.js`: 001 only (010 reads it but doesn't rewrite it). ✅
- `src/theme/**`: 006 only. ✅  `RichText cluster`: 007 only. ✅  `functions/index.js`: 008 only. ✅

Everything in Track A/C with a "✅ isolated" note can be handed to a fresh session with zero coordination.

## Findings considered and rejected / deferred

So nobody re-audits these:

- **"Cloud Functions non-atomic subdoc+parent writes" as a data-integrity blocker** — *downgraded.* In the current schema the second write is a cosmetic parent `updatedAt` touch, not the legacy array; real value is deleting the legacy fallback (covered by Plan 008), not adding transactions.
- **Notification dedup-claim-then-send "race"** (`functions/index.js`) — *deferred / by-design.* Claim-before-send is a deliberate at-most-once choice (avoids duplicate user notifications). Reversing it trades silent loss for duplicate spam; not a clear win. Document the invariant if revisited.
- **Client/server timezone interpretation mismatch** — *deferred, needs investigation.* The design stores a local-time string + the user's `tz` and the server interprets via `TZDate`; a mismatch only occurs if the browser tz differs from the saved tz (edge case). Not turned into a plan; verify the save path before acting.
- **Migrate tags to a subcollection (schema convergence)** — *rejected.* Tags are a small bounded set; a single-doc array is simpler than a subcollection. Converging schemas adds complexity for no real gain.
- **Mindmap engine seam (MindElixir vs ReactFlow) leakiness** — *deferred.* A real structural smell but lower leverage and lower confidence; left for a focused follow-up rather than a speculative rewrite.
- **HtmlRenderer rejects `data:` image URIs** — *deferred.* May be intentional (security). Worth a one-line decision (allow + document, or document the restriction), not a refactor.

## Source

Full findings, severity, and rationale: [`../2026-06-30-structural-review.md`](../2026-06-30-structural-review.md). Background memory: `code-review-2026-06-30-structural` in the project memory index.
