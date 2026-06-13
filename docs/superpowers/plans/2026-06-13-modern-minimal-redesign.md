# Modern Minimal Redesign Implementation Plan

## ✅ STATUS: COMPLETE (2026-06-13)

Редизайн реализован и отгружен (тема Inter / `#2f6bdb` / мягкие радиусы и тени / пастельные пузыри с тонкими цветными обводками). Все шаги ниже выполнены. Коммиты: `9997111`, `3a92690`, `ce36a0b`, `0791533`, `b1a3e6e`. Впоследствии этот облик стал скином **«Modern»** в фиче ось тема×скин (см. [`2026-06-13-theme-skin-axis.md`](2026-06-13-theme-skin-axis.md), `src/theme/designs/modern.js`). Спека: [`../specs/2026-06-13-modern-minimal-redesign-design.md`](../specs/2026-06-13-modern-minimal-redesign-design.md). Ветка `redesign/modern-minimal` смержена fast-forward в `main` и удалена.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the app's visual design per spec `docs/superpowers/specs/2026-06-13-modern-minimal-redesign-design.md`: Inter font, new light/dark palettes, larger radii, soft shadows, thinner colored bubble strokes.

**Architecture:** All shared styling moves into the MUI theme (`src/hooks/useThemeMode.js`) so every component inherits it. BubblesPage-local style helpers get rewritten on top of the new palette; canvas bubble rendering (Matter.js `render.fillStyle/strokeStyle/lineWidth`) gets new values via a small tested color utility.

**Tech Stack:** React + Vite 8, MUI v5 (`createTheme`, `alpha`), `@fontsource-variable/inter`, Matter.js, vitest.

**Branch:** `redesign/modern-minimal` (already created). **Never push to `main`** — push to main triggers deploy.

---

### Task 1: Inter font

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/index.jsx:1-8` (imports block)

- [x] **Step 1: Install the font package**

```bash
npm install @fontsource-variable/inter --legacy-peer-deps
```

(`--legacy-peer-deps` is mandatory in this repo — peer dependency conflicts.)

- [x] **Step 2: Import the font in the entry point**

In `src/index.jsx`, add as the first import:

```js
import '@fontsource-variable/inter';
```

- [x] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds; `build/assets/` contains inter woff2 files.

- [x] **Step 4: Commit**

```bash
git add package.json package-lock.json src/index.jsx
git commit -m "feat(design): add self-hosted Inter variable font"
```

---

### Task 2: `withAlpha` color utility (TDD)

Replaces the `tagColor + '15'` hex-suffix hack used for bubble fills. Tag colors come from Firestore as `#RRGGBB` (sometimes `#RGB`) strings.

**Files:**
- Create: `src/utils/colorUtils.js`
- Test: `src/utils/colorUtils.test.js`

- [x] **Step 1: Write the failing test**

Create `src/utils/colorUtils.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { withAlpha } from './colorUtils';

describe('withAlpha', () => {
    it('converts 6-digit hex to rgba', () => {
        expect(withAlpha('#2f6bdb', 0.1)).toBe('rgba(47, 107, 219, 0.1)');
    });

    it('converts 3-digit hex to rgba', () => {
        expect(withAlpha('#f00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('is case-insensitive', () => {
        expect(withAlpha('#FF6B6B', 0.14)).toBe('rgba(255, 107, 107, 0.14)');
    });

    it('returns non-hex strings unchanged', () => {
        expect(withAlpha('rgba(0,0,0,0.5)', 0.1)).toBe('rgba(0,0,0,0.5)');
        expect(withAlpha('transparent', 0.1)).toBe('transparent');
    });

    it('returns non-string input unchanged', () => {
        expect(withAlpha(null, 0.1)).toBe(null);
        expect(withAlpha(undefined, 0.1)).toBe(undefined);
    });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/colorUtils.test.js`
Expected: FAIL — cannot resolve `./colorUtils`.

- [x] **Step 3: Write the implementation**

Create `src/utils/colorUtils.js`:

```js
// Converts #RGB / #RRGGBB to rgba() with the given alpha.
// Non-hex values are returned unchanged so callers can pass through
// pre-formatted css colors.
export function withAlpha(color, alpha) {
    if (typeof color !== 'string') return color;
    const hex = color.trim();
    const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
    const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    let r, g, b;
    if (m3) {
        [r, g, b] = m3.slice(1).map((ch) => parseInt(ch + ch, 16));
    } else if (m6) {
        [r, g, b] = m6.slice(1).map((h) => parseInt(h, 16));
    } else {
        return color;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/colorUtils.test.js`
Expected: 5 passed.

- [x] **Step 5: Commit**

```bash
git add src/utils/colorUtils.js src/utils/colorUtils.test.js
git commit -m "feat(design): add withAlpha color utility"
```

---

### Task 3: New MUI theme

**Files:**
- Modify: `src/hooks/useThemeMode.js` (replace the `createAppTheme` function, lines 54–155; imports line 2)

- [x] **Step 1: Update imports**

Replace line 2:

```js
import { alpha, createTheme } from '@mui/material/styles';
```

- [x] **Step 2: Replace `createAppTheme` entirely**

Replace the whole `const createAppTheme = (mode) => { ... };` block with:

```js
    const palettes = {
        light: {
            primary: '#2f6bdb',
            backgroundDefault: '#fafbfc',
            paper: '#ffffff',
            bubbleView: '#fafbfc',
            textPrimary: '#1c2330',
            textSecondary: '#5b6472',
            divider: '#eef0f3',
        },
        dark: {
            primary: '#5589e8',
            backgroundDefault: '#151c28',
            paper: '#161d2a',
            bubbleView: 'linear-gradient(160deg, #151c28 0%, #1b2433 100%)',
            textPrimary: '#e8ecf4',
            textSecondary: '#8e9ab0',
            divider: '#263043',
        },
    };

    // Soft, low-contrast layered shadows replacing MUI's harsh defaults
    const buildSoftShadows = () => {
        const shadows = ['none'];
        for (let i = 1; i <= 24; i++) {
            const y = Math.round(1 + i * 0.75);
            const blur = Math.round(4 + i * 1.6);
            const opacity = Math.min(0.05 + i * 0.007, 0.22);
            shadows.push(`0 ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`);
        }
        return shadows;
    };

    const createAppTheme = (mode) => {
        const c = palettes[mode];
        const headingStyle = { fontWeight: 600, letterSpacing: '-0.01em' };
        return createTheme({
            palette: {
                mode,
                primary: { main: c.primary },
                secondary: { main: '#FF6B6B' },
                success: { main: mode === 'light' ? '#2e9e63' : '#4ec98b' },
                warning: { main: mode === 'light' ? '#d97f1d' : '#e8a44b' },
                error: { main: mode === 'light' ? '#d05050' : '#ef7070' },
                info: { main: mode === 'light' ? '#2f86c1' : '#5fb0de' },
                background: {
                    default: c.backgroundDefault,
                    paper: c.paper,
                    bubbleView: c.bubbleView,
                },
                text: {
                    primary: c.textPrimary,
                    secondary: c.textSecondary,
                },
                divider: c.divider,
            },
            shape: {
                borderRadius: 12,
            },
            typography: {
                fontFamily: "'InterVariable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
                h1: headingStyle,
                h2: headingStyle,
                h3: headingStyle,
                h4: headingStyle,
                h5: headingStyle,
                h6: headingStyle,
                button: { fontWeight: 500, textTransform: 'none' },
            },
            shadows: buildSoftShadows(),
            components: {
                MuiCssBaseline: {
                    styleOverrides: {
                        body: {
                            '& a': {
                                color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
                                textDecoration: 'none',
                                '&:hover': {
                                    color: mode === 'light' ? '#2558b8' : '#aac4f4',
                                    textDecoration: 'underline',
                                },
                                '&:visited': {
                                    color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
                                }
                            }
                        }
                    }
                },
                MuiPaper: {
                    styleOverrides: {
                        root: {
                            // kill MUI's dark-mode elevation overlay so paper color stays exact
                            backgroundImage: 'none',
                        },
                    },
                },
                MuiDialog: {
                    styleOverrides: {
                        paper: {
                            borderRadius: 16,
                            backgroundColor: mode === 'light'
                                ? 'rgba(255, 255, 255, 0.95)'
                                : 'rgba(22, 29, 42, 0.95)',
                        },
                    },
                },
                MuiDrawer: {
                    styleOverrides: {
                        paper: {
                            backgroundImage: 'none',
                        },
                    },
                },
                MuiButton: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                        },
                    },
                },
                MuiFab: {
                    styleOverrides: {
                        root: {
                            borderRadius: 14,
                            boxShadow: `0 4px 14px ${alpha(c.primary, 0.35)}`,
                            '&:active': {
                                boxShadow: `0 2px 8px ${alpha(c.primary, 0.4)}`,
                            },
                        },
                    },
                },
                MuiOutlinedInput: {
                    styleOverrides: {
                        root: {
                            borderRadius: 10,
                        },
                    },
                },
                MuiChip: {
                    styleOverrides: {
                        root: {
                            borderRadius: 8,
                        },
                    },
                },
                MuiLink: {
                    styleOverrides: {
                        root: {
                            color: mode === 'light' ? '#2f6bdb' : '#8eb0f0',
                            '&:hover': {
                                color: mode === 'light' ? '#2558b8' : '#aac4f4',
                            },
                            '&:visited': {
                                color: mode === 'light' ? '#7b1fa2' : '#ce93d8',
                            }
                        }
                    }
                }
            },
        });
    };
```

Notes:
- The old `MuiPaper` hardcoded `backgroundColor` is gone — `palette.background.paper` covers it.
- The `.theme-button` overrides on `MuiIconButton`/`MuiButton` are deleted — `grep -rn "theme-button" src/` confirms the class is unused.
- The hook's state logic (`themeMode`, `toggleTheme`, system listener, lines 1–53 and 157–165) stays untouched.

- [x] **Step 3: Verify build and tests**

Run: `npm run build && npx vitest run src/utils/colorUtils.test.js`
Expected: build OK, tests pass.

- [x] **Step 4: Commit**

```bash
git add src/hooks/useThemeMode.js
git commit -m "feat(design): modern minimal MUI theme (palette, Inter, radii, soft shadows)"
```

---

### Task 4: `meta theme-color` in index.html

**Files:**
- Modify: `index.html:15`

- [x] **Step 1: Update the meta tag**

Replace:

```html
    <meta name="theme-color" content="#667eea" />
```

with:

```html
    <meta name="theme-color" content="#2f6bdb" />
```

- [x] **Step 2: Commit**

```bash
git add index.html
git commit -m "fix(design): align meta theme-color with primary palette"
```

---

### Task 5: Bubble visuals on canvas

**Files:**
- Modify: `src/pages/BubblesPage.jsx` (`getBubbleFillStyle` ~line 383; `strokeStyle`/`lineWidth` literals at lines listed below)
- Modify: `src/hooks/useMatterEngine.js:125-126`

- [x] **Step 1: Rewrite `getBubbleFillStyle`**

In `src/pages/BubblesPage.jsx`, add to imports (near other `../utils` imports):

```js
import { withAlpha } from '../utils/colorUtils';
```

Replace the body of `getBubbleFillStyle` (function at ~line 383):

```js
    // Function to get bubble fill style based on theme
    const getBubbleFillStyle = (tagColor = null) => {
        // Если фон отключен, возвращаем прозрачный
        if (!bubbleBackgroundEnabled) {
            return 'transparent';
        }

        if (themeMode === 'light') {
            if (tagColor) {
                return withAlpha(tagColor, 0.10);
            }
            return withAlpha('#2f6bdb', 0.08);
        } else {
            if (tagColor) {
                return withAlpha(tagColor, 0.14);
            }
            return 'rgba(255, 255, 255, 0.06)';
        }
    };
```

- [x] **Step 2: Thinner strokes, new default stroke color**

Apply across both files (use grep to catch all occurrences, line numbers may drift):

```bash
grep -n "3B7DED\|lineWidth" src/pages/BubblesPage.jsx src/hooks/useMatterEngine.js
```

- Every default-stroke literal `'#3B7DED'` → `'#2f6bdb'` (BubblesPage lines ~146, ~197; useMatterEngine line ~125).
- Every `lineWidth: 3` (normal stroke) → `lineWidth: 1.5` (useMatterEngine ~126; BubblesPage ~790, ~926; restore-after-highlight at ~715, ~759 use `lineWidth = 3` → `lineWidth = 1.5`).
- Search-highlight emphasis `lineWidth = 4` (BubblesPage ~699, ~743) → `lineWidth = 2.5`.
- Do **not** touch `lineWidth: 0` (~1066, splash effect) or the gray `'#B0B0B0'` no-tag stroke.

- [x] **Step 3: Verify**

Run: `npm run build`
Expected: success. Then `grep -c "3B7DED" src/pages/BubblesPage.jsx src/hooks/useMatterEngine.js` → 0 occurrences in both.

- [x] **Step 4: Commit**

```bash
git add src/pages/BubblesPage.jsx src/hooks/useMatterEngine.js
git commit -m "feat(design): pastel bubble fills via withAlpha, 1.5px tag-colored strokes"
```

---

### Task 6: BubblesPage chrome — buttons, FAB, labels, overlays

**Files:**
- Modify: `src/pages/BubblesPage.jsx` (style helpers ~351–378; header button ~2104–2126; FAB ~2212–2231; filter button ~2417–2437; instructions overlay ~2446–2457; `renderBubbleText` ~1601–1668)

- [x] **Step 1: Rewrite the style helper functions (~lines 350–378)**

Add `alpha` to the MUI imports in BubblesPage.jsx (it imports from `@mui/material`; add a separate import):

```js
import { alpha } from '@mui/material/styles';
```

Replace `getButtonStyles`, `getOutlinedButtonStyles`, `getDialogPaperStyles`:

```js
    // Function to get button styles based on theme
    const getButtonStyles = () => {
        const isLight = themeMode === 'light';
        return {
            backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.18),
            color: isLight ? theme.palette.primary.main : theme.palette.text.primary,
            '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.2 : 0.28)
            }
        };
    };

    const getOutlinedButtonStyles = () => {
        const isLight = themeMode === 'light';
        return {
            color: isLight ? theme.palette.primary.main : theme.palette.text.primary,
            borderColor: alpha(theme.palette.primary.main, isLight ? 0.5 : 0.6),
            backgroundColor: isLight ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
            '&:hover': {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.1)
            }
        };
    };

    const getDialogPaperStyles = () => {
        return {
            backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(22, 29, 42, 0.95)',
            color: themeMode === 'light' ? '#1c2330' : '#e8ecf4'
        };
    };
```

- [x] **Step 2: Simplify the desktop "Add bubble" button (~2104)**

The contained variant is now styled by the theme; drop the rgba/backdrop hack:

```jsx
                        <Button
                            variant="contained"
                            onClick={openCreateDialog}
                            startIcon={<Add />}
                            sx={{ height: 36 }}
                        >
                            {t('bubbles.addBubble')}
                        </Button>
```

- [x] **Step 3: Simplify the mobile FAB (~2212)**

Remove the `sx` rgba override — `color="primary"` + the theme's `MuiFab` override handle it. The `Fab` keeps only its `onClick`:

```jsx
                            <Fab
                                color="primary"
                                onClick={(e) => {
                                    if (suppressNextClickRef.current) {
                                        suppressNextClickRef.current = false;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    openCreateDialog();
                                }}
                            >
                                <Add />
                            </Fab>
```

- [x] **Step 4: Filter button selected/disabled states (~2424)**

Replace the rgba ternaries inside the `sx` of the filter `IconButton`:

```jsx
                                    sx={{
                                        ...getButtonStyles(),
                                        backgroundColor: alpha(
                                            theme.palette.primary.main,
                                            !isAllSelected()
                                                ? (themeMode === 'light' ? 0.22 : 0.3)
                                                : (themeMode === 'light' ? 0.12 : 0.18)
                                        ),
                                        opacity: categoriesPanelEnabled ? 0.5 : 1,
                                        '&:disabled': {
                                            backgroundColor: theme.palette.action.disabledBackground,
                                            color: theme.palette.action.disabled
                                        }
                                    }}
```

- [x] **Step 5: Bubble labels (`renderBubbleText`, ~1629–1634)**

Replace the color/shadow lines:

```js
            const textOpacity = hasSearchQuery ? (isFound ? 1 : 0.4) : 1;
            const textColor = theme.palette.text.primary;

            const textShadow = themeMode === 'light'
                ? '0 1px 2px rgba(255, 255, 255, 0.65)'
                : '0 1px 3px rgba(0, 0, 0, 0.5)';
```

And in the `<Typography sx={{...}}>` below (~1659): `fontWeight: 'bold'` → `fontWeight: 600`.

- [x] **Step 6: Mobile instructions overlay (~2447)**

In the instructions `Box` `sx`, replace `backgroundColor: 'rgba(0, 0, 0, 0.4)'` and `borderRadius: 2` with:

```js
                            backgroundColor: 'rgba(15, 18, 25, 0.55)',
                            backdropFilter: 'blur(8px)',
                            padding: 1.5,
                            borderRadius: 3,
```

(White text inside stays — the overlay is always dark.)

- [x] **Step 7: Header strip behind the top controls**

The bubbles screen has no app bar — controls float over the canvas (left box ~2064, right box ~2259). Per spec, give them a translucent surface strip with a 1px divider, rendered *behind* the controls so no layout/canvas-size changes are needed.

Insert right after the opening root `<Box sx={{...}}>` (after line ~2060, before the `{/* Заголовок и кнопки - адаптивный */}` comment):

```jsx
            {/* Полоса хедера за плавающими контролами */}
            {mainView === 'bubbles' && (
                <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: isMobile ? 56 : 72,
                    zIndex: 999,
                    backgroundColor: alpha(theme.palette.background.paper, themeMode === 'light' ? 0.75 : 0.65),
                    backdropFilter: 'blur(10px)',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    pointerEvents: 'none'
                }} />
            )}
```

`zIndex: 999` keeps it below the controls (1000) and above the canvas (1); `pointerEvents: 'none'` keeps bubble drag working under it.

- [x] **Step 8: Verify build**

Run: `npm run build`
Expected: success.

- [x] **Step 9: Commit**

```bash
git add src/pages/BubblesPage.jsx
git commit -m "feat(design): theme-driven main screen chrome (buttons, FAB, labels, overlays)"
```

---

### Task 7: Full verification

- [x] **Step 1: Tests and build**

Run: `npm test -- --run` and `npm run build`
Expected: all tests pass, build succeeds.

- [x] **Step 2: Visual check (Chrome DevTools MCP)**

```bash
npm start
```

Then via Chrome DevTools MCP open `http://localhost:3000/to-round-react/` (check actual port in dev-server output) and screenshot:
1. Main bubble screen — light theme, desktop viewport.
2. Same — dark theme (toggle via ThemeToggle in menu drawer).
3. Same two in mobile viewport (390×844).
4. Open create-bubble dialog (light + dark) — check 16px radius, paper colors.
5. List view drawer and categories panel.

Check specifically: Inter applied (devtools computed font-family), bubble strokes 1.5px in tag color, no leftover stark-white panels in dark mode, FAB rounded-square with colored shadow.

- [x] **Step 3: Fix anything broken, commit fixes**

Each fix is its own small commit with prefix `fix(design):`.

---

## Out of scope (do not touch)

- MindMapPage, AuthForm, mindmap components — they inherit the theme automatically.
- Physics, drag, pulse, search, persistence logic.
- Tag colors stored in Firestore.
- `legacy bubbles[]` schema code.
