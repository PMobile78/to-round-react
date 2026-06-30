# Plan 001: Use canonical helpers instead of re-implemented duplicates (getOffsetMs, applyBubbleFill, shouldShowStopPulsing)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/pages/BubblesPage.jsx src/hooks/useTags.js src/hooks/useBubbleNotifications.js src/utils/notifications.js src/utils/dateTime.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

Three pieces of domain logic are re-implemented inline even though a canonical, tested helper already exists. The worst case has already **drifted**: `BubblesPage.jsx` re-parses notification offsets inline and accepts a different object shape than the canonical `getOffsetMs`, so the two can disagree. Re-implementations like this are how subtle bugs appear when one copy is fixed and the other isn't. Routing every call through the canonical helper deletes ~40 lines of inline logic and removes the drift.

## Current state

Project: React + Vite 8 + MUI v7 + Matter.js + Firebase, plain JavaScript (no TypeScript). Bubbles are physics bodies; `bubble.body.render.fillStyle`/`strokeStyle` control their canvas appearance.

**Problem 1 — `getOffsetMs` re-implemented and drifted.**
Canonical helper (already unit-tested in `src/utils/dateTime.test.js`):

```js
// src/utils/dateTime.js:79-104
export const getOffsetMs = (notification) => {
    if (!notification) return 0;
    if (typeof notification === 'string') {
        const num = parseInt(notification);
        if (!Number.isFinite(num)) return 0;
        if (notification.endsWith('m')) return num * 60 * 1000;
        if (notification.endsWith('h')) return num * 60 * 60 * 1000;
        if (notification.endsWith('d')) return num * 24 * 60 * 60 * 1000;
        if (notification.endsWith('w')) return num * 7 * 24 * 60 * 60 * 1000;
        return 0;
    }
    if (typeof notification === 'object' && notification.type === 'custom') {
        const v = Number(notification.value);
        switch (notification.unit) {
            case 'minutes': return v * 60 * 1000;
            case 'hours': return v * 60 * 60 * 1000;
            case 'days': return v * 24 * 60 * 60 * 1000;
            case 'weeks': return v * 7 * 24 * 60 * 60 * 1000;
            default: return 0;
        }
    }
    return 0;
};
```

The inline duplicate lives inside an IIFE in `BubblesPage.jsx` (the `editDialogShowStopPulsing` computed value, lines 768-817). The offending parse is at lines 786-804. Note the **drift**: the inline object branch (line 795) is `else if (typeof notif === 'object')` and does **not** require `notif.type === 'custom'` the way `getOffsetMs` does — so it accepts object shapes the canonical helper rejects.

```js
// src/pages/BubblesPage.jsx:768-817 (the whole IIFE — to be replaced)
const editDialogShowStopPulsing = (() => {
    try {
        if (!selectedBubble || selectedBubble.status !== BUBBLE_STATUS.ACTIVE) return false;
        const rec = selectedBubble.recurrence;
        const every = rec && typeof rec === 'object' ? Number(rec.every) : NaN;
        if (!Number.isFinite(every) || every < 1) return false;
        const now = Date.now();
        if (selectedBubble.dueDate) {
            const parsedDue = parseLocalDateTime(selectedBubble.dueDate);
            if (!parsedDue) return false;
            const due = parsedDue.getTime();
            if (Array.isArray(selectedBubble.notifications) && selectedBubble.notifications.length > 0) {
                for (const notif of selectedBubble.notifications) {
                    let offsetMs = 0;
                    // ... inline duplicate of getOffsetMs (lines 788-801) ...
                    const targetTime = due - offsetMs;
                    if (Number.isFinite(targetTime) && now >= targetTime && now < due) return true;
                }
            }
            if (now >= due) return true;
        }
        if (selectedBubble.overdueSticky || stickyPulseRef.current.has(selectedBubble.id)) return true;
        return false;
    } catch (_) { return false; }
})();
```

`BubblesPage.jsx` already imports `parseLocalDateTime` from `../utils/notifications`'s sibling `../utils/dateTime` (line 42), and `notificationKeyPrefix` from `../utils/notifications` (line 43). `src/utils/notifications.js` already exists and already received `isOverdue` in an earlier refactor — it is the correct home for this logic.

**Problem 2 — bubble recolor duplicated across ~14 sites.** The exact pattern `bubble.body.render.fillStyle = getBubbleFillStyle(tagColor)` (sometimes with `strokeStyle`) is copy-pasted. Representative sites:

```js
// src/hooks/useTags.js:166-168
bubble.body.render.strokeStyle = '#B0B0B0';
bubble.body.render.fillStyle = getBubbleFillStyle(null);
```
```js
// src/hooks/useBubbleNotifications.js:213 and :237 (overdue/active-notif pulse — HARDCODED red)
bubble.body.render.fillStyle = 'rgba(255,0,0,0.5)';
// ...elsewhere in the same rAF loop (177,188,216,240,247): bubble.body.render.fillStyle = getBubbleFillStyle(tagColor);
```
```js
// src/pages/BubblesPage.jsx:459-464
bubble.body.render.strokeStyle = tag.color;
bubble.body.render.fillStyle = getBubbleFillStyle(tag.color);
// ...
bubble.body.render.strokeStyle = '#B0B0B0';
bubble.body.render.fillStyle = getBubbleFillStyle(null);
```

Full site list (confirm with the grep in Done criteria): `src/hooks/useTags.js:167-168`, `src/hooks/useBubbleNotifications.js:177,188,213,216,237,240,247`, `src/pages/BubblesPage.jsx:406,459-460,463-464,619`.

`getBubbleFillStyle` is defined in `BubblesPage.jsx:260-270` and passed into the hooks; `'#B0B0B0'` is the "no tag" stroke; `'rgba(255,0,0,0.5)'` is the overdue/active-notification flash color.

### Conventions to follow

- Colors must come from the MUI theme, never hardcoded hex/rgba (see `CLAUDE.md` → "Active refactor context"). `useBubbleNotifications` is a hook and may call `useTheme()` to obtain `theme.palette.error.main`.
- Pure helpers live in `src/utils/` and have a sibling `*.test.js` (see `src/utils/dateTime.test.js`, `src/utils/notifications.test.js` for the test style: `vitest`, `describe`/`it`/`expect`).
- Match existing import style and 4-space indentation.

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`               | exit 0              |
| Tests     | `npm test`                                | all pass            |
| One test  | `npx vitest run src/utils/notifications.test.js` | pass         |
| Lint      | `npm run lint`                            | exit 0              |

## Scope

**In scope** (the only files you may modify):
- `src/utils/notifications.js` (add `shouldShowStopPulsing`)
- `src/utils/notifications.test.js` (add tests)
- `src/utils/bubbleStyle.js` (create — `applyBubbleFill`)
- `src/utils/bubbleStyle.test.js` (create — tests)
- `src/pages/BubblesPage.jsx`
- `src/hooks/useTags.js`
- `src/hooks/useBubbleNotifications.js`

**Out of scope** (do NOT touch):
- `src/utils/dateTime.js` — `getOffsetMs` is correct; only import it.
- Any `localStorage` refactor — that is Plan 002.
- Component color literals (TaskList, panels, LanguageSelector) — that is Plan 005.
- The pulse/scale math in `useBubbleNotifications` — only the `fillStyle`/`strokeStyle` assignments change; leave `Matter.Body.scale` calls untouched.

## Git workflow

- Branch: `advisor/001-canonical-helpers`
- Conventional commits (repo style, e.g. `refactor(bubbles): route notification offset through getOffsetMs`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add `shouldShowStopPulsing` to `src/utils/notifications.js`

Move the body of the `editDialogShowStopPulsing` IIFE into a pure function. Import `getOffsetMs` and `parseLocalDateTime` from `./dateTime`. Signature:

```js
// pass stickyPulseIds as a Set (the caller currently uses stickyPulseRef.current)
export function shouldShowStopPulsing(bubble, now, stickyPulseIds) { /* ... */ }
```

Replace the inline offset parse with `getOffsetMs(notif)`. Keep behavior identical otherwise (active-notification window OR overdue OR sticky → true; requires ACTIVE status and a valid `recurrence.every >= 1`). Keep the defensive `try/catch → false`.

**Verify**: `npm run lint` → exit 0.

### Step 2: Test `shouldShowStopPulsing`

In `src/utils/notifications.test.js`, add a `describe('shouldShowStopPulsing', ...)` covering: non-active bubble → false; no recurrence → false; overdue active bubble with `recurrence.every=1` → true; inside a notification window (e.g. dueDate in 5 min, notification `'10m'`) → true; sticky id present → true; well-formed but not-yet-due, no sticky → false. Model structure after the existing tests in the same file.

**Verify**: `npx vitest run src/utils/notifications.test.js` → all pass including the new cases.

### Step 3: Use it in `BubblesPage.jsx`

Import `shouldShowStopPulsing`. Replace the entire IIFE (lines 768-817) with:

```js
const editDialogShowStopPulsing = shouldShowStopPulsing(
    selectedBubble, Date.now(), stickyPulseRef.current
);
```

Remove now-unused locals if any. `parseLocalDateTime` is still used elsewhere in the file — do not remove its import unless `grep -n parseLocalDateTime src/pages/BubblesPage.jsx` shows zero other uses.

**Verify**: `grep -n "u === 'm' ? val" src/pages/BubblesPage.jsx` → no matches (the inline parse is gone). `npm run lint` → exit 0.

### Step 4: Create `applyBubbleFill` in `src/utils/bubbleStyle.js`

```js
// Centralizes the repeated "recolor a Matter bubble body" operation.
// getBubbleFillStyle(tagColor|null) -> css color string (injected; depends on page state).
export function applyBubbleFill(bubble, { tagColor = null, stroke, overdueColor = null } = {}, getBubbleFillStyle) {
    if (!bubble || !bubble.body || !bubble.body.render) return;
    const render = bubble.body.render;
    if (overdueColor) {
        render.fillStyle = overdueColor;
    } else {
        render.fillStyle = getBubbleFillStyle(tagColor);
    }
    if (stroke !== undefined) render.strokeStyle = stroke;
}
```

Add `src/utils/bubbleStyle.test.js`: passing a fake `{ body: { render: {} } }` and a stub `getBubbleFillStyle`, assert `fillStyle`/`strokeStyle` are set correctly for the tag case, the no-tag case (`stroke: '#B0B0B0'`), and the overdue case (`overdueColor` wins over `getBubbleFillStyle`).

**Verify**: `npx vitest run src/utils/bubbleStyle.test.js` → all pass.

### Step 5: Replace recolor sites with `applyBubbleFill`

At each site listed in "Current state", replace the manual `fillStyle`/`strokeStyle` assignments with one `applyBubbleFill(...)` call. Mapping:
- no-tag reset (`strokeStyle = '#B0B0B0'; fillStyle = getBubbleFillStyle(null)`) → `applyBubbleFill(bubble, { tagColor: null, stroke: '#B0B0B0' }, getBubbleFillStyle)`
- tag recolor → `applyBubbleFill(bubble, { tagColor: tag.color, stroke: tag.color }, getBubbleFillStyle)`
- overdue/active flash (`fillStyle = 'rgba(255,0,0,0.5)'`) → `applyBubbleFill(bubble, { overdueColor }, getBubbleFillStyle)`

In `useBubbleNotifications.js`, obtain the overdue color from the theme: add `const theme = useTheme();` (import `useTheme` from `@mui/material`) and compute `const overdueColor = alpha(theme.palette.error.main, 0.5);` (import `alpha` from `@mui/material/styles`). This removes the `'rgba(255,0,0,0.5)'` hardcode. Do NOT change the conditions that decide when the overdue color applies.

**Verify**: `grep -rn "rgba(255,0,0,0.5)" src/` → no matches. `grep -rn "render.fillStyle *=" src/ | grep -v bubbleStyle.js` → no matches (all routed through the helper). `'#B0B0B0'` may still appear only as the `stroke:` argument value.

### Step 6: Full verification

**Verify**: `npm test` → all pass. `npm run lint` → exit 0.

## Test plan

- New: `src/utils/notifications.test.js` — `shouldShowStopPulsing` cases (Step 2).
- New: `src/utils/bubbleStyle.test.js` — `applyBubbleFill` cases (Step 4).
- Pattern to follow: `src/utils/dateTime.test.js`.
- Verification: `npm test` → all pass, new tests included.

## Done criteria

ALL must hold:
- [ ] `npm test` exits 0; new tests for `shouldShowStopPulsing` and `applyBubbleFill` exist and pass
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "rgba(255,0,0,0.5)" src/` → no matches
- [ ] `grep -n "u === 'm' ? val" src/pages/BubblesPage.jsx` → no matches
- [ ] `grep -rn "render.fillStyle *=" src/ | grep -v "utils/bubbleStyle.js"` → no matches
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:
- The `editDialogShowStopPulsing` IIFE in `BubblesPage.jsx` no longer matches the excerpt (someone changed the stop-pulsing rule) — behavior parity can't be assumed.
- Removing `'rgba(255,0,0,0.5)'` changes the visible overdue flash in a way you can't keep equivalent with `alpha(error.main, 0.5)` (e.g. the theme's error color is not red) — report instead of guessing.
- `getBubbleFillStyle` turns out to need an argument you can't supply at a recolor site.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- After Plan 009 (store/context) lands, the recolor sites may move into the store; `applyBubbleFill` should move with them and stay the single recolor entry point.
- If a new notification unit is added, only `getOffsetMs` in `dateTime.js` changes — there must never again be a second parser.
- Reviewer should confirm the overdue flash still appears (manual smoke test: create a task with a due date in the past, open bubbles view).
