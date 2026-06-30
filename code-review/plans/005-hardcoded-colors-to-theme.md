# Plan 005: Remove hardcoded colors; route component colors through the MUI theme

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/components/TaskList.jsx src/components/TasksCategoriesPanel.jsx src/components/TasksCategoriesDialog.jsx src/components/LanguageSelector.jsx src/components/ThemeToggle.jsx`
> On mismatch with the patterns below, re-confirm with the Step 1 grep.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 003, 004 (they rewrite TaskList and the category components; running after them avoids editing the same lines twice)
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

`CLAUDE.md` states the project rule plainly: **all window/panel/header backgrounds come from the MUI theme; never hardcoded hex/rgba; header text uses `text.primary`, not `'white'`.** Many components break this — TaskList has 30+ color literals, `TasksCategoriesPanel` has 80+, and `LanguageSelector`/`ThemeToggle` reimplement their own `themeMode`-branching color logic. Hardcoded colors don't respond to the design-skin system, break dark mode in spots, and force a manual hex hunt whenever a design changes. Routing them through `theme.palette` makes color a single source of truth.

## Current state

The status-color literals follow a fixed semantic mapping that maps cleanly onto the theme palette:

| Hardcoded | Theme replacement |
|---|---|
| `#4CAF50` / `#4caf50` (done/success) | `theme.palette.success.main` |
| `#F44336` / `#f44336` (delete/error) | `theme.palette.error.main` |
| `#FF9800` / `#ff9800` (warning/postpone) | `theme.palette.warning.main` |
| `#2196F3` / `#2196f3` (info) | `theme.palette.info.main` |
| `#3B7DED` (primary blue) | `theme.palette.primary.main` |
| `'white'` / `'#ffffff'` / `'#fff'` as text-on-surface | `theme.palette.text.primary` (or `getContrastText` where it sits on a colored chip) |
| `'#aaaaaa'` / `#666666` (muted) | `theme.palette.text.secondary` |
| status-tint backgrounds (`#E8F5E8`, `#FFEBEE`, `#FFF3E0`, etc.) | `alpha(theme.palette.<sem>.main, 0.12)` |

Representative offenders:
- `src/components/TaskList.jsx:605` — `color: themeMode === 'light' ? 'text.secondary' : '#aaaaaa'` (and ~30 more literals around lines 174-210, 331, 347-349, 465-472).
- `src/components/LanguageSelector.jsx` — hardcodes `#3B7DED`, `'white'`, and a menu `PaperProps` with `backgroundColor: themeMode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(30,30,30,0.95)'` and `color: themeMode === 'light' ? '#000000' : '#ffffff'`.
- `src/components/ThemeToggle.jsx` — a private `getThemeColors()` returning the same hardcoded `#3B7DED`/`white`.

`alpha` is imported from `@mui/material/styles`; `useTheme` from `@mui/material`. Many of these components already receive a `themeMode` prop and branch on it — prefer `const theme = useTheme()` and read `theme.palette.*` instead, which removes the need for the `themeMode` branch entirely.

### Conventions

- Never hardcode hex/rgba (`CLAUDE.md`). Use `theme.palette.*` and `alpha(...)`.
- Header text: `text.primary`. Header/panel backgrounds: inherit from the `Paper`/theme, do not set explicit `backgroundColor` on a `DialogTitle` or header `Box` (`CLAUDE.md`).
- `useBubbleNotifications`' overdue red is handled in Plan 001 — do not touch it here.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`   | exit 0              |
| Tests     | `npm test`                    | all pass            |
| Lint      | `npm run lint`                | exit 0              |
| Build     | `npm run build`               | exit 0 (once, at end) |
| Find lits | (see Step 1)                  | enumerates targets  |

## Scope

**In scope** (component color literals only):
- `src/components/TaskList.jsx`
- `src/components/TasksCategoriesPanel.jsx`
- `src/components/TasksCategoriesDialog.jsx`
- `src/components/MobileCategorySelector.jsx`
- `src/components/LanguageSelector.jsx`
- `src/components/ThemeToggle.jsx`

**Out of scope**:
- `src/theme/designs/*` — those literals ARE the design definitions; they are correct. Design-file structure is handled by Plan 006; do not touch design files here.
- User-chosen tag colors (`tag.color`) — those are data, not theme; keep them.
- `useBubbleNotifications.js` overdue red (Plan 001).
- Bubble fill styles (Plan 001).

## Git workflow

- Branch: `advisor/005-theme-colors`
- One commit per file; conventional commits (`fix(theme): route TaskList colors through palette`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Enumerate the literals to fix

```
grep -rnE "#[0-9a-fA-F]{3,6}\b|rgba?\(" src/components/TaskList.jsx src/components/TasksCategoriesPanel.jsx src/components/TasksCategoriesDialog.jsx src/components/MobileCategorySelector.jsx src/components/LanguageSelector.jsx src/components/ThemeToggle.jsx | grep -v "tag.color"
```
This is your worklist. Each line maps to the table above.

### Step 2: Replace per file

For each file: add `const theme = useTheme();` (and `import { alpha } from '@mui/material/styles'` if you need tints). Replace each literal per the mapping table. Where a component branched on `themeMode` purely to pick a color, delete the branch and read `theme.palette.*` (which already differs by mode). Keep `tag.color` (user data) untouched. For colored chips where text sits on a semantic background, use `theme.palette.getContrastText(theme.palette.<sem>.main)`.

Run lint after each file.

**Verify per file**: `npm run lint` → exit 0.

### Step 3: Remove now-dead `themeMode` color plumbing

For `ThemeToggle.jsx`, delete `getThemeColors()` once unused. For `LanguageSelector.jsx`, if `themeMode` becomes unused after switching to `useTheme()`, remove the prop usage (leave the prop in the signature only if a parent still passes it and lint would otherwise flag nothing — prefer removing dead reads). Do not change parent call sites' other props.

**Verify**: `npm run lint` → exit 0.

### Step 4: Full verification

**Verify**: re-run the Step 1 grep → only `tag.color`-adjacent or genuinely-data colors remain (ideally zero). `npm test` → all pass. `npm run build` → exit 0.

## Test plan

- Visual, not unit: this is styling. Manual smoke in BOTH light and dark mode (toggle theme): task list rows, status chips, categories panel/dialog, mobile category dropdown, language menu, theme toggle button — colors look correct and adapt to mode and to a non-default design skin (switch design in the Appearance dialog).
- Verification: `npm run build` exit 0; `npm test` unchanged suite passes.

## Done criteria

- [ ] Step 1 grep returns no hardcoded hex/rgba in the six files (excluding `tag.color` data)
- [ ] `ThemeToggle.jsx` no longer defines `getThemeColors`; `grep -n getThemeColors src` → no matches
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] No design files (`src/theme/**`) modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- A literal has no clean palette equivalent (a one-off decorative color with real design intent) — list it and ask, rather than forcing a wrong semantic mapping.
- Removing a `themeMode` branch changes the rendered color in one mode (the hardcoded value didn't match the palette) — report the discrepancy; the palette is the intended source of truth, but confirm before shipping a visible change.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- Add a lint guard or PR-review note: no hex/rgba in `src/components/**` except `src/theme/**` and `tag.color` data.
- Run AFTER Plans 003 and 004 so you're not editing soon-to-be-moved lines.
- Reviewer should eyeball dark mode specifically — that's where hardcoded light-mode colors usually leaked.
