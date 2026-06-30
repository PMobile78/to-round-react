# Plan 002: Route all localStorage access through the existing storage util + a key registry

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/`
> If the files in "Current state" changed materially since this plan was
> written, re-confirm the call sites with the Step 1 grep before editing.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (but see Maintenance — best run before the big refactors so they adopt the convention)
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

A canonical, crash-safe storage wrapper already exists (`src/utils/storage.js`, `lsGet`/`lsSet` with JSON parse + try/catch), but ~90 call sites bypass it and call `localStorage.getItem/setItem` directly with bare strings and ad-hoc `JSON.parse`. One hook (`useBubbleFilters.js`) alone has 36 raw calls. Direct access scatters JSON parsing, swallows nothing on quota errors, and spreads magic-string keys with no single source of truth — a typo in a key silently loses a user setting. Routing everything through `lsGet`/`lsSet` and a key registry removes the duplication and makes every persisted key greppable in one place.

## Current state

The canonical util (use this — do not write a new one):

```js
// src/utils/storage.js
export const lsGet = (key, fallback = null) => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch { return fallback; }
};
export const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* ignore quota errors */ }
};
```

Raw-call counts per file (from `grep -rc 'localStorage\.' src`):

```
src/hooks/useBubbleFilters.js   36
src/pages/BubblesPage.jsx       14
src/hooks/useListFilters.js     12
src/services/firestoreService.js 8
src/hooks/useThemeMode.js        7
src/services/mindmapService.js   2
src/services/authService.js      2
src/hooks/useTags.js             2
src/components/TaskList.jsx       2
src/components/LanguageSelector.jsx 1
src/components/BubbleDialogForm.jsx 1
```

Examples of the patterns to replace:

```js
// raw read with manual JSON.parse + fallback  →  lsGet(KEY, fallback)
const saved = localStorage.getItem('bubbles-filter-tags');
return saved ? JSON.parse(saved) : [];

// raw write with manual JSON.stringify  →  lsSet(KEY, value)
localStorage.setItem('bubbles-filter-tags', JSON.stringify(validFilterTags));

// raw write of a primitive string  →  lsSet(KEY, value) (stringify is fine for primitives)
localStorage.setItem('bubbles-main-view', next);
```

Some sites store **plain strings** (e.g. `bubbles-main-view`, `bubbles-list-sort-by`) and read them back with `localStorage.getItem(...)` expecting a raw string, NOT JSON. `lsGet` does `JSON.parse`, which parses `"tasks"` (a JSON string written by `lsSet`) correctly, but will throw→fallback on a **bare** legacy string like `tasks` that was written before this change. See STOP conditions and Step 4 (migration-safe reads).

### Conventions

- Keep 4-space indentation and existing import grouping.
- The Firestore per-user cache keys are **dynamic** (`` `bubbles_${userId}` ``, `` `tags_${userId}` ``) — these still go through `lsGet`/`lsSet` but the key is built inline; do not force them into the static registry.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`   | exit 0              |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Count raw | `grep -rc 'localStorage\.' src \| grep -v ':0'` | only `src/utils/storage.js:2` remains |

## Scope

**In scope**: `src/utils/storageKeys.js` (create), `src/utils/storage.js` (only if you add a tiny `lsGetString` helper — see Step 4), and every file in the count table above.

**Out of scope**:
- Behavior changes. This is a mechanical equivalence refactor: same keys, same values, same defaults.
- `localStorage` calls inside `public/sw.js` or `scripts/` (build-time / service worker) — leave them.
- The dynamic `bubbles_${uid}` / `tags_${uid}` cache keys' shape.

## Git workflow

- Branch: `advisor/002-storage-util`
- One commit per file or per logical group; conventional commits (`refactor(storage): route useBubbleFilters through lsGet/lsSet`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Inventory the keys

Run and save the output:
```
grep -rohnE "localStorage\.(get|set)Item\('[^']*'" src | sed -E "s/.*\('([^']*)'.*/\1/" | sort -u
```
This is the full set of static keys. Every static key becomes one entry in the registry.

### Step 2: Create `src/utils/storageKeys.js`

Export a frozen map of every static key from Step 1, e.g.:
```js
export const LS = Object.freeze({
  THEME_MODE: 'app-theme-mode',
  DESIGN: 'app-design',
  FILTER_TAGS: 'bubbles-filter-tags',
  SHOW_NO_TAG: 'bubbles-show-no-tag',
  LIST_FILTER_TAGS: 'bubbles-list-filter-tags',
  LIST_SHOW_NO_TAG: 'bubbles-list-show-no-tag',
  MAIN_VIEW: 'bubbles-main-view',
  FONT_SIZE: 'bubbles-font-size',
  // ...one line per key from Step 1...
});
```
Use the **exact** existing string values — do not rename keys (that would orphan users' saved settings).

**Verify**: `npm run lint` → exit 0.

### Step 3: Replace reads/writes file by file

For each file, replace:
- `localStorage.getItem(KEY)` + `JSON.parse(...)` + fallback → `lsGet(LS.X, fallback)`
- `localStorage.setItem(KEY, JSON.stringify(v))` → `lsSet(LS.X, v)`
- `localStorage.setItem(KEY, primitiveString)` → `lsSet(LS.X, primitiveString)`

Import `{ lsGet, lsSet }` from the correct relative path to `src/utils/storage.js` and `{ LS }` from `src/utils/storageKeys.js`. Work one file at a time and run lint after each.

**Verify per file**: `npm run lint` → exit 0.

### Step 4: Migration-safe reads for plain-string keys

For keys previously written as **bare strings** (not JSON) and read with a direct `getItem` comparison — e.g. `localStorage.getItem('bubbles-main-view') === 'tasks'` (`BubblesPage.jsx:219`), `bubbles-list-sort-by`, `bubbles-list-sort-order`, `app-theme-mode`, `app-design`, `i18nextLng`, `bubbles-show-instructions`, `bubbles-background-enabled` — a stored bare value like `tasks` is not valid JSON and `lsGet` will return the fallback, silently resetting the setting on first load after deploy.

Handle this with a string-tolerant read. Add to `src/utils/storage.js`:
```js
// reads a value that may have been stored either as raw string (legacy) or JSON
export const lsGetString = (key, fallback = null) => {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try { const v = JSON.parse(raw); return typeof v === 'string' ? v : raw; }
  catch { return raw; }
};
```
Use `lsGetString` for those legacy plain-string keys; use `lsGet` for keys that always held JSON (arrays/objects/numbers). Writes always use `lsSet`.

**Verify**: open `src/pages/BubblesPage.jsx` and confirm `mainView`, `listSortBy`, `listSortOrder`, `showInstructions`, `bubbleBackgroundEnabled` initial-state reads use `lsGetString`/`lsGet` appropriately and still default identically.

### Step 5: Full verification

**Verify**: `npm test` → all pass. `npm run lint` → exit 0. `grep -rc 'localStorage\.' src | grep -v ':0'` → only `src/utils/storage.js` appears.

## Test plan

- No new behavior, so no new feature tests are strictly required, but add `src/utils/storage.test.js` if absent: `lsGet` returns fallback on missing/corrupt; `lsSet` round-trips an array; `lsGetString` returns a bare legacy string and a JSON string identically. Pattern: `src/utils/dateTime.test.js`.
- Existing tests (`useBubbleFilters.test.js`, `useListFilters.test.js`) must still pass unchanged — they exercise the filter hooks you are editing.
- Verification: `npm test` → all pass.

## Done criteria

- [ ] `grep -rc 'localStorage\.' src | grep -v ':0'` → only `src/utils/storage.js`
- [ ] `src/utils/storageKeys.js` exists; every static key has one entry; no key string is duplicated as a literal elsewhere (`grep -rn "'bubbles-filter-tags'" src` → only in `storageKeys.js`)
- [ ] `npm test` exits 0 (including `useBubbleFilters.test.js`, `useListFilters.test.js`)
- [ ] `npm run lint` exits 0
- [ ] No key string was renamed (diff shows only access-pattern changes, not new key values)
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- A call site reads a key with logic that isn't a simple get/parse/fallback or set/stringify (e.g. it inspects `localStorage.length`, iterates keys, or stores non-JSON-safe data) — these need case-by-case judgment.
- After switching a plain-string key to `lsGet`, a related test fails — it likely needs `lsGetString` (Step 4).
- The total raw-call count doesn't drop to the storage.js baseline after you believe you're done — you missed a file; re-run the Step 1 grep.

## Maintenance notes

- New persisted settings must add a `LS` entry and use `lsGet`/`lsSet` — never a bare `localStorage` call. Add this to PR review checks.
- Run this plan **before** Plan 009 (store/context) so the new store consumes `lsGet`/`lsSet` from the start; if 009 lands first, re-apply within the store.
- This plan touches files that Plans 003/004/005 also touch (TaskList, BubbleDialogForm). Coordinate ordering with whoever runs those (run this first, or rebase).
