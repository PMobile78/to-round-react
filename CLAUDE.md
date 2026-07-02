# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n).

## Commands

```bash
npm start              # dev server (also generates service worker)
npm run build          # production build (also generates service worker)
npm test               # run tests (vitest)
npm run preview        # serve production build locally
npm run generate-sw    # generate public/sw.js from env vars only
npm run deploy         # build + push to gh-pages branch

# Version bumping (also done automatically by CI on deploy)
npm run version:patch
npm run version:minor
npm run version:major
```

**Install:** always use `npm ci --legacy-peer-deps` — there are peer dependency conflicts between packages.

## Architecture

**Stack:** React (Vite 8), Firebase (Auth + Firestore client + Cloud Functions Gen2 + FCM), Matter.js, MUI v7, TipTap (rich text), i18next, @xyflow/react + mind-elixir (mind maps), date-fns, DOMPurify.  
**Hosting:** GitHub Pages. Deployed via `.github/workflows/deploy-prod.yml` — **manual** `workflow_dispatch` only. Push/PR trigger **nothing** (no CI); tests + lint run only inside the deploy flow (via the reusable `test.yml`).

### Frontend structure

```
index.html                 # entry point (Vite)
vite.config.js             # Vite configuration (base: '/to-round-react/', outDir: 'build')
src/
  App.jsx                    # root: Firebase Auth listener → AuthForm | BubblesPage
  index.jsx                  # React DOM root
  firebase.js                # Firebase SDK init
  firebaseMessaging.js       # FCM setup / token registration
  i18n.js                    # i18next init (en + uk)
  pages/
    BubblesPage.jsx          # main screen / god-component (active refactor target — see hooks/)
    MindMapPage.jsx          # mind map screen
  services/
    authService.js           # Firebase Auth wrapper
    firestoreService.js      # Firestore CRUD: bubbles, tags, FCM tokens
    mindmapService.js        # Firestore CRUD: mind maps
  hooks/                     # extracted from BubblesPage
    useMatterEngine.js       # Matter.js physics world lifecycle
    useDraggableFab.js       # draggable FAB position
    useBubbleFilters.js      # filter/sort state for bubble list
    useEditorResize.js       # TipTap editor resize logic
    useMatterResize.js       # canvas resize handler
    useSearch.js             # search state
    useThemeMode.js          # MUI theme / dark-light toggle
    useMindmaps.js           # mind map state / persistence
  components/                # UI dialogs, drawers, editors, selectors
  locales/en/ uk/            # i18next translation JSON files
  utils/                     # config, logger, storage, physicsUtils, reorderArray
scripts/
  generate-sw.js             # writes public/sw.js injecting Firebase config env vars
  version-bump.js            # patches package.json version field
functions/
  index.js                   # Cloud Functions Gen2: scheduled notifier + nextNotifyAt trigger
  test-next-notify.js        # unit tests for pure scheduler functions
  locales/                   # notification text: notifications.en.json, notifications.uk.json
```

### Firestore data model

| Collection | Access |
|---|---|
| `user-bubbles/{uid}/bubbles/{bubbleId}` | owner (`uid`) only — **current schema** |
| `user-bubbles/{uid}` (field `bubbles[]`) | owner only — **legacy array schema**, no longer read by server logic |
| `user-tags/{uid}` | owner only |
| `user-mindmaps/{uid}/{document=**}` | owner only |
| `user-fcm-tokens/{uid}/tokens/{tokenId}` | owner only |
| `notification-sent/{key}` | Cloud Functions admin SDK only (`allow read, write: if false` in rules) |

The scheduled Cloud Function reads tasks **only** from the subcollection via an indexed `collectionGroup('bubbles')` query on `nextNotifyAt`; the legacy `bubbles[]` array is not read by server logic. See [docs/notifications.md](docs/notifications.md).

### Cloud Functions

`functions/index.js` exports **three** functions (region `europe-west1`):
- `scheduleDueDateNotifications` — `onSchedule` every minute; queries only **due** bubbles via the `nextNotifyAt` index, sends FCM **reminder** / **overdue** notifications, dedups via `notification-sent`
- `maintainNextNotifyAt` — `onDocumentWritten` trigger keeping each task's `nextNotifyAt` field current
- `cleanupNotificationSent` — `onSchedule` hourly (`0 * * * *`); trims `notification-sent` entries older than 7 days (decoupled from the per-minute notifier so a single missed run no longer skips cleanup for an hour)
- Locales `en` and `uk`; `ru` → `en` fallback

Full design and operations: [docs/notifications.md](docs/notifications.md).

### Environment variables

Copy `.env.example` to `.env` for local development. All Firebase vars are `REACT_APP_FIREBASE_*`. The CI workflow generates `.env.production` from GitHub Secrets at build time — do not commit real credentials.

The service worker (`public/sw.js`) is generated from env vars by `scripts/generate-sw.js`. It must run before `start` or `build` (already wired into both npm scripts).

### CI / Version management

`.github/workflows/deploy-prod.yml` (**manual `workflow_dispatch` only** — push/PR trigger nothing) has two jobs: `test`, which calls the reusable `.github/workflows/test.yml` (`workflow_call`) running **two parallel jobs** — `test` (vitest + `test:functions`) and `lint` (eslint) — and `build-and-deploy` (`needs: test`). The deploy job bumps the version at the chosen level (`patch`/`minor`/`major` input, default `patch`), commits the bump with `[skip ci]`, builds, and deploys to GitHub Pages. Must be run from `main`/`master` (github-pages environment protection rule). The current version in `package.json` is the source of truth. See [docs/deployment.md](docs/deployment.md).

## Active refactor context

Refactor history is tracked in `docs/superpowers/`. Key standing conventions:
- `BubblesPage.jsx` is a large god-component (~1000 lines, down from ~3000 via the ongoing 010 store refactor) — new behaviour extracts to `hooks/` and `components/`
- `HtmlRenderer.jsx` uses DOMPurify — any HTML rendering must go through it
- `firestore.rules` is now in the repo and must be kept in sync with `firebase.json` (`"firestore": { "rules": "firestore.rules" }`)
- Window/panel/header backgrounds come from the MUI theme (`hooks/useThemeMode.js`), never hardcoded hex/rgba. Wrap a standalone panel in `<Paper>` with no explicit `backgroundColor` (e.g. `TasksCategoriesPanel`, list-as-main-screen `Paper elevation={16}`); a window header (`DialogTitle` / header `Box`) must **not** set its own `backgroundColor` — it inherits the window's Paper background. Header text uses `text.primary`, not `'white'`. Dialog body bg comes from `getDialogPaperStyles()` (`rgba(...,0.95)`).
