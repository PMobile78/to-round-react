# Vite 8 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the build toolchain from Create React App (react-scripts 5) to Vite 8, keeping the app, env-var names, CI secrets, and GitHub Pages deployment working identically.

**Architecture:** Replace react-scripts with `vite@^8` + `@vitejs/plugin-react@^6` (Oxc-based, no Babel). Files containing JSX are renamed `.js → .jsx` (decision approved by user — no Oxc config hacks). Env vars keep their `REACT_APP_` names via `envPrefix` so CI secrets, `.env` files, and `scripts/generate-sw.js` stay untouched; only the in-`src` accessor changes from `process.env.*` to `import.meta.env.*`. Build output stays in `build/` so the deploy workflow and `gh-pages` script keep working.

**Tech Stack:** Vite 8 (Rolldown/Oxc), @vitejs/plugin-react 6, Vitest (replaces `react-scripts test`; decision approved by user), Node 22 (Vite 8 requires Node 20.19+ / 22.12+; local node is v22.22.2, CI must be bumped from 18).

---

## Pre-collected facts (verified 2026-06-13)

- `react-scripts: ^5.0.1` is the only build dependency; no craco/config-overrides, no `.eslintrc`, no `eslintConfig` in package.json, **zero test files** in `src/`.
- 33 files in `src/` contain JSX (exact list in Task 4). No `ReactComponent` SVG imports, no CSS modules, no CSS files in `src/` (only `node_modules` CSS imports in two mindmap engines — Vite handles those natively).
- `process.env` usage in `src/` is confined to: `src/utils/config.js`, `src/utils/logger.js`, `src/components/AboutDialog.js` (all `REACT_APP_*`) and `src/i18n.js` (`NODE_ENV`).
- `%PUBLIC_URL%` appears only in `public/index.html` (5 link tags).
- Hardcoded prod-base paths `'/to-round-react/sw.js'`, `'/to-round-react/pop.mp3'`, `'/to-round-react/bubbles.png'` in `src/index.js`, `src/pages/BubblesPage.js`, `src/components/AuthForm.js` — these stay as-is; with Vite `base: '/to-round-react/'` they start working **in dev too** (under CRA dev they 404'd silently).
- CI (`.github/workflows/deploy.yml`): Node 18, creates `.env.production` from secrets, builds, uploads `./build`. Vite auto-loads `.env.production` in production mode — no workflow changes needed besides the Node version.
- Vite 8 specifics (from official migration guide): Oxc replaces esbuild (`oxc` option), Rolldown replaces Rollup/esbuild for deps; default Oxc filter excludes `.js` from JSX transform — hence the rename. `@vitejs/plugin-react` v6 released alongside Vite 8.

**Known pre-existing issues — OUT OF SCOPE, do not fix:**
- `scripts/generate-sw.js` uses `dotenv.config()` which reads only `.env`, not `.env.production`; in CI no `.env` exists, so the generated `public/sw.js` likely contains literal `undefined` config values in production. Pre-existing behavior, unchanged by this migration. Surface to user, don't fix here.
- Dropping react-scripts removes CRA's built-in ESLint-during-build. No replacement is added (none was configured explicitly).

---

### Task 1: Branch and swap dependencies

**Files:**
- Modify: `package.json` (dependencies/devDependencies via npm)

- [ ] **Step 1: Create a working branch**

```bash
cd /media/big_disk/PhpstormProjects/to-round-react
git checkout -b vite-8-migration
```

- [ ] **Step 2: Remove react-scripts, add Vite toolchain**

```bash
npm uninstall react-scripts --legacy-peer-deps
npm install -D vite@^8 @vitejs/plugin-react@^6 vitest --legacy-peer-deps
```

Expected: `package.json` no longer lists `react-scripts` in `dependencies`; `devDependencies` gains `vite`, `@vitejs/plugin-react`, `vitest`.

- [ ] **Step 3: Verify installed versions**

```bash
npx vite --version && node --version
```

Expected: `vite/8.x.x ...` and `v22.x` (Vite 8 requires Node 20.19+/22.12+).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: replace react-scripts with vite 8 toolchain"
```

---

### Task 2: Create vite.config.js

**Files:**
- Create: `vite.config.js` (project root)

- [ ] **Step 1: Write the config**

Create `vite.config.js` with exactly:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/to-round-react/',
    plugins: [react()],
    // CRA semantics preserved: same output dir, same dev port, same env var prefix
    envPrefix: 'REACT_APP_',
    build: {
        outDir: 'build',
    },
    server: {
        port: 3000,
    },
});
```

Rationale (do not deviate):
- `base: '/to-round-react/'` — GitHub Pages serves at `https://pmobile78.github.io/to-round-react`; also makes the hardcoded `'/to-round-react/...'` asset/SW paths in `src` work in dev.
- `envPrefix: 'REACT_APP_'` — keeps existing var names; CI secrets, `.env`, `.env.production`, and `scripts/generate-sw.js` need zero changes.
- `build.outDir: 'build'` — deploy workflow uploads `./build`, `gh-pages -d build`.
- `server.port: 3000` — same dev URL as CRA.

- [ ] **Step 2: Commit**

```bash
git add vite.config.js
git commit -m "build: add vite config (base, envPrefix REACT_APP_, outDir build)"
```

---

### Task 3: Move index.html to root and adapt it

**Files:**
- Move: `public/index.html` → `index.html` (must be **moved**, not copied — a leftover `public/index.html` would be served as a static file and shadow the real entry)
- Modify: `index.html`

- [ ] **Step 1: Move the file**

```bash
git mv public/index.html index.html
```

- [ ] **Step 2: Adapt the content**

Replace every `%PUBLIC_URL%/` with `/` (Vite rewrites root-absolute URLs in index.html by prepending `base` at build/serve time), and add the module entry script before `</body>`. Final file content:

```html
<!DOCTYPE html>
<html lang="ru">

<head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-title" content="ToDo-Round" />
    <link rel="manifest" href="/site.webmanifest" />

    <!-- Meta Tags -->
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#667eea" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="ToDo-Round" />
    <meta name="application-name" content="ToDo-Round" />
    <meta name="description" content="ToDo" />
    <title>ToDo-Round</title>
</head>

<body>
    <noscript>JavaScript must be enabled for the application to work.</noscript>
    <div id="root"></div>
    <script type="module" src="/src/index.jsx"></script>
</body>

</html>
```

Note: the entry is `/src/index.jsx` — Task 4 renames `src/index.js` (it contains JSX). Tasks 3 and 4 must land before the first build attempt.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "build: move index.html to root for vite, drop %PUBLIC_URL%"
```

---

### Task 4: Rename JSX-containing .js files to .jsx

**Files:**
- Rename (git mv, 33 files — exact list below)
- Modify: `package.json` (the `main` field points to a renamed file)

All imports are extensionless (`import App from './App'`) and Vite resolves `.jsx` by default, so no import statements change.

- [ ] **Step 1: Rename all 33 files**

```bash
cd /media/big_disk/PhpstormProjects/to-round-react
for f in \
  src/App.js \
  src/index.js \
  src/pages/BubblesPage.js \
  src/pages/MindMapPage.js \
  src/components/AboutDialog.js \
  src/components/AddNotification.js \
  src/components/AuthForm.js \
  src/components/CreateBubbleDialog.js \
  src/components/EditBubbleDialog.js \
  src/components/FilterMenu.js \
  src/components/FontSettingsDialog.js \
  src/components/LanguageSelector.js \
  src/components/ListViewDrawer.js \
  src/components/LogoutConfirmDialog.js \
  src/components/MainMenuDrawer.js \
  src/components/MobileCategorySelector.js \
  src/components/RepeatSettings.js \
  src/components/ResponsiveSearch.js \
  src/components/RichTextEditor.js \
  src/components/RichTextToolbar.js \
  src/components/SearchField.js \
  src/components/TagEditorDialog.js \
  src/components/TaskFilterDrawer.js \
  src/components/TaskList.js \
  src/components/TasksCategoriesDialog.js \
  src/components/TasksCategoriesPanel.js \
  src/components/ThemeToggle.js \
  src/components/mindmap/MindMapCanvas.js \
  src/components/mindmap/MindMapListDrawer.js \
  src/components/mindmap/MindMapNode.js \
  src/components/mindmap/MindMapToolbar.js \
  src/components/mindmap/engines/MindElixirEngine.js \
  src/components/mindmap/engines/ReactFlowEngine.js \
; do git mv "$f" "${f%.js}.jsx"; done
```

- [ ] **Step 2: Verify no JSX remains in .js files**

```bash
grep -rlE '<[A-Z][A-Za-z]*[ />]|</[A-Z]|<>' src --include='*.js'
```

Expected: empty output (exit code 1). If any file appears, rename it too (`git mv file.js file.jsx`) — hooks/services/utils are not expected to contain JSX, but the final arbiter is `npm run build` in Task 7.

- [ ] **Step 3: Fix the `main` field in package.json**

In `package.json` replace:

```json
"main": "src/pages/BubblesPage.js",
```

with:

```json
"main": "src/pages/BubblesPage.jsx",
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: rename JSX-containing .js files to .jsx for vite"
```

---

### Task 5: Switch env access from process.env to import.meta.env

**Files:**
- Modify: `src/utils/config.js` (lines ~8–22)
- Modify: `src/utils/logger.js` (line 1)
- Modify: `src/components/AboutDialog.jsx` (renamed in Task 4; lines ~6, 30, 31)
- Modify: `src/i18n.js` (line ~27)

Var **names** stay `REACT_APP_*` (exposed via `envPrefix` from Task 2); only the accessor object changes. `scripts/generate-sw.js` runs in Node and keeps using `process.env` — do NOT touch it.

- [ ] **Step 1: src/utils/config.js**

Replace every `process.env.REACT_APP_<NAME>` with `import.meta.env.REACT_APP_<NAME>`. Affected keys: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`, `FIREBASE_VAPID_KEY` (lines 8–15) and `REACT_APP_NAME`, `REACT_APP_VERSION`, `REACT_APP_ENVIRONMENT` (lines 20–22). The `packageJson` import on line 1 stays — Vite supports JSON imports natively.

- [ ] **Step 2: src/utils/logger.js**

```js
// before
const isProd = process.env.REACT_APP_ENVIRONMENT === 'production';
// after
const isProd = import.meta.env.REACT_APP_ENVIRONMENT === 'production';
```

- [ ] **Step 3: src/components/AboutDialog.jsx**

```js
// line ~6, before
const APP_VERSION = process.env.REACT_APP_VERSION || packageJson.version || 'dev';
// after
const APP_VERSION = import.meta.env.REACT_APP_VERSION || packageJson.version || 'dev';
```

```jsx
{/* lines ~30-31, before */}
<Typography variant="body2">Build time: {process.env.REACT_APP_BUILD_TIME || '-'}</Typography>
<Typography variant="body2">Commit: {process.env.REACT_APP_GIT_SHA || '-'}</Typography>
{/* after */}
<Typography variant="body2">Build time: {import.meta.env.REACT_APP_BUILD_TIME || '-'}</Typography>
<Typography variant="body2">Commit: {import.meta.env.REACT_APP_GIT_SHA || '-'}</Typography>
```

- [ ] **Step 4: src/i18n.js**

```js
// before
debug: process.env.NODE_ENV === 'development',
// after
debug: import.meta.env.DEV,
```

(Vite does statically replace `process.env.NODE_ENV`, but `import.meta.env.DEV` is the idiomatic form and removes the last `process.env` from `src/`.)

- [ ] **Step 5: Verify no process.env remains in src/**

```bash
grep -rn 'process\.env' src
```

Expected: empty output.

- [ ] **Step 6: Commit**

```bash
git add src/utils/config.js src/utils/logger.js src/components/AboutDialog.jsx src/i18n.js
git commit -m "refactor: switch src env access to import.meta.env"
```

---

### Task 6: Update package.json scripts

**Files:**
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Replace the scripts**

In `package.json`, change the `scripts` block to:

```json
"scripts": {
    "start": "npm run generate-sw && vite",
    "build": "npm run generate-sw && vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build",
    "generate-sw": "node scripts/generate-sw.js",
    "version:patch": "node scripts/version-bump.js patch",
    "version:minor": "node scripts/version-bump.js minor",
    "version:major": "node scripts/version-bump.js major"
},
```

Changes vs current: `start`/`build` call `vite` instead of `react-scripts`; `eject` removed (CRA-only); `test` switches to vitest (`--passWithNoTests` because `src/` has zero test files — npm test stays green); `preview` added for verifying the production build locally. `generate-sw`, deploy, and version scripts unchanged.

- [ ] **Step 2: Verify npm test passes**

```bash
npm test
```

Expected: vitest exits 0 with "No test files found" / pass-with-no-tests notice.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "build: switch npm scripts from react-scripts to vite/vitest"
```

---

### Task 7: Local verification (build + dev server + preview)

**Files:** none modified — verification only. Requires a populated `.env` (developer's local Firebase config).

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: exit 0; `build/index.html` exists; asset URLs inside it start with `/to-round-react/`; `build/sw.js`, `build/pop.mp3`, `build/bubbles.png`, `build/site.webmanifest`, favicons all present (copied from `public/`). Any "JSX syntax not enabled" error means a missed rename — `git mv` that file to `.jsx` and rebuild.

```bash
ls build/index.html build/sw.js build/pop.mp3 build/bubbles.png && grep -o '/to-round-react/assets/[^"]*' build/index.html | head -3
```

- [ ] **Step 2: Dev server smoke test**

```bash
npm start &
sleep 6
curl -s http://localhost:3000/to-round-react/ | grep -o '<title>[^<]*</title>'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/to-round-react/sw.js
kill %1
```

Expected: `<title>ToDo-Round</title>` and `200` (SW served under base in dev — this did not work under CRA).

- [ ] **Step 3: Preview the production build**

```bash
npm run preview &
sleep 3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/to-round-react/
kill %1
```

Expected: `200`.

- [ ] **Step 4: Manual browser check (ask the user or use the `verify`/`run` skill)**

Open `http://localhost:3000/to-round-react/`: auth screen renders, login works, bubbles physics canvas renders, mind map page opens, no console errors about missing env vars (Firebase config populated from `.env`).

- [ ] **Step 5: Commit (only if fixes were needed)**

```bash
git status --short # commit any stragglers from Step 1 with: git add -A && git commit -m "fix: vite build stragglers"
```

---

### Task 8: Bump CI Node version

**Files:**
- Modify: `.github/workflows/deploy.yml` (Setup Node.js step)

Vite 8 requires Node 20.19+ / 22.12+; the workflow currently pins Node 18 and the build would fail on it. Everything else in the workflow stays valid: `.env.production` (Vite auto-loads it in production mode with the preserved `REACT_APP_` prefix), `npm ci --legacy-peer-deps`, upload of `./build`.

- [ ] **Step 1: Edit the workflow**

```yaml
    # before
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    # after
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: bump Node to 22 for vite 8"
```

---

### Task 9: Update project docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: any file in `docs/` that mentions react-scripts (check with grep)

- [ ] **Step 1: Find stale references**

```bash
grep -rn 'react-scripts\|CRA' CLAUDE.md docs/ README.md 2>/dev/null
```

- [ ] **Step 2: Update CLAUDE.md**

Required edits (keep everything else intact):
- Commands block: `npm test # run tests (react-scripts test)` → `npm test # run tests (vitest)`; add `npm run preview # serve production build locally`.
- Stack line: replace `React (CRA/react-scripts)` with `React (Vite 8)`.
- Frontend structure tree: rename listed files that changed extension — `App.js → App.jsx`, `BubblesPage.js → BubblesPage.jsx`, `MindMapPage.js → MindMapPage.jsx`, `i18n.js` stays (no JSX). Add `vite.config.js` and root `index.html` to the tree.
- "BubblesPage.js is a ~3000-line god-component" → `BubblesPage.jsx`.

- [ ] **Step 3: Update other docs found in Step 1**

Apply the same substitutions (react-scripts → vite, `.js` → `.jsx` for renamed files, port/URL `http://localhost:3000/to-round-react/`) in each file the grep surfaced. Mention in `docs/deployment.md` (if it states Node version) that CI now uses Node 22.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/ README.md
git commit -m "docs: update for vite 8 migration"
```

---

### Task 10: Final verification and merge readiness

- [ ] **Step 1: Clean install from lockfile (CI parity)**

```bash
rm -rf node_modules && npm ci --legacy-peer-deps && npm run build && npm test
```

Expected: install OK, build exit 0, vitest green.

- [ ] **Step 2: Review the full diff**

```bash
git diff main --stat
```

Expected shape: ~33 renames, `vite.config.js` + root `index.html` added, `public/index.html` removed, edits in package.json/lockfile, 4 src files (env access), deploy.yml, docs. Nothing else.

- [ ] **Step 3: Hand off for integration**

Use the superpowers:finishing-a-development-branch skill: merge to `main` (push triggers the deploy workflow → version bump → GitHub Pages) or open a PR. After the first deploy, verify https://pmobile78.github.io/to-round-react loads, assets resolve under `/to-round-react/`, and FCM/SW registration still works in production.

**Post-deploy rollback:** `git revert` the merge commit and push — CI redeploys the CRA build (react-scripts returns via the reverted lockfile).
