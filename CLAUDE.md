# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n).

## Commands

```bash
npm start              # dev server (also generates service worker)
npm run build          # production build (also generates service worker)
npm test               # run tests (vitest)
npm run test:rules     # Firestore emulator tests: rules + web data layer (needs Java 21+ and Firebase CLI 15+)
npm run start:emulator # dev server against the local Auth + Firestore emulators (.env.emulator)
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

**Stack:** React (Vite 8), Firebase (Auth + Firestore client + Cloud Functions Gen2 + FCM), Matter.js, MUI v7, TipTap + @tiptap/markdown (Markdown descriptions), i18next, @xyflow/react + mind-elixir (mind maps), date-fns, DOMPurify.  
**Hosting:** GitHub Pages. Deployed via `.github/workflows/deploy-prod.yml` — **manual** `workflow_dispatch` only. Push/PR trigger **nothing** (no CI); tests + lint run only inside the deploy flow (via the reusable `test.yml`).

### Frontend structure

```
index.html                 # entry point (Vite)
vite.config.js             # Vite configuration (base: '/to-round-react/', outDir: 'build')
src/
  App.jsx                    # root: Firebase Auth listener + user settings → AuthForm | BubblesPage
  index.jsx                  # React DOM root; registers this device after sign-in
  firebase.js                # Firebase SDK init (emulators when REACT_APP_FIREBASE_EMULATORS=true)
  firebaseMessaging.js       # this device in users/{uid}/devices: FCM token, foreground messages
  i18n.js                    # i18next init (en + uk)
  pages/
    BubblesPage.jsx          # main screen / god-component (active refactor target — see hooks/)
    MindMapPage.jsx          # mind map screen
  services/
    authService.js           # Firebase Auth wrapper (sign-out removes this device first)
    mindmapService.js        # Firestore CRUD: mind maps
    data/                    # data contract v2 on users/{uid}/…; db and uid are arguments
      convert.js             # Firestore document <-> backup-form record (Timestamp <-> ISO)
      tasks.js, categories.js, settings.js, devices.js   # reads, live changes, writes
      bubbleModel.js         # task -> the bubble the app shows (+ tagId, dueAt: moment of the due)
      taskForm.js            # task dialogs' values -> fields of a new task / partial changes
  state/                     # BubblesDataStore, BubblesUiStore (settings-backed values),
                             # SettingsStore (useUserSettings) + SettingsContext
  hooks/                     # extracted from BubblesPage
    useMatterEngine.js       # Matter.js physics world lifecycle
    useDraggableFab.js       # draggable FAB position
    useBubbleFilters.js      # filter/sort state for bubble list
    useEditorResize.js       # TipTap editor resize logic
    useMatterResize.js       # canvas resize handler
    useSearch.js             # search state
    useThemeMode.js          # MUI theme / dark-light toggle
    useMindmaps.js           # mind map state / persistence
    useThisDevice.js         # this browser's users/{uid}/devices doc + "reminders on this device"
  components/                # UI dialogs, drawers, editors, selectors
  locales/en/ uk/            # i18next translation JSON files
  utils/                     # config, logger, storage, physicsUtils, reorderArray
scripts/
  generate-sw.js             # writes public/sw.js injecting Firebase config env vars
  version-bump.js            # patches package.json version field
functions/
  index.js                   # Cloud Functions Gen2 (contract v2): wiring of the five functions only
  lib/                       # time.js, schedule.js, messages.js (pure) + handlers.js (Firestore side)
  test/unit/                 # node:test unit tests (time on contract/fixtures/time.json)
  test/emulator/             # node:test on the Firestore emulator (handlers with a fake FCM sender)
  locales/                   # notification text: notifications.en.json, notifications.uk.json
```

### Firestore data model

Data contract v2 ([spec](docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md), section 3); the rules check every document's shape (`firestore.rules`).

| Path | Content | Access |
|---|---|---|
| `users/{uid}` | `schemaVersion: 2`, `settings` (all UI settings), optional `migration` | owner; never deleted |
| `users/{uid}/tasks/{taskId}` | task; `overdueAt`/`nextNotifyAt` belong to Cloud Functions | owner |
| `users/{uid}/categories/{categoryId}` | category (`name`, palette `color`, `order`) | owner |
| `users/{uid}/devices/{deviceId}` | device = Firebase installation id: `fcmToken`, `notificationsEnabled` | owner |
| `user-mindmaps/{uid}/{document=**}` | mind maps (unchanged in stage 0) | owner |
| `notification-sent/{key}` | dedup keys | Cloud Functions admin SDK only (`if false` in rules) |
| `user-bubbles`, `user-tags`, `user-fcm-tokens` | v1 data | owner read-only; kept for the migration (sub-plan 0.6) and rollback |

Clients write creates with `serverTimestamp()` and partial updates with `updatedAt: serverTimestamp()`; an existing document is never overwritten with `setDoc` (the rules reject it). Settings, tasks and categories live only in Firestore — localStorage keeps just the FAB position, the last open mind map and the mind map copies.

On branch `stage-0-data-contract-v2` the web and the Cloud Functions use only `users/{uid}/…` (the functions query `collectionGroup('tasks')` by `status` + `nextNotifyAt`, only under the root path `users/{uid}/tasks`); production keeps v1 on `user-bubbles` until sub-plan 0.7, and `scripts/stage0-deploy-guard.js` blocks `firebase deploy` from this branch until then. See [docs/notifications.md](docs/notifications.md).

### Cloud Functions

`functions/index.js` exports **five** functions (region `europe-west1`; data contract v2, in production only after sub-plan 0.7):
- `scheduleNotifications` — `onSchedule` every minute (`* * * * *`); active tasks with `nextNotifyAt <= now` get FCM **reminder** / **overdue** on the user's devices with `notificationsEnabled` and a token, in `settings.language`; dedups via `notification-sent`; an undelivered notification is retried for 10 minutes (#93)
- `onTaskWritten` — `onDocumentWritten` on `users/{uid}/tasks/{taskId}`; keeps `nextNotifyAt`, `overdueAt` (silent overdue) and `pulseMuted` in step with the task's schedule
- `onCategoryDeleted` — `onDocumentDeleted` on `users/{uid}/categories/{categoryId}`; sets `categoryId = null` on that category's tasks unless the category exists again
- `purgeDeletedTasks` — `onSchedule` daily (`0 3 * * *`, UTC); deletes tasks in the trash for more than 30 days
- `cleanupNotificationSent` — `onSchedule` hourly (`0 * * * *`); trims `notification-sent` entries older than 7 days
- Logic lives in `functions/lib/`; locales `en` and `uk`, anything else → `en`

Full design and operations: [docs/notifications.md](docs/notifications.md).

### Environment variables

Copy `.env.example` to `.env` for local development. All Firebase vars are `REACT_APP_FIREBASE_*`. `.env.emulator` (committed, demo values only) is read by `npm run start:emulator` and turns on `REACT_APP_FIREBASE_EMULATORS`. The CI workflow generates `.env.production` from GitHub Secrets at build time — do not commit real credentials.

The service worker (`public/sw.js`) is generated from env vars by `scripts/generate-sw.js`. It must run before `start` or `build` (already wired into both npm scripts).

### CI / Version management

`.github/workflows/deploy-prod.yml` (**manual `workflow_dispatch` only** — push/PR trigger nothing) has two jobs: `test`, which calls the reusable `.github/workflows/test.yml` (`workflow_call`) running **two parallel jobs** — `test` (`npm run test:all`: vitest + `test:functions` + `test:rules` on the Firestore emulator; the job installs Java 21 and Firebase CLI 15) and `lint` (eslint) — and `build-and-deploy` (`needs: test`). The deploy job bumps the version at the chosen level (`patch`/`minor`/`major` input, default `patch`), commits the bump with `[skip ci]`, builds, and deploys to GitHub Pages. Must be run from `main`/`master` (github-pages environment protection rule). The current version in `package.json` is the source of truth. See [docs/deployment.md](docs/deployment.md).

## Standing implementation conventions

Project work is tracked in [GitHub Issues](https://github.com/PMobile78/to-round-react/issues). Key standing conventions:
- `BubblesPage.jsx` is a large component (~1000 lines) — new behaviour extracts to `hooks/` and `components/`
- `HtmlRenderer.jsx` uses DOMPurify — any HTML rendering must go through it
- `firestore.rules` is now in the repo and must be kept in sync with `firebase.json` (`"firestore": { "rules": "firestore.rules" }`)
- Window/panel/header backgrounds come from the MUI theme (`hooks/useThemeMode.js`), never hardcoded hex/rgba. Wrap a standalone panel in `<Paper>` with no explicit `backgroundColor` (e.g. `TasksCategoriesPanel`, list-as-main-screen `Paper elevation={16}`); a window header (`DialogTitle` / header `Box`) must **not** set its own `backgroundColor` — it inherits the window's Paper background. Header text uses `text.primary`, not `'white'`. Dialog body bg comes from `getDialogPaperStyles()` (`rgba(...,0.95)`).
