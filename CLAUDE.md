# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # dev server (also generates service worker)
npm run build          # production build (also generates service worker)
npm test               # run tests (react-scripts test)
npm run generate-sw    # generate public/sw.js from env vars only
npm run deploy         # build + push to gh-pages branch

# Version bumping (also done automatically by CI on deploy)
npm run version:patch
npm run version:minor
npm run version:major
```

**Install:** always use `npm ci --legacy-peer-deps` — there are peer dependency conflicts between packages.

## Architecture

**Stack:** React (CRA/react-scripts), Firebase (Auth + Firestore client + Cloud Functions Gen2 + FCM), Matter.js, MUI v5, TipTap (rich text), i18next.  
**Hosting:** GitHub Pages. Deployed via `.github/workflows/deploy.yml` on push to `main`/`master`.

### Frontend structure

```
src/
  App.js                     # root: Firebase Auth listener → AuthForm | BubblesPage
  firebase.js                # Firebase SDK init
  firebaseMessaging.js       # FCM setup / token registration
  i18n.js                    # i18next init (en + uk)
  pages/BubblesPage.js       # main god-component (active refactor target — see hooks/)
  services/
    authService.js           # Firebase Auth wrapper
    firestoreService.js      # Firestore CRUD: bubbles, tags, FCM tokens
  hooks/                     # extracted from BubblesPage
    useMatterEngine.js       # Matter.js physics world lifecycle
    useDraggableFab.js       # draggable FAB position
    useBubbleFilters.js      # filter/sort state for bubble list
    useEditorResize.js       # TipTap editor resize logic
    useMatterResize.js       # canvas resize handler
    useSearch.js             # search state
    useThemeMode.js          # MUI theme / dark-light toggle
  components/                # UI dialogs, drawers, editors, selectors
  locales/en/ uk/            # i18next translation JSON files
  utils/storage.js           # localStorage helpers
scripts/
  generate-sw.js             # writes public/sw.js injecting Firebase config env vars
  version-bump.js            # patches package.json version field
functions/
  index.js                   # Cloud Functions v2 — scheduled notification trigger
  locales/                   # notification text: notifications.en.json, notifications.uk.json
```

### Firestore data model

| Collection | Access |
|---|---|
| `user-bubbles/{uid}/bubbles/{bubbleId}` | owner (`uid`) only — **current schema** |
| `user-bubbles/{uid}` (field `bubbles[]`) | owner only — **legacy array schema**, still read by Cloud Function |
| `user-tags/{uid}` | owner only |
| `user-fcm-tokens/{uid}/tokens/{tokenId}` | owner only |
| `notification-sent/{key}` | Cloud Functions admin SDK only (`allow read, write: if false` in rules) |

The Cloud Function (`fetchAllUserBubbles`) reads **both** schemas: subcollection via `collectionGroup('bubbles')` first, then legacy documents as fallback.

### Cloud Functions

`functions/index.js` exports one scheduled function (runs every minute via `onSchedule`):
- Reads all active bubbles from both schemas
- Sends FCM **reminder** notifications (based on `bubble.notifications[].minutesBefore`) and **overdue** notifications
- Deduplicates via `notification-sent` collection (TTL cleanup: entries older than 7 days are deleted)
- Supports `en` and `uk` locales; `ru` → `en` fallback

### Environment variables

Copy `.env.example` to `.env` for local development. All Firebase vars are `REACT_APP_FIREBASE_*`. The CI workflow generates `.env.production` from GitHub Secrets at build time — do not commit real credentials.

The service worker (`public/sw.js`) is generated from env vars by `scripts/generate-sw.js`. It must run before `start` or `build` (already wired into both npm scripts).

### CI / Version management

`.github/workflows/deploy.yml` auto-runs `npm run version:patch` on every push to `main`, commits the bump with `[skip ci]`, builds, and deploys to GitHub Pages. The current version in `package.json` is the source of truth.

## Active refactor context

Branch `audit/security-bugs-refactor` is working through `AUDIT_PLAN.md`. Key ongoing work:
- `BubblesPage.js` is a ~3000-line god-component — new behaviour extracts to `hooks/` and `components/`
- `HtmlRenderer.js` uses DOMPurify — any HTML rendering must go through it
- `firestore.rules` is now in the repo and must be kept in sync with `firebase.json` (`"firestore": { "rules": "firestore.rules" }`)
