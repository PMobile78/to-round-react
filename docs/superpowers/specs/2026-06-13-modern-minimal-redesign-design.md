# Modern Minimal Redesign — Design Spec

**Date:** 2026-06-13
**Status:** ✅ Implemented & shipped (2026-06-13)
**Branch:** `redesign/modern-minimal` (смержена fast-forward в `main`, запушена/задеплоена; ветка удалена)

> ✅ Редизайн реализован: тема Inter / `#2f6bdb` / мягкие радиусы и тени / пастельные пузыри с тонкими цветными обводками — внедрён на BubblesPage и через MUI-оверрайды. Коммиты редизайна: `9997111`, `3a92690`, `ce36a0b`, `0791533`, `b1a3e6e`.
>
> Впоследствии этот облик стал скином **«Modern»** в фиче ось тема×скин (см. [`../plans/2026-06-13-theme-skin-axis.md`](../plans/2026-06-13-theme-skin-axis.md), `src/theme/designs/modern.js`) — один из 5 скинов. Поведение/физика/данные не менялись.

## Goal

Modernize the app's visual design in the "modern minimal" direction (Linear/Notion-like):
clean light theme, deep blue-graphite dark theme, Inter font, larger radii, soft layered
shadows, pastel bubble fills with thin colored strokes. Chosen by the user from 4 mocked-up
style directions; dark theme variant B (deep blue-graphite, continuity with the current
blue-gray gradient) chosen over neutral graphite.

**Scope:** theme foundation + main screen (BubblesPage). Other components inherit the new
look through MUI theme overrides only. No behavior, physics, or data changes.

## 1. Theme foundation

### Font

- Inter via `@fontsource-variable/inter` (self-hosted; no Google Fonts requests, PWA/offline
  friendly). Imported once in `src/index.jsx`.
- `typography.fontFamily`: `'InterVariable', 'Inter', system-ui, -apple-system, sans-serif`.

### Typography

- Headings (h1–h6, DialogTitle): weight 600, letter-spacing `-0.01em`.
- Buttons: weight 500, `textTransform: 'none'`.
- Body: default weights, no change to user font-size settings (FontSettingsDialog keeps working).

### Shape & radii

- `shape.borderRadius: 12` (global).
- Dialog / Drawer / standalone Paper panels: 16px.
- Buttons: 10px.
- FAB: rounded square, 14px.

### Palette

**Light:**
- background.default `#fafbfc`, background.paper `#ffffff`
- primary.main `#2f6bdb` (slightly deeper than current `#3B7DED`)
- text.primary `#1c2330`, text.secondary `#5b6472`
- divider `#eef0f3`
- bubbleView background: solid `#fafbfc` (gradient mode stays supported)

**Dark (variant B — deep blue-graphite):**
- background.default `#151c28`, background.paper `#161d2a`
- bubbleView background: gradient `linear-gradient(160deg, #151c28 0%, #1b2433 100%)`
- text.primary `#e8ecf4`, text.secondary `#8e9ab0`
- divider `#263043`

Secondary stays `#FF6B6B`. Add standard semantic colors (success/warning/error/info) tuned
to both modes.

### Shadows

- Replace harsh MUI default elevations with soft, low-opacity layered shadows
  (custom `shadows` array entries for the elevations actually used: 1, 2, 4, 8, 16).
- FAB gets a colored shadow in primary tone: `0 4px 14px rgba(47,107,219,0.35)`.

### Component overrides (in `useThemeMode.js`)

- `MuiButton`, `MuiIconButton`: radii, weight 500, no uppercase; hover states derived from
  `theme.palette` via `alpha()` — the `.theme-button` rgba hacks are removed.
- `MuiDialog`: 16px radius, soft shadow; keep the 0.95-opacity paper behavior
  (`getDialogPaperStyles()` stays the API, values come from the new palette).
- `MuiPaper`, `MuiDrawer`: new background/divider tokens.
- `MuiTextField` (outlined): 10px radius.
- `MuiChip`: 8px radius.

### index.html

- `meta theme-color` updated from stale `#667eea` to `#2f6bdb`.

## 2. Main screen

### Bubbles (Matter.js canvas — `useMatterEngine.js`, `BubblesPage.jsx`)

- `getBubbleFillStyle`: pastel fill derived from tag color via a proper hex→rgba alpha
  helper (replaces the `color + '15'` string hack). Light ≈ 10% alpha, dark ≈ 14%.
- Stroke: `lineWidth` 1.5 (was 3); stroke color = tag color (default = primary), instead of
  always-blue `#3B7DED`.
- No changes to physics, sizes, drag, pulse logic.

### Bubble labels (DOM overlay, `renderBubbleText` in BubblesPage.jsx)

- Weight 600 instead of `bold`.
- Color from theme (`text.primary`) instead of hardcoded `#2C3E50` / `'white'`.
- Softer text-shadow.

### Header / app bar

- Surface background from theme + 1px bottom divider; no heavy fills; header text
  `text.primary` (per existing convention).

### FAB

- Rounded square (14px), primary background, colored soft shadow.

### Panels

- `TasksCategoriesPanel`, bottom info panel (`Paper elevation={16}`): theme-driven
  backgrounds, soft shadow, remove hardcoded `color: 'white'`.

### Cleanup in BubblesPage.jsx

- Replace hardcoded rgba/hex with theme references; `getButtonStyles()` is superseded by
  the theme's Button/IconButton overrides.

## 3. Out of scope

- MindMapPage, AuthForm, dialogs beyond what the theme overrides give them automatically.
- Any behavioral, physics, data, or i18n changes.
- Tag color palette stored in Firestore (user data) — untouched.

## 4. Verification

- `npm test` and `npm run build` pass.
- Visual check of light and dark themes via Chrome DevTools (desktop + mobile viewport):
  main screen, list view drawer, create/edit dialogs, categories panel.
- No pushes to `main` (push = deploy); all work stays on `redesign/modern-minimal`.
