# Plan 008: Remove the legacy bubbles[] dual-schema (client + Cloud Functions)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/services/firestoreService.js functions/index.js`
> On mismatch with the excerpts, STOP.
>
> **READ THIS FIRST**: This plan deletes a backward-compatibility fallback. It
> is safe ONLY if no live users still store data in the legacy `bubbles[]`
> array. Step 0 is a mandatory gate — if you cannot satisfy it, STOP and report;
> do not delete on assumption.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (data-facing — gated by Step 0)
- **Depends on**: none (isolated to services/functions), but see Step 0 gate
- **Category**: tech-debt / migration
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

The app moved from a single per-user document holding a `bubbles[]` array to a `user-bubbles/{uid}/bubbles/{bubbleId}` subcollection. Per `CLAUDE.md`, the legacy array is "no longer read by server logic," yet fallback branches that read/write it remain in both the client service and the Cloud Functions. They tangle every load, subscribe, and write path with a dead second schema, make the data flow hard to follow, and turn each server write into two sequential writes (subdoc + a legacy/parent touch). Deleting the legacy branches collapses these to single, obvious operations.

## Current state

**Client — `src/services/firestoreService.js`.** Load tries subcollection, then legacy doc (with a one-time migration whose errors are silently swallowed), then localStorage:

```js
// src/services/firestoreService.js:120-155 (loadBubblesFromFirestore)
const snapshot = await getDocs(bubblesCol);
const normalized = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
if (normalized.length > 0) return normalized;
// Fallback to old array-based doc
const oldDocRef = doc(db, BUBBLES_COLLECTION, userId);
const docSnap = await getDoc(oldDocRef);
if (docSnap.exists()) {
    const data = docSnap.data();
    const legacy = Array.isArray(data.bubbles) ? data.bubbles : [];
    if (legacy.length > 0) {
        try { await saveBubblesToFirestore(legacy); await setDoc(oldDocRef, { migratedToSubcollection:true, ... }, {merge:true}); }
        catch (_) { /* ignore migration errors */ }   // <- silent
    }
    return legacy;
}
// ...localStorage fallback...
```

Subscribe downgrades to a legacy doc listener on subcollection error:

```js
// src/services/firestoreService.js:393-420 (subscribeToBubblesUpdates)
currentUnsub = onSnapshot(bubblesCol, (querySnap) => { ...callback(list)... }, (err) => {
    logger.warn('Subcollection onSnapshot error, falling back to legacy doc listener', err);
    currentUnsub?.();
    const legacyRef = doc(db, BUBBLES_COLLECTION, userId);
    currentUnsub = onSnapshot(legacyRef, (docSnap) => { callback(docSnap.exists() ? (docSnap.data().bubbles || []) : []); });
});
```

**Server — `functions/index.js`.** Both updaters write the subdoc, then fall back to mutating the parent `bubbles[]` array when the subdoc is missing:

```js
// functions/index.js:387-405 (updateBubbleDueDate) and 407-424 (updateBubbleFields)
if (subSnap.exists) {
    await subDoc.set({ ... }, { merge: true });
    await db.collection('user-bubbles').doc(userId).set({ updatedAt: serverTimestamp() }, { merge: true }); // parent touch
    return;
}
// Legacy fallback: array in parent doc  <- to delete
const snapshot = await docRef.get();
const list = Array.isArray(data.bubbles) ? data.bubbles : [];
const updated = list.map(b => (b.id === bubbleId ? { ...b, ... } : b));
await docRef.set({ ...data, bubbles: updated, updatedAt: serverTimestamp() }, { merge: true });
```

Note: in the current-schema path the second write is only a cosmetic parent-doc `updatedAt` touch — see Step 3 about whether it can be dropped.

`functions/index.js` reads tasks via a `collectionGroup('bubbles')` query (per `CLAUDE.md` / `docs/notifications.md`) — it does **not** read the legacy array. Pure scheduler logic is unit-tested in `functions/test-next-notify.js` (run via `npm run test:functions`).

### Conventions

- Client service: ES modules, `logger` for errors (`src/utils/logger`), 4-space indentation.
- Functions: CommonJS-ish Gen2 handlers; keep region `europe-west1`; do not change function signatures/exports.

## Commands you will need

| Purpose        | Command                          | Expected on success |
|----------------|----------------------------------|---------------------|
| Install        | `npm ci --legacy-peer-deps`      | exit 0              |
| Client tests   | `npm test`                       | all pass            |
| Function tests | `npm run test:functions`         | all pass            |
| Lint           | `npm run lint`                   | exit 0              |

## Scope

**In scope**: `src/services/firestoreService.js`, `functions/index.js`.

**Out of scope**:
- `firestore.rules`, `docs/notifications.md`, the scheduler/`collectionGroup` query logic.
- The localStorage cache fallback in `loadBubblesFromFirestore` (the `` `bubbles_${userId}` `` branch) — that is an offline cache, NOT the legacy schema; keep it.
- Tags persistence (single-doc array) — that is a separate, intentional schema; do not touch.

## Git workflow

- Branch: `advisor/008-remove-legacy-schema`
- Conventional commits (`refactor(firestore): drop legacy bubbles[] fallback`).
- Do NOT push, deploy, or open a PR unless instructed. (Deploying Cloud Functions is a separate, manual step the maintainer controls.)

## Steps

### Step 0 (GATE): Confirm no live legacy data

Do not proceed past this step without a clear yes. Acceptable evidence (any one):
- The maintainer confirms all users migrated (ask, and record the answer in your report).
- A one-off read shows zero parent docs containing a non-empty `bubbles` array (the maintainer runs this; you do not have prod credentials).

If you cannot get confirmation, STOP and report: "Step 0 gate unmet — legacy removal not authorized." Implement nothing.

### Step 1: Client — simplify `loadBubblesFromFirestore`

Remove the legacy `oldDocRef` branch and the one-time migration block. Keep: subcollection read, then the localStorage cache fallback, then the catch→localStorage path. The function becomes: read subcollection → return; on error → localStorage cache.

**Verify**: `grep -n "Array.isArray(data.bubbles)" src/services/firestoreService.js` → no matches. `npm run lint` → exit 0.

### Step 2: Client — simplify `subscribeToBubblesUpdates`

Remove the legacy doc-listener fallback inside the error handler. On subcollection error, log via `logger.error` and call `callback([])` (or surface the error) — do NOT silently switch to the parent doc. Keep the single subcollection `onSnapshot` and its unsubscribe.

**Verify**: `grep -n "legacyRef" src/services/firestoreService.js` → no matches. `npm run lint` → exit 0.

### Step 3: Server — drop the legacy fallback in both updaters

In `updateBubbleDueDate` and `updateBubbleFields` (`functions/index.js`), delete the "Legacy fallback: array in parent doc" blocks (everything after the `if (subSnap.exists) { ... return; }`). If the subdoc doesn't exist, the task isn't in the current schema — `return` (optionally log). 

Decide on the parent `updatedAt` touch: if nothing reads the parent doc's `updatedAt` anymore (grep the codebase + `docs/`), drop it too so each updater is a single `subDoc.set`. If unsure whether a client listener depends on it, keep the touch but make it the only second write. State which you chose and why in your report.

**Verify**: `grep -n "data.bubbles" functions/index.js` → no matches. `npm run test:functions` → all pass.

### Step 4: Full verification

**Verify**: `npm test` → all pass. `npm run test:functions` → all pass. `npm run lint` → exit 0.

## Test plan

- `functions/test-next-notify.js` covers the pure scheduler math and must stay green (`npm run test:functions`). The updaters are I/O wrappers; if there's no existing test harness mocking Firestore for them, do not invent one here — rely on the function tests + the maintainer's staging deploy.
- Client: existing `npm test` suite must pass; the load/subscribe paths have no unit tests today (Firestore-dependent), so verification is lint + suite + the Step 0 gate + a maintainer smoke test on staging.
- Document in your report exactly which branches you deleted.

## Done criteria

- [ ] Step 0 gate satisfied and recorded in the report (or plan correctly STOPPED)
- [ ] `grep -rn "data.bubbles" src/services/firestoreService.js functions/index.js` → no matches
- [ ] `grep -n "legacyRef\|Legacy fallback\|migratedToSubcollection" src functions` → no matches
- [ ] `npm test` exits 0, `npm run test:functions` exits 0, `npm run lint` exits 0
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- Step 0 cannot be satisfied (no confirmation of full migration). **This is the most important STOP.**
- Removing the subscribe fallback would leave users with a known-failing subcollection listener (e.g. a rules issue) with no recovery — confirm rules allow the subcollection read first.
- A grep shows the parent `bubbles[]` array is read somewhere you didn't expect.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- After this lands and a Functions deploy happens, the parent `user-bubbles/{uid}` doc is effectively vestigial except for any `updatedAt` you kept — consider a later cleanup migration to delete those parent docs.
- Reviewer: confirm the localStorage cache fallback was preserved (it is NOT legacy schema) and that no scheduler/collectionGroup logic changed.
- Coordinate the Functions deploy with the maintainer; this plan does not deploy.
