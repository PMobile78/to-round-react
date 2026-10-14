# Этап 0.3: Cloud Functions v2 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloud Functions под формат данных v2: напоминания и просрочка по задачам `users/{uid}/tasks`, служебные поля `nextNotifyAt`/`overdueAt`/`pulseMuted`, каскад при удалении категории, очистка корзины — с тестами на общих примерах времени и на эмуляторе Firestore.

**Architecture:** Логика делится на чистые модули без Firestore (`lib/time.js`, `lib/schedule.js`, `lib/messages.js`, юнит-тесты на `node:test`) и слой Firestore `lib/handlers.js`, которому `db`, `messaging` и `now` передаются аргументами: его тесты вызывают обработчики напрямую на эмуляторе Firestore с поддельной отправкой FCM. `index.js` только подключает обработчики к триггерам и расписаниям. Старые функции v1 и расчёт повторов на сервере удаляются; в прод всё выходит при переезде (подплан 0.7).

**Tech Stack:** Node 22 (рантайм функций; локально и в CI — Node 24), CommonJS, firebase-functions 7 (API v2), firebase-admin 14, `node:test` + `node:assert/strict`, Firebase CLI 15 (`emulators:exec`), эмулятор Firestore (Java 21+), `Intl` (часовые пояса и формы множественного числа).

**Spec:** [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md) — разделы 3 (документы), 4.1, 4.2, 4.4 (поведение и уведомления), 6 (сервер), 11 (проверка). Обзор подпланов — [2026-10-14-stage-0-overview.md](2026-10-14-stage-0-overview.md). Предыдущий подплан — [0.2](2026-10-14-stage-0-2-firestore-rules.md) (эмулятор, порт, индексы).

## Global Constraints

- Ветка `stage-0-data-contract-v2`, в `main` не коммитить. Ничего не деплоить: `firebase deploy` из этой ветки до подплана 0.7 запрещён (правила и функции v2 сломают прод-веб v1).
- Функции — CommonJS, `engines.node` остаётся `"22"`, регион всех функций `europe-west1`.
- Новых зависимостей нет: тесты на встроенных `node:test` и `node:assert/strict`. Зависимости `date-fns` и `@date-fns/tz` удаляются из `functions/` (задача 6).
- Время срока — `due.local` в зоне `due.tz` по правилам `java.time.ZonedDateTime.of`; функции проверяются на общих примерах `contract/fixtures/time.json` (те же, что у веба и Android).
- Напоминания — минуты, кратные 60, от 60 до 524 160; остальные значения сервер пропускает (спецификация, раздел 7). Язык уведомлений — `settings.language`, если это `uk`, иначе `en`.
- Сервер пишет в задачу только `nextNotifyAt`, `overdueAt`, `pulseMuted` и `categoryId = null` (каскад), в устройство — только `fcmToken = null`; `updatedAt` не трогает.
- Тесты не отправляют настоящих уведомлений: обработчики получают `messaging` аргументом, тесты подставляют подделку с методом `sendEach`.
- Эмулятор Firestore — порт 8180, проект `demo-to-round` (из `firebase.json`, подплан 0.2); для `test:emulator` нужны Java 21+ и Firebase CLI 15+ (локально есть, в CI их ставит джоб `test`).
- До задачи 6 в `functions/index.js` остаётся код v1: задача 3 меняет формат текстов, которые он читает. Это допустимо, потому что из ветки ничего не деплоится; задача 6 заменяет `index.js` целиком.
- В `main` параллельно обновляется `functions/package-lock.json` (аудит зависимостей). При следующем вливании `main` в эту ветку конфликт в этом файле решается пересборкой (`npm --prefix functions install`), а не ручной правкой.
- Каждая задача заканчивается зелёным `npm run test:functions`; последняя — зелёным `npm run verify`.

## Review Focus

- **Подколлекция `tasks` не в `users/{uid}`** (например, внутри `user-mindmaps`, куда владелец пишет что угодно) — сервер не должен по ней уведомлять другого пользователя. Тест «ignores "tasks" collections outside users/{uid}» — в задаче 4.
- **Пользователь меняет задачу во время прохода планировщика или срабатывания триггера** — устаревшие служебные поля не перезаписывают новое расписание. Тесты «does not overwrite server fields when the user changed the schedule during the pass» — в задаче 4, «skips a stale event when the schedule changed again before the write» — в задаче 5.
- **Планировщик не работал или опоздал** — после паузы приходит одно уведомление (самое позднее напоминание или «просрочено»), а не пачка устаревших. Тесты «sends only the latest of several reminders…» и «sends overdue instead of a stale reminder…» — в задаче 2, «sends overdue, not a stale reminder, after a late run» — в задаче 4.
- **Перенос данных создаёт сотни задач с прошедшим сроком** — они молча становятся просроченными, без рассылки. Тесты «marks a new task with a past due overdue…» — в задаче 2, «marks a task created with a past due as overdue silently…» — в задаче 5.
- **FCM временно отвечает ошибкой** — токен устройства не стирается; стирается только «мёртвый» токен. Тест «clears the token of a device FCM no longer knows, keeps it on other errors» — в задаче 4.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `functions/lib/time.js` | местное время + зона → момент (двойник `src/contract/time.js` на CommonJS) |
| `functions/lib/schedule.js` | события задачи, `nextNotifyAt`, решения планировщика и триггера, ключи дедупликации |
| `functions/lib/messages.js` | получатели, язык, тексты, сообщения FCM |
| `functions/locales/notifications.{en,uk}.json` | (замена) тексты v2 и формы единиц времени |
| `functions/lib/handlers.js` | Firestore: проход планировщика, триггер задачи, каскад категорий, корзина, чистка ключей |
| `functions/index.js` | (замена) только подключение пяти функций v2 |
| `functions/test/unit/*.test.js` | юнит-тесты `node:test` |
| `functions/test/emulator/*.test.js` | тесты на эмуляторе Firestore, `helpers.js` — стенд |
| `functions/test-next-notify.js`, `functions/test-tz.js` | (удаление) тесты v1 |
| `functions/package.json`, `package.json`, `eslint.config.js` | (изменение) скрипты тестов, `fetch` для линтера, удаление `date-fns` |
| `docs/notifications.md`, `CLAUDE.md` | (изменение) описание функций v2 |

---

### Task 1: Время в функциях и запуск тестов на `node:test`

**Files:**
- Create: `functions/lib/time.js`
- Test: `functions/test/unit/time.test.js`
- Modify: `functions/package.json` (скрипт `test`)

**Interfaces:**
- Consumes: `contract/fixtures/time.json` (план 0.1), раздел `toInstant` — 10 примеров.
- Produces: `functions/lib/time.js`:
  - `parseLocal(local: string) → { year, month, day, hour, minute } | null`;
  - `isValidTimeZone(tz) → boolean`;
  - `toInstant(local, tz) → Date`, бросает `Error('Invalid local date-time: …')` на неразборчивом `local`.

- [ ] **Step 1: Написать падающий тест `functions/test/unit/time.test.js`**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const timeFixtures = require('../../../contract/fixtures/time.json');
const { isValidTimeZone, parseLocal, toInstant } = require('../../lib/time');

describe('toInstant (contract/fixtures/time.json)', () => {
    for (const { name, local, tz, instant } of timeFixtures.toInstant) {
        it(name, () => {
            assert.equal(toInstant(local, tz).toISOString(), instant);
        });
    }
});

describe('toInstant input checks', () => {
    it('throws on a malformed local time', () => {
        assert.throws(() => toInstant('2026-02-30T10:00', 'Europe/Kyiv'), /Invalid local date-time/);
        assert.throws(() => toInstant('2026-10-15 10:00', 'Europe/Kyiv'), /Invalid local date-time/);
    });

    it('parseLocal rejects impossible calendar values', () => {
        assert.equal(parseLocal('2026-13-01T10:00'), null);
        assert.equal(parseLocal('2026-10-15T24:00'), null);
        assert.deepEqual(parseLocal('2026-10-15T09:30'), { year: 2026, month: 10, day: 15, hour: 9, minute: 30 });
    });

    it('isValidTimeZone knows IANA zones and nothing else', () => {
        assert.equal(isValidTimeZone('Europe/Kyiv'), true);
        assert.equal(isValidTimeZone('America/New_York'), true);
        assert.equal(isValidTimeZone('Mars/Olympus'), false);
        assert.equal(isValidTimeZone(''), false);
        assert.equal(isValidTimeZone(null), false);
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `node --test functions/test/unit/time.test.js`
Expected: FAIL — `Error: Cannot find module '../../lib/time'`, итог `ℹ tests 1`, `ℹ fail 1`.

- [ ] **Step 3: Создать `functions/lib/time.js`**

```js
/**
 * Wall-clock ("local") time -> instant for the v2 data contract (CommonJS twin of src/contract/time.js).
 * `local` is "YYYY-MM-DDTHH:mm" without offset; `tz` is an IANA zone.
 * Resolution rules match java.time.ZonedDateTime.of:
 *  - nonexistent local time (spring-forward gap) is shifted forward by the gap length;
 *  - ambiguous local time (fall-back overlap) uses the earlier offset (earlier instant).
 * Checked against contract/fixtures/time.json, the same examples the web and Android use.
 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatters = new Map();

function formatterFor(tz) {
    let fmt = formatters.get(tz);
    if (!fmt) {
        fmt = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
        formatters.set(tz, fmt);
    }
    return fmt;
}

// Wall-clock of `epochMs` in `tz`, encoded as a UTC epoch value (minute precision).
function wallClockMs(epochMs, tz) {
    const parts = formatterFor(tz).formatToParts(new Date(epochMs));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
}

function offsetMs(epochMs, tz) {
    return wallClockMs(epochMs, tz) - Math.floor(epochMs / MINUTE_MS) * MINUTE_MS;
}

/** Parses "YYYY-MM-DDTHH:mm" into calendar fields, or returns null when malformed. */
function parseLocal(local) {
    const m = typeof local === 'string' ? LOCAL_RE.exec(local) : null;
    if (!m) return null;
    const [year, month, day, hour, minute] = m.slice(1).map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day
        || probe.getUTCHours() !== hour || probe.getUTCMinutes() !== minute) {
        return null;
    }
    return { year, month, day, hour, minute };
}

/** True when `tz` is an IANA zone known to this runtime. */
function isValidTimeZone(tz) {
    if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
    try {
        formatterFor(tz);
        return true;
    } catch {
        return false;
    }
}

/** Instant (Date) of a wall-clock `local` time in zone `tz`. Throws on malformed input. */
function toInstant(local, tz) {
    const f = parseLocal(local);
    if (!f) throw new Error(`Invalid local date-time: ${local}`);
    const localMs = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute);
    const before = offsetMs(localMs - DAY_MS, tz);
    const after = offsetMs(localMs + DAY_MS, tz);
    const earlier = localMs - before;
    if (before === after || wallClockMs(earlier, tz) === localMs) return new Date(earlier);
    const later = localMs - after;
    if (wallClockMs(later, tz) === localMs) return new Date(later);
    return new Date(earlier); // gap: java.time shifts forward by the gap length
}

module.exports = { parseLocal, isValidTimeZone, toInstant };
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `node --test functions/test/unit/time.test.js`
Expected: PASS — `ℹ tests 13`, `ℹ pass 13`, `ℹ fail 0`.

- [ ] **Step 5: Включить юнит-тесты в `npm test` функций**

В `functions/package.json` заменить строку

```json
        "test": "TZ=UTC node test-next-notify.js && TZ=UTC node test-tz.js",
```

на

```json
        "test": "node --test test/unit/*.test.js && TZ=UTC node test-next-notify.js && TZ=UTC node test-tz.js",
```

Старые тесты v1 остаются до задачи 6, где удаляется код, который они проверяют.

- [ ] **Step 6: Прогнать тесты функций**

Run: `npm run test:functions`
Expected: код выхода 0; сначала `ℹ pass 13`, `ℹ fail 0`, затем строки `PASS` старых тестов, последняя — `PASS  DST: daily repeat keeps 13:00 local across transition: 2026-10-25T13:00:00`.

- [ ] **Step 7: Проверить линтером**

Run: `npm run lint:functions`
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add functions/lib/time.js functions/test/unit/time.test.js functions/package.json
git commit -F - <<'EOF'
feat(functions): local time to instant for contract v2 on shared fixtures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Расписание задачи — чистые функции

**Files:**
- Create: `functions/lib/schedule.js`
- Test: `functions/test/unit/schedule.test.js`

**Interfaces:**
- Consumes (задача 1): `parseLocal`, `isValidTimeZone`, `toInstant`; `contract/fixtures/tasks.json` (план 0.1).
- Produces: `functions/lib/schedule.js`. «Простая задача» (plain task) — поля документа задачи, где время уже в миллисекундах: `{ status, due: { local, tz } | null, reminders: number[], repeat, title, pulseMuted: boolean, overdueAt: number | null, nextNotifyAt: number | null }`.
  - `REMINDER_MIN` (60), `REMINDER_MAX` (524160), `validReminders(list) → number[]` — допустимые, без повторов, по возрастанию;
  - `dueInstantMs(task) → number | null`; `taskEvents(task) → { type: 'reminder' | 'overdue', at: number, minutes?: number }[]` по возрастанию `at`;
  - `nextEventAfter(task, afterMs) → number | null`; `sameSchedule(a, b) → boolean` (поля `due`, `reminders`, `repeat`, `status`, без учёта порядка ключей);
  - `planTaskWrite(before | null, after, nowMs) → null | { nextNotifyAt?: number | null, overdueAt?: number | null, pulseMuted?: false }` — `null`, если расписание не менялось; `nextNotifyAt: null` значит «удалить поле»;
  - `planSchedulerRun(task, nowMs) → { reminder: number | null, overdue: boolean, nextNotifyAt: number | null }`;
  - `reminderKey(uid, taskId, minutes, due)`, `overdueKey(uid, taskId, due)` — ключи раздела 6 спецификации; `notificationDocId(key)` — id документа (`/` → `%2F`).

- [ ] **Step 1: Написать падающий тест `functions/test/unit/schedule.test.js`**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const taskFixtures = require('../../../contract/fixtures/tasks.json');
const {
    validReminders, dueInstantMs, taskEvents, nextEventAfter, sameSchedule,
    planTaskWrite, planSchedulerRun, reminderKey, overdueKey, notificationDocId,
} = require('../../lib/schedule');

const at = (iso) => Date.parse(iso);
// Due 2026-10-15 12:00 in Berlin (CEST, UTC+2) = 10:00Z; reminders 1 hour and 1 day before.
const DUE = at('2026-10-15T10:00:00.000Z');
const plain = (overrides = {}) => ({
    status: 'active',
    due: { local: '2026-10-15T12:00', tz: 'Europe/Berlin' },
    reminders: [60, 1440],
    repeat: null,
    title: 'Buy milk',
    pulseMuted: false,
    overdueAt: null,
    nextNotifyAt: null,
    ...overrides,
});

describe('validReminders', () => {
    it('keeps whole hours from 1 hour to 52 weeks, unique and ascending', () => {
        assert.deepEqual(validReminders([1440, 60, 60, 524160]), [60, 1440, 524160]);
    });

    it('skips values the rules cannot check (spec 7)', () => {
        assert.deepEqual(validReminders([0, 30, 90, 59.5, -60, 524220, '60', null]), []);
        assert.deepEqual(validReminders(undefined), []);
    });
});

describe('dueInstantMs and taskEvents', () => {
    it('reads due.local in due.tz', () => {
        assert.equal(dueInstantMs(plain()), DUE);
    });

    it('gives no due moment for a missing, malformed or unknown-zone due', () => {
        assert.equal(dueInstantMs(plain({ due: null })), null);
        assert.equal(dueInstantMs(plain({ due: { local: '2026-10-15 12:00', tz: 'Europe/Berlin' } })), null);
        assert.equal(dueInstantMs(plain({ due: { local: '2026-10-15T12:00', tz: 'Mars/Olympus' } })), null);
    });

    it('lists reminders and the overdue moment in time order', () => {
        assert.deepEqual(taskEvents(plain()), [
            { type: 'reminder', at: DUE - 1440 * 60000, minutes: 1440 },
            { type: 'reminder', at: DUE - 60 * 60000, minutes: 60 },
            { type: 'overdue', at: DUE },
        ]);
    });

    it('has no events unless the task is active and has a due moment', () => {
        assert.deepEqual(taskEvents(plain({ status: 'done' })), []);
        assert.deepEqual(taskEvents(plain({ status: 'deleted' })), []);
        assert.deepEqual(taskEvents(plain({ due: null, reminders: [] })), []);
    });

    it('accepts every valid contract task fixture', () => {
        for (const { name, value } of taskFixtures.valid) {
            assert.doesNotThrow(() => taskEvents({ ...value, overdueAt: null, nextNotifyAt: null }), name);
        }
    });
});

describe('nextEventAfter', () => {
    it('is the first event strictly after the given moment', () => {
        assert.equal(nextEventAfter(plain(), at('2026-10-14T09:00:00.000Z')), DUE - 1440 * 60000);
        assert.equal(nextEventAfter(plain(), DUE - 60 * 60000), DUE);
        assert.equal(nextEventAfter(plain(), DUE), null);
    });
});

describe('sameSchedule', () => {
    it('ignores key order and fields outside due, reminders, repeat, status', () => {
        const a = plain({ repeat: { every: 1, unit: 'months', monthDay: 15 } });
        const b = plain({ repeat: { monthDay: 15, unit: 'months', every: 1 }, title: 'Other', nextNotifyAt: 1 });
        assert.equal(sameSchedule(a, b), true);
        assert.equal(sameSchedule(a, plain({ reminders: [60] })), false);
    });
});

describe('planTaskWrite (onTaskWritten)', () => {
    const NOW = at('2026-10-14T08:00:00.000Z'); // before both reminders

    it('schedules a new task at its earliest future event', () => {
        assert.deepEqual(planTaskWrite(null, plain(), NOW), { nextNotifyAt: DUE - 1440 * 60000 });
    });

    it('marks a new task with a past due overdue without scheduling anything', () => {
        const later = DUE + 60000;
        assert.deepEqual(planTaskWrite(null, plain(), later), { overdueAt: later });
    });

    it('does nothing when only server fields or other fields changed', () => {
        assert.equal(planTaskWrite(plain(), plain({ nextNotifyAt: 123, title: 'New title', pulseMuted: true }), NOW), null);
    });

    it('a due change unmutes the pulse and clears overdue when the new due is ahead', () => {
        const before = plain({ due: { local: '2026-10-10T12:00', tz: 'Europe/Berlin' }, overdueAt: 1, pulseMuted: true });
        const after = { ...before, due: plain().due };
        assert.deepEqual(planTaskWrite(before, after, NOW), { pulseMuted: false, overdueAt: null, nextNotifyAt: DUE - 1440 * 60000 });
    });

    it('a due moved into the past keeps an existing overdue mark', () => {
        const before = plain({ overdueAt: 1 });
        const after = { ...before, due: { local: '2026-10-01T12:00', tz: 'Europe/Berlin' } };
        assert.deepEqual(planTaskWrite(before, after, NOW), {});
    });

    it('restoring a task whose due passed marks it overdue silently', () => {
        const before = plain({ status: 'done' });
        const now = DUE + 60000;
        assert.deepEqual(planTaskWrite(before, plain(), now), { overdueAt: now });
    });

    it('a task leaving active loses its nextNotifyAt', () => {
        const before = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planTaskWrite(before, { ...before, status: 'done' }, NOW), { nextNotifyAt: null });
    });
});

describe('planSchedulerRun (scheduleNotifications)', () => {
    it('sends the reminder whose moment is in [nextNotifyAt, now]', () => {
        const task = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE - 60 * 60000 + 30000), { reminder: 60, overdue: false, nextNotifyAt: DUE });
    });

    it('sends only the latest of several reminders that fell into the window', () => {
        const task = plain({ nextNotifyAt: DUE - 1440 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE - 30 * 60000), { reminder: 60, overdue: false, nextNotifyAt: DUE });
    });

    it('sends overdue instead of a stale reminder once the due moment passed', () => {
        const task = plain({ nextNotifyAt: DUE - 60 * 60000 });
        assert.deepEqual(planSchedulerRun(task, DUE + 5 * 60000), { reminder: null, overdue: true, nextNotifyAt: null });
    });

    it('does not send overdue twice', () => {
        const task = plain({ nextNotifyAt: DUE, overdueAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: false, nextNotifyAt: null });
    });

    it('ignores events before nextNotifyAt (they were handled or deliberately skipped)', () => {
        const task = plain({ nextNotifyAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: true, nextNotifyAt: null });
    });

    it('clears nextNotifyAt of a task that is no longer active', () => {
        const task = plain({ status: 'done', nextNotifyAt: DUE });
        assert.deepEqual(planSchedulerRun(task, DUE + 60000), { reminder: null, overdue: false, nextNotifyAt: null });
    });
});

describe('dedup keys', () => {
    const due = { local: '2026-10-15T12:00', tz: 'Europe/Berlin' };

    it('follow spec 6', () => {
        assert.equal(reminderKey('alice', 't1', 60, due), 'reminder:alice:t1:60:2026-10-15T12:00@Europe/Berlin');
        assert.equal(overdueKey('alice', 't1', due), 'overdue:alice:t1:2026-10-15T12:00@Europe/Berlin');
    });

    it('become valid Firestore ids', () => {
        assert.equal(notificationDocId(overdueKey('alice', 't1', due)), 'overdue:alice:t1:2026-10-15T12:00@Europe%2FBerlin');
        assert.equal(notificationDocId('a/b/c').includes('/'), false);
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `node --test functions/test/unit/*.test.js`
Expected: FAIL — `Error: Cannot find module '../../lib/schedule'`, итог `ℹ tests 14`, `ℹ pass 13`, `ℹ fail 1`.

- [ ] **Step 3: Создать `functions/lib/schedule.js`**

```js
/**
 * Notification schedule of a v2 task (spec 4.4, 6). Pure functions over "plain" tasks:
 * the Firestore task fields with Timestamps already turned into epoch milliseconds
 * (`overdueAt`, `nextNotifyAt`: number | null).
 */
const { isValidTimeZone, parseLocal, toInstant } = require('./time');

const MINUTE_MS = 60 * 1000;
const REMINDER_MIN = 60;
const REMINDER_MAX = 524160; // 52 weeks
const SCHEDULE_FIELDS = ['due', 'reminders', 'repeat', 'status'];

/** Valid reminder offsets (whole hours, 1 hour .. 52 weeks), unique, ascending. Others are skipped (spec 7). */
function validReminders(reminders) {
    if (!Array.isArray(reminders)) return [];
    const ok = reminders.filter((m) => Number.isInteger(m) && m >= REMINDER_MIN && m <= REMINDER_MAX && m % 60 === 0);
    return [...new Set(ok)].sort((a, b) => a - b);
}

/** Epoch ms of the task's due moment, or null without a usable `due`. */
function dueInstantMs(task) {
    const due = task && task.due;
    if (!due || !parseLocal(due.local) || !isValidTimeZone(due.tz)) return null;
    return toInstant(due.local, due.tz).getTime();
}

/** Notification events of an active task, ascending by time: reminders D - m and the overdue moment D. */
function taskEvents(task) {
    if (!task || task.status !== 'active') return [];
    const due = dueInstantMs(task);
    if (due === null) return [];
    const events = validReminders(task.reminders).map((minutes) => ({ type: 'reminder', at: due - minutes * MINUTE_MS, minutes }));
    events.push({ type: 'overdue', at: due });
    return events.sort((a, b) => a.at - b.at);
}

/** Time of the first event strictly after `afterMs`, or null when there is none. */
function nextEventAfter(task, afterMs) {
    const next = taskEvents(task).find((e) => e.at > afterMs);
    return next ? next.at : null;
}

// JSON with sorted keys, so equal maps compare equal whatever their key order.
function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value === undefined ? null : value);
}

/** True when both tasks have the same due, reminders, repeat and status. */
function sameSchedule(a, b) {
    return SCHEDULE_FIELDS.every((f) => canonical(a[f]) === canonical(b[f]));
}

/**
 * Server fields to write after a client write (onTaskWritten, spec 6), or null when the
 * schedule did not change (create counts as a change). Values: `nextNotifyAt` ms or null
 * (= delete the field), `overdueAt` ms or null, `pulseMuted` false. Unchanged fields are omitted.
 */
function planTaskWrite(before, after, nowMs) {
    if (!after || (before && sameSchedule(before, after))) return null;
    const updates = {};
    const due = dueInstantMs(after);
    const dueChanged = before !== null && canonical(before.due) !== canonical(after.due);
    let overdueAt = after.overdueAt;
    if (dueChanged && after.pulseMuted) updates.pulseMuted = false;
    if (dueChanged && (due === null || due > nowMs) && overdueAt !== null) {
        overdueAt = null;
        updates.overdueAt = null;
    }
    if (after.status === 'active' && due !== null && due <= nowMs && overdueAt === null) updates.overdueAt = nowMs;
    const next = nextEventAfter(after, nowMs);
    if (next !== after.nextNotifyAt) updates.nextNotifyAt = next;
    return updates;
}

/**
 * What one scheduler pass does with a task whose nextNotifyAt <= now (spec 4.4): events in
 * [nextNotifyAt, now] count; the latest reminder is sent only while the due moment is still
 * ahead; overdue is sent when the due moment is in the window and overdueAt is not set yet.
 */
function planSchedulerRun(task, nowMs) {
    const from = task.nextNotifyAt === null ? nowMs : task.nextNotifyAt;
    const due = dueInstantMs(task);
    const inWindow = taskEvents(task).filter((e) => e.at >= from && e.at <= nowMs);
    const reminders = due !== null && due > nowMs ? inWindow.filter((e) => e.type === 'reminder') : [];
    return {
        reminder: reminders.length > 0 ? reminders[reminders.length - 1].minutes : null,
        overdue: task.overdueAt === null && inWindow.some((e) => e.type === 'overdue'),
        nextNotifyAt: nextEventAfter(task, nowMs),
    };
}

const dueKey = (due) => `${due.local}@${due.tz}`;

/** Dedup keys of spec 6. */
const reminderKey = (uid, taskId, minutes, due) => `reminder:${uid}:${taskId}:${minutes}:${dueKey(due)}`;
const overdueKey = (uid, taskId, due) => `overdue:${uid}:${taskId}:${dueKey(due)}`;

/** Firestore id of a dedup key: "/" (from the zone name) is not allowed in document ids. */
const notificationDocId = (key) => key.replace(/\//g, '%2F');

module.exports = {
    REMINDER_MIN,
    REMINDER_MAX,
    validReminders,
    dueInstantMs,
    taskEvents,
    nextEventAfter,
    sameSchedule,
    planTaskWrite,
    planSchedulerRun,
    reminderKey,
    overdueKey,
    notificationDocId,
};
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `node --test functions/test/unit/*.test.js`
Expected: PASS — `ℹ tests 37`, `ℹ pass 37`, `ℹ fail 0`.

- [ ] **Step 5: Проверить линтером**

Run: `npm run lint:functions`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add functions/lib/schedule.js functions/test/unit/schedule.test.js
git commit -F - <<'EOF'
feat(functions): v2 notification schedule as pure functions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Тексты и сообщения FCM

**Files:**
- Create: `functions/lib/messages.js`
- Modify: `functions/locales/notifications.en.json`, `functions/locales/notifications.uk.json` (заменить целиком)
- Test: `functions/test/unit/messages.test.js`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: `functions/lib/messages.js`:
  - `INVALID_TOKEN_CODES: Set<string>` — `messaging/registration-token-not-registered`, `messaging/invalid-registration-token`;
  - `pickLanguage(settings) → 'en' | 'uk'`; `pickRecipients(devices: { id, fcmToken, notificationsEnabled }[]) → { id, token }[]`;
  - `formatLead(minutes, lang) → string` («1 hour», «2 дні»); `notificationTexts({ type, minutes, taskTitle, lang }) → { title, body }`;
  - `taskUrl(taskId)`; `buildMessages({ type, taskId, taskTitle, minutes, lang, tokens }) → Message[]` — сообщение firebase-admin на каждый токен.
  - Формат сообщения — контракт для веба (подпланы 0.4–0.5) и Android: `data` = `{ type, taskId, title, body, url, minutesBefore? }` (все значения строки), `android: { priority: 'high', ttl: 86400000 }`, `webpush: { headers: { TTL: '86400', Urgency: 'high' }, fcmOptions: { link: url } }`.
  - Тексты: `{ reminder: { title, body }, overdue: { title, body }, units: { hour | day | week: { one, few?, many?, other } } }`, подстановки `{{lead}}`, `{{title}}`, `{{n}}`.

- [ ] **Step 1: Написать падающий тест `functions/test/unit/messages.test.js`**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    INVALID_TOKEN_CODES, pickLanguage, pickRecipients, formatLead, notificationTexts, taskUrl, buildMessages,
} = require('../../lib/messages');

describe('pickLanguage', () => {
    it('uses uk only when settings say uk, en for anything else', () => {
        assert.equal(pickLanguage({ language: 'uk' }), 'uk');
        assert.equal(pickLanguage({ language: 'en' }), 'en');
        assert.equal(pickLanguage({ language: 'ru' }), 'en');
        assert.equal(pickLanguage(null), 'en');
    });
});

describe('pickRecipients', () => {
    it('takes devices with the switch on and a token', () => {
        const devices = [
            { id: 'phone', fcmToken: 'tok-phone', notificationsEnabled: true },
            { id: 'laptop', fcmToken: 'tok-laptop', notificationsEnabled: false },
            { id: 'tablet', fcmToken: null, notificationsEnabled: true },
            { id: 'old', fcmToken: '', notificationsEnabled: true },
        ];
        assert.deepEqual(pickRecipients(devices), [{ id: 'phone', token: 'tok-phone' }]);
    });
});

describe('formatLead', () => {
    it('shows hours, days and weeks in English', () => {
        assert.equal(formatLead(60, 'en'), '1 hour');
        assert.equal(formatLead(180, 'en'), '3 hours');
        assert.equal(formatLead(1440, 'en'), '1 day');
        assert.equal(formatLead(2880, 'en'), '2 days');
        assert.equal(formatLead(10080, 'en'), '1 week');
        assert.equal(formatLead(1500, 'en'), '25 hours');
    });

    it('uses Ukrainian plural forms after "за"', () => {
        assert.equal(formatLead(60, 'uk'), '1 годину');
        assert.equal(formatLead(120, 'uk'), '2 години');
        assert.equal(formatLead(300, 'uk'), '5 годин');
        assert.equal(formatLead(660, 'uk'), '11 годин');
        assert.equal(formatLead(1260, 'uk'), '21 годину');
        assert.equal(formatLead(4320, 'uk'), '3 дні');
        assert.equal(formatLead(7200, 'uk'), '5 днів');
        assert.equal(formatLead(524160, 'uk'), '52 тижні');
    });
});

describe('notificationTexts', () => {
    it('builds reminder and overdue texts with the task title', () => {
        assert.deepEqual(notificationTexts({ type: 'reminder', minutes: 1440, taskTitle: 'Pay bills', lang: 'en' }),
            { title: 'Task reminder', body: '1 day before: Pay bills' });
        assert.deepEqual(notificationTexts({ type: 'reminder', minutes: 60, taskTitle: 'Оплатити рахунки', lang: 'uk' }),
            { title: 'Нагадування про завдання', body: 'За 1 годину до строку: Оплатити рахунки' });
        assert.deepEqual(notificationTexts({ type: 'overdue', taskTitle: 'Pay bills', lang: 'uk' }),
            { title: 'Прострочене завдання!', body: 'Прострочено: Pay bills' });
    });

    it('cuts very long titles to 200 characters', () => {
        const { body } = notificationTexts({ type: 'overdue', taskTitle: '😀'.repeat(1000), lang: 'en' });
        assert.equal(Array.from(body).length, 'Overdue: '.length + 200 + 1);
        assert.equal(body.endsWith('…'), true);
    });
});

describe('buildMessages', () => {
    it('makes one message per token with data, android and webpush blocks', () => {
        const messages = buildMessages({ type: 'reminder', taskId: 't 1', taskTitle: 'Pay bills', minutes: 60, lang: 'en', tokens: ['a', 'b'] });
        assert.equal(messages.length, 2);
        assert.deepEqual(messages[0], {
            token: 'a',
            data: {
                type: 'reminder',
                taskId: 't 1',
                title: 'Task reminder',
                body: '1 hour before: Pay bills',
                url: 'https://pmobile78.github.io/to-round-react/?taskId=t%201',
                minutesBefore: '60',
            },
            android: { priority: 'high', ttl: 86400000 },
            webpush: { headers: { TTL: '86400', Urgency: 'high' }, fcmOptions: { link: 'https://pmobile78.github.io/to-round-react/?taskId=t%201' } },
        });
        assert.equal(messages[1].token, 'b');
    });

    it('has no minutesBefore in an overdue message', () => {
        const [message] = buildMessages({ type: 'overdue', taskId: 't1', taskTitle: 'Pay bills', lang: 'en', tokens: ['a'] });
        assert.equal('minutesBefore' in message.data, false);
        assert.equal(message.data.url, taskUrl('t1'));
    });

    it('treats only dead-token errors as invalid tokens', () => {
        assert.equal(INVALID_TOKEN_CODES.has('messaging/registration-token-not-registered'), true);
        assert.equal(INVALID_TOKEN_CODES.has('messaging/internal-error'), false);
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `node --test functions/test/unit/*.test.js`
Expected: FAIL — `Error: Cannot find module '../../lib/messages'`, итог `ℹ tests 38`, `ℹ pass 37`, `ℹ fail 1`.

- [ ] **Step 3: Заменить тексты уведомлений**

`functions/locales/notifications.en.json` целиком:

```json
{
    "reminder": {
        "title": "Task reminder",
        "body": "{{lead}} before: {{title}}"
    },
    "overdue": {
        "title": "Overdue task!",
        "body": "Overdue: {{title}}"
    },
    "units": {
        "hour": { "one": "{{n}} hour", "other": "{{n}} hours" },
        "day": { "one": "{{n}} day", "other": "{{n}} days" },
        "week": { "one": "{{n}} week", "other": "{{n}} weeks" }
    }
}
```

`functions/locales/notifications.uk.json` целиком (формы стоят в винительном падеже, потому что идут после «За»):

```json
{
    "reminder": {
        "title": "Нагадування про завдання",
        "body": "За {{lead}} до строку: {{title}}"
    },
    "overdue": {
        "title": "Прострочене завдання!",
        "body": "Прострочено: {{title}}"
    },
    "units": {
        "hour": { "one": "{{n}} годину", "few": "{{n}} години", "many": "{{n}} годин", "other": "{{n}} години" },
        "day": { "one": "{{n}} день", "few": "{{n}} дні", "many": "{{n}} днів", "other": "{{n}} дня" },
        "week": { "one": "{{n}} тиждень", "few": "{{n}} тижні", "many": "{{n}} тижнів", "other": "{{n}} тижня" }
    }
}
```

- [ ] **Step 4: Создать `functions/lib/messages.js`**

```js
/**
 * Push messages for v2 notifications (spec 4.4): recipients, language, texts and the FCM payload
 * with `data`, `android` and `webpush` blocks. Pure functions; sending lives in handlers.js.
 */
const en = require('../locales/notifications.en.json');
const uk = require('../locales/notifications.uk.json');

const DICTS = { en, uk };
const HOMEPAGE_URL = 'https://pmobile78.github.io/to-round-react/';
const TTL_SECONDS = 24 * 60 * 60;
const TITLE_MAX = 200;
const HOUR = 60;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** FCM errors that mean the token is dead: the device gets fcmToken = null. */
const INVALID_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);

/** Notification language: settings.language when it is "uk", otherwise "en" (spec 4.4). */
const pickLanguage = (settings) => (settings && settings.language === 'uk' ? 'uk' : 'en');

/** Devices that get notifications: switch on and a token present. */
function pickRecipients(devices) {
    return devices
        .filter((d) => d.notificationsEnabled === true && typeof d.fcmToken === 'string' && d.fcmToken.length > 0)
        .map((d) => ({ id: d.id, token: d.fcmToken }));
}

const fill = (template, vars) => String(template).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));

/** "1 hour", "2 дні", "3 weeks": reminders are whole hours, shown in the largest whole unit. */
function formatLead(minutes, lang) {
    const dict = DICTS[lang] || en;
    let unit = 'hour';
    let n = minutes / HOUR;
    if (minutes % WEEK === 0) {
        unit = 'week';
        n = minutes / WEEK;
    } else if (minutes % DAY === 0) {
        unit = 'day';
        n = minutes / DAY;
    }
    const forms = dict.units[unit];
    return fill(forms[new Intl.PluralRules(lang).select(n)] || forms.other, { n });
}

// Long titles are cut so the payload stays far below FCM's 4 KB limit.
function shortTitle(title) {
    const chars = Array.from(String(title || ''));
    return chars.length > TITLE_MAX ? `${chars.slice(0, TITLE_MAX).join('')}…` : chars.join('');
}

/** Localized notification title and body. */
function notificationTexts({ type, minutes, taskTitle, lang }) {
    const dict = DICTS[lang] || en;
    const title = shortTitle(taskTitle);
    if (type === 'reminder') {
        return { title: dict.reminder.title, body: fill(dict.reminder.body, { lead: formatLead(minutes, lang), title }) };
    }
    return { title: dict.overdue.title, body: fill(dict.overdue.body, { title }) };
}

/** Link that opens the task in the web app. */
const taskUrl = (taskId) => `${HOMEPAGE_URL}?taskId=${encodeURIComponent(taskId)}`;

/** One FCM message per token (spec 4.4: data, android high priority, webpush urgency; TTL one day). */
function buildMessages({ type, taskId, taskTitle, minutes, lang, tokens }) {
    const { title, body } = notificationTexts({ type, minutes, taskTitle, lang });
    const url = taskUrl(taskId);
    const data = { type, taskId: String(taskId), title, body, url };
    if (type === 'reminder') data.minutesBefore = String(minutes);
    return tokens.map((token) => ({
        token,
        data,
        android: { priority: 'high', ttl: TTL_SECONDS * 1000 },
        webpush: { headers: { TTL: String(TTL_SECONDS), Urgency: 'high' }, fcmOptions: { link: url } },
    }));
}

module.exports = {
    INVALID_TOKEN_CODES,
    pickLanguage,
    pickRecipients,
    formatLead,
    notificationTexts,
    taskUrl,
    buildMessages,
};
```

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `node --test functions/test/unit/*.test.js`
Expected: PASS — `ℹ tests 46`, `ℹ pass 46`, `ℹ fail 0`.

- [ ] **Step 6: Проверить линтером**

Run: `npm run lint:functions`
Expected: без ошибок.

- [ ] **Step 7: Commit**

```bash
git add functions/lib/messages.js functions/locales/notifications.en.json functions/locales/notifications.uk.json functions/test/unit/messages.test.js
git commit -F - <<'EOF'
feat(functions): v2 notification texts and FCM messages

Reminder lead time is shown in whole hours, days or weeks with plural
forms (Intl.PluralRules) instead of minutes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Стенд на эмуляторе и проход планировщика

**Files:**
- Modify: `functions/package.json` (скрипт `test:emulator`), `package.json` (скрипт `test:functions`), `eslint.config.js` (`fetch` для `functions/`)
- Create: `functions/test/emulator/helpers.js`
- Test: `functions/test/emulator/scheduler.test.js`
- Create: `functions/lib/handlers.js`

**Interfaces:**
- Consumes (задачи 2 и 3): `planSchedulerRun`, `sameSchedule`, `reminderKey`, `overdueKey`, `notificationDocId`; `INVALID_TOKEN_CODES`, `buildMessages`, `pickLanguage`, `pickRecipients`.
- Produces:
  - `functions/lib/handlers.js`: `toPlainTask(data) → plain task`; `processTask({ db, messaging, uid, snap, lang, recipients, now })`; `runScheduler({ db, messaging, now }) → { tasks: number }`. `db` — Firestore из firebase-admin, `now` — миллисекунды, `messaging` — объект с `sendEach(messages) → Promise<{ responses: { success, error?: { code } }[], successCount, failureCount }>` (как у firebase-admin `Messaging`);
  - стенд `functions/test/emulator/helpers.js`: `db`, `clearFirestore()`, `fakeMessaging(failTokens) → { sent, sendEach }`, `at(iso) → ms`, `ts(iso) → Timestamp`, `DUE` (`'2026-10-15T10:00:00.000Z'`), `task(overrides)` — задача v2 в форме Firestore (срок 2026-10-15 12:00 Europe/Berlin, напоминания `[60, 1440]`), `seedAlice()` — пользователь `alice` с языком `uk` и тремя устройствами, из которых сообщения должен получать только `phone`;
  - команды: `npm --prefix functions run test:emulator`; корневой `npm run test:functions` гоняет юнит-тесты и тесты на эмуляторе.

- [ ] **Step 1: Добавить скрипт `test:emulator` в `functions/package.json`**

Сразу после строки

```json
        "test": "node --test test/unit/*.test.js && TZ=UTC node test-next-notify.js && TZ=UTC node test-tz.js",
```

вставить строку

```json
        "test:emulator": "firebase emulators:exec --only firestore --project demo-to-round \"node --test --test-concurrency=1 test/emulator/*.test.js\"",
```

`firebase` находит `firebase.json`, поднимаясь из `functions/` к корню, и берёт настройки эмулятора оттуда. `--test-concurrency=1` нужен, потому что все файлы работают с одной базой эмулятора.

- [ ] **Step 2: Включить тесты на эмуляторе в корневой `test:functions`**

В корневом `package.json` заменить строку

```json
    "test:functions": "npm --prefix functions test",
```

на

```json
    "test:functions": "npm --prefix functions test && npm --prefix functions run test:emulator",
```

- [ ] **Step 3: Разрешить `fetch` линтеру в `functions/`**

В `eslint.config.js`, в блоке `files: ['functions/**/*.js']`, сразу после строки

```js
                Buffer: 'readonly',
```

вставить строку

```js
                fetch: 'readonly',
```

Стенд очищает эмулятор запросом `fetch` (встроен в Node 18+).

- [ ] **Step 4: Создать стенд `functions/test/emulator/helpers.js`**

```js
/**
 * Shared setup for the functions tests on the Firestore emulator (`npm run test:emulator`,
 * started by `firebase emulators:exec`, which sets FIRESTORE_EMULATOR_HOST).
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const PROJECT_ID = 'demo-to-round';
const app = initializeApp({ projectId: PROJECT_ID }, 'emulator-tests');
const db = getFirestore(app);

/** Removes every document from the emulator database. */
async function clearFirestore() {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    if (!host) throw new Error('FIRESTORE_EMULATOR_HOST is not set: run through npm run test:emulator');
    const res = await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`clearFirestore: HTTP ${res.status}`);
}

/** Stand-in for firebase-admin messaging: records messages, fails the tokens listed in failTokens. */
function fakeMessaging(failTokens = {}) {
    const sent = [];
    return {
        sent,
        async sendEach(messages) {
            const responses = messages.map((m) => {
                sent.push(m);
                const code = failTokens[m.token];
                return code ? { success: false, error: { code } } : { success: true, messageId: `m${sent.length}` };
            });
            const successCount = responses.filter((r) => r.success).length;
            return { responses, successCount, failureCount: responses.length - successCount };
        },
    };
}

const at = (iso) => Date.parse(iso);
const ts = (iso) => Timestamp.fromMillis(Date.parse(iso));

// Due 2026-10-15 12:00 in Berlin (CEST, UTC+2) = 10:00Z.
const DUE = '2026-10-15T10:00:00.000Z';

/** A v2 task in Firestore form. */
const task = (overrides = {}) => ({
    schemaVersion: 2,
    title: 'Buy milk',
    description: '',
    categoryId: null,
    status: 'active',
    due: { local: '2026-10-15T12:00', tz: 'Europe/Berlin' },
    reminders: [60, 1440],
    repeat: null,
    radius: 45,
    pulseMuted: false,
    overdueAt: null,
    createdAt: ts('2026-10-01T08:00:00.000Z'),
    updatedAt: ts('2026-10-01T08:00:00.000Z'),
    deletedAt: null,
    ...overrides,
});

/** users/alice with Ukrainian notifications and three devices: only "phone" should get messages. */
async function seedAlice() {
    await db.doc('users/alice').set({ schemaVersion: 2, settings: { language: 'uk' } });
    await db.doc('users/alice/devices/phone').set({ platform: 'android', fcmToken: 'tok-phone', notificationsEnabled: true });
    await db.doc('users/alice/devices/laptop').set({ platform: 'web', fcmToken: 'tok-laptop', notificationsEnabled: false });
    await db.doc('users/alice/devices/tablet').set({ platform: 'web', fcmToken: null, notificationsEnabled: true });
}

module.exports = { db, clearFirestore, fakeMessaging, at, ts, DUE, task, seedAlice };
```

- [ ] **Step 5: Написать падающий тест `functions/test/emulator/scheduler.test.js`**

```js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { processTask, runScheduler } = require('../../lib/handlers');
const { db, clearFirestore, fakeMessaging, at, ts, DUE, task, seedAlice } = require('./helpers');

const REMINDER_60 = '2026-10-15T09:00:00.000Z';

beforeEach(async () => {
    await clearFirestore();
    await seedAlice();
});

describe('scheduleNotifications', () => {
    it('sends the due reminder once, in the user language, only to enabled devices with a token', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });

        assert.deepEqual(messaging.sent.map((m) => m.token), ['tok-phone']);
        assert.deepEqual(messaging.sent[0].data, {
            type: 'reminder',
            taskId: 't1',
            title: 'Нагадування про завдання',
            body: 'За 1 годину до строку: Buy milk',
            url: 'https://pmobile78.github.io/to-round-react/?taskId=t1',
            minutesBefore: '60',
        });
        const after = (await db.doc('users/alice/tasks/t1').get()).data();
        assert.equal(after.nextNotifyAt.toMillis(), at(DUE));
        const key = await db.doc('notification-sent/reminder:alice:t1:60:2026-10-15T12:00@Europe%2FBerlin').get();
        assert.equal(key.exists, true);
    });

    it('never sends the same reminder twice', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        await db.doc('users/alice/tasks/t1').update({ nextNotifyAt: ts(REMINDER_60) });
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 40000 });
        assert.equal(messaging.sent.length, 1);
    });

    it('notifies overdue once and marks the task when the due moment passes', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(DUE) }));
        const messaging = fakeMessaging();
        const now = at(DUE) + 20000;
        await runScheduler({ db, messaging, now });

        assert.equal(messaging.sent.length, 1);
        assert.equal(messaging.sent[0].data.type, 'overdue');
        assert.equal(messaging.sent[0].data.body, 'Прострочено: Buy milk');
        const after = (await db.doc('users/alice/tasks/t1').get()).data();
        assert.equal(after.overdueAt.toMillis(), now);
        assert.equal('nextNotifyAt' in after, false);
    });

    it('sends overdue, not a stale reminder, after a late run', async () => {
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging();
        await runScheduler({ db, messaging, now: at(DUE) + 5 * 60000 });
        assert.deepEqual(messaging.sent.map((m) => m.data.type), ['overdue']);
    });

    it('clears the token of a device FCM no longer knows, keeps it on other errors', async () => {
        await db.doc('users/alice/devices/watch').set({ platform: 'android', fcmToken: 'tok-watch', notificationsEnabled: true });
        await db.doc('users/alice/tasks/t1').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const messaging = fakeMessaging({
            'tok-phone': 'messaging/registration-token-not-registered',
            'tok-watch': 'messaging/internal-error',
        });
        await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal((await db.doc('users/alice/devices/phone').get()).get('fcmToken'), null);
        assert.equal((await db.doc('users/alice/devices/watch').get()).get('fcmToken'), 'tok-watch');
    });

    it('ignores "tasks" collections outside users/{uid}', async () => {
        await db.doc('user-mindmaps/bob/maps/m1/tasks/x').set(task({ nextNotifyAt: ts(REMINDER_60) }));
        await db.doc('users/bob/devices/phone').set({ platform: 'android', fcmToken: 'tok-bob', notificationsEnabled: true });
        const messaging = fakeMessaging();
        const result = await runScheduler({ db, messaging, now: at(REMINDER_60) + 30000 });
        assert.equal(result.tasks, 0);
        assert.equal(messaging.sent.length, 0);
    });

    it('does not overwrite server fields when the user changed the schedule during the pass', async () => {
        const ref = db.doc('users/alice/tasks/t1');
        await ref.set(task({ nextNotifyAt: ts(REMINDER_60) }));
        const stale = await ref.get();
        await ref.update({ due: { local: '2026-10-20T12:00', tz: 'Europe/Berlin' }, nextNotifyAt: ts('2026-10-19T10:00:00.000Z') });
        await processTask({ db, messaging: fakeMessaging(), uid: 'alice', snap: stale, lang: 'uk', recipients: [], now: at(REMINDER_60) + 30000 });
        assert.equal((await ref.get()).get('nextNotifyAt').toMillis(), at('2026-10-19T10:00:00.000Z'));
    });
});
```

- [ ] **Step 6: Убедиться, что тест падает**

Run: `npm --prefix functions run test:emulator`
Expected: FAIL — `Error: Cannot find module '../../lib/handlers'`, итог `ℹ tests 1`, `ℹ fail 1`.

- [ ] **Step 7: Создать `functions/lib/handlers.js`**

```js
/**
 * Firestore side of the v2 Cloud Functions (spec 4.4, 6). Every handler gets its dependencies
 * (`db`, `messaging`, `now` in epoch ms) as arguments, so the emulator tests run them directly.
 */
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const {
    planSchedulerRun, sameSchedule, reminderKey, overdueKey, notificationDocId,
} = require('./schedule');
const { INVALID_TOKEN_CODES, buildMessages, pickLanguage, pickRecipients } = require('./messages');


const msOf = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : null);

/** Firestore task data -> plain task for schedule.js (Timestamps as epoch ms). */
function toPlainTask(data) {
    return {
        status: data.status,
        due: data.due === undefined ? null : data.due,
        reminders: Array.isArray(data.reminders) ? data.reminders : [],
        repeat: data.repeat === undefined ? null : data.repeat,
        title: typeof data.title === 'string' ? data.title : '',
        pulseMuted: data.pulseMuted === true,
        overdueAt: msOf(data.overdueAt),
        nextNotifyAt: msOf(data.nextNotifyAt),
    };
}

// Only users/{uid}/tasks/{taskId}: a collection group query also sees any other "tasks" collection.
const isUserTaskRef = (ref) => ref.parent.id === 'tasks' && ref.parent.parent !== null
    && ref.parent.parent.parent.id === 'users';

const serverMs = (ms) => (ms === null ? FieldValue.delete() : Timestamp.fromMillis(ms));

/** Claims a dedup key; false when another run already sent this notification. */
async function claimKey(db, key, now) {
    try {
        await db.collection('notification-sent').doc(notificationDocId(key)).create({ sentAt: Timestamp.fromMillis(now) });
        return true;
    } catch (e) {
        if (e && (e.code === 6 || String(e.code).toUpperCase().includes('ALREADY_EXISTS'))) return false;
        throw e;
    }
}

/** Sends one notification to the user's devices; dead tokens get fcmToken = null. */
async function sendToRecipients({ db, messaging, uid, recipients, message }) {
    if (recipients.length === 0) return 0;
    const messages = buildMessages({ ...message, tokens: recipients.map((r) => r.token) });
    const result = await messaging.sendEach(messages);
    await Promise.all(result.responses.map((response, i) => {
        if (response.success || !INVALID_TOKEN_CODES.has(response.error && response.error.code)) return null;
        return db.doc(`users/${uid}/devices/${recipients[i].id}`).update({ fcmToken: null }).catch(() => null);
    }));
    return result.successCount;
}

/** One scheduler pass over one due task (spec 4.4). */
async function processTask({ db, messaging, uid, snap, lang, recipients, now }) {
    const task = toPlainTask(snap.data());
    const plan = planSchedulerRun(task, now);
    const message = { taskId: snap.id, taskTitle: task.title, lang };
    try {
        if (plan.overdue && await claimKey(db, overdueKey(uid, snap.id, task.due), now)) {
            await sendToRecipients({ db, messaging, uid, recipients, message: { ...message, type: 'overdue' } });
        } else if (plan.reminder !== null && await claimKey(db, reminderKey(uid, snap.id, plan.reminder, task.due), now)) {
            await sendToRecipients({ db, messaging, uid, recipients, message: { ...message, type: 'reminder', minutes: plan.reminder } });
        }
    } catch (e) {
        console.error('scheduleNotifications: send failed', uid, snap.id, e);
    }
    // Server fields are written only if the task still has the schedule this pass worked from.
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(snap.ref);
        if (!fresh.exists) return;
        const current = toPlainTask(fresh.data());
        if (!sameSchedule(current, task) || current.nextNotifyAt !== task.nextNotifyAt) return;
        const updates = { nextNotifyAt: serverMs(plan.nextNotifyAt) };
        if (plan.overdue && current.overdueAt === null) updates.overdueAt = Timestamp.fromMillis(now);
        tx.update(snap.ref, updates);
    });
}

/** scheduleNotifications: every active task with nextNotifyAt <= now, grouped by user. */
async function runScheduler({ db, messaging, now }) {
    const snap = await db.collectionGroup('tasks')
        .where('status', '==', 'active')
        .where('nextNotifyAt', '<=', Timestamp.fromMillis(now))
        .orderBy('nextNotifyAt')
        .get();
    const byUser = new Map();
    for (const doc of snap.docs) {
        if (!isUserTaskRef(doc.ref)) continue;
        const uid = doc.ref.parent.parent.id;
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid).push(doc);
    }
    await Promise.all([...byUser].map(async ([uid, docs]) => {
        try {
            const [userSnap, devicesSnap] = await Promise.all([
                db.doc(`users/${uid}`).get(),
                db.collection(`users/${uid}/devices`).get(),
            ]);
            const lang = pickLanguage(userSnap.exists ? userSnap.get('settings') : null);
            const recipients = pickRecipients(devicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            for (const doc of docs) {
                try {
                    await processTask({ db, messaging, uid, snap: doc, lang, recipients, now });
                } catch (e) {
                    console.error('scheduleNotifications: task failed', uid, doc.id, e);
                }
            }
        } catch (e) {
            console.error('scheduleNotifications: user failed', uid, e);
        }
    }));
    return { tasks: [...byUser.values()].reduce((n, docs) => n + docs.length, 0) };
}

module.exports = {
    toPlainTask,
    processTask,
    runScheduler,
};
```

- [ ] **Step 8: Убедиться, что тесты проходят**

Run: `npm --prefix functions run test:emulator`
Expected: PASS — `ℹ tests 7`, `ℹ pass 7`, `ℹ fail 0`.

- [ ] **Step 9: Прогнать все тесты функций и линтер**

Run: `npm run test:functions && npm run lint:functions`
Expected: код выхода 0; юнит-тесты `ℹ pass 46`, строки `PASS` старых тестов, тесты на эмуляторе `ℹ pass 7`; линтер без ошибок.

- [ ] **Step 10: Commit**

```bash
git add functions/package.json package.json eslint.config.js functions/test/emulator/helpers.js functions/test/emulator/scheduler.test.js functions/lib/handlers.js
git commit -F - <<'EOF'
feat(functions): v2 notification scheduler with Firestore emulator tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Триггер задачи, каскад категорий, корзина и чистка ключей

**Files:**
- Test: `functions/test/emulator/triggers.test.js`, `functions/test/emulator/maintenance.test.js`
- Modify: `functions/lib/handlers.js` (заменить целиком)

**Interfaces:**
- Consumes (задачи 2 и 4): `planTaskWrite`, `sameSchedule`; `toPlainTask`, стенд `helpers.js`.
- Produces (дополнительно к задаче 4) в `functions/lib/handlers.js`:
  - `handleTaskWritten({ db, ref, before, after, now }) → plan | null` — `before`/`after` — данные документа или `null`;
  - `clearDeletedCategory({ db, uid, categoryId }) → number` — сколько задач осталось без категории;
  - `purgeDeletedTasks({ db, now }) → number` — сколько задач удалено;
  - `cleanupNotificationSent({ db, now }) → number` — сколько ключей удалено.

- [ ] **Step 1: Написать падающие тесты**

`functions/test/emulator/triggers.test.js`:

```js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { handleTaskWritten } = require('../../lib/handlers');
const { db, clearFirestore, at, ts, DUE, task } = require('./helpers');

const ref = () => db.doc('users/alice/tasks/t1');
const NOW = at('2026-10-14T08:00:00.000Z'); // before both reminders of the default task

// Writes `data` as the client would and runs the trigger with the given before-state.
async function write(before, data, now = NOW) {
    await ref().set(data);
    await handleTaskWritten({ db, ref: ref(), before, after: data, now });
    return (await ref().get()).data();
}

beforeEach(async () => {
    await clearFirestore();
});

describe('onTaskWritten', () => {
    it('schedules a new task at its earliest future event', async () => {
        const after = await write(null, task());
        assert.equal(after.nextNotifyAt.toMillis(), at('2026-10-14T10:00:00.000Z'));
        assert.equal(after.overdueAt, null);
    });

    it('marks a task created with a past due as overdue silently, with nothing to schedule', async () => {
        const now = at(DUE) + 60000;
        const after = await write(null, task(), now);
        assert.equal(after.overdueAt.toMillis(), now);
        assert.equal('nextNotifyAt' in after, false);
    });

    it('a new due unmutes the pulse and clears the overdue mark', async () => {
        const before = task({ due: { local: '2026-10-01T12:00', tz: 'Europe/Berlin' }, pulseMuted: true, overdueAt: ts('2026-10-01T10:00:00.000Z') });
        await ref().set(before);
        const after = await write(before, { ...before, due: task().due });
        assert.equal(after.pulseMuted, false);
        assert.equal(after.overdueAt, null);
        assert.equal(after.nextNotifyAt.toMillis(), at('2026-10-14T10:00:00.000Z'));
    });

    it('changes nothing when only the title or server fields changed', async () => {
        const before = task({ nextNotifyAt: ts('2026-10-14T10:00:00.000Z') });
        await ref().set(before);
        const plan = await handleTaskWritten({ db, ref: ref(), before, after: { ...before, title: 'Oat milk' }, now: NOW });
        assert.equal(plan, null);
    });

    it('a finished task loses nextNotifyAt', async () => {
        const before = task({ nextNotifyAt: ts('2026-10-14T10:00:00.000Z') });
        await ref().set(before);
        const after = await write(before, { ...before, status: 'done' });
        assert.equal('nextNotifyAt' in after, false);
    });

    it('skips a stale event when the schedule changed again before the write', async () => {
        const first = task();
        await ref().set({ ...first, reminders: [60] });
        await handleTaskWritten({ db, ref: ref(), before: null, after: first, now: NOW });
        assert.equal('nextNotifyAt' in (await ref().get()).data(), false);
    });
});
```

`functions/test/emulator/maintenance.test.js`:

```js
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { clearDeletedCategory, purgeDeletedTasks, cleanupNotificationSent } = require('../../lib/handlers');
const { db, clearFirestore, at, ts, task } = require('./helpers');

const NOW = at('2026-10-15T03:00:00.000Z');
const daysAgo = (n) => ts(new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString());

beforeEach(async () => {
    await clearFirestore();
});

describe('onCategoryDeleted', () => {
    it('leaves the tasks of the deleted category without a category, nothing else', async () => {
        await db.doc('users/alice/tasks/a').set(task({ categoryId: 'home' }));
        await db.doc('users/alice/tasks/b').set(task({ categoryId: 'work' }));
        await db.doc('users/bob/tasks/c').set(task({ categoryId: 'home' }));
        assert.equal(await clearDeletedCategory({ db, uid: 'alice', categoryId: 'home' }), 1);
        assert.equal((await db.doc('users/alice/tasks/a').get()).get('categoryId'), null);
        assert.equal((await db.doc('users/alice/tasks/b').get()).get('categoryId'), 'work');
        assert.equal((await db.doc('users/bob/tasks/c').get()).get('categoryId'), 'home');
    });
});

describe('purgeDeletedTasks', () => {
    it('removes tasks that stayed in the trash for more than 30 days', async () => {
        await db.doc('users/alice/tasks/old').set(task({ status: 'deleted', deletedAt: daysAgo(31) }));
        await db.doc('users/alice/tasks/recent').set(task({ status: 'deleted', deletedAt: daysAgo(29) }));
        await db.doc('users/alice/tasks/active').set(task());
        assert.equal(await purgeDeletedTasks({ db, now: NOW }), 1);
        assert.equal((await db.doc('users/alice/tasks/old').get()).exists, false);
        assert.equal((await db.doc('users/alice/tasks/recent').get()).exists, true);
        assert.equal((await db.doc('users/alice/tasks/active').get()).exists, true);
    });
});

describe('cleanupNotificationSent', () => {
    it('drops dedup keys older than 7 days', async () => {
        await db.doc('notification-sent/old').set({ sentAt: daysAgo(8) });
        await db.doc('notification-sent/fresh').set({ sentAt: daysAgo(6) });
        assert.equal(await cleanupNotificationSent({ db, now: NOW }), 1);
        assert.equal((await db.doc('notification-sent/old').get()).exists, false);
        assert.equal((await db.doc('notification-sent/fresh').get()).exists, true);
    });
});
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `npm --prefix functions run test:emulator`
Expected: FAIL — `ℹ tests 16`, `ℹ pass 7`, `ℹ fail 9`; ошибки `TypeError: … is not a function` у `handleTaskWritten`, `clearDeletedCategory`, `purgeDeletedTasks`, `cleanupNotificationSent`.

- [ ] **Step 3: Заменить `functions/lib/handlers.js` целиком**

Добавлены: импорт `planTaskWrite`, константы корзины и ключей, `deleteInBatches`, четыре обработчика и их экспорт; код задачи 4 не изменился.

```js
/**
 * Firestore side of the v2 Cloud Functions (spec 4.4, 6). Every handler gets its dependencies
 * (`db`, `messaging`, `now` in epoch ms) as arguments, so the emulator tests run them directly.
 */
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const {
    planSchedulerRun, planTaskWrite, sameSchedule, reminderKey, overdueKey, notificationDocId,
} = require('./schedule');
const { INVALID_TOKEN_CODES, buildMessages, pickLanguage, pickRecipients } = require('./messages');

const BATCH_LIMIT = 450;
const DAY_MS = 24 * 60 * 60 * 1000;
const TRASH_DAYS = 30;
const SENT_KEEP_DAYS = 7;

const msOf = (value) => (value && typeof value.toMillis === 'function' ? value.toMillis() : null);

/** Firestore task data -> plain task for schedule.js (Timestamps as epoch ms). */
function toPlainTask(data) {
    return {
        status: data.status,
        due: data.due === undefined ? null : data.due,
        reminders: Array.isArray(data.reminders) ? data.reminders : [],
        repeat: data.repeat === undefined ? null : data.repeat,
        title: typeof data.title === 'string' ? data.title : '',
        pulseMuted: data.pulseMuted === true,
        overdueAt: msOf(data.overdueAt),
        nextNotifyAt: msOf(data.nextNotifyAt),
    };
}

// Only users/{uid}/tasks/{taskId}: a collection group query also sees any other "tasks" collection.
const isUserTaskRef = (ref) => ref.parent.id === 'tasks' && ref.parent.parent !== null
    && ref.parent.parent.parent.id === 'users';

const serverMs = (ms) => (ms === null ? FieldValue.delete() : Timestamp.fromMillis(ms));

async function deleteInBatches(db, refs) {
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }
}

/** Claims a dedup key; false when another run already sent this notification. */
async function claimKey(db, key, now) {
    try {
        await db.collection('notification-sent').doc(notificationDocId(key)).create({ sentAt: Timestamp.fromMillis(now) });
        return true;
    } catch (e) {
        if (e && (e.code === 6 || String(e.code).toUpperCase().includes('ALREADY_EXISTS'))) return false;
        throw e;
    }
}

/** Sends one notification to the user's devices; dead tokens get fcmToken = null. */
async function sendToRecipients({ db, messaging, uid, recipients, message }) {
    if (recipients.length === 0) return 0;
    const messages = buildMessages({ ...message, tokens: recipients.map((r) => r.token) });
    const result = await messaging.sendEach(messages);
    await Promise.all(result.responses.map((response, i) => {
        if (response.success || !INVALID_TOKEN_CODES.has(response.error && response.error.code)) return null;
        return db.doc(`users/${uid}/devices/${recipients[i].id}`).update({ fcmToken: null }).catch(() => null);
    }));
    return result.successCount;
}

/** One scheduler pass over one due task (spec 4.4). */
async function processTask({ db, messaging, uid, snap, lang, recipients, now }) {
    const task = toPlainTask(snap.data());
    const plan = planSchedulerRun(task, now);
    const message = { taskId: snap.id, taskTitle: task.title, lang };
    try {
        if (plan.overdue && await claimKey(db, overdueKey(uid, snap.id, task.due), now)) {
            await sendToRecipients({ db, messaging, uid, recipients, message: { ...message, type: 'overdue' } });
        } else if (plan.reminder !== null && await claimKey(db, reminderKey(uid, snap.id, plan.reminder, task.due), now)) {
            await sendToRecipients({ db, messaging, uid, recipients, message: { ...message, type: 'reminder', minutes: plan.reminder } });
        }
    } catch (e) {
        console.error('scheduleNotifications: send failed', uid, snap.id, e);
    }
    // Server fields are written only if the task still has the schedule this pass worked from.
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(snap.ref);
        if (!fresh.exists) return;
        const current = toPlainTask(fresh.data());
        if (!sameSchedule(current, task) || current.nextNotifyAt !== task.nextNotifyAt) return;
        const updates = { nextNotifyAt: serverMs(plan.nextNotifyAt) };
        if (plan.overdue && current.overdueAt === null) updates.overdueAt = Timestamp.fromMillis(now);
        tx.update(snap.ref, updates);
    });
}

/** scheduleNotifications: every active task with nextNotifyAt <= now, grouped by user. */
async function runScheduler({ db, messaging, now }) {
    const snap = await db.collectionGroup('tasks')
        .where('status', '==', 'active')
        .where('nextNotifyAt', '<=', Timestamp.fromMillis(now))
        .orderBy('nextNotifyAt')
        .get();
    const byUser = new Map();
    for (const doc of snap.docs) {
        if (!isUserTaskRef(doc.ref)) continue;
        const uid = doc.ref.parent.parent.id;
        if (!byUser.has(uid)) byUser.set(uid, []);
        byUser.get(uid).push(doc);
    }
    await Promise.all([...byUser].map(async ([uid, docs]) => {
        try {
            const [userSnap, devicesSnap] = await Promise.all([
                db.doc(`users/${uid}`).get(),
                db.collection(`users/${uid}/devices`).get(),
            ]);
            const lang = pickLanguage(userSnap.exists ? userSnap.get('settings') : null);
            const recipients = pickRecipients(devicesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            for (const doc of docs) {
                try {
                    await processTask({ db, messaging, uid, snap: doc, lang, recipients, now });
                } catch (e) {
                    console.error('scheduleNotifications: task failed', uid, doc.id, e);
                }
            }
        } catch (e) {
            console.error('scheduleNotifications: user failed', uid, e);
        }
    }));
    return { tasks: [...byUser.values()].reduce((n, docs) => n + docs.length, 0) };
}

/** onTaskWritten: keeps nextNotifyAt, overdueAt and pulseMuted in step with the schedule (spec 6). */
async function handleTaskWritten({ db, ref, before, after, now }) {
    if (!after) return null;
    const afterTask = toPlainTask(after);
    const plan = planTaskWrite(before ? toPlainTask(before) : null, afterTask, now);
    if (!plan || Object.keys(plan).length === 0) return null;
    await db.runTransaction(async (tx) => {
        const fresh = await tx.get(ref);
        if (!fresh.exists || !sameSchedule(toPlainTask(fresh.data()), afterTask)) return;
        const updates = {};
        if ('nextNotifyAt' in plan) updates.nextNotifyAt = serverMs(plan.nextNotifyAt);
        if ('overdueAt' in plan) updates.overdueAt = plan.overdueAt === null ? null : Timestamp.fromMillis(plan.overdueAt);
        if ('pulseMuted' in plan) updates.pulseMuted = plan.pulseMuted;
        tx.update(ref, updates);
    });
    return plan;
}

/** onCategoryDeleted: tasks of the deleted category become uncategorized. */
async function clearDeletedCategory({ db, uid, categoryId }) {
    const snap = await db.collection(`users/${uid}/tasks`).where('categoryId', '==', categoryId).get();
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.update(d.ref, { categoryId: null }));
        await batch.commit();
    }
    return snap.size;
}

/** purgeDeletedTasks: removes tasks that have been in the trash for more than 30 days. */
async function purgeDeletedTasks({ db, now }) {
    const snap = await db.collectionGroup('tasks')
        .where('status', '==', 'deleted')
        .where('deletedAt', '<=', Timestamp.fromMillis(now - TRASH_DAYS * DAY_MS))
        .get();
    const refs = snap.docs.map((d) => d.ref).filter(isUserTaskRef);
    await deleteInBatches(db, refs);
    return refs.length;
}

/** cleanupNotificationSent: drops dedup keys older than 7 days. */
async function cleanupNotificationSent({ db, now }) {
    const snap = await db.collection('notification-sent')
        .where('sentAt', '<=', Timestamp.fromMillis(now - SENT_KEEP_DAYS * DAY_MS))
        .get();
    await deleteInBatches(db, snap.docs.map((d) => d.ref));
    return snap.size;
}

module.exports = {
    toPlainTask,
    processTask,
    runScheduler,
    handleTaskWritten,
    clearDeletedCategory,
    purgeDeletedTasks,
    cleanupNotificationSent,
};
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm --prefix functions run test:emulator`
Expected: PASS — `ℹ tests 16`, `ℹ pass 16`, `ℹ fail 0`.

- [ ] **Step 5: Проверить линтером**

Run: `npm run lint:functions`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add functions/test/emulator/triggers.test.js functions/test/emulator/maintenance.test.js functions/lib/handlers.js
git commit -F - <<'EOF'
feat(functions): task trigger, category cascade, trash purge and key cleanup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: `index.js` на v2, удаление кода v1, документация

**Files:**
- Test: `functions/test/emulator/exports.test.js`
- Modify: `functions/index.js` (заменить целиком)
- Delete: `functions/test-next-notify.js`, `functions/test-tz.js`
- Modify: `functions/package.json`, `functions/package-lock.json` (скрипт `test`, удаление `date-fns`, `@date-fns/tz`)
- Modify: `docs/notifications.md` (заменить целиком), `CLAUDE.md`

**Interfaces:**
- Consumes (задачи 4 и 5): `runScheduler`, `handleTaskWritten`, `clearDeletedCategory`, `purgeDeletedTasks`, `cleanupNotificationSent`.
- Produces: экспорт `functions/index.js` для подплана 0.7 (выкатка): `scheduleNotifications` (`* * * * *`), `onTaskWritten` (`users/{uid}/tasks/{taskId}`), `onCategoryDeleted` (`users/{uid}/categories/{categoryId}`), `purgeDeletedTasks` (`0 3 * * *`, UTC), `cleanupNotificationSent` (`0 * * * *`); `scheduleDueDateNotifications` и `maintainNextNotifyAt` в коде больше нет — при выкатке 0.7 их удалит `firebase deploy`.

- [ ] **Step 1: Написать падающий тест `functions/test/emulator/exports.test.js`**

```js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fns = require('../../index');

const schedule = (fn) => fn.__endpoint.scheduleTrigger.schedule;
const eventPath = (fn) => fn.__endpoint.eventTrigger.eventFilterPathPatterns.document;

describe('index.js', () => {
    it('exports exactly the v2 functions (the v1 notifier and trigger are gone)', () => {
        assert.deepEqual(Object.keys(fns).sort(), [
            'cleanupNotificationSent', 'onCategoryDeleted', 'onTaskWritten', 'purgeDeletedTasks', 'scheduleNotifications',
        ]);
    });

    it('runs everything in europe-west1', () => {
        for (const fn of Object.values(fns)) assert.deepEqual(fn.__endpoint.region, ['europe-west1']);
    });

    it('uses crontab schedules: notifier every minute, purge daily, cleanup hourly', () => {
        assert.equal(schedule(fns.scheduleNotifications), '* * * * *');
        assert.equal(schedule(fns.purgeDeletedTasks), '0 3 * * *');
        assert.equal(schedule(fns.cleanupNotificationSent), '0 * * * *');
    });

    it('listens to v2 task writes and category deletes', () => {
        assert.equal(eventPath(fns.onTaskWritten), 'users/{uid}/tasks/{taskId}');
        assert.equal(fns.onTaskWritten.__endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.written');
        assert.equal(eventPath(fns.onCategoryDeleted), 'users/{uid}/categories/{categoryId}');
        assert.equal(fns.onCategoryDeleted.__endpoint.eventTrigger.eventType, 'google.cloud.firestore.document.v1.deleted');
    });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm --prefix functions run test:emulator`
Expected: FAIL — `ℹ tests 20`, `ℹ pass 16`, `ℹ fail 4`; падают все четыре теста `index.js` (сейчас он экспортирует функции v1).

- [ ] **Step 3: Заменить `functions/index.js` целиком**

```js
/**
 * Cloud Functions for data contract v2 (spec docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md,
 * sections 4.4 and 6). This file only wires triggers to lib/handlers.js.
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentWritten, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const handlers = require('./lib/handlers');

initializeApp();
const db = getFirestore();
const messaging = getMessaging();
const REGION = 'europe-west1';

// Every minute: reminders and overdue notifications of tasks whose nextNotifyAt has come.
exports.scheduleNotifications = onSchedule({ schedule: '* * * * *', region: REGION, maxInstances: 10 }, async () => {
    await handlers.runScheduler({ db, messaging, now: Date.now() });
});

// Any client write of a task: keeps nextNotifyAt, overdueAt and pulseMuted in step with its schedule.
exports.onTaskWritten = onDocumentWritten({ document: 'users/{uid}/tasks/{taskId}', region: REGION, maxInstances: 10 }, async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    await handlers.handleTaskWritten({ db, ref: event.data.after.ref, before, after, now: Date.now() });
});

// A deleted category leaves its tasks without a category.
exports.onCategoryDeleted = onDocumentDeleted({ document: 'users/{uid}/categories/{categoryId}', region: REGION }, async (event) => {
    await handlers.clearDeletedCategory({ db, uid: event.params.uid, categoryId: event.params.categoryId });
});

// Daily: tasks in the trash for more than 30 days are deleted for good.
exports.purgeDeletedTasks = onSchedule({ schedule: '0 3 * * *', timeZone: 'Etc/UTC', region: REGION, maxInstances: 1 }, async () => {
    await handlers.purgeDeletedTasks({ db, now: Date.now() });
});

// Hourly: dedup keys older than 7 days are dropped.
exports.cleanupNotificationSent = onSchedule({ schedule: '0 * * * *', region: REGION, maxInstances: 1 }, async () => {
    await handlers.cleanupNotificationSent({ db, now: Date.now() });
});
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm --prefix functions run test:emulator`
Expected: PASS — `ℹ tests 20`, `ℹ pass 20`, `ℹ fail 0`.

- [ ] **Step 5: Удалить тесты v1 и оставить в `npm test` только юнит-тесты**

Run: `git rm functions/test-next-notify.js functions/test-tz.js`

В `functions/package.json` заменить строку

```json
        "test": "node --test test/unit/*.test.js && TZ=UTC node test-next-notify.js && TZ=UTC node test-tz.js",
```

на

```json
        "test": "node --test test/unit/*.test.js",
```

- [ ] **Step 6: Удалить библиотеки дат из функций**

Сначала убедиться, что ни один worktree не берёт `functions/node_modules` основного checkout'а через симлинк (иначе удаление сломает тесты той сессии):

Run: `find .claude/worktrees -maxdepth 3 -path '*/functions/node_modules' -type l 2>/dev/null`
Expected: пустой вывод. Если вывод не пустой — остановиться и спросить пользователя.

Run: `npm --prefix functions uninstall date-fns @date-fns/tz`, затем `git diff functions/package.json` и `grep -rln "date-fns" functions --include=*.js --exclude-dir=node_modules`
Expected: в `dependencies` остались только `firebase-admin` и `firebase-functions` (плюс правка скрипта `test` из шага 5); `grep` ничего не печатает.

- [ ] **Step 7: Прогнать тесты функций и линтер**

Run: `npm run test:functions && npm run lint:functions`
Expected: код выхода 0; юнит-тесты `ℹ tests 46`, `ℹ pass 46`; тесты на эмуляторе `ℹ tests 20`, `ℹ pass 20`; строк `PASS` старых тестов больше нет; линтер без ошибок.

- [ ] **Step 8: Commit**

```bash
git add functions/index.js functions/test/emulator/exports.test.js functions/package.json functions/package-lock.json
git commit -F - <<'EOF'
feat(functions): wire the v2 functions, drop the v1 notifier and date libraries

scheduleDueDateNotifications and maintainNextNotifyAt are gone from the
code; the deploy of sub-plan 0.7 removes them from production.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 9: Заменить `docs/notifications.md` целиком**

````markdown
# Уведомления: напоминания и просрочка (контракт данных v2)

> Здесь описаны Cloud Functions ветки `stage-0-data-contract-v2`. В проде до переезда
> (подплан 0.7) работают функции v1 на `user-bubbles`; их описание — в версии этого файла
> в `main` (`git show main:docs/notifications.md`).

Спецификация: [разделы 4.4 и 6](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md).

## Что делает система

- Напоминает о задаче за заданное время до срока (часы, дни, недели) и сообщает о просрочке.
- Срок хранится как местное время и зона (`due.local`, `due.tz`); момент срока сервер считает
  так же, как веб и Android: все проверяются на общих примерах `contract/fixtures/time.json`.
- Повторяющиеся задачи сервер не переносит: следующий срок по «Готово» записывает клиент.
- Уведомления получают устройства пользователя с включённым переключателем и токеном FCM;
  язык — `settings.language` (`uk`, иначе `en`).

## Где живёт код

| Файл | Что внутри |
|---|---|
| `functions/index.js` | только подключение функций к триггерам и расписаниям |
| `functions/lib/time.js` | местное время + зона → момент (правила `java.time.ZonedDateTime.of`) |
| `functions/lib/schedule.js` | события задачи, `nextNotifyAt`, решения планировщика и триггера, ключи дедупликации |
| `functions/lib/messages.js` | получатели, язык, тексты, сообщение FCM |
| `functions/lib/handlers.js` | Firestore: проход планировщика, триггер, каскад категорий, корзина, чистка ключей |
| `functions/locales/notifications.{en,uk}.json` | тексты и формы единиц времени |

## Данные, которые читает и пишет сервер

- Задача `users/{uid}/tasks/{taskId}`: сервер читает `status`, `due`, `reminders`, `repeat`,
  `title`; пишет только служебные поля `nextNotifyAt`, `overdueAt`, `pulseMuted` и
  `categoryId = null` при удалении категории. `updatedAt` сервер не трогает.
- Устройство `users/{uid}/devices/{deviceId}`: сервер читает `notificationsEnabled` и
  `fcmToken`; при «мёртвом» токене пишет `fcmToken = null`.
- Документ пользователя `users/{uid}`: сервер читает `settings.language`.
- `notification-sent/{key}`: ключи дедупликации; правила закрывают коллекцию для клиентов.

## События и `nextNotifyAt`

События активной задачи со сроком D: напоминание в момент D − m для каждого m из `reminders`
(кратно 60, от 60 до 524 160 минут; остальные значения сервер пропускает) и просрочка в
момент D. У задачи без срока, с неразборчивым `due.local` или неизвестной зоной событий нет.

`nextNotifyAt` — момент ближайшего события позже текущего. Планировщик раз в минуту берёт
только задачи с `nextNotifyAt <= now` (индекс collectionGroup `tasks`: `status` +
`nextNotifyAt`) и не читает всю базу.

## Функции

| Функция | Запуск | Что делает |
|---|---|---|
| `scheduleNotifications` | каждую минуту, `* * * * *` | проход планировщика |
| `onTaskWritten` | запись `users/{uid}/tasks/{taskId}` | служебные поля после смены расписания |
| `onCategoryDeleted` | удаление `users/{uid}/categories/{categoryId}` | `categoryId = null` у задач этой категории |
| `purgeDeletedTasks` | раз в сутки, `0 3 * * *` UTC | удаляет задачи, пролежавшие в корзине больше 30 дней (индекс `status` + `deletedAt`) |
| `cleanupNotificationSent` | каждый час, `0 * * * *` | удаляет ключи дедупликации старше 7 дней |

Регион всех функций — `europe-west1`.

### Проход планировщика

Для каждой задачи с `nextNotifyAt <= now` учитываются только события в промежутке
[`nextNotifyAt`, `now`]:

- **Просрочка:** момент D в промежутке и `overdueAt == null` → уведомление «просрочено» и
  `overdueAt = now`.
- **Напоминание:** самое позднее из попавших в промежуток — и только пока срок не наступил.
  Если планировщик опоздал и D уже прошёл, устаревшее напоминание не отправляется.
- После прохода `nextNotifyAt` = ближайшее событие позже `now`; событий нет — поле удаляется.
- Служебные поля пишутся в транзакции, заново прочитав задачу: если пользователь за время
  прохода изменил расписание, запись пропускается — новое расписание обработает триггер.
- Из collectionGroup `tasks` берутся только документы `users/{uid}/tasks/{taskId}`.

### Триггер `onTaskWritten`

Срабатывает на любую запись задачи, но действует, только если задача создана или изменились
`due`, `reminders`, `repeat` или `status`:

- `nextNotifyAt` = ближайшее событие строго позже текущего момента; прошлые события не
  уведомляются;
- активная задача с прошедшим сроком и `overdueAt == null` молча получает `overdueAt` — так
  перенос данных и «вернуть из выполненных» не рассылают старые уведомления;
- при смене `due`: `pulseMuted = false`, а `overdueAt = null`, если новый срок в будущем или
  срока нет.

Триггер пишет только служебные поля, поэтому его собственная запись расписание не меняет и
повторно ничего не делает. Запись тоже идёт в транзакции и пропускается, если расписание успело
измениться ещё раз.

### Дедупликация

Перед отправкой сервер атомарно создаёт документ-ключ в `notification-sent` (`create()`
падает, если ключ уже есть):

- `reminder:{uid}:{taskId}:{m}:{due.local}@{due.tz}`;
- `overdue:{uid}:{taskId}:{due.local}@{due.tz}`.

В id документа `/` из названия зоны записан как `%2F` (`Europe%2FKyiv`): Firestore не
допускает `/` в id. Новый срок даёт новые ключи, поэтому повторяющаяся задача получает
уведомления на каждый срок.

## Сообщение

Одно сообщение FCM на каждый токен:

- `data`: `type` (`reminder` или `overdue`), `taskId`, `title`, `body`,
  `url` = `https://pmobile78.github.io/to-round-react/?taskId=<id>`, у напоминаний ещё
  `minutesBefore`;
- `android`: `priority: high`, TTL — сутки;
- `webpush`: заголовки `TTL: 86400` и `Urgency: high`, `fcmOptions.link = url`.

Тексты лежат в `functions/locales`: «За 1 годину до строку: …», «2 days before: …»,
«Прострочено: …». Время до срока — в самых крупных целых единицах (часы, дни, недели) с
формами множественного числа (`Intl.PluralRules`). Название задачи в тексте обрезается до
200 символов, чтобы сообщение не упёрлось в лимит FCM 4 КБ.

Ошибки FCM `messaging/registration-token-not-registered` и
`messaging/invalid-registration-token` означают мёртвый токен: устройству ставится
`fcmToken = null`. При остальных ошибках токен остаётся.

## Тайминг расписания: `every N` vs `*/N`

`onSchedule` принимает и App Engine-синтаксис (`every N minutes`), и unix-cron. `every N`
отсчитывается от деплоя и конца прошлого запуска и «плавает» (`13:03 → 13:08…`), cron
`*/N * * * *` срабатывает строго кратно N от начала часа. Все функции здесь на cron; при
переходе на запуск реже минуты — только `*/N * * * *`. Источник:
[Cloud Scheduler — cron format](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules).

## Тесты

- `npm --prefix functions test` — юнит-тесты `node:test` (`functions/test/unit`): время на
  общих примерах `contract/fixtures/time.json`, расписание, тексты и сообщения.
- `npm --prefix functions run test:emulator` — тесты на эмуляторе Firestore
  (`firebase emulators:exec`, порт 8180, проект `demo-to-round`): обработчики из
  `lib/handlers.js` с поддельной отправкой FCM и проверка экспорта `index.js`. Нужны Java 21+
  и Firebase CLI 15+.
- Обе команды входят в `npm run test:functions`, а значит в `npm run test:all` и
  `npm run verify`.

## Эксплуатация

> ⚠️ Из ветки `stage-0-data-contract-v2` до переезда (подплан 0.7) `firebase deploy` не
> запускать: правила Firestore и функции там уже под формат v2 и сломают прод-веб v1.
> Срочные правки прод-функций — из `main`. Порядок выкатки v2 описывает подплан 0.7.

### Диагностика

`firebase functions:log --only scheduleNotifications` — функции пишут в лог только ошибки
(`console.error`).

- **Уведомления молчат** → у активной задачи есть `nextNotifyAt`? у устройства
  `notificationsEnabled == true` и есть `fcmToken`? индексы **Enabled**?
- **`FAILED_PRECONDITION ... requires an index`** → индекс ещё строится или не задеплоен.
- **Задачи из «дыры»** (функция не работала) не теряются: их `nextNotifyAt <= now`, придёт
  самое позднее событие, дедупликация не задвоит.

### Локальный эмулятор

`firebase emulators:start --only functions,firestore` поднимает триггеры (`onTaskWritten`,
`onCategoryDeleted`) — видно, как пересчитывается `nextNotifyAt`. Функции по расписанию в
эмуляторе сами не запускаются; их логику проверяют тесты на эмуляторе, вызывая обработчики
напрямую.

## Подводные камни

- `Timestamp` и `FieldValue` импортируются модульно, из `firebase-admin/firestore`: через
  `admin.firestore.*` в эмуляторе функций получается `undefined`.
- Админ-SDK обходит правила Firestore, поэтому сервер пишет только служебные поля и не трогает
  остальное.
- Подколлекция `tasks` где-то кроме `users/{uid}` попадает в collectionGroup-запрос — сервер
  её отбрасывает (`isUserTaskRef` в `lib/handlers.js`).
````

- [ ] **Step 10: Обновить `CLAUDE.md`**

В дереве файлов заменить строки

```
  index.js                   # Cloud Functions Gen2: scheduled notifier + nextNotifyAt trigger
  test-next-notify.js        # unit tests for pure scheduler functions
```

на

```
  index.js                   # Cloud Functions Gen2 (contract v2): wiring of the five functions only
  lib/                       # time.js, schedule.js, messages.js (pure) + handlers.js (Firestore side)
  test/unit/                 # node:test unit tests (time on contract/fixtures/time.json)
  test/emulator/             # node:test on the Firestore emulator (handlers with a fake FCM sender)
```

Заменить абзац

```
The scheduled Cloud Function reads tasks **only** from the subcollection via an indexed `collectionGroup('bubbles')` query on `nextNotifyAt`; the legacy `bubbles[]` array is not read by server logic. See [docs/notifications.md](docs/notifications.md).
```

на

```
On branch `stage-0-data-contract-v2` the Cloud Functions read v2 tasks via an indexed `collectionGroup('tasks')` query (`status` + `nextNotifyAt`), only under `users/{uid}/tasks`; production keeps the v1 functions on `user-bubbles` until sub-plan 0.7. See [docs/notifications.md](docs/notifications.md).
```

Заменить раздел от строки `` `functions/index.js` exports **three** functions (region `europe-west1`): `` до строки `- Locales `en` and `uk`; `ru` → `en` fallback` включительно на

```
`functions/index.js` exports **five** functions (region `europe-west1`; data contract v2, in production only after sub-plan 0.7):
- `scheduleNotifications` — `onSchedule` every minute (`* * * * *`); active tasks with `nextNotifyAt <= now` get FCM **reminder** / **overdue** on the user's devices with `notificationsEnabled` and a token, in `settings.language`; dedups via `notification-sent`
- `onTaskWritten` — `onDocumentWritten` on `users/{uid}/tasks/{taskId}`; keeps `nextNotifyAt`, `overdueAt` (silent overdue) and `pulseMuted` in step with the task's schedule
- `onCategoryDeleted` — `onDocumentDeleted` on `users/{uid}/categories/{categoryId}`; sets `categoryId = null` on that category's tasks
- `purgeDeletedTasks` — `onSchedule` daily (`0 3 * * *`, UTC); deletes tasks in the trash for more than 30 days
- `cleanupNotificationSent` — `onSchedule` hourly (`0 * * * *`); trims `notification-sent` entries older than 7 days
- Logic lives in `functions/lib/`; locales `en` and `uk`, anything else → `en`
```

- [ ] **Step 11: Полная проверка**

Run: `npm run verify`
Expected: код выхода 0; веб — `Tests  460 passed (460)`; функции — юнит `ℹ pass 46`, эмулятор `ℹ pass 20`; правила — `Tests  88 passed (88)`; линтер без ошибок.

- [ ] **Step 12: Commit**

```bash
git add docs/notifications.md CLAUDE.md
git commit -F - <<'EOF'
docs(functions): notifications design for data contract v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
