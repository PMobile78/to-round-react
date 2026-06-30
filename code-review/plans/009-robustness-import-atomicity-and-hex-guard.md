# Plan 009: Robustness — atomic JSON import and safe shadow-color parsing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/hooks/useBubbleImportExport.js src/hooks/useMatterEngine.js src/utils/colorUtils.js`
> On mismatch with the excerpts, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

Two small, real robustness gaps. (1) JSON import writes tags and bubbles in two sequential awaits with no rollback — if the second write fails, persisted state is half-applied and the page then reloads showing the inconsistent result. (2) The Matter "hard shadow" effect parses `shadowColor` by slicing fixed hex offsets; a non-`#RRGGBB` value yields `rgba(NaN, NaN, NaN, …)` and silently broken shadows. Both are cheap to make correct.

## Current state

**Issue 1 — non-atomic import** (`src/hooks/useBubbleImportExport.js:31-49`):

```js
const handleImportJson = useCallback(async (data) => {
    try {
        const { importedTags, importedBubbles } = parseImportData(data);
        setTags(importedTags);
        await saveTagsToFirestore(importedTags);      // (1)
        setBubbles(importedBubbles);
        await saveBubblesToFirestore(importedBubbles); // (2) if this throws, tags already persisted + state set
        window.location.reload();
    } catch (e) {
        logger.error('Import JSON failed', e);         // only logs; state already mutated
    }
}, [setTags, setBubbles]);
```
The two saves are independent, so they can run together; and React state should not be set until persistence succeeds (the reload re-reads from Firestore anyway).

**Issue 2 — unsafe hex parse** (`src/hooks/useMatterEngine.js:414-418`):

```js
const shadowColor = effectParams.shadowColor || '#000000';
const shadowAlpha = effectParams.shadowAlpha || 0.5;
// Parse hex color once, before loops
const shadowRgbaStyle = `rgba(${parseInt(shadowColor.substring(1, 3), 16)}, ${parseInt(shadowColor.substring(3, 5), 16)}, ${parseInt(shadowColor.substring(5, 7), 16)}, ${shadowAlpha})`;
```
`shadowColor` comes from theme design `effectParams`. A 3-digit hex, an `rgb(...)` string, or a named color produces `NaN` channels. `src/utils/colorUtils.js` already exists (it exports `withAlpha`) and is the right home for a validated converter.

### Conventions

- Pure helpers in `src/utils/` with a sibling test (pattern: `src/utils/dateTime.test.js`).
- Use `logger` (`src/utils/logger`) for errors; 4-space indentation.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`              | exit 0              |
| New test  | `npx vitest run src/utils/colorUtils.test.js` | all pass       |
| Tests     | `npm test`                               | all pass            |
| Lint      | `npm run lint`                           | exit 0              |

## Scope

**In scope**:
- `src/hooks/useBubbleImportExport.js`
- `src/utils/colorUtils.js` (add `hexToRgba`)
- `src/utils/colorUtils.test.js` (create or extend)
- `src/hooks/useMatterEngine.js` (use `hexToRgba`)

**Out of scope**:
- The post-import `window.location.reload()` (the file has a TODO to replace it with proper Matter reinit — leave it; it's the documented current behavior).
- Any other Matter effect besides `hardShadow`.
- The store/context refactor (separate plan) — keep `useBubbleImportExport`'s `pageDeps` shape as-is.

## Git workflow

- Branch: `advisor/009-robustness`
- Conventional commits (`fix(import): run firestore writes atomically`; `fix(matter): guard shadow color parsing`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Make import atomic

Rewrite `handleImportJson` so persistence happens before state mutation and the two writes run together:

```js
const handleImportJson = useCallback(async (data) => {
    try {
        const { importedTags, importedBubbles } = parseImportData(data);
        await Promise.all([
            saveTagsToFirestore(importedTags),
            saveBubblesToFirestore(importedBubbles),
        ]);
        setTags(importedTags);
        setBubbles(importedBubbles);
        window.location.reload();
    } catch (e) {
        logger.error('Import JSON failed', e);
        // state untouched on failure
    }
}, [setTags, setBubbles]);
```

(If `saveBubblesToFirestore` depends on tags already being saved, keep order but still avoid setting React state until both resolve — verify by reading both functions in `firestoreService.js`. If they're independent, `Promise.all` is correct.)

**Verify**: `npm run lint` → exit 0.

### Step 2: Add a validated `hexToRgba` to colorUtils

```js
// src/utils/colorUtils.js
export function hexToRgba(hex, alpha = 1) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}
```

Test in `src/utils/colorUtils.test.js`: `hexToRgba('#000000',0.5)==='rgba(0, 0, 0, 0.5)'`; works without leading `#`; returns `null` for `'#fff'` (3-digit), `'red'`, `''`, `null`.

**Verify**: `npx vitest run src/utils/colorUtils.test.js` → all pass.

### Step 3: Use it in useMatterEngine

Replace the inline `shadowRgbaStyle` construction with `hexToRgba(shadowColor, shadowAlpha)`, falling back to the existing default when it returns `null`:

```js
const shadowRgbaStyle = hexToRgba(shadowColor, shadowAlpha) || `rgba(0, 0, 0, ${shadowAlpha})`;
```
Import `hexToRgba` from `../utils/colorUtils`.

**Verify**: `grep -n "substring(1, 3)" src/hooks/useMatterEngine.js` → no matches. `npm run lint` → exit 0.

### Step 4: Full verification

**Verify**: `npm test` → all pass.

## Test plan

- New unit tests for `hexToRgba` (Step 2) — happy path, no-`#`, and each invalid form → `null`.
- `useBubbleImportExport` has no existing unit test and is Firestore/`window.reload`-bound; do not add a brittle mock here — verify by reading the diff and a manual smoke (export JSON, re-import it, confirm data loads). Report the smoke result.
- Verification: `npm test` → all pass.

## Done criteria

- [ ] `handleImportJson` uses `Promise.all` and sets React state only after writes resolve
- [ ] `src/utils/colorUtils.js` exports `hexToRgba`; tests exist and pass
- [ ] `grep -n "substring(1, 3)" src/hooks/useMatterEngine.js` → no matches
- [ ] `npm test` exits 0, `npm run lint` exits 0
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- `saveBubblesToFirestore` genuinely requires tags to be persisted first (a read-after-write dependency) — then keep sequential order but still defer state mutation; note it.
- The `hardShadow` block in `useMatterEngine.js` no longer matches the excerpt.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- If more Matter effects parse colors, route them through `hexToRgba` too.
- When the import-reload TODO is finally addressed (proper Matter reinit instead of `window.location.reload()`), revisit this handler.
- Reviewer: confirm import failure now leaves on-screen state unchanged (no half-applied import).
