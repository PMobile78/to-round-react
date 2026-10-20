# Этап 0.6: веб — перенос и резервная копия — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести данные v1 в формат v2 при первом входе — окно предпросмотра, «Перенести» и «Отложить», — вернуть в главное меню резервную копию в формате v2 (экспорт; импорт файлов v2 и v1 с заменой данных порциями, без перезагрузки страницы), доделать первый вход (язык экрана входа, создание документа пользователя после старта без сети) и дать инструменты репетиции переноса на эмуляторе.

**Architecture:** Формат файла резервной копии и его разбор (v2, а v1 — через правила 9.2 из `migrateV1.js`) — чистый модуль контракта `src/contract/backup.js`. Слой данных `src/services/data/backup.js` читает все данные пользователя, строит план записей «заменить данными копии» и записывает его порциями не больше 450 (`commitInBatches`); `src/services/data/migration.js` читает старые коллекции, строит перенос с предпросмотром и записывает недостающее тем же `commitInBatches`, метку `migration` — последней. Интерфейс: хук `useBackup` и окно `BackupDialog` в главном меню, хук `useMigration` и «ворота» `MigrationGate` с окном `MigrationDialog` перед приложением. Холст и список следуют за записями через свои подписки, поэтому импорт обходится без перезагрузки. Репетиция — `scripts/rehearsal/*` через отдельный конфиг vitest.

**Tech Stack:** React 19 + Vite 8, MUI 7, Firebase JS SDK 13, date-fns, i18next 25, Vitest 4 + happy-dom, `@firebase/rules-unit-testing` на эмуляторе Firestore (порт 8180, проект `demo-to-round`), Auth-эмулятор (9099).

**Spec:** [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md) — разделы 3.4, 3.5, 9 (перенос), 10 (формат резервной копии), 11; задачи [#92](https://github.com/PMobile78/to-round-react/issues/92), [#99](https://github.com/PMobile78/to-round-react/issues/99) (тесты на эмуляторе), [#101](https://github.com/PMobile78/to-round-react/issues/101). Обзор подпланов — [2026-10-14-stage-0-overview.md](2026-10-14-stage-0-overview.md). Предыдущие подпланы: [0.1](2026-10-14-stage-0-1-contract-core.md) (`src/contract/*`, правила 9.2 в `migrateV1.js`), [0.4](2026-10-15-stage-0-4-web-data-layer.md) (слой данных, раздел «Передача в 0.5 и 0.6»), [0.5](2026-10-20-stage-0-5-web-ui.md) (раздел «Передача в 0.6 и 0.7»). Весь код плана прогнан в черновой копии ветки: числа тестов и строки `Expected` — настоящие, веб проверен вживую на эмуляторе, репетиция пройдена на настоящем экспорте.

## Global Constraints

- Ветка `stage-0-data-contract-v2`, в `main` не коммитить. Ничего не деплоить: `firebase deploy` из ветки блокирует `scripts/stage0-deploy-guard.js` до подплана 0.7; `npm run deploy` (gh-pages) из ветки не запускать.
- `main` (v0.1.45, `6f4df41`) уже входит в ветку. Если перед исполнением `main` ушёл вперёд — влить его до задачи 1. В `package.json` может конфликтовать только `"version"`: взять значение из `main`; корневой `package-lock.json` не разрешать через `git checkout --theirs` (выбросит записи `@firebase/rules-unit-testing` и `@tiptap/markdown`). После слияния — `npm ci --legacy-peer-deps`, `npm --prefix functions ci`, `npm run verify`.
- В свежем worktree сначала `npm ci --legacy-peer-deps` и `npm --prefix functions ci`. План зависимостей не меняет; `npm install`/`npm uninstall` не запускать: они переписывают `react`/`react-dom` на `>=16.8.0`.
- **Решения владельца:**
  1. Репетиция (задача 8) идёт на настоящем экспорте прода v1: владелец кладёт его в `/media/big_disk/Backup/to-round/` (вне git). Выводятся только числа и расхождения.
  2. Шесть мелких замечаний ревью 0.5 в этот план не входят — они в задаче [#102](https://github.com/PMobile78/to-round-react/issues/102).
  3. «Остановить пульсацию» на напоминании глушит и будущую просрочку до смены срока — остаётся как есть (спецификация 4.1).
  4. Язык, выбранный на экране входа, становится языком нового аккаунта (решение 5 из 0.5) — задача 6.
- Записи (спецификация 3, 9.1, 10): создание с исходным временем — только `restoredTaskData` (время не позже текущего) и `newCategoryData`; изменение существующей записи — только `taskUpdateData`/`categoryUpdateData`/`settingsUpdateData` (время сервера в `updatedAt`, `createdAt` не меняется); существующую запись не удалять и не создавать заново (`onCategoryDeleted` обнулил бы `categoryId` у уже восстановленных задач). Порции — не больше 450 записей (`MAX_BATCH_WRITES`), одна за другой; метка переноса `users/{uid}.migration` — последней записью.
- Эмуляторы: Firestore — порт 8180, Auth — 9099, проект `demo-to-round`. `npm run test:rules` гоняет все `firestore-tests/**/*.test.js`; задачи 2, 4 и 6 их меняют, поэтому в них — ещё `npm run test:rules`. `npm run start:emulator` и `npm run test:rules` занимают одни порты — не запускать одновременно. Если `firebase emulators:exec` упал на занятом порту, подождать и повторить; осиротевший эмулятор своего упавшего запуска остановить (свой ли он — по `readlink /proc/<pid>/cwd`).
- Корневой `npm test` не собирает `firestore-tests/**`, `functions/**`, `.claude/**`, но собирает `scripts/**/*.test.js` (задача 7 добавляет `scripts/rehearsal/migrationDiff.test.js`). Файлы `*.rehearsal.js` работают только через `vitest.rehearsal.config.js`. Пробы и копии тестов держать с расширением `.txt`.
- Синтаксис ES2020, 4 пробела, одинарные кавычки, точки с запятой. Линтер проверяет только `src` (`no-unused-vars` выключен — неиспользуемое проверять глазами); в тестах под happy-dom — `new window.File(...)`, `new window.Event(...)` (иначе `no-undef`).
- Числа тестов до плана (`1a99321`): веб — 581 (54 файла), эмулятор — 113 (10 файлов), функции — 47 + 34. Функции план не меняет.
- Код в плане взят из проверенной черновой копии без правок. Новые файлы даны полностью (перед блоком — строка с путём); остальные изменения — блоками `diff` относительно состояния после предыдущей задачи; такой блок можно сохранить во временный файл и применить `git apply <файл>` из корня репозитория.
- Каждая задача заканчивается зелёными тестами своих файлов, полным `npm test` и `npm run lint`; задачи 2, 4, 6 — ещё `npm run test:rules`; задача 8 — `npm run verify`, репетиция на настоящем экспорте и проверка вживую на эмуляторе.

## Review Focus

- **Перенос прерван** (сбой порции, закрытая вкладка): при следующем входе окно появляется снова, а «Перенести» записывает только недостающее; метка пишется последней, поэтому прерванный перенос не считается завершённым. Тесты «run again after an interruption, writes only what is missing» — в задаче 4, «says when the move stops, and "Try again" picks it up» — в задаче 5.
- **Импорт прерван отказом порции** (другое устройство тем временем создало запись с тем же id): окно говорит, сколько изменений сохранено, повторный импорт того же файла доделывает работу. Тесты «reports the writes committed before a failed batch, and importing again finishes the job» — в задаче 2, «says how much was saved when a batch fails» — в задаче 3.
- **Файл, который нельзя импортировать** — не JSON, не резервная копия, другая версия, одна нечитаемая запись: ничего не читается и не пишется, окно объясняет причину. Тесты «refuses the whole file for one invalid record and counts the invalid ones», «refuses %j», «refuses the unknown version of %j» — в задаче 1, «refuses a file %s before anything is read or written» — в задаче 3.
- **Файл v2 со сроком в зоне, которую этот браузер не знает, и со временем из будущего** (копия с устройства с более новой базой зон или со спешащими часами): зона принимается, как её принимают правила, а время из будущего становится моментом чтения — иначе правила отклонили бы порцию. Тесты «keeps a due in a zone this browser does not know (a device with a newer time-zone database)» и «moves times from the future to the moment of reading» — в задаче 1.
- **Первый вход без сети:** документ `users/{uid}` создаётся, как только сервер подтвердит, что его нет; в StrictMode — одно создание. Тесты «creates the user document again once the server says it is still missing (first start offline)» и «creates the user document once when StrictMode runs the effect twice» — в задаче 6.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `src/contract/backup.js` | файл резервной копии v2; разбор файлов v2 и v1 с проверкой всего файла |
| `src/services/data/backup.js` | экспорт; план замены данных копией; запись порциями не больше 450 |
| `src/utils/saveJsonFile.js`, `src/hooks/useBackup.js`, `src/components/BackupDialog.jsx` | экспорт и импорт главного меню: файл, шаги импорта, ошибки |
| `src/components/MainMenuDrawer.jsx`, `src/components/BubblesDialogs.jsx` | (изменение) пункты «Экспорт/Импорт резервной копии» |
| `src/services/data/migration.js` | перенос: чтение старых коллекций, предпросмотр, запись недостающего, метка |
| `src/hooks/useMigration.js`, `src/components/MigrationGate.jsx`, `src/components/MigrationDialog.jsx`, `src/App.jsx` | окно переноса перед приложением |
| `src/services/data/settings.js`, `src/state/SettingsStore.jsx` | (изменение) язык экрана входа; создание `users/{uid}` после старта без сети, одно в StrictMode |
| `scripts/rehearsal/*`, `vitest.rehearsal.config.js`, `package.json` | репетиция переноса на эмуляторе (`npm run rehearsal:load`, `npm run rehearsal:check`) |
| `src/locales/en/translation.json`, `src/locales/uk/translation.json` | (изменение) ключи `backup.*`, `migration.*` |
| `firestore-tests/backup.data.test.js`, `firestore-tests/migration.data.test.js`, `firestore-tests/canvasSync.data.test.js`, `firestore-tests/settings.data.test.js` | тесты на эмуляторе |
| `docs/migration.md`, спецификация (3.4, 3.5, 9.1, 10), `CLAUDE.md`, `README.md`, `docs/README.md`, `docs/firebase.md` | документация |

---

### Task 1: Резервная копия v2: формат файла

**Files:**
- Create: `src/contract/backup.js`
- Test: `src/contract/backup.test.js`

**Interfaces:**
- Consumes: `mapTaskV1(v1, ctx) → { task, notes }`, `mapCategoriesV1(tags) → { categories, notes }` (подплан 0.1, `src/contract/migrateV1.js`); `validateTask`, `validateCategory`, `validateSettings` → список ошибок (`src/contract/validate.js`); примеры `contract/fixtures/{tasks,categories,settings,migration-v1}.json`.
- Produces: `BACKUP_FORMAT = 'to-round-backup'`, `BACKUP_VERSION = 2`; `buildBackup({ settings, categories, tasks }, now) → { format, version, exportedAt, settings, categories, tasks }`; `readBackup(data, ctx = { now, timeZone, language }) → { version: 1 | 2, settings: полные настройки | null, categories, tasks }` в форме бэкапа или исключение `BackupError` с `code` (`'not-a-backup'`, `'unsupported-version'`, `'invalid-records'`) и `count` (сколько записей не читается).

- [ ] **Step 1: Написать падающий тест**

Файл v2 пишется и читается обратно; одна нечитаемая запись (или две с одним id) отклоняет весь файл с числом таких записей; файл без настроек их не трогает; зона срока, которую браузер не знает, принимается; время из будущего становится моментом чтения; файл v1 переводится по правилам 9.2, как при переносе.

Файл `src/contract/backup.test.js`:

````js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import taskFixtures from '../../contract/fixtures/tasks.json';
import categoryFixtures from '../../contract/fixtures/categories.json';
import settingsFixtures from '../../contract/fixtures/settings.json';
import migration from '../../contract/fixtures/migration-v1.json';
import { BACKUP_FORMAT, BACKUP_VERSION, buildBackup, readBackup } from './backup';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const ctx = { now: NOW, timeZone: 'Europe/Berlin', language: 'en' };
const SETTINGS = settingsFixtures.valid[0].value;
const CATEGORIES = categoryFixtures.valid.map((c) => c.value);
const TASKS = taskFixtures.valid.map((t) => t.value);

const v2File = (overrides = {}) => ({
    ...buildBackup({ settings: SETTINGS, categories: CATEGORIES, tasks: TASKS }, NOW),
    ...overrides,
});

// What readBackup refuses the file with, or null when it reads it.
const refusal = (data) => {
    try {
        readBackup(data, ctx);
        return null;
    } catch (e) {
        return { name: e.name, code: e.code, count: e.count };
    }
};

describe('buildBackup: the v2 file (spec 10)', () => {
    it('holds the format, the version, the export time, the settings, the categories and the tasks', () => {
        expect(buildBackup({ settings: SETTINGS, categories: CATEGORIES, tasks: TASKS }, NOW)).toEqual({
            format: 'to-round-backup',
            version: 2,
            exportedAt: '2026-10-20T12:00:00.000Z',
            settings: SETTINGS,
            categories: CATEGORIES,
            tasks: TASKS,
        });
        expect([BACKUP_FORMAT, BACKUP_VERSION]).toEqual(['to-round-backup', 2]);
    });
});

describe('readBackup: a v2 file', () => {
    it('reads back what buildBackup wrote', () => {
        expect(readBackup(JSON.parse(JSON.stringify(v2File())), ctx)).toEqual({
            version: 2, settings: SETTINGS, categories: CATEGORIES, tasks: TASKS,
        });
    });

    it('leaves the settings out when the file has none', () => {
        const { settings, ...file } = v2File();
        expect(readBackup(file, ctx).settings).toBeNull();
    });

    it('refuses the whole file for one invalid record and counts the invalid ones', () => {
        const bad = taskFixtures.invalid.find((t) => t.name === 'reminder-not-whole-hours').value;
        expect(refusal(v2File({ tasks: [...TASKS, { ...bad, id: 'bad1' }] })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
        const badCategory = categoryFixtures.invalid[0].value;
        const badSettings = settingsFixtures.invalid[0].value;
        expect(refusal(v2File({ categories: [...CATEGORIES, { ...badCategory, id: 'bad2' }], settings: badSettings })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 2 });
    });

    it('refuses records that share an id', () => {
        expect(refusal(v2File({ tasks: [...TASKS, { ...TASKS[0], title: 'Copy' }] })))
            .toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
    });

    it('keeps a due in a zone this browser does not know (a device with a newer time-zone database)', () => {
        const task = { ...TASKS[1], id: 'z1', due: { local: '2026-11-02T10:30', tz: 'Mars/Olympus' } };
        expect(readBackup(v2File({ tasks: [task] }), ctx).tasks).toEqual([task]);
    });

    it('moves times from the future to the moment of reading', () => {
        const task = { ...TASKS[5], id: 'f1', createdAt: '2027-01-01T00:00:00.000Z', updatedAt: '2027-01-02T00:00:00.000Z', deletedAt: '2027-01-03T00:00:00.000Z' };
        expect(readBackup(v2File({ tasks: [task] }), ctx).tasks).toEqual([{
            ...task, createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), deletedAt: NOW.toISOString(),
        }]);
    });
});

describe('readBackup: a v1 file goes through the migration rules (spec 9.2)', () => {
    const v1Ctx = { now: new Date(migration.context.now), timeZone: migration.context.timeZone, language: migration.context.language };
    const valid = migration.tasks.filter((t) => t.expected);
    const tags = migration.categories.v1.filter((tag) => tag.id);

    it('maps the tasks and the categories like the migration does, without settings', () => {
        const file = { version: 1, exportedAt: '2026-10-14T11:00:00.000Z', bubbles: valid.map((t) => t.v1), tags };
        expect(readBackup(file, v1Ctx)).toEqual({
            version: 1,
            settings: null,
            categories: migration.categories.expected,
            tasks: valid.map((t) => t.expected),
        });
    });

    it('refuses the file when a record cannot be read', () => {
        const file = { version: 1, bubbles: migration.tasks.map((t) => t.v1), tags };
        expect(refusal(file)).toEqual({ name: 'BackupError', code: 'invalid-records', count: 1 });
    });
});

describe('readBackup: not a backup', () => {
    it.each([null, [], 'text', {}, { bubbles: [], tags: {} }, { format: BACKUP_FORMAT, version: 2, tasks: [] }])(
        'refuses %j',
        (data) => expect(refusal(data)).toEqual({ name: 'BackupError', code: 'not-a-backup', count: 0 }),
    );

    it.each([{ format: BACKUP_FORMAT, version: 3, categories: [], tasks: [] }, { version: 7, bubbles: [], tags: [] }])(
        'refuses the unknown version of %j',
        (data) => expect(refusal(data)).toEqual({ name: 'BackupError', code: 'unsupported-version', count: 0 }),
    );
});
````

- [ ] **Step 2: Тест падает**

Run: `npx vitest run src/contract/backup.test.js`
Expected: FAIL — `Test Files  1 failed (1)`, `Tests  no tests`; `Error: Failed to resolve import "./backup" from "src/contract/backup.test.js". Does the file exist?`.

- [ ] **Step 3: `backup.js`**

Правила принимают зону срока как любое имя длиной 1–64 символа, а `validateTask` требует зону, которую знает этот браузер, — файл не отклоняется за такую зону. Время позже текущего правила не примут, поэтому оно становится моментом чтения, как в 9.2.

Файл `src/contract/backup.js`:

````js
/**
 * Backup files (spec section 10). The web writes version 2; it reads version 2 and the v1 files
 * of the old web, which go through the migration rules of section 9.2. The whole file is checked
 * before anything is written (#91): one record that cannot be read refuses the file.
 */
import { mapCategoriesV1, mapTaskV1 } from './migrateV1';
import { validateCategory, validateSettings, validateTask } from './validate';

export const BACKUP_FORMAT = 'to-round-backup';
export const BACKUP_VERSION = 2;

/** code: 'not-a-backup' | 'unsupported-version' | 'invalid-records'; count: the records that cannot be read. */
export class BackupError extends Error {
    constructor(code, count = 0) {
        super(`backup: ${code}`);
        this.name = 'BackupError';
        this.code = code;
        this.count = count;
    }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The v2 file of these settings, categories and tasks (backup form, spec 10). */
export const buildBackup = ({ settings, categories, tasks }, now) => ({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings,
    categories,
    tasks,
});

const sharedIds = (records) => records.length - new Set(records.map((r) => r.id)).size;

// A zone this browser does not know is still the zone the task was saved in (a device with a
// newer time-zone database); the rules take any zone name of 1–64 characters, and so does the file.
const isZoneName = (tz) => typeof tz === 'string' && tz.length > 0 && tz.length <= 64;
const taskErrors = (task) => validateTask(task)
    .filter((error) => error !== 'due.tz: invalid' || !isZoneName(task.due.tz));

// The rules refuse a time later than the server's; such a time becomes the moment of reading,
// as in the migration (spec 9.2).
const notLater = (iso, now) => (iso !== null && Date.parse(iso) > now.getTime() ? now.toISOString() : iso);

const readV2 = (data, now) => {
    if (!Array.isArray(data.categories) || !Array.isArray(data.tasks)) throw new BackupError('not-a-backup');
    const settings = data.settings === undefined ? null : data.settings;
    const invalid = data.categories.filter((c) => validateCategory(c).length > 0).length
        + data.tasks.filter((t) => taskErrors(t).length > 0).length
        + (settings !== null && validateSettings(settings).length > 0 ? 1 : 0)
        + sharedIds(data.categories) + sharedIds(data.tasks);
    if (invalid > 0) throw new BackupError('invalid-records', invalid);
    const tasks = data.tasks.map((t) => ({
        ...t,
        createdAt: notLater(t.createdAt, now),
        updatedAt: notLater(t.updatedAt, now),
        deletedAt: notLater(t.deletedAt, now),
    }));
    return { version: 2, settings, categories: data.categories, tasks };
};

const readV1 = (data, ctx) => {
    if (!Array.isArray(data.bubbles) || !Array.isArray(data.tags)) throw new BackupError('not-a-backup');
    const { categories, notes } = mapCategoriesV1(data.tags);
    const categoryIds = new Set(categories.map((c) => c.id));
    const tasks = data.bubbles.map((bubble) => mapTaskV1(bubble, { ...ctx, categoryIds }).task);
    const read = tasks.filter((t) => t !== null);
    const invalid = notes.filter((n) => n.code === 'invalid-record').length
        + (tasks.length - read.length) + sharedIds(read);
    if (invalid > 0) throw new BackupError('invalid-records', invalid);
    return { version: 1, settings: null, categories, tasks: read };
};

/**
 * Reads a parsed backup file. ctx = { now: Date, timeZone, language } (spec 9.2, for v1 files).
 * Returns { version: 1 | 2, settings: complete settings | null, categories, tasks } in backup form,
 * or throws BackupError.
 */
export const readBackup = (data, ctx) => {
    if (!isPlainObject(data)) throw new BackupError('not-a-backup');
    if (data.format === BACKUP_FORMAT) {
        if (data.version !== BACKUP_VERSION) throw new BackupError('unsupported-version');
        return readV2(data, ctx.now);
    }
    if (data.format !== undefined || data.version === undefined) throw new BackupError('not-a-backup');
    if (data.version !== 1) throw new BackupError('unsupported-version');
    return readV1(data, ctx);
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/contract/backup.test.js`
Expected: PASS — `Tests  17 passed (17)`.

- [ ] **Step 5: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  55 passed (55)`, `Tests  598 passed (598)`; линтер без ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/contract/backup.js src/contract/backup.test.js
git commit -F - <<'EOF'
feat(backup): the v2 backup file and reading files of version 2 and 1

contract/backup.js writes the v2 file of spec 10 (format, version, export
time, settings, categories, tasks) and reads a parsed file of version 2 or of
the old web's version 1, which goes through the migration rules of spec 9.2.
The whole file is checked before anything is written (#91): one record that
cannot be read, or two that share an id, refuse it, with a count. A due in a
zone this browser does not know is kept, as the rules keep it, and a time
from the future becomes the moment of reading, as in the migration.
EOF
```

---

### Task 2: Экспорт и импорт данных порциями

**Files:**
- Create: `src/services/data/backup.js`
- Test: `src/services/data/backup.test.js`, `firestore-tests/backup.data.test.js`
- Modify: `firestore-tests/canvasSync.data.test.js`

**Interfaces:**
- Consumes: `buildBackup` (задача 1); из `src/services/data/convert.js` (подплан 0.4) — `taskFromDoc`, `categoryFromDoc`, `settingsFromUserDoc`, `restoredTaskData`, `taskUpdateData`, `newCategoryData`, `categoryUpdateData`, `settingsUpdateData`, `timestampFromIso`; `sortCategories` (`src/services/data/categories.js`).
- Produces: `MAX_BATCH_WRITES = 450`; `readUserData(db, uid) → { settings, categories, tasks }`; `exportBackup(db, uid, now = new Date())` — файл v2; `planReplace({ categoryIds: Set, taskIds: Set }, backup) → writes` — чистая функция, запись — `{ type: 'set' | 'update' | 'delete', path: [] (users/{uid}) | [коллекция, id], data }`, порядок: категории, задачи, удаления задач, удаления категорий, настройки; `importCounts(backup, writes) → { tasks, categories, settings, deletedTasks, deletedCategories }`; `planImport(db, uid, backup) → { writes, counts }`; `inBatches(writes, size = 450)`; `commitInBatches(db, uid, writes, onProgress = () => {})` — порции одна за другой, `onProgress(done, total)` после каждой; отказ порции отклоняет промис с `error.committed` — сколько записей сохранено до неё.

- [ ] **Step 1: Написать падающие тесты**

Чистая часть — план замены, числа для подтверждения, порции:

Файл `src/services/data/backup.test.js`:

````js
import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { MAX_BATCH_WRITES, importCounts, inBatches, planReplace } from './backup';
import {
    categoryUpdateData, newCategoryData, restoredTaskData, settingsUpdateData, taskUpdateData,
} from './convert';
import { createDefaultSettings } from '../../contract/schema';

const SETTINGS = { ...createDefaultSettings('uk'), themeMode: 'dark' };
const category = (id, name, order) => ({ id, name, color: '#da3833', order });
const task = (id, overrides = {}) => ({
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
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-03T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

describe('planReplace: the writes of an import (spec 10)', () => {
    const current = { categoryIds: new Set(['c1', 'c2']), taskIds: new Set(['t1', 't2']) };
    const t1 = task('t1', { status: 'deleted', deletedAt: '2026-01-04T08:00:00.000Z' });
    const t3 = task('t3');
    const backup = { version: 2, settings: SETTINGS, categories: [category('c1', 'Home', 1), category('c3', 'Work', 2)], tasks: [t1, t3] };

    it('updates the records the user has, creates the others with their times and deletes the rest', () => {
        expect(planReplace(current, backup)).toEqual([
            { type: 'update', path: ['categories', 'c1'], data: categoryUpdateData({ name: 'Home', color: '#da3833', order: 1 }) },
            { type: 'set', path: ['categories', 'c3'], data: newCategoryData({ name: 'Work', color: '#da3833', order: 2 }) },
            {
                type: 'update',
                path: ['tasks', 't1'],
                data: taskUpdateData({
                    title: 'Task t1', description: '', categoryId: null, status: 'deleted', due: null, reminders: [],
                    repeat: null, radius: 45, pulseMuted: false, deletedAt: Timestamp.fromMillis(Date.parse('2026-01-04T08:00:00.000Z')),
                }),
            },
            { type: 'set', path: ['tasks', 't3'], data: restoredTaskData(t3) },
            { type: 'delete', path: ['tasks', 't2'] },
            { type: 'delete', path: ['categories', 'c2'] },
            { type: 'update', path: [], data: settingsUpdateData(SETTINGS) },
        ]);
    });

    it('leaves the settings alone when the backup has none (a v1 file)', () => {
        const writes = planReplace(current, { ...backup, version: 1, settings: null });
        expect(writes.filter((w) => w.path.length === 0)).toEqual([]);
    });

    it('counts what the import writes, for the confirmation', () => {
        expect(importCounts(backup, planReplace(current, backup))).toEqual({
            tasks: 2, categories: 2, settings: true, deletedTasks: 1, deletedCategories: 1,
        });
    });
});

describe('inBatches: at most 450 writes in one batch (#92)', () => {
    it.each([[0, []], [1, [1]], [450, [450]], [451, [450, 1]], [901, [450, 450, 1]]])(
        '%i writes -> batches of %j',
        (n, sizes) => {
            const writes = Array.from({ length: n }, (_, i) => ({ type: 'delete', path: ['tasks', `t${i}`] }));
            const batches = inBatches(writes);
            expect(batches.map((b) => b.length)).toEqual(sizes);
            expect(batches.flat()).toEqual(writes);
        },
    );

    it('keeps the limit of the spec', () => {
        expect(MAX_BATCH_WRITES).toBe(450);
    });
});
````

На эмуляторе с настоящими правилами — экспорт, замена (обновление общих записей с прежним `createdAt`, создание новых с их временем, удаление остальных, настройки), 451 запись двумя порциями, отказ второй порции и повторный импорт:

Файл `firestore-tests/backup.data.test.js`:

````js
/**
 * Backup export and import (src/services/data/backup.js) against the emulator with the real
 * firestore.rules (spec 10, #92): every write must be one the rules accept, a batch holds at most
 * 450 writes, and an import cut short by a failed batch is finished by importing again.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { OWNER, PAST, baseTask, categoryFromFixture, seed, setupRulesEnv, userDocWith } from './helpers';
import { commitInBatches, exportBackup, planImport } from '../src/services/data/backup';
import { createTask } from '../src/services/data/tasks';
import { createDefaultSettings } from '../src/contract/schema';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const SETTINGS = createDefaultSettings('en');
const ISO_PAST = PAST.toDate().toISOString();

const fileTask = (id, overrides = {}) => ({
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
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-02T08:00:00.000Z',
    deletedAt: null,
    ...overrides,
});

const readAll = async (db, name) => {
    const snapshot = await getDocs(collection(db, `users/${OWNER}/${name}`));
    return Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
};

describe('backup: export (spec 10)', () => {
    it('writes the settings, the categories by order and the tasks in backup form', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/categories/c2`, categoryFromFixture({ id: 'c2', name: 'Work', color: '#ee603c', order: 2 })[1]);
        await seed(env, `users/${OWNER}/categories/c1`, categoryFromFixture({ id: 'c1', name: 'Home', color: '#da3833', order: 1 })[1]);
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ title: 'Buy milk', overdueAt: Timestamp.fromMillis(1000) }));
        const now = new Date('2026-10-20T12:00:00.000Z');
        expect(await exportBackup(device(), OWNER, now)).toEqual({
            format: 'to-round-backup',
            version: 2,
            exportedAt: '2026-10-20T12:00:00.000Z',
            settings: SETTINGS,
            categories: [
                { id: 'c1', name: 'Home', color: '#da3833', order: 1 },
                { id: 'c2', name: 'Work', color: '#ee603c', order: 2 },
            ],
            tasks: [fileTask('t1', { title: 'Buy milk', createdAt: ISO_PAST, updatedAt: ISO_PAST })],
        });
    });
});

describe('backup: import replaces the data (spec 10)', () => {
    it('updates the shared records, creates the new ones with their own times and deletes the rest', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/categories/c1`, categoryFromFixture({ id: 'c1', name: 'Home', color: '#da3833', order: 1 })[1]);
        await seed(env, `users/${OWNER}/categories/c2`, categoryFromFixture({ id: 'c2', name: 'Old', color: '#ee603c', order: 2 })[1]);
        await seed(env, `users/${OWNER}/tasks/t1`, baseTask({ title: 'Old title', nextNotifyAt: Timestamp.fromMillis(5000) }));
        await seed(env, `users/${OWNER}/tasks/t2`, baseTask({ title: 'Not in the file' }));
        const db = device();
        const backup = {
            version: 2,
            settings: { ...SETTINGS, language: 'uk' },
            categories: [{ id: 'c1', name: 'Home again', color: '#da3833', order: 1 }, { id: 'c3', name: 'New', color: '#fd8b2b', order: 2 }],
            tasks: [
                fileTask('t1', { title: 'New title', categoryId: 'c3', status: 'deleted', deletedAt: '2026-02-03T08:00:00.000Z' }),
                fileTask('t3', { due: { local: '2026-11-02T09:00', tz: 'Europe/Kyiv' }, reminders: [60] }),
            ],
        };

        const { writes, counts } = await planImport(db, OWNER, backup);
        expect(counts).toEqual({ tasks: 2, categories: 2, settings: true, deletedTasks: 1, deletedCategories: 1 });
        await commitInBatches(db, OWNER, writes);

        const categories = await readAll(db, 'categories');
        expect(Object.keys(categories).sort()).toEqual(['c1', 'c3']);
        expect(categories.c1).toMatchObject({ name: 'Home again', createdAt: PAST });
        expect(categories.c1.updatedAt.toMillis()).toBeGreaterThan(PAST.toMillis());
        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks).sort()).toEqual(['t1', 't3']);
        expect(tasks.t1).toMatchObject({
            title: 'New title', categoryId: 'c3', status: 'deleted', createdAt: PAST,
            deletedAt: Timestamp.fromMillis(Date.parse('2026-02-03T08:00:00.000Z')), nextNotifyAt: Timestamp.fromMillis(5000),
        });
        expect(tasks.t3).toMatchObject({
            schemaVersion: 2, reminders: [60], overdueAt: null,
            createdAt: Timestamp.fromMillis(Date.parse('2026-02-01T08:00:00.000Z')),
            updatedAt: Timestamp.fromMillis(Date.parse('2026-02-02T08:00:00.000Z')),
        });
        expect((await getDoc(doc(db, `users/${OWNER}`))).data().settings.language).toBe('uk');
    });

    it('commits 451 writes in two batches of at most 450', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        const db = device();
        const tasks = Array.from({ length: 451 }, (_, i) => fileTask(`t${i}`));
        const { writes } = await planImport(db, OWNER, { version: 2, settings: null, categories: [], tasks });
        const progress = [];
        await commitInBatches(db, OWNER, writes, (done, total) => progress.push([done, total]));
        expect(progress).toEqual([[450, 451], [451, 451]]);
        expect(Object.keys(await readAll(db, 'tasks'))).toHaveLength(451);
    });

    it('reports the writes committed before a failed batch, and importing again finishes the job', async () => {
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        const db = device();
        const backup = { version: 2, settings: null, categories: [], tasks: Array.from({ length: 451 }, (_, i) => fileTask(`t${i}`)) };
        const { writes } = await planImport(db, OWNER, backup);
        // Another device creates the last task between the plan and the second batch.
        await createTask(env.authenticatedContext(OWNER).firestore(), OWNER, 't450', {
            title: 'Meanwhile', description: '', categoryId: null, due: null, reminders: [], repeat: null, radius: 45,
        });
        const failure = await commitInBatches(db, OWNER, writes).catch((e) => e);
        expect(failure.code).toBe('permission-denied');
        expect(failure.committed).toBe(450);

        const again = await planImport(db, OWNER, backup);
        await commitInBatches(db, OWNER, again.writes);
        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks)).toHaveLength(451);
        expect(tasks.t450.title).toBe('Task t450');
    });
});
````

Холст показывает импорт без перезагрузки: ровно задачи копии, по одному телу на задачу, и после повторного импорта тоже (#101):

````diff
diff --git a/firestore-tests/canvasSync.data.test.js b/firestore-tests/canvasSync.data.test.js
index 97ade17..a56c602 100644
--- a/firestore-tests/canvasSync.data.test.js
+++ b/firestore-tests/canvasSync.data.test.js
@@ -1,8 +1,9 @@
 // @vitest-environment happy-dom
 /**
- * Issue #94 with two real Firestore clients on the emulator: device A writes tasks through the
- * data layer, device B is the canvas itself (useMatterEngine fed by subscribeTasks), which has
- * to show every change without a reload and with exactly one Matter body per task.
+ * Issues #94 and #101 with two real Firestore clients on the emulator: device A writes tasks
+ * through the data layer (one by one, or a whole backup import), device B is the canvas itself
+ * (useMatterEngine fed by subscribeTasks), which has to show every change without a reload and
+ * with exactly one Matter body per task.
  * No JSX: the rules config collects plain *.test.js files.
  */
 import { createElement, useEffect, useState } from 'react';
@@ -11,6 +12,7 @@ import Matter from 'matter-js';
 import { describe, it, beforeAll, afterAll, afterEach, beforeEach, expect, vi } from 'vitest';
 import { OWNER, setupRulesEnv } from './helpers';
 import { createTask, deleteTaskForever, newTaskId, subscribeTasks, updateTask } from '../src/services/data/tasks';
+import { commitInBatches, planImport } from '../src/services/data/backup';
 import { useMatterEngine } from '../src/hooks/useMatterEngine';
 
 // Matter's canvas renderer and rAF runner need a real browser; the engine, bodies and
@@ -134,4 +136,34 @@ describe('canvas sync between two devices (#94, Firestore emulator)', () => {
         expect(circles).toEqual([added.body]);
         expect([...bodiesById.get(remote)]).toEqual([added.body]);
     });
+
+    it('shows an imported backup without a reload: its tasks only, one body each, also after the same import again (#101)', async () => {
+        const deviceA = env.authenticatedContext(OWNER).firestore();
+        await createTask(deviceA, OWNER, 'old1', FIELDS);
+        await createTask(deviceA, OWNER, 'old2', { ...FIELDS, title: 'Not in the backup' });
+        root.render(createElement(DeviceB, { db: env.authenticatedContext(OWNER).firestore() }));
+        await vi.waitFor(() => expect(bubbles?.length).toBe(2), SYNC_WAIT);
+        const keptBody = bubbles.find((b) => b.id === 'old1').body;
+
+        const backupTask = (id, title) => ({
+            id, title, description: '', categoryId: null, status: 'active', due: null, reminders: [], repeat: null,
+            radius: 45, pulseMuted: false, createdAt: '2026-02-01T08:00:00.000Z', updatedAt: '2026-02-02T08:00:00.000Z', deletedAt: null,
+        });
+        const backup = { version: 2, settings: null, categories: [], tasks: [backupTask('old1', 'Kept and renamed'), backupTask('new1', 'From the backup')] };
+        const importBackup = async () => {
+            const { writes } = await planImport(deviceA, OWNER, backup);
+            await commitInBatches(deviceA, OWNER, writes);
+        };
+
+        await importBackup();
+        await vi.waitFor(() => expect(bubbles.map((b) => b.title).sort()).toEqual(['From the backup', 'Kept and renamed']), SYNC_WAIT);
+        await importBackup();
+        // The second import updates both tasks: wait until device B has seen it.
+        await vi.waitFor(() => expect(bubbles.find((b) => b.id === 'new1').updatedAt).not.toBe('2026-02-02T08:00:00.000Z'), SYNC_WAIT);
+
+        const circles = refs.engineRef.current.world.bodies.filter((body) => body.label === 'Circle Body');
+        expect(circles).toHaveLength(2);
+        expect(bubbles.find((b) => b.id === 'old1').body).toBe(keptBody);
+        expect(['old1', 'new1'].map((id) => bodiesById.get(id).size)).toEqual([1, 1]);
+    });
 });
````

- [ ] **Step 2: Тест падает**

Run: `npx vitest run src/services/data/backup.test.js`
Expected: FAIL — `Test Files  1 failed (1)`, `Tests  no tests`; `Error: Cannot find module './backup' imported from …/src/services/data/backup.test.js`.

- [ ] **Step 3: `backup.js`**

Файл `src/services/data/backup.js`:

````js
/**
 * Backup of one user (spec section 10). The export reads users/{uid} with its categories and
 * tasks; the import replaces them with a backup's: a record the user has is updated in place
 * (never deleted and created again: onCategoryDeleted would clear categoryId on tasks already
 * restored), a new one is created with its own times, the rest is deleted. Writes go in batches
 * of at most 450, one after another (#92); the canvas and the list follow them through their
 * listeners, so nothing reloads the page (#101).
 */
import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { buildBackup } from '../../contract/backup';
import {
    categoryFromDoc, categoryUpdateData, newCategoryData, restoredTaskData, settingsFromUserDoc,
    settingsUpdateData, taskFromDoc, taskUpdateData, timestampFromIso,
} from './convert';
import { sortCategories } from './categories';

export const MAX_BATCH_WRITES = 450;

// Pending serverTimestamp() fields read as the local estimate instead of null.
const READ_OPTIONS = { serverTimestamps: 'estimate' };

/** Everything a backup holds, in backup form: { settings, categories (by order), tasks }. */
export const readUserData = async (db, uid) => {
    const [user, categories, tasks] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
    ]);
    return {
        settings: settingsFromUserDoc(user.data()),
        categories: sortCategories(categories.docs.map((d) => categoryFromDoc(d.id, d.data()))),
        tasks: tasks.docs.map((d) => taskFromDoc(d.id, d.data(READ_OPTIONS))),
    };
};

/** The v2 backup file of this user now. */
export const exportBackup = async (db, uid, now = new Date()) => buildBackup(await readUserData(db, uid), now);

/**
 * The writes that replace the user's data with a backup (readBackup's result), in order:
 * categories, tasks, deletions of tasks, deletions of categories, settings. Pure.
 * current = { categoryIds: Set, taskIds: Set }. A write is { type: 'set' | 'update' | 'delete',
 * path: [] (users/{uid}) or [collection, id], data }.
 */
export const planReplace = (current, backup) => {
    const writes = [];
    backup.categories.forEach(({ id, name, color, order }) => {
        writes.push(current.categoryIds.has(id)
            ? { type: 'update', path: ['categories', id], data: categoryUpdateData({ name, color, order }) }
            : { type: 'set', path: ['categories', id], data: newCategoryData({ name, color, order }) });
    });
    backup.tasks.forEach((task) => {
        if (!current.taskIds.has(task.id)) {
            writes.push({ type: 'set', path: ['tasks', task.id], data: restoredTaskData(task) });
            return;
        }
        const { id, createdAt, updatedAt, deletedAt, ...fields } = task;
        writes.push({
            type: 'update',
            path: ['tasks', id],
            data: taskUpdateData({ ...fields, deletedAt: deletedAt === null ? null : timestampFromIso(deletedAt) }),
        });
    });
    const taskIds = new Set(backup.tasks.map((t) => t.id));
    current.taskIds.forEach((id) => {
        if (!taskIds.has(id)) writes.push({ type: 'delete', path: ['tasks', id] });
    });
    const categoryIds = new Set(backup.categories.map((c) => c.id));
    current.categoryIds.forEach((id) => {
        if (!categoryIds.has(id)) writes.push({ type: 'delete', path: ['categories', id] });
    });
    if (backup.settings) writes.push({ type: 'update', path: [], data: settingsUpdateData(backup.settings) });
    return writes;
};

/** The numbers the confirmation shows (spec 10). */
export const importCounts = (backup, writes) => ({
    tasks: backup.tasks.length,
    categories: backup.categories.length,
    settings: backup.settings !== null,
    deletedTasks: writes.filter((w) => w.type === 'delete' && w.path[0] === 'tasks').length,
    deletedCategories: writes.filter((w) => w.type === 'delete' && w.path[0] === 'categories').length,
});

/** What importing this backup writes now: { writes, counts }. */
export const planImport = async (db, uid, backup) => {
    const [categories, tasks] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
    ]);
    const writes = planReplace({
        categoryIds: new Set(categories.docs.map((d) => d.id)),
        taskIds: new Set(tasks.docs.map((d) => d.id)),
    }, backup);
    return { writes, counts: importCounts(backup, writes) };
};

/** The writes split into batches of at most 450 (#92). */
export const inBatches = (writes, size = MAX_BATCH_WRITES) => {
    const batches = [];
    for (let start = 0; start < writes.length; start += size) batches.push(writes.slice(start, start + size));
    return batches;
};

/**
 * Commits the writes batch after batch; onProgress(done, total) after each one. A failed batch
 * rejects with error.committed = the writes committed before it; the same import run again
 * finishes the job (#92).
 */
export const commitInBatches = async (db, uid, writes, onProgress = () => {}) => {
    let done = 0;
    for (const batchWrites of inBatches(writes)) {
        const batch = writeBatch(db);
        batchWrites.forEach(({ type, path, data }) => {
            const ref = doc(db, 'users', uid, ...path);
            if (type === 'set') batch.set(ref, data);
            else if (type === 'update') batch.update(ref, data);
            else batch.delete(ref);
        });
        try {
            await batch.commit();
        } catch (e) {
            e.committed = done;
            throw e;
        }
        done += batchWrites.length;
        onProgress(done, writes.length);
    }
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/services/data/backup.test.js`
Expected: PASS — `Tests  9 passed (9)`.

- [ ] **Step 5: Эмулятор**

Run: `npm run test:rules`
Expected: `Test Files  11 passed (11)`, `Tests  118 passed (118)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  56 passed (56)`, `Tests  607 passed (607)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add firestore-tests/backup.data.test.js firestore-tests/canvasSync.data.test.js src/services/data/backup.js src/services/data/backup.test.js
git commit -F - <<'EOF'
feat(backup): export and import of all of a user's data in batches of 450

services/data/backup.js reads users/{uid} with its categories and tasks for
the v2 export, and replaces them with a backup's (spec 10): a record the user
has is updated in place, a new one is created with its own times, the rest is
deleted, then the settings if the backup has them. The writes go in batches
of at most 450, one after another (#92); a failed batch reports the writes
committed before it, and the same import run again finishes the job. On the
emulator: the rules accept every write, and the canvas shows an import
without a reload, with one body per task (#101).
EOF
```

---

### Task 3: Экспорт и импорт в главном меню

**Files:**
- Create: `src/utils/saveJsonFile.js`, `src/hooks/useBackup.js`, `src/components/BackupDialog.jsx`
- Test: `src/hooks/useBackup.test.jsx`, `src/components/BackupDialog.test.jsx`, `src/components/MainMenuDrawer.test.jsx`
- Modify: `src/components/MainMenuDrawer.jsx`, `src/components/BubblesDialogs.jsx`, `src/locales/en/translation.json`, `src/locales/uk/translation.json`

**Interfaces:**
- Consumes: `readBackup`, `BackupError` (задача 1); `exportBackup`, `planImport`, `commitInBatches` (задача 2); `deviceTimeZone()` (`src/contract/time.js`).
- Produces: `saveJsonFile(fileName, data)` — скачивание JSON; `useBackup(uid) → { state, exportBackup(), importFile(file), confirmImport(), close() }`, где `state` — `null` | `{ step: 'confirm', version, counts }` | `{ step: 'writing', done, total }` | `{ step: 'done' }` | `{ step: 'error', error: { key, values? } }`; файл экспорта — `to-round-backup-yyyy-MM-dd-HHmm.json`; `<BackupDialog state onConfirm onClose isMobile getDialogPaperStyles t />`; `MainMenuDrawer` принимает `onExportBackup()` и `onImportBackupFile(file)`; ключи `backup.{export,import,title,replace,inBackup,toDelete,settings,oldFormat,confirm,writing,done,notJson,notBackup,unsupported,invalid,readFailed,writeFailed,exportFailed}`.

- [ ] **Step 1: Написать падающие тесты**

Пункты меню на прежнем месте v1 — сразу после mindmap:

````diff
diff --git a/src/components/MainMenuDrawer.test.jsx b/src/components/MainMenuDrawer.test.jsx
index 35ac3e4..59800e7 100644
--- a/src/components/MainMenuDrawer.test.jsx
+++ b/src/components/MainMenuDrawer.test.jsx
@@ -60,3 +60,59 @@ describe('MainMenuDrawer: "Reminders on this device" (spec 3.3, 8.9)', () => {
         expect(remindersSwitch().disabled).toBe(true);
     });
 });
+
+describe('MainMenuDrawer: backup export and import (spec 10)', () => {
+    let container;
+    let root;
+    let props;
+
+    const render = () => act(() => root.render(
+        <MainMenuDrawer
+            open
+            onClose={props.onClose}
+            isMobile={false}
+            themeMode="light"
+            mainView="bubbles"
+            bubbleBackgroundEnabled
+            categoriesPanelEnabled={false}
+            thisDevice={null}
+            onExportBackup={props.onExportBackup}
+            onImportBackupFile={props.onImportBackupFile}
+        />
+    ));
+    const menuItem = (text) => Array.from(document.querySelectorAll('.MuiListItemButton-root')).find((el) => el.textContent === text);
+    const fileInput = () => document.querySelector('input[type="file"]');
+
+    beforeEach(() => {
+        props = { onClose: vi.fn(), onExportBackup: vi.fn(), onImportBackupFile: vi.fn() };
+        container = document.createElement('div');
+        document.body.appendChild(container);
+        root = createRoot(container);
+    });
+
+    afterEach(() => {
+        act(() => root.unmount());
+        container.remove();
+    });
+
+    it('exports a backup', () => {
+        render();
+        act(() => menuItem('backup.export').click());
+        expect(props.onClose).toHaveBeenCalled();
+        expect(props.onExportBackup).toHaveBeenCalledTimes(1);
+    });
+
+    it('opens the file chooser for the import and hands it the chosen file', () => {
+        render();
+        const choose = vi.spyOn(fileInput(), 'click');
+        act(() => menuItem('backup.import').click());
+        expect(choose).toHaveBeenCalledTimes(1);
+        expect(fileInput().accept).toBe('application/json,.json');
+
+        const file = new window.File(['{}'], 'backup.json', { type: 'application/json' });
+        Object.defineProperty(fileInput(), 'files', { value: [file] });
+        act(() => fileInput().dispatchEvent(new window.Event('change', { bubbles: true })));
+        expect(props.onImportBackupFile).toHaveBeenCalledWith(file);
+        expect(props.onClose).toHaveBeenCalled();
+    });
+});
````

Файл `src/components/BackupDialog.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BackupDialog from './BackupDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const COUNTS = { tasks: 120, categories: 8, settings: true, deletedTasks: 3, deletedCategories: 1 };

describe('BackupDialog: the steps of an import (spec 10)', () => {
    let container;
    let root;
    let onConfirm;
    let onClose;

    const render = (state) => act(() => root.render(
        <BackupDialog state={state} onConfirm={onConfirm} onClose={onClose} isMobile={false} getDialogPaperStyles={() => ({})} t={t} />
    ));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);

    beforeEach(() => {
        onConfirm = vi.fn();
        onClose = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('stays closed without a step', () => {
        render(null);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('asks before writing, with the numbers of the backup and of what goes', () => {
        render({ step: 'confirm', version: 2, counts: COUNTS });
        const text = document.body.textContent;
        expect(text).toContain('backup.replace');
        expect(text).toContain('backup.inBackup {"tasks":120,"categories":8}');
        expect(text).toContain('backup.toDelete {"tasks":3,"categories":1}');
        expect(text).toContain('backup.settings');
        expect(text).not.toContain('backup.oldFormat');
        act(() => button('backup.confirm').click());
        expect(onConfirm).toHaveBeenCalledTimes(1);
        act(() => button('bubbles.cancel').click());
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('says what a backup of the old version loses, and leaves out what does not happen', () => {
        render({ step: 'confirm', version: 1, counts: { ...COUNTS, settings: false, deletedTasks: 0, deletedCategories: 0 } });
        const text = document.body.textContent;
        expect(text).toContain('backup.oldFormat');
        expect(text).not.toContain('backup.toDelete');
        expect(text).not.toContain('backup.settings');
    });

    it('shows the progress and offers no way out while writing', () => {
        render({ step: 'writing', done: 450, total: 451 });
        expect(document.body.textContent).toContain('backup.writing {"done":450,"total":451}');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
        expect(button('bubbles.close')).toBeUndefined();
        expect(button('bubbles.cancel')).toBeUndefined();
    });

    it.each([
        [{ step: 'done' }, 'backup.done'],
        [{ step: 'error', error: { key: 'backup.writeFailed', values: { done: 450, total: 451 } } }, 'backup.writeFailed {"done":450,"total":451}'],
        [{ step: 'error', error: { key: 'backup.exportFailed' } }, 'backup.exportFailed'],
    ])('reports %j and closes', (state, text) => {
        render(state);
        expect(document.body.textContent).toContain(text);
        act(() => button('bubbles.close').click());
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
````

Хук — с настоящим разбором файла и подменёнными слоем данных и скачиванием:

Файл `src/hooks/useBackup.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitInBatches, exportBackup, planImport } from '../services/data/backup';
import { saveJsonFile } from '../utils/saveJsonFile';
import { useBackup } from './useBackup';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/backup', () => ({ exportBackup: vi.fn(), planImport: vi.fn(), commitInBatches: vi.fn() }));
vi.mock('../utils/saveJsonFile', () => ({ saveJsonFile: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'uk' } }) }));

const fileOf = (content) => new window.File([typeof content === 'string' ? content : JSON.stringify(content)], 'backup.json');
const V2 = { format: 'to-round-backup', version: 2, exportedAt: '2026-10-20T12:00:00.000Z', categories: [], tasks: [] };
const PLAN = {
    writes: [{ type: 'delete', path: ['tasks', 't1'] }, { type: 'delete', path: ['tasks', 't2'] }],
    counts: { tasks: 0, categories: 0, settings: false, deletedTasks: 2, deletedCategories: 0 },
};

describe('useBackup: the backup export and import of the menu (spec 10)', () => {
    let container;
    let root;
    let result;

    function Probe() {
        result = useBackup('u1');
        return null;
    }

    beforeEach(async () => {
        vi.resetAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => root.render(<Probe />));
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('saves the export as a file named by the date and time', async () => {
        exportBackup.mockResolvedValue(V2);
        await act(async () => result.exportBackup());
        expect(exportBackup).toHaveBeenCalledWith('db', 'u1');
        expect(saveJsonFile).toHaveBeenCalledWith(expect.stringMatching(/^to-round-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/), V2);
        expect(result.state).toBeNull();
    });

    it('says so when the export fails', async () => {
        exportBackup.mockRejectedValue(new Error('unavailable'));
        await act(async () => result.exportBackup());
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.exportFailed' } });
    });

    it.each([
        ['that is not JSON', 'oops', { key: 'backup.notJson' }],
        ['that is not a backup', { bubbles: 1 }, { key: 'backup.notBackup' }],
        ['of another version', { format: 'to-round-backup', version: 3, categories: [], tasks: [] }, { key: 'backup.unsupported' }],
        ['with a record that cannot be read', { ...V2, tasks: [{ id: 't1' }] }, { key: 'backup.invalid', values: { n: 1 } }],
    ])('refuses a file %s before anything is read or written', async (_, content, error) => {
        await act(async () => result.importFile(fileOf(content)));
        expect(result.state).toEqual({ step: 'error', error });
        expect(planImport).not.toHaveBeenCalled();
    });

    it('asks with the numbers, then writes and shows the progress', async () => {
        planImport.mockResolvedValue(PLAN);
        await act(async () => result.importFile(fileOf(V2)));
        expect(planImport).toHaveBeenCalledWith('db', 'u1', { version: 2, settings: null, categories: [], tasks: [] });
        expect(result.state).toEqual({ step: 'confirm', version: 2, counts: PLAN.counts });
        expect(commitInBatches).not.toHaveBeenCalled();

        let progress;
        let finish;
        commitInBatches.mockImplementation((db, uid, writes, onProgress) => {
            progress = onProgress;
            return new Promise((resolve) => { finish = resolve; });
        });
        act(() => { result.confirmImport(); });
        expect(commitInBatches).toHaveBeenCalledWith('db', 'u1', PLAN.writes, expect.any(Function));
        expect(result.state).toEqual({ step: 'writing', done: 0, total: 2 });
        act(() => progress(1, 2));
        expect(result.state).toEqual({ step: 'writing', done: 1, total: 2 });
        await act(async () => finish());
        expect(result.state).toEqual({ step: 'done' });
    });

    it('says how much was saved when a batch fails', async () => {
        planImport.mockResolvedValue(PLAN);
        commitInBatches.mockRejectedValue(Object.assign(new Error('permission-denied'), { committed: 1 }));
        await act(async () => result.importFile(fileOf(V2)));
        await act(async () => result.confirmImport());
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.writeFailed', values: { done: 1, total: 2 } } });
    });

    it('says so when the current data cannot be read', async () => {
        planImport.mockRejectedValue(new Error('unavailable'));
        await act(async () => result.importFile(fileOf(V2)));
        expect(result.state).toEqual({ step: 'error', error: { key: 'backup.readFailed' } });
    });

    it('closes without writing', async () => {
        planImport.mockResolvedValue(PLAN);
        await act(async () => result.importFile(fileOf(V2)));
        act(() => result.close());
        expect(result.state).toBeNull();
        expect(commitInBatches).not.toHaveBeenCalled();
    });
});
````

- [ ] **Step 2: Тесты падают**

Run: `npx vitest run src/components/MainMenuDrawer.test.jsx src/components/BackupDialog.test.jsx src/hooks/useBackup.test.jsx`
Expected: FAIL — `Test Files  3 failed (3)`, `Tests  2 failed | 3 passed (5)`; `Error: Failed to resolve import "./BackupDialog" from "src/components/BackupDialog.test.jsx". Does the file exist?`, `Error: Failed to resolve import "../utils/saveJsonFile" from "src/hooks/useBackup.test.jsx". Does the file exist?`; в меню — `TypeError: Cannot read properties of undefined (reading 'click')` и `Error: The vi.spyOn() function could not find an object to spy upon. The first argument must be defined.`

- [ ] **Step 3: Файл, хук и окно**

Файл `src/utils/saveJsonFile.js`:

````js
/** Offers data as a JSON file to save: the browser's download of fileName. */
export const saveJsonFile = (fileName, data) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
````

Файл проверяется целиком до чтения текущих данных; подтверждение показывает числа плана, построенного на текущих данных; ошибка порции сообщает, сколько изменений сохранено.

Файл `src/hooks/useBackup.js`:

````js
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { db } from '../firebase';
import { BackupError, readBackup } from '../contract/backup';
import { deviceTimeZone } from '../contract/time';
import { commitInBatches, exportBackup as readExport, planImport } from '../services/data/backup';
import { saveJsonFile } from '../utils/saveJsonFile';
import logger from '../utils/logger';

const REFUSALS = {
    'not-a-backup': 'backup.notBackup',
    'unsupported-version': 'backup.unsupported',
    'invalid-records': 'backup.invalid',
};

const refusalOf = (e) => {
    if (!(e instanceof BackupError)) {
        logger.error('Backup file could not be read:', e);
        return { key: 'backup.notBackup' };
    }
    return e.code === 'invalid-records' ? { key: REFUSALS[e.code], values: { n: e.count } } : { key: REFUSALS[e.code] };
};

/**
 * Backup export and import of the main menu (spec 10). state drives BackupDialog: null, or
 * { step: 'confirm', version, counts } | { step: 'writing', done, total } | { step: 'done' } |
 * { step: 'error', error: { key, values? } }. The file is checked whole before anything is read
 * or written; the writes follow the confirmation, and nothing reloads the page (#101).
 */
export function useBackup(uid) {
    const { i18n } = useTranslation();
    const [state, setState] = useState(null);
    const plan = useRef(null);

    const exportBackup = useCallback(async () => {
        try {
            const file = await readExport(db, uid);
            saveJsonFile(`to-round-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`, file);
        } catch (e) {
            logger.error('Backup export failed:', e);
            setState({ step: 'error', error: { key: 'backup.exportFailed' } });
        }
    }, [uid]);

    const importFile = useCallback(async (file) => {
        let data;
        try {
            data = JSON.parse(await file.text());
        } catch {
            setState({ step: 'error', error: { key: 'backup.notJson' } });
            return;
        }
        let backup;
        try {
            backup = readBackup(data, { now: new Date(), timeZone: deviceTimeZone(), language: i18n.language });
        } catch (e) {
            setState({ step: 'error', error: refusalOf(e) });
            return;
        }
        try {
            plan.current = await planImport(db, uid, backup);
        } catch (e) {
            logger.error('Backup import could not read the current data:', e);
            setState({ step: 'error', error: { key: 'backup.readFailed' } });
            return;
        }
        setState({ step: 'confirm', version: backup.version, counts: plan.current.counts });
    }, [uid, i18n.language]);

    const confirmImport = useCallback(async () => {
        const { writes } = plan.current;
        plan.current = null;
        setState({ step: 'writing', done: 0, total: writes.length });
        try {
            await commitInBatches(db, uid, writes, (done, total) => setState({ step: 'writing', done, total }));
            setState({ step: 'done' });
        } catch (e) {
            logger.error('Backup import failed:', e);
            setState({ step: 'error', error: { key: 'backup.writeFailed', values: { done: e.committed ?? 0, total: writes.length } } });
        }
    }, [uid]);

    const close = useCallback(() => {
        plan.current = null;
        setState(null);
    }, []);

    return { state, exportBackup, importFile, confirmImport, close };
}
````

Окно — по образцу `LogoutConfirmDialog` (фон из `getDialogPaperStyles()`); пока идёт запись, закрыть его нельзя.

Файл `src/components/BackupDialog.jsx`:

````jsx
import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material';

/**
 * The steps of a backup import and the backup's errors (spec 10). state comes from useBackup:
 * null (closed), confirm (the numbers before anything is written), writing (no way out until the
 * batches are done), done or error.
 */
const BackupDialog = ({ state, onConfirm, onClose, isMobile, getDialogPaperStyles, t }) => {
    if (!state) return null;
    const { step, counts } = state;
    const writing = step === 'writing';
    return (
        <Dialog
            open
            onClose={writing ? undefined : onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, ...getDialogPaperStyles(), margin: isMobile ? 1 : 3 } }}
        >
            <DialogTitle sx={{ color: 'text.primary' }}>{t('backup.title')}</DialogTitle>
            <DialogContent>
                {step === 'confirm' && (
                    <>
                        <Typography gutterBottom>{t('backup.replace')}</Typography>
                        <Typography gutterBottom>{t('backup.inBackup', { tasks: counts.tasks, categories: counts.categories })}</Typography>
                        {(counts.deletedTasks > 0 || counts.deletedCategories > 0) && (
                            <Typography gutterBottom>
                                {t('backup.toDelete', { tasks: counts.deletedTasks, categories: counts.deletedCategories })}
                            </Typography>
                        )}
                        {counts.settings && <Typography gutterBottom>{t('backup.settings')}</Typography>}
                        {state.version === 1 && <Typography color="text.secondary">{t('backup.oldFormat')}</Typography>}
                    </>
                )}
                {writing && (
                    <>
                        <Typography gutterBottom>{t('backup.writing', { done: state.done, total: state.total })}</Typography>
                        <LinearProgress variant="determinate" value={state.total > 0 ? (state.done / state.total) * 100 : 0} />
                    </>
                )}
                {step === 'done' && <Typography>{t('backup.done')}</Typography>}
                {step === 'error' && <Typography color="error">{t(state.error.key, state.error.values)}</Typography>}
            </DialogContent>
            {!writing && (
                <DialogActions sx={{ padding: isMobile ? 2 : 3, gap: 2 }}>
                    {step === 'confirm' ? (
                        <>
                            <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>{t('bubbles.cancel')}</Button>
                            <Button onClick={onConfirm} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('backup.confirm')}</Button>
                        </>
                    ) : (
                        <Button onClick={onClose} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('bubbles.close')}</Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default BackupDialog;
````

- [ ] **Step 4: Пункты меню, подключение и переводы**

Скрытое поле файла — вне списка (`<input>` внутри `<ul>` — невалидная разметка):

````diff
diff --git a/src/components/MainMenuDrawer.jsx b/src/components/MainMenuDrawer.jsx
index 3401f89..e60f595 100644
--- a/src/components/MainMenuDrawer.jsx
+++ b/src/components/MainMenuDrawer.jsx
@@ -1,4 +1,4 @@
-import React from 'react';
+import React, { useRef } from 'react';
 import { Drawer, Box, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Switch } from '@mui/material';
 import { useTranslation } from 'react-i18next';
 import {
@@ -13,7 +13,9 @@ import {
     ViewListOutlined,
     AccountTreeOutlined,
     LockOutlined,
-    NotificationsActiveOutlined
+    NotificationsActiveOutlined,
+    FileDownload,
+    FileUpload
 } from '@mui/icons-material';
 import LanguageSelector from './LanguageSelector';
 
@@ -39,9 +41,26 @@ const MainMenuDrawer = ({
     onLogout,
     // This browser in users/{uid}/devices (null until registered) and its reminders switch
     thisDevice,
-    onToggleThisDeviceReminders
+    onToggleThisDeviceReminders,
+    // Backup (spec 10): the export, and the import of the chosen file
+    onExportBackup,
+    onImportBackupFile
 }) => {
     const { t } = useTranslation();
+    const fileInputRef = useRef(null);
+
+    const handleImportClick = () => {
+        fileInputRef.current.value = '';
+        fileInputRef.current.click();
+    };
+
+    const handleFileChange = (event) => {
+        const file = event.target.files && event.target.files[0];
+        if (!file) return;
+        onClose();
+        onImportBackupFile && onImportBackupFile(file);
+    };
+
     return (
         <Drawer
             anchor="left"
@@ -91,6 +110,35 @@ const MainMenuDrawer = ({
 
                     <Divider sx={{ backgroundColor: themeMode === 'light' ? '#E0E0E0' : '#333333', margin: '8px 0' }} />
 
+                    <ListItemButton
+                        onClick={() => {
+                            onClose();
+                            onExportBackup && onExportBackup();
+                        }}
+                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
+                    >
+                        <ListItemIcon sx={{ minWidth: 40 }}>
+                            <FileDownload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
+                        </ListItemIcon>
+                        <ListItemText
+                            primary={t('backup.export')}
+                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
+                        />
+                    </ListItemButton>
+
+                    <ListItemButton
+                        onClick={handleImportClick}
+                        sx={{ padding: '16px 24px', cursor: 'pointer', '&:hover': { backgroundColor: themeMode === 'light' ? '#F8F9FA' : '#333333' } }}
+                    >
+                        <ListItemIcon sx={{ minWidth: 40 }}>
+                            <FileUpload sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
+                        </ListItemIcon>
+                        <ListItemText
+                            primary={t('backup.import')}
+                            primaryTypographyProps={{ color: themeMode === 'light' ? '#2C3E50' : '#ffffff', fontWeight: 500 }}
+                        />
+                    </ListItemButton>
+
                     <ListItem sx={{ padding: '16px 24px' }}>
                         <ListItemIcon sx={{ minWidth: 40 }}>
                             <LanguageOutlined sx={{ color: themeMode === 'light' ? '#BDC3C7' : '#aaaaaa' }} />
@@ -295,6 +343,13 @@ const MainMenuDrawer = ({
                         <ListItemText primary={t('auth.logout')} primaryTypographyProps={{ color: themeMode === 'light' ? '#D32F2F' : '#FF8A80', fontWeight: 500 }} />
                     </ListItemButton>
                 </List>
+                <input
+                    ref={fileInputRef}
+                    type="file"
+                    accept="application/json,.json"
+                    style={{ display: 'none' }}
+                    onChange={handleFileChange}
+                />
             </Box>
         </Drawer>
     );
````

````diff
diff --git a/src/components/BubblesDialogs.jsx b/src/components/BubblesDialogs.jsx
index 8a74697..f13858a 100644
--- a/src/components/BubblesDialogs.jsx
+++ b/src/components/BubblesDialogs.jsx
@@ -11,11 +11,13 @@ import FontSettingsDialog from './FontSettingsDialog';
 import AppearanceDialog from './AppearanceDialog';
 import ChangePasswordDialog from './ChangePasswordDialog';
 import LogoutConfirmDialog from './LogoutConfirmDialog';
+import BackupDialog from './BackupDialog';
 import TaskListDrawer from './ListViewDrawer';
 import { useBubblesData } from '../state/BubblesDataStore';
 import { useBubblesUi } from '../state/BubblesUiStore';
 import { COLOR_PALETTE } from '../hooks/tagColors';
 import { useThisDevice } from '../hooks/useThisDevice';
+import { useBackup } from '../hooks/useBackup';
 
 /**
  * Presentational container for all of BubblesPage's dialogs and drawers.
@@ -81,6 +83,8 @@ const BubblesDialogs = ({
     };
     // This browser's reminders switch in the main menu (spec 8.9)
     const thisDevice = useThisDevice(uid);
+    // Backup export and import of the main menu (spec 10)
+    const backup = useBackup(uid);
     const {
         bubbles,
         tags,
@@ -241,6 +245,17 @@ const BubblesDialogs = ({
                 onLogout={handleLogout}
                 thisDevice={thisDevice.device}
                 onToggleThisDeviceReminders={thisDevice.setNotificationsEnabled}
+                onExportBackup={backup.exportBackup}
+                onImportBackupFile={backup.importFile}
+            />
+
+            <BackupDialog
+                state={backup.state}
+                onConfirm={backup.confirmImport}
+                onClose={backup.close}
+                isMobile={isMobile}
+                getDialogPaperStyles={getDialogPaperStyles}
+                t={t}
             />
 
             <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} t={t} />
````

Числа в подписях — переменные `tasks`/`categories`/`n`, не `count`: формы множественного числа не нужны.

````diff
diff --git a/src/locales/en/translation.json b/src/locales/en/translation.json
index 76b8685..46f328e 100644
--- a/src/locales/en/translation.json
+++ b/src/locales/en/translation.json
@@ -299,5 +299,25 @@
             "link": "Link",
             "enterUrl": "Enter URL:"
         }
+    },
+    "backup": {
+        "export": "Export backup",
+        "import": "Import backup",
+        "title": "Backup",
+        "replace": "The backup replaces all your tasks and categories.",
+        "inBackup": "In the backup — tasks: {{tasks}}, categories: {{categories}}.",
+        "toDelete": "Not in the backup and will be deleted — tasks: {{tasks}}, categories: {{categories}}.",
+        "settings": "The settings from the backup replace yours.",
+        "oldFormat": "This backup is from the old version: reminders and repeats are rounded up to whole hours, and formatting the editor does not keep becomes plain text.",
+        "confirm": "Import",
+        "writing": "Saving: {{done}} of {{total}}",
+        "done": "The backup has been imported.",
+        "notJson": "This file is not a backup: it is not JSON. Nothing was changed.",
+        "notBackup": "This file is not a backup of this app. Nothing was changed.",
+        "unsupported": "This version of the backup is not supported. Nothing was changed.",
+        "invalid": "Records in the backup that cannot be read: {{n}}. Nothing was changed.",
+        "readFailed": "Your current data could not be read. Nothing was changed.",
+        "writeFailed": "The import stopped: {{done}} of {{total}} changes are saved. Import the same file again to finish.",
+        "exportFailed": "The backup could not be exported."
     }
 }
````

````diff
diff --git a/src/locales/uk/translation.json b/src/locales/uk/translation.json
index db6f482..77d3386 100644
--- a/src/locales/uk/translation.json
+++ b/src/locales/uk/translation.json
@@ -306,5 +306,25 @@
             "link": "Посилання",
             "enterUrl": "Введіть URL:"
         }
+    },
+    "backup": {
+        "export": "Експорт резервної копії",
+        "import": "Імпорт резервної копії",
+        "title": "Резервна копія",
+        "replace": "Резервна копія замінює всі ваші завдання й категорії.",
+        "inBackup": "У резервній копії — завдань: {{tasks}}, категорій: {{categories}}.",
+        "toDelete": "Немає в резервній копії й буде видалено — завдань: {{tasks}}, категорій: {{categories}}.",
+        "settings": "Налаштування з резервної копії замінять ваші.",
+        "oldFormat": "Це резервна копія старої версії: нагадування й повтори округлюються вгору до цілих годин, а форматування, якого не підтримує редактор, стає звичайним текстом.",
+        "confirm": "Імпортувати",
+        "writing": "Збереження: {{done}} з {{total}}",
+        "done": "Резервну копію імпортовано.",
+        "notJson": "Цей файл не є резервною копією: це не JSON. Нічого не змінено.",
+        "notBackup": "Цей файл не є резервною копією цього застосунку. Нічого не змінено.",
+        "unsupported": "Ця версія резервної копії не підтримується. Нічого не змінено.",
+        "invalid": "Записів у резервній копії, які не вдається прочитати: {{n}}. Нічого не змінено.",
+        "readFailed": "Не вдалося прочитати ваші поточні дані. Нічого не змінено.",
+        "writeFailed": "Імпорт зупинився: збережено {{done}} з {{total}} змін. Імпортуйте той самий файл ще раз, щоб завершити.",
+        "exportFailed": "Не вдалося експортувати резервну копію."
     }
 }
````

- [ ] **Step 5: Тесты проходят**

Run: `npx vitest run src/components/MainMenuDrawer.test.jsx src/components/BackupDialog.test.jsx src/hooks/useBackup.test.jsx`
Expected: PASS — `Test Files  3 passed (3)`, `Tests  22 passed (22)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  58 passed (58)`, `Tests  626 passed (626)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/components/BackupDialog.jsx src/components/BackupDialog.test.jsx src/components/BubblesDialogs.jsx src/components/MainMenuDrawer.jsx src/components/MainMenuDrawer.test.jsx src/hooks/useBackup.js src/hooks/useBackup.test.jsx src/locales/en/translation.json src/locales/uk/translation.json src/utils/saveJsonFile.js
git commit -F - <<'EOF'
feat(backup): "Export backup" and "Import backup" in the main menu

The main menu gets the backup back (spec 10): the export saves the v2 file of
all the user's data, named by the date and time; the import reads the chosen
file, checks it whole before anything is read or written (not JSON, not a
backup, another version, records that cannot be read: nothing changes and the
dialog says why), shows the numbers of the backup and of what will be deleted,
says what a backup of the old version loses, and after the confirmation saves
it in batches with a progress bar. A failed batch tells how many changes are
saved and that importing the same file again finishes the job (#92). Nothing
reloads the page (#101).
EOF
```

---

### Task 4: Перенос: старые данные, предпросмотр и запись

**Files:**
- Create: `src/services/data/migration.js`
- Test: `src/services/data/migration.test.js`, `firestore-tests/migration.data.test.js`

**Interfaces:**
- Consumes: `mapTaskV1`, `mapCategoriesV1` (подплан 0.1); `commitInBatches` (задача 2); `newCategoryData`, `restoredTaskData`, `newUserDocData`, `settingsUpdateData` (подплан 0.4).
- Produces: `readV1Data(db, uid) → { bubbles: [{ id, ...поля }], tags }` (`user-bubbles/{uid}/bubbles`, `user-tags/{uid}.tags`); `migrationNeeded(userData | null, v1) → boolean`; `checkMigration(db, uid) → v1 | null`; `planMigration(v1, ctx = { now, timeZone, language }) → { categories, tasks, preview }`, где `preview = { tasks, categories, rounded: [{ id, title }], lostFormatting, changed, recolored: [{ id, name }], skipped: { tasks, categories } }`; `filtersAfterMigration(settings, categoryIds) → { bubbleFilter?, listFilter? }`; `runMigration(db, uid, plan, settings, onProgress)` — записывает то, чего нет в `users/{uid}`, затем метку (и создаёт `users/{uid}` с `settings`, если первого входа не хватило).

- [ ] **Step 1: Написать падающие тесты**

Файл `src/services/data/migration.test.js`:

````js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fixtures from '../../../contract/fixtures/migration-v1.json';
import { filtersAfterMigration, migrationNeeded, planMigration } from './migration';
import { createDefaultSettings } from '../../contract/schema';

const ctx = { now: new Date(fixtures.context.now), timeZone: fixtures.context.timeZone, language: fixtures.context.language };
const v1 = { bubbles: fixtures.tasks.map((t) => t.v1), tags: fixtures.categories.v1 };
const titleOf = (id) => fixtures.tasks.find((t) => t.expected && t.expected.id === id).expected.title;

describe('migrationNeeded (spec 9.1)', () => {
    it.each([
        ['no user document yet, v1 tasks', null, { bubbles: [{ id: 'a1' }], tags: [] }, true],
        ['no marker, only v1 categories', { settings: {} }, { bubbles: [], tags: [{ id: 'c1' }] }, true],
        ['the marker is there', { settings: {}, migration: { tasks: 1, categories: 0 } }, { bubbles: [{ id: 'a1' }], tags: [] }, false],
        ['nothing in v1', { settings: {} }, { bubbles: [], tags: [] }, false],
    ])('%s -> %s', (_, userData, data, expected) => {
        expect(migrationNeeded(userData, data)).toBe(expected);
    });
});

describe('planMigration: what the move writes and what the preview shows (spec 9.1, 9.2)', () => {
    const plan = planMigration(v1, ctx);

    it('maps the records by the rules of 9.2', () => {
        expect(plan.categories).toEqual(fixtures.categories.expected);
        expect(plan.tasks).toEqual(fixtures.tasks.filter((t) => t.expected).map((t) => t.expected));
    });

    it('lists what changes and what is skipped', () => {
        expect(plan.preview).toEqual({
            tasks: 8,
            categories: 4,
            rounded: [{ id: 'a1', title: titleOf('a1') }],
            lostFormatting: [{ id: 'a6', title: titleOf('a6') }],
            changed: [{ id: 'a7', title: titleOf('a7') }],
            recolored: [{ id: 'c2', name: 'Work' }, { id: 'c4', name: 'Misc' }],
            skipped: { tasks: 1, categories: 1 },
        });
    });

    it('counts a category beyond the 20 palette colours as skipped', () => {
        const tags = Array.from({ length: 21 }, (_, i) => ({ id: `t${i}`, name: `N${i}`, color: '#000000' }));
        const { preview } = planMigration({ bubbles: [], tags }, ctx);
        expect(preview.categories).toBe(20);
        expect(preview.skipped).toEqual({ tasks: 0, categories: 1 });
    });
});

describe('filtersAfterMigration: "all categories" of v1 becomes null', () => {
    const settings = createDefaultSettings('en');
    const ids = ['c1', 'c2', 'c3'];

    it('writes null for a filter that lists every moved category, in any order', () => {
        expect(filtersAfterMigration({
            ...settings,
            bubbleFilter: { ...settings.bubbleFilter, categoryIds: ['c3', 'c1', 'c2'] },
            listFilter: { ...settings.listFilter, categoryIds: ['c1', 'c2', 'c3'] },
        }, ids)).toEqual({
            bubbleFilter: { ...settings.bubbleFilter, categoryIds: null },
            listFilter: { ...settings.listFilter, categoryIds: null },
        });
    });

    it('keeps a choice of some categories, and a filter that is null already', () => {
        expect(filtersAfterMigration({ ...settings, bubbleFilter: { ...settings.bubbleFilter, categoryIds: ['c1'] } }, ids)).toEqual({});
    });

    it('keeps an empty choice when nothing was moved', () => {
        expect(filtersAfterMigration({ ...settings, listFilter: { ...settings.listFilter, categoryIds: [] } }, [])).toEqual({});
    });
});
````

Файл `firestore-tests/migration.data.test.js`:

````js
// @vitest-environment happy-dom
/**
 * The move from the v1 collections (src/services/data/migration.js) against the emulator with
 * the real firestore.rules (spec 9.1): the writes are ones the rules accept, the v1 collections
 * stay as they are, and a second run skips what the first one wrote.
 */
import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { Timestamp, collection, doc, getDoc, getDocs } from 'firebase/firestore';
import fixtures from '../contract/fixtures/migration-v1.json';
import { OWNER, baseTask, seed, setupRulesEnv, userDocWith } from './helpers';
import { checkMigration, planMigration, readV1Data, runMigration } from '../src/services/data/migration';
import { createDefaultSettings } from '../src/contract/schema';

let env;

beforeAll(async () => { env = await setupRulesEnv(); });
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

const device = () => env.authenticatedContext(OWNER).firestore();
const ctx = { now: new Date(fixtures.context.now), timeZone: fixtures.context.timeZone, language: fixtures.context.language };
const v1Task = (id) => fixtures.tasks.find((t) => t.v1.id === id);
const SETTINGS = createDefaultSettings('uk');

const seedV1 = async () => {
    await seed(env, `user-bubbles/${OWNER}/bubbles/a1`, v1Task('a1').v1);
    await seed(env, `user-bubbles/${OWNER}/bubbles/a5`, v1Task('a5').v1);
    await seed(env, `user-tags/${OWNER}`, { tags: [{ id: 'c1', name: 'Home', color: '#da3833' }, { id: 'c2', name: 'Work', color: '#ee603c' }] });
};

const readAll = async (db, name) => {
    const snapshot = await getDocs(collection(db, `users/${OWNER}/${name}`));
    return Object.fromEntries(snapshot.docs.map((d) => [d.id, d.data()]));
};

const migrate = async (db, settings = SETTINGS) => {
    const v1 = await checkMigration(db, OWNER);
    expect(v1).not.toBeNull();
    await runMigration(db, OWNER, planMigration(v1, ctx), settings);
};

describe('migration from v1 (spec 9.1)', () => {
    it('moves the tasks and the categories with their own times and leaves v1 as it is', async () => {
        await seedV1();
        await seed(env, `users/${OWNER}`, userDocWith({
            ...SETTINGS,
            bubbleFilter: { ...SETTINGS.bubbleFilter, categoryIds: ['c2', 'c1'] },
            listFilter: { ...SETTINGS.listFilter, categoryIds: ['c1'] },
        }));
        const db = device();
        await migrate(db);

        const tasks = await readAll(db, 'tasks');
        expect(Object.keys(tasks).sort()).toEqual(['a1', 'a5']);
        const { id, createdAt, updatedAt, ...fields } = v1Task('a1').expected;
        expect(tasks.a1).toMatchObject({
            ...fields,
            schemaVersion: 2,
            overdueAt: null,
            createdAt: Timestamp.fromMillis(Date.parse(createdAt)),
            updatedAt: Timestamp.fromMillis(Date.parse(updatedAt)),
        });
        expect(tasks.a1).not.toHaveProperty('nextNotifyAt');
        const categories = await readAll(db, 'categories');
        expect(categories.c1).toMatchObject({ name: 'Home', color: '#da3833', order: 1 });
        expect(categories.c2).toMatchObject({ name: 'Work', color: '#ee603c', order: 2 });

        const user = (await getDoc(doc(db, `users/${OWNER}`))).data();
        expect(user.migration).toMatchObject({ tasks: 2, categories: 2 });
        expect(user.migration.fromV1At).toBeInstanceOf(Timestamp);
        expect(user.settings.bubbleFilter.categoryIds).toBeNull();
        expect(user.settings.listFilter.categoryIds).toEqual(['c1']);
        expect(await checkMigration(db, OWNER)).toBeNull();

        const v1 = await readV1Data(db, OWNER);
        expect(v1.bubbles.map((b) => b.id).sort()).toEqual(['a1', 'a5']);
        expect(v1.tags).toHaveLength(2);
    });

    it('run again after an interruption, writes only what is missing', async () => {
        await seedV1();
        await seed(env, `users/${OWNER}`, userDocWith(SETTINGS));
        await seed(env, `users/${OWNER}/tasks/a1`, baseTask({ title: 'Moved by the first run, edited since' }));
        const db = device();
        await migrate(db);

        const tasks = await readAll(db, 'tasks');
        expect(tasks.a1.title).toBe('Moved by the first run, edited since');
        expect(tasks.a5.title).toBe(v1Task('a5').expected.title);
        expect((await getDoc(doc(db, `users/${OWNER}`))).data().migration).toMatchObject({ tasks: 2, categories: 2 });
    });

    it('creates users/{uid} with these settings when the first sign-in could not', async () => {
        await seedV1();
        const db = device();
        await migrate(db, { ...SETTINGS, themeMode: 'dark' });

        const user = (await getDoc(doc(db, `users/${OWNER}`))).data();
        expect(user).toMatchObject({ schemaVersion: 2, settings: { themeMode: 'dark' }, migration: { tasks: 2, categories: 2 } });
        expect(Object.keys(await readAll(db, 'tasks'))).toHaveLength(2);
    });

    it('finds nothing to move for a user without v1 data', async () => {
        expect(await readV1Data(device(), OWNER)).toEqual({ bubbles: [], tags: [] });
        expect(await checkMigration(device(), OWNER)).toBeNull();
    });
});
````

- [ ] **Step 2: Тест падает**

Run: `npx vitest run src/services/data/migration.test.js`
Expected: FAIL — `Test Files  1 failed (1)`, `Tests  no tests`; `Error: Failed to resolve import "./migration" from "src/services/data/migration.test.js". Does the file exist?`.

- [ ] **Step 3: `migration.js`**

Предпросмотр, кроме списков раздела 9.1, показывает задачи, у которых теряется срок, напоминание или часть текста (`changed`): нечитаемая дата, больше 10 напоминаний, слишком длинные название или описание. Фильтр v1 «все категории» хранился списком всех id — после переноса он становится `null`, иначе новые категории в фильтр не попадут (передача из 0.4).

Файл `src/services/data/migration.js`:

````js
/**
 * The one-time move from the v1 collections to users/{uid} (spec section 9). It reads
 * user-bubbles/{uid}/bubbles and user-tags/{uid}, which stay as they are, maps them by the rules
 * of 9.2, and writes the categories and tasks users/{uid} does not have yet, with their own times,
 * in batches of at most 450. The marker users/{uid}.migration goes last, so a move cut short runs
 * again at the next sign-in and writes only what is missing (spec 9.1).
 */
import { collection, doc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { mapCategoriesV1, mapTaskV1 } from '../../contract/migrateV1';
import { commitInBatches } from './backup';
import { newCategoryData, newUserDocData, restoredTaskData, settingsUpdateData } from './convert';

/** The v1 data of uid: { bubbles: [{ id, ...fields }], tags: [{ id, name, color }] }. */
export const readV1Data = async (db, uid) => {
    const [bubbles, tags] = await Promise.all([
        getDocs(collection(db, 'user-bubbles', uid, 'bubbles')),
        getDoc(doc(db, 'user-tags', uid)),
    ]);
    const tagList = tags.exists() ? tags.data().tags : null;
    return {
        bubbles: bubbles.docs.map((d) => ({ ...d.data(), id: d.id })),
        tags: Array.isArray(tagList) ? tagList : [],
    };
};

/** Spec 9.1: the move runs while users/{uid}.migration is missing and v1 holds data. userData: users/{uid} or null. */
export const migrationNeeded = (userData, v1) => !(userData && userData.migration)
    && (v1.bubbles.length > 0 || v1.tags.length > 0);

/** The v1 data to move, or null when there is nothing to move (spec 9.1). */
export const checkMigration = async (db, uid) => {
    const [user, v1] = await Promise.all([getDoc(doc(db, 'users', uid)), readV1Data(db, uid)]);
    return migrationNeeded(user.exists() ? user.data() : null, v1) ? v1 : null;
};

// Notes of mapTaskV1 that the preview lists (spec 9.1).
const ROUNDED = ['reminders-rounded', 'repeat-rounded'];
const CHANGED = ['due-dropped', 'reminder-dropped', 'reminders-truncated', 'repeat-dropped', 'title-truncated',
    'description-truncated'];

/**
 * What the move writes, and its preview (spec 9.1). Pure. ctx = { now, timeZone, language }.
 * preview = { tasks, categories, rounded: [{ id, title }], lostFormatting: [...], changed: [...],
 * recolored: [{ id, name }], skipped: { tasks, categories } }.
 */
export const planMigration = (v1, ctx) => {
    const { categories, notes } = mapCategoriesV1(v1.tags);
    const categoryIds = new Set(categories.map((c) => c.id));
    const mapped = v1.bubbles.map((bubble) => mapTaskV1(bubble, { ...ctx, categoryIds }));
    const tasks = mapped.filter((m) => m.task !== null).map((m) => m.task);
    const withNote = (codes) => mapped
        .filter((m) => m.task !== null && m.notes.some((code) => codes.includes(code)))
        .map(({ task }) => ({ id: task.id, title: task.title }));
    const names = new Map(categories.map((c) => [c.id, c.name]));
    return {
        categories,
        tasks,
        preview: {
            tasks: tasks.length,
            categories: categories.length,
            rounded: withNote(ROUNDED),
            lostFormatting: withNote(['formatting-lost']),
            changed: withNote(CHANGED),
            recolored: notes.filter((n) => n.code === 'color-changed').map((n) => ({ id: n.id, name: names.get(n.id) })),
            skipped: {
                tasks: mapped.length - tasks.length,
                categories: notes.filter((n) => n.code === 'invalid-record' || n.code === 'category-dropped').length,
            },
        },
    };
};

const sameIds = (list, ids) => Array.isArray(list) && list.length > 0 && list.length === ids.length
    && ids.every((id) => list.includes(id));

/**
 * The settings that change after the move: v1 kept "all categories" as the list of every one of
 * them (settingsFromLocalStorage keeps that list); once the categories are moved, such a list is
 * null, so the categories made later show too. Returns { bubbleFilter?, listFilter? }.
 */
export const filtersAfterMigration = (settings, categoryIds) => {
    const changes = {};
    ['bubbleFilter', 'listFilter'].forEach((key) => {
        if (sameIds(settings[key].categoryIds, categoryIds)) changes[key] = { ...settings[key], categoryIds: null };
    });
    return changes;
};

/**
 * Writes the move (spec 9.1): what users/{uid} lacks, then the marker with the "all categories"
 * filters as null. settings are the app's settings, used when users/{uid} does not exist yet
 * (the first sign-in could not create it). onProgress(done, total) as in commitInBatches.
 */
export const runMigration = async (db, uid, plan, settings, onProgress) => {
    const [categoryDocs, taskDocs, user] = await Promise.all([
        getDocs(collection(db, 'users', uid, 'categories')),
        getDocs(collection(db, 'users', uid, 'tasks')),
        getDoc(doc(db, 'users', uid)),
    ]);
    const haveCategories = new Set(categoryDocs.docs.map((d) => d.id));
    const haveTasks = new Set(taskDocs.docs.map((d) => d.id));
    const writes = [
        ...plan.categories.filter((c) => !haveCategories.has(c.id)).map(({ id, name, color, order }) => (
            { type: 'set', path: ['categories', id], data: newCategoryData({ name, color, order }) })),
        ...plan.tasks.filter((t) => !haveTasks.has(t.id)).map((task) => (
            { type: 'set', path: ['tasks', task.id], data: restoredTaskData(task) })),
    ];
    const migration = { fromV1At: serverTimestamp(), tasks: plan.tasks.length, categories: plan.categories.length };
    const categoryIds = plan.categories.map((c) => c.id);
    if (user.exists()) {
        const filters = filtersAfterMigration(user.data().settings, categoryIds);
        writes.push({ type: 'update', path: [], data: { ...settingsUpdateData(filters), migration } });
    } else {
        const filters = filtersAfterMigration(settings, categoryIds);
        writes.push({ type: 'set', path: [], data: { ...newUserDocData({ ...settings, ...filters }), migration } });
    }
    await commitInBatches(db, uid, writes, onProgress);
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run src/services/data/migration.test.js`
Expected: PASS — `Tests  10 passed (10)`.

- [ ] **Step 5: Эмулятор**

Run: `npm run test:rules`
Expected: `Test Files  12 passed (12)`, `Tests  122 passed (122)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  59 passed (59)`, `Tests  636 passed (636)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add firestore-tests/migration.data.test.js src/services/data/migration.js src/services/data/migration.test.js
git commit -F - <<'EOF'
feat(migration): the move from the v1 collections, its preview and its marker

services/data/migration.js reads user-bubbles/{uid}/bubbles and user-tags/{uid}
(left as they are) while users/{uid}.migration is missing (spec 9.1), maps
them by the rules of 9.2, and lists for the preview what is rounded to whole
hours, what loses formatting or a due, which categories change colour and
how many records are skipped. The move writes only the categories and tasks
users/{uid} lacks, with their own times, in batches of at most 450, and the
marker last, so a move cut short runs again and writes only what is missing.
A filter that listed every v1 category becomes null (all categories), and
users/{uid} is created with the app's settings when the first sign-in could
not create it.
EOF
```

---

### Task 5: Перенос: окно перед приложением

**Files:**
- Create: `src/hooks/useMigration.js`, `src/components/MigrationDialog.jsx`, `src/components/MigrationGate.jsx`
- Test: `src/components/MigrationDialog.test.jsx`, `src/components/MigrationGate.test.jsx`
- Modify: `src/App.jsx`, `src/locales/en/translation.json`, `src/locales/uk/translation.json`

**Interfaces:**
- Consumes: `checkMigration`, `planMigration`, `runMigration` (задача 4); `deviceTimeZone()`; `logoutUser()` (`src/services/authService.js`).
- Produces: `useMigration(uid, settings) → { state, move(), retry() }`, где `state` — `{ step: 'checking' }` | `{ step: 'preview', preview }` | `{ step: 'moving', done, total }` | `{ step: 'error', error: ключ перевода }` | `{ step: 'ready' }`; `<MigrationDialog state onMove onPostpone onRetry t />` — окно нельзя закрыть, только перенести или отложить; `<MigrationGate uid settings>…</MigrationGate>` — приложение показывается в `ready`, «Отложить» — `logoutUser()`; ключи `migration.{title,intro,counts,rounded,lostFormatting,changed,recolored,skipped,postponeHint,move,postpone,moving,checkFailed,moveFailed,retry}`.

- [ ] **Step 1: Написать падающие тесты**

Файл `src/components/MigrationDialog.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MigrationDialog from './MigrationDialog';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const t = (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key);
const PREVIEW = {
    tasks: 8,
    categories: 4,
    rounded: [{ id: 'a1', title: 'Pay bills' }],
    lostFormatting: [{ id: 'a6', title: 'Shopping notes' }],
    changed: [{ id: 'a7', title: 'Broken date' }],
    recolored: [{ id: 'c2', name: 'Work' }],
    skipped: { tasks: 1, categories: 1 },
};
const QUIET = { ...PREVIEW, rounded: [], lostFormatting: [], changed: [], recolored: [], skipped: { tasks: 0, categories: 0 } };

describe('MigrationDialog: the preview of the move (spec 9.1)', () => {
    let container;
    let root;
    let handlers;

    const render = (state) => act(() => root.render(<MigrationDialog state={state} {...handlers} t={t} />));
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);

    beforeEach(() => {
        handlers = { onMove: vi.fn(), onPostpone: vi.fn(), onRetry: vi.fn() };
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows the numbers and what changes, then moves on "Move"', () => {
        render({ step: 'preview', preview: PREVIEW });
        const text = document.body.textContent;
        [
            'migration.intro', 'migration.counts {"tasks":8,"categories":4}',
            'migration.rounded', 'Pay bills', 'migration.lostFormatting', 'Shopping notes',
            'migration.changed', 'Broken date', 'migration.recolored', 'Work',
            'migration.skipped {"tasks":1,"categories":1}', 'migration.postponeHint',
        ].forEach((part) => expect(text).toContain(part));
        act(() => button('migration.move').click());
        expect(handlers.onMove).toHaveBeenCalledTimes(1);
    });

    it('leaves out the lists that are empty', () => {
        render({ step: 'preview', preview: QUIET });
        const text = document.body.textContent;
        ['migration.rounded', 'migration.lostFormatting', 'migration.changed', 'migration.recolored', 'migration.skipped']
            .forEach((part) => expect(text).not.toContain(part));
    });

    it('postpones: signs out and writes nothing', () => {
        render({ step: 'preview', preview: QUIET });
        act(() => button('migration.postpone').click());
        expect(handlers.onPostpone).toHaveBeenCalledTimes(1);
        expect(handlers.onMove).not.toHaveBeenCalled();
    });

    it('shows the progress and offers no way out while moving', () => {
        render({ step: 'moving', done: 450, total: 900 });
        expect(document.body.textContent).toContain('migration.moving {"done":450,"total":900}');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
        expect(document.querySelectorAll('button')).toHaveLength(0);
    });

    it('says what went wrong and tries again or postpones', () => {
        render({ step: 'error', error: 'migration.moveFailed' });
        expect(document.body.textContent).toContain('migration.moveFailed');
        act(() => button('migration.retry').click());
        expect(handlers.onRetry).toHaveBeenCalledTimes(1);
        act(() => button('migration.postpone').click());
        expect(handlers.onPostpone).toHaveBeenCalledTimes(1);
    });
});
````

«Ворота» — с настоящими хуком и разбором старых данных; подменены только чтение и запись Firestore и выход:

Файл `src/components/MigrationGate.test.jsx`:

````jsx
// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkMigration, runMigration } from '../services/data/migration';
import { logoutUser } from '../services/authService';
import { createDefaultSettings } from '../contract/schema';
import MigrationGate from './MigrationGate';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../firebase', () => ({ db: 'db' }));
vi.mock('../services/data/migration', async (importOriginal) => ({
    ...(await importOriginal()),
    checkMigration: vi.fn(),
    runMigration: vi.fn(),
}));
vi.mock('../services/authService', () => ({ logoutUser: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key, values) => (values ? `${key} ${JSON.stringify(values)}` : key) }),
}));

const SETTINGS = createDefaultSettings('uk');
// One v1 task with a 15-minute reminder, which the move rounds to an hour (spec 9.2).
const V1 = {
    bubbles: [{ id: 'a1', title: 'Pay bills', status: 'active', dueDate: '2026-11-02T09:00', tz: 'Europe/Kyiv', notifications: ['15m'] }],
    tags: [],
};

describe('MigrationGate: the app waits for the move from v1 (spec 9.1)', () => {
    let container;
    let root;

    const mount = async () => {
        await act(async () => root.render(<MigrationGate uid="u1" settings={SETTINGS}><p>the app</p></MigrationGate>));
    };
    const button = (text) => Array.from(document.querySelectorAll('button')).find((el) => el.textContent === text);
    const text = () => document.body.textContent;

    beforeEach(() => {
        vi.resetAllMocks();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    it('shows the app at once when there is nothing to move', async () => {
        checkMigration.mockResolvedValue(null);
        await mount();
        expect(checkMigration).toHaveBeenCalledWith('db', 'u1');
        expect(text()).toContain('the app');
    });

    it('holds the app back while it checks', async () => {
        checkMigration.mockReturnValue(new Promise(() => {}));
        await mount();
        expect(text()).not.toContain('the app');
        expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it('shows the preview and moves on "Move", then shows the app', async () => {
        checkMigration.mockResolvedValue(V1);
        runMigration.mockResolvedValue(undefined);
        await mount();
        expect(text()).not.toContain('the app');
        expect(text()).toContain('migration.counts {"tasks":1,"categories":0}');
        expect(text()).toContain('Pay bills');
        await act(async () => button('migration.move').click());
        expect(runMigration).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({
            tasks: [expect.objectContaining({ id: 'a1', reminders: [60] })],
        }), SETTINGS, expect.any(Function));
        expect(text()).toContain('the app');
    });

    it('shows the progress of the move', async () => {
        checkMigration.mockResolvedValue(V1);
        let progress;
        runMigration.mockImplementation((db, uid, plan, settings, onProgress) => {
            progress = onProgress;
            return new Promise(() => {});
        });
        await mount();
        await act(async () => button('migration.move').click());
        act(() => progress(1, 2));
        expect(text()).toContain('migration.moving {"done":1,"total":2}');
    });

    it('signs out on "Postpone" and writes nothing', async () => {
        checkMigration.mockResolvedValue(V1);
        await mount();
        await act(async () => button('migration.postpone').click());
        expect(logoutUser).toHaveBeenCalledTimes(1);
        expect(runMigration).not.toHaveBeenCalled();
    });

    it('says when the move stops, and "Try again" picks it up', async () => {
        checkMigration.mockResolvedValue(V1);
        runMigration.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(undefined);
        await mount();
        await act(async () => button('migration.move').click());
        expect(text()).toContain('migration.moveFailed');
        await act(async () => button('migration.retry').click());
        expect(checkMigration).toHaveBeenCalledTimes(2);
        await act(async () => button('migration.move').click());
        expect(text()).toContain('the app');
    });

    it('says when the old data cannot be read, and tries again', async () => {
        checkMigration.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce(null);
        await mount();
        expect(text()).toContain('migration.checkFailed');
        await act(async () => button('migration.retry').click());
        expect(text()).toContain('the app');
    });
});
````

- [ ] **Step 2: Тесты падают**

Run: `npx vitest run src/components/MigrationDialog.test.jsx src/components/MigrationGate.test.jsx`
Expected: FAIL — `Test Files  2 failed (2)`, `Tests  no tests`; `Error: Failed to resolve import "./MigrationDialog" from "src/components/MigrationDialog.test.jsx". Does the file exist?` и `Error: Failed to resolve import "./MigrationGate" from "src/components/MigrationGate.test.jsx". Does the file exist?`.

- [ ] **Step 3: Хук, окно и «ворота»**

Файл `src/hooks/useMigration.js`:

````js
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../firebase';
import { deviceTimeZone } from '../contract/time';
import { checkMigration, planMigration, runMigration } from '../services/data/migration';
import logger from '../utils/logger';

/**
 * The move from v1 for the signed-in user (spec 9.1). state: { step: 'checking' } |
 * { step: 'preview', preview } | { step: 'moving', done, total } | { step: 'error', error: i18n key } |
 * { step: 'ready' }. settings are the app's: their language names untitled tasks, and they seed
 * users/{uid} if the first sign-in could not create it.
 */
export function useMigration(uid, settings) {
    const [state, setState] = useState({ step: 'checking' });
    const plan = useRef(null);
    const latestSettings = useRef(settings);
    latestSettings.current = settings;

    const check = useCallback(async () => {
        setState({ step: 'checking' });
        try {
            const v1 = await checkMigration(db, uid);
            if (!v1) {
                setState({ step: 'ready' });
                return;
            }
            plan.current = planMigration(v1, {
                now: new Date(),
                timeZone: deviceTimeZone(),
                language: latestSettings.current.language,
            });
            setState({ step: 'preview', preview: plan.current.preview });
        } catch (e) {
            logger.error('Could not read the data to move from v1:', e);
            setState({ step: 'error', error: 'migration.checkFailed' });
        }
    }, [uid]);

    useEffect(() => {
        check();
    }, [check]);

    const move = useCallback(async () => {
        const current = plan.current;
        setState({ step: 'moving', done: 0, total: current.tasks.length + current.categories.length + 1 });
        try {
            await runMigration(db, uid, current, latestSettings.current, (done, total) => setState({ step: 'moving', done, total }));
            setState({ step: 'ready' });
        } catch (e) {
            logger.error('The move from v1 stopped:', e);
            setState({ step: 'error', error: 'migration.moveFailed' });
        }
    }, [uid]);

    return { state, move, retry: check };
}
````

Файл `src/components/MigrationDialog.jsx`:

````jsx
import React from 'react';
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, List, ListItem, Typography,
    useMediaQuery, useTheme,
} from '@mui/material';

const Section = ({ title, items }) => (items.length === 0 ? null : (
    <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <List dense disablePadding>
            {items.map((item) => <ListItem key={item.id} sx={{ py: 0 }}>{item.title ?? item.name}</ListItem>)}
        </List>
    </Box>
));

/**
 * The move from v1 (spec 9.1): the preview before anything is written, the progress, the errors.
 * state comes from useMigration; the dialog cannot be dismissed, only moved or postponed.
 */
const MigrationDialog = ({ state, onMove, onPostpone, onRetry, t }) => {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const paper = theme.custom?.dialogPaper || { backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary };
    const { step, preview } = state;
    return (
        <Dialog open fullScreen={fullScreen} maxWidth="sm" fullWidth PaperProps={{ sx: { ...paper } }}>
            <DialogTitle sx={{ color: 'text.primary' }}>{t('migration.title')}</DialogTitle>
            <DialogContent>
                {step === 'preview' && (
                    <>
                        <Typography gutterBottom>{t('migration.intro')}</Typography>
                        <Typography gutterBottom>{t('migration.counts', { tasks: preview.tasks, categories: preview.categories })}</Typography>
                        <Section title={t('migration.rounded')} items={preview.rounded} />
                        <Section title={t('migration.lostFormatting')} items={preview.lostFormatting} />
                        <Section title={t('migration.changed')} items={preview.changed} />
                        <Section title={t('migration.recolored')} items={preview.recolored} />
                        {(preview.skipped.tasks > 0 || preview.skipped.categories > 0) && (
                            <Typography sx={{ mt: 2 }}>{t('migration.skipped', preview.skipped)}</Typography>
                        )}
                        <Typography color="text.secondary" sx={{ mt: 2 }}>{t('migration.postponeHint')}</Typography>
                    </>
                )}
                {step === 'moving' && (
                    <>
                        <Typography gutterBottom>{t('migration.moving', { done: state.done, total: state.total })}</Typography>
                        <LinearProgress variant="determinate" value={state.total > 0 ? (state.done / state.total) * 100 : 0} />
                    </>
                )}
                {step === 'error' && <Typography color="error">{t(state.error)}</Typography>}
            </DialogContent>
            {step !== 'moving' && (
                <DialogActions sx={{ padding: 3, gap: 2 }}>
                    <Button onClick={onPostpone} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>{t('migration.postpone')}</Button>
                    {step === 'preview' && (
                        <Button onClick={onMove} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('migration.move')}</Button>
                    )}
                    {step === 'error' && (
                        <Button onClick={onRetry} color="primary" variant="contained" sx={{ borderRadius: 2 }}>{t('migration.retry')}</Button>
                    )}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default MigrationDialog;
````

Файл `src/components/MigrationGate.jsx`:

````jsx
import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useMigration } from '../hooks/useMigration';
import { logoutUser } from '../services/authService';
import MigrationDialog from './MigrationDialog';

/**
 * Holds the signed-in app back until the move from v1 is done, or shows it at once when there is
 * nothing to move (spec 9.1). "Postpone" signs out: the preview shows again at the next sign-in.
 */
const MigrationGate = ({ uid, settings, children }) => {
    const { t } = useTranslation();
    const { state, move, retry } = useMigration(uid, settings);
    if (state.step === 'ready') return children;
    if (state.step === 'checking') {
        return (
            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: (theme) => theme.palette.background.bubbleView }}>
                <CircularProgress size={60} sx={{ color: 'white' }} />
            </Box>
        );
    }
    return <MigrationDialog state={state} onMove={move} onPostpone={() => logoutUser()} onRetry={retry} t={t} />;
};

export default MigrationGate;
````

- [ ] **Step 4: Приложение за «воротами» и переводы**

Перенос идёт раньше обоих экранов — пузырей и mindmap:

````diff
diff --git a/src/App.jsx b/src/App.jsx
index 315974e..ceb1393 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -5,6 +5,7 @@ import { Box, CircularProgress } from '@mui/material';
 import BubblesPage from './pages/BubblesPage';
 const MindMapPage = React.lazy(() => import('./pages/MindMapPage'));
 import AuthForm from './components/AuthForm';
+import MigrationGate from './components/MigrationGate';
 import { onAuthStateChange } from './services/authService';
 import { useThemeMode } from './hooks/useThemeMode';
 import i18n from './i18n';
@@ -81,36 +82,39 @@ function App() {
             <CssBaseline />
             {user ? (
                 <SettingsContext.Provider value={userSettings}>
-                    {screen === 'mindmap' ? (
-                        <React.Suspense fallback={
-                            <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.bubbleView }}>
-                                <CircularProgress size={60} sx={{ color: 'white' }} />
-                            </Box>
-                        }>
-                            <MindMapPage
-                                onBack={() => navigate('main')}
-                                themeMode={actualTheme}
-                            />
-                        </React.Suspense>
-                    ) : (
-                        <BubblesDataProvider>
-                            <BubblesUiProvider
-                                themeModeState={themeMode}
-                                setThemeMode={setThemeMode}
-                                design={design}
-                                setDesign={setDesign}
-                                designs={designs}
-                                toggleTheme={toggleTheme}
-                                themeToggleProps={{ themeMode, actualTheme }}
-                                onOpenMindMap={() => navigate('mindmap')}
-                            >
-                                <BubblesPage
-                                    user={user}
+                    {/* The move from v1 comes first (spec 9.1) */}
+                    <MigrationGate uid={user.uid} settings={settings}>
+                        {screen === 'mindmap' ? (
+                            <React.Suspense fallback={
+                                <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.palette.background.bubbleView }}>
+                                    <CircularProgress size={60} sx={{ color: 'white' }} />
+                                </Box>
+                            }>
+                                <MindMapPage
+                                    onBack={() => navigate('main')}
                                     themeMode={actualTheme}
                                 />
-                            </BubblesUiProvider>
-                        </BubblesDataProvider>
-                    )}
+                            </React.Suspense>
+                        ) : (
+                            <BubblesDataProvider>
+                                <BubblesUiProvider
+                                    themeModeState={themeMode}
+                                    setThemeMode={setThemeMode}
+                                    design={design}
+                                    setDesign={setDesign}
+                                    designs={designs}
+                                    toggleTheme={toggleTheme}
+                                    themeToggleProps={{ themeMode, actualTheme }}
+                                    onOpenMindMap={() => navigate('mindmap')}
+                                >
+                                    <BubblesPage
+                                        user={user}
+                                        themeMode={actualTheme}
+                                    />
+                                </BubblesUiProvider>
+                            </BubblesDataProvider>
+                        )}
+                    </MigrationGate>
                 </SettingsContext.Provider>
             ) : (
                 <AuthForm
````

````diff
diff --git a/src/locales/en/translation.json b/src/locales/en/translation.json
index 46f328e..01e2713 100644
--- a/src/locales/en/translation.json
+++ b/src/locales/en/translation.json
@@ -319,5 +319,22 @@
         "readFailed": "Your current data could not be read. Nothing was changed.",
         "writeFailed": "The import stopped: {{done}} of {{total}} changes are saved. Import the same file again to finish.",
         "exportFailed": "The backup could not be exported."
+    },
+    "migration": {
+        "title": "Move to the new version",
+        "intro": "The new version keeps your data in a new form. Your tasks and categories are moved once: nothing is written until you press “Move”, and the old data stays as it is.",
+        "counts": "To move — tasks: {{tasks}}, categories: {{categories}}.",
+        "rounded": "Reminders and repeats rounded up to whole hours:",
+        "lostFormatting": "Descriptions that lose formatting the new editor does not keep:",
+        "changed": "A due date, a reminder or a text that cannot be kept as it is:",
+        "recolored": "Categories that get another colour:",
+        "skipped": "Records that cannot be read are skipped — tasks: {{tasks}}, categories: {{categories}}.",
+        "postponeHint": "“Postpone” signs you out; this window shows again at the next sign-in.",
+        "move": "Move",
+        "postpone": "Postpone",
+        "moving": "Moving: {{done}} of {{total}}",
+        "checkFailed": "Your old data could not be read. Check the connection and try again.",
+        "moveFailed": "The move stopped. Try again: what is already moved is not written twice.",
+        "retry": "Try again"
     }
 }
````

````diff
diff --git a/src/locales/uk/translation.json b/src/locales/uk/translation.json
index 77d3386..d421ed6 100644
--- a/src/locales/uk/translation.json
+++ b/src/locales/uk/translation.json
@@ -326,5 +326,22 @@
         "readFailed": "Не вдалося прочитати ваші поточні дані. Нічого не змінено.",
         "writeFailed": "Імпорт зупинився: збережено {{done}} з {{total}} змін. Імпортуйте той самий файл ще раз, щоб завершити.",
         "exportFailed": "Не вдалося експортувати резервну копію."
+    },
+    "migration": {
+        "title": "Перенесення в нову версію",
+        "intro": "Нова версія зберігає дані в новому вигляді. Ваші завдання й категорії переносяться один раз: нічого не записується, доки ви не натиснете «Перенести», а старі дані залишаються як є.",
+        "counts": "Буде перенесено — завдань: {{tasks}}, категорій: {{categories}}.",
+        "rounded": "Нагадування й повтори, округлені вгору до цілих годин:",
+        "lostFormatting": "Описи, що втрачають форматування, якого не підтримує новий редактор:",
+        "changed": "Строк, нагадування або текст, які не вдається зберегти як є:",
+        "recolored": "Категорії, що отримають інший колір:",
+        "skipped": "Записи, які не вдається прочитати, буде пропущено — завдань: {{tasks}}, категорій: {{categories}}.",
+        "postponeHint": "«Відкласти» виходить з акаунта; це вікно з'явиться знову під час наступного входу.",
+        "move": "Перенести",
+        "postpone": "Відкласти",
+        "moving": "Перенесення: {{done}} з {{total}}",
+        "checkFailed": "Не вдалося прочитати ваші старі дані. Перевірте з'єднання й спробуйте ще раз.",
+        "moveFailed": "Перенесення зупинилося. Спробуйте ще раз: уже перенесене не запишеться вдруге.",
+        "retry": "Спробувати ще раз"
     }
 }
````

- [ ] **Step 5: Тесты проходят**

Run: `npx vitest run src/components/MigrationDialog.test.jsx src/components/MigrationGate.test.jsx`
Expected: PASS — `Test Files  2 passed (2)`, `Tests  12 passed (12)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  61 passed (61)`, `Tests  648 passed (648)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/MigrationDialog.jsx src/components/MigrationDialog.test.jsx src/components/MigrationGate.jsx src/components/MigrationGate.test.jsx src/hooks/useMigration.js src/locales/en/translation.json src/locales/uk/translation.json
git commit -F - <<'EOF'
feat(migration): the preview window before the app, "Move" and "Postpone"

After sign-in the app waits for the move from v1 (spec 9.1): with nothing to
move it shows at once; otherwise a window that cannot be dismissed shows the
numbers, the tasks whose reminders or repeat are rounded to whole hours, those
that lose formatting or a due, the categories that change colour and the
records skipped. "Move" writes with a progress bar and then opens the app;
"Postpone" signs out, and the window shows again at the next sign-in. When
the old data cannot be read or the move stops, the window says so and "Try
again" reads it again and moves only what is missing.
EOF
```

---

### Task 6: Первый вход: язык экрана входа и документ пользователя

**Files:**
- Modify: `src/services/data/settings.js`, `src/state/SettingsStore.jsx`
- Test: `src/state/SettingsStore.test.jsx`, `firestore-tests/settings.data.test.js`

**Interfaces:**
- Consumes: `ensureUserDoc`, `subscribeUserDoc` (подплан 0.4); `settingsFromLocalStorage(getItem, deviceLanguage)` (подплан 0.1); `i18n` (`src/i18n.js`).
- Produces: `subscribeUserDoc(db, uid, onSettings, onError)` слушает и изменения метаданных: `onSettings(settings)`, пока документ есть, и `onSettings(null, { fromCache })`, пока его нет (`fromCache: false` — это говорит сервер). `useUserSettings`: начальные настройки — `settingsFromLocalStorage(getItem, i18n.language)` (язык экрана входа; язык v1 из старого ключа этого браузера по-прежнему важнее); одно создание документа «в полёте» на пользователя; новая попытка, когда сервер говорит, что документа нет; доставка тех же настроек не перерисовывает приложение.

- [ ] **Step 1: Написать падающие тесты**

Тест «keeps the language this browser had in v1» проходит и до правки: он закрепляет, что старый ключ языка остаётся важнее экрана входа.

````diff
diff --git a/src/state/SettingsStore.test.jsx b/src/state/SettingsStore.test.jsx
index ddc680f..31e16cd 100644
--- a/src/state/SettingsStore.test.jsx
+++ b/src/state/SettingsStore.test.jsx
@@ -15,6 +15,8 @@ vi.mock('../services/data/settings', () => ({
     updateSettings: vi.fn(() => Promise.resolve()),
 }));
 vi.mock('../utils/logger', () => ({ default: { error: vi.fn() } }));
+// The language the sign-in screen shows (the device's, or the one picked there).
+vi.mock('../i18n', () => ({ default: { language: 'uk' } }));
 
 const DEFAULTS = settingsFixtures.valid.find((f) => f.name === 'defaults').value;
 const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
@@ -29,7 +31,7 @@ describe('useUserSettings (users/{uid}.settings, spec 3.4-3.5)', () => {
         return null;
     }
     const render = (uid) => act(() => root.render(<Probe uid={uid} />));
-    const deliver = (settings) => act(() => subscribeUserDoc.mock.calls.at(-1)[2](settings));
+    const deliver = (settings, meta) => act(() => subscribeUserDoc.mock.calls.at(-1)[2](settings, meta));
 
     beforeEach(() => {
         localStorage.clear();
@@ -88,4 +90,44 @@ describe('useUserSettings (users/{uid}.settings, spec 3.4-3.5)', () => {
         expect(api.settings).toMatchObject({ design: 'clay' });
         expect(localStorage.getItem('app-design')).toBe('clay');
     });
+
+    it('gives a new account the language of the sign-in screen', () => {
+        render('u1');
+        expect(ensureUserDoc).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ language: 'uk' }));
+    });
+
+    it('keeps the language this browser had in v1', () => {
+        localStorage.setItem('i18nextLng', 'en');
+        render('u1');
+        expect(ensureUserDoc).toHaveBeenCalledWith('db', 'u1', expect.objectContaining({ language: 'en' }));
+    });
+
+    it('creates the user document again once the server says it is still missing (first start offline)', async () => {
+        ensureUserDoc.mockReturnValueOnce(Promise.reject(new Error('offline')));
+        localStorage.setItem('app-design', 'clay');
+        render('u1');
+        await flush();
+        deliver(null, { fromCache: true }); // only this device's cache knows nothing yet
+        await flush();
+        expect(ensureUserDoc).toHaveBeenCalledTimes(1);
+        deliver(null, { fromCache: false }); // the server: there is no users/{uid}
+        await flush();
+        expect(ensureUserDoc).toHaveBeenCalledTimes(2);
+        expect(ensureUserDoc).toHaveBeenLastCalledWith('db', 'u1', expect.objectContaining({ design: 'clay' }));
+        expect(localStorage.getItem('app-design')).toBeNull();
+    });
+
+    it('creates the user document once when StrictMode runs the effect twice', async () => {
+        act(() => root.render(<React.StrictMode><Probe uid="u1" /></React.StrictMode>));
+        await flush();
+        expect(ensureUserDoc).toHaveBeenCalledTimes(1);
+    });
+
+    it('keeps the settings object when a delivery brings the same settings', () => {
+        render('u1');
+        deliver(DEFAULTS);
+        const shown = api.settings;
+        deliver({ ...DEFAULTS });
+        expect(api.settings).toBe(shown);
+    });
 });
````

````diff
diff --git a/firestore-tests/settings.data.test.js b/firestore-tests/settings.data.test.js
index 6ea9e9b..8324692 100644
--- a/firestore-tests/settings.data.test.js
+++ b/firestore-tests/settings.data.test.js
@@ -39,10 +39,10 @@ describe('user document and settings', () => {
         });
     });
 
-    it('delivers the settings live, null until the document exists', async () => {
+    it('delivers the settings live, and null while the server has no document', async () => {
         const seen = [];
-        const unsubscribe = subscribeUserDoc(device(), OWNER, (settings) => seen.push(settings));
-        await vi.waitFor(() => expect(seen).toEqual([null]));
+        const unsubscribe = subscribeUserDoc(device(), OWNER, (settings, meta) => seen.push(settings || meta));
+        await vi.waitFor(() => expect(seen.at(-1)).toEqual({ fromCache: false }));
         await ensureUserDoc(device(), OWNER, DEFAULTS);
         await vi.waitFor(() => expect(seen.at(-1)).toEqual(DEFAULTS));
         await updateSettings(device(), OWNER, { design: 'clay' });
````

- [ ] **Step 2: Тесты падают**

Run: `npx vitest run src/state/SettingsStore.test.jsx`
Expected: FAIL — `Test Files  1 failed (1)`, `Tests  4 failed | 6 passed (10)`; падают «gives a new account the language of the sign-in screen», «creates the user document again once the server says it is still missing (first start offline)», «creates the user document once when StrictMode runs the effect twice» и «keeps the settings object when a delivery brings the same settings».

- [ ] **Step 3: Подписка с метаданными и создание документа**

````diff
diff --git a/src/services/data/settings.js b/src/services/data/settings.js
index 2077cbe..7e2e3b6 100644
--- a/src/services/data/settings.js
+++ b/src/services/data/settings.js
@@ -6,9 +6,13 @@ import { newUserDocData, settingsFromUserDoc, settingsUpdateData } from './conve
 
 const userRef = (db, uid) => doc(db, 'users', uid);
 
-/** Live settings: onSettings(settings), or onSettings(null) while users/{uid} does not exist. */
-export const subscribeUserDoc = (db, uid, onSettings, onError) => onSnapshot(userRef(db, uid), (snapshot) => {
-    onSettings(snapshot.exists() ? settingsFromUserDoc(snapshot.data()) : null);
+/**
+ * Live settings: onSettings(settings) while users/{uid} exists, onSettings(null, { fromCache })
+ * while it does not; fromCache false means the server says so, not only this device's cache.
+ */
+export const subscribeUserDoc = (db, uid, onSettings, onError) => onSnapshot(userRef(db, uid), { includeMetadataChanges: true }, (snapshot) => {
+    if (snapshot.exists()) onSettings(settingsFromUserDoc(snapshot.data()));
+    else onSettings(null, { fromCache: snapshot.metadata.fromCache });
 }, onError);
 
 /**
````

````diff
diff --git a/src/state/SettingsStore.jsx b/src/state/SettingsStore.jsx
index c11516e..2cd1f67 100644
--- a/src/state/SettingsStore.jsx
+++ b/src/state/SettingsStore.jsx
@@ -1,5 +1,6 @@
 import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
 import { db } from '../firebase';
+import i18n from '../i18n';
 import { ensureUserDoc, subscribeUserDoc, updateSettings as writeSettings } from '../services/data/settings';
 import { settingsFromLocalStorage } from '../contract/migrateV1';
 import { removeLegacyLocalData } from '../utils/legacyLocalData';
@@ -16,9 +17,18 @@ const legacyStorage = {
     removeItem: (key) => window.localStorage.removeItem(key),
 };
 
+// One creation of users/{uid} at a time, also across the effect re-runs of StrictMode.
+const creating = new Map();
+const createOnce = (uid, settings) => {
+    if (!creating.has(uid)) creating.set(uid, ensureUserDoc(db, uid, settings).finally(() => creating.delete(uid)));
+    return creating.get(uid);
+};
+
 /**
  * Live settings of uid. At sign-in the user document is created if it does not exist yet,
- * seeded from this browser's old settings, and then the old local keys are removed.
+ * seeded from this browser's old settings, and then the old local keys are removed. A new
+ * account takes the language of the sign-in screen. If the first start could not create the
+ * document (offline), it is created once the server says it is still missing.
  * settings is null while signed out and until the document is read.
  */
 export function useUserSettings(uid) {
@@ -35,8 +45,8 @@ export function useUserSettings(uid) {
     useEffect(() => {
         apply(null);
         if (!uid) return undefined;
-        const initial = settingsFromLocalStorage(legacyStorage.getItem, navigator.language);
-        ensureUserDoc(db, uid, initial)
+        const initial = settingsFromLocalStorage(legacyStorage.getItem, i18n.language);
+        const create = () => createOnce(uid, initial)
             .then(() => removeLegacyLocalData(legacyStorage, uid))
             .catch((e) => {
                 // No document and no way to create it now (e.g. the first start offline):
@@ -44,8 +54,11 @@ export function useUserSettings(uid) {
                 logger.error('Could not create the user document:', e);
                 if (!latest.current) apply(initial);
             });
-        return subscribeUserDoc(db, uid, (next) => {
-            if (next) apply(next);
+        create();
+        return subscribeUserDoc(db, uid, (next, meta) => {
+            // The same settings again (the server confirming this device's write): nothing to show.
+            if (next && JSON.stringify(next) !== JSON.stringify(latest.current)) apply(next);
+            if (!next && meta && !meta.fromCache) create();
         }, (e) => logger.error('Settings listener error:', e));
     }, [uid, apply]);
 
````

- [ ] **Step 4: Тесты проходят**

Run: `npx vitest run src/state/SettingsStore.test.jsx`
Expected: PASS — `Tests  10 passed (10)`.

- [ ] **Step 5: Эмулятор**

Run: `npm run test:rules`
Expected: `Test Files  12 passed (12)`, `Tests  122 passed (122)`.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  61 passed (61)`, `Tests  653 passed (653)`; линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add firestore-tests/settings.data.test.js src/services/data/settings.js src/state/SettingsStore.jsx src/state/SettingsStore.test.jsx
git commit -F - <<'EOF'
fix(settings): the first sign-in creates the user document once, also after a start offline

A new account takes the language shown on the sign-in screen (the device's,
or the one picked there), while a browser of v1 keeps its own. When the first
start cannot create users/{uid} (offline), the document is created as soon as
the server says it is still missing: subscribeUserDoc now tells a missing
document from the server apart from one only this device's cache lacks. One
creation runs at a time per user, also when StrictMode runs the effect twice,
and a delivery with the same settings no longer renders the app again.
EOF
```

---

### Task 7: Репетиция переноса на эмуляторе

**Files:**
- Create: `scripts/rehearsal/migrationDiff.js`, `scripts/rehearsal/emulator.js`, `scripts/rehearsal/load.rehearsal.js`, `scripts/rehearsal/check.rehearsal.js`, `vitest.rehearsal.config.js`
- Test: `scripts/rehearsal/migrationDiff.test.js`
- Modify: `package.json` (только скрипты)

**Interfaces:**
- Consumes: `mapTaskV1`, `mapCategoriesV1`, `isValidId` (подплан 0.1); `taskFromDoc`, `categoryFromDoc` (подплан 0.4); `@firebase/rules-unit-testing`.
- Produces: `migrationDiff(file, moved) → { tasks: { expected, moved }, categories: { expected, moved }, marker, mismatches: [{ kind, id, title, field, expected?, moved? }] }`, где `moved = { language, migration, categories, tasks }` — `users/{uid}` в форме бэкапа; `openEmulator()`, `uidOf(email)`, `readMoved(env, uid)`; `REHEARSAL_EXPORT=<файл> REHEARSAL_EMAIL=<аккаунт> npm run rehearsal:load` и `… npm run rehearsal:check`.

- [ ] **Step 1: Написать падающий тест**

Сверка сравнивает каждое поле каждой записи с тем, во что экспорт превращают правила 9.2; время, которое переносу пришлось подставить, не сравнивается; порядок ключей в картах не важен.

Файл `scripts/rehearsal/migrationDiff.test.js`:

````js
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fixtures from '../../contract/fixtures/migration-v1.json';
import { migrationDiff } from './migrationDiff';

// A v1 export as the old web saved it, and the move of it done right (spec 9.2).
const valid = fixtures.tasks.filter((t) => t.expected);
const FILE = { version: 1, exportedAt: '2026-10-14T11:00:00.000Z', bubbles: valid.map((t) => t.v1), tags: fixtures.categories.v1.filter((tag) => tag.id) };
const MOVED = {
    language: fixtures.context.language,
    migration: { tasks: valid.length, categories: fixtures.categories.expected.length },
    categories: fixtures.categories.expected,
    tasks: valid.map((t) => t.expected),
};

describe('migrationDiff: users/{uid} against the export it was moved from (spec 9.3, rehearsal)', () => {
    it('finds nothing to report when every record moved as 9.2 maps it', () => {
        expect(migrationDiff(FILE, MOVED)).toEqual({
            tasks: { expected: 8, moved: 8 },
            categories: { expected: 4, moved: 4 },
            marker: { tasks: 8, categories: 4 },
            mismatches: [],
        });
    });

    it('reports a field that differs, a record that is missing and one that should not be there', () => {
        const tasks = MOVED.tasks.filter((t) => t.id !== 'a5').map((t) => (t.id === 'a1' ? { ...t, reminders: [60] } : t));
        const categories = [...MOVED.categories, { id: 'zz', name: 'Extra', color: '#4d697e', order: 9 }];
        expect(migrationDiff(FILE, { ...MOVED, tasks, categories }).mismatches).toEqual([
            { kind: 'category', id: 'zz', title: 'Extra', field: 'not in the export' },
            { kind: 'task', id: 'a1', title: fixtures.tasks[0].expected.title, field: 'reminders', expected: fixtures.tasks[0].expected.reminders, moved: [60] },
            { kind: 'task', id: 'a5', title: valid.find((t) => t.v1.id === 'a5').expected.title, field: 'missing' },
        ]);
    });

    it('does not count the time a record got because its own could not be read', () => {
        const fixed = valid.find((t) => t.notes.includes('timestamp-fixed')).expected;
        const tasks = MOVED.tasks.map((t) => (t.id === fixed.id ? { ...t, createdAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-20T09:00:00.000Z' } : t));
        expect(migrationDiff(FILE, { ...MOVED, tasks }).mismatches).toEqual([]);
    });

    it('compares maps whatever the order of their keys', () => {
        const tasks = MOVED.tasks.map((t) => (t.repeat ? { ...t, repeat: Object.fromEntries(Object.entries(t.repeat).reverse()) } : t));
        expect(migrationDiff(FILE, { ...MOVED, tasks }).mismatches).toEqual([]);
    });
});
````

- [ ] **Step 2: Тест падает**

Run: `npx vitest run scripts/rehearsal/migrationDiff.test.js`
Expected: FAIL — `Test Files  1 failed (1)`, `Tests  no tests`; `Error: Failed to resolve import "./migrationDiff" from "scripts/rehearsal/migrationDiff.test.js". Does the file exist?`.

- [ ] **Step 3: Сверка**

Файл `scripts/rehearsal/migrationDiff.js`:

````js
/**
 * Rehearsal of the move (spec 9.3, step 2): what a v1 export becomes by the rules of 9.2,
 * compared with what the web moved into users/{uid}, record by record. Pure.
 */
import { mapCategoriesV1, mapTaskV1 } from '../../src/contract/migrateV1';

const TIMES = ['createdAt', 'updatedAt', 'deletedAt'];

// Deep equality of JSON-like values; the order of the keys of a map does not matter.
const same = (a, b) => {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((key) => same(a[key], b[key]));
};

/**
 * file: the v1 export; moved: { language, migration, categories, tasks } read from users/{uid}, in
 * backup form. Returns the numbers and every mismatch ({ kind, id, title, field, expected?, moved? }).
 * A time the move had to make up, because the record's own could not be read, is not compared.
 */
export const migrationDiff = (file, moved) => {
    const mismatches = [];
    const { categories } = mapCategoriesV1(file.tags);
    const movedCategories = new Map(moved.categories.map((c) => [c.id, c]));
    categories.forEach((c) => {
        const m = movedCategories.get(c.id);
        if (!m) {
            mismatches.push({ kind: 'category', id: c.id, title: c.name, field: 'missing' });
            return;
        }
        ['name', 'color', 'order'].forEach((field) => {
            if (!same(c[field], m[field])) mismatches.push({ kind: 'category', id: c.id, title: c.name, field, expected: c[field], moved: m[field] });
        });
    });
    const categoryIds = new Set(categories.map((c) => c.id));
    moved.categories.filter((m) => !categoryIds.has(m.id))
        .forEach((m) => mismatches.push({ kind: 'category', id: m.id, title: m.name, field: 'not in the export' }));

    const movedTasks = new Map(moved.tasks.map((t) => [t.id, t]));
    const expectedIds = new Set();
    file.bubbles.forEach((bubble) => {
        const m = movedTasks.get(String(bubble.id));
        // A v1 task without a zone took the zone of the browser that moved it: read it from the result.
        const ctx = { now: new Date(), timeZone: (m && m.due && m.due.tz) || 'UTC', language: moved.language, categoryIds };
        const { task, notes } = mapTaskV1(bubble, ctx);
        if (!task) return; // the move skips it, and its preview says so
        expectedIds.add(task.id);
        if (!m) {
            mismatches.push({ kind: 'task', id: task.id, title: task.title, field: 'missing' });
            return;
        }
        Object.keys(task).forEach((field) => {
            if (TIMES.includes(field) && notes.includes('timestamp-fixed')) return;
            if (!same(task[field], m[field])) mismatches.push({ kind: 'task', id: task.id, title: task.title, field, expected: task[field], moved: m[field] });
        });
    });
    moved.tasks.filter((m) => !expectedIds.has(m.id))
        .forEach((m) => mismatches.push({ kind: 'task', id: m.id, title: m.title, field: 'not in the export' }));

    return {
        tasks: { expected: expectedIds.size, moved: moved.tasks.length },
        categories: { expected: categories.length, moved: moved.categories.length },
        marker: moved.migration ? { tasks: moved.migration.tasks, categories: moved.migration.categories } : null,
        mismatches,
    };
};
````

- [ ] **Step 4: Тест проходит**

Run: `npx vitest run scripts/rehearsal/migrationDiff.test.js`
Expected: PASS — `Tests  4 passed (4)`.

- [ ] **Step 5: Загрузка и проверка на эмуляторе**

Модули контракта импортируют JSON, поэтому чистый Node их не запустит: загрузчик и проверка — файлы vitest со своим конфигом. К эмулятору они ходят клиентом `@firebase/rules-unit-testing` без правил; проект `demo-to-round` не может попасть в настоящий Firebase. Вывод — через `process.stdout`: консоль теста под happy-dom до терминала не доходит.

Файл `scripts/rehearsal/emulator.js`:

````js
/**
 * The local emulators of `npm run start:emulator` (project demo-to-round) for the rehearsal of the
 * move: a Firestore client that the rules do not limit, and the accounts of the Auth emulator.
 * A demo- project never reaches a real Firebase project.
 */
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { categoryFromDoc, taskFromDoc } from '../../src/services/data/convert';

const PROJECT = 'demo-to-round';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';

export const openEmulator = () => initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: '127.0.0.1', port: 8180 },
});

/** The uid of the Auth-emulator account with this email (registered in the web first). */
export const uidOf = async (email) => {
    const response = await fetch(`${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
        method: 'POST',
        headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: '{}',
    });
    const account = ((await response.json()).userInfo || []).find((a) => a.email === email);
    if (!account) throw new Error(`No Auth-emulator account ${email}: register it in the web on the emulator first.`);
    return account.localId;
};

/** users/{uid} as the check compares it: { language, migration, categories, tasks }, in backup form. */
export const readMoved = async (env, uid) => {
    let moved;
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        const [user, categories, tasks] = await Promise.all([
            getDoc(doc(db, 'users', uid)),
            getDocs(collection(db, 'users', uid, 'categories')),
            getDocs(collection(db, 'users', uid, 'tasks')),
        ]);
        const data = user.data() || {};
        moved = {
            language: data.settings ? data.settings.language : 'en',
            migration: data.migration || null,
            categories: categories.docs.map((d) => categoryFromDoc(d.id, d.data())),
            tasks: tasks.docs.map((d) => taskFromDoc(d.id, d.data())),
        };
    });
    return moved;
};
````

Запись без id старый веб хранить не мог: загрузчик её пропускает и сообщает, сколько пропустил.

Файл `scripts/rehearsal/load.rehearsal.js`:

````js
/**
 * Rehearsal of the move (spec 9.3, step 2), part 1: loads a v1 export (the old web's "Export JSON")
 * into the v1 collections of an Auth-emulator account, as the old web kept them:
 * user-bubbles/{uid}/bubbles/{id} and user-tags/{uid}.tags.
 *
 *   REHEARSAL_EXPORT=<file> REHEARSAL_EMAIL=<account> npm run rehearsal:load
 *
 * Steps around it: docs/migration.md.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { isValidId } from '../../src/contract/validate';
import { openEmulator, uidOf } from './emulator';

let env;

beforeAll(async () => { env = await openEmulator(); });
afterAll(async () => { await env.cleanup(); });

it('loads the export into the v1 collections of the account', async () => {
    const file = JSON.parse(readFileSync(process.env.REHEARSAL_EXPORT, 'utf8'));
    expect(file.version).toBe(1);
    const uid = await uidOf(process.env.REHEARSAL_EMAIL);
    // The old web kept each task as a document named by its id: a record without one cannot be there.
    const bubbles = file.bubbles.filter((bubble) => bubble && bubble.id !== undefined && bubble.id !== null
        && isValidId(String(bubble.id)));
    await env.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        for (let start = 0; start < bubbles.length; start += 400) {
            const batch = writeBatch(db);
            bubbles.slice(start, start + 400)
                .forEach((bubble) => batch.set(doc(db, 'user-bubbles', uid, 'bubbles', String(bubble.id)), bubble));
            await batch.commit();
        }
        await setDoc(doc(db, 'user-tags', uid), { tags: file.tags, userId: uid });
    });
    process.stdout.write(`Loaded ${bubbles.length} tasks (${file.bubbles.length - bubbles.length} without an id left out) `
        + `and ${file.tags.length} categories into the v1 collections of ${process.env.REHEARSAL_EMAIL}.\n`);
});
````

Файл `scripts/rehearsal/check.rehearsal.js`:

````js
/**
 * Rehearsal of the move (spec 9.3, step 2), part 2: after the web on the emulator has moved the
 * account, compares users/{uid} with what the export becomes by the rules of 9.2 — the numbers,
 * the marker and every field of every record (the due, the reminders and the repeat make the
 * reminder schedule). Prints only the numbers and the mismatches.
 *
 *   REHEARSAL_EXPORT=<file> REHEARSAL_EMAIL=<account> npm run rehearsal:check
 *
 * Steps around it: docs/migration.md.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { migrationDiff } from './migrationDiff';
import { openEmulator, readMoved, uidOf } from './emulator';

let env;

beforeAll(async () => { env = await openEmulator(); });
afterAll(async () => { await env.cleanup(); });

it('finds users/{uid} equal to the export moved by the rules of 9.2', async () => {
    const file = JSON.parse(readFileSync(process.env.REHEARSAL_EXPORT, 'utf8'));
    const diff = migrationDiff(file, await readMoved(env, await uidOf(process.env.REHEARSAL_EMAIL)));
    // process.stdout: the happy-dom console of the test does not reach the terminal.
    process.stdout.write(`Tasks: ${diff.tasks.expected} expected, ${diff.tasks.moved} moved. `
        + `Categories: ${diff.categories.expected} expected, ${diff.categories.moved} moved. Marker: ${JSON.stringify(diff.marker)}.\n`);
    diff.mismatches.forEach((m) => process.stdout.write(`Mismatch: ${m.kind} ${m.id} «${m.title}» ${m.field}`
        + ('expected' in m ? `: expected ${JSON.stringify(m.expected)}, moved ${JSON.stringify(m.moved)}` : '') + '\n'));
    expect(diff.mismatches).toEqual([]);
    expect(diff.marker).toEqual({ tasks: diff.tasks.expected, categories: diff.categories.expected });
});
````

Файл `vitest.rehearsal.config.js`:

````js
import { defineConfig } from 'vitest/config';

// Rehearsal of the move (docs/migration.md): runs against the emulators of
// `npm run start:emulator`, only through `npm run rehearsal:load` and `npm run rehearsal:check`.
export default defineConfig({
    test: {
        include: ['scripts/rehearsal/**/*.rehearsal.js'],
        environment: 'happy-dom',
        fileParallelism: false,
        testTimeout: 120000,
        hookTimeout: 60000,
    },
});
````

````diff
diff --git a/package.json b/package.json
index 1cce320..d0e9606 100644
--- a/package.json
+++ b/package.json
@@ -12,6 +12,8 @@
     "test": "vitest run --passWithNoTests",
     "test:functions": "npm --prefix functions test && npm --prefix functions run test:emulator",
     "test:rules": "firebase emulators:exec --only firestore --project demo-to-round \"vitest run --config vitest.rules.config.js\"",
+    "rehearsal:load": "vitest run --config vitest.rehearsal.config.js load",
+    "rehearsal:check": "vitest run --config vitest.rehearsal.config.js check",
     "test:all": "npm test && npm run test:functions && npm run test:rules",
     "lint": "eslint src",
     "lint:functions": "npm --prefix functions run lint",
````

Проверка этих файлов — репетиция в задаче 8.

- [ ] **Step 6: Весь набор веба и линтер**

Run: `npm test` и `npm run lint`
Expected: `Test Files  62 passed (62)`, `Tests  657 passed (657)` (из новых файлов корневой `npm test` собирает только `migrationDiff.test.js`); линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/rehearsal/check.rehearsal.js scripts/rehearsal/emulator.js scripts/rehearsal/load.rehearsal.js scripts/rehearsal/migrationDiff.js scripts/rehearsal/migrationDiff.test.js vitest.rehearsal.config.js
git commit -F - <<'EOF'
feat(migration): the rehearsal of the move on the emulator

Spec 9.3, step 2: `npm run rehearsal:load` puts a v1 export (the old web's
"Export JSON") into the v1 collections of an Auth-emulator account, as the
old web kept them; after the web on the emulator has moved the account,
`npm run rehearsal:check` compares users/{uid} with what the export becomes
by the rules of 9.2: the numbers, the marker and every field of every record,
the due, reminders and repeat included. It prints only the numbers and the
mismatches. Both run through vitest (the contract modules import JSON) with a
Firestore client the rules do not limit, and can only reach the demo project.
EOF
```

---

### Task 8: Документация, проверка и репетиция с настоящим экспортом

**Files:**
- Create: `docs/migration.md`
- Modify: `docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md` (разделы 3.4, 3.5, 9.1, 10), `CLAUDE.md`, `README.md`, `docs/README.md`, `docs/firebase.md`

**Interfaces:**
- Consumes: всё из задач 1–7.
- Produces: спецификация и документация описывают перенос, резервную копию v2 и репетицию; ветка проходит `npm run verify`, репетицию на настоящем экспорте и проверку вживую.

- [ ] **Step 1: Спецификация**

Раздел 3.4 следует коду 0.4–0.6 (документ пользователя создаётся при первом входе, в том числе позже, если старт был без сети); 3.5 — решение владельца о языке экрана входа; 9.1 — список `changed` предпросмотра; 10 — отказ файла с нечитаемой записью, время из будущего и незнакомая зона.

````diff
diff --git a/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md b/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
index 6b632ae..28c44a7 100644
--- a/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
+++ b/docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
@@ -99,7 +99,7 @@ notification-sent/{key}              служебная, только серве
 | `migration` | map, необязательное | `{ fromV1At: Timestamp, tasks: int, categories: int }`; пишется по завершении переноса |
 | `createdAt`, `updatedAt` | Timestamp | время создания и изменения |
 
-Документ создаёт клиент при первом входе: при переносе данных — в конце переноса (9.1), у нового пользователя без старых данных — сразу, с настройками по умолчанию.
+Документ создаёт клиент при первом входе — с настройками этого браузера (3.5). Если первый вход не смог его создать (без сети), клиент создаёт его, как только сервер подтвердит, что документа нет, а перенос (9.1) — в своём конце, если документа всё ещё нет. `migration` пишется в конце переноса.
 
 ### 3.5 Настройки — `users/{uid}.settings`
 
@@ -107,7 +107,7 @@ notification-sent/{key}              служебная, только серве
 |---|---|---|---|
 | `themeMode` | `light`, `dark`, `system` | `system` | `app-theme-mode` |
 | `design` | `classic`, `modern`, `aurora`, `brutalist`, `clay` | `classic` | `app-design` |
-| `language` | `en`, `uk` | язык устройства: `uk*` → `uk`, иначе `en` | `i18nextLng` |
+| `language` | `en`, `uk` | язык экрана входа (сначала это язык устройства): `uk*` → `uk`, иначе `en` | `i18nextLng` |
 | `mainView` | `bubbles`, `list` | `bubbles` | `bubbles-main-view` (`tasks` → `list`) |
 | `labelFontSize` | int 8–20 | 8 | `bubbles-font-size` |
 | `bubbleBackground` | bool | `true` | `bubbles-background-enabled` |
@@ -119,7 +119,7 @@ notification-sent/{key}              служебная, только серве
 
 `categoryIds: null` означает «все категории»; список — явный выбор.
 
-Настройки записываются по отдельным полям (`settings.themeMode` и т. п.) вместе с `updatedAt`, чтобы два устройства не затирали чужие изменения. До входа в аккаунт экран входа использует язык устройства и системную тему; после входа применяются настройки пользователя.
+Настройки записываются по отдельным полям (`settings.themeMode` и т. п.) вместе с `updatedAt`, чтобы два устройства не затирали чужие изменения. До входа в аккаунт экран входа использует язык устройства и системную тему; язык, выбранный на экране входа, становится языком нового аккаунта. После входа применяются настройки пользователя.
 
 На устройстве остаются `bubbles-fab-position` и `mindmap-last-open-id`. Неиспользуемый ключ `bubbles-use-rich-text` удаляется.
 
@@ -251,6 +251,7 @@ notification-sent/{key}              служебная, только серве
   - число задач и категорий;
   - напоминания и повторы, округлённые до часа;
   - задачи, у которых теряется форматирование описания;
+  - задачи, у которых теряется срок, напоминание или часть текста (нечитаемая дата, больше 10 напоминаний, слишком длинные название или описание);
   - категории, у которых меняется цвет;
   - некорректные записи, которые будут пропущены.
 - Кнопки «Перенести» и «Отложить». «Отложить» выходит из аккаунта, окно появится при следующем входе.
@@ -336,7 +337,7 @@ notification-sent/{key}              служебная, только серве
 - В примере `settings` сокращён: в файле он содержит все поля из 3.5.
 - Служебные поля (`schemaVersion`, `overdueAt`, `nextNotifyAt`) в бэкап не пишутся. Время — в ISO-строках.
 - Импорт принимает v2 и v1 (через 9.2).
-- Весь файл проверяется до любых записей, как сейчас ([#91](https://github.com/PMobile78/to-round-react/issues/91)).
+- Весь файл проверяется до любых записей, как сейчас ([#91](https://github.com/PMobile78/to-round-react/issues/91)). Запись, которую нельзя прочитать (в том числе запись файла v1 без id или с повтором id), отклоняет весь файл. Время из будущего заменяется временем чтения файла, как в 9.2; зону срока, которую браузер не знает, импорт принимает, как и правила (раздел 7).
 - Перед записью — подтверждение с числами.
 - Импорт заменяет все задачи и категории, а если в файле есть `settings` — и настройки. Замена: записи, которых нет в файле, удаляются (`deleteDoc`); существующие с тем же id обновляются `updateDoc` (без `createdAt` и служебных полей сервера, `updatedAt` — время сервера); новые создаются с исходными `createdAt` и `updatedAt`. Удалять и создавать заново существующие записи нельзя: `onCategoryDeleted` после удаления категории может обнулить `categoryId` у уже восстановленных задач.
 - Запись идёт порциями не больше 450 операций, ошибки показываются, страница не перезагружается.
````

- [ ] **Step 2: Документация**

Файл `docs/migration.md`:

````markdown
# Перенос данных и резервная копия (контракт данных v2)

> Здесь описан веб ветки `stage-0-data-contract-v2` (подплан 0.6). В проде до переезда
> (подплан 0.7) работает v1 с её «Export JSON» и «Import JSON».

Спецификация: [разделы 9 и 10](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md).

## Перенос при первом входе

- **Когда.** После входа приложение смотрит на метку `users/{uid}.migration` и на старые коллекции
  `user-bubbles/{uid}/bubbles` и `user-tags/{uid}`. Если метки нет, а в старых коллекциях есть
  данные, вместо приложения открывается окно «Перенос в новую версию».
- **Что показывает окно** (ничего не записывая): сколько задач и категорий будет перенесено;
  задачи, у которых напоминания или повтор округляются вверх до целого часа; задачи, у которых
  описание теряет форматирование; задачи, у которых теряется срок, напоминание или часть текста;
  категории, которые получат другой цвет; сколько записей пропускается.
- **«Перенести»** записывает категории, затем задачи с их исходным временем, порциями не больше
  450 записей, и последней — метку `migration: { fromV1At, tasks, categories }`. Уже перенесённое
  второй раз не пишется: если перенос прервался, окно появится снова и допишет только недостающее.
  Фильтр, в котором были отмечены все старые категории, становится «все категории»
  (`categoryIds: null`), чтобы новые категории в него попадали.
- **«Отложить»** выходит из аккаунта; окно появится при следующем входе.
- Старые коллекции не меняются. Устройства не переносятся: каждое регистрируется при входе заново.
- Код: `src/services/data/migration.js`, `src/hooks/useMigration.js`,
  `src/components/MigrationGate.jsx`, `src/components/MigrationDialog.jsx`; правила перевода
  v1 → v2 (раздел 9.2) — `src/contract/migrateV1.js`.

## Резервная копия

- **Экспорт** — главное меню → «Экспорт резервной копии»: файл
  `to-round-backup-ГГГГ-ММ-ДД-ЧЧММ.json` формата v2 (раздел 10) со всеми задачами (и из корзины),
  категориями и настройками; время — строки ISO.
- **Импорт** — «Импорт резервной копии». Принимает файлы v2 и файлы старой версии («Export JSON»
  веба v1: они переводятся по правилам 9.2, настроек в них нет). Весь файл проверяется до любых
  чтений и записей: не JSON, не резервная копия, другая версия, запись, которую нельзя прочитать, —
  ничего не меняется, и окно объясняет причину.
- **Подтверждение** перед записью: сколько задач и категорий в копии, сколько текущих будет
  удалено, заменяются ли настройки; у копии старой версии — предупреждение об округлении и
  форматировании.
- **Замена.** Записи с тем же id обновляются (`createdAt` остаётся, `updatedAt` — время сервера),
  новые создаются со своим временем, остальные удаляются; затем — настройки из копии. Порции не
  больше 450 записей; если порция не записалась, окно говорит, сколько изменений сохранено, а
  повторный импорт того же файла доделывает работу. Страница не перезагружается: холст и список
  обновляются сами.
- Код: `src/contract/backup.js` (формат файла), `src/services/data/backup.js`,
  `src/hooks/useBackup.js`, `src/components/BackupDialog.jsx`.

## Репетиция переноса

Перед переездом (раздел 9.3, шаг 2) перенос прогоняется на эмуляторе с настоящим экспортом.
Нужны Java 21+ и Firebase CLI 15+.

1. В текущей версии прода — меню → «Export JSON»; файл положить в `/media/big_disk/Backup/to-round/`
   (вне git).
2. `npm run start:emulator`, открыть <http://localhost:3000/to-round-react/> и зарегистрировать
   тестовый аккаунт (он живёт только в Auth-эмуляторе). Окна переноса пока нет: старых данных нет.
3. Загрузить экспорт в старые коллекции этого аккаунта:

   ```bash
   REHEARSAL_EXPORT=/media/big_disk/Backup/to-round/<файл>.json REHEARSAL_EMAIL=<email> npm run rehearsal:load
   ```

4. Перезагрузить страницу: откроется окно переноса. Проверить числа и списки, нажать «Перенести».
5. Сверить результат с экспортом — числа, метку и каждое поле каждой записи (срок, напоминания и
   повтор задают расписание напоминаний):

   ```bash
   REHEARSAL_EXPORT=/media/big_disk/Backup/to-round/<файл>.json REHEARSAL_EMAIL=<email> npm run rehearsal:check
   ```

   Выводятся только числа и расхождения. Время, которое переносу пришлось подставить (исходное не
   читалось), не сравнивается.
6. Сверить вручную 3–5 задач: в списке и в окне задачи.
7. Остановить эмулятор: при следующем запуске его данные пусты. Повторять, пока всё не совпадёт.
````

````diff
diff --git a/docs/README.md b/docs/README.md
index 1d6fede..2355cd0 100644
--- a/docs/README.md
+++ b/docs/README.md
@@ -17,3 +17,4 @@
 |---|---|
 | [notifications.md](notifications.md) | Дедлайны, напоминания, повторы; пульсация на клиенте и серверный планировщик FCM |
 | [i18n.md](i18n.md) | Интернационализация: namespaces, добавление языка |
+| [migration.md](migration.md) | Перенос данных v1 → v2 при первом входе, резервная копия (экспорт и импорт), репетиция переноса на эмуляторе |
````

````diff
diff --git a/docs/firebase.md b/docs/firebase.md
index af01c97..39bf532 100644
--- a/docs/firebase.md
+++ b/docs/firebase.md
@@ -58,7 +58,7 @@ export const auth = getAuth(app);
 | `users/{uid}/devices/{deviceId}` | устройства (id установки Firebase) | только владелец |
 | `user-mindmaps/{uid}/{document=**}` | карты mindmap | только владелец |
 | `notification-sent/{key}` | ключи дедупликации | только Cloud Functions (admin SDK); в правилах `if false` |
-| `user-bubbles`, `user-tags`, `user-fcm-tokens` | данные v1 | владелец только читает: для переноса (0.6) и отката |
+| `user-bubbles`, `user-tags`, `user-fcm-tokens` | данные v1 | владелец только читает: их читает перенос ([migration.md](migration.md)), они нужны для отката |
 
 Слой данных создаёт документы с `serverTimestamp()` и меняет их только частичными
 обновлениями с `updatedAt: serverTimestamp()`; `setDoc` поверх существующего документа правила
````

````diff
diff --git a/README.md b/README.md
index 160e1f1..9f1e998 100644
--- a/README.md
+++ b/README.md
@@ -16,6 +16,8 @@
   на следующий раз, «Завершить серию» закрывает её.
 - **Push-уведомления** (FCM) — reminder заранее и overdue по сроку, через Cloud Functions;
   на каждом устройстве — переключатель «Напоминания на этом устройстве».
+- **Резервная копия** — экспорт всех данных в файл и импорт (файлы новой и старой версии) из
+  главного меню; при первом входе новой версии данные старой переносятся с предпросмотром.
 - **Mind maps** (@xyflow/react + mind-elixir).
 - **i18n** — English и Українська; тёмная/светлая тема.
 - **Синхронизация** между устройствами через Firebase Auth (email/пароль) + Firestore.
````

````diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 4d0ece5..da3fcc6 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -2,7 +2,7 @@
 
 This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
 
-Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n).
+Human-facing documentation lives in [`docs/`](docs/README.md) (setup, Firebase, notifications, deployment, i18n, migration and backup).
 
 ## Commands
 
@@ -12,6 +12,8 @@ npm run build          # production build (also generates service worker)
 npm test               # run tests (vitest)
 npm run test:rules     # Firestore emulator tests: rules + web data layer (needs Java 21+ and Firebase CLI 15+)
 npm run start:emulator # dev server against the local Auth + Firestore emulators (.env.emulator)
+npm run rehearsal:load  # rehearsal of the move: a v1 export into the v1 collections of an emulator account
+npm run rehearsal:check # rehearsal of the move: users/{uid} against that export (docs/migration.md)
 npm run preview        # serve production build locally
 npm run generate-sw    # generate public/sw.js from env vars only
 npm run deploy         # build + push to gh-pages branch
@@ -35,7 +37,7 @@ npm run version:major
 index.html                 # entry point (Vite)
 vite.config.js             # Vite configuration (base: '/to-round-react/', outDir: 'build')
 src/
-  App.jsx                    # root: Firebase Auth listener + user settings → AuthForm | BubblesPage
+  App.jsx                    # root: Firebase Auth listener + user settings → AuthForm | MigrationGate → BubblesPage
   index.jsx                  # React DOM root; registers this device after sign-in
   firebase.js                # Firebase SDK init (emulators when REACT_APP_FIREBASE_EMULATORS=true)
   firebaseMessaging.js       # this device in users/{uid}/devices: FCM token, foreground messages
@@ -51,6 +53,8 @@ src/
       tasks.js, categories.js, settings.js, devices.js   # reads, live changes, writes
       bubbleModel.js         # task -> the bubble the app shows (+ tagId, dueAt: moment of the due)
       taskForm.js            # task dialogs' values -> fields of a new task / partial changes
+      backup.js              # v2 backup export; import = replace in batches of at most 450 writes
+      migration.js           # the move from user-bubbles / user-tags (spec 9): read, preview, write, marker
   state/                     # BubblesDataStore, BubblesUiStore (settings-backed values),
                              # SettingsStore (useUserSettings) + SettingsContext
   hooks/                     # extracted from BubblesPage
@@ -63,12 +67,15 @@ src/
     useThemeMode.js          # MUI theme / dark-light toggle
     useMindmaps.js           # mind map state / persistence
     useThisDevice.js         # this browser's users/{uid}/devices doc + "reminders on this device"
+    useBackup.js             # backup export / import of the main menu (BackupDialog)
+    useMigration.js          # the move from v1 before the app opens (MigrationGate, MigrationDialog)
   components/                # UI dialogs, drawers, editors, selectors
   locales/en/ uk/            # i18next translation JSON files
   utils/                     # config, logger, storage, physicsUtils, reorderArray
 scripts/
   generate-sw.js             # writes public/sw.js injecting Firebase config env vars
   version-bump.js            # patches package.json version field
+  rehearsal/                 # rehearsal of the move on the emulator (vitest.rehearsal.config.js)
 functions/
   index.js                   # Cloud Functions Gen2 (contract v2): wiring of the five functions only
   lib/                       # time.js, schedule.js, messages.js (pure) + handlers.js (Firestore side)
@@ -89,7 +96,7 @@ Data contract v2 ([spec](docs/superpowers/specs/2026-10-14-stage-0-data-contract
 | `users/{uid}/devices/{deviceId}` | device = Firebase installation id: `fcmToken`, `notificationsEnabled` | owner |
 | `user-mindmaps/{uid}/{document=**}` | mind maps (unchanged in stage 0) | owner |
 | `notification-sent/{key}` | dedup keys | Cloud Functions admin SDK only (`if false` in rules) |
-| `user-bubbles`, `user-tags`, `user-fcm-tokens` | v1 data | owner read-only; kept for the migration (sub-plan 0.6) and rollback |
+| `user-bubbles`, `user-tags`, `user-fcm-tokens` | v1 data | owner read-only; the move reads them (spec 9.1, left as they are); kept for rollback |
 
 Clients write creates with `serverTimestamp()` and partial updates with `updatedAt: serverTimestamp()`; an existing document is never overwritten with `setDoc` (the rules reject it). Settings, tasks and categories live only in Firestore — localStorage keeps just the FAB position, the last open mind map and the mind map copies.
 
````

- [ ] **Step 3: Полная проверка**

Run: `npm run verify`
Expected: веб — `Test Files  62 passed (62)`, `Tests  657 passed (657)`; функции — `ℹ tests 47` / `ℹ pass 47` и `ℹ tests 34` / `ℹ pass 34` (как до плана); эмулятор — `Test Files  12 passed (12)`, `Tests  122 passed (122)`; линтер без ошибок, код выхода 0.

- [ ] **Step 4: Репетиция на настоящем экспорте и проверка вживую**

Шаги репетиции — в `docs/migration.md` (раздел «Репетиция переноса»): свежий экспорт прода в `/media/big_disk/Backup/to-round/` (решение владельца 1), `npm run start:emulator`, тестовый аккаунт в форме регистрации (только в Auth-эмуляторе; пароль сгенерировать прямо в странице и в чат не выводить), `REHEARSAL_EXPORT=… REHEARSAL_EMAIL=… npm run rehearsal:load`, перезагрузка страницы, «Перенести», затем `REHEARSAL_EXPORT=… REHEARSAL_EMAIL=… npm run rehearsal:check`. Готово, когда проверка печатает `Tasks: N expected, N moved. Categories: M expected, M moved. Marker: {"tasks":N,"categories":M}.` без строк `Mismatch` и `Tests  1 passed (1)`. Названия задач и описания в чат не выводить — только числа и расхождения. В черновике репетиция на настоящем экспорте прода от 15.06.2026 (149 задач, 8 категорий) дала полное совпадение.

В скрытой панели браузера: окну задать 1280×800, `requestAnimationFrame` заменить на `setTimeout(…, 16)`; файлы для импорта подставлять в скрытое поле через `DataTransfer` и событие `change`, скачивание экспорта перехватывать подменой `URL.createObjectURL` и `HTMLAnchorElement.prototype.click`. Пройти сценарии:

1. Экран входа переключить на «Українська», зарегистрироваться → `users/{uid}.settings.language` — `uk`, ошибок «client is offline» и отказов слушателей в консоли нет.
2. Загрузить экспорт, перезагрузить страницу → окно переноса на языке аккаунта: числа и списки совпадают с содержимым экспорта; «Перенести» → приложение; `rehearsal:check` — полное совпадение; в списке и окне задачи 3–5 задач сверить вручную (описание с форматированием, срок во времени устройства, напоминания, дни недели).
3. «Экспорт резервной копии» → файл `to-round-backup-ГГГГ-ММ-ДД-ЧЧММ.json`: `format: "to-round-backup"`, `version: 2`, настройки, все категории и задачи (и из корзины).
4. Импорт этого файла, изменённого в странице (одна задача убрана, одна переименована, одна добавлена, тема изменена) → подтверждение с числами копии и удаляемого; после «Импортировать» — «Резервную копию импортовано», страница та же (без перезагрузки), тел на холсте столько же, сколько активных задач; убранная удалена, добавленная создана со своим `createdAt`, у переименованной `createdAt` прежний, тема из копии, метка переноса на месте.
5. Импорт файла v1 с записью без id → «Записів … які не вдається прочитати: 2. Нічого не змінено.» (или английский текст); файл «не JSON» → своё сообщение; файл v1 без таких записей → подтверждение с предупреждением о старой версии и без строки о настройках → импорт.
6. Второй аккаунт со старыми данными → окно → «Отложить» → экран входа, у аккаунта нет ни задач v2, ни метки; вход снова → окно снова; «Перенести» → полное совпадение.

Остановить запуск, убедиться, что порты 3000, 8180 и 9099 свободны; удалить `firestore-debug.log` в корне и в `functions/`, `public/sw.js`, если остались.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md docs/README.md docs/firebase.md docs/migration.md docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md
git commit -F - <<'EOF'
docs: the move from v1, the v2 backup and the rehearsal

docs/migration.md tells how the move works at the first sign-in (the preview,
"Move" and "Postpone", batches, the marker), how the v2 backup is exported and
imported, and how to rehearse the move on the emulator with a real export.
The spec follows the code of 0.4-0.6: users/{uid} is created at the first
sign-in, also later when that start was offline (3.4); the language of the
sign-in screen becomes the language of a new account (3.5, owner decision);
the preview lists tasks that lose a due, a reminder or text (9.1); and a
backup file with a record that cannot be read is refused whole, a future time
becomes the moment of reading and a zone the browser does not know is kept
(10). CLAUDE.md, README and the docs index name the new modules and commands.
EOF
```

## Передача в 0.7

- Инструкция переезда (спецификация 9.3) опирается на `docs/migration.md`: свежий экспорт прода прямо перед переездом, репетиция на нём (`rehearsal:load`, перенос в окне, `rehearsal:check`), после выкатки — вход владельца, предпросмотр, «Перенести» и проверки шага 4.
- Чек-лист 0.7 из 0.5: выход без сети оставляет документ устройства и токен; переключатель «Напоминания на этом устройстве» на проде.
- Старые коллекции после переезда — только чтение; их удаление — вручную владельцем позже (9.3, шаг 6).

## Отложенное

- Старые экспорты v1 (до v0.1.42) не содержат `useRichText`: их HTML-описания при импорте становятся экранированным текстом — так же v1 показывал задачу без этого флага. Свежий экспорт и сам перенос из Firestore флаг несут.
- Импорт поверх существующих записей ставит им `updatedAt` = время сервера (спецификация 10, правила): после импорта сверка `rehearsal:check` показывает расхождения только в `updatedAt` у обновлённых записей — это ожидаемо; сверять ею нужно перенос, а не импорт.
- Списки предпросмотра идут в порядке id документов, а не по названию.
- Ошибка «Готово» по-прежнему видна только в логе — задача [#102](https://github.com/PMobile78/to-round-react/issues/102).
