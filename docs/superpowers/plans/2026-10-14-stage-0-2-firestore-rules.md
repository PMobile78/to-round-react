# Этап 0.2: правила и индексы Firestore v2 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Правила Firestore для формата данных v2 (`users/{uid}` и подколлекции с проверкой формата, старые коллекции только для чтения), индексы для будущих функций и тесты правил на эмуляторе Firestore, включённые в `npm run verify` и в CI.

**Architecture:** Правила пишутся по одному типу документа за задачу, каждая — после падающих тестов. Тесты живут в `firestore-tests/`, запускаются отдельным конфигом Vitest внутри `firebase emulators:exec` и используют `@firebase/rules-unit-testing`. Общие примеры из `contract/fixtures/` переводятся в форму Firestore (время → `Timestamp`, плюс `schemaVersion` и служебные поля): правила обязаны принимать каждую правильную запись контракта. Деплоя нет — правила выходят в прод при переезде (подплан 0.7).

**Tech Stack:** Firestore Security Rules v2, Firebase CLI 15 (`emulators:exec`), эмулятор Firestore (Java 21+), `@firebase/rules-unit-testing` 6.0.0 с firebase 13 (Node 24.12+), Vitest 4.

**Spec:** [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md) — разделы 3, 6 (индексы), 7, 11. Обзор подпланов — [2026-10-14-stage-0-overview.md](2026-10-14-stage-0-overview.md). Предыдущий подплан — [0.1](2026-10-14-stage-0-1-contract-core.md) (из его финального ревью: примеры устройств переехали сюда).

## Global Constraints

- Ветка `stage-0-data-contract-v2`, в `main` не коммитить. Ничего не деплоить (`firebase deploy` не запускать): новые правила отключают запись в старые коллекции, а прод-веб пока пишет туда.
- Единственная новая зависимость — `@firebase/rules-unit-testing@^6.0.0` (devDependency): версия для firebase 13, нужен Node 24.12+. Веб переведён на firebase 13, а CI — на Node 24 в `main` (коммит `a908b81`, влит в ветку). Ставить с `--legacy-peer-deps`, как всё в проекте. После установки в `package.json` меняется только `devDependencies`: npm умеет молча переписать `react`/`react-dom` в `dependencies` на диапазон из `peerDependencies` (`>=16.8.0`) — такую правку откатить.
- Эмулятор Firestore: порт **8180** (8080 на машине разработчика занят), проект **`demo-to-round`** (префикс `demo-` — без доступа к настоящей базе и без входа в аккаунт).
- Для `npm run test:rules` нужны Java 21+ и Firebase CLI 15+ (локально уже есть JDK 25 и Firebase CLI 15.22).
- Формат документов — раздел 3 спецификации. Документы задач, категорий и пользователя содержат `schemaVersion == 2`, документ устройства — нет.
- Время: при создании `createdAt` и `updatedAt` — `timestamp` не позже `request.time`. При изменении `updatedAt == request.time` (клиент пишет `serverTimestamp()`), `createdAt` не меняется.
- `overdueAt` и `nextNotifyAt` пишет только сервер. При создании задачи клиент передаёт `overdueAt: null` и не передаёт `nextNotifyAt`; при изменениях клиент их не трогает.
- Клиенты пишут изменения частичными обновлениями (`updateDoc` с изменёнными полями и `updatedAt`), никогда не перезаписывают документ целиком со служебными полями.
- Правила принимают каждую правильную запись из `contract/fixtures/`. Неправильные записи, которые правила проверить не могут (значения внутри `reminders`, база часовых поясов, отсутствующий id), перечислены в тестах явно, с причиной.
- Каждая задача заканчивается зелёным `npm run test:rules`; последняя — зелёным `npm run verify`.

## Review Focus

- **Изменение задачи с устаревшей копией на устройстве:** пока клиент правил задачу, сервер поменял `overdueAt` и `nextNotifyAt`. Частичное обновление проходит. Тест «accepts a partial update while the server owns overdueAt and nextNotifyAt» — в задаче 2.
- **Устройство с неправильными часами** создаёт данные «из будущего». Запись отклоняется. Тесты «rejects a createdAt from the future» — в задачах 1 и 2.
- **Старая вкладка с кодом v1 после переезда** пишет в `user-bubbles`, `user-tags`, `user-fcm-tokens`. Запись отклоняется, чтение для переноса и отката остаётся. Тесты — в задаче 4.
- **Чужой аккаунт или гость** обращается к чужим задачам, категориям, устройствам и настройкам. Отказ везде. Тесты «keeps other users and guests out» — в задачах 1–4.
- **Палитра в правилах разошлась с `contract/palette.json`.** Любой цвет из общей палитры принимается. Тест «accepts every colour of contract/palette.json» — в задаче 3.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `firestore.rules` | правила v2: `users/{uid}`, задачи, категории, устройства; старые коллекции только для чтения |
| `firestore.indexes.json` | индексы collectionGroup `tasks` для функций (подплан 0.3) |
| `firebase.json` | (изменение) настройки эмулятора Firestore |
| `vitest.rules.config.js` | конфиг Vitest только для тестов правил |
| `vite.config.js` | (изменение) обычный `npm test` не трогает `firestore-tests/` и копии репозитория в `.claude/` |
| `firestore-tests/helpers.js` | стенд эмулятора и перевод примеров контракта в форму Firestore |
| `firestore-tests/users.rules.test.js` | документ пользователя и настройки |
| `firestore-tests/tasks.rules.test.js` | задачи |
| `firestore-tests/categories.rules.test.js` | категории и сверка палитры |
| `firestore-tests/devices.rules.test.js` | устройства |
| `firestore-tests/legacy.rules.test.js` | старые коллекции, карты mindmap, закрытые пути |
| `contract/fixtures/devices.json` | правильные и неправильные записи устройств |
| `contract/README.md` | (изменение) новые читатели примеров |
| `package.json`, `.github/workflows/test.yml` | (изменение) `test:rules` в `test:all`, Java и Firebase CLI в CI |
| `CLAUDE.md`, `docs/firebase.md`, `docs/deployment.md` | (изменение) правила v2 и их тесты |

---

### Task 1: Стенд на эмуляторе и правила документа пользователя

**Files:**
- Modify: `package.json` (devDependency, скрипт `test:rules`), `package-lock.json` (через `npm install`)
- Modify: `firebase.json`
- Modify: `vite.config.js`
- Create: `vitest.rules.config.js`
- Create: `firestore-tests/helpers.js`
- Test: `firestore-tests/users.rules.test.js`
- Modify: `firestore.rules` (переписать целиком)

**Interfaces:**
- Consumes: `contract/fixtures/settings.json` (план 0.1).
- Produces:
  - скрипт `npm run test:rules`; эмулятор Firestore на порту 8180, проект `demo-to-round` — их же используют подпланы 0.3 и 0.6;
  - `firestore-tests/helpers.js`: `OWNER` (`'alice'`), `OTHER` (`'bob'`), `PAST` (Timestamp 2026-01-01), `setupRulesEnv(): Promise<RulesTestEnvironment>`, `toTimestamp(value)`, `taskFromFixture(plainTask): [id, data]`, `categoryFromFixture(plainCategory): [id, data]`, `deviceFromFixture(device): [id, data]`, `userDocWith(settings): data`, `baseTask(overrides): data`, `seed(env, path, data): Promise<void>`;
  - контракт записи документа пользователя для подпланов 0.4 и 0.6: создание `{ schemaVersion: 2, settings, createdAt, updatedAt[, migration] }`; изменение одной настройки — `updateDoc(ref, { 'settings.<поле>': value, updatedAt: serverTimestamp() })`; удалить документ нельзя.

- [ ] **Step 1: Поставить библиотеку тестов правил**

Run: `npm install --save-dev @firebase/rules-unit-testing@^6.0.0 --legacy-peer-deps`, затем `git diff package.json`
Expected: npm сообщает `added … packages`; diff — одна новая строка `"@firebase/rules-unit-testing": "^6.0.0"` в `devDependencies` и больше ничего. Если npm переписал `react`/`react-dom` в `dependencies` на `">=16.8.0"`, вернуть `"^19.1.0"` (в `peerDependencies` диапазон `>=16.8.0` остаётся).

- [ ] **Step 2: Добавить скрипт `test:rules` в `package.json`**

В блоке `scripts` сразу после строки

```json
    "test:functions": "npm --prefix functions test",
```

вставить строку

```json
    "test:rules": "firebase emulators:exec --only firestore --project demo-to-round \"vitest run --config vitest.rules.config.js\"",
```

- [ ] **Step 3: Настроить эмулятор в `firebase.json`**

Заменить файл целиком (добавлен блок `emulators`, остальное без изменений):

```json
{
    "firestore": {
        "rules": "firestore.rules",
        "indexes": "firestore.indexes.json"
    },
    "functions": [
        {
            "source": "functions",
            "codebase": "default"
        }
    ],
    "hosting": {
        "public": "public",
        "ignore": [
            "firebase.json",
            "**/.*",
            "**/node_modules/**"
        ]
    },
    "emulators": {
        "firestore": {
            "port": 8180
        },
        "ui": {
            "enabled": false
        },
        "singleProjectMode": true
    }
}
```

- [ ] **Step 4: Создать `vitest.rules.config.js`**

```js
import { defineConfig } from 'vitest/config';

// Firestore security rules tests. They need the Firestore emulator, so they run only through
// `npm run test:rules` (firebase emulators:exec), never as part of plain `npm test`.
export default defineConfig({
    test: {
        include: ['firestore-tests/**/*.test.js'],
        environment: 'node',
        fileParallelism: false,
        testTimeout: 20000,
        hookTimeout: 30000,
    },
});
```

- [ ] **Step 5: Исключить тесты правил из обычного `npm test`**

Заменить `vite.config.js` целиком (добавлены импорт `configDefaults` и блок `test`):

```js
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
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
    test: {
        // Firestore rules tests need the emulator: they run only through `npm run test:rules`.
        // Agent worktrees under .claude/ hold copies of the repo tests: never collect them.
        exclude: [...configDefaults.exclude, 'firestore-tests/**', '.claude/**'],
    },
});
```

- [ ] **Step 6: Создать `firestore-tests/helpers.js`**

```js
/**
 * Shared setup for the Firestore security rules tests (run under the emulator by `npm run test:rules`).
 * Contract fixtures are in backup form (ISO strings, id as a field); these helpers turn them into
 * the Firestore form the rules see (Timestamps, schemaVersion, server-owned fields).
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, doc, setDoc } from 'firebase/firestore';

export const OWNER = 'alice';
export const OTHER = 'bob';

/** A fixed time in the past: creates may carry historical times, never future ones. */
export const PAST = Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z'));

export const setupRulesEnv = () => initializeTestEnvironment({
    projectId: 'demo-to-round',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

/** ISO string -> Timestamp; anything else is left as is so the rules can reject it. */
export const toTimestamp = (value) => {
    if (typeof value !== 'string') return value;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Timestamp.fromMillis(ms) : value;
};

/** Backup-form task -> [id, Firestore document as a client creates it]. */
export const taskFromFixture = ({ id, createdAt, updatedAt, deletedAt, ...rest }) => [id, {
    ...rest,
    schemaVersion: 2,
    overdueAt: null,
    createdAt: toTimestamp(createdAt),
    updatedAt: toTimestamp(updatedAt),
    deletedAt: toTimestamp(deletedAt),
}];

/** Backup-form category -> [id, Firestore document]. */
export const categoryFromFixture = ({ id, ...rest }) => [id, {
    ...rest,
    schemaVersion: 2,
    createdAt: PAST,
    updatedAt: PAST,
}];

/** Device fixture -> [id, Firestore document]. */
export const deviceFromFixture = ({ id, createdAt, updatedAt, ...rest }) => [id, {
    ...rest,
    createdAt: toTimestamp(createdAt),
    updatedAt: toTimestamp(updatedAt),
}];

/** Settings object -> users/{uid} document. */
export const userDocWith = (settings) => ({
    schemaVersion: 2,
    settings,
    createdAt: PAST,
    updatedAt: PAST,
});

/** A valid active task without a due date, in Firestore form. */
export const baseTask = (overrides = {}) => ({
    schemaVersion: 2,
    title: 'Buy milk',
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    overdueAt: null,
    createdAt: PAST,
    updatedAt: PAST,
    deletedAt: null,
    ...overrides,
});

/** Writes a document with the rules switched off (test setup). */
export const seed = (env, path, data) => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));
```

- [ ] **Step 7: Написать падающий тест `firestore-tests/users.rules.test.js`**

```js
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import settingsFixtures from '../contract/fixtures/settings.json';
import { OTHER, OWNER, seed, setupRulesEnv, userDocWith } from './helpers';

const DEFAULTS = settingsFixtures.valid[0].value;
let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const userRef = (uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}`);

describe('users/{uid}: settings (contract fixtures)', () => {
    it.each(settingsFixtures.valid)('accepts $name', async ({ value }) => {
        await assertSucceeds(setDoc(userRef(), userDocWith(value)));
    });

    it.each(settingsFixtures.invalid)('rejects $name', async ({ value }) => {
        await assertFails(setDoc(userRef(), userDocWith(value)));
    });
});

describe('users/{uid}: updates', () => {
    it('changes one setting by its dot path with a server updatedAt', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertSucceeds(updateDoc(userRef(), { 'settings.themeMode': 'dark', updatedAt: serverTimestamp() }));
    });

    it('rejects an update that does not stamp updatedAt', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(updateDoc(userRef(), { 'settings.themeMode': 'dark' }));
    });

    it('rejects removing a required setting', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(updateDoc(userRef(), { 'settings.listSort': deleteField(), updatedAt: serverTimestamp() }));
    });

    it('accepts the migration marker', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertSucceeds(updateDoc(userRef(), {
            migration: { fromV1At: serverTimestamp(), tasks: 12, categories: 3 },
            updatedAt: serverTimestamp(),
        }));
    });

    it('rejects a createdAt from the future', async () => {
        const future = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
        await assertFails(setDoc(userRef(), { ...userDocWith(DEFAULTS), createdAt: future }));
    });

    it('never lets the owner delete the user document', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(deleteDoc(userRef()));
    });
});

describe('users/{uid}: access', () => {
    it('keeps other users and guests out', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(DEFAULTS));
        await assertFails(getDoc(userRef(OTHER)));
        await assertFails(setDoc(userRef(OTHER), userDocWith(DEFAULTS)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `users/${OWNER}`)));
    });
});
```

- [ ] **Step 8: Убедиться, что тест падает**

Run: `npm run test:rules`
Expected: FAIL — `Tests  4 failed | 11 passed (15)`. Текущие правила не знают `users/{uid}` и всё запрещают, поэтому падают четыре проверки, где запись должна пройти: два правильных набора настроек, изменение одной настройки и отметка о переносе. Первый запуск скачивает эмулятор Firestore (около 70 МБ) в `~/.cache/firebase/emulators`.

- [ ] **Step 9: Переписать `firestore.rules`**

Заменить файл целиком. Старые коллекции пока остаются с прежним доступом — их закроет задача 4:

```
rules_version = '2';

// Data contract v2: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md (sections 3 and 7).
// Element-level checks of `reminders` and of category id lists are done by the clients and the server.
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    // Firestore-safe id: 1..128 chars, no "/".
    function isId(v) {
      return v is string && v.size() > 0 && v.size() <= 128 && !v.matches('.*/.*');
    }

    function isNonBlankString(v, max) {
      return v is string && v.size() > 0 && v.size() <= max && v.matches('(?s).*\\S.*');
    }

    function hasExactly(d, required, optional) {
      return d.keys().hasAll(required) && d.keys().hasOnly(required.concat(optional));
    }

    // Create may carry historical times (migration, import), never future ones.
    function validCreateTimes(d) {
      return d.createdAt is timestamp && d.createdAt <= request.time
        && d.updatedAt is timestamp && d.updatedAt <= request.time;
    }

    // Every client update stamps updatedAt with the server time and keeps createdAt.
    function validUpdateTimes(d, old) {
      return d.updatedAt == request.time && d.createdAt == old.createdAt;
    }

    // ---------- users/{uid}: settings and migration marker ----------

    function validCategoryFilter(f, keys) {
      return f is map && hasExactly(f, keys, [])
        && (f.categoryIds == null || (f.categoryIds is list && f.categoryIds.size() <= 100))
        && f.showUncategorized is bool;
    }

    function validSettings(s) {
      return s is map
        && hasExactly(s, ['themeMode', 'design', 'language', 'mainView', 'labelFontSize', 'bubbleBackground',
          'showCategoriesPanel', 'showInstructions', 'bubbleFilter', 'listFilter', 'listSort'], [])
        && s.themeMode in ['light', 'dark', 'system']
        && s.design in ['classic', 'modern', 'aurora', 'brutalist', 'clay']
        && s.language in ['en', 'uk']
        && s.mainView in ['bubbles', 'list']
        && s.labelFontSize is int && s.labelFontSize >= 8 && s.labelFontSize <= 20
        && s.bubbleBackground is bool && s.showCategoriesPanel is bool && s.showInstructions is bool
        && validCategoryFilter(s.bubbleFilter, ['categoryIds', 'showUncategorized', 'plannedOnly'])
        && s.bubbleFilter.plannedOnly is bool
        && validCategoryFilter(s.listFilter, ['categoryIds', 'showUncategorized'])
        && s.listSort is map && hasExactly(s.listSort, ['by', 'order'], [])
        && s.listSort.by in ['createdAt', 'updatedAt', 'title', 'category']
        && s.listSort.order in ['asc', 'desc'];
    }

    function validMigration(m) {
      return m is map && hasExactly(m, ['fromV1At', 'tasks', 'categories'], [])
        && m.fromV1At is timestamp
        && m.tasks is int && m.tasks >= 0
        && m.categories is int && m.categories >= 0;
    }

    function validUserDoc(d) {
      return hasExactly(d, ['schemaVersion', 'settings', 'createdAt', 'updatedAt'], ['migration'])
        && d.schemaVersion == 2
        && validSettings(d.settings)
        && (!('migration' in d) || validMigration(d.migration));
    }

    match /users/{uid} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && validUserDoc(request.resource.data)
        && validCreateTimes(request.resource.data);
      allow update: if isOwner(uid) && validUserDoc(request.resource.data)
        && validUpdateTimes(request.resource.data, resource.data);
      allow delete: if false;
    }

    // User mind maps: owner-only access (unchanged in stage 0).
    match /user-mindmaps/{uid}/{document=**} {
      allow read, write: if isOwner(uid);
    }

    // User bubbles: owner-only access
    match /user-bubbles/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // User tags: owner-only access
    match /user-tags/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // User FCM tokens: owner-only access
    match /user-fcm-tokens/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // Notification dedup keys: Cloud Functions only (admin SDK bypasses these rules).
    match /notification-sent/{document=**} {
      allow read, write: if false;
    }

    // Default deny: all other paths are denied.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 10: Убедиться, что тест проходит**

Run: `npm run test:rules`
Expected: PASS — `Tests  15 passed (15)`.

- [ ] **Step 11: Обычные тесты не подхватывают тесты правил**

Run: `npm test`, затем `npx vitest list --filesOnly | grep -c -e firestore-tests -e '\.claude/'`
Expected: PASS — `Tests  460 passed (460)`, только тесты `src/` (до плана `npm test` насчитывал больше, если в `.claude/worktrees/` лежали копии репозитория); вторая команда печатает `0`.

- [ ] **Step 12: Сборка не сломалась из-за импорта `vitest/config`**

Run: `npx vite build --outDir node_modules/.cache/vite-build-check --emptyOutDir`
Expected: сборка завершается строкой `✓ built in …`.

- [ ] **Step 13: Проверить линтером**

Run: `npm run lint`
Expected: без ошибок.

- [ ] **Step 14: Commit**

```bash
git add package.json package-lock.json firebase.json vite.config.js vitest.rules.config.js firestore-tests/helpers.js firestore-tests/users.rules.test.js firestore.rules
git commit -F - <<'EOF'
feat(rules): Firestore emulator tests and v2 rules for the user document

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Правила задач

**Files:**
- Test: `firestore-tests/tasks.rules.test.js`
- Modify: `firestore.rules` (две вставки)

**Interfaces:**
- Consumes (задача 1): `OTHER`, `OWNER`, `PAST`, `baseTask`, `seed`, `setupRulesEnv`, `taskFromFixture`; `contract/fixtures/tasks.json` (план 0.1).
- Produces — контракт записи задач для подпланов 0.4 и 0.6:
  - создание: все поля раздела 3.1, `schemaVersion: 2`, `overdueAt: null`, без `nextNotifyAt`, `createdAt`/`updatedAt` — `serverTimestamp()`. При переносе и импорте можно исходное время, если оно не позже текущего;
  - изменение: `updateDoc` только с изменёнными полями и `updatedAt: serverTimestamp()`;
  - в корзину: `{ status: 'deleted', deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }`;
  - удаление навсегда: `deleteDoc`.

- [ ] **Step 1: Написать падающий тест `firestore-tests/tasks.rules.test.js`**

```js
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { Timestamp, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import taskFixtures from '../contract/fixtures/tasks.json';
import { OTHER, OWNER, PAST, baseTask, seed, setupRulesEnv, taskFromFixture } from './helpers';

// Element values of `reminders` are checked by the clients and the server, and the rules have no
// time-zone database: these contract-invalid fixtures pass the rules on purpose.
const NOT_CHECKED_BY_RULES = ['reminder-not-whole-hours', 'reminders-not-ascending', 'due-unknown-zone'];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const taskRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/tasks/${id}`);
const LATER = Timestamp.fromDate(new Date('2026-10-14T12:00:00.000Z'));

describe('users/{uid}/tasks: contract fixtures', () => {
    it.each(taskFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = taskFromFixture(value);
        await assertSucceeds(setDoc(taskRef(id), data));
    });

    it.each(taskFixtures.invalid.filter((f) => !NOT_CHECKED_BY_RULES.includes(f.name)))('rejects $name', async ({ value }) => {
        const [id, data] = taskFromFixture(value);
        await assertFails(setDoc(taskRef(id), data));
    });
});

describe('users/{uid}/tasks: server-owned fields', () => {
    it('rejects overdueAt set by a client on create', async () => {
        await assertFails(setDoc(taskRef('t1'), baseTask({ overdueAt: LATER })));
    });

    it('rejects nextNotifyAt set by a client on create', async () => {
        await assertFails(setDoc(taskRef('t1'), baseTask({ nextNotifyAt: LATER })));
    });

    it('accepts a partial update while the server owns overdueAt and nextNotifyAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ overdueAt: LATER, nextNotifyAt: LATER }));
        await assertSucceeds(updateDoc(taskRef('t1'), { title: 'Buy oat milk', updatedAt: serverTimestamp() }));
    });

    it('rejects a client change of nextNotifyAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ nextNotifyAt: LATER }));
        await assertFails(updateDoc(taskRef('t1'), { nextNotifyAt: PAST, updatedAt: serverTimestamp() }));
    });

    it('rejects a client clearing overdueAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ overdueAt: LATER }));
        await assertFails(updateDoc(taskRef('t1'), { overdueAt: null, updatedAt: serverTimestamp() }));
    });
});

describe('users/{uid}/tasks: times', () => {
    it('rejects an update that does not stamp updatedAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(updateDoc(taskRef('t1'), { title: 'Other' }));
    });

    it('rejects changing createdAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(updateDoc(taskRef('t1'), { createdAt: LATER, updatedAt: serverTimestamp() }));
    });

    it('rejects a createdAt from the future', async () => {
        const future = Timestamp.fromMillis(Date.now() + 10 * 60 * 1000);
        await assertFails(setDoc(taskRef('t1'), baseTask({ createdAt: future })));
    });

    it('accepts a create stamped with server time', async () => {
        await assertSucceeds(setDoc(taskRef('t1'), baseTask({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() })));
    });
});

describe('users/{uid}/tasks: lifecycle and access', () => {
    it('moves a task to the trash with a server deletedAt', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertSucceeds(updateDoc(taskRef('t1'), {
            status: 'deleted',
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }));
    });

    it('lets the owner delete a task permanently', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertSucceeds(deleteDoc(taskRef('t1')));
    });

    it('rejects a task id longer than 128 characters', async () => {
        await assertFails(setDoc(taskRef('x'.repeat(129)), baseTask()));
    });

    it('keeps other users and guests out', async () => {
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask());
        await assertFails(getDoc(taskRef('t1', OTHER)));
        await assertFails(setDoc(taskRef('t2', OTHER), baseTask()));
        await assertFails(deleteDoc(taskRef('t1', OTHER)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `users/${OWNER}/tasks/t1`)));
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm run test:rules`
Expected: FAIL — `Tests  11 failed | 42 passed (53)`. Задачи пока под общим запретом, поэтому падают все проверки, где запись должна пройти.

- [ ] **Step 3: Добавить функции проверки задач**

В `firestore.rules` перед строкой `    match /users/{uid} {` вставить блок и одну пустую строку после него:

```
    // ---------- users/{uid}/tasks/{taskId} ----------

    function validDue(due) {
      return due == null || (due is map && hasExactly(due, ['local', 'tz'], [])
        && due.local is string && due.local.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}')
        && due.tz is string && due.tz.size() > 0 && due.tz.size() <= 64);
    }

    function validRepeat(r) {
      return r == null || (r is map && hasExactly(r, ['every', 'unit'], ['weekdays', 'monthDay'])
        && r.every is int && r.every >= 1 && r.every <= 999
        && r.unit in ['hours', 'days', 'weeks', 'months']
        && (!('weekdays' in r)
          || (r.unit == 'weeks' && r.weekdays is list && r.weekdays.size() <= 7
            && r.weekdays.hasOnly([1, 2, 3, 4, 5, 6, 7])))
        && (r.unit == 'months'
          ? ('monthDay' in r && r.monthDay is int && r.monthDay >= 1 && r.monthDay <= 31)
          : !('monthDay' in r)));
    }

    function validTask(d) {
      return hasExactly(d, ['schemaVersion', 'title', 'description', 'categoryId', 'status', 'due', 'reminders',
          'repeat', 'radius', 'pulseMuted', 'overdueAt', 'createdAt', 'updatedAt', 'deletedAt'], ['nextNotifyAt'])
        && d.schemaVersion == 2
        && isNonBlankString(d.title, 1000)
        && d.description is string && d.description.size() <= 100000
        && (d.categoryId == null || isId(d.categoryId))
        && d.status in ['active', 'done', 'deleted']
        && validDue(d.due)
        && d.reminders is list && d.reminders.size() <= 10
        && (d.due != null || d.reminders.size() == 0)
        && validRepeat(d.repeat)
        && (d.due != null || d.repeat == null)
        && d.radius is int && d.radius >= 30 && d.radius <= 80
        && d.pulseMuted is bool
        && (d.overdueAt == null || d.overdueAt is timestamp)
        && (d.status == 'deleted' ? d.deletedAt is timestamp : d.deletedAt == null);
    }

    // overdueAt and nextNotifyAt belong to Cloud Functions.
    function serverFieldsUntouchedOnCreate(d) {
      return d.overdueAt == null && !('nextNotifyAt' in d);
    }

    function serverFieldsUnchanged(d, old) {
      return d.overdueAt == old.overdueAt && d.get('nextNotifyAt', null) == old.get('nextNotifyAt', null);
    }
```

- [ ] **Step 4: Добавить правила подколлекции задач**

Внутри `match /users/{uid}` после строки `      allow delete: if false;` вставить пустую строку и блок:

```
      match /tasks/{taskId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && isId(taskId) && validTask(request.resource.data)
          && validCreateTimes(request.resource.data) && serverFieldsUntouchedOnCreate(request.resource.data);
        allow update: if isOwner(uid) && validTask(request.resource.data)
          && validUpdateTimes(request.resource.data, resource.data)
          && serverFieldsUnchanged(request.resource.data, resource.data);
        allow delete: if isOwner(uid);
      }
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npm run test:rules`
Expected: PASS — `Tests  53 passed (53)`.

- [ ] **Step 6: Commit**

```bash
git add firestore-tests/tasks.rules.test.js firestore.rules
git commit -F - <<'EOF'
feat(rules): validate v2 task documents and protect server-owned fields

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Правила категорий и устройств

**Files:**
- Create: `contract/fixtures/devices.json`
- Modify: `contract/README.md`
- Test: `firestore-tests/categories.rules.test.js`, `firestore-tests/devices.rules.test.js`
- Modify: `firestore.rules` (две вставки)

**Interfaces:**
- Consumes (задача 1): `OTHER`, `OWNER`, `categoryFromFixture`, `deviceFromFixture`, `seed`, `setupRulesEnv`; `contract/fixtures/categories.json` и `contract/palette.json` (план 0.1).
- Produces:
  - `contract/fixtures/devices.json` — `{ valid: [{ name, value }], invalid: [{ name, value }] }`, где `value` = `{ id, platform, fcmToken, notificationsEnabled, createdAt, updatedAt }`, время — ISO-строки;
  - контракт записи для подплана 0.4. Категория: `{ schemaVersion: 2, name, color, order, createdAt, updatedAt }`, перестановка — `updateDoc(ref, { order, updatedAt: serverTimestamp() })`. Устройство: `{ platform, fcmToken, notificationsEnabled, createdAt, updatedAt }` без `schemaVersion`, при выходе — `deleteDoc`.

- [ ] **Step 1: Создать примеры `contract/fixtures/devices.json`**

```json
{
  "valid": [
    { "name": "web-with-token", "value": { "id": "fid-web-1", "platform": "web", "fcmToken": "token-abc", "notificationsEnabled": true, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "android-without-permission", "value": { "id": "fid-android-1", "platform": "android", "fcmToken": null, "notificationsEnabled": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-02T08:00:00.000Z" } }
  ],
  "invalid": [
    { "name": "unknown-platform", "value": { "id": "fid-1", "platform": "ios", "fcmToken": null, "notificationsEnabled": true, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "empty-token", "value": { "id": "fid-1", "platform": "web", "fcmToken": "", "notificationsEnabled": true, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "enabled-as-string", "value": { "id": "fid-1", "platform": "web", "fcmToken": null, "notificationsEnabled": "true", "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "language-is-not-a-device-field", "value": { "id": "fid-1", "platform": "web", "fcmToken": null, "notificationsEnabled": true, "language": "uk", "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "missing-notifications-enabled", "value": { "id": "fid-1", "platform": "web", "fcmToken": null, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" } }
  ]
}
```

- [ ] **Step 2: Обновить `contract/README.md`**

Заменить файл целиком: в таблице появились читатели «правила Firestore» и строка `fixtures/devices.json`, в правилах — абзац о тестах правил.

```markdown
# contract/ — общий контракт данных v2

Спецификация: [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md).

Папка общая для всех клиентов: веба (реализация — `src/contract/`), Cloud Functions и Android-приложения. Кода здесь нет — только данные, по которым каждый клиент проверяет свою реализацию.

| Файл | Что внутри | Кто читает |
|---|---|---|
| `palette.json` | 20 цветов категорий | веб, правила Firestore (тест сверки), Android |
| `fixtures/time.json` | «местное время + зона → момент» и обратно, включая переходы на летнее время | веб, функции, Android |
| `fixtures/recurrence.json` | «срок, повтор, now → следующий срок» | веб, Android |
| `fixtures/tasks.json`, `fixtures/categories.json`, `fixtures/settings.json` | правильные и неправильные записи в форме бэкапа | веб, правила Firestore, Android |
| `fixtures/devices.json` | правильные и неправильные записи устройств | правила Firestore, Android |
| `fixtures/markdown-v1.json` | старые описания (HTML TipTap и простой текст) → Markdown | веб |
| `fixtures/migration-v1.json` | старые записи v1 → v2 | веб |

Правила:

- Момент времени — ISO 8601 в UTC с `Z`. Местное время — `YYYY-MM-DDTHH:mm`.
- Эталон правил часовых поясов — `java.time.ZonedDateTime.of`: несуществующее время сдвигается вперёд на длину перехода, неоднозначное берётся с более ранним смещением.
- В примерах с переходом на летнее время используются зоны со стабильными правилами (`America/New_York`, `Europe/Berlin`), а не `Europe/Kyiv`: правила Украины могут измениться в базе tzdata.
- Тесты правил Firestore (`firestore-tests/`) переводят записи в форму Firestore: время → `Timestamp`, плюс `schemaVersion` и служебные поля. Правила принимают каждую правильную запись. Неправильные записи, которые правила проверить не могут (значения внутри списков, база часовых поясов), перечислены в тестах явно.
- Изменили пример — прогоните тесты всех клиентов, которые его читают.
```

- [ ] **Step 3: Написать падающие тесты**

`firestore-tests/categories.rules.test.js`:

```js
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import categoryFixtures from '../contract/fixtures/categories.json';
import palette from '../contract/palette.json';
import { OTHER, OWNER, categoryFromFixture, seed, setupRulesEnv } from './helpers';

// In Firestore the id is the document path, not a field, so a record "without id" cannot be written.
const NOT_CHECKED_BY_RULES = ['missing-id'];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const categoryRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/categories/${id}`);
const home = () => categoryFromFixture(categoryFixtures.valid[0].value);

describe('users/{uid}/categories: contract fixtures', () => {
    it.each(categoryFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = categoryFromFixture(value);
        await assertSucceeds(setDoc(categoryRef(id), data));
    });

    it.each(categoryFixtures.invalid.filter((f) => !NOT_CHECKED_BY_RULES.includes(f.name)))('rejects $name', async ({ value }) => {
        const [id, data] = categoryFromFixture(value);
        await assertFails(setDoc(categoryRef(id), data));
    });
});

describe('users/{uid}/categories: palette and order', () => {
    it('accepts every colour of contract/palette.json', async () => {
        for (const [i, color] of palette.entries()) {
            const [, data] = categoryFromFixture({ id: `c${i}`, name: `C${i}`, color, order: i + 1 });
            await assertSucceeds(setDoc(categoryRef(`c${i}`), data));
        }
    });

    it('rejects an order that is not a number', async () => {
        const [id, data] = home();
        await assertFails(setDoc(categoryRef(id), { ...data, order: Number.NaN }));
    });

    it('moves a category with a single update', async () => {
        const [id, data] = home();
        await seed(env, `users/${OWNER}/categories/${id}`, data);
        await assertSucceeds(updateDoc(categoryRef(id), { order: 2.5, updatedAt: serverTimestamp() }));
    });
});

describe('users/{uid}/categories: access', () => {
    it('lets the owner delete and keeps others out', async () => {
        const [id, data] = home();
        await seed(env, `users/${OWNER}/categories/${id}`, data);
        await assertFails(getDoc(categoryRef(id, OTHER)));
        await assertFails(deleteDoc(categoryRef(id, OTHER)));
        await assertSucceeds(deleteDoc(categoryRef(id)));
    });
});
```

`firestore-tests/devices.rules.test.js`:

```js
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import deviceFixtures from '../contract/fixtures/devices.json';
import { OTHER, OWNER, deviceFromFixture, seed, setupRulesEnv } from './helpers';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const deviceRef = (id, uid = OWNER) => doc(env.authenticatedContext(uid).firestore(), `users/${OWNER}/devices/${id}`);
const webDevice = () => deviceFromFixture(deviceFixtures.valid[0].value);

describe('users/{uid}/devices: contract fixtures', () => {
    it.each(deviceFixtures.valid)('accepts $name', async ({ value }) => {
        const [id, data] = deviceFromFixture(value);
        await assertSucceeds(setDoc(deviceRef(id), data));
    });

    it.each(deviceFixtures.invalid)('rejects $name', async ({ value }) => {
        const [id, data] = deviceFromFixture(value);
        await assertFails(setDoc(deviceRef(id), data));
    });
});

describe('users/{uid}/devices: updates and access', () => {
    it('turns notifications off with a server updatedAt', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertSucceeds(updateDoc(deviceRef(id), { notificationsEnabled: false, updatedAt: serverTimestamp() }));
    });

    it('rejects an update that does not stamp updatedAt', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertFails(updateDoc(deviceRef(id), { fcmToken: null }));
    });

    it('lets the owner remove the device on logout and keeps others out', async () => {
        const [id, data] = webDevice();
        await seed(env, `users/${OWNER}/devices/${id}`, data);
        await assertFails(getDoc(deviceRef(id, OTHER)));
        await assertFails(deleteDoc(deviceRef(id, OTHER)));
        await assertSucceeds(deleteDoc(deviceRef(id)));
    });
});
```

- [ ] **Step 4: Убедиться, что тесты падают**

Run: `npm run test:rules`
Expected: FAIL — `Tests  9 failed | 64 passed (73)`. Категории и устройства пока под общим запретом.

- [ ] **Step 5: Добавить функции проверки категорий и устройств**

В `firestore.rules` перед строкой `    match /users/{uid} {` вставить блок и одну пустую строку после него:

```
    // ---------- users/{uid}/categories/{categoryId} ----------

    function validCategory(d) {
      return hasExactly(d, ['schemaVersion', 'name', 'color', 'order', 'createdAt', 'updatedAt'], [])
        && d.schemaVersion == 2
        && isNonBlankString(d.name, 100)
        // Keep in sync with contract/palette.json (checked by firestore-tests/categories.rules.test.js).
        && d.color in ['#da3833', '#ee603c', '#fd8b2b', '#e9be00', '#b7be00',
          '#7db44e', '#46a549', '#00a47a', '#34c09d', '#007771',
          '#00a5cf', '#0089b5', '#005ea4', '#6179cf', '#434d82',
          '#b14dd1', '#c04097', '#f25e6a', '#4d697e', '#86a49c']
        // `order == order` rules out NaN; the bounds rule out infinities.
        && d.order is number && d.order == d.order
        && d.order > -1000000000000000.0 && d.order < 1000000000000000.0;
    }

    // ---------- users/{uid}/devices/{deviceId} ----------

    function validDevice(d) {
      return hasExactly(d, ['platform', 'fcmToken', 'notificationsEnabled', 'createdAt', 'updatedAt'], [])
        && d.platform in ['web', 'android']
        && (d.fcmToken == null || (d.fcmToken is string && d.fcmToken.size() > 0 && d.fcmToken.size() <= 4096))
        && d.notificationsEnabled is bool;
    }
```

- [ ] **Step 6: Добавить правила подколлекций категорий и устройств**

Сразу после конца блока `match /tasks/{taskId}` — после строк `        allow delete: if isOwner(uid);` и `      }` — вставить пустую строку и блок:

```
      match /categories/{categoryId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && isId(categoryId) && validCategory(request.resource.data)
          && validCreateTimes(request.resource.data);
        allow update: if isOwner(uid) && validCategory(request.resource.data)
          && validUpdateTimes(request.resource.data, resource.data);
        allow delete: if isOwner(uid);
      }

      match /devices/{deviceId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && isId(deviceId) && validDevice(request.resource.data)
          && validCreateTimes(request.resource.data);
        allow update: if isOwner(uid) && validDevice(request.resource.data)
          && validUpdateTimes(request.resource.data, resource.data);
        allow delete: if isOwner(uid);
      }
```

- [ ] **Step 7: Убедиться, что тесты проходят**

Run: `npm run test:rules`
Expected: PASS — `Tests  73 passed (73)`.

- [ ] **Step 8: Commit**

```bash
git add contract/fixtures/devices.json contract/README.md firestore-tests/categories.rules.test.js firestore-tests/devices.rules.test.js firestore.rules
git commit -F - <<'EOF'
feat(rules): validate v2 category and device documents

Adds the device fixtures that plan 0.1 left to this plan.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Старые коллекции только для чтения и индексы

**Files:**
- Test: `firestore-tests/legacy.rules.test.js`
- Modify: `firestore.rules` (замена трёх блоков)
- Modify: `firestore.indexes.json`

**Interfaces:**
- Consumes (задача 1): `OTHER`, `OWNER`, `seed`, `setupRulesEnv`.
- Produces:
  - старые коллекции читаются владельцем — это нужно переносу (подплан 0.6) и откату (0.7);
  - индексы collectionGroup `tasks`: (`status`, `nextNotifyAt`) — для `scheduleNotifications`, (`status`, `deletedAt`) — для `purgeDeletedTasks` (подплан 0.3). Старый индекс `bubbles` остаётся до удаления старых функций.

- [ ] **Step 1: Написать падающий тест `firestore-tests/legacy.rules.test.js`**

```js
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { OTHER, OWNER, seed, setupRulesEnv } from './helpers';

const LEGACY_DOCS = [
    `user-bubbles/${OWNER}`,
    `user-bubbles/${OWNER}/bubbles/b1`,
    `user-tags/${OWNER}`,
    `user-fcm-tokens/${OWNER}/tokens/t1`,
];

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const ownerDb = () => env.authenticatedContext(OWNER).firestore();
const otherDb = () => env.authenticatedContext(OTHER).firestore();

describe('legacy v1 collections are read-only', () => {
    it.each(LEGACY_DOCS)('owner reads but cannot change %s', async (path) => {
        await seed(env, path, { title: 'old' });
        await assertSucceeds(getDoc(doc(ownerDb(), path)));
        await assertFails(setDoc(doc(ownerDb(), path), { title: 'new' }));
        await assertFails(updateDoc(doc(ownerDb(), path), { title: 'new' }));
        await assertFails(deleteDoc(doc(ownerDb(), path)));
    });

    it.each(LEGACY_DOCS)('other users and guests cannot read %s', async (path) => {
        await seed(env, path, { title: 'old' });
        await assertFails(getDoc(doc(otherDb(), path)));
        await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), path)));
    });
});

describe('mind maps stay owner read/write', () => {
    it('owner writes and reads a map, others cannot', async () => {
        const path = `user-mindmaps/${OWNER}/maps/m1`;
        await assertSucceeds(setDoc(doc(ownerDb(), path), { title: 'Plan' }));
        await assertSucceeds(getDoc(doc(ownerDb(), path)));
        await assertFails(getDoc(doc(otherDb(), path)));
    });
});

describe('closed paths', () => {
    it('keeps notification-sent closed to clients', async () => {
        await assertFails(getDoc(doc(ownerDb(), 'notification-sent/k1')));
        await assertFails(setDoc(doc(ownerDb(), 'notification-sent/k1'), { at: 1 }));
    });

    it('denies unknown paths', async () => {
        await assertFails(setDoc(doc(ownerDb(), `somewhere/${OWNER}`), { a: 1 }));
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm run test:rules`
Expected: FAIL — `Tests  4 failed | 80 passed (84)`. Владелец пока может писать в старые коллекции.

- [ ] **Step 3: Сделать старые коллекции доступными только для чтения**

В `firestore.rules` заменить три блока

```
    // User bubbles: owner-only access
    match /user-bubbles/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // User tags: owner-only access
    match /user-tags/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // User FCM tokens: owner-only access
    match /user-fcm-tokens/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
```

на

```
    // Legacy v1 collections: read-only after the move to users/{uid}; kept for the migration and rollback.
    match /user-bubbles/{uid}/{document=**} {
      allow read: if isOwner(uid);
    }

    match /user-tags/{uid} {
      allow read: if isOwner(uid);
    }

    match /user-fcm-tokens/{uid}/{document=**} {
      allow read: if isOwner(uid);
    }
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npm run test:rules`
Expected: PASS — `Tests  84 passed (84)`.

- [ ] **Step 5: Добавить индексы задач**

Заменить `firestore.indexes.json` целиком (добавлены два индекса `tasks`, старое не тронуто):

```json
{
    "indexes": [
        {
            "collectionGroup": "bubbles",
            "queryScope": "COLLECTION_GROUP",
            "fields": [
                { "fieldPath": "status", "order": "ASCENDING" },
                { "fieldPath": "nextNotifyAt", "order": "ASCENDING" }
            ]
        },
        {
            "collectionGroup": "tasks",
            "queryScope": "COLLECTION_GROUP",
            "fields": [
                { "fieldPath": "status", "order": "ASCENDING" },
                { "fieldPath": "nextNotifyAt", "order": "ASCENDING" }
            ]
        },
        {
            "collectionGroup": "tasks",
            "queryScope": "COLLECTION_GROUP",
            "fields": [
                { "fieldPath": "status", "order": "ASCENDING" },
                { "fieldPath": "deletedAt", "order": "ASCENDING" }
            ]
        }
    ],
    "fieldOverrides": [
        {
            "collectionGroup": "bubbles",
            "fieldPath": "status",
            "indexes": [
                { "order": "ASCENDING", "queryScope": "COLLECTION" },
                { "order": "DESCENDING", "queryScope": "COLLECTION" },
                { "arrayConfig": "CONTAINS", "queryScope": "COLLECTION" },
                { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
            ]
        }
    ]
}
```

Run: `node -e "const i=require('./firestore.indexes.json').indexes; console.log(i.filter(x=>x.collectionGroup==='tasks').map(x=>x.fields.map(f=>f.fieldPath).join('+')).join(', '))"`
Expected: `status+nextNotifyAt, status+deletedAt`.

- [ ] **Step 6: Commit**

```bash
git add firestore-tests/legacy.rules.test.js firestore.rules firestore.indexes.json
git commit -F - <<'EOF'
feat(rules): make legacy v1 collections read-only, add task indexes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Тесты правил в `verify` и CI, документация

**Files:**
- Modify: `package.json` (скрипт `test:all`)
- Modify: `.github/workflows/test.yml`
- Modify: `CLAUDE.md`, `docs/firebase.md`, `docs/deployment.md`

**Interfaces:**
- Consumes (задача 1): скрипт `test:rules`.
- Produces: `npm run test:all` и `npm run verify` гоняют правила; CI-джоб `test` ставит Java 21 и Firebase CLI 15.

- [ ] **Step 1: Включить правила в `test:all`**

В `package.json` заменить строку

```json
    "test:all": "npm test && npm run test:functions",
```

на

```json
    "test:all": "npm test && npm run test:functions && npm run test:rules",
```

- [ ] **Step 2: Подготовить CI**

Заменить `.github/workflows/test.yml` целиком (в джобе `test` добавлены Java 21 и Firebase CLI 15 перед установкой зависимостей):

```yaml
name: Test & Lint

on:
  workflow_call:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v5

    - name: Setup Node.js
      uses: actions/setup-node@v5
      with:
        node-version: '24'
        cache: 'npm'

    - name: Setup Java (Firestore emulator)
      uses: actions/setup-java@v6
      with:
        distribution: 'temurin'
        java-version: '21'

    - name: Install Firebase CLI (Firestore emulator)
      run: npm install -g firebase-tools@15

    - name: Clear npm cache
      run: npm cache clean --force

    - name: Install dependencies
      run: |
        npm ci --legacy-peer-deps --prefer-offline --no-audit

    - name: Install functions dependencies
      run: cd functions && npm ci

    - name: Run tests
      run: npm run test:all

  lint:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v5

    - name: Setup Node.js
      uses: actions/setup-node@v5
      with:
        node-version: '24'
        cache: 'npm'

    - name: Clear npm cache
      run: npm cache clean --force

    - name: Install dependencies
      run: |
        npm ci --legacy-peer-deps --prefer-offline --no-audit

    - name: Run lint
      run: npm run lint:all
```

- [ ] **Step 3: Обновить `CLAUDE.md`**

В блоке команд после строки

```
npm test               # run tests (vitest)
```

добавить строку

```
npm run test:rules     # Firestore rules tests on the emulator (needs Java 21+ and Firebase CLI 15+)
```

В разделе «CI / Version management» заменить

```
running **two parallel jobs** — `test` (vitest + `test:functions`) and `lint` (eslint)
```

на

```
running **two parallel jobs** — `test` (`npm run test:all`: vitest + `test:functions` + `test:rules` on the Firestore emulator; the job installs Java 21 and Firebase CLI 15) and `lint` (eslint)
```

- [ ] **Step 4: Обновить `docs/deployment.md`**

Заменить пункт

```markdown
- **`test`** — Checkout + Node 24 (кеш npm) + `npm ci --legacy-peer-deps` (+ зависимости
  `functions/`) → **`npm test`** и **`npm run test:functions --if-present`**.
```

на

```markdown
- **`test`** — Checkout + Node 24 (кеш npm) + Java 21 и Firebase CLI 15 (для эмулятора Firestore) +
  `npm ci --legacy-peer-deps` (+ зависимости `functions/`) → **`npm run test:all`**: `npm test`,
  `npm run test:functions` и `npm run test:rules` (правила Firestore на эмуляторе).
```

- [ ] **Step 5: Обновить `docs/firebase.md`**

Заменить весь раздел `## Правила безопасности` — от заголовка до строки перед `## FCM (push-токены)` — на:

```markdown
## Правила безопасности

Правила — в [`firestore.rules`](../firestore.rules), путь к ним прописан в
[`firebase.json`](../firebase.json) (`firestore.rules`). Держите их синхронными.

В ветке этапа 0 правила уже описывают формат данных v2
([спецификация](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md), раздел 7);
в прод они выходят вместе с переездом данных:

- `users/{uid}` и подколлекции `tasks`, `categories`, `devices` — только владелец, с проверкой
  формата каждого документа: набор полей, типы, допустимые значения, `schemaVersion == 2`;
- при создании время не может быть из будущего; при каждом изменении `updatedAt` ставит сервер
  (`serverTimestamp()`), а `createdAt` не меняется;
- служебные поля задачи `overdueAt` и `nextNotifyAt` клиенту менять нельзя — их пишет Cloud Functions;
- документ пользователя удалить нельзя;
- старые коллекции `user-bubbles`, `user-tags`, `user-fcm-tokens` — только чтение: они нужны для
  переноса и отката;
- `user-mindmaps` — владелец читает и пишет, как раньше;
- `notification-sent` и все остальные пути закрыты.

> ⚠️ Не используйте `allow read, write: if true` — это открывает базу всему интернету.
> Коллекция `notification-sent` закрыта для клиента полностью: к ней обращается только
> Cloud Functions через admin SDK, который правила обходит.

### Тесты правил

`npm run test:rules` поднимает эмулятор Firestore (`firebase emulators:exec`, порт 8180, проект
`demo-to-round` без доступа к настоящей базе) и гоняет тесты из `firestore-tests/`. Нужны Java 21+
и Firebase CLI 15+. Тесты переводят общие примеры из `contract/fixtures/` в форму Firestore и
проверяют, что правила принимают каждую правильную запись и отклоняют неправильные. Команда входит
в `npm run test:all` и `npm run verify`.
```

В разделе `## Локальный эмулятор` заменить строку

```markdown
Для Firestore-эмулятора нужна Java. Эмулятор использует те же `firestore.rules` и
```

на

```markdown
Для Firestore-эмулятора нужна Java 21+; порт — 8180 (задан в `firebase.json`). Эмулятор использует те же `firestore.rules` и
```

- [ ] **Step 6: Полная проверка**

Run: `npm run verify`
Expected: код выхода 0; веб — `Tests  460 passed (460)`, тесты функций проходят, правила — `Tests  84 passed (84)`, линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add package.json .github/workflows/test.yml CLAUDE.md docs/firebase.md docs/deployment.md
git commit -F - <<'EOF'
ci: run Firestore rules tests in verify and in the test job

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
