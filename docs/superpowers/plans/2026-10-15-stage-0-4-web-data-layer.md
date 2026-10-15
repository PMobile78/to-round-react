# Этап 0.4: веб — слой данных — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести веб на формат данных v2: задачи, категории, настройки и устройства читаются и пишутся только в `users/{uid}/…` через один слой данных, холст получает изменения по одному (#94), настройки живут в `users/{uid}.settings`, копии в localStorage удалены, а веб запускается против эмуляторов Firebase.

**Architecture:** Слой данных `src/services/data/` получает `db` и `uid` аргументами. `convert.js` переводит документ Firestore ↔ запись в форме бэкапа (Timestamp ↔ ISO, `schemaVersion`, время сервера); `tasks.js`, `categories.js`, `settings.js`, `devices.js` подписываются и пишут так, как разрешают правила 0.2. Тесты этих модулей идут на эмуляторе с настоящими `firestore.rules`. Интерфейс сохраняет свои имена (`tagId`, `dueDate`, `notifications`, `recurrence`): до 0.5 переходный `bubbleModel.js` переводит задачу v2 в эти поля и обратно по правилам переноса 9.2. Настройки приходят через `SettingsContext` (подписка в `App`), и `BubblesUiStore` в одном месте переводит их в значения интерфейса и пишет по полям.

**Tech Stack:** React 19 + Vite 8, Firebase JS SDK 13 (Firestore с `persistentLocalCache`, Auth, Messaging, Installations), Vitest 4 + happy-dom, `@firebase/rules-unit-testing` 6 на эмуляторе Firestore (порт 8180, проект `demo-to-round`), Auth-эмулятор (порт 9099) для проверки вживую, Firebase CLI 15.

**Spec:** [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md) — разделы 2, 3 (документы и общие правила записи), 4.1, 4.2, 4.4 (ссылки `?taskId=`), 4.5, 8 (п. 1–5, 9), 9.2 (правила перевода для старых окон). Обзор подпланов — [2026-10-14-stage-0-overview.md](2026-10-14-stage-0-overview.md). Предыдущие подпланы: [0.1](2026-10-14-stage-0-1-contract-core.md) (`src/contract/*`), [0.2](2026-10-14-stage-0-2-firestore-rules.md) (правила и стенд эмулятора), [0.3](2026-10-14-stage-0-3-cloud-functions.md) (функции и формат push-сообщения). Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, веб проверен вживую на эмуляторе.

## Global Constraints

- Ветка `stage-0-data-contract-v2`, в `main` не коммитить. Ничего не деплоить: `firebase deploy` из ветки блокирует `scripts/stage0-deploy-guard.js` до подплана 0.7; `npm run deploy` (gh-pages) из ветки не запускать.
- `main` влит в ветку перед этим планом (`fa945e7`: v0.1.44 с исправлением окна правки `1393d48`; #94 `44673dc` уже был в ветке). Если перед исполнением `main` снова ушёл вперёд — влить его до задачи 1. В `package.json` конфликтует только `"version"`: взять значение из `main`; корневой `package-lock.json` не разрешать через `git checkout --theirs` (выбросит записи `@firebase/rules-unit-testing`). После слияния — `npm ci --legacy-peer-deps`, `npm --prefix functions ci`, `npm run verify`.
- В свежем worktree сначала `npm ci --legacy-peer-deps` и `npm --prefix functions ci`. Новых npm-зависимостей план не добавляет (`firebase/installations` входит в пакет `firebase`). После любой npm-команды смотреть `git diff package.json`: npm умеет переписать `react`/`react-dom` на `>=16.8.0`.
- Запись в Firestore — только так, как разрешают правила 0.2 (спецификация, раздел 3 «Общие правила», 3.3, 9.1, 10):
  - создание — все поля документа, `createdAt`/`updatedAt` = `serverTimestamp()`; исходное время (перенос и импорт, подплан 0.6) — через `restoredTaskData`, не позже текущего;
  - изменение — `updateDoc` только изменённых полей вместе с `updatedAt: serverTimestamp()`; `setDoc` поверх существующего документа не делается никогда (правила его отклоняют);
  - новая задача — `overdueAt: null` и без `nextNotifyAt`; при изменениях оба поля не трогаются;
  - корзина — `{ status: 'deleted', deletedAt: serverTimestamp() }`, восстановление — `{ status: 'active', deletedAt: null }`, удаление навсегда — `deleteDoc`;
  - настройки — по отдельным полям `settings.<поле>`;
  - устройство: документ есть — `updateDoc` с новым `fcmToken` и `updatedAt` (переключатель не трогается), нет — `setDoc` со всеми полями и `notificationsEnabled: true`; при выходе — `deleteDoc` до `signOut`.
- Модули `src/services/data/*` получают `db` и `uid` аргументами и не импортируют `src/firebase.js`: интерфейс передаёт им `db` из `src/firebase.js` и `uid` вошедшего пользователя, тесты — клиентов эмулятора. Документы читаются с `{ serverTimestamps: 'estimate' }`, поэтому у только что записанной задачи `createdAt` и `updatedAt` не `null`.
- Внутренние имена интерфейса (`tagId`, `dueDate`, `notifications`, `recurrence`, «bubble») не переименовываются (спецификация 8.1). **Решение владельца (2026-10-15):** до 0.5 старые окна предлагают минуты и форматированный текст, и `bubbleModel.js` пишет их значения по правилам переноса 9.2: напоминание — вверх до целого часа (минимум 60 минут), повтор `minutes` → `hours` с `every = ceil(every / 60)`, `monthDay` — из `due.local`. Описание хранится исходником Markdown: простой текст — как набран, форматированный — через `htmlToMarkdown`. Режим «простой/форматированный» в задаче больше не хранится.
- Срок показывается во времени устройства (`dueDate` — местная строка устройства). При правке задачи без изменения момента срока `due` и его `tz` не трогаются; изменённый срок пишется с зоной устройства и с `monthDay` нового срока (спецификация 4.2).
- «Просрочено» в вебе считается по сроку (`due`), не по `overdueAt`: сервер может поставить `overdueAt` с опозданием до 10 минут (отчёт подплана 0.3).
- **Решение владельца:** «Готово» (спецификация 4.1) у задачи без повтора — `status: 'done'`, а `due`, `reminders` и `repeat` остаются историей; у повторяющейся — новый `due` по 4.3, задача остаётся активной и не «лопается». Кнопка «Завершить серию» появится в 0.5, данные для неё (`finishSeries`) — в этом плане.
- Удаление категории — `deleteDoc` через 7 секунд; `categoryId` у её задач убирает сервер (`onCategoryDeleted`), а до этого задача с несуществующей категорией показывается как «без категории» (спецификация 3.1, 4.5).
- **Решение владельца:** импорт и экспорт v1 удаляются, их пункты меню скрываются до 0.6 (там появится бэкап v2). Бэкап перед переездом делается в текущей версии прода (спецификация 9.3).
- Веб открывает задачу и по `?taskId=`, и по старому `?bubbleId=` (спецификация 4.4) — это делает этот план. Сервис-воркер уже понимает формат сообщения из 0.3 (`data.url`, `data.title`, `data.body`).
- Переключатель «получать напоминания здесь» в окне настроек — интерфейс подплана 0.5; данные для него (`thisDeviceId`, `subscribeDevice`, `setDeviceNotificationsEnabled`) — здесь.
- Эмуляторы: Firestore — порт 8180, Auth — 9099, проект `demo-to-round`. `npm run test:rules` гоняет все `firestore-tests/**/*.test.js`: правила 0.2 (`*.rules.test.js`) и слой данных (`*.data.test.js`). Тесты эмулятора с React пишутся без JSX (`createElement`) и с `// @vitest-environment happy-dom`. Если `firebase emulators:exec` упал на занятом порту, подождать и повторить; осиротевший эмулятор своего упавшего запуска остановить (свой ли он — по `readlink /proc/<pid>/cwd`).
- Корневой `npm test` не собирает `firestore-tests/**`, `functions/**`, `.claude/**` (`vite.config.js`).
- Синтаксис ES2020, 4 пробела, одинарные кавычки, точки с запятой. В линтере `no-unused-vars` выключен: неиспользуемые импорты и переменные, которые оставляет правка, проверять глазами и удалять.
- Числа тестов до плана (после слияния `fa945e7`): веб — 476 (33 файла), функции — 47 + 34, правила — 88 (5 файлов). Функции план не меняет.
- Код в плане взят из проверенной черновой копии без правок. Новые файлы и файлы «замена целиком» даны полностью; остальные изменения — блоками `diff` относительно состояния после предыдущей задачи. Такой блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория или внести те же строки руками.
- Каждая задача заканчивается зелёными тестами своих файлов, полным `npm test` и `npm run lint`; задачи с эмулятором — ещё `npm run test:rules`. Последняя задача — `npm run verify` и проверка вживую на эмуляторе.

## Review Focus

- **Сохранение задачи, которую другое устройство уже удалило** (окно правки открыто в одной вкладке, задача удалена в другой): «Сохранить» не воскрешает задачу — правила отклоняют запись, данные не меняются. Тест «fails instead of bringing back a task deleted on another device» — в задаче 3.
- **Два устройства или один обработчик меняют разные настройки одновременно:** ни одно изменение не теряется. Тесты «lets two devices change different settings without overwriting each other» — в задаче 4, «keeps both changes when one handler changes the categories and "no category" together» — в задаче 10.
- **Пользователь правит задачу на устройстве в другом часовом поясе и не трогает срок:** срок и его зона остаются прежними, а изменённый срок пишется в зоне устройства. Тесты «keeps the due and its zone when the user did not change the time on a device in another zone» и «writes a changed due in the zone of this device and lets a muted task pulse again» — в задаче 5.
- **Месячная задача на 31-е после «Готово» перенесена на 28 февраля, потом пользователь меняет её название:** `monthDay` остаётся 31, и следующий срок снова будет 31 марта. Тест «keeps the month day of a monthly task that "Done" moved into a shorter month» — в задаче 5.
- **Первый запуск новой версии без сети** (документа `users/{uid}` ещё нет и создать его нельзя): приложение открывается с настройками этого браузера, а не висит на экране загрузки. Тест «falls back to this browser's settings when the document cannot be read or created (first start offline)» — в задаче 10.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `.env.emulator` | демо-конфиг Firebase для `npm run start:emulator` (в git, без секретов) |
| `src/firebase.js`, `firebase.json`, `package.json` | (изменение) подключение к эмуляторам Auth и Firestore, скрипт `start:emulator` |
| `src/services/data/convert.js` | документ Firestore ↔ запись в форме бэкапа, время сервера при записи |
| `src/services/data/tasks.js` | задачи: изменения по одному, создание, частичные изменения, корзина, «Готово» |
| `src/services/data/categories.js` | категории: список по `order`, создание, перестановка одной записью |
| `src/services/data/settings.js` | документ пользователя: подписка, создание, настройки по полям |
| `src/services/data/devices.js` | устройства: регистрация, переключатель, удаление |
| `src/services/data/bubbleModel.js` | переходный мост «задача v2 ↔ поля старых окон» (до 0.5) |
| `src/contract/migrateV1.js` | (изменение) экспорт правил 9.2 для напоминаний и повтора |
| `src/utils/taskSync.js` | изменения задач → список пузырей, по одному (#94) |
| `src/hooks/useMatterEngine.js` | (изменение) холст на подписке `subscribeTasks` |
| `src/utils/deepLink.js` | id задачи из `?taskId=` или `?bubbleId=` |
| `src/hooks/useBubbleCrud.js`, `src/components/TaskList.jsx`, `src/components/ListViewDrawer.jsx` | (изменение) запись задач через слой данных |
| `src/hooks/useTags.js` | (изменение) категории как документы v2 |
| `src/utils/bubbleStatus.js` | статусы задач для интерфейса (вместо удаляемого `firestoreService.js`) |
| `src/state/SettingsContext.js`, `src/state/SettingsStore.jsx` | настройки пользователя: контекст и подписка с созданием документа |
| `src/state/settingsView.js` | настройки v2 ↔ значения интерфейса |
| `src/state/BubblesUiStore.jsx` | (изменение) значения-настройки из Firestore с записью по полям |
| `src/utils/legacyLocalData.js` | удаление старых ключей localStorage после первого входа |
| `src/hooks/useThemeMode.js`, `src/i18n.js`, `src/App.jsx`, `src/components/LanguageSelector.jsx` | (изменение) тема и язык из настроек пользователя |
| `src/hooks/useBubbleFilters.js`, `src/hooks/useListFilters.js`, `src/pages/BubblesPage.jsx` | (изменение) фильтры и флаги без localStorage |
| `src/firebaseMessaging.js`, `src/services/authService.js`, `src/index.jsx` | (изменение) это устройство в `users/{uid}/devices` |
| `firestore-tests/*.data.test.js` | слой данных на эмуляторе с правилами; `canvasSync.data.test.js` — #94 с двумя клиентами |
| удаляются | `src/services/firestoreService.js`, `src/hooks/useBubbleImportExport.js`, `src/utils/bubbleJson.js`, `src/utils/exportJson.js`, `src/utils/bubbleData.js` (с их тестами), `src/services/buildStatusFields.test.js` |
| `CLAUDE.md`, `README.md`, `docs/firebase.md`, `docs/i18n.md`, `docs/notifications.md` | (изменение) модель данных v2 и работа веба |

Ссылки на старые коллекции (`user-bubbles`, `user-tags`, `user-fcm-tokens`) после плана остаются только в правилах (чтение для переноса и отката) и в документации.

---

### Task 1: Веб на эмуляторе

**Files:**
- Create: `.env.emulator`
- Test: `src/firebase.test.js`
- Modify: `src/firebase.js`, `firebase.json` (Auth-эмулятор), `package.json` (скрипт `start:emulator`), `docs/firebase.md`

**Interfaces:**
- Consumes: эмулятор Firestore из 0.2 (порт 8180, проект `demo-to-round`).
- Produces: `npm run start:emulator` — эмуляторы Auth (9099) и Firestore (8180) и dev-сервер Vite в режиме `emulator`. `src/firebase.js` подключает SDK к эмуляторам, только если `REACT_APP_FIREBASE_EMULATORS === 'true'`. Этим пользуются проверки вживую в 0.4–0.6, в том числе репетиция переноса в 0.6.

- [ ] **Step 1: Написать падающий тест `src/firebase.test.js`**

`src/firebase.js` работает в момент импорта, поэтому тест импортирует его заново с нужными переменными окружения, а SDK подменяет.

````js
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 'app' })) }));
vi.mock('firebase/firestore', () => ({
    initializeFirestore: vi.fn(() => ({ name: 'db' })),
    persistentLocalCache: vi.fn(() => ({})),
    persistentMultipleTabManager: vi.fn(() => ({})),
    connectFirestoreEmulator: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ name: 'auth' })),
    connectAuthEmulator: vi.fn(),
}));

const CONFIG = {
    REACT_APP_FIREBASE_API_KEY: 'key',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'domain',
    REACT_APP_FIREBASE_PROJECT_ID: 'project',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'bucket',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: 'sender',
    REACT_APP_FIREBASE_APP_ID: 'app-id',
};

// src/firebase.js does its work at import time: import it afresh with the given env.
const importFirebase = async (env) => {
    vi.resetModules();
    Object.entries({ ...CONFIG, ...env }).forEach(([key, value]) => vi.stubEnv(key, value));
    await import('./firebase');
    const { connectFirestoreEmulator } = await import('firebase/firestore');
    const { connectAuthEmulator } = await import('firebase/auth');
    return { connectFirestoreEmulator, connectAuthEmulator };
};

afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
});

describe('src/firebase', () => {
    it('talks to the real Firebase project unless emulator mode is on', async () => {
        const { connectFirestoreEmulator, connectAuthEmulator } = await importFirebase({ REACT_APP_FIREBASE_EMULATORS: 'false' });
        expect(connectFirestoreEmulator).not.toHaveBeenCalled();
        expect(connectAuthEmulator).not.toHaveBeenCalled();
    });

    it('connects Firestore and Auth to the local emulators in emulator mode', async () => {
        const { connectFirestoreEmulator, connectAuthEmulator } = await importFirebase({ REACT_APP_FIREBASE_EMULATORS: 'true' });
        expect(connectFirestoreEmulator).toHaveBeenCalledWith({ name: 'db' }, '127.0.0.1', 8180);
        expect(connectAuthEmulator).toHaveBeenCalledWith({ name: 'auth' }, 'http://127.0.0.1:9099', { disableWarnings: true });
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/firebase.test.js`
Expected: FAIL — `Tests  1 failed | 1 passed (2)`; во втором тесте `AssertionError: expected "vi.fn()" to be called with arguments: [ { name: 'db' }, '127.0.0.1', 8180 ]`.

- [ ] **Step 3: Подключение к эмуляторам в `src/firebase.js`**

````diff
diff --git a/src/firebase.js b/src/firebase.js
index fb2b1de..49d4ddf 100644
--- a/src/firebase.js
+++ b/src/firebase.js
@@ -1,7 +1,7 @@
 // Import the functions you need from the SDKs you need
 import { initializeApp } from 'firebase/app';
-import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
-import { getAuth } from 'firebase/auth';
+import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
+import { connectAuthEmulator, getAuth } from 'firebase/auth';
 import { config, validateConfig } from './utils/config';
 
 // Validate Firebase configuration
@@ -34,4 +34,11 @@ export const db = initializeFirestore(app, {
 // Initialize Firebase Authentication and get a reference to the service
 export const auth = getAuth(app);
 
+// `npm run start:emulator` (.env.emulator): the local Auth and Firestore emulators
+// from firebase.json instead of the real project.
+if (import.meta.env.REACT_APP_FIREBASE_EMULATORS === 'true') {
+    connectFirestoreEmulator(db, '127.0.0.1', 8180);
+    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
+}
+
 export default app; 
\ No newline at end of file
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/firebase.test.js`
Expected: PASS — `Tests  2 passed (2)`.

- [ ] **Step 5: Создать `.env.emulator`**

Файл попадает в git: в нём только демо-значения, проект с префиксом `demo-` к настоящему Firebase не обращается. Vite в режиме `emulator` читает его поверх `.env`.

````
# `npm run start:emulator`: the web app against the local Auth and Firestore emulators.
# Demo values only (the "demo-" project never reaches real Firebase); Vite reads this file
# in `--mode emulator` on top of .env.
REACT_APP_FIREBASE_EMULATORS=true
REACT_APP_FIREBASE_API_KEY=demo-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=demo-to-round.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=demo-to-round
REACT_APP_FIREBASE_STORAGE_BUCKET=demo-to-round.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=000000000000
REACT_APP_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
REACT_APP_FIREBASE_MEASUREMENT_ID=
REACT_APP_FIREBASE_VAPID_KEY=
````

- [ ] **Step 6: Auth-эмулятор и скрипт запуска**

````diff
diff --git a/firebase.json b/firebase.json
index e6ab34e..c95a575 100644
--- a/firebase.json
+++ b/firebase.json
@@ -24,6 +24,9 @@
         ]
     },
     "emulators": {
+        "auth": {
+            "port": 9099
+        },
         "firestore": {
             "port": 8180
         },
````

````diff
diff --git a/package.json b/package.json
index 0c265fd..f364b09 100644
--- a/package.json
+++ b/package.json
@@ -6,6 +6,7 @@
   "main": "src/pages/BubblesPage.jsx",
   "scripts": {
     "start": "npm run generate-sw && vite",
+    "start:emulator": "npm run generate-sw && firebase emulators:exec --only auth,firestore --project demo-to-round \"vite --mode emulator\"",
     "build": "npm run generate-sw && vite build",
     "preview": "vite preview",
     "test": "vitest run --passWithNoTests",
````

- [ ] **Step 7: Описать запуск в `docs/firebase.md`**

Добавить в конец файла:

````diff
diff --git a/docs/firebase.md b/docs/firebase.md
index b37704a..bf2f71a 100644
--- a/docs/firebase.md
+++ b/docs/firebase.md
@@ -118,3 +118,16 @@ firebase emulators:start --only functions,firestore
 Для Firestore-эмулятора нужна Java 21+; порт — 8180 (задан в `firebase.json`). Эмулятор использует те же `firestore.rules` и
 `firestore.indexes.json`. Нюансы запуска функций в эмуляторе —
 в [notifications.md → Локальный эмулятор](notifications.md#локальный-эмулятор).
+
+### Веб на эмуляторе
+
+```bash
+npm run start:emulator
+```
+
+Поднимает эмуляторы Auth (порт 9099) и Firestore (8180) для проекта `demo-to-round` и запускает
+dev-сервер в режиме `emulator`: Vite берёт `.env.emulator` (демо-значения, в git), а
+`src/firebase.js` при `REACT_APP_FIREBASE_EMULATORS=true` подключает SDK к эмуляторам вместо
+настоящего проекта. Аккаунт заводится прямо в форме входа и живёт только в эмуляторе; данные
+пропадают при остановке (Ctrl+C). Push-уведомления на эмуляторе не работают: у демо-проекта нет
+FCM, поэтому устройство регистрируется без токена.
````

- [ ] **Step 8: Проверить запуск**

Run: `ss -ltn | grep -E ':(3000|8180|9099|9150)\b' || echo free`, затем `timeout 45 npm run start:emulator; echo "exit=$?"`, затем снова `ss -ltn | grep -E ':(3000|8180|9099|9150)\b' || echo free`
Expected: первая и третья команды печатают `free`. В выводе запуска есть строки `✔  firestore: Firestore Emulator was started`, `Running script: vite --mode emulator`, `VITE v8.… emulator ready in …` и `➜  Local:   http://localhost:3000/to-round-react/`; через 45 секунд `timeout` всё останавливает (`exit=124`). Если порт занят чужим процессом, подождать и повторить.

- [ ] **Step 9: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  34 passed (34)`, `Tests  478 passed (478)`; линтер без ошибок.

- [ ] **Step 10: Commit**

```bash
git add .env.emulator src/firebase.js src/firebase.test.js firebase.json package.json docs/firebase.md
git commit -F - <<'EOF'
feat(web): run the web app against the Auth and Firestore emulators

npm run start:emulator starts both emulators for demo-to-round and Vite in
emulator mode; src/firebase.js connects to them only when
REACT_APP_FIREBASE_EMULATORS is true (.env.emulator, demo values only).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Документ Firestore ↔ форма бэкапа

**Files:**
- Create: `src/services/data/convert.js`
- Test: `src/services/data/convert.test.js`

**Interfaces:**
- Consumes: `SCHEMA_VERSION`, `SETTINGS_KEYS`, `createDefaultSettings` из `src/contract/schema.js`; примеры `contract/fixtures/{tasks,categories,settings,devices}.json` (план 0.1); `validateTask`, `validateCategory`, `validateSettings` из `src/contract/validate.js`.
- Produces (`src/services/data/convert.js`) — для задач 3–4 и подпланов 0.5, 0.6:
  - `isoFromTimestamp(ts | null): string | null`, `timestampFromIso(iso): Timestamp` (бросает `Error('not an ISO time: …')`);
  - `taskFromDoc(id, data): task` — задача в форме бэкапа `{ id, title, description, categoryId, status, due, reminders, repeat, radius, pulseMuted, createdAt, updatedAt, deletedAt }` без служебных полей;
  - `newTaskData({ title, description, categoryId, due, reminders, repeat, radius })` — новая задача: `schemaVersion: 2`, `status: 'active'`, `pulseMuted: false`, `overdueAt: null`, `deletedAt: null`, время сервера, без `nextNotifyAt`;
  - `restoredTaskData(task)` — задача в форме бэкапа с исходным временем (перенос и импорт, 0.6);
  - `taskUpdateData(changes)` — частичное изменение с `updatedAt` сервера; бросает `Error('not a client field of a task: <поле>')` для `overdueAt`, `nextNotifyAt`, `createdAt`, `updatedAt`, `schemaVersion`, `id`;
  - `categoryFromDoc(id, data) → { id, name, color, order }`, `newCategoryData({ name, color, order })`, `categoryUpdateData(changes)` (только `name`, `color`, `order`);
  - `settingsFromUserDoc(data, deviceLanguage?)` — полные настройки, недостающие поля — по умолчанию; `newUserDocData(settings)`; `settingsUpdateData(changes)` → `{ 'settings.<поле>': значение, updatedAt }`, бросает `Error('not a setting: <поле>')`;
  - `deviceFromDoc(id, data)`, `newDeviceData({ platform, fcmToken })` (`notificationsEnabled: true`), `deviceUpdateData(changes)` (только `fcmToken`, `notificationsEnabled`).

- [ ] **Step 1: Написать падающий тест `src/services/data/convert.test.js`**

Задачи из `contract/fixtures/tasks.json` проходят круг «форма бэкапа → документ → форма бэкапа». Среди примеров есть время с микро- и наносекундами (так пишет Android), а JS `Date` хранит миллисекунды, поэтому время сравнивается как один момент с точностью до миллисекунды.

````js
import { describe, expect, it } from 'vitest';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import taskFixtures from '../../../contract/fixtures/tasks.json';
import categoryFixtures from '../../../contract/fixtures/categories.json';
import settingsFixtures from '../../../contract/fixtures/settings.json';
import deviceFixtures from '../../../contract/fixtures/devices.json';
import { validateCategory, validateSettings, validateTask } from '../../contract/validate';
import {
    categoryFromDoc, categoryUpdateData, deviceFromDoc, deviceUpdateData, isoFromTimestamp, newCategoryData,
    newDeviceData, newTaskData, newUserDocData, restoredTaskData, settingsFromUserDoc, settingsUpdateData,
    taskFromDoc, taskUpdateData, timestampFromIso,
} from './convert';

const isServerTime = (value) => serverTimestamp().isEqual(value);
// Firestore keeps nanoseconds, a JS Date milliseconds: compare times as moments to the millisecond.
const sameMoment = (a, b) => (a === null || b === null ? a === b : Date.parse(a) === Date.parse(b));
const withoutTimes = ({ createdAt, updatedAt, deletedAt, ...rest }) => rest;

const TASK_FIELDS = {
    title: 'Pay bills',
    description: '- [ ] power',
    categoryId: 'c1',
    due: { local: '2026-10-15T09:00', tz: 'Europe/Kyiv' },
    reminders: [60],
    repeat: { every: 1, unit: 'months', monthDay: 15 },
    radius: 45,
};

describe('times', () => {
    it('turns an ISO string into a Timestamp and back', () => {
        const ts = timestampFromIso('2026-10-01T08:00:00.123Z');
        expect(ts).toBeInstanceOf(Timestamp);
        expect(isoFromTimestamp(ts)).toBe('2026-10-01T08:00:00.123Z');
        expect(isoFromTimestamp(null)).toBeNull();
    });

    it('rejects a time that is not ISO', () => {
        expect(() => timestampFromIso('yesterday')).toThrow('not an ISO time: yesterday');
    });
});

describe('tasks', () => {
    it.each(taskFixtures.valid)('reads back $name as the same backup-form record', ({ value }) => {
        const back = taskFromDoc(value.id, restoredTaskData(value));
        expect(validateTask(back)).toEqual([]);
        expect(withoutTimes(back)).toEqual(withoutTimes(value));
        ['createdAt', 'updatedAt', 'deletedAt'].forEach((key) => expect(sameMoment(back[key], value[key])).toBe(true));
    });

    it('writes a restored task as a v2 document with its original times', () => {
        const value = taskFixtures.valid.find((f) => f.name === 'deleted-with-deleted-at').value;
        const data = restoredTaskData(value);
        expect(data).toMatchObject({ schemaVersion: 2, overdueAt: null, status: 'deleted' });
        expect(data).not.toHaveProperty('id');
        expect(data).not.toHaveProperty('nextNotifyAt');
        expect(data.createdAt.toMillis()).toBe(Date.parse(value.createdAt));
        expect(data.deletedAt.toMillis()).toBe(Date.parse(value.deletedAt));
    });

    it('creates a new task as active, with server times and without server-owned schedule fields', () => {
        const data = newTaskData(TASK_FIELDS);
        expect(data).toMatchObject({
            ...TASK_FIELDS, schemaVersion: 2, status: 'active', pulseMuted: false, overdueAt: null, deletedAt: null,
        });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
        expect(data).not.toHaveProperty('nextNotifyAt');
    });

    it('drops server-owned fields when reading a document', () => {
        const data = {
            ...restoredTaskData({ id: 't1', ...TASK_FIELDS, status: 'active', pulseMuted: false,
                createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z', deletedAt: null }),
            overdueAt: Timestamp.fromMillis(0),
            nextNotifyAt: Timestamp.fromMillis(0),
        };
        expect(Object.keys(taskFromDoc('t1', data)).sort()).toEqual(['categoryId', 'createdAt', 'deletedAt', 'description',
            'due', 'id', 'pulseMuted', 'radius', 'reminders', 'repeat', 'status', 'title', 'updatedAt']);
    });

    it('stamps every update with the server time', () => {
        const data = taskUpdateData({ title: 'Renamed', deletedAt: null });
        expect(data).toMatchObject({ title: 'Renamed', deletedAt: null });
        expect(isServerTime(data.updatedAt)).toBe(true);
    });

    it.each(['overdueAt', 'nextNotifyAt', 'createdAt', 'updatedAt', 'schemaVersion', 'id'])(
        'refuses to update the field %s, which the client does not own',
        (key) => {
            expect(() => taskUpdateData({ [key]: null })).toThrow(`not a client field of a task: ${key}`);
        },
    );
});

describe('categories', () => {
    it.each(categoryFixtures.valid)('reads back $name', ({ value }) => {
        const back = categoryFromDoc(value.id, newCategoryData(value));
        expect(back).toEqual(value);
        expect(validateCategory(back)).toEqual([]);
    });

    it('creates a category with schemaVersion and server times', () => {
        const data = newCategoryData({ name: 'Home', color: '#da3833', order: 3 });
        expect(data).toMatchObject({ schemaVersion: 2, name: 'Home', color: '#da3833', order: 3 });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('updates only name, colour and order, with the server time', () => {
        expect(isServerTime(categoryUpdateData({ order: 1.5 }).updatedAt)).toBe(true);
        expect(() => categoryUpdateData({ createdAt: null })).toThrow('not a client field of a category: createdAt');
    });
});

describe('settings', () => {
    it.each(settingsFixtures.valid)('reads $name from the user document', ({ value }) => {
        const settings = settingsFromUserDoc(newUserDocData(value), 'en');
        expect(settings).toEqual(value);
        expect(validateSettings(settings)).toEqual([]);
    });

    it('fills settings the document lacks with the defaults', () => {
        expect(settingsFromUserDoc({ settings: { themeMode: 'dark' } }, 'uk-UA'))
            .toMatchObject({ themeMode: 'dark', language: 'uk', design: 'classic', labelFontSize: 8 });
    });

    it('creates the user document with schemaVersion and server times', () => {
        const settings = settingsFixtures.valid[0].value;
        const data = newUserDocData(settings);
        expect(data).toMatchObject({ schemaVersion: 2, settings });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('writes each changed setting as its own field, so devices do not overwrite each other', () => {
        const data = settingsUpdateData({ themeMode: 'dark', listSort: { by: 'title', order: 'asc' } });
        expect(Object.keys(data).sort()).toEqual(['settings.listSort', 'settings.themeMode', 'updatedAt']);
        expect(data['settings.listSort']).toEqual({ by: 'title', order: 'asc' });
        expect(isServerTime(data.updatedAt)).toBe(true);
        expect(() => settingsUpdateData({ fabPosition: 1 })).toThrow('not a setting: fabPosition');
    });
});

describe('devices', () => {
    it.each(deviceFixtures.valid)('reads back $name', ({ value }) => {
        const { createdAt, updatedAt, ...fields } = value;
        const data = { ...fields, createdAt: timestampFromIso(createdAt), updatedAt: timestampFromIso(updatedAt) };
        delete data.id;
        expect(deviceFromDoc(value.id, data)).toEqual(value);
    });

    it('registers a new web device with notifications on and server times', () => {
        const data = newDeviceData({ platform: 'web', fcmToken: null });
        expect(data).toMatchObject({ platform: 'web', fcmToken: null, notificationsEnabled: true });
        expect(isServerTime(data.createdAt) && isServerTime(data.updatedAt)).toBe(true);
    });

    it('updates only the token and the switch, with the server time', () => {
        expect(isServerTime(deviceUpdateData({ fcmToken: 'token' }).updatedAt)).toBe(true);
        expect(() => deviceUpdateData({ platform: 'android' })).toThrow('not a client field of a device: platform');
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/services/data/convert.test.js`
Expected: FAIL — `Error: Cannot find module './convert' imported from …/src/services/data/convert.test.js`, `Tests  no tests`.

- [ ] **Step 3: Написать `src/services/data/convert.js`**

````js
/**
 * Firestore documents <-> backup-form records of data contract v2.
 * Backup form (spec section 10): the id is a field, times are ISO strings, no schemaVersion and
 * no server-owned fields (overdueAt, nextNotifyAt). Writes follow spec section 3: a new document
 * gets createdAt/updatedAt = serverTimestamp(), a restored one (migration and import, sub-plan 0.6)
 * keeps its original times, and every update is partial and stamps updatedAt with the server time.
 */
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { SCHEMA_VERSION, SETTINGS_KEYS, createDefaultSettings } from '../../contract/schema';

const TASK_CLIENT_FIELDS = ['title', 'description', 'categoryId', 'status', 'due', 'reminders', 'repeat',
    'radius', 'pulseMuted', 'deletedAt'];
const CATEGORY_CLIENT_FIELDS = ['name', 'color', 'order'];
const DEVICE_CLIENT_FIELDS = ['fcmToken', 'notificationsEnabled'];

/** Firestore Timestamp (or null) -> ISO string (or null), to the millisecond. */
export const isoFromTimestamp = (value) => (value === null || value === undefined ? null : value.toDate().toISOString());

/** ISO string -> Firestore Timestamp. */
export const timestampFromIso = (iso) => {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) throw new Error(`not an ISO time: ${iso}`);
    return Timestamp.fromMillis(ms);
};

const assertFields = (changes, allowed, kind) => {
    Object.keys(changes).forEach((key) => {
        if (!allowed.includes(key)) throw new Error(`not a client field of a ${kind}: ${key}`);
    });
};

// ---------- tasks: users/{uid}/tasks/{taskId} ----------

/** Task document -> backup-form task. Read with { serverTimestamps: 'estimate' } so pending times are set. */
export const taskFromDoc = (id, data) => ({
    id,
    title: data.title,
    description: data.description,
    categoryId: data.categoryId,
    status: data.status,
    due: data.due,
    reminders: data.reminders,
    repeat: data.repeat,
    radius: data.radius,
    pulseMuted: data.pulseMuted,
    createdAt: isoFromTimestamp(data.createdAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
    deletedAt: isoFromTimestamp(data.deletedAt),
});

/** A task the user creates now (spec 4.1). fields = { title, description, categoryId, due, reminders, repeat, radius }. */
export const newTaskData = ({ title, description, categoryId, due, reminders, repeat, radius }) => ({
    schemaVersion: SCHEMA_VERSION,
    title,
    description,
    categoryId,
    status: 'active',
    due,
    reminders,
    repeat,
    radius,
    pulseMuted: false,
    overdueAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    deletedAt: null,
});

/** A backup-form task written back with its original times (migration and import). */
export const restoredTaskData = ({ id, createdAt, updatedAt, deletedAt, ...fields }) => ({
    schemaVersion: SCHEMA_VERSION,
    ...fields,
    overdueAt: null,
    createdAt: timestampFromIso(createdAt),
    updatedAt: timestampFromIso(updatedAt),
    deletedAt: deletedAt === null ? null : timestampFromIso(deletedAt),
});

/** Partial task update: only client fields, always with the server updatedAt. */
export const taskUpdateData = (changes) => {
    assertFields(changes, TASK_CLIENT_FIELDS, 'task');
    return { ...changes, updatedAt: serverTimestamp() };
};

// ---------- categories: users/{uid}/categories/{categoryId} ----------

export const categoryFromDoc = (id, data) => ({ id, name: data.name, color: data.color, order: data.order });

export const newCategoryData = ({ name, color, order }) => ({
    schemaVersion: SCHEMA_VERSION,
    name,
    color,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

export const categoryUpdateData = (changes) => {
    assertFields(changes, CATEGORY_CLIENT_FIELDS, 'category');
    return { ...changes, updatedAt: serverTimestamp() };
};

// ---------- settings: users/{uid}.settings ----------

/** User document -> complete settings; a missing field gets its default (spec 3.5). */
export const settingsFromUserDoc = (data, deviceLanguage) => ({
    ...createDefaultSettings(deviceLanguage),
    ...(data && data.settings),
});

export const newUserDocData = (settings) => ({
    schemaVersion: SCHEMA_VERSION,
    settings,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

/** Each changed setting is written as its own field path, so two devices do not overwrite each other. */
export const settingsUpdateData = (changes) => {
    const data = { updatedAt: serverTimestamp() };
    Object.keys(changes).forEach((key) => {
        if (!SETTINGS_KEYS.includes(key)) throw new Error(`not a setting: ${key}`);
        data[`settings.${key}`] = changes[key];
    });
    return data;
};

// ---------- devices: users/{uid}/devices/{deviceId} ----------

export const deviceFromDoc = (id, data) => ({
    id,
    platform: data.platform,
    fcmToken: data.fcmToken,
    notificationsEnabled: data.notificationsEnabled,
    createdAt: isoFromTimestamp(data.createdAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
});

/** A device registering for the first time: notifications on (spec 3.3). */
export const newDeviceData = ({ platform, fcmToken }) => ({
    platform,
    fcmToken,
    notificationsEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
});

export const deviceUpdateData = (changes) => {
    assertFields(changes, DEVICE_CLIENT_FIELDS, 'device');
    return { ...changes, updatedAt: serverTimestamp() };
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/services/data/convert.test.js`
Expected: PASS — `Tests  32 passed (32)`.

- [ ] **Step 5: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  35 passed (35)`, `Tests  510 passed (510)`; линтер без ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/services/data/convert.js src/services/data/convert.test.js
git commit -F - <<'EOF'
feat(data): convert Firestore documents to backup-form records and back

Timestamps <-> ISO strings, schemaVersion, server times on create and on
every partial update; client writes cannot touch the server-owned fields.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Хранилища задач и категорий

**Files:**
- Create: `src/services/data/tasks.js`, `src/services/data/categories.js`
- Test: `src/services/data/tasks.test.js`, `src/services/data/categories.test.js` (чистые функции), `firestore-tests/tasks.data.test.js`, `firestore-tests/categories.data.test.js` (эмулятор с правилами)

**Interfaces:**
- Consumes: `newTaskData`, `taskFromDoc`, `taskUpdateData`, `categoryFromDoc`, `newCategoryData`, `categoryUpdateData` (задача 2); `nextFutureOccurrence(local, tz, repeat, now)` из `src/contract/recurrence.js`; стенд `firestore-tests/helpers.js` из 0.2 (`OWNER`, `PAST`, `baseTask`, `seed`, `setupRulesEnv`).
- Produces (`src/services/data/tasks.js`):
  - `completionChanges(task, now): changes` — «Готово» по 4.1: `{ status: 'done' }` или `{ due: { local, tz } }` со следующим сроком (и `pulseMuted: false`, если пульсация была выключена);
  - `newTaskId(db, uid): string`; `createTask(db, uid, id, fields)`; `updateTask(db, uid, id, changes)`;
  - `trashTask(db, uid, id)`, `restoreTask(db, uid, id)`, `deleteTaskForever(db, uid, id)`, `completeTask(db, uid, task, now?)`, `finishSeries(db, uid, id)`, `muteTaskPulse(db, uid, id)` — все возвращают промис записи;
  - `subscribeTasks(db, uid, onChanges, onError): unsubscribe`, где `onChanges([{ type: 'added' | 'modified' | 'removed', task }], { initial })`; первая доставка подписки — `initial: true` и все задачи как `added`.
- Produces (`src/services/data/categories.js`):
  - `sortCategories(list)`, `nextCategoryOrder(list): number`, `planCategoryOrder(reordered): [{ id, order }]`;
  - `subscribeCategories(db, uid, onList, onError)` — список `{ id, name, color, order }` по `order`;
  - `newCategoryId(db, uid)`, `createCategory(db, uid, id, { name, color, order })`, `updateCategory(db, uid, id, changes)`, `deleteCategory(db, uid, id)`, `reorderCategories(db, uid, reordered)` (одна запись или пачка с перенумерацией).

- [ ] **Step 1: Написать падающие юнит-тесты чистых функций**

`src/services/data/tasks.test.js`:

````js
import { describe, expect, it } from 'vitest';
import { completionChanges } from './tasks';

const task = (overrides) => ({
    id: 't1',
    title: 'Water plants',
    description: '',
    categoryId: null,
    status: 'active',
    due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' },
    reminders: [60],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});
const NOW = new Date('2026-10-14T10:00:00.000Z');

describe('completionChanges ("Done", spec 4.1)', () => {
    it('finishes a one-off task and keeps its due, reminders and repeat as history', () => {
        expect(completionChanges(task(), NOW)).toEqual({ status: 'done' });
    });

    it('moves a repeating task to its first due after now and keeps it active', () => {
        expect(completionChanges(task({ repeat: { every: 1, unit: 'days' } }), NOW))
            .toEqual({ due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
    });

    it('keeps the zone and the day of month of a monthly task', () => {
        const monthly = task({
            due: { local: '2026-01-31T09:00', tz: 'America/New_York' },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        });
        expect(completionChanges(monthly, new Date('2026-02-01T00:00:00.000Z')))
            .toEqual({ due: { local: '2026-02-28T09:00', tz: 'America/New_York' } });
    });

    it('lets a muted repeating task pulse again at its next due', () => {
        expect(completionChanges(task({ repeat: { every: 1, unit: 'weeks' }, pulseMuted: true }), NOW))
            .toEqual({ due: { local: '2026-10-17T09:00', tz: 'Europe/Berlin' }, pulseMuted: false });
    });
});
````

`src/services/data/categories.test.js` — перестановка по спецификации 4.5: перенесённая категория получает `order` между соседями, а при совпавших соседях (или когда между ними не помещается число) перенумеровываются все:

````js
import { describe, expect, it } from 'vitest';
import { nextCategoryOrder, planCategoryOrder, sortCategories } from './categories';

const cat = (id, order) => ({ id, name: id.toUpperCase(), color: '#da3833', order });

describe('nextCategoryOrder (spec 4.5)', () => {
    it('puts a new category after the last one', () => {
        expect(nextCategoryOrder([])).toBe(1);
        expect(nextCategoryOrder([cat('a', 1), cat('b', 2.5)])).toBe(3.5);
    });
});

describe('sortCategories', () => {
    it('sorts by order, then by id so every device shows equal orders the same way', () => {
        expect(sortCategories([cat('c', 2), cat('b', 1), cat('a', 2)]).map((c) => c.id)).toEqual(['b', 'a', 'c']);
    });
});

describe('planCategoryOrder (spec 4.5)', () => {
    const a = cat('a', 1);
    const b = cat('b', 2);
    const c = cat('c', 3);

    it('writes nothing when the order did not change', () => {
        expect(planCategoryOrder([a, b, c])).toEqual([]);
    });

    it('gives only the moved category an order between its new neighbours', () => {
        expect(planCategoryOrder([a, c, b])).toEqual([{ id: 'c', order: 1.5 }]);
    });

    it('moves a category to the top or to the bottom', () => {
        expect(planCategoryOrder([c, a, b])).toEqual([{ id: 'c', order: 0 }]);
        expect(planCategoryOrder([b, c, a])).toEqual([{ id: 'a', order: 4 }]);
    });

    it('renumbers every category when the neighbours share an order', () => {
        expect(planCategoryOrder([cat('c', 2), cat('a', 1), cat('b', 1)]))
            .toEqual([{ id: 'c', order: 1 }, { id: 'a', order: 2 }, { id: 'b', order: 3 }]);
    });

    it('renumbers every category when no number fits between the neighbours', () => {
        const next = cat('n', 1 + Number.EPSILON);
        expect(planCategoryOrder([a, c, next]))
            .toEqual([{ id: 'a', order: 1 }, { id: 'c', order: 2 }, { id: 'n', order: 3 }]);
    });
});
````

- [ ] **Step 2: Написать падающие тесты на эмуляторе**

Каждая запись слоя данных проходит через настоящие `firestore.rules`. Каждый вызов `device()` — отдельный клиент, как вторая вкладка или второе устройство того же пользователя.

`firestore-tests/tasks.data.test.js`:

````js
/**
 * The web data layer for tasks (src/services/data/tasks.js) against the emulator with the
 * real firestore.rules: every write the app makes must be one the rules accept.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { OWNER, baseTask, seed, setupRulesEnv } from './helpers';
import {
    completeTask, createTask, deleteTaskForever, finishSeries, muteTaskPulse, newTaskId, restoreTask,
    subscribeTasks, trashTask, updateTask,
} from '../src/services/data/tasks';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

// Each call is a separate client, like a second tab or device of the same user.
const device = () => env.authenticatedContext(OWNER).firestore();
const readTask = async (id) => (await getDoc(doc(device(), `users/${OWNER}/tasks/${id}`))).data();

const FIELDS = {
    title: 'Water plants',
    description: '',
    categoryId: null,
    due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' },
    reminders: [60],
    repeat: null,
    radius: 45,
};

const created = async (fields = FIELDS) => {
    const db = device();
    const id = newTaskId(db, OWNER);
    await createTask(db, OWNER, id, fields);
    return { db, id };
};

describe('tasks data layer: writes the rules accept', () => {
    it('creates a task with server times, overdueAt null and no nextNotifyAt', async () => {
        const { id } = await created();
        const data = await readTask(id);
        expect(data).toMatchObject({ ...FIELDS, schemaVersion: 2, status: 'active', pulseMuted: false, overdueAt: null, deletedAt: null });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
        expect(data).not.toHaveProperty('nextNotifyAt');
    });

    it('updates only the changed fields and keeps the server-owned ones', async () => {
        const db = device();
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({
            due: FIELDS.due, reminders: [60], overdueAt: Timestamp.fromMillis(1000), nextNotifyAt: Timestamp.fromMillis(2000),
        }));
        await updateTask(db, OWNER, 't1', { title: 'Buy bread' });
        expect(await readTask('t1')).toMatchObject({
            title: 'Buy bread', due: FIELDS.due, overdueAt: Timestamp.fromMillis(1000), nextNotifyAt: Timestamp.fromMillis(2000),
        });
    });

    it('moves a task to the trash and restores it', async () => {
        const { db, id } = await created();
        await trashTask(db, OWNER, id);
        const trashed = await readTask(id);
        expect(trashed.status).toBe('deleted');
        expect(trashed.deletedAt).toBeInstanceOf(Timestamp);
        await restoreTask(db, OWNER, id);
        expect(await readTask(id)).toMatchObject({ status: 'active', deletedAt: null });
    });

    it('deletes a task forever', async () => {
        const { db, id } = await created();
        await deleteTaskForever(db, OWNER, id);
        expect(await readTask(id)).toBeUndefined();
    });

    it('finishes a one-off task with "Done" and keeps its due as history', async () => {
        const { db, id } = await created();
        await completeTask(db, OWNER, { id, ...FIELDS, pulseMuted: false }, new Date('2026-10-14T10:00:00.000Z'));
        expect(await readTask(id)).toMatchObject({ status: 'done', due: FIELDS.due, reminders: [60] });
    });

    it('moves a repeating task to its next due with "Done", and "Finish series" ends it', async () => {
        const repeating = { ...FIELDS, repeat: { every: 1, unit: 'days' } };
        const { db, id } = await created(repeating);
        await completeTask(db, OWNER, { id, ...repeating, pulseMuted: false }, new Date('2026-10-14T10:00:00.000Z'));
        expect(await readTask(id)).toMatchObject({ status: 'active', due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        await finishSeries(db, OWNER, id);
        expect(await readTask(id)).toMatchObject({ status: 'done', repeat: { every: 1, unit: 'days' } });
    });

    it('stops the pulse of an overdue task', async () => {
        const { db, id } = await created();
        await muteTaskPulse(db, OWNER, id);
        expect((await readTask(id)).pulseMuted).toBe(true);
    });

    it('fails instead of bringing back a task deleted on another device', async () => {
        const { db, id } = await created();
        await deleteTaskForever(device(), OWNER, id);
        // The rules see no document to update and deny the write, so it never re-creates the task.
        await expect(updateTask(db, OWNER, id, { title: 'Late edit' })).rejects.toMatchObject({ code: 'permission-denied' });
        expect(await readTask(id)).toBeUndefined();
    });
});

describe('tasks data layer: live changes one by one (#94)', () => {
    it('reports added, modified and removed tasks, the first delivery marked initial', async () => {
        await seed(env, `users/${OWNER}/tasks/old`, baseTask({ title: 'Already there' }));
        const deliveries = [];
        const unsubscribe = subscribeTasks(device(), OWNER, (changes, meta) => {
            deliveries.push({ meta, changes: changes.map((c) => `${c.type} ${c.task.id} ${c.task.title}`) });
        });
        await vi.waitFor(() => expect(deliveries).toHaveLength(1));
        expect(deliveries[0]).toEqual({ meta: { initial: true }, changes: ['added old Already there'] });

        const other = device(); // another device of the same user
        const id = newTaskId(other, OWNER);
        await createTask(other, OWNER, id, FIELDS);
        await updateTask(other, OWNER, id, { title: 'Water the cactus' });
        await deleteTaskForever(other, OWNER, 'old');

        const seen = () => deliveries.slice(1).flatMap((d) => d.changes);
        await vi.waitFor(() => expect(seen()).toContain('removed old Already there'));
        expect(seen()).toContain(`modified ${id} Water the cactus`);
        expect(deliveries.slice(1).every((d) => d.meta.initial === false)).toBe(true);
        unsubscribe();
    });

    it('gives a task written on this device estimated times before the server confirms them', async () => {
        const db = device();
        const added = [];
        const unsubscribe = subscribeTasks(db, OWNER, (changes) => {
            changes.filter((c) => c.type === 'added').forEach((c) => added.push(c.task));
        });
        const id = newTaskId(db, OWNER);
        await createTask(db, OWNER, id, FIELDS);
        await vi.waitFor(() => expect(added.map((t) => t.id)).toContain(id));
        const task = added.find((t) => t.id === id);
        expect(Number.isFinite(Date.parse(task.createdAt))).toBe(true);
        expect(task.updatedAt).toBe(task.createdAt);
        unsubscribe();
    });
});
````

`firestore-tests/categories.data.test.js`:

````js
/**
 * The web data layer for categories (src/services/data/categories.js) against the emulator
 * with the real firestore.rules.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { OWNER, PAST, seed, setupRulesEnv } from './helpers';
import {
    createCategory, deleteCategory, newCategoryId, reorderCategories, subscribeCategories, updateCategory,
} from '../src/services/data/categories';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const categoryDoc = (name, color, order) => ({ schemaVersion: 2, name, color, order, createdAt: PAST, updatedAt: PAST });
const orders = async () => {
    const snap = await getDocs(collection(device(), `users/${OWNER}/categories`));
    return Object.fromEntries(snap.docs.map((d) => [d.id, d.data().order]));
};
const seedThree = async (order = { a: 1, b: 2, c: 3 }) => {
    await seed(env, `users/${OWNER}/categories/a`, categoryDoc('A', '#da3833', order.a));
    await seed(env, `users/${OWNER}/categories/b`, categoryDoc('B', '#ee603c', order.b));
    await seed(env, `users/${OWNER}/categories/c`, categoryDoc('C', '#fd8b2b', order.c));
};
const cat = (id, order) => ({ id, name: id.toUpperCase(), color: '#da3833', order });

describe('categories data layer', () => {
    it('creates a category with server times', async () => {
        const db = device();
        const id = newCategoryId(db, OWNER);
        await createCategory(db, OWNER, id, { name: 'Home', color: '#da3833', order: 1 });
        const data = (await getDoc(doc(device(), `users/${OWNER}/categories/${id}`))).data();
        expect(data).toMatchObject({ schemaVersion: 2, name: 'Home', color: '#da3833', order: 1 });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
    });

    it('renames a category and deletes it', async () => {
        await seedThree();
        const db = device();
        await updateCategory(db, OWNER, 'a', { name: 'Work', color: '#7db44e' });
        expect((await getDoc(doc(device(), `users/${OWNER}/categories/a`))).data())
            .toMatchObject({ name: 'Work', color: '#7db44e', order: 1 });
        await deleteCategory(db, OWNER, 'a');
        expect(Object.keys(await orders()).sort()).toEqual(['b', 'c']);
    });

    it('reorders with one write: only the moved category gets a new order', async () => {
        await seedThree();
        await reorderCategories(device(), OWNER, [cat('a', 1), cat('c', 3), cat('b', 2)]);
        expect(await orders()).toEqual({ a: 1, b: 2, c: 1.5 });
    });

    it('renumbers all categories in one batch when two share an order', async () => {
        await seedThree({ a: 1, b: 1, c: 2 });
        await reorderCategories(device(), OWNER, [cat('c', 2), cat('a', 1), cat('b', 1)]);
        expect(await orders()).toEqual({ c: 1, a: 2, b: 3 });
    });

    it('lists categories sorted by order, live', async () => {
        await seedThree({ a: 3, b: 1, c: 2 });
        const lists = [];
        const unsubscribe = subscribeCategories(device(), OWNER, (list) => lists.push(list.map((c) => c.id)));
        await vi.waitFor(() => expect(lists.at(-1)).toEqual(['b', 'c', 'a']));
        await updateCategory(device(), OWNER, 'a', { order: 0 });
        await vi.waitFor(() => expect(lists.at(-1)).toEqual(['a', 'b', 'c']));
        unsubscribe();
    });
});
````

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run src/services/data/tasks.test.js src/services/data/categories.test.js`
Expected: FAIL — `Error: Cannot find module './tasks' …` и `Error: Cannot find module './categories' …`, `Tests  no tests`.

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/tasks.data.test.js firestore-tests/categories.data.test.js"`
Expected: FAIL — `Error: Cannot find module '../src/services/data/tasks' …` и `… '../src/services/data/categories' …`.

- [ ] **Step 4: Написать `src/services/data/tasks.js`**

````js
/**
 * Tasks of one user, users/{uid}/tasks (data contract v2, spec sections 3.1 and 4.1).
 * db and uid are arguments: the app passes its own, the emulator tests theirs. Records are in
 * backup form (./convert.js); writes are creates with server times and partial updates.
 */
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { nextFutureOccurrence } from '../../contract/recurrence';
import { newTaskData, taskFromDoc, taskUpdateData } from './convert';

// Pending serverTimestamp() fields read as the local estimate instead of null.
const READ_OPTIONS = { serverTimestamps: 'estimate' };

const tasksCollection = (db, uid) => collection(db, 'users', uid, 'tasks');
const taskRef = (db, uid, id) => doc(db, 'users', uid, 'tasks', id);

/** "Done" (spec 4.1): a one-off task becomes done; a repeating one moves to its next future due. */
export const completionChanges = (task, now) => {
    if (!task.repeat || !task.due) return { status: 'done' };
    const changes = {
        due: { local: nextFutureOccurrence(task.due.local, task.due.tz, task.repeat, now), tz: task.due.tz },
    };
    if (task.pulseMuted) changes.pulseMuted = false;
    return changes;
};

/** A new automatic id, known before the write so the canvas can show the task at once. */
export const newTaskId = (db, uid) => doc(tasksCollection(db, uid)).id;

/**
 * Live changes, one by one (#94): onChanges([{ type: 'added' | 'modified' | 'removed', task }], { initial }).
 * The first delivery of a subscription has initial: true and lists every task as 'added'.
 */
export const subscribeTasks = (db, uid, onChanges, onError) => {
    let initial = true;
    return onSnapshot(tasksCollection(db, uid), (snapshot) => {
        const changes = snapshot.docChanges().map((change) => ({
            type: change.type,
            task: taskFromDoc(change.doc.id, change.doc.data(READ_OPTIONS)),
        }));
        const meta = { initial };
        initial = false;
        onChanges(changes, meta);
    }, onError);
};

/** fields = { title, description, categoryId, due, reminders, repeat, radius }. */
export const createTask = (db, uid, id, fields) => setDoc(taskRef(db, uid, id), newTaskData(fields));

/** Partial update of client fields. A task deleted meanwhile is not re-created: the rules deny the write. */
export const updateTask = (db, uid, id, changes) => updateDoc(taskRef(db, uid, id), taskUpdateData(changes));

export const trashTask = (db, uid, id) => updateTask(db, uid, id, { status: 'deleted', deletedAt: serverTimestamp() });

/** Back from the trash or from done. */
export const restoreTask = (db, uid, id) => updateTask(db, uid, id, { status: 'active', deletedAt: null });

export const deleteTaskForever = (db, uid, id) => deleteDoc(taskRef(db, uid, id));

export const completeTask = (db, uid, task, now = new Date()) => updateTask(db, uid, task.id, completionChanges(task, now));

/** "Finish series" of a repeating task (spec 4.1): done, like a one-off task. */
export const finishSeries = (db, uid, id) => updateTask(db, uid, id, { status: 'done' });

/** "Stop pulsing" (spec 4.1); the server sets it back to false when the due changes. */
export const muteTaskPulse = (db, uid, id) => updateTask(db, uid, id, { pulseMuted: true });
````

- [ ] **Step 5: Написать `src/services/data/categories.js`**

````js
/**
 * Categories of one user, users/{uid}/categories (data contract v2, spec sections 3.2 and 4.5).
 * The UI keeps calling them tags; only this layer knows the documents.
 */
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { categoryFromDoc, categoryUpdateData, newCategoryData } from './convert';

const categoriesCollection = (db, uid) => collection(db, 'users', uid, 'categories');
const categoryRef = (db, uid, id) => doc(db, 'users', uid, 'categories', id);

/** By order; equal orders by id, so every device shows them the same way. */
export const sortCategories = (categories) => [...categories].sort((a, b) => (a.order - b.order) || (a.id < b.id ? -1 : 1));

/** A new category goes after the last one. */
export const nextCategoryOrder = (categories) => (categories.length === 0
    ? 1
    : Math.max(...categories.map((c) => c.order)) + 1);

const isAscending = (list) => list.every((c, i) => i === 0 || list[i - 1].order < c.order);

/**
 * Writes that make `reordered` (the categories in their new sequence, with their current orders)
 * ascending. One moved category gets an order between its new neighbours; if the neighbours
 * share an order or no number fits between them, every category is renumbered 1, 2, 3…
 * Returns [{ id, order }]: empty, one entry, or one per category.
 */
export const planCategoryOrder = (reordered) => {
    if (isAscending(reordered)) return [];
    for (let i = 0; i < reordered.length; i += 1) {
        if (!isAscending(reordered.filter((_, j) => j !== i))) continue;
        const prev = reordered[i - 1];
        const next = reordered[i + 1];
        let order;
        if (!prev) order = next.order - 1;
        else if (!next) order = prev.order + 1;
        else order = (prev.order + next.order) / 2;
        if ((!prev || order > prev.order) && (!next || order < next.order)) return [{ id: reordered[i].id, order }];
        break;
    }
    return reordered.map((c, i) => ({ id: c.id, order: i + 1 }));
};

/** Live list of categories, sorted. */
export const subscribeCategories = (db, uid, onList, onError) => onSnapshot(categoriesCollection(db, uid), (snapshot) => {
    onList(sortCategories(snapshot.docs.map((d) => categoryFromDoc(d.id, d.data()))));
}, onError);

export const newCategoryId = (db, uid) => doc(categoriesCollection(db, uid)).id;

/** fields = { name, color, order }. */
export const createCategory = (db, uid, id, fields) => setDoc(categoryRef(db, uid, id), newCategoryData(fields));

export const updateCategory = (db, uid, id, changes) => updateDoc(categoryRef(db, uid, id), categoryUpdateData(changes));

/** The server clears categoryId on this category's tasks (onCategoryDeleted). */
export const deleteCategory = (db, uid, id) => deleteDoc(categoryRef(db, uid, id));

/** Saves a drag-and-drop result: one write, or one batch that renumbers every category. */
export const reorderCategories = async (db, uid, reordered) => {
    const writes = planCategoryOrder(reordered);
    if (writes.length === 0) return;
    if (writes.length === 1) {
        await updateCategory(db, uid, writes[0].id, { order: writes[0].order });
        return;
    }
    const batch = writeBatch(db);
    writes.forEach(({ id, order }) => batch.update(categoryRef(db, uid, id), categoryUpdateData({ order })));
    await batch.commit();
};
````

- [ ] **Step 6: Тесты проходят**

Run: `npx vitest run src/services/data/tasks.test.js src/services/data/categories.test.js`
Expected: PASS — `Tests  11 passed (11)`.

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/tasks.data.test.js firestore-tests/categories.data.test.js"`
Expected: PASS — `Test Files  2 passed (2)`, `Tests  15 passed (15)`. Правка задачи, удалённой с другого устройства, отклоняется кодом `permission-denied`: правила не видят документа и запрещают запись, задача не создаётся заново.

- [ ] **Step 7: Все тесты эмулятора, веб и линтер**

Run: `npm run test:rules`, затем `npm test` и `npm run lint`
Expected: `Test Files  7 passed (7)`, `Tests  103 passed (103)` (88 правил + 15 слоя данных); веб — `Test Files  37 passed (37)`, `Tests  521 passed (521)`; линтер без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/services/data/tasks.js src/services/data/categories.js src/services/data/tasks.test.js src/services/data/categories.test.js firestore-tests/tasks.data.test.js firestore-tests/categories.data.test.js
git commit -F - <<'EOF'
feat(data): tasks and categories of users/{uid} on the v2 contract

Live task changes one by one, creates with server times, partial updates,
trash, "Done" by spec 4.1/4.3, category order with one write or one
renumbering batch. Emulator tests run every write through firestore.rules.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Документ пользователя и устройства

**Files:**
- Create: `src/services/data/settings.js`, `src/services/data/devices.js`
- Test: `firestore-tests/settings.data.test.js`, `firestore-tests/devices.data.test.js`

**Interfaces:**
- Consumes: `newUserDocData`, `settingsFromUserDoc`, `settingsUpdateData`, `newDeviceData`, `deviceFromDoc`, `deviceUpdateData` (задача 2); `contract/fixtures/settings.json`.
- Produces (`src/services/data/settings.js`) — для задачи 10 и подплана 0.6:
  - `subscribeUserDoc(db, uid, onSettings, onError)` — `onSettings(settings)` или `onSettings(null)`, пока документа нет;
  - `ensureUserDoc(db, uid, settings): Promise<boolean>` — создаёт `users/{uid}` с этими настройками, если документа нет (`true`); существующий не трогает (`false`). Проверка — `getDoc`, не транзакция: без сети `setDoc` сразу попадает в локальный кэш, а если документ одновременно создало другое устройство, правила отклонят второй `setDoc`;
  - `updateSettings(db, uid, changes)` — запись по полям `settings.<поле>`.
- Produces (`src/services/data/devices.js`) — для задачи 11 и подплана 0.5:
  - `registerDevice(db, uid, deviceId, fcmToken): Promise<boolean>` — известному устройству только новый токен, новое создаётся с `notificationsEnabled: true` (`true`, если создано);
  - `setDeviceNotificationsEnabled(db, uid, deviceId, enabled)`, `unregisterDevice(db, uid, deviceId)`, `subscribeDevice(db, uid, deviceId, onDevice, onError)` (`onDevice(null)`, если устройства нет).

- [ ] **Step 1: Написать падающие тесты на эмуляторе**

`firestore-tests/settings.data.test.js`:

````js
/**
 * The web data layer for the user document (src/services/data/settings.js) against the emulator
 * with the real firestore.rules.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import settingsFixtures from '../contract/fixtures/settings.json';
import { OWNER, setupRulesEnv } from './helpers';
import { ensureUserDoc, subscribeUserDoc, updateSettings } from '../src/services/data/settings';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const read = async (path) => (await getDoc(doc(device(), path))).data();
const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
const CUSTOMISED = settingsFixtures.valid.find((f) => f.name === 'customised').value;

describe('user document and settings', () => {
    it('creates the user document once and never replaces it', async () => {
        expect(await ensureUserDoc(device(), OWNER, CUSTOMISED)).toBe(true);
        expect(await ensureUserDoc(device(), OWNER, DEFAULTS)).toBe(false);
        const data = await read(`users/${OWNER}`);
        expect(data).toMatchObject({ schemaVersion: 2, settings: CUSTOMISED });
        expect(data.createdAt).toBeInstanceOf(Timestamp);
    });

    it('lets two devices change different settings without overwriting each other', async () => {
        await ensureUserDoc(device(), OWNER, DEFAULTS);
        await Promise.all([
            updateSettings(device(), OWNER, { themeMode: 'dark' }),
            updateSettings(device(), OWNER, { labelFontSize: 12, listSort: { by: 'title', order: 'asc' } }),
        ]);
        expect((await read(`users/${OWNER}`)).settings).toEqual({
            ...DEFAULTS, themeMode: 'dark', labelFontSize: 12, listSort: { by: 'title', order: 'asc' },
        });
    });

    it('delivers the settings live, null until the document exists', async () => {
        const seen = [];
        const unsubscribe = subscribeUserDoc(device(), OWNER, (settings) => seen.push(settings));
        await vi.waitFor(() => expect(seen).toEqual([null]));
        await ensureUserDoc(device(), OWNER, DEFAULTS);
        await vi.waitFor(() => expect(seen.at(-1)).toEqual(DEFAULTS));
        await updateSettings(device(), OWNER, { design: 'clay' });
        await vi.waitFor(() => expect(seen.at(-1)).toEqual({ ...DEFAULTS, design: 'clay' }));
        unsubscribe();
    });
});
````

`firestore-tests/devices.data.test.js`:

````js
/**
 * The web data layer for devices (src/services/data/devices.js) against the emulator with the
 * real firestore.rules (spec 3.3: registration on sign-in, the switch, removal on sign-out).
 */
import { describe, it, beforeAll, afterAll, afterEach, expect, vi } from 'vitest';
import { doc, getDoc } from 'firebase/firestore';
import { OWNER, PAST, seed, setupRulesEnv } from './helpers';
import {
    registerDevice, setDeviceNotificationsEnabled, subscribeDevice, unregisterDevice,
} from '../src/services/data/devices';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const read = async (path) => (await getDoc(doc(device(), path))).data();

describe('devices', () => {
    const devicePath = `users/${OWNER}/devices/fid-1`;

    it('registers a new device with notifications on', async () => {
        expect(await registerDevice(device(), OWNER, 'fid-1', 'token-1')).toBe(true);
        expect(await read(devicePath)).toMatchObject({ platform: 'web', fcmToken: 'token-1', notificationsEnabled: true });
    });

    it('registers without a token when notifications are not allowed', async () => {
        await registerDevice(device(), OWNER, 'fid-1', null);
        expect(await read(devicePath)).toMatchObject({ fcmToken: null, notificationsEnabled: true });
    });

    it('updates only the token of a known device and keeps its switch', async () => {
        await seed(env, devicePath, {
            platform: 'web', fcmToken: 'token-1', notificationsEnabled: false, createdAt: PAST, updatedAt: PAST,
        });
        expect(await registerDevice(device(), OWNER, 'fid-1', 'token-2')).toBe(false);
        const data = await read(devicePath);
        expect(data).toMatchObject({ fcmToken: 'token-2', notificationsEnabled: false, createdAt: PAST });
        expect(data.updatedAt.toMillis()).toBeGreaterThan(PAST.toMillis());
    });

    it('turns notifications on this device off and on, live', async () => {
        await registerDevice(device(), OWNER, 'fid-1', 'token-1');
        const seen = [];
        const unsubscribe = subscribeDevice(device(), OWNER, 'fid-1', (d) => seen.push(d && d.notificationsEnabled));
        await vi.waitFor(() => expect(seen.at(-1)).toBe(true));
        await setDeviceNotificationsEnabled(device(), OWNER, 'fid-1', false);
        await vi.waitFor(() => expect(seen.at(-1)).toBe(false));
        await unregisterDevice(device(), OWNER, 'fid-1');
        await vi.waitFor(() => expect(seen.at(-1)).toBeNull());
        expect(await read(devicePath)).toBeUndefined();
        unsubscribe();
    });
});
````

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/settings.data.test.js firestore-tests/devices.data.test.js"`
Expected: FAIL — `Error: Cannot find module '../src/services/data/settings' …` и `… '../src/services/data/devices' …`.

- [ ] **Step 3: Написать `src/services/data/settings.js`**

````js
/**
 * The user document users/{uid} and its settings (data contract v2, spec sections 3.4 and 3.5).
 */
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { newUserDocData, settingsFromUserDoc, settingsUpdateData } from './convert';

const userRef = (db, uid) => doc(db, 'users', uid);

/** Live settings: onSettings(settings), or onSettings(null) while users/{uid} does not exist. */
export const subscribeUserDoc = (db, uid, onSettings, onError) => onSnapshot(userRef(db, uid), (snapshot) => {
    onSettings(snapshot.exists() ? settingsFromUserDoc(snapshot.data()) : null);
}, onError);

/**
 * Creates users/{uid} with these settings unless it already exists (spec 3.4); true if created.
 * Never replaces the document: if another device creates it at the same moment, the rules
 * reject this write.
 */
export const ensureUserDoc = async (db, uid, settings) => {
    const ref = userRef(db, uid);
    if ((await getDoc(ref)).exists()) return false;
    await setDoc(ref, newUserDocData(settings));
    return true;
};

/** Writes only the changed settings, field by field (spec 3.5). */
export const updateSettings = (db, uid, changes) => updateDoc(userRef(db, uid), settingsUpdateData(changes));
````

- [ ] **Step 4: Написать `src/services/data/devices.js`**

````js
/**
 * Devices of one user, users/{uid}/devices/{deviceId} (data contract v2, spec section 3.3).
 * deviceId is the Firebase installation id; the server sends reminders to devices with
 * notificationsEnabled and a token.
 */
import { deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deviceFromDoc, deviceUpdateData, newDeviceData } from './convert';

const READ_OPTIONS = { serverTimestamps: 'estimate' };

const deviceRef = (db, uid, deviceId) => doc(db, 'users', uid, 'devices', deviceId);

/**
 * Registration on sign-in: a known device gets only its new token (the switch is kept),
 * a new one is created with notifications on. fcmToken is null without permission. True if created.
 */
export const registerDevice = async (db, uid, deviceId, fcmToken) => {
    const ref = deviceRef(db, uid, deviceId);
    if ((await getDoc(ref)).exists()) {
        await updateDoc(ref, deviceUpdateData({ fcmToken }));
        return false;
    }
    await setDoc(ref, newDeviceData({ platform: 'web', fcmToken }));
    return true;
};

/** The "get reminders on this device" switch. */
export const setDeviceNotificationsEnabled = (db, uid, deviceId, enabled) => updateDoc(
    deviceRef(db, uid, deviceId),
    deviceUpdateData({ notificationsEnabled: enabled }),
);

/** Sign-out removes the device before signOut (the rules need the signed-in owner). */
export const unregisterDevice = (db, uid, deviceId) => deleteDoc(deviceRef(db, uid, deviceId));

/** Live device: onDevice(device) or onDevice(null) when it is not registered. */
export const subscribeDevice = (db, uid, deviceId, onDevice, onError) => onSnapshot(deviceRef(db, uid, deviceId), (snapshot) => {
    onDevice(snapshot.exists() ? deviceFromDoc(snapshot.id, snapshot.data(READ_OPTIONS)) : null);
}, onError);
````

- [ ] **Step 5: Тесты проходят**

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/settings.data.test.js firestore-tests/devices.data.test.js"`
Expected: PASS — `Test Files  2 passed (2)`, `Tests  7 passed (7)`.

- [ ] **Step 6: Все тесты эмулятора, веб и линтер**

Run: `npm run test:rules`, затем `npm test` и `npm run lint`
Expected: `Test Files  9 passed (9)`, `Tests  110 passed (110)`; веб без изменений — `Tests  521 passed (521)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/services/data/settings.js src/services/data/devices.js firestore-tests/settings.data.test.js firestore-tests/devices.data.test.js
git commit -F - <<'EOF'
feat(data): user settings and devices of users/{uid} on the v2 contract

ensureUserDoc creates users/{uid} once and never replaces it; settings are
written field by field; a device is registered with getDoc + update or set
and removed on sign-out. Emulator tests run them through firestore.rules.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Переходная модель «задача v2 ↔ поля старых окон»

**Files:**
- Create: `src/services/data/bubbleModel.js`
- Test: `src/services/data/bubbleModel.test.js`
- Modify: `src/contract/migrateV1.js` (экспорт правил 9.2)

**Interfaces:**
- Consumes: `toInstant`, `toLocal`, `deviceTimeZone` (`src/contract/time.js`), `htmlToMarkdown` (`src/contract/markdown.js`), внутренние `mapReminders`/`mapRepeat` из `src/contract/migrateV1.js`.
- Produces:
  - `src/contract/migrateV1.js`: `remindersFromV1(notifications): number[]` и `repeatFromV1(recurrence, due): repeat | null` — те же правила, что у переноса (9.2);
  - `src/services/data/bubbleModel.js` (до 0.5; задачи 6, 8 используют его, 0.5 убирает старые имена):
    - `bubbleFromTask(task, timeZone = deviceTimeZone())` — задача (или пузырь) плюс старые имена: `tagId`, `dueDate` (местная строка устройства `YYYY-MM-DDTHH:mm:ss`), `notifications` (`'1h'`, `'1d'`, `{ type: 'custom', value, unit: 'hours' | 'days' | 'weeks' }`), `recurrence` (`weekDays` 0 = воскресенье, без `monthDay`), `overduePulseSuppressed`, `useRichText: false`; тело Matter сохраняется;
    - `withTaskChanges(bubble, changes, timeZone?)` — пузырь после локальной записи;
    - `taskFieldsFromForm(form, timeZone?)` — поля для `createTask`;
    - `taskChangesFromForm(task, form, timeZone?)` — частичные изменения для `updateTask` (пустой объект, если ничего не менялось);
    - `form = { title, description, useRichText, tagId, radius, dueDate: Date | null, notifications, recurrence }` — значения старых окон.

- [ ] **Step 1: Написать падающий тест `src/services/data/bubbleModel.test.js`**

Даты окна правки собираются через `toInstant(…, BERLIN)`, как их отдал бы диалог на устройстве в Берлине: `new Date('…T08:00:00')` разобрался бы в зоне процесса, а не в Берлине.

````js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { toInstant } from '../../contract/time';
import { bubbleFromTask, taskChangesFromForm, taskFieldsFromForm, withTaskChanges } from './bubbleModel';

const BERLIN = 'Europe/Berlin';

const task = (overrides) => ({
    id: 't1',
    title: 'Pay bills',
    description: '- [ ] power',
    categoryId: 'c1',
    status: 'active',
    due: { local: '2026-10-15T09:00', tz: 'Europe/Kyiv' },
    reminders: [60],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

// What the edit dialog on a device in Berlin hands back when the user changed nothing.
const formOf = (bubble, overrides) => ({
    title: bubble.title,
    description: bubble.description,
    useRichText: false,
    tagId: bubble.tagId,
    radius: bubble.radius,
    dueDate: bubble.dueDate ? toInstant(bubble.dueDate.slice(0, 16), BERLIN) : null,
    notifications: bubble.notifications,
    recurrence: bubble.recurrence,
    ...overrides,
});

describe('bubbleFromTask: a v2 task as the bubble the old editors understand', () => {
    it('keeps the v2 fields and adds the old names', () => {
        const bubble = bubbleFromTask(task({ pulseMuted: true }), BERLIN);
        expect(bubble).toMatchObject({ ...task({ pulseMuted: true }), tagId: 'c1', overduePulseSuppressed: true, useRichText: false });
    });

    it('shows the due in the time of this device', () => {
        // 09:00 in Kyiv (UTC+3 in October) is 08:00 in Berlin (UTC+2).
        expect(bubbleFromTask(task(), BERLIN).dueDate).toBe('2026-10-15T08:00:00');
    });

    it('shows a due in a zone this browser does not know as written', () => {
        expect(bubbleFromTask(task({ due: { local: '2026-10-15T09:00', tz: 'Mars/Olympus' } }), BERLIN).dueDate)
            .toBe('2026-10-15T09:00:00');
    });

    it('has no due, reminders or repeat for a task without a due', () => {
        expect(bubbleFromTask(task({ due: null, reminders: [] }), BERLIN))
            .toMatchObject({ dueDate: null, notifications: [], recurrence: null });
    });

    it('lists reminders the way the old editor shows them', () => {
        expect(bubbleFromTask(task({ reminders: [60, 120, 1440, 2880, 10080, 20160] }), BERLIN).notifications).toEqual([
            '1h',
            { type: 'custom', value: 2, unit: 'hours' },
            '1d',
            { type: 'custom', value: 2, unit: 'days' },
            { type: 'custom', value: 1, unit: 'weeks' },
            { type: 'custom', value: 2, unit: 'weeks' },
        ]);
    });

    it('turns ISO weekdays into the old editor\'s (Sunday is 0) and drops the month day', () => {
        expect(bubbleFromTask(task({ repeat: { every: 1, unit: 'weeks', weekdays: [1, 7] } }), BERLIN).recurrence)
            .toEqual({ every: 1, unit: 'weeks', weekDays: [1, 0] });
        expect(bubbleFromTask(task({ repeat: { every: 2, unit: 'months', monthDay: 15 } }), BERLIN).recurrence)
            .toEqual({ every: 2, unit: 'months' });
    });
});

describe('withTaskChanges: a local write shown before the server confirms it', () => {
    it('applies the changes, recomputes the old names and keeps the Matter body', () => {
        const body = { id: 7 };
        const next = withTaskChanges({ ...bubbleFromTask(task(), BERLIN), body }, { categoryId: null, reminders: [1440] }, BERLIN);
        expect(next).toMatchObject({ categoryId: null, tagId: null, reminders: [1440], notifications: ['1d'] });
        expect(next.body).toBe(body);
    });
});

describe('taskFieldsFromForm: a new task from the create dialog', () => {
    const form = (overrides) => ({
        title: 'Pay bills',
        description: '',
        useRichText: false,
        tagId: '',
        radius: 45,
        dueDate: new Date('2026-10-15T07:30:45.000Z'),
        notifications: [],
        recurrence: null,
        ...overrides,
    });

    it('writes the due in the zone of this device, without seconds', () => {
        expect(taskFieldsFromForm(form(), BERLIN)).toEqual({
            title: 'Pay bills', description: '', categoryId: null, radius: 45,
            due: { local: '2026-10-15T09:30', tz: BERLIN }, reminders: [], repeat: null,
        });
    });

    it('rounds reminders in minutes up to whole hours, as the migration does', () => {
        const notifications = ['5m', '1h', { type: 'custom', value: 90, unit: 'minutes' }, '1d'];
        expect(taskFieldsFromForm(form({ notifications }), BERLIN).reminders).toEqual([60, 120, 1440]);
    });

    it('turns a repeat in minutes into hours and takes the month day from the due', () => {
        expect(taskFieldsFromForm(form({ recurrence: { every: 30, unit: 'minutes' } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'hours' });
        expect(taskFieldsFromForm(form({ recurrence: { every: 1, unit: 'months' } }), BERLIN).repeat)
            .toEqual({ every: 1, unit: 'months', monthDay: 15 });
    });

    it('drops reminders and repeat without a due', () => {
        const fields = taskFieldsFromForm(form({ dueDate: null, notifications: ['1h'], recurrence: { every: 1, unit: 'days' } }), BERLIN);
        expect(fields).toMatchObject({ due: null, reminders: [], repeat: null });
    });

    it('stores the description as Markdown: plain text as typed, rich text converted', () => {
        expect(taskFieldsFromForm(form({ description: '**bold** text' }), BERLIN).description).toBe('**bold** text');
        expect(taskFieldsFromForm(form({ description: '<p><strong>bold</strong> text</p>', useRichText: true }), BERLIN).description)
            .toBe('**bold** text');
    });

    it('keeps the category the user picked', () => {
        expect(taskFieldsFromForm(form({ tagId: 'c1' }), BERLIN).categoryId).toBe('c1');
    });
});

describe('taskChangesFromForm: only what the user changed in the edit dialog', () => {
    it('writes nothing when nothing changed', () => {
        const bubble = bubbleFromTask(task({ repeat: { every: 1, unit: 'weeks', weekdays: [1, 7] }, reminders: [60, 1440] }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble), BERLIN)).toEqual({});
    });

    it('writes only the fields that changed', () => {
        const bubble = bubbleFromTask(task(), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Pay all bills', tagId: '' }), BERLIN))
            .toEqual({ title: 'Pay all bills', categoryId: null });
    });

    it('keeps the due and its zone when the user did not change the time on a device in another zone', () => {
        const bubble = bubbleFromTask(task(), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { radius: 60 }), BERLIN)).toEqual({ radius: 60 });
    });

    it('writes a changed due in the zone of this device and lets a muted task pulse again', () => {
        const bubble = bubbleFromTask(task({ pulseMuted: true }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { dueDate: new Date('2026-10-16T07:00:00.000Z') }), BERLIN))
            .toEqual({ due: { local: '2026-10-16T09:00', tz: BERLIN }, pulseMuted: false });
    });

    it('keeps the month day of a monthly task that "Done" moved into a shorter month', () => {
        const bubble = bubbleFromTask(task({
            due: { local: '2026-02-28T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        }), BERLIN);
        expect(taskChangesFromForm(bubble, formOf(bubble, { title: 'Rent' }), BERLIN)).toEqual({ title: 'Rent' });
    });

    it('takes the month day from the new due when the due changes', () => {
        const bubble = bubbleFromTask(task({
            due: { local: '2026-02-28T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 31 },
        }), BERLIN);
        const changes = taskChangesFromForm(bubble, formOf(bubble, { dueDate: new Date('2026-03-15T08:00:00.000Z') }), BERLIN);
        expect(changes).toEqual({
            due: { local: '2026-03-15T09:00', tz: BERLIN },
            repeat: { every: 1, unit: 'months', monthDay: 15 },
        });
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/services/data/bubbleModel.test.js`
Expected: FAIL — `Error: Failed to resolve import "./bubbleModel" from "src/services/data/bubbleModel.test.js". Does the file exist?`, `Tests  no tests`.

- [ ] **Step 3: Экспортировать правила 9.2 из `src/contract/migrateV1.js`**

````diff
diff --git a/src/contract/migrateV1.js b/src/contract/migrateV1.js
index 4679a36..4c1a272 100644
--- a/src/contract/migrateV1.js
+++ b/src/contract/migrateV1.js
@@ -79,6 +79,12 @@ const mapRepeat = (recurrence, due, notes) => {
     return repeat;
 };
 
+/** v1 notifications -> v2 reminders by the migration rules (whole hours, sorted, at most 10). */
+export const remindersFromV1 = (notifications) => mapReminders(notifications, new Set());
+
+/** v1 recurrence -> v2 repeat for this due by the migration rules; null without a due. */
+export const repeatFromV1 = (recurrence, due) => mapRepeat(recurrence, due, new Set());
+
 // Accepts ISO strings and Firestore Timestamp-like objects ({ toDate() }).
 const timestampMs = (value) => {
     if (typeof value === 'string') return Date.parse(value);
````

- [ ] **Step 4: Написать `src/services/data/bubbleModel.js`**

````js
/**
 * Interim bridge until sub-plan 0.5 brings the v2 editors: a v2 task <-> the bubble fields the
 * current dialogs, list and canvas read (tagId, dueDate, notifications, recurrence, …).
 * The old editors still offer minutes and rich text. Their values are written by the migration
 * rules (spec 9.2: minutes round up to whole hours), and the description stays Markdown.
 * The bubble keeps every v2 field next to the old names; 0.5 drops the old names.
 */
import { deviceTimeZone, toInstant, toLocal } from '../../contract/time';
import { htmlToMarkdown } from '../../contract/markdown';
import { remindersFromV1, repeatFromV1 } from '../../contract/migrateV1';

const HOUR = 60;
const DAY = 1440;
const WEEK = 10080;

const reminderForEditor = (minutes) => {
    if (minutes === HOUR) return '1h';
    if (minutes === DAY) return '1d';
    if (minutes % WEEK === 0) return { type: 'custom', value: minutes / WEEK, unit: 'weeks' };
    if (minutes % DAY === 0) return { type: 'custom', value: minutes / DAY, unit: 'days' };
    return { type: 'custom', value: minutes / HOUR, unit: 'hours' };
};

// The old repeat editor knows weekdays as 0 = Sunday … 6 = Saturday and has no month day.
const recurrenceForEditor = (repeat) => {
    if (!repeat) return null;
    const recurrence = { every: repeat.every, unit: repeat.unit };
    if (repeat.weekdays) recurrence.weekDays = repeat.weekdays.map((day) => day % 7);
    return recurrence;
};

// Device-local "YYYY-MM-DDTHH:mm:ss", the string parseLocalDateTime and the list read (spec 4.2:
// shown in the time of this device). A zone this browser does not know shows the time as written.
const dueDateForEditor = (due, timeZone) => {
    if (!due) return null;
    try {
        return `${toLocal(toInstant(due.local, due.tz), timeZone)}:00`;
    } catch {
        return `${due.local}:00`;
    }
};

/** v2 task (or bubble) -> bubble fields; the Matter body, if any, is kept. */
export const bubbleFromTask = (task, timeZone = deviceTimeZone()) => ({
    ...task,
    tagId: task.categoryId,
    dueDate: dueDateForEditor(task.due, timeZone),
    notifications: task.reminders.map(reminderForEditor),
    recurrence: recurrenceForEditor(task.repeat),
    overduePulseSuppressed: task.pulseMuted,
    useRichText: false,
});

/** A bubble after a local write: v2 fields with the changes, old names recomputed, body kept. */
export const withTaskChanges = (bubble, changes, timeZone = deviceTimeZone()) => bubbleFromTask({ ...bubble, ...changes }, timeZone);

const dueFromForm = (dueDate, timeZone) => (dueDate ? { local: toLocal(dueDate, timeZone), tz: timeZone } : null);

const descriptionFromForm = ({ description, useRichText }) => (useRichText
    ? htmlToMarkdown(description || '').markdown
    : description || '');

/**
 * The create dialog -> fields for createTask (spec 4.2: the due is written in the zone of this
 * device). form = { title, description, useRichText, tagId, radius, dueDate: Date | null,
 * notifications, recurrence } in the old editors' shapes.
 */
export const taskFieldsFromForm = (form, timeZone = deviceTimeZone()) => {
    const due = dueFromForm(form.dueDate, timeZone);
    return {
        title: form.title,
        description: descriptionFromForm(form),
        categoryId: form.tagId || null,
        due,
        reminders: due ? remindersFromV1(form.notifications) : [],
        repeat: repeatFromV1(form.recurrence, due),
        radius: form.radius,
    };
};

const isEqual = (a, b) => {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => isEqual(a[key], b[key]));
};

const sameMinute = (due, date) => {
    try {
        return Math.floor(toInstant(due.local, due.tz).getTime() / 60000) === Math.floor(date.getTime() / 60000);
    } catch {
        return false;
    }
};

/**
 * The edit dialog -> partial changes for updateTask: only the fields the user changed (spec 3).
 * An unchanged moment keeps the due and its zone even on a device in another zone; a changed due
 * takes the zone of this device and the month day of the new due (spec 4.2), and lets a muted
 * task pulse again.
 */
export const taskChangesFromForm = (task, form, timeZone = deviceTimeZone()) => {
    const formDue = dueFromForm(form.dueDate, timeZone);
    const dueChanged = task.due === null ? formDue !== null : formDue === null || !sameMinute(task.due, form.dueDate);
    const due = dueChanged ? formDue : task.due;
    let repeat = repeatFromV1(form.recurrence, due);
    if (!dueChanged && repeat && repeat.unit === 'months' && task.repeat && task.repeat.unit === 'months') {
        // "Done" may have moved a day-31 task to the 28th: without a due change the month day stays.
        repeat = { ...repeat, monthDay: task.repeat.monthDay };
    }
    const next = {
        title: form.title,
        description: descriptionFromForm(form),
        categoryId: form.tagId || null,
        due,
        reminders: due ? remindersFromV1(form.notifications) : [],
        repeat,
        radius: form.radius,
    };
    const changes = {};
    Object.keys(next).forEach((key) => {
        if (!isEqual(next[key], task[key])) changes[key] = next[key];
    });
    if (dueChanged && task.pulseMuted) changes.pulseMuted = false;
    return changes;
};
````

- [ ] **Step 5: Тест проходит**

Run: `npx vitest run src/services/data/bubbleModel.test.js`
Expected: PASS — `Tests  19 passed (19)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  38 passed (38)`, `Tests  540 passed (540)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/contract/migrateV1.js src/services/data/bubbleModel.js src/services/data/bubbleModel.test.js
git commit -F - <<'EOF'
feat(data): interim bridge from v2 tasks to the old editors' fields

Until sub-plan 0.5 the dialogs keep tagId/dueDate/notifications/recurrence:
the due shows in the device's time, minutes round up to whole hours by the
migration rules (9.2), only the fields the user changed are written, and an
unchanged due keeps its zone and month day.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Живая синхронизация холста (#94)

**Files:**
- Create: `src/utils/taskSync.js`
- Test: `src/utils/taskSync.test.js`, `firestore-tests/canvasSync.data.test.js` (два клиента на эмуляторе)
- Modify: `src/hooks/useMatterEngine.js`, `src/hooks/useMatterEngine.test.jsx` (замена целиком), `src/hooks/useBubbleNotifications.js`, `src/pages/BubblesPage.jsx`

**Interfaces:**
- Consumes: `subscribeTasks` (задача 3), `bubbleFromTask` (задача 5).
- Produces:
  - `src/utils/taskSync.js`: `applyTaskChanges(prev, changes, { initial, createBubble, removeBody }): bubbles` — одна функция «документ → пузырь» (`bubbleFromTask`) и изменения по одному: `added` (новое тело; у пузыря, добавленного на этом устройстве, тело сохраняется), `modified` (поля заменяются, тело то же, остальные пузыри — те же объекты), `removed` (тело убирается из мира). `initial: true` заменяет список целиком и убирает старые тела;
  - `useMatterEngine` принимает проп `subscribeTasks: (onChanges, onError) => unsubscribe` вместо загрузки из `firestoreService`; проп `stickyPulseRef` и `lastDueRef` больше не принимает;
  - `useBubbleNotifications` больше не возвращает `lastDueRef` (его только писали и нигде не читали).

Тест #94 взят из остановленной сессии (коммит `93eb068` на `claude/upbeat-mclaren-f91f52`) и переписан под пути v2 и стенд ветки: настройка эмулятора — из 0.2 (`npm run test:rules`), без отдельного `test:emulator`. Подписка передаётся хуку аргументом, поэтому тест подставляет настоящий Firestore эмулятора без подмены `src/firebase`.

- [ ] **Step 1: Написать падающий тест `src/utils/taskSync.test.js`**

````js
import { describe, expect, it, vi } from 'vitest';
import { applyTaskChanges } from './taskSync';

const task = (id, overrides) => ({
    id,
    title: `Task ${id}`,
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

const setup = () => {
    let bodyId = 0;
    const createBubble = vi.fn((t) => ({ ...t, tagId: t.categoryId, body: { id: (bodyId += 1) } }));
    const removeBody = vi.fn();
    const apply = (prev, changes, initial = false) => applyTaskChanges(prev, changes, { initial, createBubble, removeBody });
    return { createBubble, removeBody, apply };
};

describe('applyTaskChanges (#94, spec 8.3)', () => {
    it('builds one bubble per task on the first delivery and drops the bodies it replaces', () => {
        const { apply, removeBody } = setup();
        const old = { ...task('x'), body: { id: 99 } };
        const next = apply([old], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        expect(next.map((b) => [b.id, b.body.id])).toEqual([['a', 1], ['b', 2]]);
        expect(removeBody).toHaveBeenCalledWith(old.body);
    });

    it('appends a task added on another device with a new body', () => {
        const { apply } = setup();
        const a = apply([], [{ type: 'added', task: task('a') }], true);
        const next = apply(a, [{ type: 'added', task: task('b', { title: 'From the phone' }) }]);
        expect(next.map((b) => b.id)).toEqual(['a', 'b']);
        expect(next[1]).toMatchObject({ title: 'From the phone', body: { id: 2 } });
    });

    it('keeps the body of a bubble that is already there, e.g. added on this device a moment ago', () => {
        const { apply, createBubble } = setup();
        const local = { ...task('a'), tagId: null, body: { id: 50 } };
        const next = apply([local], [{ type: 'added', task: task('a', { title: 'Confirmed' }) }]);
        expect(next).toHaveLength(1);
        expect(next[0]).toMatchObject({ title: 'Confirmed', body: { id: 50 } });
        expect(createBubble).not.toHaveBeenCalled();
    });

    it('replaces only the changed bubble and leaves the others as they were', () => {
        const { apply } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        const next = apply(prev, [{ type: 'modified', task: task('b', { categoryId: 'c1', radius: 60 }) }]);
        expect(next[0]).toBe(prev[0]);
        expect(next[1]).toMatchObject({ categoryId: 'c1', tagId: 'c1', radius: 60, body: prev[1].body });
    });

    it('removes a task deleted on another device together with its body', () => {
        const { apply, removeBody } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }, { type: 'added', task: task('b') }], true);
        const next = apply(prev, [{ type: 'removed', task: task('a') }]);
        expect(next.map((b) => b.id)).toEqual(['b']);
        expect(removeBody).toHaveBeenCalledWith(prev[0].body);
    });

    it('ignores the removal of a task it does not have', () => {
        const { apply, removeBody } = setup();
        const prev = apply([], [{ type: 'added', task: task('a') }], true);
        expect(apply(prev, [{ type: 'removed', task: task('zz') }])).toEqual(prev);
        expect(removeBody).not.toHaveBeenCalled();
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/utils/taskSync.test.js`
Expected: FAIL — `Error: Cannot find module './taskSync' imported from …/src/utils/taskSync.test.js`, `Tests  no tests`.

- [ ] **Step 3: Написать `src/utils/taskSync.js`**

````js
/**
 * Live sync of the canvas (#94, spec 8.3): task changes are applied to the bubbles list one by
 * one, without rebuilding it, and every task keeps exactly one Matter body.
 */
import { bubbleFromTask } from '../services/data/bubbleModel';

/**
 * prev: current bubbles; changes: [{ type: 'added' | 'modified' | 'removed', task }] from
 * subscribeTasks. initial: the first delivery of a subscription, which replaces the list.
 * createBubble(task) builds a bubble with a new body; removeBody(body) takes a body out of the
 * world. A task that already has a bubble (e.g. added on this device a moment earlier) keeps
 * its body; unchanged bubbles stay the same objects.
 */
export const applyTaskChanges = (prev, changes, { initial, createBubble, removeBody }) => {
    if (initial) {
        prev.forEach((bubble) => {
            if (bubble.body) removeBody(bubble.body);
        });
        return changes.filter((c) => c.type !== 'removed').map((c) => createBubble(c.task));
    }
    let next = prev;
    changes.forEach(({ type, task }) => {
        const index = next.findIndex((bubble) => bubble.id === task.id);
        if (type === 'removed') {
            if (index === -1) return;
            if (next[index].body) removeBody(next[index].body);
            next = next.filter((_, i) => i !== index);
        } else if (index === -1) {
            next = [...next, createBubble(task)];
        } else {
            const { body } = next[index];
            next = next.map((bubble, i) => (i === index ? { ...bubbleFromTask(task), body } : bubble));
        }
    });
    return next;
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/utils/taskSync.test.js`
Expected: PASS — `Tests  6 passed (6)`.

- [ ] **Step 5: Заменить `src/hooks/useMatterEngine.test.jsx` целиком**

Те же сценарии #94 и тест окна правки из `1393d48`, но изменения приходят через подставленный `subscribeTasks`; добавлены проверки поштучной сверки, повторной первой доставки и `pulseMuted` с другого устройства.

````jsx
// @vitest-environment happy-dom
import React, { StrictMode, act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMatterEngine } from './useMatterEngine';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Matter's canvas renderer and rAF runner need a real browser; the engine, bodies and
// world stay real.
vi.mock('matter-js', async (importOriginal) => {
    const Matter = (await importOriginal()).default;
    return {
        default: {
            ...Matter,
            Render: {
                create: vi.fn(({ options }) => ({
                    canvas: document.createElement('canvas'),
                    options: { ...options },
                    textures: {},
                })),
                run: vi.fn(),
                stop: vi.fn(),
            },
            Runner: { create: vi.fn(() => ({})), run: vi.fn(), stop: vi.fn() },
        },
    };
});
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

// A task in backup form, as subscribeTasks delivers it.
const task = (id, overrides = {}) => ({
    id,
    title: `Task ${id}`,
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 50,
    pulseMuted: false,
    createdAt: '2026-10-14T20:00:00.000Z',
    updatedAt: '2026-10-14T20:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

describe('useMatterEngine', () => {
    let container;
    let root;
    let refs;
    let hookProps; // per-test overrides of the hook's props
    let bubbles; // latest committed bubbles state
    let setBubblesState; // the bubbles setter, for updates the page makes itself (Save)
    let committedBodies; // every Matter body that reached a committed bubbles state
    let deliver; // the onChanges callback useMatterEngine gave subscribeTasks
    let subscribeTasks;

    const push = (changes, initial = false) => act(() => deliver(changes, { initial }));
    const added = (...tasks) => tasks.map((t) => ({ type: 'added', task: t }));

    const recordCommit = (state) => {
        bubbles = state;
        state.forEach((b) => {
            if (b.body) committedBodies.add(b.body);
        });
    };

    function Probe() {
        const [state, setBubbles] = useState([]);
        setBubblesState = setBubbles;
        useMatterEngine({
            ...refs,
            editDialog: false,
            selectedBubble: null,
            bubbles: state,
            subscribeTasks,
            setBubbles,
            setCanvasSize: vi.fn(),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
            setEditDialog: vi.fn(),
            setEditDueDate: vi.fn(),
            setEditNotifications: vi.fn(),
            setEditRecurrence: vi.fn(),
            isMobile: false,
            themeMode: 'light',
            tags: [],
            dropSpeed: 1,
            getBubbleFillStyle: () => 'rgba(0, 0, 0, 0)',
            getCanvasSize: () => ({ width: 800, height: 600 }),
            parseLocalDateTime: () => null,
            theme: {},
            ...hookProps,
        });
        useEffect(() => recordCommit(state), [state]);
        return null;
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        hookProps = {};
        bubbles = undefined;
        committedBodies = new Set();
        subscribeTasks = vi.fn((onChanges) => {
            deliver = onChanges;
            return vi.fn();
        });
        refs = {
            canvasRef: { current: container },
            engineRef: { current: null },
            renderRef: { current: null },
            wallsRef: { current: [] },
            manuallyStoppedPulsingRef: { current: new Set() },
            liveEditRef: { current: { editDialog: false, selectedBubbleId: null } },
        };
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('gives every task of the first delivery one Matter body', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b', { radius: 40 })), true);

        expect(bubbles.map((b) => [b.id, b.body.circleRadius])).toEqual([['a', 50], ['b', 40]]);
    });

    it('gives a task created on another device a Matter body', () => {
        act(() => root.render(<Probe />));
        push(added(task('local')), true);
        const localBody = bubbles[0].body;

        push(added(task('remote', { radius: 40, title: 'Created elsewhere', categoryId: 'work' })));

        const remote = bubbles.find((b) => b.id === 'remote');
        expect(remote).toMatchObject({ title: 'Created elsewhere', radius: 40, tagId: 'work', categoryId: 'work' });
        expect(remote.body.circleRadius).toBe(40);
        expect(bubbles.find((b) => b.id === 'local').body).toBe(localBody);
    });

    it('creates the body only once when the same task is delivered twice', () => {
        act(() => root.render(<Probe />));
        push([], true);

        push(added(task('remote')));
        const body = bubbles[0].body;
        push(added(task('remote')));

        expect(bubbles).toHaveLength(1);
        expect(bubbles[0].body).toBe(body);
    });

    it("styles a new body with its category's fill and colour", () => {
        hookProps = {
            tags: [{ id: 'work', name: 'Work', color: '#2e7d32', order: 1 }],
            getBubbleFillStyle: (tagColor) => (tagColor ? `fill ${tagColor}` : 'fill none'),
        };
        act(() => root.render(<Probe />));
        push(added(task('remote', { categoryId: 'work' }), task('plain')), true);

        expect(bubbles[0].body.render).toMatchObject({ fillStyle: 'fill #2e7d32', strokeStyle: '#2e7d32', lineWidth: 1.5 });
        expect(bubbles[1].body.render).toMatchObject({ fillStyle: 'fill none', strokeStyle: '#B0B0B0' });
    });

    it('keeps the Matter body and the other bubbles when another device edits a task', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        const [a, b] = bubbles;

        push([{ type: 'modified', task: task('b', { title: 'Renamed elsewhere', radius: 70 }) }]);

        expect(bubbles[0]).toBe(a);
        expect(bubbles[1]).toMatchObject({ title: 'Renamed elsewhere', radius: 70 });
        expect(bubbles[1].body).toBe(b.body);
    });

    it('removes the Matter body of a task deleted on another device', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        // useBubbleWorld puts the visible bodies into the world.
        const world = refs.engineRef.current.world;
        bubbles.forEach((b) => Matter.World.add(world, b.body));
        const deletedBody = bubbles.find((b) => b.id === 'b').body;

        push([{ type: 'removed', task: task('b') }]);

        expect(bubbles.map((b) => b.id)).toEqual(['a']);
        expect(world.bodies.includes(deletedBody)).toBe(false);
    });

    it('leaves no orphaned body when a subscription delivers its first list again', () => {
        act(() => root.render(<Probe />));
        push(added(task('a'), task('b')), true);
        const world = refs.engineRef.current.world;
        bubbles.forEach((b) => Matter.World.add(world, b.body));

        push(added(task('a'), task('b')), true);

        // useBubbleWorld adds every committed body to the Matter world, so a body that is no
        // longer in state stays there as an unlabeled ghost bubble.
        const finalBodies = bubbles.map((b) => b.body);
        const ghosts = world.bodies.filter((body) => body.label === 'Circle Body' && !finalBodies.includes(body));
        expect(bubbles).toHaveLength(2);
        expect(ghosts).toEqual([]);
    });

    it('places a body created after a resize inside the current canvas', () => {
        act(() => root.render(<Probe />));
        push([], true);
        // The canvas shrank (window resize, phone rotation); useMatterResize →
        // updateRenderAndBounds keeps render.options in step with it.
        refs.renderRef.current.options.width = 300;
        refs.renderRef.current.options.height = 400;
        vi.spyOn(Math, 'random').mockReturnValue(0.999);

        push(added(task('remote', { radius: 40 })));

        const { x, y } = bubbles[0].body.position;
        expect(x).toBeLessThanOrEqual(300 - 40);
        expect(y).toBeLessThanOrEqual(400 - 40);
    });

    it('follows "stop pulsing" set or cleared on another device', () => {
        act(() => root.render(<Probe />));
        push(added(task('a', { pulseMuted: true })), true);
        expect(refs.manuallyStoppedPulsingRef.current.has('a')).toBe(true);

        push([{ type: 'modified', task: task('a', { pulseMuted: false }) }]);
        expect(refs.manuallyStoppedPulsingRef.current.has('a')).toBe(false);
    });

    it('stops listening when the canvas unmounts', () => {
        act(() => root.render(<Probe />));
        const unsubscribe = subscribeTasks.mock.results[0].value;
        act(() => root.unmount());
        root = createRoot(container);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('keeps the edit dialog closed after Save when a canvas click opened it', () => {
        // As in the app: the dialog state lives in BubblesPage, the bubbles in BubblesDataProvider.
        let setDialogOpen;
        let dialogOpen;
        function EditDialogState() {
            const [open, setOpen] = useState(false);
            setDialogOpen = setOpen;
            useEffect(() => { dialogOpen = open; }, [open]);
            return null;
        }
        hookProps = {
            setEditDialog: (open) => setDialogOpen(open),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
        };
        const createMouseConstraint = vi.spyOn(Matter.MouseConstraint, 'create');
        // StrictMode as in src/index.jsx: there React calls state updaters a second time.
        const renderApp = () => root.render(<StrictMode><EditDialogState /><Probe /></StrictMode>);
        act(renderApp);
        push(added(task('a')), true);
        // useBubbleWorld puts the visible bodies into the world.
        const { body } = bubbles[0];
        Matter.World.add(refs.engineRef.current.world, body);
        // A user clicks long after the last bubbles update. The provider has re-rendered since,
        // so React runs a setBubbles updater that keeps the state right away and leaves it queued.
        act(renderApp);

        // Matter triggers these from its update tick after a click on the canvas.
        const mouseConstraint = createMouseConstraint.mock.results.at(-1).value;
        const mouse = { position: { ...body.position } };
        act(() => {
            Matter.Events.trigger(mouseConstraint, 'mousedown', { mouse });
            Matter.Events.trigger(mouseConstraint, 'mouseup', { mouse });
        });
        expect(dialogOpen).toBe(true);
        expect(hookProps.setSelectedBubble).toHaveBeenCalledWith(bubbles[0]);
        expect(hookProps.setSelectedTagId).toHaveBeenCalledWith('');
        expect(hookProps.setEditBubbleSize).toHaveBeenCalledWith(50);

        // Save (useBubbleCrud.handleSaveBubble): store the edited bubble, close the dialog.
        act(() => {
            setBubblesState((prev) => prev.map((b) => ({ ...b, updatedAt: '2026-10-15T07:00:00.000Z' })));
            setDialogOpen(false);
        });
        expect(bubbles[0].updatedAt).toBe('2026-10-15T07:00:00.000Z');
        expect(dialogOpen).toBe(false);
    });
});
````

- [ ] **Step 6: Написать тест двух клиентов на эмуляторе `firestore-tests/canvasSync.data.test.js`**

````js
// @vitest-environment happy-dom
/**
 * Issue #94 with two real Firestore clients on the emulator: device A writes tasks through the
 * data layer, device B is the canvas itself (useMatterEngine fed by subscribeTasks), which has
 * to show every change without a reload and with exactly one Matter body per task.
 * No JSX: the rules config collects plain *.test.js files.
 */
import { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { describe, it, beforeAll, afterAll, afterEach, beforeEach, expect, vi } from 'vitest';
import { OWNER, setupRulesEnv } from './helpers';
import { createTask, deleteTaskForever, newTaskId, subscribeTasks, updateTask } from '../src/services/data/tasks';
import { useMatterEngine } from '../src/hooks/useMatterEngine';

// Matter's canvas renderer and rAF runner need a real browser; the engine, bodies and
// world stay real.
vi.mock('matter-js', async (importOriginal) => {
    const Matter = (await importOriginal()).default;
    return {
        default: {
            ...Matter,
            Render: {
                create: vi.fn(({ options }) => ({
                    canvas: document.createElement('canvas'),
                    options: { ...options },
                    textures: {},
                })),
                run: vi.fn(),
                stop: vi.fn(),
            },
            Runner: { create: vi.fn(() => ({})), run: vi.fn(), stop: vi.fn() },
        },
    };
});

// Snapshots travel through the emulator: give them more than vi.waitFor's default 1 s,
// a cold CI runner can be slow to open the first connection.
const SYNC_WAIT = { timeout: 10000 };
const FIELDS = { title: 'Water plants', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45 };

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

describe('canvas sync between two devices (#94, Firestore emulator)', () => {
    let container;
    let root;
    let refs;
    let bubbles; // device B's latest committed bubbles
    let bodiesById; // id -> every Matter body that reached a committed state on device B

    function DeviceB({ db }) {
        const [state, setBubbles] = useState([]);
        useMatterEngine({
            ...refs,
            editDialog: false,
            selectedBubble: null,
            bubbles: state,
            subscribeTasks: (onChanges, onError) => subscribeTasks(db, OWNER, onChanges, onError),
            setBubbles,
            setCanvasSize: vi.fn(),
            setSelectedBubble: vi.fn(),
            setSelectedTagId: vi.fn(),
            setEditBubbleSize: vi.fn(),
            setEditDialog: vi.fn(),
            setEditDueDate: vi.fn(),
            setEditNotifications: vi.fn(),
            setEditRecurrence: vi.fn(),
            isMobile: false,
            themeMode: 'light',
            tags: [],
            dropSpeed: 1,
            getBubbleFillStyle: () => 'rgba(0, 0, 0, 0)',
            getCanvasSize: () => ({ width: 800, height: 600 }),
            parseLocalDateTime: () => null,
            theme: {},
        });
        useEffect(() => {
            bubbles = state;
            state.forEach((b) => {
                if (!bodiesById.has(b.id)) bodiesById.set(b.id, new Set());
                bodiesById.get(b.id).add(b.body);
                // useBubbleWorld puts the bodies of visible bubbles into the world.
                if (!refs.engineRef.current.world.bodies.includes(b.body)) Matter.World.add(refs.engineRef.current.world, b.body);
            });
        }, [state]);
        return null;
    }

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        bubbles = undefined;
        bodiesById = new Map();
        refs = {
            canvasRef: { current: container },
            engineRef: { current: null },
            renderRef: { current: null },
            wallsRef: { current: [] },
            manuallyStoppedPulsingRef: { current: new Set() },
            liveEditRef: { current: { editDialog: false, selectedBubbleId: null } },
        };
    });

    afterEach(() => {
        root.unmount();
        container.remove();
    });

    it('shows a task added, edited and deleted on device A on device B, one body per task', async () => {
        const deviceA = env.authenticatedContext(OWNER).firestore();
        const local = newTaskId(deviceA, OWNER);
        await createTask(deviceA, OWNER, local, FIELDS);
        root.render(createElement(DeviceB, { db: env.authenticatedContext(OWNER).firestore() }));
        await vi.waitFor(() => expect(bubbles?.[0]?.body).toBeDefined(), SYNC_WAIT);

        const remote = newTaskId(deviceA, OWNER);
        await createTask(deviceA, OWNER, remote, { ...FIELDS, title: 'Written on device A', radius: 40 });
        await vi.waitFor(() => expect(bubbles.map((b) => b.id)).toContain(remote), SYNC_WAIT);
        const added = bubbles.find((b) => b.id === remote);
        expect(added).toMatchObject({ title: 'Written on device A', radius: 40 });
        expect(added.body.circleRadius).toBe(40);

        await updateTask(deviceA, OWNER, remote, { title: 'Renamed on device A' });
        await vi.waitFor(() => expect(bubbles.find((b) => b.id === remote).title).toBe('Renamed on device A'), SYNC_WAIT);
        expect(bubbles.find((b) => b.id === remote).body).toBe(added.body);

        await deleteTaskForever(deviceA, OWNER, local);
        await vi.waitFor(() => expect(bubbles.map((b) => b.id)).toEqual([remote]), SYNC_WAIT);
        const circles = refs.engineRef.current.world.bodies.filter((body) => body.label === 'Circle Body');
        expect(circles).toEqual([added.body]);
        expect([...bodiesById.get(remote)]).toEqual([added.body]);
    });
});
````

- [ ] **Step 7: Убедиться, что тесты падают**

Run: `npx vitest run src/hooks/useMatterEngine.test.jsx`
Expected: FAIL — `Error: Invalid Firebase configuration. Please check your environment variables.`, `Tests  no tests`: старый хук тянет `firestoreService` → `src/firebase.js`.

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/canvasSync.data.test.js"`
Expected: FAIL — та же ошибка `Invalid Firebase configuration`.

- [ ] **Step 8: Перевести `src/hooks/useMatterEngine.js` на `subscribeTasks`**

Загрузка `loadBubblesFromFirestore`, клиентская чистка корзины `cleanupOldDeletedBubbles` (её делает сервер, `purgeDeletedTasks`) и пересборка всего списка на каждый снимок уходят; их место занимают подписка и `applyTaskChanges`.

````diff
diff --git a/src/hooks/useMatterEngine.js b/src/hooks/useMatterEngine.js
index c062c01..7380da9 100644
--- a/src/hooks/useMatterEngine.js
+++ b/src/hooks/useMatterEngine.js
@@ -1,19 +1,16 @@
 import { useEffect, useRef } from 'react';
 import Matter from 'matter-js';
 import { createWorldBounds } from '../utils/physicsUtils';
-import {
-    loadBubblesFromFirestore,
-    cleanupOldDeletedBubbles,
-    subscribeToBubblesUpdates,
-} from '../services/firestoreService';
-import { normalizeStoredBubble } from '../utils/bubbleData';
+import { bubbleFromTask } from '../services/data/bubbleModel';
+import { applyTaskChanges } from '../utils/taskSync';
 import logger from '../utils/logger';
 import { shouldPauseEngine } from '../utils/engineIdle';
 import { hexToRgba } from '../utils/colorUtils';
 
 /**
- * Initializes the Matter.js physics engine, renderer, and runner.
- * Loads initial bubbles from Firestore and subscribes to live updates.
+ * Initializes the Matter.js physics engine, renderer, and runner, and keeps the bubbles in step
+ * with the user's tasks through subscribeTasks(onChanges, onError) — the live changes of
+ * src/services/data/tasks.js, applied one by one (#94).
  *
  * Runs once on mount (empty dependency array — matches original behaviour).
  */
@@ -23,8 +20,6 @@ export function useMatterEngine({
     engineRef,
     renderRef,
     wallsRef,
-    stickyPulseRef,
-    lastDueRef,
     manuallyStoppedPulsingRef,
     // editDialog/selectedBubble are captured once at mount and stay stale inside the
     // subscription callback; live edit-dialog state is delivered via liveEditRef instead.
@@ -33,6 +28,8 @@ export function useMatterEngine({
     liveEditRef,
     // Bubbles state; the canvas click handler reads the latest value via bubblesRef.
     bubbles,
+    // (onChanges, onError) => unsubscribe: the signed-in user's live task changes.
+    subscribeTasks,
     // State setters
     setBubbles,
     setCanvasSize,
@@ -107,156 +104,63 @@ export function useMatterEngine({
         // Add walls to the world
         World.add(engine.world, walls);
 
-        // Stored bubble (Firestore doc) → in-memory bubble with a Matter.js body at a random
-        // position. Used by the initial load and by the live listener for ids it has not seen.
-        const createBubbleFromStored = (storedBubble) => {
-            // Create bubbles with random coordinates inside the current canvas: render.options
-            // follows resizes (useMatterResize), canvasSize is the size at mount.
+        // Task → bubble with a Matter.js body at a random spot inside the current canvas:
+        // render.options follows resizes (useMatterResize), canvasSize is the size at mount.
+        const createBubbleFromTask = (task) => {
             const { width, height } = render.options;
             const margin = isMobile ? 50 : 100;
             const x = Math.random() * (width - margin * 2) + margin;
             const y = Math.random() * (height - margin * 2) + margin;
-
-            // Определяем цвет тега для правильного fillStyle
-            let tagColor = null;
-            if (storedBubble.tagId) {
-                const tag = tags.find(t => t.id === storedBubble.tagId);
-                if (tag) {
-                    tagColor = tag.color;
-                }
-            }
+            const bubble = bubbleFromTask(task);
+            const tagColor = tags.find(t => t.id === bubble.tagId)?.color ?? null;
 
             return {
-                ...normalizeStoredBubble(storedBubble),
-                body: Matter.Bodies.circle(x, y, storedBubble.radius, {
+                ...bubble,
+                body: Matter.Bodies.circle(x, y, bubble.radius, {
                     restitution: 0.8,
                     frictionAir: 0.01,
                     render: {
                         fillStyle: getBubbleFillStyle(tagColor),
-                        strokeStyle: storedBubble.strokeStyle || theme?.custom?.bubble?.defaultStroke || '#2f6bdb',
+                        strokeStyle: tagColor || '#B0B0B0',
                         lineWidth: theme?.custom?.bubble?.strokeWidth ?? 1.5
                     }
                 })
             };
         };
 
-        // The live listener creates bodies only after the initial load has replaced the state:
-        // its first snapshot can come from the IndexedDB cache before getDocs answers, and
-        // bodies made for that state would stay in the world as duplicates.
-        let initialLoadDone = false;
-
-        // Load bubbles from Firestore
-        const loadInitialBubbles = async () => {
-            try {
-                const storedBubbles = await loadBubblesFromFirestore();
-                const initialBubbles = [];
-
-                if (storedBubbles.length > 0) {
-                    // Auto-cleanup old deleted bubbles
-                    const cleanedBubbles = await cleanupOldDeletedBubbles(storedBubbles);
-
-                    // Restore bubbles from Firestore with random positions
-                    cleanedBubbles.forEach(storedBubble => {
-                        const bubble = createBubbleFromStored(storedBubble);
-
-                        // Инициализируем stickyPulseRef для задач с overdueSticky
-                        if (bubble.overdueSticky) {
-                            stickyPulseRef.current.add(bubble.id);
-                        }
-                        // Восстанавливаем намерение «остановлено вручную» из персистентного поля
-                        if (bubble.overduePulseSuppressed) {
-                            manuallyStoppedPulsingRef.current.add(bubble.id);
-                        }
-                        initialBubbles.push(bubble);
-                    });
-                    // Убираем добавление всех пузырей в физический мир - они будут добавлены после фильтрации
+        // Live task changes, one by one. The first delivery (cache or server) builds the list;
+        // the bodies are added to the world after filtering (useBubbleWorld).
+        const unsubscribeTasks = subscribeTasks((changes, { initial }) => {
+            setBubbles(prev => applyTaskChanges(prev, changes, {
+                initial,
+                createBubble: createBubbleFromTask,
+                removeBody: (body) => World.remove(engine.world, body),
+            }));
+
+            // "Stop pulsing" is the task's pulseMuted, also when another device sets it.
+            changes.forEach(({ type, task }) => {
+                if (type !== 'removed' && task.pulseMuted) {
+                    manuallyStoppedPulsingRef.current.add(task.id);
+                } else {
+                    manuallyStoppedPulsingRef.current.delete(task.id);
                 }
+            });
 
-                setBubbles(initialBubbles);
-                // Не добавляем пузыри в физический мир сразу - они будут добавлены после применения фильтров
-            } catch (error) {
-                logger.error('Error loading initial bubbles:', error);
-                setBubbles([]);
-            } finally {
-                initialLoadDone = true;
+            // If edit dialog is open for a selected bubble, reflect live updates.
+            // Read live values via ref — editDialog/selectedBubble captured in this
+            // mount-effect closure are stale (always false/null).
+            const { editDialog: liveOpen, selectedBubbleId } = liveEditRef.current;
+            const change = liveOpen && selectedBubbleId != null
+                && changes.find(c => c.type === 'modified' && String(c.task.id) === String(selectedBubbleId));
+            if (change) {
+                const updated = bubbleFromTask(change.task);
+                // Update selected bubble fields but keep the Matter.js body instance
+                setSelectedBubble(prevSel => (prevSel ? { ...prevSel, ...updated, body: prevSel.body } : prevSel));
+                setEditDueDate(updated.dueDate ? parseLocalDateTime(updated.dueDate) : null);
+                setEditNotifications(updated.notifications);
+                setEditRecurrence(updated.recurrence);
             }
-        };
-
-        loadInitialBubbles();
-        // Subscribe to live bubbles updates (dueDate changes from server)
-        const unsubscribeBubbles = subscribeToBubblesUpdates((serverBubbles) => {
-            setBubbles(prev => {
-                const map = new Map(prev.map(b => [b.id, b]));
-                const merged = serverBubbles.map(sb => {
-                    const ex = map.get(sb.id);
-                    if (ex) return { ...ex, ...sb, body: ex.body };
-                    // An id we have not seen yet (e.g. created on another device) needs its own
-                    // body, otherwise it never reaches the canvas.
-                    return initialLoadDone ? createBubbleFromStored(sb) : sb;
-                });
-
-                // detect server state and make sticky by server flag (persists across reloads)
-                try {
-                    merged.forEach(sb => {
-                        const id = sb.id;
-                        const newDue = sb?.dueDate ? (parseLocalDateTime(sb.dueDate)?.getTime() ?? null) : null;
-
-                        // Намерение «остановлено вручную» — персистентное поле и единственный
-                        // источник правды. Зеркалим его в ref независимо от overdueSticky,
-                        // иначе серверное эхо overdueSticky=false сбрасывало бы остановку.
-                        if (sb?.overduePulseSuppressed) {
-                            manuallyStoppedPulsingRef.current.add(id);
-                        } else {
-                            manuallyStoppedPulsingRef.current.delete(id);
-                        }
-
-                        // Игнорируем серверные обновления stickyPulseRef для задач с overdueSticky - управляем только вручную
-                        if (sb?.overdueSticky) {
-                            if (newDue && Number.isFinite(newDue)) lastDueRef.current.set(id, newDue);
-                            return;
-                        }
-
-                        stickyPulseRef.current.delete(id);
-
-                        if (newDue && Number.isFinite(newDue)) lastDueRef.current.set(id, newDue);
-                    });
-                } catch { /* Ignore malformed remote pulse state. */ }
-
-                // If edit dialog is open for a selected bubble, reflect live updates.
-                // Read live values via ref — editDialog/selectedBubble captured in this
-                // mount-effect closure are stale (always false/null).
-                const { editDialog: liveOpen, selectedBubbleId } = liveEditRef.current;
-                if (liveOpen && selectedBubbleId != null) {
-                    const updated = merged.find(b => String(b.id) === String(selectedBubbleId));
-                    if (updated) {
-                        // Update selected bubble fields but keep the Matter.js body instance
-                        setSelectedBubble(prevSel => (prevSel ? { ...prevSel, ...updated, body: prevSel.body } : updated));
-                        // Update edit form states for dueDate/notifications/recurrence
-                        if (updated.dueDate) {
-                            try { const d = parseLocalDateTime(updated.dueDate); if (d && !isNaN(d.getTime())) setEditDueDate(d); else setEditDueDate(null); } catch (_) { setEditDueDate(null); }
-                        } else {
-                            setEditDueDate(null);
-                        }
-                        if (Array.isArray(updated.notifications)) {
-                            setEditNotifications(updated.notifications);
-                        }
-                        setEditRecurrence(updated.recurrence || null);
-                        // keep sticky pulsing even if editor opened (until user presses Stop)
-                    }
-                }
-
-                // Remove ghost Matter bodies: a task deleted on another device disappears
-                // from the server list but its body lingers in the world until reload.
-                const mergedIds = new Set(merged.map(b => String(b.id)));
-                prev.forEach(b => {
-                    if (b.body && !mergedIds.has(String(b.id))) {
-                        try { World.remove(engine.world, b.body); } catch { /* Body may already be removed. */ }
-                    }
-                });
-
-                return merged;
-            });
-        });
+        }, (error) => logger.error('Tasks listener error:', error));
 
         // Create mouse and constraints for drag and drop
         const mouse = Mouse.create(render.canvas);
@@ -587,7 +491,7 @@ export function useMatterEngine({
             Engine.clear(engine);
             render.canvas.remove();
             render.textures = {};
-            if (typeof unsubscribeBubbles === 'function') unsubscribeBubbles();
+            if (typeof unsubscribeTasks === 'function') unsubscribeTasks();
         };
     }, []); // Убираем themeMode из зависимостей
 }
````

- [ ] **Step 9: Подключить подписку в `BubblesPage` и убрать `lastDueRef`**

````diff
diff --git a/src/pages/BubblesPage.jsx b/src/pages/BubblesPage.jsx
index b1d30da..f4c2e9b 100644
--- a/src/pages/BubblesPage.jsx
+++ b/src/pages/BubblesPage.jsx
@@ -11,6 +11,8 @@ import { LS } from '../utils/storageKeys';
 import BubblesDialogs from '../components/BubblesDialogs';
 import TextOverlay from '../components/TextOverlay';
 import { logoutUser } from '../services/authService';
+import { db } from '../firebase';
+import { subscribeTasks } from '../services/data/tasks';
 import {
     loadBubblesFromFirestore,
     saveTagsToFirestore,
@@ -289,7 +291,6 @@ const BubblesPage = ({ user, themeMode }) => {
     // BubblesStore in Stage E of 010d; only the refs are consumed here.
     const {
         stickyPulseRef,
-        lastDueRef,
         manuallyStoppedPulsingRef,
         notifiedBubblesRef,
         notifiedBubbleNotificationsRef
@@ -314,13 +315,12 @@ const BubblesPage = ({ user, themeMode }) => {
         engineRef,
         renderRef,
         wallsRef,
-        stickyPulseRef,
-        lastDueRef,
         manuallyStoppedPulsingRef,
         editDialog,
         selectedBubble,
         liveEditRef,
         bubbles,
+        subscribeTasks: (onChanges, onError) => subscribeTasks(db, user.uid, onChanges, onError),
         setBubbles,
         setCanvasSize,
         setSelectedBubble,
````

````diff
diff --git a/src/hooks/useBubbleNotifications.js b/src/hooks/useBubbleNotifications.js
index df656f0..fbfadc3 100644
--- a/src/hooks/useBubbleNotifications.js
+++ b/src/hooks/useBubbleNotifications.js
@@ -44,7 +44,6 @@ export function useBubbleNotifications({
 
     // Refs for overdue/sticky pulse tracking
     const stickyPulseRef = useRef(new Set()); // keep pulsing after repeat-every reschedule
-    const lastDueRef = useRef(new Map());
     const manuallyStoppedPulsingRef = useRef(new Set()); // задачи, которые пользователь остановил вручную
 
     const notifiedBubblesRef = useRef(new Set());
@@ -252,7 +251,6 @@ export function useBubbleNotifications({
 
     return {
         stickyPulseRef,
-        lastDueRef,
         manuallyStoppedPulsingRef,
         notifiedBubblesRef,
         notifiedBubbleNotificationsRef
````

`normalizeStoredBubble` в `src/utils/bubbleData.js` больше никто не вызывает; задача 7 удаляет его вместе с остальными помощниками записей v1.

- [ ] **Step 10: Тесты проходят**

Run: `npx vitest run src/hooks/useMatterEngine.test.jsx`
Expected: PASS — `Tests  11 passed (11)`.

Run: `firebase emulators:exec --only firestore --project demo-to-round "npx vitest run --config vitest.rules.config.js firestore-tests/canvasSync.data.test.js"`
Expected: PASS — `Tests  1 passed (1)`.

- [ ] **Step 11: Все тесты эмулятора, веб и линтер**

Run: `npm run test:rules`, затем `npm test` и `npm run lint`
Expected: `Test Files  10 passed (10)`, `Tests  111 passed (111)`; веб — `Test Files  39 passed (39)`, `Tests  549 passed (549)`; линтер без ошибок.

- [ ] **Step 12: Commit**

```bash
git add src/utils/taskSync.js src/utils/taskSync.test.js src/hooks/useMatterEngine.js src/hooks/useMatterEngine.test.jsx src/hooks/useBubbleNotifications.js src/pages/BubblesPage.jsx firestore-tests/canvasSync.data.test.js
git commit -F - <<'EOF'
feat(bubbles): live canvas sync of users/{uid}/tasks, change by change

The canvas subscribes to the task changes and applies them one by one with a
single document -> bubble function: added, modified and removed tasks from
another device show up without a reload and with exactly one Matter body.
Two-client emulator test (idea and code from 93eb068, on v2 paths).

Closes #94

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Импорт и экспорт v1 скрыты до 0.6

Старый импорт пишет в `user-bubbles`/`user-tags`, которые по правилам v2 доступны только для чтения, а экспорт выдаёт формат v1. Бэкап v2 с импортом обоих форматов делает подплан 0.6; до него пункты меню скрыты (решение владельца). Вместе с ними уходят помощники записей v1 из `src/utils/bubbleData.js`, которые после задачи 6 никто не вызывает.

**Files:**
- Delete: `src/hooks/useBubbleImportExport.js`, `src/hooks/useBubbleImportExport.test.jsx`, `src/utils/bubbleJson.js`, `src/utils/bubbleJson.test.js`, `src/utils/exportJson.js`, `src/utils/bubbleData.test.js`
- Modify: `src/components/MainMenuDrawer.jsx`, `src/components/BubblesDialogs.jsx`, `src/pages/BubblesPage.jsx`, `src/utils/bubbleData.js`

**Interfaces:**
- Consumes: ничего нового.
- Produces: в главном меню нет «Export JSON» и «Import JSON»; `MainMenuDrawer` больше не принимает `onExportJson`/`onImportJson`, `BubblesDialogs` — `handleExportJson`/`handleImportJson`. В `src/utils/bubbleData.js` остаются только `BUBBLES_PLANNED_TASKS_VIEW_LS_KEY` и `readBubbleViewPlannedTasksFromLS` (их убирает задача 10). Строки переводов `bubbles.exportJson`, `bubbles.importJson` и т. п. остаются — их снова использует 0.6.

- [ ] **Step 1: Удалить файлы старого импорта и экспорта**

```bash
git rm src/hooks/useBubbleImportExport.js src/hooks/useBubbleImportExport.test.jsx src/utils/bubbleJson.js src/utils/bubbleJson.test.js src/utils/exportJson.js src/utils/bubbleData.test.js
```

- [ ] **Step 2: Убрать пункты меню и проводку**

````diff
diff --git a/src/components/MainMenuDrawer.jsx b/src/components/MainMenuDrawer.jsx
index 0d92882..5822681 100644
--- a/src/components/MainMenuDrawer.jsx
+++ b/src/components/MainMenuDrawer.jsx
@@ -1,5 +1,4 @@
-import React, { useRef } from 'react';
-import logger from '../utils/logger';
+import React from 'react';
 import { Drawer, Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Switch } from '@mui/material';
 import { useTranslation } from 'react-i18next';
 import {
@@ -11,8 +10,6 @@ import {
     Info,
     Logout,
     Sell,
-    FileDownload,
-    FileUpload,
     ViewListOutlined,
     AccountTreeOutlined,
     LockOutlined
@@ -38,43 +35,9 @@ const MainMenuDrawer = ({
     onOpenChangePasswordDialog,
     onOpenMindMap,
     onAbout,
-    onLogout,
-    onExportJson,
-    onImportJson
+    onLogout
 }) => {
     const { t } = useTranslation();
-    const fileInputRef = useRef(null);
-
-    const handleImportClick = () => {
-        if (fileInputRef.current) {
-            fileInputRef.current.value = '';
-            fileInputRef.current.click();
-        }
-    };
-
-    const handleFileChange = (event) => {
-        try {
-            const file = event.target.files && event.target.files[0];
-            if (!file) return;
-            const reader = new FileReader();
-            reader.onload = () => {
-                try {
-                    const text = reader.result;
-                    const parsed = JSON.parse(text);
-                    onClose();
-                    onImportJson && onImportJson(parsed);
-                } catch (e) {
-                    logger.error('Invalid JSON file', e);
-                    window.alert(t('bubbles.importInvalidJson'));
-                }
-            };
-            reader.readAsText(file);
-        } catch (e) {
-            logger.error('Failed to import JSON', e);
-            window.alert(t('bubbles.importFailed'));
-        }
-    };
-
     return (
         <Drawer
             anchor="left"
@@ -124,42 +87,6 @@ const MainMenuDrawer = ({
 
                     <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />
 
-                    <ListItemButton
-                        onClick={() => {
-                            onClose();
-                            onExportJson && onExportJson();
-                        }}
-                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
-                    >
-                        <ListItemIcon sx={{ minWidth: 40 }}>
-                            <FileDownload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
-                        </ListItemIcon>
-                        <ListItemText
-                            primary={t('bubbles.exportJson')}
-                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
-                        />
-                    </ListItemButton>
-
-                    <ListItemButton
-                        onClick={handleImportClick}
-                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
-                    >
-                        <ListItemIcon sx={{ minWidth: 40 }}>
-                            <FileUpload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
-                        </ListItemIcon>
-                        <ListItemText
-                            primary={t('bubbles.importJson')}
-                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
-                        />
-                        <input
-                            type="file"
-                            accept="application/json"
-                            ref={fileInputRef}
-                            onChange={handleFileChange}
-                            style={{ display: 'none' }}
-                        />
-                    </ListItemButton>
-
                     <ListItem sx={{ padding: '16px 24px' }}>
                         <ListItemIcon sx={{ minWidth: 40 }}>
                             <LanguageOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
````

````diff
diff --git a/src/components/BubblesDialogs.jsx b/src/components/BubblesDialogs.jsx
index 4cc1f17..85d7814 100644
--- a/src/components/BubblesDialogs.jsx
+++ b/src/components/BubblesDialogs.jsx
@@ -55,8 +55,6 @@ const BubblesDialogs = ({
     categoriesPanelEnabled,
     handleToggleCategoriesPanel,
     handleLogout,
-    handleExportJson,
-    handleImportJson,
     // Create bubble dialog
     createDialog,
     setCreateDialog,
@@ -255,8 +253,6 @@ const BubblesDialogs = ({
                 onOpenMindMap={onOpenMindMap}
                 onAbout={() => setAboutOpen(true)}
                 onLogout={handleLogout}
-                onExportJson={handleExportJson}
-                onImportJson={handleImportJson}
             />
 
             <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} t={t} />
````

````diff
diff --git a/src/pages/BubblesPage.jsx b/src/pages/BubblesPage.jsx
index f4c2e9b..14bcafc 100644
--- a/src/pages/BubblesPage.jsx
+++ b/src/pages/BubblesPage.jsx
@@ -37,7 +37,6 @@ import { useMatterEngine } from '../hooks/useMatterEngine';
 import { useDraggableFab } from '../hooks/useDraggableFab';
 import { useBubbleFilters } from '../hooks/useBubbleFilters';
 import { useListFilters } from '../hooks/useListFilters';
-import { useBubbleImportExport } from '../hooks/useBubbleImportExport';
 import { useBubbleWorld } from '../hooks/useBubbleWorld';
 import { useTags } from '../hooks/useTags';
 import { useBubbleNotifications } from '../hooks/useBubbleNotifications';
@@ -194,13 +193,6 @@ const BubblesPage = ({ user, themeMode }) => {
         getBubbleCountByTagForListView,
     } = useListFilters({ tags });
 
-    // JSON import/export handlers extracted into useBubbleImportExport (Task D of #68).
-    // Now uses BubblesStore directly for bubbles/tags state.
-    const {
-        handleExportJson,
-        handleImportJson,
-    } = useBubbleImportExport();
-
     const [categoriesDrawerOpen, setCategoriesDrawerOpen] = useState(false); // Состояние панели категорий
     // categoriesDialog moved to BubblesStore (Stage H of 010d).
     // Dialog open-flags (filter/menu/font/appearance/change-password/logout/list-view)
@@ -639,9 +631,6 @@ const BubblesPage = ({ user, themeMode }) => {
         setEditRecurrence(value);
     }, []);
 
-    // JSON import/export (handleExportJson / handleImportJson) now lives in
-    // useBubbleImportExport (Task D of #68); sourced from the hook above.
-
     // open-bubble deep-link listener now lives in useBubbleCrud (Task 5/6 of #38).
 
     // Авто-открытие по URL-параметру (?bubbleId=...) даже если событие было пропущено
@@ -904,8 +893,6 @@ const BubblesPage = ({ user, themeMode }) => {
                 categoriesPanelEnabled={categoriesPanelEnabled}
                 handleToggleCategoriesPanel={handleToggleCategoriesPanel}
                 handleLogout={handleLogout}
-                handleExportJson={handleExportJson}
-                handleImportJson={handleImportJson}
                 createDialog={createDialog}
                 setCreateDialog={setCreateDialog}
                 handleSetCreateRecurrence={handleSetCreateRecurrence}
````

- [ ] **Step 3: Оставить в `src/utils/bubbleData.js` только чтение режима «Запланированные»**

Заменить файл целиком:

````js
/**
 * Pure data helpers for bubbles/tags extracted from BubblesPage.
 * No Matter.js / Firestore / DOM side effects.
 */
import { lsGet } from './storage';

/** Режим «Запланированные» на холсте (как вкладка в списке задач): совпадает с фильтром по дате. */
export const BUBBLES_PLANNED_TASKS_VIEW_LS_KEY = 'bubbles-planned-tasks-only';

export function readBubbleViewPlannedTasksFromLS() {
    return lsGet(BUBBLES_PLANNED_TASKS_VIEW_LS_KEY, false) === true;
}
````

- [ ] **Step 4: Убедиться, что ссылок не осталось**

Run: `grep -rn "ImportExport\|bubbleJson\|exportJson\|ExportJson\|ImportJson\|sanitizeBubble\|normalizeStoredBubble\|toIsoOrNull" src --include=*.js --include=*.jsx`
Expected: пусто.

- [ ] **Step 5: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  36 passed (36)`, `Tests  511 passed (511)` (−38: 6 тестов импорта/экспорта, 15 — `bubbleJson`, 17 — `bubbleData`); линтер без ошибок.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/MainMenuDrawer.jsx src/components/BubblesDialogs.jsx src/pages/BubblesPage.jsx src/utils/bubbleData.js
git commit -F - <<'EOF'
feat(web): hide the v1 import and export until the v2 backup (sub-plan 0.6)

The v1 import wrote to collections that are read-only under the v2 rules;
the menu items return with the v2 backup. The v1 record helpers that only
import and the old canvas load used go too.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Запись задач из интерфейса и ссылки `?taskId=`

**Files:**
- Create: `src/utils/deepLink.js`
- Test: `src/utils/deepLink.test.js`, `src/hooks/useBubbleCrud.test.jsx`, `src/components/ListViewDrawer.test.jsx`
- Modify: `src/hooks/useBubbleCrud.js`, `src/components/TaskList.jsx`, `src/components/ListViewDrawer.jsx`, `src/components/BubblesDialogs.jsx`, `src/pages/BubblesPage.jsx`, `src/index.jsx`, `src/services/firestoreService.js`
- Delete: `src/services/buildStatusFields.test.js`

**Interfaces:**
- Consumes: `newTaskId`, `createTask`, `updateTask`, `trashTask`, `restoreTask`, `deleteTaskForever`, `completeTask`, `completionChanges`, `muteTaskPulse` (задача 3); `bubbleFromTask`, `withTaskChanges`, `taskFieldsFromForm`, `taskChangesFromForm` (задача 5).
- Produces:
  - `src/utils/deepLink.js`: `deepLinkTaskId(search): string | null` — `?taskId=`, иначе старый `?bubbleId=`;
  - `useBubbleCrud({ …, uid })` — новый обязательный аргумент `uid`; хук больше не возвращает `createBubble` и `clearAllBubbles`; переключатель «простой/форматированный» меняет только режим окна;
  - `TaskList`, `TaskListDrawer` (`ListViewDrawer.jsx`) и `BubblesDialogs` принимают `uid` вместо `setBubbles`;
  - в `src/services/firestoreService.js` остаются `BUBBLE_STATUS`, `getBubblesByStatus`, функции тегов и `updateBubbleFields` (им пока пользуется `useTags`; всё это убирает задача 9).

Выдвижной список задач (`ListViewDrawer`) рендерит `TaskList` со своими пропсами, отдельно от полноэкранного списка. Без `uid` в нём кнопки задачи падали бы на `doc(db, 'users', undefined, …)` — так это и проявилось при проверке вживую, поэтому у выдвижного списка свой тест.

- [ ] **Step 1: Написать падающий тест `src/utils/deepLink.test.js`**

````js
import { describe, expect, it } from 'vitest';
import { deepLinkTaskId } from './deepLink';

describe('deepLinkTaskId (spec 4.4)', () => {
    it('reads the task of a v2 notification link', () => {
        expect(deepLinkTaskId('?taskId=t1')).toBe('t1');
    });

    it('still opens the old ?bubbleId= links', () => {
        expect(deepLinkTaskId('?bubbleId=b1')).toBe('b1');
    });

    it('prefers taskId when a link has both', () => {
        expect(deepLinkTaskId('?bubbleId=b1&taskId=t1')).toBe('t1');
    });

    it('returns null for a link without a task', () => {
        expect(deepLinkTaskId('')).toBeNull();
        expect(deepLinkTaskId('?taskId=')).toBeNull();
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/utils/deepLink.test.js`
Expected: FAIL — `Error: Cannot find module './deepLink' imported from …/src/utils/deepLink.test.js`, `Tests  no tests`.

- [ ] **Step 3: Написать `src/utils/deepLink.js`**

````js
/**
 * The task a notification link opens: ?taskId=<id> (data contract v2, spec 4.4) or the old
 * ?bubbleId=<id>. search is window.location.search.
 */
export const deepLinkTaskId = (search) => {
    const params = new URLSearchParams(search);
    return params.get('taskId') || params.get('bubbleId') || null;
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/utils/deepLink.test.js`
Expected: PASS — `Tests  4 passed (4)`.

- [ ] **Step 5: Написать падающие тесты записи задач**

`src/hooks/useBubbleCrud.test.jsx` — хук в настоящих хранилищах, слой данных подменён:

````jsx
// @vitest-environment happy-dom
import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Matter from 'matter-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BubblesDataProvider, useBubblesData } from '../state/BubblesDataStore';
import { BubblesUiProvider, useBubblesUi } from '../state/BubblesUiStore';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { createTask, trashTask, updateTask } from '../services/data/tasks';
import { useBubbleCrud } from './useBubbleCrud';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/tasks', async (importOriginal) => ({
    ...(await importOriginal()),
    newTaskId: vi.fn(() => 'new-id'),
    createTask: vi.fn(() => Promise.resolve()),
    updateTask: vi.fn(() => Promise.resolve()),
    trashTask: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const TASK = {
    id: 't1',
    title: 'Pay bills',
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
};

describe('useBubbleCrud: task writes through the v2 data layer', () => {
    let container;
    let root;
    let engineRef;
    let crud;
    let data;
    let ui;

    function Probe() {
        data = useBubblesData();
        ui = useBubblesUi();
        const { register } = ui;
        useEffect(() => { register({ getBubbleFillStyle: () => 'fill' }); }, [register]);
        crud = useBubbleCrud({
            engineRef,
            renderRef: { current: {} },
            bubbles: data.bubbles,
            setBubbles: data.setBubbles,
            theme: {},
            isMobile: false,
            uid: 'u1',
        });
        return null;
    }

    // A bubble on the canvas, opened in the edit dialog as a click would open it.
    const openInDialog = (task) => {
        const bubble = { ...bubbleFromTask(task), body: Matter.Bodies.circle(100, 100, task.radius) };
        Matter.World.add(engineRef.current.world, bubble.body);
        act(() => data.setBubbles([bubble]));
        act(() => {
            crud.setSelectedBubble(bubble);
            ui.setSelectedTagId(bubble.tagId || '');
            ui.setEditBubbleSize(bubble.radius);
        });
        return bubble;
    };

    const save = (bubble, overrides) => act(() => crud.handleSaveBubble({
        title: bubble.title,
        description: bubble.description,
        editDueDate: null,
        editNotifications: bubble.notifications,
        editRecurrence: bubble.recurrence,
        manuallyStoppedPulsingRef: { current: new Set() },
        setEditDueDate: vi.fn(),
        ...overrides,
    }));

    beforeEach(() => {
        engineRef = { current: Matter.Engine.create() };
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<BubblesDataProvider><BubblesUiProvider><Probe /></BubblesUiProvider></BubblesDataProvider>));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('creates the task with the values of the create dialog and shows it at once', () => {
        act(() => crud.createNewBubble({
            title: 'Pay bills',
            description: '',
            canvasSize: { width: 800, height: 600 },
            dueDate: null,
            createNotifications: [],
            createRecurrence: null,
            setDueDate: vi.fn(),
        }));

        expect(createTask).toHaveBeenCalledWith('db', 'u1', 'new-id', {
            title: 'Pay bills', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45,
        });
        expect(data.bubbles).toEqual([expect.objectContaining({ id: 'new-id', title: 'Pay bills', status: 'active' })]);
        expect(engineRef.current.world.bodies).toContain(data.bubbles[0].body);
    });

    it('saves only the fields the user changed', () => {
        const bubble = openInDialog(TASK);
        save(bubble, { title: 'Pay all bills' });
        expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { title: 'Pay all bills' });
        expect(data.bubbles[0]).toMatchObject({ title: 'Pay all bills' });
    });

    it('writes nothing when the dialog is saved unchanged', () => {
        save(openInDialog(TASK));
        expect(updateTask).not.toHaveBeenCalled();
    });

    it('keeps the editor mode out of Firestore: v2 stores the description as Markdown', () => {
        openInDialog(TASK);
        act(() => crud.handleToggleEditUseRichText(true));
        expect(crud.useRichTextEdit).toBe(true);
        expect(updateTask).not.toHaveBeenCalled();
    });

    it('moves a deleted task to the trash', () => {
        openInDialog(TASK);
        act(() => { crud.handleDeleteBubble(); });
        expect(trashTask).toHaveBeenCalledWith('db', 'u1', 't1');
        expect(data.bubbles[0].status).toBe('deleted');
    });

    it('moves a repeating task to its next due on "Done" and keeps it on the canvas', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-10-14T10:00:00.000Z'));
        const bubble = openInDialog({ ...TASK, due: { local: '2026-10-10T09:00', tz: 'Europe/Berlin' }, repeat: { every: 1, unit: 'days' } });

        act(() => { crud.handleMarkAsDone(); });

        expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        expect(data.bubbles[0]).toMatchObject({ status: 'active', due: { local: '2026-10-15T09:00', tz: 'Europe/Berlin' } });
        expect(engineRef.current.world.bodies).toContain(bubble.body);
    });

    it('finishes a one-off task after the pop animation', async () => {
        openInDialog(TASK);
        act(() => { crud.handleMarkAsDone(); });
        await vi.waitFor(() => expect(updateTask).toHaveBeenCalledWith('db', 'u1', 't1', { status: 'done' }));
    });
});
````

`src/components/ListViewDrawer.test.jsx` — кнопки выдвижного списка пишут задачи вошедшего пользователя:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bubbleFromTask } from '../services/data/bubbleModel';
import { completeTask, trashTask } from '../services/data/tasks';
import TaskListDrawer from './ListViewDrawer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../i18n', () => ({ default: { language: 'en' } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } }),
}));
vi.mock('../services/data/tasks', () => ({
    completeTask: vi.fn(() => Promise.resolve()),
    deleteTaskForever: vi.fn(() => Promise.resolve()),
    restoreTask: vi.fn(() => Promise.resolve()),
    trashTask: vi.fn(() => Promise.resolve()),
}));

const TASK = {
    id: 't1',
    title: 'Pay bills',
    description: '',
    categoryId: null,
    status: 'active',
    due: null,
    reminders: [],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    deletedAt: null,
};

describe('TaskListDrawer: list actions of the signed-in user', () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(
            <TaskListDrawer
                open
                onClose={vi.fn()}
                isMobile={false}
                themeMode="light"
                bubbles={[bubbleFromTask(TASK)]}
                uid="u1"
                tags={[]}
                listFilter="active"
                setListFilter={vi.fn()}
                listSortBy="updatedAt"
                setListSortBy={vi.fn()}
                listSortOrder="desc"
                setListSortOrder={vi.fn()}
                listFilterTags={[]}
                setListFilterTags={vi.fn()}
                listShowNoTag
                setListShowNoTag={vi.fn()}
                listSearchQuery=""
                setListSearchQuery={vi.fn()}
                setSelectedBubble={vi.fn()}
                setSelectedTagId={vi.fn()}
                setEditDialog={vi.fn()}
                handleListTagFilterChange={vi.fn()}
                handleListNoTagFilterChange={vi.fn()}
                clearAllListFilters={vi.fn()}
                selectAllListFilters={vi.fn()}
                getBubbleCountByTagForListView={() => 0}
                isAllListFiltersSelected
                onOpenFilterMenu={vi.fn()}
            />
        ));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    const click = (title) => act(() => document.querySelector(`button[title="${title}"]`).click());

    it('moves a task to the trash of the signed-in user', () => {
        click('bubbles.deleteBubble');
        expect(trashTask).toHaveBeenCalledWith('db', 'u1', 't1');
    });

    it('marks a task done for the signed-in user', () => {
        click('bubbles.markAsDone');
        expect(completeTask).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ id: 't1' }));
    });
});
````

- [ ] **Step 6: Убедиться, что тесты падают**

Run: `npx vitest run src/hooks/useBubbleCrud.test.jsx src/components/ListViewDrawer.test.jsx`
Expected: FAIL — `Tests  7 failed | 2 passed (9)`: в `useBubbleCrud` падают создание, сохранение, корзина и оба «Готово» (`expected "vi.fn()" to be called with arguments: [ 'db', 'u1', … ]`), а «writes nothing…» и «keeps the editor mode…» проходят и на старом коде; оба теста выдвижного списка падают с `expected "vi.fn()" to be called with arguments: [ 'db', 'u1', 't1' ]`.

- [ ] **Step 7: Перевести `src/hooks/useBubbleCrud.js` на слой данных**

Создание показывает пузырь сразу и пишет задачу с автоматическим id; «Сохранить» пишет только изменённые поля (ничего — без изменений); удаление переносит в корзину; «Готово» у повторяющейся задачи переносит срок без анимации, у обычной — после анимации ставит `done`.

````diff
diff --git a/src/hooks/useBubbleCrud.js b/src/hooks/useBubbleCrud.js
index 68c85b5..14a6096 100644
--- a/src/hooks/useBubbleCrud.js
+++ b/src/hooks/useBubbleCrud.js
@@ -1,24 +1,18 @@
 import { useEffect, useState } from 'react';
 import Matter from 'matter-js';
-import {
-    BUBBLE_STATUS,
-    markBubbleAsDeleted,
-    clearBubblesFromFirestore,
-    upsertBubble,
-    updateBubbleFields,
-    buildStatusFields
-} from '../services/firestoreService';
+import { db } from '../firebase';
+import { completionChanges, createTask, newTaskId, trashTask, updateTask } from '../services/data/tasks';
+import { bubbleFromTask, taskChangesFromForm, taskFieldsFromForm, withTaskChanges } from '../services/data/bubbleModel';
 import logger from '../utils/logger';
-import { formatLocalDateTime, getUserTimeZone, parseLocalDateTime } from '../utils/dateTime';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
 
 /**
  * Bubble create/edit/delete/done CRUD + dialog state, extracted from
- * BubblesPage (Task 5/6 of #38). This is also the "bubbles sync" layer —
- * optimistic local updates paired with upsertBubble / updateBubbleFields /
- * markBubbleAsDeleted from firestoreService (the live read subscription itself
- * lives in useMatterEngine).
+ * BubblesPage (Task 5/6 of #38). Writes go to users/{uid}/tasks through
+ * src/services/data/tasks.js; the live subscription in useMatterEngine brings
+ * every change back. Local updates are made right away only where a Matter
+ * body changes (new, re-created, removed from the canvas).
  *
  * `bubbles`/`setBubbles` and the Matter refs stay owned by BubblesPage and are
  * passed in directly. This hook runs early (it owns selectedBubble/editDialog,
@@ -28,7 +22,7 @@ import { useBubblesUi } from '../state/BubblesUiStore';
  * and page-local UI values (canvasSize + the create/edit notification state) are
  * passed as explicit handler arguments by BubblesPage.
  */
-export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile }) {
+export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile, uid }) {
     const { tags } = useBubblesData();
     const {
         registered,
@@ -46,42 +40,19 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
     const [useRichTextCreate, setUseRichTextCreate] = useState(false);
     const [useRichTextEdit, setUseRichTextEdit] = useState(false);
 
-    // Bubble creation function
-    const createBubble = (x, y, radius, tagId = null) => {
+    // Matter.js body of a bubble, coloured by its category (tag)
+    const createBody = (x, y, radius, tagId) => {
         const { getBubbleFillStyle } = registered;
-        let strokeColor = '#B0B0B0'; // light gray color by default
-        let tagColor = null;
-
-        if (tagId) {
-            const tag = tags.find(t => t.id === tagId);
-            if (tag) {
-                strokeColor = tag.color;
-                tagColor = tag.color;
-            }
-        }
-
-        const body = Matter.Bodies.circle(x, y, radius, {
+        const tagColor = tags.find(t => t.id === tagId)?.color ?? null;
+        return Matter.Bodies.circle(x, y, radius, {
             restitution: 0.8,
             frictionAir: 0.01,
             render: {
                 fillStyle: getBubbleFillStyle(tagColor),
-                strokeStyle: strokeColor,
+                strokeStyle: tagColor || '#B0B0B0', // light gray color by default
                 lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5
             }
         });
-
-        return {
-            id: Math.random().toString(36).substr(2, 9),
-            body,
-            radius,
-            title: '',
-            description: '',
-            tagId,
-            status: BUBBLE_STATUS.ACTIVE,
-            createdAt: new Date().toISOString(),
-            updatedAt: new Date().toISOString(),
-            deletedAt: null,
-        };
     };
 
     // Function for opening create bubble dialog
@@ -109,27 +80,26 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
         }
 
         const margin = isMobile ? 50 : 100;
-
-        const newBubble = createBubble(
-            Math.random() * (canvasSize.width - margin * 2) + margin,
-            50,
-            bubbleSize, // Используем выбранный размер
-            selectedTagId || null
-        );
-
-        // Set title, description, dueDate, recurrence
-        newBubble.title = title;
-        newBubble.description = description;
-        newBubble.dueDate = formatLocalDateTime(dueDate);
-        newBubble.tz = getUserTimeZone();
-        newBubble.notifications = createNotifications;
-        newBubble.recurrence = createRecurrence;
-        // persist editor mode per task
-        newBubble.useRichText = !!useRichTextCreate;
+        const fields = taskFieldsFromForm({
+            title,
+            description,
+            useRichText: useRichTextCreate,
+            tagId: selectedTagId,
+            radius: bubbleSize, // Используем выбранный размер
+            dueDate,
+            notifications: createNotifications,
+            recurrence: createRecurrence,
+        });
+        const id = newTaskId(db, uid);
+        const now = new Date().toISOString();
+        const newBubble = {
+            ...bubbleFromTask({ id, ...fields, status: 'active', pulseMuted: false, createdAt: now, updatedAt: now, deletedAt: null }),
+            body: createBody(Math.random() * (canvasSize.width - margin * 2) + margin, 50, bubbleSize, fields.categoryId),
+        };
 
         Matter.World.add(engineRef.current.world, newBubble.body);
         setBubbles(prev => [...prev, newBubble]);
-        upsertBubble(newBubble).catch(e => logger.error('Error saving new bubble:', e));
+        createTask(db, uid, id, fields).catch(e => logger.error('Error saving new bubble:', e));
 
         // Close dialog and reset form
         setCreateDialog(false);
@@ -137,87 +107,41 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
         setDueDate(null);
     };
 
-    // Save bubble changes
+    // Save bubble changes: only the fields the user changed are written
     const handleSaveBubble = ({ title, description, editDueDate, editNotifications, editRecurrence, manuallyStoppedPulsingRef, setEditDueDate }) => {
-        const { getBubbleFillStyle } = registered;
         if (!title.trim()) return;
         if (selectedBubble && engineRef.current) {
-            // Сначала обновляем физическое тело
-            const { Bodies } = Matter;
-
-            // Определяем стили для тела
-            let strokeColor = '#B0B0B0';
-            let fillStyle = getBubbleFillStyle(null);
-
-            if (selectedTagId) {
-                const tag = tags.find(t => t.id === selectedTagId);
-                if (tag) {
-                    strokeColor = tag.color;
-                    fillStyle = getBubbleFillStyle(tag.color);
-                }
+            const changes = taskChangesFromForm(selectedBubble, {
+                title,
+                description,
+                useRichText: useRichTextEdit,
+                tagId: selectedTagId,
+                radius: editBubbleSize,
+                dueDate: editDueDate,
+                notifications: editNotifications,
+                recurrence: editRecurrence,
+            });
+            // A new due starts a new cycle: the "stopped manually" mark goes, like pulseMuted.
+            if (changes.due !== undefined) {
+                manuallyStoppedPulsingRef.current.delete(selectedBubble.id);
             }
 
-            // Создаем новое тело с обновленными параметрами
-            const newBody = Bodies.circle(
-                selectedBubble.body.position.x,
-                selectedBubble.body.position.y,
-                editBubbleSize,
-                {
-                    restitution: 0.8,
-                    frictionAir: 0.01,
-                    render: {
-                        fillStyle: fillStyle,
-                        strokeStyle: strokeColor,
-                        lineWidth: theme.custom?.bubble?.strokeWidth ?? 1.5
-                    }
-                }
-            );
-
-            // Удаляем старое тело и добавляем новое
-            const worldBodies = engineRef.current.world.bodies;
-            const bodyExists = worldBodies.some(body => body.id === selectedBubble.body.id);
-
-            if (bodyExists) {
+            // Удаляем старое тело и добавляем новое (размер и цвет могли измениться)
+            const newBody = createBody(selectedBubble.body.position.x, selectedBubble.body.position.y, editBubbleSize, selectedTagId || null);
+            if (engineRef.current.world.bodies.some(body => body.id === selectedBubble.body.id)) {
                 Matter.World.remove(engineRef.current.world, selectedBubble.body);
             }
             Matter.World.add(engineRef.current.world, newBody);
 
-            // Теперь обновляем состояние
-            const newDueDate = formatLocalDateTime(editDueDate);
-
-            // Проверяем, изменилась ли дата на будущую и нужно ли отключить пульсацию
-            const shouldDisablePulsing = newDueDate &&
-                parseLocalDateTime(newDueDate) > new Date();
-
-            // Отключаем пульсацию при удалении даты
-            const shouldDisablePulsingOnDelete = !newDueDate && selectedBubble.dueDate;
-
-            // Дата изменилась на будущую или удалена — начинаем новый цикл:
-            // сбрасываем и in-memory флаг, и персистентный overduePulseSuppressed.
-            const dateChanged = shouldDisablePulsing || shouldDisablePulsingOnDelete;
-            if (dateChanged) {
-                manuallyStoppedPulsingRef.current.delete(selectedBubble.id);
-            }
-
+            const hasChanges = Object.keys(changes).length > 0;
             const updatedBubble = {
-                ...selectedBubble,
-                title,
-                description,
-                tagId: selectedTagId || null,
-                radius: editBubbleSize,
+                ...withTaskChanges(selectedBubble, hasChanges ? { ...changes, updatedAt: new Date().toISOString() } : {}),
                 body: newBody,
-                updatedAt: new Date().toISOString(),
-                dueDate: newDueDate,
-                tz: getUserTimeZone(),
-                notifications: editNotifications,
-                recurrence: editRecurrence,
-                overdueSticky: dateChanged ? false : selectedBubble.overdueSticky,
-                overdueAt: dateChanged ? null : selectedBubble.overdueAt,
-                overduePulseSuppressed: dateChanged ? false : selectedBubble.overduePulseSuppressed
             };
-
             setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? updatedBubble : b)));
-            upsertBubble(updatedBubble).catch(e => logger.error('Error saving bubble edit:', e));
+            if (hasChanges) {
+                updateTask(db, uid, selectedBubble.id, changes).catch(e => logger.error('Error saving bubble edit:', e));
+            }
         }
 
         setEditDialog(false);
@@ -226,28 +150,38 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
         // Не сбрасываем размер - он будет установлен при следующем открытии диалога
     };
 
-    // Delete bubble (mark as deleted)
-    const handleDeleteBubble = async () => {
+    // Delete bubble (move it to the trash)
+    const handleDeleteBubble = () => {
         if (selectedBubble && engineRef.current) {
-            try {
-                // Remove from Matter.js world
-                Matter.World.remove(engineRef.current.world, selectedBubble.body);
+            // Remove from Matter.js world
+            Matter.World.remove(engineRef.current.world, selectedBubble.body);
 
-                // Mark as deleted in Firestore
-                const updatedBubbles = await markBubbleAsDeleted(selectedBubble.id, bubbles);
-                setBubbles(updatedBubbles);
-            } catch (error) {
-                logger.error('Error deleting bubble:', error);
-            }
+            const deleted = { status: 'deleted', deletedAt: new Date().toISOString() };
+            setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? withTaskChanges(b, deleted) : b)));
+            trashTask(db, uid, selectedBubble.id).catch(error => logger.error('Error deleting bubble:', error));
         }
         setEditDialog(false);
         setSelectedBubble(null);
         // Не сбрасываем размер - он будет установлен при следующем открытии диалога
     };
 
+    // "Done" (spec 4.1): the changes go to the bubble at once and to Firestore
+    const completeSelected = () => {
+        const changes = completionChanges(selectedBubble, new Date());
+        setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? withTaskChanges(b, changes) : b)));
+        updateTask(db, uid, selectedBubble.id, changes).catch(e => logger.error('Error marking bubble as done:', e));
+    };
+
     // Mark bubble as done
     const handleMarkAsDone = async () => {
-        if (selectedBubble && engineRef.current) {
+        if (selectedBubble && engineRef.current && selectedBubble.repeat && selectedBubble.due) {
+            // A repeating task moves to its next due and stays on the canvas: no pop
+            try {
+                completeSelected();
+            } catch (error) {
+                logger.error('Error marking bubble as done:', error);
+            }
+        } else if (selectedBubble && engineRef.current) {
             try {
                 // Анимация лопания с брызгами и звуком
                 const bubble = selectedBubble;
@@ -327,21 +261,14 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
                             Matter.World.remove(engineRef.current.world, body);
                             Matter.World.remove(engineRef.current.world, splashParticles);
                             // Обновляем статус в Firestore
-                            const fields = buildStatusFields(selectedBubble, BUBBLE_STATUS.DONE);
-                            updateBubbleFields(selectedBubble.id, fields)
-                                .then(() => {
-                                    setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
-                                })
-                                .catch(e => logger.error('Error marking bubble as done:', e));
+                            completeSelected();
                         }
                     };
                     animatePop();
                 } else {
                     // Если нет тела, просто удаляем
                     Matter.World.remove(engineRef.current.world, selectedBubble.body);
-                    const fields = buildStatusFields(selectedBubble, BUBBLE_STATUS.DONE);
-                    await updateBubbleFields(selectedBubble.id, fields);
-                    setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
+                    completeSelected();
                 }
             } catch (error) {
                 logger.error('Error marking bubble as done:', error);
@@ -360,28 +287,9 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
         // Не сбрасываем размер - он будет установлен при следующем открытии диалога
     };
 
-    // Clear all bubbles
-    const clearAllBubbles = () => {
-        if (engineRef.current) {
-            // Remove all bubbles from the physics world
-            bubbles.forEach(bubble => {
-                Matter.World.remove(engineRef.current.world, bubble.body);
-            });
-
-            // Clear state and Firestore
-            setBubbles([]);
-            clearBubblesFromFirestore();
-        }
-    };
-
+    // Only the editor mode of this dialog: v2 keeps the description as Markdown (bubbleModel)
     const handleToggleEditUseRichText = (enabled) => {
         setUseRichTextEdit(!!enabled);
-        if (!selectedBubble) return;
-        // Обновляем выбранный пузырь и сохраняем в БД
-        setSelectedBubble(prev => prev ? { ...prev, useRichText: !!enabled } : prev);
-        const fields = { useRichText: !!enabled, updatedAt: new Date().toISOString() };
-        setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
-        updateBubbleFields(selectedBubble.id, fields).catch(e => logger.error('Error toggling rich text:', e));
     };
 
     // Открытие конкретного бабла по deep-link событию из index.js
@@ -412,14 +320,12 @@ export function useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme
         setUseRichTextCreate,
         useRichTextEdit,
         setUseRichTextEdit,
-        createBubble,
         openCreateDialog,
         createNewBubble,
         handleSaveBubble,
         handleDeleteBubble,
         handleMarkAsDone,
         handleCloseDialog,
-        clearAllBubbles,
         handleToggleEditUseRichText
     };
 }
````

- [ ] **Step 8: Кнопки списка задач и выдвижной список**

````diff
diff --git a/src/components/TaskList.jsx b/src/components/TaskList.jsx
index f7b7561..b006134 100644
--- a/src/components/TaskList.jsx
+++ b/src/components/TaskList.jsx
@@ -35,21 +35,16 @@ import TaskActionButtons from './TaskActionButtons';
 import useSearch from '../hooks/useSearch';
 import HtmlRenderer from './HtmlRenderer';
 import { stripHtml } from '../utils/stripHtml';
-import {
-    BUBBLE_STATUS,
-    markBubbleAsDone,
-    markBubbleAsDeleted,
-    restoreBubble,
-    getBubblesByStatus,
-    deleteBubbleDoc
-} from '../services/firestoreService';
+import { db } from '../firebase';
+import { BUBBLE_STATUS, getBubblesByStatus } from '../services/firestoreService';
+import { completeTask, deleteTaskForever, restoreTask, trashTask } from '../services/data/tasks';
 
 // Auto-cleanup period for deleted tasks (30 days)
 const DELETED_TASKS_CLEANUP_DAYS = 30;
 
 const TaskList = ({
     bubbles,
-    setBubbles,
+    uid,
     tags,
     listFilter,
     setListFilter,
@@ -265,42 +260,28 @@ const TaskList = ({
         return new Date(dueDate) < new Date();
     }, []);
 
-    // Memoized action handlers
-    const handleRestoreBubble = useCallback(async (bubbleId) => {
-        try {
-            const updatedBubbles = await restoreBubble(bubbleId, bubbles);
-            setBubbles(updatedBubbles);
-        } catch (error) {
-            logger.error('Error restoring bubble:', error);
-        }
-    }, [bubbles, setBubbles]);
-
-    // Mark task as done from list view
-    const handleMarkTaskAsDone = useCallback(async (taskId) => {
-        try {
-            const updatedBubbles = await markBubbleAsDone(taskId, bubbles);
-            setBubbles(updatedBubbles);
-        } catch (error) {
-            logger.error('Error marking task as done:', error);
-        }
-    }, [bubbles, setBubbles]);
-
-    // Delete task from list view
-    const handleDeleteTask = useCallback(async (taskId) => {
-        try {
-            const updatedBubbles = await markBubbleAsDeleted(taskId, bubbles);
-            setBubbles(updatedBubbles);
-        } catch (error) {
-            logger.error('Error deleting task:', error);
-        }
-    }, [bubbles, setBubbles]);
+    // Memoized action handlers. They write through the data layer; the live task
+    // subscription (useMatterEngine) brings the change back into the list.
+    const handleRestoreBubble = useCallback((bubbleId) => {
+        restoreTask(db, uid, bubbleId).catch(error => logger.error('Error restoring bubble:', error));
+    }, [uid]);
+
+    // Mark task as done from list view (a repeating task moves to its next due)
+    const handleMarkTaskAsDone = useCallback((taskId) => {
+        const task = bubbles.find(bubble => bubble.id === taskId);
+        if (!task) return;
+        completeTask(db, uid, task).catch(error => logger.error('Error marking task as done:', error));
+    }, [bubbles, uid]);
+
+    // Delete task from list view (to the trash)
+    const handleDeleteTask = useCallback((taskId) => {
+        trashTask(db, uid, taskId).catch(error => logger.error('Error deleting task:', error));
+    }, [uid]);
 
     // Permanently delete task from list view
-    const handlePermanentDeleteTask = useCallback(async (taskId) => {
-        const updatedBubbles = bubbles.filter(bubble => bubble.id !== taskId);
-        setBubbles(updatedBubbles);
-        deleteBubbleDoc(taskId).catch(e => logger.error('Error permanently deleting task:', e));
-    }, [bubbles, setBubbles]);
+    const handlePermanentDeleteTask = useCallback((taskId) => {
+        deleteTaskForever(db, uid, taskId).catch(e => logger.error('Error permanently deleting task:', e));
+    }, [uid]);
 
     // Edit task from list view
     const handleEditTask = useCallback((task) => {
````

````diff
diff --git a/src/components/ListViewDrawer.jsx b/src/components/ListViewDrawer.jsx
index a4cc33d..41d4b28 100644
--- a/src/components/ListViewDrawer.jsx
+++ b/src/components/ListViewDrawer.jsx
@@ -11,7 +11,7 @@ const TaskListDrawer = ({
     themeMode,
     // ListView props
     bubbles,
-    setBubbles,
+    uid,
     tags,
     listFilter,
     setListFilter,
@@ -68,7 +68,7 @@ const TaskListDrawer = ({
             <Box sx={{ height: 'calc(100vh - 73px)', overflow: 'auto' }}>
                 <TaskList
                     bubbles={bubbles}
-                    setBubbles={setBubbles}
+                    uid={uid}
                     tags={tags}
                     listFilter={listFilter}
                     setListFilter={setListFilter}
````

````diff
diff --git a/src/components/BubblesDialogs.jsx b/src/components/BubblesDialogs.jsx
index 85d7814..a9a693c 100644
--- a/src/components/BubblesDialogs.jsx
+++ b/src/components/BubblesDialogs.jsx
@@ -28,6 +28,8 @@ import { COLOR_PALETTE } from '../hooks/tagColors';
  * stay in BubblesPage and arrive here as plain props.
  */
 const BubblesDialogs = ({
+    // The signed-in user: the list drawer writes the user's tasks
+    uid,
     // Edit bubble dialog
     editDialog,
     handleCloseDialog,
@@ -85,7 +87,6 @@ const BubblesDialogs = ({
     };
     const {
         bubbles,
-        setBubbles,
         tags,
         setTags,
         canCreateMoreTags,
@@ -385,7 +386,7 @@ const BubblesDialogs = ({
                 isMobile={isMobile}
                 themeMode={themeMode}
                 bubbles={bubbles}
-                setBubbles={setBubbles}
+                uid={uid}
                 tags={tags}
                 listFilter={listFilter}
                 setListFilter={setListFilter}
````

- [ ] **Step 9: `BubblesPage`: `uid`, «Остановить пульсацию», ссылки `?taskId=`**

````diff
diff --git a/src/pages/BubblesPage.jsx b/src/pages/BubblesPage.jsx
index 14bcafc..458ba40 100644
--- a/src/pages/BubblesPage.jsx
+++ b/src/pages/BubblesPage.jsx
@@ -12,16 +12,9 @@ import BubblesDialogs from '../components/BubblesDialogs';
 import TextOverlay from '../components/TextOverlay';
 import { logoutUser } from '../services/authService';
 import { db } from '../firebase';
-import { subscribeTasks } from '../services/data/tasks';
-import {
-    loadBubblesFromFirestore,
-    saveTagsToFirestore,
-    subscribeToBubblesUpdates,
-    BUBBLE_STATUS,
-    cleanupOldDeletedBubbles,
-    updateBubbleFields,
-    deleteBubbleDoc
-} from '../services/firestoreService';
+import { muteTaskPulse, subscribeTasks } from '../services/data/tasks';
+import { deepLinkTaskId } from '../utils/deepLink';
+import { saveTagsToFirestore, BUBBLE_STATUS } from '../services/firestoreService';
 
 import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
 import MobileCategorySelector from '../components/MobileCategorySelector';
@@ -131,9 +124,8 @@ const BubblesPage = ({ user, themeMode }) => {
         handleDeleteBubble,
         handleMarkAsDone,
         handleCloseDialog,
-        clearAllBubbles,
         handleToggleEditUseRichText
-    } = useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile });
+    } = useBubbleCrud({ engineRef, renderRef, bubbles, setBubbles, theme, isMobile, uid: user.uid });
 
     // Live mirror of edit-dialog state for the Matter mount-effect subscription
     // (its closure captures editDialog/selectedBubble once and stays stale).
@@ -476,8 +468,8 @@ const BubblesPage = ({ user, themeMode }) => {
 
 
 
-    // Bubble CRUD (createBubble/openCreateDialog/createNewBubble/handleSaveBubble/
-    // handleDeleteBubble/handleMarkAsDone/handleCloseDialog/clearAllBubbles/
+    // Bubble CRUD (openCreateDialog/createNewBubble/handleSaveBubble/
+    // handleDeleteBubble/handleMarkAsDone/handleCloseDialog/
     // handleToggleEditUseRichText + the open-bubble deep-link listener) live in
     // useBubbleCrud (Task 5/6 of #38).
 
@@ -633,13 +625,12 @@ const BubblesPage = ({ user, themeMode }) => {
 
     // open-bubble deep-link listener now lives in useBubbleCrud (Task 5/6 of #38).
 
-    // Авто-открытие по URL-параметру (?bubbleId=...) даже если событие было пропущено
+    // Авто-открытие по URL-параметру (?taskId=... или старому ?bubbleId=...) даже если событие было пропущено
     const deepLinkHandledRef = React.useRef(false);
     useEffect(() => {
         if (deepLinkHandledRef.current) return;
         try {
-            const params = new URLSearchParams(window.location.search);
-            const bubbleId = params.get('bubbleId');
+            const bubbleId = deepLinkTaskId(window.location.search);
             if (!bubbleId) return;
             const found = bubbles.find(b => String(b.id) === String(bubbleId));
             if (found) {
@@ -680,19 +671,8 @@ const BubblesPage = ({ user, themeMode }) => {
                 notifiedBubbleNotificationsRef.current.delete(key);
             });
 
-            // Персистим намерение «остановлено вручную» + сбрасываем серверный sticky-флаг
-            const updatedBubble = {
-                ...selectedBubble,
-                overduePulseSuppressed: true,
-                overdueSticky: false,
-                overdueAt: null,
-                updatedAt: new Date().toISOString()
-            };
-
-            setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? updatedBubble : b));
-            updateBubbleFields(selectedBubble.id, {
-                overduePulseSuppressed: true, overdueSticky: false, overdueAt: null, updatedAt: updatedBubble.updatedAt
-            }).catch(e => logger.error('Error stopping pulsing:', e));
+            // Персистим намерение «остановлено вручную» (pulseMuted); сервер сбросит его при смене срока
+            muteTaskPulse(db, user.uid, selectedBubble.id).catch(e => logger.error('Error stopping pulsing:', e));
 
             // Close edit dialog after stop pulsing
             setEditDialog(false);
@@ -839,7 +819,7 @@ const BubblesPage = ({ user, themeMode }) => {
                     onAddBubble={handleOpenCreateDialog}
                     taskListProps={{
                         bubbles,
-                        setBubbles,
+                        uid: user.uid,
                         tags,
                         listFilter,
                         setListFilter,
@@ -870,6 +850,7 @@ const BubblesPage = ({ user, themeMode }) => {
 
             {/* Все диалоги и дроверы (Task A of #64) */}
             <BubblesDialogs
+                uid={user.uid}
                 editDialog={editDialog}
                 handleCloseDialog={handleCloseDialog}
                 selectedBubble={selectedBubble}
````

````diff
diff --git a/src/index.jsx b/src/index.jsx
index 081c061..73afe27 100644
--- a/src/index.jsx
+++ b/src/index.jsx
@@ -12,12 +12,12 @@ import { initMessagingAndSaveToken, updateMessagingTokenLanguage } from './fireb
 import i18n from './i18n';
 import { getAuth, onAuthStateChanged } from 'firebase/auth';
 import logger from './utils/logger';
+import { deepLinkTaskId } from './utils/deepLink';
 
-// Handle notification deep links like /?bubbleId=...
+// Handle notification deep links like /?taskId=... (and the old /?bubbleId=...)
 function handleDeepLink() {
     try {
-        const params = new URLSearchParams(window.location.search);
-        const bubbleId = params.get('bubbleId');
+        const bubbleId = deepLinkTaskId(window.location.search);
         if (bubbleId) {
             window.dispatchEvent(new CustomEvent('open-bubble', { detail: { bubbleId } }));
         }
````

- [ ] **Step 10: Убрать функции задач v1 из `src/services/firestoreService.js` и их тест**

Заменить файл целиком (остаются статусы, функции тегов и `updateBubbleFields` для `useTags`; задача 9 удаляет и их):

````js
import {
    doc,
    setDoc,
    updateDoc,
    getDoc,
    serverTimestamp,
    onSnapshot,
    runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';
import { lsGet, lsSet } from '../utils/storage';
import logger from '../utils/logger';

// Get user ID for document creation
const getUserDocumentId = () => {
    const user = getCurrentUser();
    if (!user) {
        throw new Error('User not authenticated');
    }
    return user.uid;
};

// Collections references
const BUBBLES_COLLECTION = 'user-bubbles';
const BUBBLES_SUBCOLLECTION = 'bubbles'; // normalized: one doc per bubble
const TAGS_COLLECTION = 'user-tags';

// Bubble statuses
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    POSTPONE: 'postpone',
    DELETED: 'deleted'
};

// Point-wise update fields of single bubble
export const updateBubbleFields = async (bubbleId, fields, userId = getUserDocumentId()) => {
    const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId));
    await updateDoc(ref, fields);
};

// Get bubbles by status
export const getBubblesByStatus = (bubblesData, status) => {
    if (!status) return bubblesData;
    return bubblesData.filter(bubble => bubble.status === status);
};

// Tags operations
//
// Tags live as an array in a single document (`user-tags/{uid}`). Whole-array
// writes (saveTagsToFirestore) clobber concurrent edits from other devices when
// the local snapshot is stale. For single-tag add/edit/delete prefer the
// transactional helpers below: each reads the current array *inside* the
// transaction and applies only its own delta, so a concurrent change on another
// device is preserved. saveTagsToFirestore stays for deliberate whole-list ops
// (import, reorder) where replacing the entire array is the intended semantics.
export const saveTagsToFirestore = async (tagsData) => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);

        await setDoc(tagsRef, {
            tags: tagsData,
            updatedAt: serverTimestamp(),
            userId
        }, { merge: true });

    } catch (error) {
        logger.error('Error saving tags to Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return;
        lsSet(`tags_${uid}`, tagsData);
    }
};

// Read the current tags array from a transaction snapshot, defensively.
const readTagsFromSnap = (snap) => {
    if (!snap.exists()) return [];
    const tags = snap.data()?.tags;
    return Array.isArray(tags) ? tags : [];
};

// Add or update a single tag atomically. Returns the resulting tags array.
// Transaction reads fresh server state, so a tag added/edited on another device
// since the local snapshot is not overwritten.
export const upsertTagInFirestore = async (tag) => {
    const userId = getUserDocumentId();
    const tagsRef = doc(db, TAGS_COLLECTION, userId);
    return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tagsRef);
        const current = readTagsFromSnap(snap);
        const idx = current.findIndex(t => t.id === tag.id);
        const next = idx >= 0
            ? current.map(t => (t.id === tag.id ? tag : t))
            : [...current, tag];
        transaction.set(tagsRef, { tags: next, updatedAt: serverTimestamp(), userId }, { merge: true });
        return next;
    });
};

// Remove a single tag by id atomically. Returns the resulting tags array.
export const deleteTagFromFirestore = async (tagId, userId = getUserDocumentId()) => {
    const tagsRef = doc(db, TAGS_COLLECTION, userId);
    return runTransaction(db, async (transaction) => {
        const snap = await transaction.get(tagsRef);
        const current = readTagsFromSnap(snap);
        const next = current.filter(t => t.id !== tagId);
        transaction.set(tagsRef, { tags: next, updatedAt: serverTimestamp(), userId }, { merge: true });
        return next;
    });
};

export const loadTagsFromFirestore = async () => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);
        const docSnap = await getDoc(tagsRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.tags || [];
        }
        // Fallback to localStorage with user-specific key
        const stored = lsGet(`tags_${userId}`);
        return stored || [];
    } catch (error) {
        logger.error('Error loading tags from Firestore:', error);
        // Fallback to localStorage with user-specific key
        const uid = getCurrentUser()?.uid;
        if (!uid) return [];
        const stored = lsGet(`tags_${uid}`);
        return stored || [];
    }
};

// Real-time listeners (optional)
export const subscribeToTagsUpdates = (callback) => {
    try {
        const userId = getUserDocumentId();
        const tagsRef = doc(db, TAGS_COLLECTION, userId);

        return onSnapshot(tagsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const tags = data.tags || [];
                // Ensure we always pass an array to the callback
                callback(Array.isArray(tags) ? tags : []);
            } else {
                callback([]);
            }
        });
    } catch (error) {
        logger.error('Error setting up tags listener:', error);
        return () => { }; // Return empty unsubscribe function
    }
};
````

```bash
git rm src/services/buildStatusFields.test.js
```

- [ ] **Step 11: Тесты проходят, старых функций задач не осталось**

Run: `npx vitest run src/hooks/useBubbleCrud.test.jsx src/components/ListViewDrawer.test.jsx src/utils/deepLink.test.js`
Expected: PASS — `Tests  13 passed (13)`.

Run: `grep -rn "buildStatusFields\|markBubbleAs\|restoreBubble\|deleteBubbleDoc\|upsertBubble\|saveBubblesToFirestore\|loadBubblesFromFirestore\|subscribeToBubblesUpdates\|clearBubblesFromFirestore\|cleanupOldDeletedBubbles\|clearAllBubbles" src --include=*.js --include=*.jsx`
Expected: ровно три строки, и все не про код записи: `src/components/BubbleViewFab.jsx:54` (закомментированная кнопка `clearAllBubbles`, её не трогаем), `src/components/TaskActionButtons.jsx:42` (ключ перевода `'bubbles.restoreBubble'`) и комментарий `src/hooks/__tests__/useBubbleFilters.test.js:5` (его убирает задача 9).

- [ ] **Step 12: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  38 passed (38)`, `Tests  519 passed (519)`; линтер без ошибок.

- [ ] **Step 13: Commit**

```bash
git add -A src/utils/deepLink.js src/utils/deepLink.test.js src/hooks/useBubbleCrud.js src/hooks/useBubbleCrud.test.jsx src/components/TaskList.jsx src/components/ListViewDrawer.jsx src/components/ListViewDrawer.test.jsx src/components/BubblesDialogs.jsx src/pages/BubblesPage.jsx src/index.jsx src/services/firestoreService.js
git commit -F - <<'EOF'
feat(bubbles): task writes through the v2 data layer, ?taskId= links

Create with an automatic id, save only the changed fields, trash, restore,
delete forever, "Done" by spec 4.1 (a repeating task moves to its next due
without the pop) and "stop pulsing" go to users/{uid}/tasks. Notification
links open the task by ?taskId= and the old ?bubbleId=.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 9: Категории как документы v2

**Files:**
- Create: `src/utils/bubbleStatus.js`
- Test: `src/hooks/useTags.test.jsx` (замена целиком)
- Modify: `src/hooks/useTags.js`, `src/pages/BubblesPage.jsx`, `src/components/BubblesDialogs.jsx`, импортёры статусов (`src/utils/listVisibility.js`, `src/utils/bubbleVisibility.js`, `src/hooks/useListFilters.js`, `src/hooks/useBubbleNotifications.js`, `src/components/TaskActionButtons.jsx`, `src/components/TaskList.jsx`), тесты с мёртвыми моками Firebase (`src/utils/bubbleVisibility.test.js`, `src/hooks/__tests__/useListFilters.test.js`, `src/hooks/__tests__/useBubbleFilters.test.js`)
- Delete: `src/services/firestoreService.js`

**Interfaces:**
- Consumes: `subscribeCategories`, `newCategoryId`, `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`, `nextCategoryOrder` (задача 3).
- Produces:
  - `useTags({ user })` подписывается на `users/{uid}/categories` (список по `order`), создаёт категорию после последней с выбранным цветом, сохраняет только изменённые имя/цвет, удаляет через 7 секунд без записи в задачи (их чистит сервер) и возвращает `handleReorderTags(reordered)`; больше не возвращает `setTags`;
  - `BubblesDialogs` принимает `handleReorderTags`; `TasksCategoriesPanel` и окно категорий сохраняют перестановку через него;
  - `src/utils/bubbleStatus.js`: `BUBBLE_STATUS`, `getBubblesByStatus` (перенесены из `firestoreService.js` без изменений);
  - `src/services/firestoreService.js` удалён — в вебе не осталось кода старых коллекций задач и тегов.

- [ ] **Step 1: Заменить `src/hooks/useTags.test.jsx` целиком**

Тесты отложенного удаления остаются (теперь на `deleteCategory(db, uid, id)`), добавлены подписка, создание, правка и перестановка.

````jsx
// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createCategory,
    deleteCategory,
    reorderCategories,
    subscribeCategories,
    updateCategory,
} from '../services/data/categories';
import { useBubblesData } from '../state/BubblesDataStore';
import { useBubblesUi } from '../state/BubblesUiStore';
import { useTags } from './useTags';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/categories', async (importOriginal) => ({
    ...(await importOriginal()),
    subscribeCategories: vi.fn(() => vi.fn()),
    newCategoryId: vi.fn(() => 'new-cat'),
    createCategory: vi.fn(() => Promise.resolve()),
    updateCategory: vi.fn(() => Promise.resolve()),
    deleteCategory: vi.fn(() => Promise.resolve()),
    reorderCategories: vi.fn(() => Promise.resolve()),
}));
vi.mock('../state/BubblesDataStore', () => ({
    useBubblesData: vi.fn(),
}));
vi.mock('../state/BubblesUiStore', () => ({
    useBubblesUi: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
    default: { error: vi.fn() },
}));

const TAG_A = { id: 'tag-a', name: 'A', color: '#da3833', order: 1 };
const TAG_B = { id: 'tag-b', name: 'B', color: '#ee603c', order: 2 };

describe('useTags: categories as v2 documents', () => {
    let container;
    let root;
    let handlers;
    let data;
    let ui;

    function Probe({ user }) {
        handlers = useTags({ user });
        return null;
    }

    const render = (user) => {
        act(() => root.render(<Probe user={user} />));
    };

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);

        data = { tags: [TAG_A, TAG_B], setTags: vi.fn(), setBubbles: vi.fn() };
        ui = {
            setFilterTags: vi.fn(),
            setListFilterTags: vi.fn(),
            tagName: '',
            setTagName: vi.fn(),
            tagColor: '#da3833',
            setTagColor: vi.fn(),
            editingTag: null,
            setEditingTag: vi.fn(),
            setTagDialog: vi.fn(),
            setDeletingTags: vi.fn(),
        };
        useBubblesData.mockImplementation(() => data);
        useBubblesUi.mockImplementation(() => ui);
    });

    afterEach(() => {
        if (root) act(() => root.unmount());
        container.remove();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('lists the categories of the signed-in user, live', () => {
        render({ uid: 'user-a' });
        expect(subscribeCategories).toHaveBeenCalledWith('db', 'user-a', expect.any(Function), expect.any(Function));
        const onList = subscribeCategories.mock.calls[0][2];
        act(() => onList([TAG_B]));
        expect(data.setTags).toHaveBeenCalledWith([TAG_B]);
    });

    it('creates a category after the last one, in the colour picked', () => {
        ui.tagName = ' Home ';
        ui.tagColor = '#fd8b2b';
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(createCategory).toHaveBeenCalledWith('db', 'user-a', 'new-cat', { name: 'Home', color: '#fd8b2b', order: 3 });
    });

    it('saves only what changed in a category', () => {
        ui.editingTag = TAG_A;
        ui.tagName = 'Work';
        ui.tagColor = TAG_A.color;
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(updateCategory).toHaveBeenCalledWith('db', 'user-a', 'tag-a', { name: 'Work' });
    });

    it('does not take the colour of another category', () => {
        ui.editingTag = TAG_A;
        ui.tagName = 'A';
        ui.tagColor = TAG_B.color;
        render({ uid: 'user-a' });
        act(() => handlers.handleSaveTag());
        expect(updateCategory).not.toHaveBeenCalled();
    });

    it('saves a drag-and-drop through the order planner', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleReorderTags([TAG_B, TAG_A]));
        expect(reorderCategories).toHaveBeenCalledWith('db', 'user-a', [TAG_B, TAG_A]);
    });

    it('deletes the category after 7 seconds and leaves its tasks to the server', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(6999));
        expect(deleteCategory).not.toHaveBeenCalled();
        act(() => vi.advanceTimersByTime(1));
        expect(deleteCategory).toHaveBeenCalledWith('db', 'user-a', 'tag-a');
        expect(data.setBubbles).not.toHaveBeenCalled();
    });

    it('cancels a pending deletion on unmount', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        act(() => root.unmount());
        root = null;
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('does not run a deletion after logout and login as another uid', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));

        render(null);
        render({ uid: 'user-b' });
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('cancels the corresponding timer on undo', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => handlers.handleUndoDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(7000));

        expect(deleteCategory).not.toHaveBeenCalled();
    });

    it('keeps timers for different categories independent', () => {
        render({ uid: 'user-a' });
        act(() => handlers.handleDeleteTag('tag-a'));
        act(() => vi.advanceTimersByTime(3500));
        act(() => handlers.handleDeleteTag('tag-b'));

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteCategory).toHaveBeenCalledTimes(1);
        expect(deleteCategory).toHaveBeenLastCalledWith('db', 'user-a', 'tag-a');

        act(() => vi.advanceTimersByTime(3500));
        expect(deleteCategory).toHaveBeenCalledTimes(2);
        expect(deleteCategory).toHaveBeenLastCalledWith('db', 'user-a', 'tag-b');
    });
});
````

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/hooks/useTags.test.jsx`
Expected: FAIL — `Tests  9 failed | 1 passed (10)` (проходит только «does not take the colour of another category»); например, `expected "vi.fn()" to be called with arguments: [ 'db', 'user-a', Any<Function>, …(1) ]` и `TypeError: handlers.handleReorderTags is not a function`.

- [ ] **Step 3: Перевести `src/hooks/useTags.js` на документы категорий**

````diff
diff --git a/src/hooks/useTags.js b/src/hooks/useTags.js
index 9b16075..edfb4b1 100644
--- a/src/hooks/useTags.js
+++ b/src/hooks/useTags.js
@@ -1,14 +1,17 @@
 import { useEffect, useRef } from 'react';
 import { lsSet } from '../utils/storage';
 import { LS } from '../utils/storageKeys';
+import { db } from '../firebase';
 import {
-    subscribeToTagsUpdates,
-    upsertTagInFirestore,
-    deleteTagFromFirestore,
-    updateBubbleFields
-} from '../services/firestoreService';
+    createCategory,
+    deleteCategory,
+    newCategoryId,
+    nextCategoryOrder,
+    reorderCategories,
+    subscribeCategories,
+    updateCategory
+} from '../services/data/categories';
 import logger from '../utils/logger';
-import { applyBubbleFill } from '../utils/bubbleStyle';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
 import {
@@ -19,26 +22,21 @@ import {
 
 /**
  * Tag state + behaviour extracted from BubblesPage (Task 2/6 of #38).
+ * Tags are the user's categories, users/{uid}/categories (data contract v2):
+ * src/services/data/categories.js reads and writes them; the live subscription
+ * brings every change back into `tags` (sorted by order).
  *
- * Seam note: the original `subscribeToTagsUpdates` effect did three things —
- * (1) setTags, (2) reconcile filter tags, (3) recolor bubbles. Only (1) lives
- * here; (2)+(3) stay in BubblesPage as a separate effect keyed on `[tags]`.
+ * Seam note: the live subscription only sets `tags`; filter reconciliation and
+ * bubble recolouring stay in BubblesPage as a separate effect keyed on `[tags]`.
  *
- * Cross-hook deps the tag handlers need at call-time — `setBubbles`,
- * `setFilterTags`, `setListFilterTags`, `getBubbleFillStyle` — are read from
- * BubblesStore: `setBubbles` is a store setter; the filter setters and
- * getBubbleFillStyle are published via register() by useBubbleFilters,
- * useListFilters and BubblesPage respectively. Reading them from the store
- * (instead of plain params) still avoids the useTags <-> useBubbleFilters
- * render-order cycle: `setFilterTags` comes from useBubbleFilters, which needs
+ * `setFilterTags` / `setListFilterTags` are read from BubblesStore, which avoids
+ * the useTags <-> useBubbleFilters render-order cycle: useBubbleFilters needs
  * `tags` produced here.
  */
 export function useTags({ user }) {
+    const { tags, setTags } = useBubblesData();
     const {
-        setBubbles, tags, setTags
-    } = useBubblesData();
-    const {
-        registered, setFilterTags, setListFilterTags,
+        setFilterTags, setListFilterTags,
         // Tag-editor state migrated into the store (Stage H of 010d); the handlers
         // below read/set it here instead of via local useState.
         tagName, setTagName, tagColor, setTagColor, editingTag, setEditingTag,
@@ -56,19 +54,14 @@ export function useTags({ user }) {
         deleteTimers.current.clear();
     }, [userUid]);
 
-    // Real-time tags synchronization (wait for auth user).
+    // Real-time categories (wait for auth user).
     // Only setTags lives here; filter reconciliation + bubble recolor stay in
     // BubblesPage as a [tags] effect.
     useEffect(() => {
-        if (!user) return;
-        const unsubscribe = subscribeToTagsUpdates((updatedTags) => {
-            // Ensure updatedTags is always an array
-            const tagsArray = Array.isArray(updatedTags) ? updatedTags : [];
-            setTags(tagsArray);
-        });
-
+        if (!userUid) return;
+        const unsubscribe = subscribeCategories(db, userUid, setTags, (e) => logger.error('Categories listener error:', e));
         return () => unsubscribe();
-    }, [user]);
+    }, [userUid]);
 
     // Функции для работы с цветами
     const getNextAvailableColor = () => getNextAvailableColorPure(tags);
@@ -102,26 +95,22 @@ export function useTags({ user }) {
             return; // Цвет уже занят при редактировании
         }
 
-        const newTag = {
-            id: editingTag ? editingTag.id : Math.random().toString(36).substr(2, 9),
-            name: tagName.trim(),
-            color: tagColor
-        };
-
-        let updatedTags;
+        const name = tagName.trim();
         if (editingTag) {
-            updatedTags = tags.map(tag => tag.id === editingTag.id ? newTag : tag);
+            // Only the fields that changed; the live subscription updates `tags`
+            const changes = {};
+            if (name !== editingTag.name) changes.name = name;
+            if (tagColor !== editingTag.color) changes.color = tagColor;
+            if (Object.keys(changes).length > 0) {
+                updateCategory(db, userUid, editingTag.id, changes).catch(e => logger.error('Error saving tag:', e));
+            }
         } else {
-            updatedTags = [...tags, newTag];
-        }
-
-        setTags(updatedTags);
-        // Transactional single-tag write: avoids clobbering concurrent tag edits
-        // from another device. onSnapshot reconciles local state afterwards.
-        upsertTagInFirestore(newTag).catch(e => logger.error('Error saving tag:', e));
+            // A new category goes after the last one (spec 4.5)
+            const newTag = { id: newCategoryId(db, userUid), name, color: tagColor, order: nextCategoryOrder(tags) };
+            createCategory(db, userUid, newTag.id, { name: newTag.name, color: newTag.color, order: newTag.order })
+                .catch(e => logger.error('Error saving tag:', e));
 
-        // Автоматически активируем новый тег в фильтрах (только для создания, не для редактирования)
-        if (!editingTag) {
+            // Автоматически активируем новый тег в фильтрах (только для создания, не для редактирования)
             // Активируем в фильтрах Bubbles View
             setFilterTags(prev => {
                 const newFilterTags = [...prev, newTag.id];
@@ -143,10 +132,14 @@ export function useTags({ user }) {
         setTagColor(getNextAvailableColor() || '#2f6bdb');
     };
 
+    // Drag-and-drop in the categories panel or dialog: one write, or one renumbering batch
+    const handleReorderTags = (reordered) => {
+        reorderCategories(db, userUid, reordered).catch(e => logger.error('Error reordering tags:', e));
+    };
+
     const handleDeleteTag = (tagId) => {
         const initiatingUid = userUid;
         if (!initiatingUid) return;
-        const { getBubbleFillStyle } = registered;
         const existing = deleteTimers.current.get(tagId);
         if (existing) clearTimeout(existing.timer);
         // Добавляем тег в состояние удаления
@@ -166,26 +159,9 @@ export function useTags({ user }) {
 
             if (userUidRef.current !== pending.uid) return;
 
-            const updatedTags = tagsRef.current.filter(tag => tag.id !== tagId);
-            setTags(updatedTags);
-            // Transactional single-tag delete: reads fresh server state so a tag
-            // added/edited on another device is not overwritten by a stale array.
-            deleteTagFromFirestore(tagId, pending.uid).catch(e => logger.error('Error deleting tag:', e));
-
-            // Удаляем ссылки на этот тег из пузырей
-            const affectedIds = new Set();
-            setBubbles(prev => prev.map(bubble => {
-                if (bubble.tagId === tagId) {
-                    affectedIds.add(bubble.id);
-                    // Reset bubble color to no-tag style
-                    applyBubbleFill(bubble, { tagColor: null, stroke: '#B0B0B0' }, getBubbleFillStyle);
-                    return { ...bubble, tagId: null };
-                }
-                return bubble;
-            }));
-            affectedIds.forEach(id =>
-                updateBubbleFields(id, { tagId: null }, pending.uid).catch(e => logger.error('Error clearing tag from bubble:', e))
-            );
+            // The server clears categoryId on this category's tasks (onCategoryDeleted, spec 4.5);
+            // until then a task of a missing category shows as uncategorized.
+            deleteCategory(db, pending.uid, tagId).catch(e => logger.error('Error deleting tag:', e));
         }, 7000);
 
         // Сохраняем таймер
@@ -217,11 +193,11 @@ export function useTags({ user }) {
 
     return {
         tags,
-        setTags,
         tagsRef,
         deleteTimers: deleteTimers.current,
         handleOpenTagDialog,
         handleSaveTag,
+        handleReorderTags,
         handleDeleteTag,
         handleUndoDeleteTag,
         handleCloseTagDialog,
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/hooks/useTags.test.jsx`
Expected: PASS — `Tests  10 passed (10)`.

- [ ] **Step 5: Перестановка через `handleReorderTags`**

````diff
diff --git a/src/pages/BubblesPage.jsx b/src/pages/BubblesPage.jsx
index 458ba40..3849866 100644
--- a/src/pages/BubblesPage.jsx
+++ b/src/pages/BubblesPage.jsx
@@ -14,7 +14,7 @@ import { logoutUser } from '../services/authService';
 import { db } from '../firebase';
 import { muteTaskPulse, subscribeTasks } from '../services/data/tasks';
 import { deepLinkTaskId } from '../utils/deepLink';
-import { saveTagsToFirestore, BUBBLE_STATUS } from '../services/firestoreService';
+import { BUBBLE_STATUS } from '../utils/bubbleStatus';
 
 import TasksCategoriesPanel from '../components/TasksCategoriesPanel';
 import MobileCategorySelector from '../components/MobileCategorySelector';
@@ -141,11 +141,11 @@ const BubblesPage = ({ user, themeMode }) => {
     // is needed.
     const {
         tags,
-        setTags,
         tagsRef,
         deleteTimers,
         handleOpenTagDialog,
         handleSaveTag,
+        handleReorderTags,
         handleDeleteTag,
         handleUndoDeleteTag,
         handleCloseTagDialog,
@@ -228,8 +228,6 @@ const BubblesPage = ({ user, themeMode }) => {
     // getDialogPaperStyles moved into BubblesDialogs (Stage G of 010d) — it was
     // only forwarded to the dialogs, which now derive it from useTheme() directly.
 
-    // Note: Functions moved to firestoreService.js for better organization
-
     // Function to get bubble fill style based on theme
     const getBubbleFillStyle = (tagColor = null) => {
         // Если фон отключен, возвращаем прозрачный
@@ -869,6 +867,7 @@ const BubblesPage = ({ user, themeMode }) => {
                 handleDeleteTag={handleDeleteTag}
                 handleCloseTagDialog={handleCloseTagDialog}
                 handleSaveTag={handleSaveTag}
+                handleReorderTags={handleReorderTags}
                 handleToggleBubbleBackground={handleToggleBubbleBackground}
                 handleToggleMainView={handleToggleMainView}
                 categoriesPanelEnabled={categoriesPanelEnabled}
@@ -900,10 +899,7 @@ const BubblesPage = ({ user, themeMode }) => {
                     onOpenTagDialog={() => setCategoriesDialog(true)}
                     bubbles={bubbles}
                     isPermanent={categoriesPanelEnabled}
-                    onReorderTags={(updated) => {
-                        setTags(updated);
-                        saveTagsToFirestore(updated);
-                    }}
+                    onReorderTags={handleReorderTags}
                 />
             )}
 
````

````diff
diff --git a/src/components/BubblesDialogs.jsx b/src/components/BubblesDialogs.jsx
index a9a693c..3f75938 100644
--- a/src/components/BubblesDialogs.jsx
+++ b/src/components/BubblesDialogs.jsx
@@ -13,7 +13,6 @@ import ChangePasswordDialog from './ChangePasswordDialog';
 import LogoutConfirmDialog from './LogoutConfirmDialog';
 import TaskListDrawer from './ListViewDrawer';
 import { isOverdue } from '../utils/notifications';
-import { saveTagsToFirestore } from '../services/firestoreService';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
 import { COLOR_PALETTE } from '../hooks/tagColors';
@@ -51,6 +50,7 @@ const BubblesDialogs = ({
     // Tag editor dialog
     handleCloseTagDialog,
     handleSaveTag,
+    handleReorderTags,
     // Main menu drawer
     handleToggleBubbleBackground,
     handleToggleMainView,
@@ -88,7 +88,6 @@ const BubblesDialogs = ({
     const {
         bubbles,
         tags,
-        setTags,
         canCreateMoreTags,
         getBubbleCountByTag,
     } = useBubblesData();
@@ -328,10 +327,7 @@ const BubblesDialogs = ({
                 isMobile={isMobile}
                 isSmallScreen={isSmallScreen}
                 getDialogPaperStyles={getDialogPaperStyles}
-                onReorderTags={(updated) => {
-                    setTags(updated);
-                    saveTagsToFirestore(updated);
-                }}
+                onReorderTags={handleReorderTags}
             />
 
             {/* Диалог настроек шрифта */}
````

- [ ] **Step 6: Перенести статусы в `src/utils/bubbleStatus.js` и удалить `firestoreService.js`**

````js
// Task statuses as the UI uses them. v2 stores active, done and deleted (spec 3.1);
// POSTPONE stays for the list's "planned" tab, which filters by due, not by status.
export const BUBBLE_STATUS = {
    ACTIVE: 'active',
    DONE: 'done',
    POSTPONE: 'postpone',
    DELETED: 'deleted'
};

// Get bubbles by status
export const getBubblesByStatus = (bubblesData, status) => {
    if (!status) return bubblesData;
    return bubblesData.filter(bubble => bubble.status === status);
};
````

````diff
diff --git a/src/utils/listVisibility.js b/src/utils/listVisibility.js
index 9ef5062..1955e18 100644
--- a/src/utils/listVisibility.js
+++ b/src/utils/listVisibility.js
@@ -1,4 +1,4 @@
-import { getBubblesByStatus } from '../services/firestoreService';
+import { getBubblesByStatus } from './bubbleStatus';
 import { stripHtml } from '../utils/stripHtml';
 
 // Pure helper: true when every tag is selected and "no tag" tasks are shown.
````

````diff
diff --git a/src/utils/bubbleVisibility.js b/src/utils/bubbleVisibility.js
index 97c056b..2853318 100644
--- a/src/utils/bubbleVisibility.js
+++ b/src/utils/bubbleVisibility.js
@@ -4,7 +4,7 @@
  * the useBubbleWorld hook. These functions decide *which* bubbles belong in the
  * physics world and *how* a bubble should be styled for the current search state.
  */
-import { BUBBLE_STATUS } from '../services/firestoreService';
+import { BUBBLE_STATUS } from './bubbleStatus';
 
 const NO_TAG_GREY = '#B0B0B0';
 
````

````diff
diff --git a/src/hooks/useListFilters.js b/src/hooks/useListFilters.js
index 8d8eace..7fb5a36 100644
--- a/src/hooks/useListFilters.js
+++ b/src/hooks/useListFilters.js
@@ -1,7 +1,7 @@
 import { useCallback, useEffect, useRef } from 'react';
 import { lsGet, lsSet } from '../utils/storage';
 import { LS } from '../utils/storageKeys';
-import { getBubblesByStatus } from '../services/firestoreService';
+import { getBubblesByStatus } from '../utils/bubbleStatus';
 import { toggleTagInFilter } from './useBubbleFilters';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
````

````diff
diff --git a/src/hooks/useBubbleNotifications.js b/src/hooks/useBubbleNotifications.js
index fbfadc3..dd46f59 100644
--- a/src/hooks/useBubbleNotifications.js
+++ b/src/hooks/useBubbleNotifications.js
@@ -2,7 +2,7 @@ import { useEffect, useRef } from 'react';
 import Matter from 'matter-js';
 import { useTheme } from '@mui/material';
 import { alpha } from '@mui/material/styles';
-import { BUBBLE_STATUS } from '../services/firestoreService';
+import { BUBBLE_STATUS } from '../utils/bubbleStatus';
 import { parseLocalDateTime } from '../utils/dateTime';
 import { getActiveNotification, buildNotificationKey } from '../utils/notifications';
 import { bubbleShouldPulse } from '../utils/rafGating';
````

````diff
diff --git a/src/components/TaskActionButtons.jsx b/src/components/TaskActionButtons.jsx
index e1cc055..90bf56f 100644
--- a/src/components/TaskActionButtons.jsx
+++ b/src/components/TaskActionButtons.jsx
@@ -6,7 +6,7 @@ import {
     Edit,
     Restore,
 } from '@mui/icons-material';
-import { BUBBLE_STATUS } from '../services/firestoreService';
+import { BUBBLE_STATUS } from '../utils/bubbleStatus';
 
 // Action matrix: define which actions appear for each status
 const ACTIONS = {
````

````diff
diff --git a/src/components/TaskList.jsx b/src/components/TaskList.jsx
index b006134..6e70514 100644
--- a/src/components/TaskList.jsx
+++ b/src/components/TaskList.jsx
@@ -36,7 +36,7 @@ import useSearch from '../hooks/useSearch';
 import HtmlRenderer from './HtmlRenderer';
 import { stripHtml } from '../utils/stripHtml';
 import { db } from '../firebase';
-import { BUBBLE_STATUS, getBubblesByStatus } from '../services/firestoreService';
+import { BUBBLE_STATUS, getBubblesByStatus } from '../utils/bubbleStatus';
 import { completeTask, deleteTaskForever, restoreTask, trashTask } from '../services/data/tasks';
 
 // Auto-cleanup period for deleted tasks (30 days)
````

```bash
git rm src/services/firestoreService.js
```

- [ ] **Step 7: Убрать мёртвые моки Firebase из трёх тестов**

Их комментарии объясняли, что модуль тянет `firestoreService` → `src/firebase.js`; после переноса статусов цепочка до Firebase не доходит.

````diff
diff --git a/src/utils/bubbleVisibility.test.js b/src/utils/bubbleVisibility.test.js
index 76ed0ba..bd7722d 100644
--- a/src/utils/bubbleVisibility.test.js
+++ b/src/utils/bubbleVisibility.test.js
@@ -1,20 +1,4 @@
-import { describe, it, expect, vi } from 'vitest';
-
-// bubbleVisibility imports BUBBLE_STATUS from firestoreService, which initializes
-// Firebase at module load. Mock the Firebase layer so the pure helpers can be
-// imported in the test environment (same approach as the useBubbleFilters /
-// useListFilters tests).
-vi.mock('../firebase', () => ({ db: {} }));
-vi.mock('firebase/firestore', () => ({
-    doc: () => ({}),
-    setDoc: () => {},
-    updateDoc: () => {},
-    deleteDoc: () => {},
-    getDocs: () => {},
-    collection: () => ({}),
-    writeBatch: () => ({}),
-    serverTimestamp: () => ({})
-}));
+import { describe, it, expect } from 'vitest';
 
 import { selectVisibleBubbles, computeBubbleSearchRender, countActiveBubblesByTag } from './bubbleVisibility';
 
````

````diff
diff --git a/src/hooks/__tests__/useListFilters.test.js b/src/hooks/__tests__/useListFilters.test.js
index 1beec38..4cdc9ce 100644
--- a/src/hooks/__tests__/useListFilters.test.js
+++ b/src/hooks/__tests__/useListFilters.test.js
@@ -1,21 +1,5 @@
 // @vitest-environment happy-dom
-import { describe, it, expect, vi } from 'vitest';
-
-// useListFilters imports firestoreService (for BUBBLE_STATUS / getBubblesByStatus),
-// which initializes Firebase at module load. Mock the Firebase layer so the pure
-// helpers can be imported in the test environment (same approach as
-// useBubbleFilters.test).
-vi.mock('../../firebase', () => ({ db: {} }));
-vi.mock('firebase/firestore', () => ({
-    doc: () => ({}),
-    setDoc: () => {},
-    updateDoc: () => {},
-    deleteDoc: () => {},
-    getDocs: () => {},
-    collection: () => ({}),
-    writeBatch: () => ({}),
-    serverTimestamp: () => ({})
-}));
+import { describe, it, expect } from 'vitest';
 
 import {
     toggleTagInFilter,
````

````diff
diff --git a/src/hooks/__tests__/useBubbleFilters.test.js b/src/hooks/__tests__/useBubbleFilters.test.js
index 00c87d9..287e3ec 100644
--- a/src/hooks/__tests__/useBubbleFilters.test.js
+++ b/src/hooks/__tests__/useBubbleFilters.test.js
@@ -1,19 +1,4 @@
-import { describe, it, expect, vi } from 'vitest';
-
-// useBubbleFilters imports firestoreService (for BUBBLE_STATUS), which initializes
-// Firebase at module load. Mock the Firebase layer so the pure helpers can be
-// imported in the node test environment (same approach as buildStatusFields.test).
-vi.mock('../../firebase', () => ({ db: {} }));
-vi.mock('firebase/firestore', () => ({
-    doc: () => ({}),
-    setDoc: () => {},
-    updateDoc: () => {},
-    deleteDoc: () => {},
-    getDocs: () => {},
-    collection: () => ({}),
-    writeBatch: () => ({}),
-    serverTimestamp: () => ({})
-}));
+import { describe, it, expect } from 'vitest';
 
 import {
     toggleTagInFilter,
````

- [ ] **Step 8: Старых коллекций задач и тегов в вебе больше нет**

Run: `grep -rn "firestoreService\|user-bubbles\|user-tags" src --include=*.js --include=*.jsx`
Expected: пусто.

- [ ] **Step 9: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  38 passed (38)`, `Tests  525 passed (525)`; линтер без ошибок.

- [ ] **Step 10: Commit**

```bash
git add -A src/utils/bubbleStatus.js src/hooks/useTags.js src/hooks/useTags.test.jsx src/pages/BubblesPage.jsx src/components/BubblesDialogs.jsx src/utils/listVisibility.js src/utils/bubbleVisibility.js src/hooks/useListFilters.js src/hooks/useBubbleNotifications.js src/components/TaskActionButtons.jsx src/components/TaskList.jsx src/utils/bubbleVisibility.test.js src/hooks/__tests__/useListFilters.test.js src/hooks/__tests__/useBubbleFilters.test.js
git commit -F - <<'EOF'
feat(categories): categories as users/{uid}/categories documents

Live list by order, a new category after the last one, only changed fields
saved, drag-and-drop with one write (or one renumbering batch), deletion
after the 7-second undo without touching tasks: the server clears their
categoryId. firestoreService.js is gone; the statuses move to utils.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 10: Настройки из `users/{uid}.settings`

Сейчас настройки разбросаны по `useState(() => localStorage…)` в `BubblesUiStore`, `useBubbleFilters`, `useListFilters`, `useThemeMode`, `BubblesPage`, `i18n.js` и пишутся туда же через `lsSet`. После задачи единственный источник — документ пользователя: `App` подписывается на него (`useUserSettings`) и ждёт настройки после входа, `BubblesUiStore` в одном месте переводит их в значения интерфейса (`categoryIds: null` ↔ «все категории», `list` ↔ `tasks`, `category` ↔ `tag`) и пишет изменения по полям. При первом входе документ создаётся из настроек этого браузера (`settingsFromLocalStorage` из 0.1), после чего старые ключи и копии `bubbles_{uid}`/`tags_{uid}` удаляются (спецификация 3.5, 8.2, 8.5). До входа экран использует язык устройства и системную тему.

**Files:**
- Create: `src/utils/legacyLocalData.js`, `src/state/settingsView.js`, `src/state/SettingsContext.js`, `src/state/SettingsStore.jsx`
- Test: `src/utils/legacyLocalData.test.js`, `src/state/settingsView.test.js`, `src/state/SettingsStore.test.jsx`, `src/state/BubblesUiStore.test.jsx`, `src/hooks/useThemeMode.test.jsx`, `src/components/LanguageSelector.test.jsx`
- Modify: `src/state/BubblesUiStore.jsx`, `src/hooks/useBubbleFilters.js` (замена целиком), `src/hooks/useListFilters.js`, `src/hooks/useTags.js`, `src/components/TaskList.jsx`, `src/pages/BubblesPage.jsx`, `src/components/BubbleDialogForm.jsx`, `src/utils/storage.js`, `src/hooks/useThemeMode.js` (замена целиком), `src/components/LanguageSelector.jsx`, `src/i18n.js`, `src/App.jsx`; тесты `src/hooks/useBubbleCrud.test.jsx`, `src/hooks/useTags.test.jsx`, `src/hooks/__tests__/useBubbleFilters.test.js`
- Delete: `src/utils/bubbleData.js`

**Interfaces:**
- Consumes: `subscribeUserDoc`, `ensureUserDoc`, `updateSettings` (задача 4); `settingsFromLocalStorage(getItem, deviceLanguage)` (`src/contract/migrateV1.js`, 0.1); реестр ключей `LS` (`src/utils/storageKeys.js`).
- Produces:
  - `src/utils/legacyLocalData.js`: `removeLegacyLocalData(storage, uid)` — удаляет все ключи `LS` и `bubbles_{uid}`, `tags_{uid}`; позиция кнопки «+», карты mindmap и чужие копии остаются;
  - `src/state/settingsView.js`: `selectedTagIds(categoryIds, tags)`, `categoryIdsFor(tagIds, tags)`, `mainViewForUi`/`mainViewForSettings`, `sortByForUi`/`sortByForSettings`;
  - `src/state/SettingsContext.js`: `SettingsContext`, `useSettings(): { settings, updateSettings, getSettings } | null` (без Firebase — его импортируют компоненты экрана входа);
  - `src/state/SettingsStore.jsx`: `useUserSettings(uid | null): { settings | null, updateSettings(changes), getSettings() }` — подписка, создание документа при первом входе, изменение сразу видно и пишется по полям, `getSettings()` отдаёт последнее значение, в том числе сразу после локального изменения;
  - `BubblesUiStore` (должен жить внутри `SettingsContext` с загруженными настройками): значения-настройки `filterTags`, `showNoTag`, `bubbleViewPlannedTasksOnly`, `listSortBy`, `listSortOrder`, `listFilterTags`, `listShowNoTag`, `fontSize`, `bubbleBackgroundEnabled`, `mainView`, `categoriesPanelEnabled`, `showInstructions` с сеттерами, принимающими значение или функцию, а также `setBubbleFilter(changes)`, `setListCategoryFilter(changes)` (поля в терминах v2) и `includeCategoryInFilters(categoryId)`;
  - `useThemeMode(settings, updateSettings)` — после входа тема и дизайн из настроек, до входа — `system`/`classic` только на этот сеанс;
  - `useBubbleFilters` больше не экспортирует `reconcileStaleFilterTags`: id удалённых категорий просто не показываются (`selectedTagIds`).

- [ ] **Step 1: Написать падающие тесты чистых модулей**

`src/utils/legacyLocalData.test.js`:

````js
import { describe, expect, it } from 'vitest';
import { LS } from './storageKeys';
import { removeLegacyLocalData } from './legacyLocalData';

const memoryStorage = (entries) => {
    const map = new Map(Object.entries(entries));
    return {
        keys: () => [...map.keys()].sort(),
        removeItem: (key) => map.delete(key),
    };
};

describe('removeLegacyLocalData (spec 2, 3.5, 8.2)', () => {
    it('removes the old settings keys and this user\'s copies of tasks and categories', () => {
        const legacy = Object.fromEntries(Object.values(LS).map((key) => [key, '"x"']));
        const storage = memoryStorage({ ...legacy, bubbles_u1: '[]', tags_u1: '[]' });
        removeLegacyLocalData(storage, 'u1');
        expect(storage.keys()).toEqual([]);
    });

    it('keeps what stays on the device: the FAB position, the mind maps and other accounts\' data', () => {
        const storage = memoryStorage({
            'bubbles-fab-position': '{}', 'mindmap-last-open-id': '"m1"', mindmaps_u1: '[]', bubbles_u2: '[]',
        });
        removeLegacyLocalData(storage, 'u1');
        expect(storage.keys()).toEqual(['bubbles-fab-position', 'bubbles_u2', 'mindmap-last-open-id', 'mindmaps_u1']);
    });

    it('does not fail when the storage is blocked', () => {
        const blocked = { removeItem: () => { throw new Error('SecurityError'); } };
        expect(() => removeLegacyLocalData(blocked, 'u1')).not.toThrow();
    });
});
````

`src/state/settingsView.test.js`:

````js
import { describe, expect, it } from 'vitest';
import {
    categoryIdsFor, mainViewForSettings, mainViewForUi, selectedTagIds, sortByForSettings, sortByForUi,
} from './settingsView';

const tags = [{ id: 'a' }, { id: 'b' }];

describe('category filters (spec 3.5: categoryIds null means all categories)', () => {
    it('shows "all" as every current category, including ones created later', () => {
        expect(selectedTagIds(null, tags)).toEqual(['a', 'b']);
        expect(selectedTagIds(null, [...tags, { id: 'c' }])).toEqual(['a', 'b', 'c']);
    });

    it('shows an explicit choice without categories that no longer exist', () => {
        expect(selectedTagIds(['b', 'gone'], tags)).toEqual(['b']);
    });

    it('writes a choice of every category back as null, any other choice as the list', () => {
        expect(categoryIdsFor(['b', 'a'], tags)).toBeNull();
        expect(categoryIdsFor(['a'], tags)).toEqual(['a']);
        expect(categoryIdsFor([], [])).toEqual([]);
    });
});

describe('renamed values', () => {
    it('maps the main view: the list is "tasks" in the UI', () => {
        expect(mainViewForUi('list')).toBe('tasks');
        expect(mainViewForUi('bubbles')).toBe('bubbles');
        expect(mainViewForSettings('tasks')).toBe('list');
        expect(mainViewForSettings('bubbles')).toBe('bubbles');
    });

    it('maps the list sort: sorting by category is "tag" in the UI', () => {
        expect(sortByForUi('category')).toBe('tag');
        expect(sortByForUi('title')).toBe('title');
        expect(sortByForSettings('tag')).toBe('category');
        expect(sortByForSettings('updatedAt')).toBe('updatedAt');
    });
});
````

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npx vitest run src/utils/legacyLocalData.test.js src/state/settingsView.test.js`
Expected: FAIL — `Error: Cannot find module './legacyLocalData' …` и `Error: Cannot find module './settingsView' …`, `Tests  no tests`.

- [ ] **Step 3: Написать `src/utils/legacyLocalData.js` и `src/state/settingsView.js`**

````js
/**
 * Data contract v2 keeps settings, tasks and categories only in Firestore (spec section 2).
 * After the first sign-in has moved this browser's settings into users/{uid}.settings
 * (spec 3.5), the old keys go, together with the v1 copies of tasks and categories (spec 8.2).
 * The FAB position, the mind maps and the Firebase installation id stay on the device.
 */
import { LS } from './storageKeys';

export const removeLegacyLocalData = (storage, uid) => {
    [...Object.values(LS), `bubbles_${uid}`, `tags_${uid}`].forEach((key) => {
        try {
            storage.removeItem(key);
        } catch {
            // Blocked storage (private mode, policy): nothing to clean up there.
        }
    });
};
````

````js
/**
 * Settings of data contract v2 (users/{uid}.settings, spec 3.5) <-> the values the UI keeps
 * using: filters as lists of tag ids, the list view as 'tasks', sorting by category as 'tag'.
 */

/** Filter ids the UI shows: null ("all") is every current category; deleted ones drop out. */
export const selectedTagIds = (categoryIds, tags) => {
    const ids = tags.map((tag) => tag.id);
    return categoryIds === null ? ids : categoryIds.filter((id) => ids.includes(id));
};

/** Back to settings: every current category selected is null, so later categories are shown too. */
export const categoryIdsFor = (tagIds, tags) => (tags.length > 0 && tags.every((tag) => tagIds.includes(tag.id))
    ? null
    : [...tagIds]);

export const mainViewForUi = (mainView) => (mainView === 'list' ? 'tasks' : 'bubbles');
export const mainViewForSettings = (mainView) => (mainView === 'tasks' ? 'list' : 'bubbles');

export const sortByForUi = (by) => (by === 'category' ? 'tag' : by);
export const sortByForSettings = (by) => (by === 'tag' ? 'category' : by);
````

Run: `npx vitest run src/utils/legacyLocalData.test.js src/state/settingsView.test.js`
Expected: PASS — `Tests  8 passed (8)`.

- [ ] **Step 4: Написать падающий тест `src/state/SettingsStore.test.jsx`**

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settingsFixtures from '../../contract/fixtures/settings.json';
import { ensureUserDoc, subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { useUserSettings } from './SettingsStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/settings', () => ({
    ensureUserDoc: vi.fn(() => Promise.resolve(true)),
    subscribeUserDoc: vi.fn(() => vi.fn()),
    updateSettings: vi.fn(() => Promise.resolve()),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

describe('useUserSettings (users/{uid}.settings, spec 3.4-3.5)', () => {
    let container;
    let root;
    let api;

    function Probe({ uid }) {
        api = useUserSettings(uid);
        return null;
    }
    const render = (uid) => act(() => root.render(<Probe uid={uid} />));
    const deliver = (settings) => act(() => subscribeUserDoc.mock.calls.at(-1)[2](settings));

    beforeEach(() => {
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('has no settings while signed out', () => {
        render(null);
        expect(api.settings).toBeNull();
        expect(subscribeUserDoc).not.toHaveBeenCalled();
    });

    it('creates the user document from this browser\'s old settings at the first sign-in, then removes the old keys', async () => {
        localStorage.setItem('app-theme-mode', 'dark');
        localStorage.setItem('bubbles-main-view', 'tasks');
        localStorage.setItem('bubbles_u1', '[]');
        localStorage.setItem('bubbles-fab-position', '{"x":1,"y":2}');
        render('u1');
        expect(ensureUserDoc).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ themeMode: 'dark', mainView: 'list' }));
        await flush();
        expect(Object.keys(localStorage)).toEqual(['bubbles-fab-position']);
    });

    it('waits for the settings from Firestore', () => {
        render('u1');
        expect(subscribeUserDoc).toHaveBeenCalledWith('db', 'u1', expect.any(Function), expect.any(Function));
        expect(api.settings).toBeNull();
        deliver(null); // the document does not exist yet
        expect(api.settings).toBeNull();
        deliver(DEFAULTS);
        expect(api.settings).toEqual(DEFAULTS);
    });

    it('shows a change at once, writes only that field and lets the next change build on it', () => {
        render('u1');
        deliver(DEFAULTS);
        act(() => api.updateSettings({ labelFontSize: 12 }));
        expect(api.settings.labelFontSize).toBe(12);
        expect(api.getSettings().labelFontSize).toBe(12);
        expect(writeSettings).toHaveBeenCalledWith('db', 'u1', { labelFontSize: 12 });
    });

    it('falls back to this browser\'s settings when the document cannot be read or created (first start offline)', async () => {
        ensureUserDoc.mockReturnValueOnce(Promise.reject(new Error('offline')));
        localStorage.setItem('app-design', 'clay');
        render('u1');
        await flush();
        expect(api.settings).toMatchObject({ design: 'clay' });
        expect(localStorage.getItem('app-design')).toBe('clay');
    });
});
````

Run: `npx vitest run src/state/SettingsStore.test.jsx`
Expected: FAIL — `Error: Failed to resolve import "./SettingsStore" from "src/state/SettingsStore.test.jsx". Does the file exist?`

- [ ] **Step 5: Написать `src/state/SettingsContext.js` и `src/state/SettingsStore.jsx`**

Контекст отдельно от хранилища: `LanguageSelector` на экране входа читает контекст и не должен тянуть `src/firebase.js` (иначе тест `AuthForm` падает на конфигурации).

````js
import { createContext, useContext } from 'react';

/**
 * The signed-in user's settings as useUserSettings (SettingsStore.jsx) gives them:
 * { settings, updateSettings, getSettings }. Signed out there is no provider and
 * useSettings() returns null. Kept apart from SettingsStore so that consumers do not
 * load Firebase.
 */
export const SettingsContext = createContext(null);

export const useSettings = () => useContext(SettingsContext);
````

````jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase';
import { ensureUserDoc, subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { settingsFromLocalStorage } from '../contract/migrateV1';
import { removeLegacyLocalData } from '../utils/legacyLocalData';
import logger from '../utils/logger';

/**
 * The signed-in user's settings, users/{uid}.settings (data contract v2, spec 3.4–3.5).
 * App keeps them with useUserSettings and hands them down through SettingsContext.
 */

// localStorage itself can throw (blocked storage): every access stays inside the callbacks.
const legacyStorage = {
    getItem: (key) => window.localStorage.getItem(key),
    removeItem: (key) => window.localStorage.removeItem(key),
};

/**
 * Live settings of uid. At sign-in the user document is created if it does not exist yet,
 * seeded from this browser's old settings, and then the old local keys are removed.
 * settings is null while signed out and until the document is read.
 */
export function useUserSettings(uid) {
    const [settings, setSettings] = useState(null);
    // Latest settings, also right after a local change: several changes made in one
    // handler build on each other instead of on the last render.
    const latest = useRef(null);

    const apply = useCallback((next) => {
        latest.current = next;
        setSettings(next);
    }, []);

    useEffect(() => {
        apply(null);
        if (!uid) return undefined;
        const initial = settingsFromLocalStorage(legacyStorage.getItem, navigator.language);
        ensureUserDoc(db, uid, initial)
            .then(() => removeLegacyLocalData(legacyStorage, uid))
            .catch((e) => {
                // No document and no way to create it now (e.g. the first start offline):
                // work with this browser's settings until the document can be read.
                logger.error('Could not create the user document:', e);
                if (!latest.current) apply(initial);
            });
        return subscribeUserDoc(db, uid, (next) => {
            if (next) apply(next);
        }, (e) => logger.error('Settings listener error:', e));
    }, [uid, apply]);

    const updateSettings = useCallback((changes) => {
        if (!uid || !latest.current) return;
        apply({ ...latest.current, ...changes });
        writeSettings(db, uid, changes).catch((e) => logger.error('Could not save settings:', e));
    }, [uid, apply]);

    const getSettings = useCallback(() => latest.current, []);

    return useMemo(() => ({ settings, updateSettings, getSettings }), [settings, updateSettings, getSettings]);
}
````

Run: `npx vitest run src/state/SettingsStore.test.jsx`
Expected: PASS — `Tests  5 passed (5)`.

- [ ] **Step 6: Написать падающий тест `src/state/BubblesUiStore.test.jsx`**

Хранилище интерфейса проверяется вместе с настоящим `useUserSettings` (модуль Firestore подменён).

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import settingsFixtures from '../../contract/fixtures/settings.json';
import { subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
import { SettingsContext } from './SettingsContext';
import { useUserSettings } from './SettingsStore';
import { BubblesUiProvider, useBubblesUi } from './BubblesUiStore';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/settings', () => ({
    ensureUserDoc: vi.fn(() => Promise.resolve(false)),
    subscribeUserDoc: vi.fn(() => vi.fn()),
    updateSettings: vi.fn(() => Promise.resolve()),
}));
vi.mock('./BubblesDataStore', () => ({
    useBubblesData: () => ({ bubbles: [], tags: [{ id: 'a' }, { id: 'b' }] }),
}));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));

const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;

describe('BubblesUiStore: settings-backed values (spec 3.5)', () => {
    let container;
    let root;
    let ui;

    function Consumer() {
        ui = useBubblesUi();
        return null;
    }

    function App() {
        const api = useUserSettings('u1');
        return (
            <SettingsContext.Provider value={api}>
                {api.settings && <BubblesUiProvider><Consumer /></BubblesUiProvider>}
            </SettingsContext.Provider>
        );
    }

    const lastWrite = () => writeSettings.mock.calls.at(-1)[2];

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root.render(<App />));
        act(() => subscribeUserDoc.mock.calls[0][2](DEFAULTS));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('shows the filter "all" as every category and writes a full choice back as null', () => {
        expect(ui.filterTags).toEqual(['a', 'b']);
        act(() => ui.setFilterTags(['a']));
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: ['a'], showUncategorized: true, plannedOnly: false } });
        expect(ui.filterTags).toEqual(['a']);
        act(() => ui.setFilterTags((prev) => [...prev, 'b']));
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: null, showUncategorized: true, plannedOnly: false } });
    });

    it('keeps both changes when one handler changes the categories and "no category" together', () => {
        act(() => {
            ui.setFilterTags(['a']);
            ui.setShowNoTag(false);
        });
        expect(lastWrite()).toEqual({ bubbleFilter: { categoryIds: ['a'], showUncategorized: false, plannedOnly: false } });
        expect(ui.filterTags).toEqual(['a']);
        expect(ui.showNoTag).toBe(false);
    });

    it('adds a new category to an explicit filter and leaves "all" as it is', () => {
        act(() => ui.setListFilterTags(['a']));
        act(() => ui.includeCategoryInFilters('c'));
        expect(writeSettings.mock.calls.map((call) => call[2])).toEqual([
            { listFilter: { categoryIds: ['a'], showUncategorized: true } },
            { listFilter: { categoryIds: ['a', 'c'], showUncategorized: true } },
        ]);
    });

    it('maps the main view and the category sort to their v2 names', () => {
        act(() => ui.setMainView('tasks'));
        expect(lastWrite()).toEqual({ mainView: 'list' });
        expect(ui.mainView).toBe('tasks');
        act(() => ui.setListSortBy('tag'));
        expect(lastWrite()).toEqual({ listSort: { by: 'category', order: 'desc' } });
        expect(ui.listSortBy).toBe('tag');
    });

    it('saves the label size, the background, the panel and the hints as their own settings', () => {
        act(() => ui.setFontSize(12));
        expect(lastWrite()).toEqual({ labelFontSize: 12 });
        act(() => ui.setBubbleBackgroundEnabled((on) => !on));
        expect(lastWrite()).toEqual({ bubbleBackground: false });
        act(() => ui.setCategoriesPanelEnabled(true));
        expect(lastWrite()).toEqual({ showCategoriesPanel: true });
        act(() => ui.setShowInstructions(false));
        expect(lastWrite()).toEqual({ showInstructions: false });
        expect(ui).toMatchObject({ fontSize: 12, bubbleBackgroundEnabled: false, categoriesPanelEnabled: true, showInstructions: false });
    });
});
````

Run: `npx vitest run src/state/BubblesUiStore.test.jsx`
Expected: FAIL — `Tests  5 failed (5)`: `AssertionError: expected [] to deeply equal [ 'a', 'b' ]` и `TypeError: Cannot read properties of undefined (reading '2')` — старое хранилище берёт значения из localStorage и в Firestore не пишет.

- [ ] **Step 7: Значения-настройки в `src/state/BubblesUiStore.jsx`**

````diff
diff --git a/src/state/BubblesUiStore.jsx b/src/state/BubblesUiStore.jsx
index 3e982ce..9e4cff0 100644
--- a/src/state/BubblesUiStore.jsx
+++ b/src/state/BubblesUiStore.jsx
@@ -1,17 +1,21 @@
-import React, { createContext, useContext, useState, useCallback } from 'react';
-import { lsGet, lsGetString } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
+import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
 import { isAllTagsSelected, countBubblesByTagForBubblesView } from '../utils/bubbleVisibility';
 import { isAllListTagsSelected, countBubblesByTagForListView } from '../utils/listVisibility';
 import { isColorAvailable as isColorAvailablePure } from '../hooks/tagColors';
 import { useBubblesData } from './BubblesDataStore';
+import { useSettings } from './SettingsContext';
+import {
+    categoryIdsFor, mainViewForSettings, mainViewForUi, selectedTagIds, sortByForSettings, sortByForUi,
+} from './settingsView';
 
 /**
  * BubblesUiContext
  *
  * Central store for bubbles/tags view state (dialogs, filters, form state, etc.).
  * Composed with BubblesDataContext via useBubblesData() to compute derived values
- * that mix UI state and data.
+ * that mix UI state and data. The values that are user settings (filters, list
+ * sort, label size, background, main view, panel, hints) come from
+ * users/{uid}.settings through SettingsContext and are written back field by field.
  */
 const BubblesUiContext = createContext(null);
 
@@ -35,6 +39,9 @@ export function BubblesUiProvider({
 }) {
     // Acquire data-layer state for computing mixed derived values
     const { bubbles, tags } = useBubblesData();
+    const { settings, updateSettings, getSettings } = useSettings();
+    const tagsRef = useRef(tags);
+    tagsRef.current = tags;
 
     // Currently selected tag id for the create/edit bubble dialog
     const [selectedTagId, setSelectedTagId] = useState('');
@@ -43,17 +50,73 @@ export function BubblesUiProvider({
     const [searchFoundBubbles, setSearchFoundBubbles] = useState([]);
     const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
 
-    // Filter state for bubbles view
-    const [filterTags, setFilterTags] = useState(() => lsGet(LS.FILTER_TAGS, []));
-    const [showNoTag, setShowNoTag] = useState(() => lsGet(LS.SHOW_NO_TAG, true));
+    // Settings-backed values (spec 3.5). Setters take a value or an updater, like useState
+    // setters; each one starts from getSettings(), so changes made in one handler add up.
+    const resolve = (next, current) => (typeof next === 'function' ? next(current) : next);
+    const setSetting = useCallback((key, next, toUi = (v) => v, toSettings = (v) => v) => {
+        updateSettings({ [key]: toSettings(resolve(next, toUi(getSettings()[key]))) });
+    }, [updateSettings, getSettings]);
 
-    // Filter state for list view
+    // Filter state for bubbles view: settings.bubbleFilter
+    const filterTags = useMemo(
+        () => selectedTagIds(settings.bubbleFilter.categoryIds, tags),
+        [settings.bubbleFilter.categoryIds, tags]
+    );
+    const showNoTag = settings.bubbleFilter.showUncategorized;
+    const bubbleViewPlannedTasksOnly = settings.bubbleFilter.plannedOnly;
+    // changes = { categoryIds?, showUncategorized?, plannedOnly? } in settings terms
+    const setBubbleFilter = useCallback((changes) => {
+        updateSettings({ bubbleFilter: { ...getSettings().bubbleFilter, ...changes } });
+    }, [updateSettings, getSettings]);
+    const setFilterTags = useCallback((next) => {
+        const current = selectedTagIds(getSettings().bubbleFilter.categoryIds, tagsRef.current);
+        setBubbleFilter({ categoryIds: categoryIdsFor(resolve(next, current), tagsRef.current) });
+    }, [setBubbleFilter, getSettings]);
+    const setShowNoTag = useCallback((next) => {
+        setBubbleFilter({ showUncategorized: resolve(next, getSettings().bubbleFilter.showUncategorized) });
+    }, [setBubbleFilter, getSettings]);
+    const setBubbleViewPlannedTasksOnly = useCallback((next) => {
+        setBubbleFilter({ plannedOnly: resolve(next, getSettings().bubbleFilter.plannedOnly) });
+    }, [setBubbleFilter, getSettings]);
+
+    // Filter state for list view: the status tab and the search are not settings
     const [listFilter, setListFilter] = useState('active');
     const [listSearchQuery, setListSearchQuery] = useState('');
-    const [listSortBy, setListSortBy] = useState(() => lsGetString(LS.LIST_SORT_BY) || 'updatedAt');
-    const [listSortOrder, setListSortOrder] = useState(() => lsGetString(LS.LIST_SORT_ORDER) || 'desc');
-    const [listFilterTags, setListFilterTags] = useState(() => lsGet(LS.LIST_FILTER_TAGS, []));
-    const [listShowNoTag, setListShowNoTag] = useState(() => lsGet(LS.LIST_SHOW_NO_TAG, true));
+    const listSortBy = sortByForUi(settings.listSort.by);
+    const listSortOrder = settings.listSort.order;
+    const setListSortBy = useCallback((next) => {
+        const { listSort } = getSettings();
+        updateSettings({ listSort: { ...listSort, by: sortByForSettings(resolve(next, sortByForUi(listSort.by))) } });
+    }, [updateSettings, getSettings]);
+    const setListSortOrder = useCallback((next) => {
+        const { listSort } = getSettings();
+        updateSettings({ listSort: { ...listSort, order: resolve(next, listSort.order) } });
+    }, [updateSettings, getSettings]);
+    // settings.listFilter
+    const listFilterTags = useMemo(
+        () => selectedTagIds(settings.listFilter.categoryIds, tags),
+        [settings.listFilter.categoryIds, tags]
+    );
+    const listShowNoTag = settings.listFilter.showUncategorized;
+    // changes = { categoryIds?, showUncategorized? } in settings terms
+    const setListCategoryFilter = useCallback((changes) => {
+        updateSettings({ listFilter: { ...getSettings().listFilter, ...changes } });
+    }, [updateSettings, getSettings]);
+    const setListFilterTags = useCallback((next) => {
+        const current = selectedTagIds(getSettings().listFilter.categoryIds, tagsRef.current);
+        setListCategoryFilter({ categoryIds: categoryIdsFor(resolve(next, current), tagsRef.current) });
+    }, [setListCategoryFilter, getSettings]);
+    const setListShowNoTag = useCallback((next) => {
+        setListCategoryFilter({ showUncategorized: resolve(next, getSettings().listFilter.showUncategorized) });
+    }, [setListCategoryFilter, getSettings]);
+    // A new category shows up in both filters: an explicit choice gets it, "all" (null) has it already
+    const includeCategoryInFilters = useCallback((categoryId) => {
+        const { bubbleFilter, listFilter: listCategoryFilter } = getSettings();
+        if (bubbleFilter.categoryIds !== null) setBubbleFilter({ categoryIds: [...bubbleFilter.categoryIds, categoryId] });
+        if (listCategoryFilter.categoryIds !== null) {
+            setListCategoryFilter({ categoryIds: [...listCategoryFilter.categoryIds, categoryId] });
+        }
+    }, [getSettings, setBubbleFilter, setListCategoryFilter]);
 
     // Form state for the create/edit bubble dialogs
     const [dueDate, setDueDate] = useState(null);              // create-form due date
@@ -76,17 +139,19 @@ export function BubblesUiProvider({
     const [logoutDialog, setLogoutDialog] = useState(false);
     const [listViewDialog, setListViewDialog] = useState(false);
     const [aboutOpen, setAboutOpen] = useState(false);
-    const [fontSize, setFontSize] = useState(() => {
-        const savedFontSize = lsGetString(LS.FONT_SIZE);
-        return savedFontSize ? parseInt(savedFontSize) : 8;
-    });
-    const [bubbleBackgroundEnabled, setBubbleBackgroundEnabled] = useState(() => {
-        const saved = lsGetString(LS.BACKGROUND_ENABLED);
-        return saved === null ? true : saved === 'true';
-    });
-    const [mainView, setMainView] = useState(() => {
-        return lsGetString(LS.MAIN_VIEW) === 'tasks' ? 'tasks' : 'bubbles';
-    });
+    const fontSize = settings.labelFontSize;
+    const setFontSize = useCallback((next) => setSetting('labelFontSize', next), [setSetting]);
+    const bubbleBackgroundEnabled = settings.bubbleBackground;
+    const setBubbleBackgroundEnabled = useCallback((next) => setSetting('bubbleBackground', next), [setSetting]);
+    const mainView = mainViewForUi(settings.mainView);
+    const setMainView = useCallback(
+        (next) => setSetting('mainView', next, mainViewForUi, mainViewForSettings),
+        [setSetting]
+    );
+    const categoriesPanelEnabled = settings.showCategoriesPanel;
+    const setCategoriesPanelEnabled = useCallback((next) => setSetting('showCategoriesPanel', next), [setSetting]);
+    const showInstructions = settings.showInstructions;
+    const setShowInstructions = useCallback((next) => setSetting('showInstructions', next), [setSetting]);
 
     // Tag-editor + categories dialog state
     const [tagDialog, setTagDialog] = useState(false);
@@ -142,6 +207,9 @@ export function BubblesUiProvider({
         setFilterTags,
         showNoTag,
         setShowNoTag,
+        bubbleViewPlannedTasksOnly,
+        setBubbleViewPlannedTasksOnly,
+        setBubbleFilter,
         searchFoundBubbles,
         setSearchFoundBubbles,
         debouncedSearchQuery,
@@ -158,6 +226,8 @@ export function BubblesUiProvider({
         setListFilterTags,
         listShowNoTag,
         setListShowNoTag,
+        setListCategoryFilter,
+        includeCategoryInFilters,
         dueDate,
         setDueDate,
         editDueDate,
@@ -200,6 +270,10 @@ export function BubblesUiProvider({
         setBubbleBackgroundEnabled,
         mainView,
         setMainView,
+        categoriesPanelEnabled,
+        setCategoriesPanelEnabled,
+        showInstructions,
+        setShowInstructions,
         tagDialog,
         setTagDialog,
         tagName,
````

`BubblesUiProvider` теперь требует контекст настроек — тест `useBubbleCrud` оборачивается в него:

````diff
diff --git a/src/hooks/useBubbleCrud.test.jsx b/src/hooks/useBubbleCrud.test.jsx
index 724095e..e2217ee 100644
--- a/src/hooks/useBubbleCrud.test.jsx
+++ b/src/hooks/useBubbleCrud.test.jsx
@@ -3,6 +3,8 @@ import React, { act, useEffect } from 'react';
 import { createRoot } from 'react-dom/client';
 import Matter from 'matter-js';
 import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import settingsFixtures from '../../contract/fixtures/settings.json';
+import { SettingsContext } from '../state/SettingsContext';
 import { BubblesDataProvider, useBubblesData } from '../state/BubblesDataStore';
 import { BubblesUiProvider, useBubblesUi } from '../state/BubblesUiStore';
 import { bubbleFromTask } from '../services/data/bubbleModel';
@@ -21,6 +23,9 @@ vi.mock('../services/data/tasks', async (importOriginal) => ({
 }));
 vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
 
+const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
+const SETTINGS = { settings: DEFAULTS, updateSettings: vi.fn(), getSettings: () => DEFAULTS };
+
 const TASK = {
     id: 't1',
     title: 'Pay bills',
@@ -91,7 +96,11 @@ describe('useBubbleCrud: task writes through the v2 data layer', () => {
         container = document.createElement('div');
         document.body.appendChild(container);
         root = createRoot(container);
-        act(() => root.render(<BubblesDataProvider><BubblesUiProvider><Probe /></BubblesUiProvider></BubblesDataProvider>));
+        act(() => root.render(
+            <SettingsContext.Provider value={SETTINGS}>
+                <BubblesDataProvider><BubblesUiProvider><Probe /></BubblesUiProvider></BubblesDataProvider>
+            </SettingsContext.Provider>
+        ));
     });
 
     afterEach(() => {
````

Run: `npx vitest run src/state/BubblesUiStore.test.jsx src/hooks/useBubbleCrud.test.jsx`
Expected: PASS — `Tests  12 passed (12)`.

- [ ] **Step 8: Заменить `src/hooks/useBubbleFilters.js` целиком**

Инициализация из localStorage, запись `lsSet` и сброс «чужих» id (`reconcileStaleFilterTags`) уходят: фильтр — настройка пользователя, по умолчанию `null` («все категории»), а id удалённых категорий не показываются. Выбранная категория панели по-прежнему следует за фильтрами.

````js
import { useCallback, useEffect, useState } from 'react';
import { useBubblesUi } from '../state/BubblesUiStore';

// Pure helper: toggle a tag id in/out of the filter list (returns a new array).
export function toggleTagInFilter(filterTags, tagId) {
    return filterTags.includes(tagId)
        ? filterTags.filter((id) => id !== tagId)
        : [...filterTags, tagId];
}

/**
 * Bubbles-view filter and category panel. The filter itself is the user's setting
 * bubbleFilter (users/{uid}.settings, spec 3.5) kept by BubblesUiStore; this hook keeps the
 * selected category of the panel in step with it.
 */
export function useBubbleFilters({ tags }) {
    const {
        register,
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        bubbleViewPlannedTasksOnly,
        setBubbleViewPlannedTasksOnly,
        setBubbleFilter,
        categoriesPanelEnabled,
        setCategoriesPanelEnabled,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
    } = useBubblesUi();

    const [selectedCategory, setSelectedCategory] = useState(null); // Выбранная категория

    // Синхронизация selectedCategory при изменении фильтров
    useEffect(() => {
        if (tags.length > 0) {
            // Если выбраны все теги и включен показ пузырей без тегов - это "all" или «Запланированные»
            if (filterTags.length === tags.length && showNoTag) {
                setSelectedCategory(bubbleViewPlannedTasksOnly ? 'planned-tasks' : 'all');
            }
            // Если не выбраны теги, но включен показ пузырей без тегов - это "no-tags"
            else if (filterTags.length === 0 && showNoTag) {
                setSelectedCategory('no-tags');
            }
            // Если выбран только один тег - это конкретная категория
            else if (filterTags.length === 1 && !showNoTag) {
                setSelectedCategory(filterTags[0]);
            }
            // Если выбрано несколько тегов (но не все) или другие комбинации — не выделяем категорию
            else {
                setSelectedCategory(null);
            }
        } else if (bubbleViewPlannedTasksOnly) {
            setSelectedCategory('planned-tasks');
        }
    }, [filterTags, showNoTag, tags, bubbleViewPlannedTasksOnly]);

    const handleCategorySelect = (categoryId) => {
        setSelectedCategory(categoryId);
        // Панель не закрывается при выборе категории, если она постоянно включена

        if (categoryId === 'all') {
            // Показываем все пузыри (null: все категории, и новые тоже)
            setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: false });
        } else if (categoryId === 'planned-tasks') {
            setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: true });
        } else if (categoryId === 'no-tags') {
            // Показываем только пузыри без тегов
            setBubbleFilter({ categoryIds: [], showUncategorized: true, plannedOnly: false });
        } else {
            // Устанавливаем фильтр только на выбранную категорию
            setBubbleFilter({ categoryIds: [categoryId], showUncategorized: false, plannedOnly: false });
        }
    };

    const handleToggleCategoriesPanel = () => {
        setCategoriesPanelEnabled(!categoriesPanelEnabled);
    };

    // --- bubbles-view filter callbacks (moved from BubblesPage, Task B of #66) ---
    const handleTagFilterChange = useCallback((tagId) => {
        setBubbleViewPlannedTasksOnly(false);
        setFilterTags((prev) => toggleTagInFilter(prev, tagId));
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, [setBubbleViewPlannedTasksOnly, setFilterTags]);

    const handleNoTagFilterChange = useCallback(() => {
        setBubbleViewPlannedTasksOnly(false);
        setShowNoTag((prev) => !prev);
        // Сбрасываем выбранную категорию при ручном изменении фильтров
        setSelectedCategory(null);
    }, [setBubbleViewPlannedTasksOnly, setShowNoTag]);

    const clearAllFilters = useCallback(() => {
        setBubbleFilter({ categoryIds: [], showUncategorized: false, plannedOnly: false });
        setSelectedCategory(null); // Сбрасываем выбранную категорию
    }, [setBubbleFilter]);

    const selectAllFilters = useCallback(() => {
        setBubbleFilter({ categoryIds: null, showUncategorized: true, plannedOnly: false });
        setSelectedCategory(null); // Сбрасываем выбранную категорию
    }, [setBubbleFilter]);

    // Register the 4 filter handlers for TaskFilterDrawer to access via the store.
    // NOTE: This effect is placed after all four handler definitions to avoid TDZ
    // (Temporal Dead Zone) — the dependency array must not reference const callbacks
    // that are still in the dead zone.
    useEffect(() => {
        register({
            handleTagFilterChange,
            handleNoTagFilterChange,
            selectAllFilters,
            clearAllFilters,
        });
    }, [register, handleTagFilterChange, handleNoTagFilterChange, selectAllFilters, clearAllFilters]);

    return {
        filterTags,
        setFilterTags,
        showNoTag,
        setShowNoTag,
        bubbleViewPlannedTasksOnly,
        setBubbleViewPlannedTasksOnly,
        selectedCategory,
        setSelectedCategory,
        categoriesPanelEnabled,
        setCategoriesPanelEnabled,
        handleCategorySelect,
        handleToggleCategoriesPanel,
        handleTagFilterChange,
        handleNoTagFilterChange,
        clearAllFilters,
        selectAllFilters,
        isAllSelected,
        getBubbleCountByTagForBubblesView,
    };
}
````

````diff
diff --git a/src/hooks/__tests__/useBubbleFilters.test.js b/src/hooks/__tests__/useBubbleFilters.test.js
index 287e3ec..373a5f3 100644
--- a/src/hooks/__tests__/useBubbleFilters.test.js
+++ b/src/hooks/__tests__/useBubbleFilters.test.js
@@ -1,9 +1,6 @@
 import { describe, it, expect } from 'vitest';
 
-import {
-    toggleTagInFilter,
-    reconcileStaleFilterTags
-} from '../useBubbleFilters';
+import { toggleTagInFilter } from '../useBubbleFilters';
 
 import {
     isAllTagsSelected,
@@ -53,40 +50,6 @@ describe('isAllTagsSelected (isAllSelected)', () => {
     });
 });
 
-describe('reconcileStaleFilterTags (account switch)', () => {
-    const tags = [tag('a'), tag('b')];
-
-    it('resets to "all" when the filter holds a tag id from another account', () => {
-        // single category from a previous account whose tag does not exist anymore
-        expect(reconcileStaleFilterTags(tags, ['old-tag-from-account-A'])).toEqual({
-            filterTags: ['a', 'b'],
-            showNoTag: true,
-            selectedCategory: 'all'
-        });
-    });
-
-    it('resets when only some of the saved ids are stale', () => {
-        expect(reconcileStaleFilterTags(tags, ['a', 'old-tag'])).toEqual({
-            filterTags: ['a', 'b'],
-            showNoTag: true,
-            selectedCategory: 'all'
-        });
-    });
-
-    it('returns null when every saved id exists for the current account', () => {
-        expect(reconcileStaleFilterTags(tags, ['a'])).toBeNull();
-        expect(reconcileStaleFilterTags(tags, ['a', 'b'])).toBeNull();
-    });
-
-    it('returns null for the empty filter ("no tags" category is account-agnostic)', () => {
-        expect(reconcileStaleFilterTags(tags, [])).toBeNull();
-    });
-
-    it('returns null while tags are still loading (empty tags)', () => {
-        expect(reconcileStaleFilterTags([], ['anything'])).toBeNull();
-    });
-});
-
 describe('countBubblesByTagForBubblesView (getBubbleCountByTagForBubblesView)', () => {
     const tags = [tag('a'), tag('b')];
     const bubbles = [
````

- [ ] **Step 9: Остальные места, писавшие настройки в localStorage**

````diff
diff --git a/src/hooks/useListFilters.js b/src/hooks/useListFilters.js
index 7fb5a36..e5d2569 100644
--- a/src/hooks/useListFilters.js
+++ b/src/hooks/useListFilters.js
@@ -1,6 +1,4 @@
 import { useCallback, useEffect, useRef } from 'react';
-import { lsGet, lsSet } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
 import { getBubblesByStatus } from '../utils/bubbleStatus';
 import { toggleTagInFilter } from './useBubbleFilters';
 import { useBubblesData } from '../state/BubblesDataStore';
@@ -51,6 +49,7 @@ export function useListFilters({ tags }) {
         setListFilterTags,
         listShowNoTag,
         setListShowNoTag,
+        setListCategoryFilter,
         isAllListFiltersSelected,
         getBubbleCountByTagForListView,
     } = useBubblesUi();
@@ -61,53 +60,23 @@ export function useListFilters({ tags }) {
         storeDataRef.current = { bubbles, listFilter, listSearchQuery };
     }, [bubbles, listFilter, listSearchQuery]);
 
-    // Инициализация настроек фильтра списка задач после загрузки тегов
-    useEffect(() => {
-        if (tags.length > 0) {
-            // Тоже самое для настроек фильтра в списке задач
-            const savedListFilterTags = lsGet(LS.LIST_FILTER_TAGS);
-            const savedListShowNoTag = lsGet(LS.LIST_SHOW_NO_TAG);
-            if (savedListFilterTags === null && savedListShowNoTag === null) {
-                const allTagIds = tags.map(tag => tag.id);
-                setListFilterTags(allTagIds);
-                setListShowNoTag(true);
-                lsSet(LS.LIST_FILTER_TAGS, allTagIds);
-                lsSet(LS.LIST_SHOW_NO_TAG, true);
-            }
-        }
-    }, [tags, setListFilterTags, setListShowNoTag]);
-
-    // Memoized functions for list filter management
+    // Memoized functions for list filter management. The filter is the user's setting
+    // listFilter (users/{uid}.settings), kept by BubblesUiStore; by default all categories.
     const handleListTagFilterChange = useCallback((tagId) => {
-        setListFilterTags(prev => {
-            const newListFilterTags = toggleTagInFilter(prev, tagId);
-            lsSet(LS.LIST_FILTER_TAGS, newListFilterTags);
-            return newListFilterTags;
-        });
+        setListFilterTags(prev => toggleTagInFilter(prev, tagId));
     }, [setListFilterTags]);
 
     const handleListNoTagFilterChange = useCallback(() => {
-        setListShowNoTag(prev => {
-            const newListShowNoTag = !prev;
-            lsSet(LS.LIST_SHOW_NO_TAG, newListShowNoTag);
-            return newListShowNoTag;
-        });
+        setListShowNoTag(prev => !prev);
     }, [setListShowNoTag]);
 
     const clearAllListFilters = useCallback(() => {
-        setListFilterTags([]);
-        setListShowNoTag(false);
-        lsSet(LS.LIST_FILTER_TAGS, []);
-        lsSet(LS.LIST_SHOW_NO_TAG, false);
-    }, [setListFilterTags, setListShowNoTag]);
+        setListCategoryFilter({ categoryIds: [], showUncategorized: false });
+    }, [setListCategoryFilter]);
 
     const selectAllListFilters = useCallback(() => {
-        const allTagIds = tags.map(tag => tag.id);
-        setListFilterTags(allTagIds);
-        setListShowNoTag(true);
-        lsSet(LS.LIST_FILTER_TAGS, allTagIds);
-        lsSet(LS.LIST_SHOW_NO_TAG, true);
-    }, [tags, setListFilterTags, setListShowNoTag]);
+        setListCategoryFilter({ categoryIds: null, showUncategorized: true });
+    }, [setListCategoryFilter]);
 
     // Function for filtering bubbles for list view (supports all statuses).
     // Deps from store (via ref) or local state.
````

Новая категория попадает в явный выбор фильтров через `includeCategoryInFilters`; фильтр «все» (`null`) включает её и так:

````diff
diff --git a/src/hooks/useTags.js b/src/hooks/useTags.js
index edfb4b1..fa9729d 100644
--- a/src/hooks/useTags.js
+++ b/src/hooks/useTags.js
@@ -1,6 +1,4 @@
 import { useEffect, useRef } from 'react';
-import { lsSet } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
 import { db } from '../firebase';
 import {
     createCategory,
@@ -29,14 +27,13 @@ import {
  * Seam note: the live subscription only sets `tags`; filter reconciliation and
  * bubble recolouring stay in BubblesPage as a separate effect keyed on `[tags]`.
  *
- * `setFilterTags` / `setListFilterTags` are read from BubblesStore, which avoids
- * the useTags <-> useBubbleFilters render-order cycle: useBubbleFilters needs
- * `tags` produced here.
+ * The filters are user settings kept by BubblesUiStore; a new category is added
+ * to them through includeCategoryInFilters.
  */
 export function useTags({ user }) {
     const { tags, setTags } = useBubblesData();
     const {
-        setFilterTags, setListFilterTags,
+        includeCategoryInFilters,
         // Tag-editor state migrated into the store (Stage H of 010d); the handlers
         // below read/set it here instead of via local useState.
         tagName, setTagName, tagColor, setTagColor, editingTag, setEditingTag,
@@ -111,19 +108,7 @@ export function useTags({ user }) {
                 .catch(e => logger.error('Error saving tag:', e));
 
             // Автоматически активируем новый тег в фильтрах (только для создания, не для редактирования)
-            // Активируем в фильтрах Bubbles View
-            setFilterTags(prev => {
-                const newFilterTags = [...prev, newTag.id];
-                lsSet(LS.FILTER_TAGS, newFilterTags);
-                return newFilterTags;
-            });
-
-            // Активируем в фильтрах List View
-            setListFilterTags(prev => {
-                const newListFilterTags = [...prev, newTag.id];
-                lsSet(LS.LIST_FILTER_TAGS, newListFilterTags);
-                return newListFilterTags;
-            });
+            includeCategoryInFilters(newTag.id);
         }
 
         setTagDialog(false);
````

````diff
diff --git a/src/hooks/useTags.test.jsx b/src/hooks/useTags.test.jsx
index 37d8dd5..c3f0f4a 100644
--- a/src/hooks/useTags.test.jsx
+++ b/src/hooks/useTags.test.jsx
@@ -63,8 +63,7 @@ describe('useTags: categories as v2 documents', () => {
 
         data = { tags: [TAG_A, TAG_B], setTags: vi.fn(), setBubbles: vi.fn() };
         ui = {
-            setFilterTags: vi.fn(),
-            setListFilterTags: vi.fn(),
+            includeCategoryInFilters: vi.fn(),
             tagName: '',
             setTagName: vi.fn(),
             tagColor: '#da3833',
@@ -99,6 +98,7 @@ describe('useTags: categories as v2 documents', () => {
         render({ uid: 'user-a' });
         act(() => handlers.handleSaveTag());
         expect(createCategory).toHaveBeenCalledWith('db', 'user-a', 'new-cat', { name: 'Home', color: '#fd8b2b', order: 3 });
+        expect(ui.includeCategoryInFilters).toHaveBeenCalledWith('new-cat');
     });
 
     it('saves only what changed in a category', () => {
````

````diff
diff --git a/src/components/TaskList.jsx b/src/components/TaskList.jsx
index 6e70514..65cb0dd 100644
--- a/src/components/TaskList.jsx
+++ b/src/components/TaskList.jsx
@@ -1,6 +1,4 @@
 import React, { useMemo, useCallback, useEffect } from 'react';
-import { lsSet } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
 import logger from '../utils/logger';
 import {
     Box,
@@ -358,9 +356,7 @@ const TaskList = ({
                             value={listSortBy}
                             label={t('bubbles.sortBy')}
                             onChange={(e) => {
-                                const newSortBy = e.target.value;
-                                setListSortBy(newSortBy);
-                                lsSet(LS.LIST_SORT_BY, newSortBy);
+                                setListSortBy(e.target.value);
                             }}
                         >
                             <MenuItem value="createdAt">{t('bubbles.createdAt')}</MenuItem>
@@ -372,9 +368,7 @@ const TaskList = ({
                     <Tooltip title={listSortOrder === 'asc' ? t('bubbles.sortAscending') : t('bubbles.sortDescending')}>
                         <IconButton
                             onClick={() => {
-                                const newSortOrder = listSortOrder === 'asc' ? 'desc' : 'asc';
-                                setListSortOrder(newSortOrder);
-                                lsSet(LS.LIST_SORT_ORDER, newSortOrder);
+                                setListSortOrder(listSortOrder === 'asc' ? 'desc' : 'asc');
                             }}
                             sx={{
                                 color: 'primary.main',
````

````diff
diff --git a/src/pages/BubblesPage.jsx b/src/pages/BubblesPage.jsx
index 3849866..c43b5ce 100644
--- a/src/pages/BubblesPage.jsx
+++ b/src/pages/BubblesPage.jsx
@@ -6,8 +6,6 @@ import {
 } from '@mui/material';
 import { alpha } from '@mui/material/styles';
 import { useTranslation } from 'react-i18next';
-import { lsGet, lsSet, lsGetString } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
 import BubblesDialogs from '../components/BubblesDialogs';
 import TextOverlay from '../components/TextOverlay';
 import { logoutUser } from '../services/authService';
@@ -38,9 +36,6 @@ import { withAlpha } from '../utils/colorUtils';
 import { parseLocalDateTime } from '../utils/dateTime';
 import { notificationKeyPrefix, shouldShowStopPulsing } from '../utils/notifications';
 import { applyBubbleFill } from '../utils/bubbleStyle';
-import {
-    readBubbleViewPlannedTasksFromLS
-} from '../utils/bubbleData';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
 
@@ -97,6 +92,9 @@ const BubblesPage = ({ user, themeMode }) => {
         setMainView,
         fontSize,
         setFontSize,
+        // User settings from users/{uid}.settings, like the values above.
+        showInstructions,
+        setShowInstructions,
         // categoriesDialog is store-owned as of Stage H of 010d; the page still
         // opens it from the desktop categories panel below.
         setCategoriesDialog,
@@ -190,11 +188,7 @@ const BubblesPage = ({ user, themeMode }) => {
     // Dialog open-flags (filter/menu/font/appearance/change-password/logout/list-view)
     // + fontSize now live in BubblesStore (Stage F of 010d).
 
-    const [showInstructions, setShowInstructions] = useState(() => {
-        const saved = lsGetString(LS.SHOW_INSTRUCTIONS);
-        return saved === null ? true : saved === 'true';
-    }); // Показывать ли подсказки инструкций
-    // bubbleBackgroundEnabled + mainView now live in BubblesStore (Stage F of 010d).
+    // showInstructions, bubbleBackgroundEnabled and mainView are user settings in BubblesStore.
 
     // Состояние поиска для Bubbles View
     const [bubblesSearchQuery, setBubblesSearchQuery] = useState('');
@@ -362,46 +356,10 @@ const BubblesPage = ({ user, themeMode }) => {
         }
     }, [theme, bubbles, tags]);
 
-    // Reconcile filter selections + recolor bubbles whenever the tag set changes.
-    // Seam (Task 2/6 of #38): the live `setTags` half of the old
-    // subscribeToTagsUpdates effect now lives in useTags; this [tags] effect keeps
-    // the filter-reconciliation + bubble-recolor half here. Reconciliation must
-    // not run until tags have actually loaded: every empty `tags` snapshot before
-    // the first real one (initial mount, StrictMode's double-invoke, empty
-    // intermediate Firestore emits) would otherwise treat every saved filter id as
-    // "deleted" and wipe `bubbles-filter-tags` to [] — silently clearing the
-    // user's selected category on every page reload. Skip until the first
-    // non-empty snapshot flips the guard, matching the original
-    // subscription-driven timing.
-    const tagsReconcileInitRef = useRef(false);
+    // Recolor bubbles whenever the tag set changes. Seam (Task 2/6 of #38): the live
+    // `setTags` half lives in useTags. The filters need no reconciliation any more:
+    // BubblesUiStore shows them without categories that no longer exist.
     useEffect(() => {
-        if (!tagsReconcileInitRef.current) {
-            if (tags.length === 0) return;
-            tagsReconcileInitRef.current = true;
-        }
-        const existingTagIds = tags.map(tag => tag.id);
-
-        // Update filter tags to remove deleted tags
-        setFilterTags(currentFilterTags => {
-            const validFilterTags = currentFilterTags.filter(id => existingTagIds.includes(id));
-            // Не записываем ключ впервые, чтобы не блокировать первичную инициализацию фильтра
-            const hadFilterKey = lsGet(LS.FILTER_TAGS) !== null;
-            if (hadFilterKey) {
-                lsSet(LS.FILTER_TAGS, validFilterTags);
-            }
-            return validFilterTags;
-        });
-
-        // Update list filter tags to remove deleted tags
-        setListFilterTags(currentListFilterTags => {
-            const validListFilterTags = currentListFilterTags.filter(id => existingTagIds.includes(id));
-            const hadListFilterKey = lsGet(LS.LIST_FILTER_TAGS) !== null;
-            if (hadListFilterKey) {
-                lsSet(LS.LIST_FILTER_TAGS, validListFilterTags);
-            }
-            return validListFilterTags;
-        });
-
         // Update bubble colors and fill styles when tags change
         setBubbles(currentBubbles => {
             return currentBubbles.map(bubble => {
@@ -525,25 +483,20 @@ const BubblesPage = ({ user, themeMode }) => {
     // Функция для сохранения настроек шрифта
     const handleFontSizeChange = (newSize) => {
         setFontSize(newSize);
-        lsSet(LS.FONT_SIZE, newSize.toString());
     };
 
     // Функция для закрытия подсказок
     const handleCloseInstructions = () => {
         setShowInstructions(false);
-        lsSet(LS.SHOW_INSTRUCTIONS, 'false');
     };
 
     const handleToggleMainView = () => {
-        const next = mainView === 'tasks' ? 'bubbles' : 'tasks';
-        setMainView(next);
-        lsSet(LS.MAIN_VIEW, next);
+        setMainView(mainView === 'tasks' ? 'bubbles' : 'tasks');
     };
 
     const handleToggleBubbleBackground = () => {
         const newValue = !bubbleBackgroundEnabled;
         setBubbleBackgroundEnabled(newValue);
-        lsSet(LS.BACKGROUND_ENABLED, newValue.toString());
 
         // Обновляем фон всех пузырей
         setBubbles(prev => {
````

````diff
diff --git a/src/components/BubbleDialogForm.jsx b/src/components/BubbleDialogForm.jsx
index b15acde..6005979 100644
--- a/src/components/BubbleDialogForm.jsx
+++ b/src/components/BubbleDialogForm.jsx
@@ -18,8 +18,6 @@ import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
 import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
 import enUS from 'date-fns/locale/en-US';
 import uk from 'date-fns/locale/uk';
-import { lsSet } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
 import i18n from '../i18n';
 import AddNotification from './AddNotification';
 import RepeatSettings from './RepeatSettings';
@@ -95,10 +93,7 @@ export default function BubbleDialogForm(props) {
                     isMobile={isMobile}
                     themeMode={themeMode}
                     useRichText={useRichText}
-                    onToggleRichText={(enabled) => {
-                        onToggleUseRichText?.(enabled);
-                        try { lsSet(LS.USE_RICH_TEXT, enabled); } catch { /* localStorage may be unavailable */ }
-                    }}
+                    onToggleRichText={(enabled) => onToggleUseRichText?.(enabled)}
                     t={t}
                 />
             </Box>
````

````diff
diff --git a/src/utils/storage.js b/src/utils/storage.js
index 7278914..0aa8469 100644
--- a/src/utils/storage.js
+++ b/src/utils/storage.js
@@ -14,15 +14,3 @@ export const lsSet = (key, value) => {
     // ignore quota errors
   }
 };
-
-// reads a value that may have been stored either as raw string (legacy) or JSON
-export const lsGetString = (key, fallback = null) => {
-  const raw = localStorage.getItem(key);
-  if (raw === null) return fallback;
-  try {
-    const v = JSON.parse(raw);
-    return typeof v === 'string' ? v : raw;
-  } catch {
-    return raw;
-  }
-};
````

```bash
git rm src/utils/bubbleData.js
```

- [ ] **Step 10: Написать падающие тесты темы и языка**

`src/hooks/useThemeMode.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeMode } from './useThemeMode';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useThemeMode (spec 3.5)', () => {
    let container;
    let root;
    let mode;
    let systemQuery;

    function Probe({ settings, updateSettings }) {
        mode = useThemeMode(settings, updateSettings);
        return null;
    }
    const render = (props) => act(() => root.render(<Probe {...props} />));

    beforeEach(() => {
        localStorage.clear();
        const listeners = new Set();
        systemQuery = {
            matches: false,
            addEventListener: (type, fn) => listeners.add(fn),
            removeEventListener: (type, fn) => listeners.delete(fn),
            flip(matches) {
                this.matches = matches;
                listeners.forEach((fn) => fn());
            },
        };
        vi.spyOn(window, 'matchMedia').mockImplementation(() => systemQuery);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
    });

    it('uses the system theme and the classic design before sign-in and keeps a change only on screen', () => {
        const updateSettings = vi.fn();
        render({ settings: null, updateSettings });
        expect(mode).toMatchObject({ themeMode: 'system', actualTheme: 'light', design: 'classic' });
        act(() => mode.toggleTheme());
        expect(mode.themeMode).toBe('light');
        expect(updateSettings).not.toHaveBeenCalled();
        expect(localStorage.length).toBe(0);
    });

    it('follows the user settings after sign-in and writes changes there', () => {
        const updateSettings = vi.fn();
        render({ settings: { themeMode: 'dark', design: 'clay' }, updateSettings });
        expect(mode).toMatchObject({ themeMode: 'dark', actualTheme: 'dark', design: 'clay' });
        act(() => mode.setThemeMode('light'));
        act(() => mode.setDesign('modern'));
        act(() => mode.setDesign('no-such-design'));
        expect(updateSettings.mock.calls).toEqual([[{ themeMode: 'light' }], [{ design: 'modern' }]]);
    });

    it('follows a change of the system theme in "system" mode', () => {
        render({ settings: { themeMode: 'system', design: 'classic' }, updateSettings: vi.fn() });
        expect(mode.actualTheme).toBe('light');
        act(() => systemQuery.flip(true));
        expect(mode.actualTheme).toBe('dark');
    });
});
````

`src/components/LanguageSelector.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsContext } from '../state/SettingsContext';
import LanguageSelector from './LanguageSelector';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const i18n = { language: 'en', changeLanguage: vi.fn() };
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key, i18n }),
}));

describe('LanguageSelector (spec 3.5)', () => {
    let container;
    let root;

    const pickUkrainian = () => {
        act(() => container.querySelector('button').click());
        const item = Array.from(document.querySelectorAll('[role="menuitem"]'))
            .find((el) => el.textContent.includes('Українська'));
        act(() => item.click());
    };

    beforeEach(() => {
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.clearAllMocks();
    });

    it('switches only this screen before sign-in and saves nothing', () => {
        act(() => root.render(<LanguageSelector />));
        pickUkrainian();
        expect(i18n.changeLanguage).toHaveBeenCalledWith('uk');
        expect(localStorage.length).toBe(0);
    });

    it('saves the language in the user settings after sign-in', () => {
        const updateSettings = vi.fn();
        act(() => root.render(
            <SettingsContext.Provider value={{ settings: {}, updateSettings, getSettings: () => ({}) }}>
                <LanguageSelector />
            </SettingsContext.Provider>
        ));
        pickUkrainian();
        expect(updateSettings).toHaveBeenCalledWith({ language: 'uk' });
        expect(i18n.changeLanguage).not.toHaveBeenCalled();
    });
});
````

Run: `npx vitest run src/hooks/useThemeMode.test.jsx src/components/LanguageSelector.test.jsx`
Expected: FAIL — `Tests  5 failed (5)`, например `AssertionError: expected 1 to be +0` (старый код пишет в localStorage), `expected { themeMode: 'system', … } to match object { themeMode: 'dark', … }`, `expected "vi.fn()" to be called with arguments: [ { language: 'uk' } ]`.

- [ ] **Step 11: Тема, язык и ожидание настроек в `App`**

Заменить `src/hooks/useThemeMode.js` целиком (заодно системная тема в режиме `system` теперь действительно перерисовывает экран: раньше `setThemeMode('system')` при том же значении не вызывал рендер):

````js
import { useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';
import { getDesignModule, DESIGNS } from '../theme/designs';

// Функция для получения системной темы
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

/**
 * Theme mode and design. Signed in, they are the user's settings (users/{uid}.settings,
 * spec 3.5) and changes are written there through updateSettings. Before sign-in the screen
 * uses the system theme and the classic design; a change there lasts only for the session.
 */
export const useThemeMode = (settings = null, updateSettings = () => {}) => {
    const [localThemeMode, setLocalThemeMode] = useState('system');
    const [localDesign, setLocalDesign] = useState('classic');
    const [systemTheme, setSystemTheme] = useState(getSystemTheme);

    const themeMode = settings ? settings.themeMode : localThemeMode;
    const design = settings ? settings.design : localDesign;

    const setThemeModeExplicit = (mode) => {
        if (settings) updateSettings({ themeMode: mode });
        else setLocalThemeMode(mode);
    };

    const toggleTheme = () => {
        let newMode;
        if (themeMode === 'light') {
            newMode = 'dark';
        } else if (themeMode === 'dark') {
            newMode = 'system';
        } else {
            newMode = 'light';
        }
        setThemeModeExplicit(newMode);
    };

    const setDesignExplicit = (designId) => {
        if (!DESIGNS[designId]) return;
        if (settings) updateSettings({ design: designId });
        else setLocalDesign(designId);
    };

    // Слушаем изменения системной темы
    useEffect(() => {
        if (themeMode !== 'system' || typeof window === 'undefined' || !window.matchMedia) return undefined;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => setSystemTheme(getSystemTheme());
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [themeMode]);

    // Получаем актуальную тему (если system, то берем системную)
    const actualTheme = themeMode === 'system' ? systemTheme : themeMode;

    const createAppTheme = (mode, designId) => {
        const designModule = getDesignModule(designId);
        if (!designModule) {
            console.warn(`Design module not found for design: ${designId}, falling back to classic`);
            return createAppTheme(mode, 'classic');
        }
        const designConfig = designModule(mode);
        return createTheme(designConfig);
    };

    const theme = createAppTheme(actualTheme, design);

    return {
        themeMode,
        actualTheme,
        design,
        toggleTheme,
        setThemeMode: setThemeModeExplicit,
        setDesign: setDesignExplicit,
        theme,
        designs: DESIGNS,
    };
};
````

````diff
diff --git a/src/components/LanguageSelector.jsx b/src/components/LanguageSelector.jsx
index 2875abc..6cd771b 100644
--- a/src/components/LanguageSelector.jsx
+++ b/src/components/LanguageSelector.jsx
@@ -13,8 +13,7 @@ import {
 import { Language, Check } from '@mui/icons-material';
 import { useTranslation } from 'react-i18next';
 import { alpha } from '@mui/material/styles';
-import { lsSet } from '../utils/storage';
-import { LS } from '../utils/storageKeys';
+import { useSettings } from '../state/SettingsContext';
 
 const LanguageSelector = ({ themeMode = 'light', sx = {} }) => {
     const { i18n, t } = useTranslation();
@@ -46,9 +45,13 @@ const LanguageSelector = ({ themeMode = 'light', sx = {} }) => {
         setAnchorEl(null);
     };
 
+    const settingsApi = useSettings();
+
+    // Signed in: the user's setting (App switches i18n to it). On the sign-in screen
+    // only this screen changes (spec 3.5).
     const handleLanguageChange = (languageCode) => {
-        i18n.changeLanguage(languageCode);
-        lsSet(LS.I18N_LNG, languageCode);
+        if (settingsApi) settingsApi.updateSettings({ language: languageCode });
+        else i18n.changeLanguage(languageCode);
         handleClose();
     };
 
````

````diff
diff --git a/src/i18n.js b/src/i18n.js
index f41184a..b487dfc 100644
--- a/src/i18n.js
+++ b/src/i18n.js
@@ -30,11 +30,11 @@ i18n
             escapeValue: false // React already does escaping
         },
 
-        // Language detection options
+        // Before sign-in the device language; after it App applies the user's
+        // settings.language (spec 3.5). Nothing is cached in localStorage.
         detection: {
-            order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
-            caches: ['localStorage'],
-            lookupLocalStorage: 'i18nextLng'
+            order: ['navigator'],
+            caches: []
         }
     });
 
````

````diff
diff --git a/src/App.jsx b/src/App.jsx
index 793064c..315974e 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -7,8 +7,11 @@ const MindMapPage = React.lazy(() => import('./pages/MindMapPage'));
 import AuthForm from './components/AuthForm';
 import { onAuthStateChange } from './services/authService';
 import { useThemeMode } from './hooks/useThemeMode';
+import i18n from './i18n';
 import { BubblesDataProvider } from './state/BubblesDataStore';
 import { BubblesUiProvider } from './state/BubblesUiStore';
+import { SettingsContext } from './state/SettingsContext';
+import { useUserSettings } from './state/SettingsStore';
 
 // Hash-based routing so the screen survives F5 and works on GitHub Pages.
 const getScreenFromHash = () => (window.location.hash === '#/mindmap' ? 'mindmap' : 'main');
@@ -17,7 +20,17 @@ function App() {
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);
     const [screen, setScreen] = useState(getScreenFromHash); // 'main' | 'mindmap'
-    const { themeMode, actualTheme, toggleTheme, theme, design, setDesign, designs, setThemeMode } = useThemeMode();
+    // users/{uid}.settings of the signed-in user (null while signed out or still loading)
+    const userSettings = useUserSettings(user ? user.uid : null);
+    const { settings, updateSettings } = userSettings;
+    const { themeMode, actualTheme, toggleTheme, theme, design, setDesign, designs, setThemeMode } = useThemeMode(settings, updateSettings);
+
+    // UI language: the user's setting after sign-in, the device language before (spec 3.5)
+    const language = settings ? settings.language : null;
+    useEffect(() => {
+        if (language) i18n.changeLanguage(language);
+        else i18n.changeLanguage(); // detect the device language again
+    }, [language]);
 
     useEffect(() => {
         const onHashChange = () => setScreen(getScreenFromHash());
@@ -43,7 +56,8 @@ function App() {
         window.location.hash = next === 'mindmap' ? '/mindmap' : '/';
     };
 
-    if (loading) {
+    // After sign-in the app waits for the user's settings, so it opens with the right theme and view
+    if (loading || (user && !settings)) {
         return (
             <ThemeProvider theme={theme}>
                 <CssBaseline />
@@ -66,36 +80,38 @@ function App() {
         <ThemeProvider theme={theme}>
             <CssBaseline />
             {user ? (
-                screen === 'mindmap' ? (
-                    <React.Suspense fallback={
-                        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.bubbleView }}>
-                            <CircularProgress size={60} sx={{ color: 'white' }} />
-                        </Box>
-                    }>
-                        <MindMapPage
-                            onBack={() => navigate('main')}
-                            themeMode={actualTheme}
-                        />
-                    </React.Suspense>
-                ) : (
-                    <BubblesDataProvider>
-                        <BubblesUiProvider
-                            themeModeState={themeMode}
-                            setThemeMode={setThemeMode}
-                            design={design}
-                            setDesign={setDesign}
-                            designs={designs}
-                            toggleTheme={toggleTheme}
-                            themeToggleProps={{ themeMode, actualTheme }}
-                            onOpenMindMap={() => navigate('mindmap')}
-                        >
-                            <BubblesPage
-                                user={user}
+                <SettingsContext.Provider value={userSettings}>
+                    {screen === 'mindmap' ? (
+                        <React.Suspense fallback={
+                            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.bubbleView }}>
+                                <CircularProgress size={60} sx={{ color: 'white' }} />
+                            </Box>
+                        }>
+                            <MindMapPage
+                                onBack={() => navigate('main')}
                                 themeMode={actualTheme}
                             />
-                        </BubblesUiProvider>
-                    </BubblesDataProvider>
-                )
+                        </React.Suspense>
+                    ) : (
+                        <BubblesDataProvider>
+                            <BubblesUiProvider
+                                themeModeState={themeMode}
+                                setThemeMode={setThemeMode}
+                                design={design}
+                                setDesign={setDesign}
+                                designs={designs}
+                                toggleTheme={toggleTheme}
+                                themeToggleProps={{ themeMode, actualTheme }}
+                                onOpenMindMap={() => navigate('mindmap')}
+                            >
+                                <BubblesPage
+                                    user={user}
+                                    themeMode={actualTheme}
+                                />
+                            </BubblesUiProvider>
+                        </BubblesDataProvider>
+                    )}
+                </SettingsContext.Provider>
             ) : (
                 <AuthForm
                     onLoginSuccess={handleLoginSuccess}
````

Run: `npx vitest run src/hooks/useThemeMode.test.jsx src/components/LanguageSelector.test.jsx`
Expected: PASS — `Tests  5 passed (5)`.

- [ ] **Step 12: В localStorage остались только позиция кнопки и карты**

Run: `grep -rn "lsGet\|lsSet\|lsGetString\|localStorage" src --include=*.js --include=*.jsx | grep -v "\.test\."`
Expected: в коде — только `src/utils/storage.js` (сами помощники), `src/hooks/useDraggableFab.js` (`bubbles-fab-position`), `src/hooks/useMindmaps.js` и `src/services/mindmapService.js` (карты mindmap), `src/state/SettingsStore.jsx` (чтение старых ключей при первом входе и их удаление) и `src/services/authService.js` (старая очистка `bubbles_{uid}`/`tags_{uid}` при выходе — её заменяет задача 11); ещё три комментария — в `src/i18n.js`, `src/contract/migrateV1.js` и `src/pages/BubblesPage.jsx` (про позицию кнопки «+»). Так и велит спецификация, раздел 2.

- [ ] **Step 13: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  44 passed (44)`, `Tests  543 passed (543)`; линтер без ошибок.

- [ ] **Step 14: Commit**

```bash
git add -A src/utils/legacyLocalData.js src/utils/legacyLocalData.test.js src/state src/hooks/useBubbleFilters.js src/hooks/__tests__/useBubbleFilters.test.js src/hooks/useListFilters.js src/hooks/useTags.js src/hooks/useTags.test.jsx src/hooks/useBubbleCrud.test.jsx src/components/TaskList.jsx src/pages/BubblesPage.jsx src/components/BubbleDialogForm.jsx src/utils/storage.js src/hooks/useThemeMode.js src/hooks/useThemeMode.test.jsx src/components/LanguageSelector.jsx src/components/LanguageSelector.test.jsx src/i18n.js src/App.jsx
git commit -F - <<'EOF'
feat(settings): user settings from users/{uid}.settings instead of localStorage

App subscribes to the user document, creates it at the first sign-in from
this browser's old settings and then removes the old keys and the v1 copies.
BubblesUiStore maps the settings to the UI values in one place and writes
changes field by field; theme and language follow the user after sign-in
and the device before it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 11: Это устройство в `users/{uid}/devices`

**Files:**
- Modify: `src/firebaseMessaging.js` (замена целиком), `src/services/authService.js`, `src/index.jsx`
- Test: `src/firebaseMessaging.test.js`, `src/services/authService.logout.test.js` (обе — замена целиком)

**Interfaces:**
- Consumes: `registerDevice`, `unregisterDevice` (задача 4); `getId`, `getInstallations` из `firebase/installations`.
- Produces (`src/firebaseMessaging.js`) — для подплана 0.5 (переключатель «получать напоминания здесь»):
  - `thisDeviceId(): Promise<string>` — id установки Firebase, он же id документа устройства;
  - `registerThisDevice(uid)` — после входа: запрос разрешения, токен FCM (или `null` без разрешения, без поддержки push, при ошибке FCM), запись устройства; ошибки только в журнал;
  - `unregisterThisDevice(uid)` — при выходе, до `signOut`: снимает обработчик сообщений, удаляет документ устройства и делает токен недействительным (`deleteToken`);
  - `teardownForegroundMessageListener()` — как раньше (единственный обработчик `onMessage`, #96);
  - уходят `initMessagingAndSaveToken`, `removeCurrentToken`, `updateMessagingTokenLanguage` и запись в `user-fcm-tokens`: язык напоминаний — `settings.language` пользователя (сервер, 0.3).
- `logoutUser()` вызывает `unregisterThisDevice(uid)` до `signOut` (не дольше 2 секунд, как раньше) и больше не чистит `bubbles_{uid}`/`tags_{uid}` (их удаляет первый вход, задача 10). `src/index.jsx` регистрирует устройство на каждом входе (`onAuthStateChanged`) и больше не запрашивает разрешение до входа.

- [ ] **Step 1: Заменить `src/firebaseMessaging.test.js` целиком**

Тесты #96 (один обработчик `onMessage`, снятие при выходе) остаются, теперь на регистрации устройства; сообщение в них — формата v2 без блока `notification` (подплан 0.3).

````js
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    deleteToken: vi.fn(),
    getId: vi.fn(),
    getInstallations: vi.fn(() => 'installations'),
    getMessaging: vi.fn(() => 'messaging'),
    getToken: vi.fn(),
    isSupported: vi.fn(),
    onMessage: vi.fn(),
    registerDevice: vi.fn(),
    unregisterDevice: vi.fn(),
}));

vi.mock('firebase/messaging', () => ({
    deleteToken: mocks.deleteToken,
    getMessaging: mocks.getMessaging,
    getToken: mocks.getToken,
    isSupported: mocks.isSupported,
    onMessage: mocks.onMessage,
}));
vi.mock('firebase/installations', () => ({
    getId: mocks.getId,
    getInstallations: mocks.getInstallations,
}));
vi.mock('./services/data/devices', () => ({
    registerDevice: mocks.registerDevice,
    unregisterDevice: mocks.unregisterDevice,
}));
vi.mock('./firebase', () => ({ default: 'app', db: 'db' }));
vi.mock('./utils/config', () => ({ config: { firebase: { vapidKey: 'vapid-key' } } }));
vi.mock('./utils/logger', () => ({ default: { error: vi.fn() } }));

import { registerThisDevice, teardownForegroundMessageListener, unregisterThisDevice } from './firebaseMessaging';

describe('firebaseMessaging: this device in users/{uid}/devices (spec 3.3)', () => {
    let activeHandlers;
    let unsubscribeCalls;
    let registration;
    let permission;

    beforeEach(() => {
        activeHandlers = new Set();
        unsubscribeCalls = [];
        registration = { showNotification: vi.fn().mockResolvedValue() };
        permission = 'granted';

        Object.defineProperty(navigator, 'serviceWorker', {
            configurable: true,
            value: { ready: Promise.resolve(registration) },
        });
        vi.stubGlobal('Notification', {
            requestPermission: vi.fn(() => Promise.resolve(permission)),
            get permission() { return permission; },
        });

        mocks.isSupported.mockResolvedValue(true);
        mocks.getId.mockResolvedValue('fid-1');
        mocks.getToken.mockResolvedValue('token-1');
        mocks.registerDevice.mockResolvedValue(true);
        mocks.unregisterDevice.mockResolvedValue();
        mocks.onMessage.mockImplementation((_messaging, handler) => {
            activeHandlers.add(handler);
            const unsubscribe = vi.fn(() => activeHandlers.delete(handler));
            unsubscribeCalls.push(unsubscribe);
            return unsubscribe;
        });
    });

    afterEach(() => {
        teardownForegroundMessageListener();
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    it('registers this installation with its FCM token and keeps one foreground listener', async () => {
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');

        expect(mocks.registerDevice).toHaveBeenCalledTimes(3);
        expect(mocks.registerDevice).toHaveBeenLastCalledWith('db', 'user-1', 'fid-1', 'token-1');
        expect(mocks.onMessage).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(1);

        // A v2 message has no notification block: the text comes in data (sub-plan 0.3).
        const payload = { data: { type: 'reminder', taskId: 't1', title: 'Pay bills', body: 'In 1 hour', url: '/?taskId=t1' } };
        await Promise.all([...activeHandlers].map((handler) => handler(payload)));

        expect(registration.showNotification).toHaveBeenCalledOnce();
        expect(registration.showNotification).toHaveBeenCalledWith('Pay bills', expect.objectContaining({
            body: 'In 1 hour',
            data: payload.data,
        }));
    });

    it('registers this device without a token when notifications are not allowed', async () => {
        permission = 'denied';
        await registerThisDevice('user-1');
        expect(mocks.getToken).not.toHaveBeenCalled();
        expect(mocks.registerDevice).toHaveBeenCalledWith('db', 'user-1', 'fid-1', null);
    });

    it('registers this device without a token where FCM fails or push is unsupported', async () => {
        mocks.getToken.mockRejectedValueOnce(new Error('messaging/token-subscribe-failed'));
        await registerThisDevice('user-1');
        mocks.isSupported.mockResolvedValueOnce(false);
        await registerThisDevice('user-1');
        expect(mocks.registerDevice.mock.calls).toEqual([
            ['db', 'user-1', 'fid-1', null],
            ['db', 'user-1', 'fid-1', null],
        ]);
    });

    it('removes this device and invalidates its token on sign-out', async () => {
        await registerThisDevice('user-1');
        await unregisterThisDevice('user-1');

        expect(mocks.unregisterDevice).toHaveBeenCalledWith('db', 'user-1', 'fid-1');
        expect(mocks.deleteToken).toHaveBeenCalledWith('messaging');
        expect(unsubscribeCalls[0]).toHaveBeenCalledOnce();
        expect(activeHandlers.size).toBe(0);
    });

    it('creates one foreground listener again on the next sign-in', async () => {
        await registerThisDevice('user-1');
        await unregisterThisDevice('user-1');
        await registerThisDevice('user-1');
        await registerThisDevice('user-1');

        expect(mocks.onMessage).toHaveBeenCalledTimes(2);
        expect(activeHandlers.size).toBe(1);
    });
});
````

- [ ] **Step 2: Заменить `src/services/authService.logout.test.js` целиком**

````js
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u1' } } }));

const mockSignOut = vi.fn();
vi.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: (...args) => mockSignOut(...args),
    onAuthStateChanged: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    updateProfile: vi.fn(),
    EmailAuthProvider: { credential: vi.fn() },
    reauthenticateWithCredential: vi.fn(),
    updatePassword: vi.fn(),
}));

const mockUnregisterThisDevice = vi.fn();
vi.mock('../firebaseMessaging', () => ({
    unregisterThisDevice: (...args) => mockUnregisterThisDevice(...args),
}));

import { logoutUser } from './authService';

describe('logoutUser', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockSignOut.mockReset();
        mockUnregisterThisDevice.mockReset();
    });
    afterEach(() => { vi.useRealTimers(); });

    it('removes this device first, then signs out (spec 3.3)', async () => {
        const order = [];
        mockUnregisterThisDevice.mockImplementation(async () => { order.push('unregister'); });
        mockSignOut.mockImplementation(async () => { order.push('signOut'); });

        const result = await logoutUser();

        expect(mockUnregisterThisDevice).toHaveBeenCalledWith('u1');
        expect(order).toEqual(['unregister', 'signOut']);
        expect(result).toEqual({ success: true });
    });

    it('does not let a hanging device removal block sign-out beyond the timeout', async () => {
        mockUnregisterThisDevice.mockReturnValue(new Promise(() => {})); // never resolves
        mockSignOut.mockResolvedValue();

        const resultPromise = logoutUser();

        // While the removal is pending and before the 2s timeout, sign-out must wait.
        await vi.advanceTimersByTimeAsync(1999);
        expect(mockSignOut).not.toHaveBeenCalled();

        // Once the timeout elapses, logout proceeds regardless of the stuck removal.
        await vi.advanceTimersByTimeAsync(1);
        const result = await resultPromise;

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });

    it('still signs out when the device removal fails', async () => {
        mockUnregisterThisDevice.mockRejectedValue(new Error('offline'));
        mockSignOut.mockResolvedValue();

        const result = await logoutUser();

        expect(mockSignOut).toHaveBeenCalledOnce();
        expect(result).toEqual({ success: true });
    });
});
````

- [ ] **Step 3: Убедиться, что тесты падают**

Run: `npx vitest run src/firebaseMessaging.test.js src/services/authService.logout.test.js`
Expected: FAIL — `Tests  7 failed | 1 passed (8)`: `TypeError: registerThisDevice is not a function` и `AssertionError: expected "vi.fn()" to be called with arguments: [ 'u1' ]`; проходит только «still signs out when the device removal fails».

- [ ] **Step 4: Заменить `src/firebaseMessaging.js` целиком**

````js
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { getId, getInstallations } from 'firebase/installations';
import app, { db } from './firebase';
import { registerDevice, unregisterDevice } from './services/data/devices';
import { config } from './utils/config';
import logger from './utils/logger';

// VAPID Key from configuration
const VAPID_KEY = config.firebase.vapidKey;
let foregroundMessageUnsubscribe = null;

function setupForegroundMessageListener(messaging) {
    if (foregroundMessageUnsubscribe) return;

    // Foreground message handler — показываем через Service Worker, чтобы клик открывал URL
    foregroundMessageUnsubscribe = onMessage(messaging, async (payload) => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const title = payload?.notification?.title || payload?.data?.title || 'Уведомление';
            const body = payload?.notification?.body || payload?.data?.body || '';
            const icon = payload?.notification?.icon || '/icons/icon-192x192.png';
            await registration.showNotification(title, {
                body,
                icon,
                data: payload?.data || {}
            });
        } catch (e) {
            // ignore
        }
    });
}

export function teardownForegroundMessageListener() {
    if (!foregroundMessageUnsubscribe) return;
    foregroundMessageUnsubscribe();
    foregroundMessageUnsubscribe = null;
}

/** This browser's Firebase installation id: its device id in users/{uid}/devices (spec 3.3). */
export const thisDeviceId = () => getId(getInstallations(app));

// FCM token of this browser after asking for the permission; null without permission or push support.
async function messagingToken() {
    if (!(await isSupported())) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });
    setupForegroundMessageListener(messaging);
    return token || null;
}

/**
 * Registration after sign-in (spec 3.3): the permission is asked for, then this device is
 * written with its FCM token, or with null when there is none. Errors are only logged.
 */
export async function registerThisDevice(uid) {
    let fcmToken = null;
    try {
        fcmToken = await messagingToken();
    } catch (e) {
        logger.error('[FCM] token error:', e);
    }
    try {
        await registerDevice(db, uid, await thisDeviceId(), fcmToken);
    } catch (e) {
        logger.error('[FCM] device registration error:', e);
    }
}

/** Sign-out, before signOut: removes this device's document and invalidates its FCM token. */
export async function unregisterThisDevice(uid) {
    teardownForegroundMessageListener();
    await unregisterDevice(db, uid, await thisDeviceId());
    try {
        if (await isSupported() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            await deleteToken(getMessaging(app));
        }
    } catch (e) {
        logger.error('[FCM] remove token on logout error:', e);
    }
}
````

- [ ] **Step 5: Выход и регистрация после входа**

````diff
diff --git a/src/services/authService.js b/src/services/authService.js
index 3642568..da788c2 100644
--- a/src/services/authService.js
+++ b/src/services/authService.js
@@ -11,9 +11,9 @@ import {
 } from 'firebase/auth';
 import { auth } from '../firebase';
 import logger from '../utils/logger';
-import { removeCurrentToken } from '../firebaseMessaging';
+import { unregisterThisDevice } from '../firebaseMessaging';
 
-// Upper bound for the best-effort FCM token cleanup on logout, so a slow
+// Upper bound for the best-effort device cleanup on logout, so a slow
 // network / FCM round-trip cannot hang the sign-out.
 const LOGOUT_TOKEN_CLEANUP_TIMEOUT_MS = 2000;
 
@@ -67,21 +67,16 @@ export const loginUser = async (email, password) => {
 export const logoutUser = async () => {
     try {
         const uid = auth.currentUser?.uid;
-        // Remove this device's FCM token before sign-out (owner-only rules block it afterwards).
-        // Best-effort and time-boxed: swallow its errors and never let a slow FCM/network
-        // round-trip hang logout — proceed to sign-out after the timeout regardless.
+        // Remove this device (users/{uid}/devices) before sign-out: owner-only rules block it
+        // afterwards (spec 3.3). Best-effort and time-boxed: swallow its errors and never let a
+        // slow FCM/network round-trip hang logout — proceed to sign-out after the timeout regardless.
         try {
             await Promise.race([
-                removeCurrentToken(),
+                uid ? unregisterThisDevice(uid) : Promise.resolve(),
                 new Promise((resolve) => setTimeout(resolve, LOGOUT_TOKEN_CLEANUP_TIMEOUT_MS)),
             ]);
         } catch (e) { /* logout proceeds regardless */ }
         await signOut(auth);
-        // Clear user-specific localStorage data after sign-out
-        if (uid) {
-            localStorage.removeItem(`bubbles_${uid}`);
-            localStorage.removeItem(`tags_${uid}`);
-        }
         return { success: true };
     } catch (error) {
         logger.error('Error logging out:', error);
````

````diff
diff --git a/src/index.jsx b/src/index.jsx
index 73afe27..8f2b734 100644
--- a/src/index.jsx
+++ b/src/index.jsx
@@ -8,8 +8,7 @@ import ReactDOM from 'react-dom/client';
 import App from './App';
 import './i18n';
 import './styles/design-backdrops.css';
-import { initMessagingAndSaveToken, updateMessagingTokenLanguage } from './firebaseMessaging';
-import i18n from './i18n';
+import { registerThisDevice } from './firebaseMessaging';
 import { getAuth, onAuthStateChanged } from 'firebase/auth';
 import logger from './utils/logger';
 import { deepLinkTaskId } from './utils/deepLink';
@@ -36,10 +35,8 @@ root.render(
 if ('serviceWorker' in navigator) {
     window.addEventListener('load', function () {
         const swPath = `${import.meta.env.BASE_URL}sw.js`;
-        navigator.serviceWorker.register(swPath).then(function (registration) {
-            // Initialize FCM after SW is ready and process deep links
-            initMessagingAndSaveToken();
-            try { updateMessagingTokenLanguage(i18n.language); } catch { /* Messaging may be unavailable. */ }
+        navigator.serviceWorker.register(swPath).then(function () {
+            // FCM uses this SW (registerThisDevice waits for it); process deep links
             handleDeepLink();
         }, function (err) {
             logger.error('[SW] Registration failed:', err);
@@ -49,27 +46,12 @@ if ('serviceWorker' in navigator) {
     handleDeepLink();
 }
 
-// Keep token language in sync with app language
-try {
-    i18n.on('languageChanged', (lng) => {
-        updateMessagingTokenLanguage(lng);
-    });
-} catch (e) {
-    // ignore
-}
-
-// Update/save token after login to apply the current app language chosen on auth screen
+// Register this device for reminders after sign-in (spec 3.3). The language of the
+// reminders is the user's settings.language, so the device carries none.
 try {
     const auth = getAuth();
-    onAuthStateChanged(auth, async (user) => {
-        if (user) {
-            try {
-                await initMessagingAndSaveToken();
-            } catch { /* Messaging may be unavailable. */ }
-            try {
-                await updateMessagingTokenLanguage(i18n.language);
-            } catch { /* Messaging may be unavailable. */ }
-        }
+    onAuthStateChanged(auth, (user) => {
+        if (user) registerThisDevice(user.uid);
     });
 } catch (e) {
     // ignore
````

- [ ] **Step 6: Тесты проходят**

Run: `npx vitest run src/firebaseMessaging.test.js src/services/authService.logout.test.js`
Expected: PASS — `Tests  8 passed (8)`.

- [ ] **Step 7: В вебе не осталось старых коллекций и копий**

Run: `grep -rn "user-fcm-tokens\|user-bubbles\|user-tags\|bubbles_\|tags_" src --include=*.js --include=*.jsx | grep -v "\.test\."`
Expected: одна строка — `src/utils/legacyLocalData.js:10` (удаление копий `bubbles_${uid}`/`tags_${uid}` при первом входе).

- [ ] **Step 8: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  44 passed (44)`, `Tests  546 passed (546)`; линтер без ошибок.

- [ ] **Step 9: Commit**

```bash
git add src/firebaseMessaging.js src/firebaseMessaging.test.js src/services/authService.js src/services/authService.logout.test.js src/index.jsx
git commit -F - <<'EOF'
feat(devices): register this device in users/{uid}/devices

After every sign-in the device is written by its Firebase installation id
with its FCM token (null without permission); sign-out removes it before
signOut. No more user-fcm-tokens or a language per token: reminders use the
user's settings.language.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 12: Документация и итоговая проверка

**Files:**
- Modify: `CLAUDE.md` (модель данных v2 — таблица переведена здесь, а не в 0.7: после этого плана ветка работает только с v2), `README.md`, `docs/firebase.md`, `docs/i18n.md`, `docs/notifications.md`

**Interfaces:**
- Consumes: всё из задач 1–11.
- Produces: документация описывает веб на формате v2; ветка проходит `npm run verify` и проверку вживую на эмуляторе.

- [ ] **Step 1: `CLAUDE.md`**

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index d54c60e..e2c230e 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -10,7 +10,8 @@ Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase,
 npm start              # dev server (also generates service worker)
 npm run build          # production build (also generates service worker)
 npm test               # run tests (vitest)
-npm run test:rules     # Firestore rules tests on the emulator (needs Java 21+ and Firebase CLI 15+)
+npm run test:rules     # Firestore emulator tests: rules + web data layer (needs Java 21+ and Firebase CLI 15+)
+npm run start:emulator # dev server against the local Auth + Firestore emulators (.env.emulator)
 npm run preview        # serve production build locally
 npm run generate-sw    # generate public/sw.js from env vars only
 npm run deploy         # build + push to gh-pages branch
@@ -34,18 +35,23 @@ npm run version:major
 index.html                 # entry point (Vite)
 vite.config.js             # Vite configuration (base: '/to-round-react/', outDir: 'build')
 src/
-  App.jsx                    # root: Firebase Auth listener → AuthForm | BubblesPage
-  index.jsx                  # React DOM root
-  firebase.js                # Firebase SDK init
-  firebaseMessaging.js       # FCM setup / token registration
+  App.jsx                    # root: Firebase Auth listener + user settings → AuthForm | BubblesPage
+  index.jsx                  # React DOM root; registers this device after sign-in
+  firebase.js                # Firebase SDK init (emulators when REACT_APP_FIREBASE_EMULATORS=true)
+  firebaseMessaging.js       # this device in users/{uid}/devices: FCM token, foreground messages
   i18n.js                    # i18next init (en + uk)
   pages/
     BubblesPage.jsx          # main screen / god-component (active refactor target — see hooks/)
     MindMapPage.jsx          # mind map screen
   services/
-    authService.js           # Firebase Auth wrapper
-    firestoreService.js      # Firestore CRUD: bubbles, tags, FCM tokens
+    authService.js           # Firebase Auth wrapper (sign-out removes this device first)
     mindmapService.js        # Firestore CRUD: mind maps
+    data/                    # data contract v2 on users/{uid}/…; db and uid are arguments
+      convert.js             # Firestore document <-> backup-form record (Timestamp <-> ISO)
+      tasks.js, categories.js, settings.js, devices.js   # reads, live changes, writes
+      bubbleModel.js         # interim bridge to the old editors' fields (until sub-plan 0.5)
+  state/                     # BubblesDataStore, BubblesUiStore (settings-backed values),
+                             # SettingsStore (useUserSettings) + SettingsContext
   hooks/                     # extracted from BubblesPage
     useMatterEngine.js       # Matter.js physics world lifecycle
     useDraggableFab.js       # draggable FAB position
@@ -71,16 +77,21 @@ functions/
 
 ### Firestore data model
 
-| Collection | Access |
-|---|---|
-| `user-bubbles/{uid}/bubbles/{bubbleId}` | owner (`uid`) only — **current schema** |
-| `user-bubbles/{uid}` (field `bubbles[]`) | owner only — **legacy array schema**, no longer read by server logic |
-| `user-tags/{uid}` | owner only |
-| `user-mindmaps/{uid}/{document=**}` | owner only |
-| `user-fcm-tokens/{uid}/tokens/{tokenId}` | owner only |
-| `notification-sent/{key}` | Cloud Functions admin SDK only (`allow read, write: if false` in rules) |
+Data contract v2 ([spec](docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md), section 3); the rules check every document's shape (`firestore.rules`).
 
-On branch `stage-0-data-contract-v2` the Cloud Functions read v2 tasks via an indexed `collectionGroup('tasks')` query (`status` + `nextNotifyAt`), only under the root path `users/{uid}/tasks`; production keeps the v1 functions on `user-bubbles` until sub-plan 0.7, and `scripts/stage0-deploy-guard.js` blocks `firebase deploy` from this branch until then. See [docs/notifications.md](docs/notifications.md).
+| Path | Content | Access |
+|---|---|---|
+| `users/{uid}` | `schemaVersion: 2`, `settings` (all UI settings), optional `migration` | owner; never deleted |
+| `users/{uid}/tasks/{taskId}` | task; `overdueAt`/`nextNotifyAt` belong to Cloud Functions | owner |
+| `users/{uid}/categories/{categoryId}` | category (`name`, palette `color`, `order`) | owner |
+| `users/{uid}/devices/{deviceId}` | device = Firebase installation id: `fcmToken`, `notificationsEnabled` | owner |
+| `user-mindmaps/{uid}/{document=**}` | mind maps (unchanged in stage 0) | owner |
+| `notification-sent/{key}` | dedup keys | Cloud Functions admin SDK only (`if false` in rules) |
+| `user-bubbles`, `user-tags`, `user-fcm-tokens` | v1 data | owner read-only; kept for the migration (sub-plan 0.6) and rollback |
+
+Clients write creates with `serverTimestamp()` and partial updates with `updatedAt: serverTimestamp()`; an existing document is never overwritten with `setDoc` (the rules reject it). Settings, tasks and categories live only in Firestore — localStorage keeps just the FAB position, the last open mind map and the mind map copies.
+
+On branch `stage-0-data-contract-v2` the web and the Cloud Functions use only `users/{uid}/…` (the functions query `collectionGroup('tasks')` by `status` + `nextNotifyAt`, only under the root path `users/{uid}/tasks`); production keeps v1 on `user-bubbles` until sub-plan 0.7, and `scripts/stage0-deploy-guard.js` blocks `firebase deploy` from this branch until then. See [docs/notifications.md](docs/notifications.md).
 
 ### Cloud Functions
 
@@ -96,7 +107,7 @@ Full design and operations: [docs/notifications.md](docs/notifications.md).
 
 ### Environment variables
 
-Copy `.env.example` to `.env` for local development. All Firebase vars are `REACT_APP_FIREBASE_*`. The CI workflow generates `.env.production` from GitHub Secrets at build time — do not commit real credentials.
+Copy `.env.example` to `.env` for local development. All Firebase vars are `REACT_APP_FIREBASE_*`. `.env.emulator` (committed, demo values only) is read by `npm run start:emulator` and turns on `REACT_APP_FIREBASE_EMULATORS`. The CI workflow generates `.env.production` from GitHub Secrets at build time — do not commit real credentials.
 
 The service worker (`public/sw.js`) is generated from env vars by `scripts/generate-sw.js`. It must run before `start` or `build` (already wired into both npm scripts).
 
````

- [ ] **Step 2: `README.md`, `docs/firebase.md`, `docs/i18n.md`, `docs/notifications.md`**

````diff
diff --git a/README.md b/README.md
index f58f91a..40ffd91 100644
--- a/README.md
+++ b/README.md
@@ -44,10 +44,11 @@ src/
   index.jsx              # точка входа React DOM
   App.jsx                # корень: слушатель Firebase Auth → AuthForm | BubblesPage
   firebase.js            # инициализация Firebase SDK (конфиг из utils/config.js)
-  firebaseMessaging.js   # FCM: запрос разрешения, токен, foreground-обработчик
+  firebaseMessaging.js   # FCM: разрешение, токен, это устройство в users/{uid}/devices
   i18n.js                # инициализация i18next (en + uk)
   pages/                 # BubblesPage.jsx (главный экран), MindMapPage.jsx
-  services/              # authService, firestoreService, mindmapService
+  services/              # authService, mindmapService, data/ (слой данных v2: users/{uid}/…)
+  state/                 # хранилища интерфейса и настроек пользователя
   hooks/                 # useMatterEngine, useBubbleFilters, useThemeMode, …
   components/            # React-компоненты (.jsx): диалоги, drawer-ы, редакторы, селекторы
   locales/en|uk/         # translation.json
````

````diff
diff --git a/docs/firebase.md b/docs/firebase.md
index bf2f71a..6eb4277 100644
--- a/docs/firebase.md
+++ b/docs/firebase.md
@@ -30,7 +30,8 @@ export const auth = getAuth(app);
 
 - `createUser(email, password, displayName?)` — регистрация (+ `updateProfile` для имени);
 - `loginUser(email, password)` — вход;
-- `logoutUser()` — выход (чистит локальные данные пользователя);
+- `logoutUser()` — выход: сначала удаляет документ этого устройства (`users/{uid}/devices`),
+  потом `signOut`;
 - `resetPassword(email, languageCode)` — письмо для сброса пароля на языке интерфейса со ссылкой
   «Continue» обратно в приложение;
 - `onAuthStateChange(cb)` — подписка на состояние входа.
@@ -43,20 +44,25 @@ export const auth = getAuth(app);
 
 ## Модель данных Firestore
 
-Все пользовательские данные изолированы по `uid` владельца.
-
-| Коллекция | Доступ |
-|---|---|
-| `user-bubbles/{uid}/bubbles/{bubbleId}` | только владелец — **актуальная схема** (субколлекция) |
-| `user-bubbles/{uid}`, поле `bubbles[]` | только владелец — **legacy-массив**, серверная логика его не использует |
-| `user-tags/{uid}` | только владелец |
-| `user-mindmaps/{uid}/{document=**}` | только владелец |
-| `user-fcm-tokens/{uid}/tokens/{tokenId}` | только владелец |
-| `notification-sent/{key}` | только Cloud Functions (admin SDK); в правилах `if false` |
-
-Серверный планировщик читает задачи **только из субколлекции** (индексный запрос по
-collection group) — внутрь legacy-массива `bubbles[]` индексные запросы невозможны, и
-серверная логика на него не рассчитывает.
+Все пользовательские данные изолированы по `uid` владельца. В ветке этапа 0 веб работает
+только с форматом v2 ([спецификация](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md),
+раздел 3); код — в `src/services/data/`.
+
+| Путь | Что лежит | Доступ |
+|---|---|---|
+| `users/{uid}` | `schemaVersion: 2`, `settings` (все настройки интерфейса), `migration` | только владелец; удалить нельзя |
+| `users/{uid}/tasks/{taskId}` | задачи | только владелец |
+| `users/{uid}/categories/{categoryId}` | категории | только владелец |
+| `users/{uid}/devices/{deviceId}` | устройства (id установки Firebase) | только владелец |
+| `user-mindmaps/{uid}/{document=**}` | карты mindmap | только владелец |
+| `notification-sent/{key}` | ключи дедупликации | только Cloud Functions (admin SDK); в правилах `if false` |
+| `user-bubbles`, `user-tags`, `user-fcm-tokens` | данные v1 | владелец только читает: для переноса (0.6) и отката |
+
+Слой данных создаёт документы с `serverTimestamp()` и меняет их только частичными
+обновлениями с `updatedAt: serverTimestamp()`; `setDoc` поверх существующего документа правила
+отклоняют. В localStorage остаются только позиция кнопки «+», последняя открытая карта и копия
+карт mindmap: настройки, задачи и категории живут в Firestore. При первом входе настройки
+этого браузера переносятся в `users/{uid}.settings`, и старые ключи удаляются.
 
 ## Правила безопасности
 
@@ -91,18 +97,24 @@ collection group) — внутрь legacy-массива `bubbles[]` индек
 ### Тесты правил
 
 `npm run test:rules` поднимает эмулятор Firestore (`firebase emulators:exec`, порт 8180, проект
-`demo-to-round` без доступа к настоящей базе) и гоняет тесты из `firestore-tests/`. Нужны Java 21+
+`demo-to-round` без доступа к настоящей базе) и гоняет тесты из `firestore-tests/`: правила
+(`*.rules.test.js`) и слой данных веба (`*.data.test.js`, в том числе синхронизацию холста
+между двумя клиентами, #94). Нужны Java 21+
 и Firebase CLI 15+. Тесты переводят общие примеры из `contract/fixtures/` в форму Firestore и
 проверяют, что правила принимают каждую правильную запись и отклоняют неправильные. Команда входит
 в `npm run test:all` и `npm run verify`.
 
-## FCM (push-токены)
+## FCM и устройства
 
-`src/firebaseMessaging.js` запрашивает разрешение на уведомления, получает токен через
-`getToken` (с VAPID-ключом и регистрацией service worker) и сохраняет его в
-`user-fcm-tokens/{uid}`. Foreground-сообщения показываются через service worker, чтобы
-клик открывал нужный URL. VAPID-ключ берётся из `config.firebase.vapidKey`
-(см. [environment.md](environment.md)).
+После каждого входа `src/firebaseMessaging.js` (`registerThisDevice`) запрашивает разрешение на
+уведомления, получает токен через `getToken` (с VAPID-ключом и регистрацией service worker) и
+записывает это устройство в `users/{uid}/devices/{deviceId}`, где `deviceId` — id установки
+Firebase (`getId`). Известному устройству обновляется только токен, новое создаётся с
+включённым `notificationsEnabled`; без разрешения токен `null`. При выходе документ устройства
+удаляется до `signOut`. Язык напоминаний — `settings.language` пользователя, у устройства его
+нет. Foreground-сообщения показываются через service worker, чтобы клик открывал нужный URL
+(`?taskId=<id>`; старые ссылки `?bubbleId=` тоже открываются). VAPID-ключ берётся из
+`config.firebase.vapidKey` (см. [environment.md](environment.md)).
 
 ## Cloud Functions
 
@@ -130,4 +142,6 @@ dev-сервер в режиме `emulator`: Vite берёт `.env.emulator` (д
 `src/firebase.js` при `REACT_APP_FIREBASE_EMULATORS=true` подключает SDK к эмуляторам вместо
 настоящего проекта. Аккаунт заводится прямо в форме входа и живёт только в эмуляторе; данные
 пропадают при остановке (Ctrl+C). Push-уведомления на эмуляторе не работают: у демо-проекта нет
-FCM, поэтому устройство регистрируется без токена.
+FCM, поэтому устройство регистрируется без токена. Ошибка `Installations: Create Installation
+request failed … API key not valid` в консоли ожидаема: id установки SDK выдаёт локально, им
+устройство и регистрируется.
````

````diff
diff --git a/docs/i18n.md b/docs/i18n.md
index 4310bdf..6168331 100644
--- a/docs/i18n.md
+++ b/docs/i18n.md
@@ -33,8 +33,10 @@ bubbles · mindmap · auth · common · theme · language · categories
 
 `src/i18n.js` использует `i18next-browser-languagedetector`:
 
-- порядок поиска: `localStorage → navigator → htmlTag → path → subdomain`;
-- выбранный язык кешируется в `localStorage` под ключом `i18nextLng`;
+- до входа — язык устройства (`navigator`), в `localStorage` ничего не кешируется;
+- после входа `App.jsx` переключает i18next на `settings.language` пользователя
+  (`users/{uid}.settings`), а `LanguageSelector` в меню пишет язык туда же; на экране входа
+  выбор языка действует только на этот экран;
 - если язык не определён или не поддерживается — fallback на `en`;
 - `debug` включён в `development`.
 
````

````diff
diff --git a/docs/notifications.md b/docs/notifications.md
index 839fc13..5b4d39b 100644
--- a/docs/notifications.md
+++ b/docs/notifications.md
@@ -142,6 +142,10 @@
 200 символов, чтобы сообщение не упёрлось в лимит FCM 4 КБ; пустое после обрезки пробелов
 название показывается как «Без назви» / «Untitled».
 
+Веб показывает такое сообщение сам: в фоне — `onBackgroundMessage` сервис-воркера
+(`scripts/generate-sw.js`), на открытой вкладке — `onMessage` в `src/firebaseMessaging.js`;
+клик открывает `url`, и приложение открывает задачу по `?taskId=` (и по старому `?bubbleId=`).
+
 Ошибки FCM `messaging/registration-token-not-registered` и
 `messaging/invalid-registration-token` означают мёртвый токен: устройству ставится
 `fcmToken = null` — в транзакции и только если у устройства всё ещё этот токен (оно могло
````

- [ ] **Step 3: Полная проверка**

Run: `npm run verify`
Expected: веб — `Test Files  44 passed (44)`, `Tests  546 passed (546)`; функции — `ℹ tests 47` / `ℹ pass 47` и `ℹ tests 34` / `ℹ pass 34` (как до плана); эмулятор — `Test Files  10 passed (10)`, `Tests  111 passed (111)` (88 правил + 23 слоя данных); линтер без ошибок, код выхода 0.

- [ ] **Step 4: Проверка вживую на эмуляторе**

Запустить `npm run start:emulator` в фоне и открыть `http://localhost:3000/to-round-react/` во встроенном браузере (подписи на холсте рисует rAF, поэтому смотреть вкладку на переднем плане). Документы эмулятора удобно смотреть скриптом вне репозитория, например `/tmp/stage04-dump.mjs` (доступ эмулятора `Bearer owner`):

```js
// Prints users/{uid} and its tasks, categories and devices for every Auth-emulator account.
const FS = 'http://127.0.0.1:8180/v1/projects/demo-to-round/databases/(default)/documents';
const H = { Authorization: 'Bearer owner' };
const val = (v) => {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return `ts:${v.timestampValue}`;
    if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)]));
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    return v;
};
const doc = (d) => ({ id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, val(x)])) });
const accounts = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-to-round/accounts:query',
    { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: '{}' })).json();
for (const a of accounts.userInfo || []) {
    console.log('== user', a.localId);
    const u = await (await fetch(`${FS}/users/${a.localId}`, { headers: H })).json();
    console.log('users doc:', JSON.stringify(u.fields ? doc(u) : u.error?.status));
    for (const sub of ['tasks', 'categories', 'devices']) {
        const r = await (await fetch(`${FS}/users/${a.localId}/${sub}`, { headers: H })).json();
        console.log(`${sub}:`, JSON.stringify((r.documents || []).map(doc)));
    }
}
```

Пройти сценарии (тестовый аккаунт заводится в форме «Register» и живёт только в Auth-эмуляторе):

1. Регистрация → главный экран. `node /tmp/stage04-dump.mjs`: у `users/{uid}` есть `schemaVersion: 2` и полный `settings`; в `devices` — один документ с `platform: "web"`, `notificationsEnabled: true` и `fcmToken: null` (у демо-проекта нет FCM; ошибка `Installations … API key not valid` в консоли ожидаема). В `localStorage` страницы нет ключей `app-*`, `bubbles-*`, `i18nextLng`.
2. Категория «Home» в окне категорий и задача в ней с описанием `- [ ] ficus` → у задачи автоматический id, `overdueAt: null`, нет `nextNotifyAt`, описание сохранено как набрано; у категории `order: 1` и первый цвет палитры.
3. Вторая вкладка с тем же адресом: создать задачу → она появляется в первой вкладке без перезагрузки; переименовать её в выдвижном списке задач → в первой вкладке новое название, у документа изменились только `title` и `updatedAt`; удалить (корзина) → в первой вкладке пузырь исчезает, в списке — «Deleted Tasks (1)», `deletedAt` равен `updatedAt`.
4. `…/?taskId=<id задачи>` открывает окно правки этой задачи; «Save» без изменений не меняет `updatedAt`.
5. В главном меню нет «Export JSON» и «Import JSON». Язык → «Українська»: обе вкладки переходят на украинский, в документе `settings.language: "uk"`.
6. «Вийти» → документ устройства удалён (`devices: []`), экран входа снова на языке устройства.

Остановить запуск (`kill` процесса `npm run start:emulator` или Ctrl+C) и убедиться, что порты 3000, 8180 и 9099 свободны.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md docs/firebase.md docs/i18n.md docs/notifications.md
git commit -F - <<'EOF'
docs: data model v2 and the web on users/{uid}

CLAUDE.md, README and docs describe the v2 collections, the web data layer,
settings in users/{uid}.settings, device registration and the emulator run.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

## Передача в 0.5 и 0.6

**Подплан 0.5 (интерфейс):**
- Окна задачи переходят на поля v2 (`due`, напоминания в часах, `repeat` с днями недели ISO и `monthDay`), после чего старые имена из `bubbleModel.js` (`dueDate`, `notifications`, `recurrence`, `overduePulseSuppressed`, `useRichText`) удаляются; `tagId` можно оставить (спецификация 8.1). Срок уже показывается во времени устройства и пишется с его зоной.
- Описание уже хранится Markdown — редактору TipTap с `@tiptap/markdown` остаётся читать и писать его напрямую; переключатель «простой/форматированный» удаляется.
- «Завершить серию» — `finishSeries(db, uid, id)`; «Готово» уже работает через `completionChanges`/`completeTask`.
- Переключатель «получать напоминания здесь» — `thisDeviceId()`, `subscribeDevice(db, uid, deviceId, …)`, `setDeviceNotificationsEnabled(db, uid, deviceId, enabled)`.
- `stickyPulseRef` после 0.4 всегда пуст (его наполнял серверный флаг v1 `overdueSticky`), как и ветки статуса `postpone` в `TaskList`/`TaskActionButtons`: их можно убрать вместе с переделкой пульсации и списка.

**Подплан 0.6 (перенос и бэкап):**
- Пункты меню экспорта и импорта возвращаются с бэкапом v2; запись задач с исходным временем — `restoredTaskData`, обновление существующих — `taskUpdateData`, категорий — `newCategoryData`/`categoryUpdateData`, настроек — `settingsUpdateData`.
- Спецификация 3.4 создаёт `users/{uid}` у пользователя со старыми данными в конце переноса, а 0.4 создаёт его при каждом первом входе (`ensureUserDoc` в `useUserSettings`) из настроек браузера. 0.6 либо ставит окно переноса раньше `ensureUserDoc`, либо принимает уже созданный документ: условие переноса («нет `users/{uid}.migration`, а в старых коллекциях есть данные») от этого не меняется, а старые ключи настроек к тому времени уже удалены.
- `settingsFromLocalStorage` переносит фильтр v1 «все теги» как явный список id. После переноса категорий список, совпадающий со всеми перенесёнными категориями, стоит записать как `null`, иначе новые категории не попадут в фильтр сами (сейчас их туда добавляет `includeCategoryInFilters`).

## Отложенное

- Подписи на холсте (`TextOverlay`) в фоновой вкладке обновляются только при возврате вкладки на передний план: их рисует rAF. Так было и до плана.
- В правилах остаётся чтение `user-bubbles`, `user-tags`, `user-fcm-tokens` — оно нужно переносу (0.6) и откату (0.7); старые коллекции удаляются вручную позже (спецификация 9.3).
