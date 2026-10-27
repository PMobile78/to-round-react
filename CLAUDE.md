# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n, migration and backup, the Android app).

## Commands

```bash
npm start              # dev server (also generates service worker)
npm run build          # production build (also generates service worker)
npm test               # run tests (vitest)
npm run test:rules     # Firestore emulator tests: rules + web data layer (needs Java 21+ and Firebase CLI 15+)
npm run start:emulator # dev server against the local Auth + Firestore emulators (.env.emulator)
npm run rehearsal:load  # rehearsal of the move: a v1 export into the v1 collections of an emulator account
npm run rehearsal:check # rehearsal of the move: users/{uid} against that export (docs/migration.md)
npm run preview        # serve production build locally
npm run generate-sw    # generate public/sw.js from env vars only
npm run deploy         # build + push to gh-pages branch

# Version bumping (also done automatically by CI on deploy)
npm run version:patch
npm run version:minor
npm run version:major

# Android app (android/; Gradle runs on Android Studio's JBR, see docs/android.md)
android/gradlew -p android check              # JVM tests of core (on contract/) and app + Android Lint
android/gradlew -p android :core:test         # contract tests only
android/gradlew -p android :app:assembleDebug # debug APK
# device tests: APKs built with -Ptodoround.emulators=true, Android emulator booted (docs/android.md), then
firebase emulators:exec --only auth,firestore --project demo-to-round android/device-tests.sh
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
  App.jsx                    # root: Firebase Auth listener + user settings → AuthForm | MigrationGate → BubblesPage
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
      backup.js              # v2 backup export; import = replace in batches of at most 450 writes
      migration.js           # the move from user-bubbles / user-tags (spec 9): read, preview, write, marker
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
    useBackup.js             # backup export / import of the main menu (BackupDialog)
    useMigration.js          # the move from v1 before the app opens (MigrationGate, MigrationDialog)
  components/                # UI dialogs, drawers, editors, selectors
  locales/en/ uk/            # i18next translation JSON files
  utils/                     # config, logger, storage, physicsUtils, reorderArray
scripts/
  generate-sw.js             # writes public/sw.js injecting Firebase config env vars
  version-bump.js            # patches package.json version field
  rehearsal/                 # rehearsal of the move on the emulator (vitest.rehearsal.config.js)
functions/
  index.js                   # Cloud Functions Gen2 (contract v2): wiring of the five functions only
  lib/                       # time.js, schedule.js, messages.js (pure) + handlers.js (Firestore side)
  test/unit/                 # node:test unit tests (time on contract/fixtures/time.json)
  test/emulator/             # node:test on the Firestore emulator (handlers with a fake FCM sender)
  locales/                   # notification text: notifications.en.json, notifications.uk.json
```

### Android app

`android/` is the native app (Kotlin, Jetpack Compose, Material 3; [roadmap](docs/superpowers/specs/2026-10-14-android-roadmap.md), stage 1 [spec](docs/superpowers/specs/2026-10-22-stage-1-android-foundation-design.md), stage 2 [spec](docs/superpowers/specs/2026-10-24-stage-2-tasks-design.md)). It uses the same Firebase project and data contract v2 as the web. Two Gradle modules: `core` — plain Kotlin, no Android or Firebase: the contract's schema, time zones, record validation and models, the web's list rules, the next due of a repeating task and the Markdown of descriptions as the web shows it (`core/markdown`), with JUnit tests on `contract/`; `app` — the Android application: Firebase Auth and Firestore with `android/app/google-services.json` (out of git; `firebase apps:sdkconfig`), screens on Compose. Android tests are not part of `npm run verify` or CI. Setup, phone and release key: [docs/android.md](docs/android.md).

- Never print `~/.gradle/gradle.properties` whole (`cat`, `less`, an unanchored `grep`): it holds the release key passwords. Read one non-secret line at a time, e.g. `grep '^org.gradle.java.home' ~/.gradle/gradle.properties`.
- `core` compiles against the JDK but runs on Android 8+: `-Xjdk-release=17` keeps out Java 18+ methods, not the Java 9–17 ones Android 8 lacks (`List.of` …). Use `java.time` and the Kotlin standard library there.
- With a phone and the emulator both connected, address one: `adb -e` (the emulator), `adb -d` (the USB phone). A phone on Wi-Fi debugging is a TCP device like the emulator, and `adb -e` cannot tell them apart: `adb disconnect` it before emulator work.
- A debug build with `-Ptodoround.emulators=true` works with the Auth and Firestore emulators of `firebase.json` (project `demo-to-round`), reached at the device's own 127.0.0.1 through `adb reverse`: Android 17 keeps apps out of the local network, 10.0.2.2 included. The device tests (`app/src/androidTest`) run that way through `android/device-tests.sh`, on the emulator only (the script removes the app before and after a run), and bring their screenshots back to `android/app/build/device-screens/`: look at them, the checks see the UI tree, not the picture. Never run Gradle while the Android emulator is up (14 GB of RAM): build with `--no-daemon`, then boot it. Not `--stop`: it stops the Gradle daemons of every session on the machine, another session's build too. Another session may hold the emulator or run Gradle: check `pgrep -f '[q]emu-system'` and `pgrep -f '[G]radleDaemon|[G]radleWrapperMain'` before a build or a boot, and never touch its processes.
- Device test names are camelCase: D8 refuses spaces in method names before DEX 040 (minSdk 26). JVM tests may keep backtick names.

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
| `user-bubbles`, `user-tags`, `user-fcm-tokens` | v1 data | owner read-only; the move reads them (spec 9.1, left as they are); kept for rollback |

Clients write creates with `serverTimestamp()` and partial updates with `updatedAt: serverTimestamp()`; an existing document is never overwritten with `setDoc` (the rules reject it). Settings, tasks and categories live only in Firestore — localStorage keeps just the FAB position, the last open mind map and the mind map copies.

The web and the Cloud Functions use only `users/{uid}/…` (the functions query `collectionGroup('tasks')` by `status` + `nextNotifyAt`, only under the root path `users/{uid}/tasks`). Production moved from v1 in sub-plan 0.7 ([plan](docs/superpowers/plans/2026-10-21-stage-0-7-move.md): the move and its rollback); the v1 collections stay read-only until the owner deletes them by hand ([docs/migration.md](docs/migration.md)). See [docs/notifications.md](docs/notifications.md).

### Cloud Functions

`functions/index.js` exports **five** functions (region `europe-west1`; data contract v2):
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
- The app's display name lives only in `src/appName.js` (`APP_NAME`): the UI imports it, and `appNamePlugin` in `vite.config.js` fills the `%APP_NAME%` placeholders in `index.html` and generates `site.webmanifest` (there is no static `public/site.webmanifest`); the Android build reads it too (`android/app/build.gradle.kts`). Never hardcode the name — `src/appName.test.js` fails on a literal. The name in Firebase Auth emails is the Firebase Console *Public-facing name* (Project settings → General) and is changed there by hand.
