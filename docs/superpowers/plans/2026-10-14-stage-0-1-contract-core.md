# Этап 0.1: ядро контракта данных v2 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать вебу проверенную библиотеку контракта v2 — пересчёт часовых поясов, расчёт следующего повтора, перевод старых описаний в Markdown, проверку формата записей и перевод записей v1 → v2 — плюс общие примеры данных в `contract/`, по которым потом проверяются функции и Android.

**Architecture:** Папка `contract/` в корне репозитория хранит только данные: палитру и примеры (fixtures) в JSON. Реализация для веба — чистые функции без Firebase и React в `src/contract/`. Каждый модуль тестируется на примерах из `contract/fixtures/`. Ожидаемые значения времени и повторов сверены с независимой реализацией на `java.time` — это эталон и для будущего Android-приложения.

**Tech Stack:** JavaScript (ES2020), Vitest 4 + happy-dom, `Intl.DateTimeFormat`, `DOMParser`. Новых npm-зависимостей нет.

**Spec:** [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../specs/2026-10-14-stage-0-data-contract-v2-design.md) — разделы 3, 4.2, 4.3, 5, 9.2, 11. Обзор всех подпланов этапа 0 — [2026-10-14-stage-0-overview.md](2026-10-14-stage-0-overview.md).

## Global Constraints

- Работа идёт в ветке `stage-0-data-contract-v2` (спецификация уже закоммичена, `0221e9f`). В `main` не коммитить.
- Новых npm-зависимостей не добавлять: часовые пояса — через `Intl.DateTimeFormat`, разбор HTML — через `DOMParser`.
- Синтаксис — ES2020 (ESLint проекта: `ecmaVersion: 2020`): без `??=`, без разделителей в числах (`100_000`), без полей классов. Стиль: 4 пробела, одинарные кавычки, точки с запятой.
- `due.local` — строка `YYYY-MM-DDTHH:mm`; момент срока — `local`, понятое в зоне `tz`; правила переходов — как `java.time.ZonedDateTime.of` (несуществующее время сдвигается вперёд на длину перехода, неоднозначное — с более ранним смещением).
- `reminders` — минуты до срока: кратны 60, от 60 до 524 160, без повторов, по возрастанию, не больше 10. `repeat.unit` — `hours | days | weeks | months`; `weekdays` — ISO 1 = пн … 7 = вс, только для `weeks`; `monthDay` 1–31 обязательно для `months`.
- `radius` 30–80, по умолчанию 45. `title` — 1–1000 символов после обрезки пробелов; `description` — до 100 000 символов. Категория: `name` 1–100 символов, `color` — один из 20 цветов `contract/palette.json`.
- Примеры в `contract/fixtures/` читают и функции, и Android: только JSON, моменты — ISO-строки с `Z`, никаких значений, понятных только JavaScript.
- Каждая задача заканчивается зелёными тестами своего файла и чистым `npm run lint`; последняя — полным `npm run verify`.

## Review Focus

- **Зона, которой не знает браузер** (например, старый браузер без `Europe/Kyiv`): `isValidTimeZone` возвращает `false`, а `toInstant` бросает `RangeError`, а не выдаёт неверное время. Тест — в задаче 1.
- **Ежечасный повтор, просроченный на годы:** следующий раз находится сразу, без упора в предохранитель шагов. Пример `hourly-overdue-for-twenty-years` — в задаче 2.
- **localStorage бросает исключение** (заблокированное хранилище, приватный режим): перенос настроек даёт значения по умолчанию, а не падает. Тест — в задаче 5.
- **Больше 20 старых категорий или цвета вне палитры:** лишние категории отбрасываются с пометкой, неверный цвет никогда не попадает в результат. Тест — в задаче 5.
- **Старые метки времени в виде объектов Firestore `Timestamp`, а не ISO-строк:** исходное время сохраняется. Тест — в задаче 5.

## Структура файлов

| Файл | Ответственность |
|---|---|
| `contract/README.md` | что лежит в папке контракта и кто это читает |
| `contract/palette.json` | 20 цветов категорий |
| `contract/fixtures/time.json` | примеры «местное время + зона ↔ момент» |
| `contract/fixtures/recurrence.json` | примеры следующего повтора |
| `contract/fixtures/markdown-v1.json` | примеры перевода описаний в Markdown |
| `contract/fixtures/tasks.json`, `categories.json`, `settings.json` | правильные и неправильные записи |
| `contract/fixtures/migration-v1.json` | примеры перевода записей v1 → v2 |
| `src/contract/time.js` | пересчёт местного времени и моментов по зоне |
| `src/contract/recurrence.js` | следующий раз повторяющейся задачи |
| `src/contract/markdown.js` | HTML TipTap и простой текст → Markdown |
| `src/contract/schema.js` | константы, ограничения и настройки по умолчанию |
| `src/contract/validate.js` | проверка задач, категорий и настроек |
| `src/contract/migrateV1.js` | перевод задач, категорий и настроек v1 → v2 |
| `src/hooks/tagColors.js` | (изменение) палитра берётся из `contract/palette.json` |

---

### Task 1: Папка контракта и пересчёт часовых поясов

**Files:**
- Create: `contract/README.md`
- Create: `contract/fixtures/time.json`
- Create: `src/contract/time.js`
- Test: `src/contract/time.test.js`

**Interfaces:**
- Consumes: ничего.
- Produces (`src/contract/time.js`):
  - `parseLocal(local: string): { year, month (1–12), day, hour, minute } | null` — `null` для неверного формата и несуществующих дат;
  - `formatLocal(fields): string` — обратно в `YYYY-MM-DDTHH:mm`;
  - `isValidTimeZone(tz): boolean`;
  - `toInstant(local: string, tz: string): Date` — бросает `Error` на неверный `local` и `RangeError` на незнакомую зону;
  - `toLocal(instant: Date | number, tz: string): string`;
  - `deviceTimeZone(): string` — зона устройства, при сбое `'UTC'`.

- [ ] **Step 1: Создать `contract/README.md`**

```markdown
# contract/ — общий контракт данных v2

Спецификация: [docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md](../docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md).

Папка общая для всех клиентов: веба (реализация — `src/contract/`), Cloud Functions и Android-приложения. Кода здесь нет — только данные, по которым каждый клиент проверяет свою реализацию.

| Файл | Что внутри | Кто читает |
|---|---|---|
| `palette.json` | 20 цветов категорий | веб, Android |
| `fixtures/time.json` | «местное время + зона → момент» и обратно, включая переходы на летнее время | веб, функции, Android |
| `fixtures/recurrence.json` | «срок, повтор, now → следующий срок» | веб, Android |
| `fixtures/tasks.json`, `fixtures/categories.json`, `fixtures/settings.json` | правильные и неправильные записи в форме бэкапа | веб, Android |
| `fixtures/markdown-v1.json` | старые описания (HTML TipTap и простой текст) → Markdown | веб |
| `fixtures/migration-v1.json` | старые записи v1 → v2 | веб |

Правила:

- Момент времени — ISO 8601 в UTC с `Z`. Местное время — `YYYY-MM-DDTHH:mm`.
- Эталон правил часовых поясов — `java.time.ZonedDateTime.of`: несуществующее время сдвигается вперёд на длину перехода, неоднозначное берётся с более ранним смещением.
- В примерах с переходом на летнее время используются зоны со стабильными правилами (`America/New_York`, `Europe/Berlin`), а не `Europe/Kyiv`: правила Украины могут измениться в базе tzdata.
- Изменили пример — прогоните тесты всех клиентов, которые его читают.
```

- [ ] **Step 2: Создать примеры `contract/fixtures/time.json`**

```json
{
  "toInstant": [
    { "name": "new-york-winter", "local": "2026-01-15T09:00", "tz": "America/New_York", "instant": "2026-01-15T14:00:00.000Z" },
    { "name": "new-york-summer", "local": "2026-07-01T09:00", "tz": "America/New_York", "instant": "2026-07-01T13:00:00.000Z" },
    { "name": "new-york-spring-gap-shifts-forward", "local": "2026-03-08T02:30", "tz": "America/New_York", "instant": "2026-03-08T07:30:00.000Z" },
    { "name": "new-york-fall-overlap-takes-earlier-offset", "local": "2026-11-01T01:30", "tz": "America/New_York", "instant": "2026-11-01T05:30:00.000Z" },
    { "name": "berlin-spring-gap-shifts-forward", "local": "2026-03-29T02:30", "tz": "Europe/Berlin", "instant": "2026-03-29T01:30:00.000Z" },
    { "name": "berlin-fall-overlap-takes-earlier-offset", "local": "2026-10-25T02:30", "tz": "Europe/Berlin", "instant": "2026-10-25T00:30:00.000Z" },
    { "name": "kolkata-half-hour-offset", "local": "2026-10-14T09:00", "tz": "Asia/Kolkata", "instant": "2026-10-14T03:30:00.000Z" },
    { "name": "utc", "local": "2026-10-14T09:00", "tz": "UTC", "instant": "2026-10-14T09:00:00.000Z" },
    { "name": "new-york-year-boundary", "local": "2026-12-31T23:59", "tz": "America/New_York", "instant": "2027-01-01T04:59:00.000Z" },
    { "name": "berlin-leap-day", "local": "2028-02-29T12:00", "tz": "Europe/Berlin", "instant": "2028-02-29T11:00:00.000Z" }
  ],
  "toLocal": [
    { "name": "new-york-first-pass-of-repeated-hour", "instant": "2026-11-01T05:30:00.000Z", "tz": "America/New_York", "local": "2026-11-01T01:30" },
    { "name": "new-york-second-pass-of-repeated-hour", "instant": "2026-11-01T06:30:00.000Z", "tz": "America/New_York", "local": "2026-11-01T01:30" },
    { "name": "berlin-after-spring-gap", "instant": "2026-03-29T01:30:00.000Z", "tz": "Europe/Berlin", "local": "2026-03-29T03:30" },
    { "name": "kolkata", "instant": "2026-10-14T03:30:00.000Z", "tz": "Asia/Kolkata", "local": "2026-10-14T09:00" }
  ]
}
```

- [ ] **Step 3: Написать падающий тест `src/contract/time.test.js`**

```js
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/time.json';
import { toInstant, toLocal, parseLocal, isValidTimeZone } from './time';

describe('toInstant (contract fixtures)', () => {
    it.each(fixtures.toInstant)('$name', ({ local, tz, instant }) => {
        expect(toInstant(local, tz).toISOString()).toBe(instant);
    });
});

describe('toLocal (contract fixtures)', () => {
    it.each(fixtures.toLocal)('$name', ({ instant, tz, local }) => {
        expect(toLocal(new Date(instant), tz)).toBe(local);
    });
});

describe('toInstant with a zone this runtime does not know', () => {
    it('throws instead of guessing a time', () => {
        expect(() => toInstant('2026-10-14T09:00', 'Mars/Olympus')).toThrow(RangeError);
    });
});

describe('parseLocal', () => {
    it('parses a valid wall-clock value', () => {
        expect(parseLocal('2026-10-14T09:05')).toEqual({ year: 2026, month: 10, day: 14, hour: 9, minute: 5 });
    });

    it('rejects malformed and impossible values', () => {
        expect(parseLocal('2026-02-30T09:00')).toBeNull();
        expect(parseLocal('2026-10-14T24:00')).toBeNull();
        expect(parseLocal('2026-10-14T09:00:00')).toBeNull();
        expect(parseLocal('2026-10-14 09:00')).toBeNull();
        expect(parseLocal(null)).toBeNull();
    });
});

describe('isValidTimeZone', () => {
    it('accepts IANA zones and rejects anything else', () => {
        expect(isValidTimeZone('Europe/Kyiv')).toBe(true);
        expect(isValidTimeZone('UTC')).toBe(true);
        expect(isValidTimeZone('Mars/Olympus')).toBe(false);
        expect(isValidTimeZone('')).toBe(false);
        expect(isValidTimeZone(null)).toBe(false);
    });
});
```

- [ ] **Step 4: Убедиться, что тест падает**

Run: `npx vitest run src/contract/time.test.js`
Expected: FAIL — `Failed to resolve import "./time" from "src/contract/time.test.js"`.

- [ ] **Step 5: Написать `src/contract/time.js`**

```js
/**
 * Wall-clock ("local") time <-> instant conversion for the v2 data contract.
 * `local` is "YYYY-MM-DDTHH:mm" without offset; `tz` is an IANA zone.
 * Resolution rules match java.time.ZonedDateTime.of:
 *  - nonexistent local time (spring-forward gap) is shifted forward by the gap length;
 *  - ambiguous local time (fall-back overlap) uses the earlier offset (earlier instant).
 */

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const formatters = new Map();

const formatterFor = (tz) => {
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
};

// Wall-clock of `epochMs` in `tz`, encoded as a UTC epoch value (minute precision).
const wallClockMs = (epochMs, tz) => {
    const parts = formatterFor(tz).formatToParts(new Date(epochMs));
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
};

const offsetMs = (epochMs, tz) => wallClockMs(epochMs, tz) - Math.floor(epochMs / MINUTE_MS) * MINUTE_MS;

/** Parses "YYYY-MM-DDTHH:mm" into calendar fields, or returns null when malformed. */
export const parseLocal = (local) => {
    const m = typeof local === 'string' ? LOCAL_RE.exec(local) : null;
    if (!m) return null;
    const [year, month, day, hour, minute] = m.slice(1).map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day
        || probe.getUTCHours() !== hour || probe.getUTCMinutes() !== minute) {
        return null;
    }
    return { year, month, day, hour, minute };
};

/** Formats calendar fields (month 1-12) as "YYYY-MM-DDTHH:mm". */
export const formatLocal = ({ year, month, day, hour, minute }) => {
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
};

/** True when `tz` is an IANA zone known to this runtime. */
export const isValidTimeZone = (tz) => {
    if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
    try {
        formatterFor(tz);
        return true;
    } catch {
        return false;
    }
};

/** Instant (Date) of a wall-clock `local` time in zone `tz`. Throws on malformed input. */
export const toInstant = (local, tz) => {
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
};

/** Wall-clock "YYYY-MM-DDTHH:mm" of an instant (Date or epoch ms) in zone `tz`. */
export const toLocal = (instant, tz) => {
    const ms = wallClockMs(instant instanceof Date ? instant.getTime() : instant, tz);
    const d = new Date(ms);
    return formatLocal({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        hour: d.getUTCHours(),
        minute: d.getUTCMinutes(),
    });
};

/** IANA zone of this device, falling back to "UTC". */
export const deviceTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
};
```

- [ ] **Step 6: Убедиться, что тест проходит**

Run: `npx vitest run src/contract/time.test.js`
Expected: PASS — `Tests  18 passed (18)`.

- [ ] **Step 7: Проверить линтером**

Run: `npm run lint`
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add contract/README.md contract/fixtures/time.json src/contract/time.js src/contract/time.test.js
git commit -F - <<'EOF'
feat(contract): add v2 contract folder and time-zone conversion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Следующий раз повторяющейся задачи

**Files:**
- Create: `contract/fixtures/recurrence.json`
- Create: `src/contract/recurrence.js`
- Test: `src/contract/recurrence.test.js`

**Interfaces:**
- Consumes (из задачи 1): `parseLocal`, `formatLocal`, `toInstant`, `toLocal` из `src/contract/time.js`.
- Produces (`src/contract/recurrence.js`):
  - `stepOccurrence(local: string, tz: string, repeat): string` — один шаг повтора; бросает `Error` на неизвестную единицу и неверный `local`;
  - `nextFutureOccurrence(local: string, tz: string, repeat, now: Date): string` — первый раз строго позже `now` (это и есть действие «Готово» у повторяющейся задачи, спецификация 4.3).
  - `repeat` = `{ every, unit: 'hours' | 'days' | 'weeks' | 'months', weekdays?: number[], monthDay?: number }`.

- [ ] **Step 1: Создать примеры `contract/fixtures/recurrence.json`**

```json
[
  { "name": "daily-next-day", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "days" }, "now": "2026-10-14T10:00:00.000Z", "expected": "2026-10-15T09:00" },
  { "name": "daily-skips-missed-days", "due": { "local": "2026-10-10T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "days" }, "now": "2026-10-14T10:00:00.000Z", "expected": "2026-10-15T09:00" },
  { "name": "done-before-due-moves-one-step", "due": { "local": "2026-10-20T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "days" }, "now": "2026-10-14T10:00:00.000Z", "expected": "2026-10-21T09:00" },
  { "name": "every-2-days", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 2, "unit": "days" }, "now": "2026-10-14T08:00:00.000Z", "expected": "2026-10-16T09:00" },
  { "name": "hours-equal-to-now-is-not-future", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 3, "unit": "hours" }, "now": "2026-10-14T10:00:00.000Z", "expected": "2026-10-14T15:00" },
  { "name": "hours-into-spring-gap", "due": { "local": "2026-03-08T01:30", "tz": "America/New_York" }, "repeat": { "every": 1, "unit": "hours" }, "now": "2026-03-08T06:45:00.000Z", "expected": "2026-03-08T03:30" },
  { "name": "hours-into-first-pass-of-fall-overlap", "due": { "local": "2026-11-01T00:30", "tz": "America/New_York" }, "repeat": { "every": 1, "unit": "hours" }, "now": "2026-11-01T04:45:00.000Z", "expected": "2026-11-01T01:30" },
  { "name": "hourly-overdue-for-twenty-years", "due": { "local": "2006-01-01T00:00", "tz": "UTC" }, "repeat": { "every": 1, "unit": "hours" }, "now": "2026-10-14T10:30:00.000Z", "expected": "2026-10-14T11:00" },
  { "name": "hours-skip-second-pass-of-fall-overlap", "due": { "local": "2026-11-01T01:30", "tz": "America/New_York" }, "repeat": { "every": 1, "unit": "hours" }, "now": "2026-11-01T05:45:00.000Z", "expected": "2026-11-01T02:30" },
  { "name": "days-onto-nonexistent-time-stored-as-is", "due": { "local": "2026-03-07T02:30", "tz": "America/New_York" }, "repeat": { "every": 1, "unit": "days" }, "now": "2026-03-07T08:00:00.000Z", "expected": "2026-03-08T02:30" },
  { "name": "days-after-gap-keeps-wall-time", "due": { "local": "2026-03-08T02:30", "tz": "America/New_York" }, "repeat": { "every": 1, "unit": "days" }, "now": "2026-03-08T08:00:00.000Z", "expected": "2026-03-09T02:30" },
  { "name": "weekly-plain", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "weeks" }, "now": "2026-10-14T08:00:00.000Z", "expected": "2026-10-21T09:00" },
  { "name": "weekly-empty-weekdays-acts-plain", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "weeks", "weekdays": [] }, "now": "2026-10-14T08:00:00.000Z", "expected": "2026-10-21T09:00" },
  { "name": "weekdays-later-same-week", "due": { "local": "2026-10-14T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "weeks", "weekdays": [1, 3, 5] }, "now": "2026-10-14T08:00:00.000Z", "expected": "2026-10-16T09:00" },
  { "name": "weekdays-wrap-to-next-cycle-every-2", "due": { "local": "2026-10-16T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 2, "unit": "weeks", "weekdays": [1, 5] }, "now": "2026-10-16T08:00:00.000Z", "expected": "2026-10-26T09:00" },
  { "name": "weekdays-due-day-not-in-list", "due": { "local": "2026-10-13T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "weeks", "weekdays": [3] }, "now": "2026-10-13T08:00:00.000Z", "expected": "2026-10-14T09:00" },
  { "name": "weekdays-sunday-is-7", "due": { "local": "2026-10-17T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "weeks", "weekdays": [7] }, "now": "2026-10-17T08:00:00.000Z", "expected": "2026-10-18T09:00" },
  { "name": "monthly-31-to-short-month", "due": { "local": "2026-01-31T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "months", "monthDay": 31 }, "now": "2026-01-31T10:00:00.000Z", "expected": "2026-02-28T09:00" },
  { "name": "monthly-anchor-returns-to-31", "due": { "local": "2026-02-28T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "months", "monthDay": 31 }, "now": "2026-02-28T10:00:00.000Z", "expected": "2026-03-31T09:00" },
  { "name": "monthly-leap-february", "due": { "local": "2028-01-31T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "months", "monthDay": 31 }, "now": "2028-01-31T10:00:00.000Z", "expected": "2028-02-29T09:00" },
  { "name": "yearly-feb-29-to-non-leap", "due": { "local": "2028-02-29T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 12, "unit": "months", "monthDay": 29 }, "now": "2028-02-29T10:00:00.000Z", "expected": "2029-02-28T09:00" },
  { "name": "monthly-skips-missed-months", "due": { "local": "2026-01-15T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 1, "unit": "months", "monthDay": 15 }, "now": "2026-10-14T10:00:00.000Z", "expected": "2026-10-15T09:00" },
  { "name": "monthly-year-wrap", "due": { "local": "2026-11-30T09:00", "tz": "Europe/Berlin" }, "repeat": { "every": 3, "unit": "months", "monthDay": 30 }, "now": "2026-11-30T10:00:00.000Z", "expected": "2027-02-28T09:00" }
]
```

- [ ] **Step 2: Написать падающий тест `src/contract/recurrence.test.js`**

```js
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/recurrence.json';
import { nextFutureOccurrence, stepOccurrence } from './recurrence';

describe('nextFutureOccurrence (contract fixtures)', () => {
    it.each(fixtures)('$name', ({ due, repeat, now, expected }) => {
        expect(nextFutureOccurrence(due.local, due.tz, repeat, new Date(now))).toBe(expected);
    });
});

describe('stepOccurrence', () => {
    it('rejects units removed from the contract', () => {
        expect(() => stepOccurrence('2026-10-14T09:00', 'UTC', { every: 30, unit: 'minutes' })).toThrow();
    });

    it('rejects malformed wall-clock values', () => {
        expect(() => stepOccurrence('2026-10-14T09:00:00', 'UTC', { every: 1, unit: 'days' })).toThrow();
    });
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run src/contract/recurrence.test.js`
Expected: FAIL — `Failed to resolve import "./recurrence" from "src/contract/recurrence.test.js"`.

- [ ] **Step 4: Написать `src/contract/recurrence.js`**

```js
/**
 * Next occurrence of a repeating task (data contract v2, spec section 4.3).
 * `local` is "YYYY-MM-DDTHH:mm", `tz` an IANA zone,
 * `repeat` = { every, unit: 'hours'|'days'|'weeks'|'months', weekdays?: number[] (ISO 1..7), monthDay?: number }.
 */
import { parseLocal, formatLocal, toInstant, toLocal } from './time';

const HOUR_MS = 60 * 60 * 1000;
const MAX_STEPS = 100000;

// Calendar arithmetic on wall-clock fields (zone-free): add whole days.
const addDays = (f, days) => {
    const d = new Date(Date.UTC(f.year, f.month - 1, f.day + days));
    return { ...f, year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

// ISO day of week: 1 = Monday ... 7 = Sunday.
const isoWeekday = (f) => {
    const dow = new Date(Date.UTC(f.year, f.month - 1, f.day)).getUTCDay();
    return dow === 0 ? 7 : dow;
};

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const stepHours = (local, tz, every) => {
    let t = toInstant(local, tz).getTime();
    for (let i = 0; i < MAX_STEPS; i += 1) {
        t += every * HOUR_MS;
        const candidate = toLocal(t, tz);
        // Skip instants whose wall-clock is ambiguous (second pass of a fall-back hour).
        if (toInstant(candidate, tz).getTime() === t) return candidate;
    }
    throw new Error('Hourly recurrence did not advance');
};

const stepWeekdays = (f, every, weekdays) => {
    const days = [...new Set(weekdays)].sort((a, b) => a - b);
    const current = isoWeekday(f);
    const laterThisWeek = days.find((d) => d > current);
    if (laterThisWeek !== undefined) return addDays(f, laterThisWeek - current);
    const weekStart = addDays(f, 1 - current);
    return addDays(weekStart, 7 * every + (days[0] - 1));
};

const stepMonths = (f, every, monthDay) => {
    const monthIndex = f.year * 12 + (f.month - 1) + every;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    return { ...f, year, month, day: Math.min(monthDay, daysInMonth(year, month)) };
};

/** One recurrence step from `local`; returns the next wall-clock "YYYY-MM-DDTHH:mm". */
export const stepOccurrence = (local, tz, repeat) => {
    const f = parseLocal(local);
    if (!f) throw new Error(`Invalid local date-time: ${local}`);
    const every = repeat.every;
    switch (repeat.unit) {
        case 'hours':
            return stepHours(local, tz, every);
        case 'days':
            return formatLocal(addDays(f, every));
        case 'weeks':
            if (Array.isArray(repeat.weekdays) && repeat.weekdays.length > 0) {
                return formatLocal(stepWeekdays(f, every, repeat.weekdays));
            }
            return formatLocal(addDays(f, 7 * every));
        case 'months':
            return formatLocal(stepMonths(f, every, repeat.monthDay));
        default:
            throw new Error(`Unknown repeat unit: ${repeat.unit}`);
    }
};

/** First occurrence after `local` whose instant is strictly later than `now` (Date). */
export const nextFutureOccurrence = (local, tz, repeat, now) => {
    const nowMs = now.getTime();
    if (repeat.unit === 'hours') {
        const stepMs = repeat.every * HOUR_MS;
        let t = toInstant(local, tz).getTime();
        // Fast-forward to the last step at or before `now`; the result is the same as stepping one by one.
        if (t < nowMs) t += Math.floor((nowMs - t) / stepMs) * stepMs;
        for (let i = 0; i < MAX_STEPS; i += 1) {
            t += stepMs;
            const candidate = toLocal(t, tz);
            if (t > nowMs && toInstant(candidate, tz).getTime() === t) return candidate;
        }
        throw new Error('Hourly recurrence did not advance');
    }
    let current = local;
    for (let i = 0; i < MAX_STEPS; i += 1) {
        current = stepOccurrence(current, tz, repeat);
        if (toInstant(current, tz).getTime() > nowMs) return current;
    }
    throw new Error('Recurrence did not reach the future');
};
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npx vitest run src/contract/recurrence.test.js`
Expected: PASS — `Tests  25 passed (25)`.

- [ ] **Step 6: Проверить линтером**

Run: `npm run lint`
Expected: без ошибок.

- [ ] **Step 7: Commit**

```bash
git add contract/fixtures/recurrence.json src/contract/recurrence.js src/contract/recurrence.test.js
git commit -F - <<'EOF'
feat(contract): compute the next occurrence of repeating tasks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Старые описания → Markdown

**Files:**
- Create: `contract/fixtures/markdown-v1.json`
- Create: `src/contract/markdown.js`
- Test: `src/contract/markdown.test.js`

**Interfaces:**
- Consumes: глобальный `DOMParser` (в браузере — встроенный; в тестах — happy-dom через `// @vitest-environment happy-dom`).
- Produces (`src/contract/markdown.js`):
  - `htmlToMarkdown(html: string): { markdown: string, lossy: boolean }` — HTML TipTap → Markdown; `lossy: true`, если пропало форматирование (подчёркивание, цвет, выделение, выравнивание, таблица, картинка, небезопасная ссылка);
  - `plainTextToMarkdown(text: string): string` — простой текст → Markdown, который показывается тем же текстом (переносы строк — жёсткие переносы `\`).

- [ ] **Step 1: Создать примеры `contract/fixtures/markdown-v1.json`**

```json
{
  "html": [
    { "name": "basic-marks", "input": "<p>Hello <strong>bold</strong>, <em>italic</em> and <s>gone</s>.</p>", "markdown": "Hello **bold**, *italic* and ~~gone~~.", "lossy": false },
    { "name": "paragraphs-and-hard-break", "input": "<p>line one<br>line two</p><p></p><p>second para</p>", "markdown": "line one\\\nline two\n\nsecond para", "lossy": false },
    { "name": "bullet-and-nested", "input": "<ul><li><p>one</p></li><li><p>two</p><ul><li><p>two.a</p></li></ul></li></ul>", "markdown": "- one\n- two\n  - two.a", "lossy": false },
    { "name": "ordered-with-start", "input": "<ol start=\"3\"><li><p>third</p></li><li><p>fourth</p></li></ol>", "markdown": "3. third\n4. fourth", "lossy": false },
    { "name": "task-list", "input": "<ul data-type=\"taskList\"><li data-checked=\"true\" data-type=\"taskItem\"><label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>bought milk</p></div></li><li data-checked=\"false\" data-type=\"taskItem\"><label><input type=\"checkbox\"><span></span></label><div><p>call mom</p></div></li></ul>", "markdown": "- [x] bought milk\n- [ ] call mom", "lossy": false },
    { "name": "links-safe-and-unsafe", "input": "<p><a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"https://example.com/a b\">site</a> and <a href=\"javascript:alert(1)\">bad</a></p>", "markdown": "[site](<https://example.com/a b>) and bad", "lossy": true },
    { "name": "heading-quote-code-rule", "input": "<h2>Title</h2><blockquote><p>quoted</p></blockquote><pre><code class=\"language-js\">const a = 1;\n</code></pre><hr><p>after</p>", "markdown": "## Title\n\n> quoted\n\n```js\nconst a = 1;\n```\n\n---\n\nafter", "lossy": false },
    { "name": "underline-colour-highlight-alignment", "input": "<p style=\"text-align: center\"><u>under</u> <span style=\"color: #ff0000\">red</span> <mark data-color=\"#ffff00\" style=\"background-color: #ffff00; color: inherit\">hi</mark></p>", "markdown": "under red hi", "lossy": true },
    { "name": "table-becomes-text", "input": "<table><tbody><tr><th><p>Name</p></th><th><p>Qty</p></th></tr><tr><td><p>Apples</p></td><td><p>3</p></td></tr></tbody></table>", "markdown": "Name · Qty\n\nApples · 3", "lossy": true },
    { "name": "images-become-links-or-drop", "input": "<img src=\"https://example.com/cat.png\"><p>x</p><img src=\"data:image/png;base64,AAAA\">", "markdown": "[image](https://example.com/cat.png)\n\nx", "lossy": true },
    { "name": "markdown-syntax-in-text-is-escaped", "input": "<p># not heading, 1. not list, *stars* and [brackets] &amp;amp;</p>", "markdown": "\\# not heading, 1. not list, \\*stars\\* and \\[brackets\\] \\&amp;", "lossy": false },
    { "name": "inline-code", "input": "<p>use <code>npm ci</code> now</p>", "markdown": "use `npm ci` now", "lossy": false },
    { "name": "empty", "input": "", "markdown": "", "lossy": false }
  ],
  "plain": [
    { "name": "lines-become-hard-breaks", "input": "Buy:\nmilk\n\n- not a list\n1. not ordered\n# not heading", "markdown": "Buy:\\\nmilk\n\n\\- not a list\\\n1\\. not ordered\\\n\\# not heading" },
    { "name": "special-characters-escaped", "input": "a*b_c [x] <tag> ~tilde~ back\\slash", "markdown": "a\\*b\\_c \\[x\\] \\<tag\\> \\~tilde\\~ back\\\\slash" },
    { "name": "windows-newlines-and-outer-blank-lines", "input": "\r\n\r\nfirst\r\nsecond\r\n\r\n", "markdown": "first\\\nsecond" },
    { "name": "empty", "input": "", "markdown": "" }
  ]
}
```

- [ ] **Step 2: Написать падающий тест `src/contract/markdown.test.js`**

```js
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/markdown-v1.json';
import { htmlToMarkdown, plainTextToMarkdown } from './markdown';

describe('htmlToMarkdown (contract fixtures)', () => {
    it.each(fixtures.html)('$name', ({ input, markdown, lossy }) => {
        expect(htmlToMarkdown(input)).toEqual({ markdown, lossy });
    });
});

describe('plainTextToMarkdown (contract fixtures)', () => {
    it.each(fixtures.plain)('$name', ({ input, markdown }) => {
        expect(plainTextToMarkdown(input)).toBe(markdown);
    });
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run src/contract/markdown.test.js`
Expected: FAIL — `Failed to resolve import "./markdown" from "src/contract/markdown.test.js"`.

- [ ] **Step 4: Написать `src/contract/markdown.js`**

```js
/**
 * v1 -> v2 description conversion (data contract v2, spec sections 5 and 9.2).
 * - htmlToMarkdown: TipTap HTML -> Markdown (CommonMark + GFM task lists and strikethrough).
 *   Unsupported formatting (underline, colour, highlight, alignment, tables, images) is
 *   reduced to plain text and reported through `lossy: true`.
 * - plainTextToMarkdown: plain text -> Markdown that renders as the same text.
 * Needs a DOMParser (browser, or happy-dom in tests).
 */

const SAFE_LINK = /^(https?:|mailto:)/i;
const HTTP_IMAGE = /^https?:/i;

const escapeInline = (text) => text
    .replace(/[\\`*_[\]<>~]/g, (ch) => `\\${ch}`)
    .replace(/&(?=#?[a-z0-9]+;)/gi, '\\&');

const escapeLineStart = (line) => {
    if (/^(=+|-+)\s*$/.test(line)) return `\\${line}`;
    return line
        .replace(/^(\s*)#/, '$1\\#')
        .replace(/^(\s*)([-+])(\s)/, '$1\\$2$3')
        .replace(/^(\s*)(\d+)([.)])(\s|$)/, '$1$2\\$3$4');
};

const escapeLines = (text) => text.split('\n').map(escapeLineStart).join('\n');

const wrap = (inner, mark) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    return m[2] ? `${m[1]}${mark}${m[2]}${mark}${m[3]}` : inner;
};

const codeSpan = (text) => {
    const ticks = text.includes('`') ? '``' : '`';
    const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
    return `${ticks}${pad}${text}${pad}${ticks}`;
};

const linkTarget = (href) => (/[\s()<>]/.test(href) ? `<${href.replace(/>/g, '%3E')}>` : href);

const imageLink = (el, state) => {
    state.lossy = true;
    const src = el.getAttribute('src') || '';
    return HTTP_IMAGE.test(src) ? `[image](${linkTarget(src)})` : '';
};

const renderInline = (nodes, state) => {
    let out = '';
    for (const node of nodes) {
        if (node.nodeType === 3) {
            out += escapeInline(node.nodeValue.replace(/\s*\n\s*/g, ' '));
            continue;
        }
        if (node.nodeType !== 1) continue;
        const tag = node.tagName.toLowerCase();
        const inner = () => renderInline(node.childNodes, state);
        switch (tag) {
            case 'strong':
            case 'b':
                out += wrap(inner(), '**');
                break;
            case 'em':
            case 'i':
                out += wrap(inner(), '*');
                break;
            case 's':
            case 'del':
            case 'strike':
                out += wrap(inner(), '~~');
                break;
            case 'code':
                out += codeSpan(node.textContent);
                break;
            case 'a': {
                const href = node.getAttribute('href') || '';
                if (SAFE_LINK.test(href)) {
                    out += `[${inner()}](${linkTarget(href)})`;
                } else {
                    state.lossy = true;
                    out += inner();
                }
                break;
            }
            case 'br':
                out += '\\\n';
                break;
            case 'img':
                out += imageLink(node, state);
                break;
            case 'u':
            case 'mark':
                state.lossy = true;
                out += inner();
                break;
            case 'span':
                if (node.getAttribute('style')) state.lossy = true;
                out += inner();
                break;
            default:
                out += inner();
        }
    }
    return out;
};

const paragraph = (el, state) => {
    if ((el.getAttribute('style') || '').includes('text-align')) state.lossy = true;
    return escapeLines(renderInline(el.childNodes, state).trim());
};

const indentRest = (text, marker) => {
    const pad = ' '.repeat(marker.length);
    return text.split('\n').map((line, i) => {
        if (i === 0) return `${marker}${line}`;
        return line ? `${pad}${line}` : line;
    }).join('\n');
};

const renderList = (el, state, ordered) => {
    const start = Number(el.getAttribute('start')) || 1;
    return [...el.children]
        .filter((li) => li.tagName.toLowerCase() === 'li')
        .map((li, i) => indentRest(renderBlocks(li.childNodes, state).join('\n'), ordered ? `${start + i}. ` : '- '))
        .join('\n');
};

const renderTaskList = (el, state) => [...el.children]
    .filter((li) => li.tagName.toLowerCase() === 'li')
    .map((li) => {
        const checked = li.getAttribute('data-checked') === 'true';
        const content = [...li.children].find((c) => c.tagName.toLowerCase() === 'div') || li;
        const body = renderBlocks(content.childNodes, state).join('\n');
        return indentRest(body, '- ').replace(/^- /, checked ? '- [x] ' : '- [ ] ');
    })
    .join('\n');

const renderTable = (el, state) => {
    state.lossy = true;
    return [...el.querySelectorAll('tr')]
        .map((tr) => [...tr.children].map((cell) => escapeInline(cell.textContent.trim())).filter(Boolean).join(' · '))
        .filter(Boolean)
        .map(escapeLineStart);
};

const codeBlock = (el) => {
    const code = el.querySelector('code');
    const lang = ((code && code.getAttribute('class')) || '').match(/language-([\w+#-]+)/);
    const text = (code || el).textContent.replace(/\n$/, '');
    const fence = text.includes('```') ? '````' : '```';
    return `${fence}${lang ? lang[1] : ''}\n${text}\n${fence}`;
};

function renderBlocks(nodes, state) {
    const blocks = [];
    let inlineRun = [];
    const flushInline = () => {
        const text = escapeLines(renderInline(inlineRun, state).trim());
        if (text) blocks.push(text);
        inlineRun = [];
    };
    for (const node of nodes) {
        const tag = node.nodeType === 1 ? node.tagName.toLowerCase() : null;
        const isBlock = tag && /^(p|h[1-6]|ul|ol|blockquote|pre|hr|table|div)$/.test(tag);
        if (!isBlock && !(tag === 'img' && node.parentElement && node.parentElement.tagName.toLowerCase() === 'body')) {
            inlineRun.push(node);
            continue;
        }
        flushInline();
        if (tag === 'img') {
            const link = imageLink(node, state);
            if (link) blocks.push(link);
            continue;
        }
        switch (tag) {
            case 'p': {
                const text = paragraph(node, state);
                if (text) blocks.push(text);
                break;
            }
            case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
                const text = renderInline(node.childNodes, state).trim();
                if (text) blocks.push(`${'#'.repeat(Number(tag[1]))} ${text}`);
                break;
            }
            case 'ul':
                blocks.push(node.getAttribute('data-type') === 'taskList'
                    ? renderTaskList(node, state)
                    : renderList(node, state, false));
                break;
            case 'ol':
                blocks.push(renderList(node, state, true));
                break;
            case 'blockquote': {
                const inner = renderBlocks(node.childNodes, state).join('\n\n');
                if (inner) blocks.push(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
                break;
            }
            case 'pre':
                blocks.push(codeBlock(node));
                break;
            case 'hr':
                blocks.push('---');
                break;
            case 'table':
                blocks.push(...renderTable(node, state));
                break;
            default: // div
                blocks.push(...renderBlocks(node.childNodes, state));
        }
    }
    flushInline();
    return blocks.filter((b) => b !== '');
}

/** TipTap HTML -> { markdown, lossy }. */
export const htmlToMarkdown = (html) => {
    const state = { lossy: false };
    const doc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html');
    return { markdown: renderBlocks(doc.body.childNodes, state).join('\n\n').trim(), lossy: state.lossy };
};

/** Plain text -> Markdown that renders as the same text (line breaks kept as hard breaks). */
export const plainTextToMarkdown = (text) => (text || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.split('\n').map((line) => escapeLineStart(escapeInline(line.trimEnd()))).join('\\\n'))
    .filter(Boolean)
    .join('\n\n');
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npx vitest run src/contract/markdown.test.js`
Expected: PASS — `Tests  17 passed (17)`.

- [ ] **Step 6: Проверить линтером**

Run: `npm run lint`
Expected: без ошибок.

- [ ] **Step 7: Commit**

```bash
git add contract/fixtures/markdown-v1.json src/contract/markdown.js src/contract/markdown.test.js
git commit -F - <<'EOF'
feat(contract): convert legacy task descriptions to Markdown

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Схема, палитра и проверка формата

**Files:**
- Create: `contract/palette.json`
- Create: `contract/fixtures/tasks.json`, `contract/fixtures/categories.json`, `contract/fixtures/settings.json`
- Create: `src/contract/schema.js`
- Create: `src/contract/validate.js`
- Test: `src/contract/validate.test.js`
- Modify: `src/hooks/tagColors.js` (константа `COLOR_PALETTE`)

**Interfaces:**
- Consumes (из задачи 1): `parseLocal`, `isValidTimeZone`.
- Produces (`src/contract/schema.js`): `SCHEMA_VERSION` (2), `PALETTE`, `TASK_STATUSES`, `REPEAT_UNITS`, `THEME_MODES`, `DESIGNS`, `LANGUAGES`, `MAIN_VIEWS`, `LIST_SORT_FIELDS`, `SORT_ORDERS`, `LIMITS`, `DEFAULT_RADIUS` (45), `SETTINGS_KEYS`, `normalizeLanguage(tag): 'en' | 'uk'`, `createDefaultSettings(deviceLanguage): settings` (новый изменяемый объект).
- Produces (`src/contract/validate.js`): `isValidId(v): boolean`, `validateTask(task): string[]`, `validateCategory(category): string[]`, `validateSettings(settings): string[]` — пустой список означает «запись правильная». Проверяется форма бэкапа: id — поле записи, время — ISO-строки.

- [ ] **Step 1: Создать `contract/palette.json`**

Те же 20 цветов, что сейчас в `src/hooks/tagColors.js`, в том же порядке:

```json
[
  "#da3833", "#ee603c", "#fd8b2b", "#e9be00", "#b7be00",
  "#7db44e", "#46a549", "#00a47a", "#34c09d", "#007771",
  "#00a5cf", "#0089b5", "#005ea4", "#6179cf", "#434d82",
  "#b14dd1", "#c04097", "#f25e6a", "#4d697e", "#86a49c"
]
```

- [ ] **Step 2: Создать примеры записей**

`contract/fixtures/tasks.json`:

```json
{
  "valid": [
    { "name": "minimal-without-due", "value": { "id": "t1", "title": "Buy milk", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "monthly-with-reminders", "value": { "id": "p0q8r7stu", "title": "Оплатить счета", "description": "- [ ] свет\n- [ ] вода", "categoryId": "k3j9x0abc", "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "Europe/Kyiv" }, "reminders": [60, 1440], "repeat": { "every": 1, "unit": "months", "monthDay": 15 }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-10T19:30:00.000Z", "deletedAt": null } },
    { "name": "weekly-with-weekdays", "value": { "id": "t3", "title": "Gym", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-14T18:00", "tz": "Europe/Berlin" }, "reminders": [60], "repeat": { "every": 1, "unit": "weeks", "weekdays": [1, 3, 5] }, "radius": 30, "pulseMuted": true, "createdAt": "2026-10-01T08:00:00Z", "updatedAt": "2026-10-01T08:00:00Z", "deletedAt": null } },
    { "name": "hourly-repeat", "value": { "id": "t4", "title": "Drink water", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-14T10:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 2, "unit": "hours" }, "radius": 80, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "done-keeps-due-as-history", "value": { "id": "t5", "title": "Old", "description": "x", "categoryId": null, "status": "done", "due": { "local": "2026-09-01T09:00", "tz": "Europe/Kyiv" }, "reminders": [60], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-08-01T08:00:00.000Z", "updatedAt": "2026-09-01T10:00:00.000Z", "deletedAt": null } },
    { "name": "deleted-with-deleted-at", "value": { "id": "t6", "title": "Trash", "description": "", "categoryId": null, "status": "deleted", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-08-01T08:00:00.000Z", "updatedAt": "2026-10-12T10:00:00.000Z", "deletedAt": "2026-10-12T10:00:00.000Z" } }
  ],
  "invalid": [
    { "name": "blank-title", "value": { "id": "t1", "title": "   ", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "status-postpone", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "postpone", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "reminder-not-whole-hours", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [30], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "reminders-not-ascending", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [1440, 60], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "too-many-reminders", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "reminders-without-due", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [60], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "repeat-without-due", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": { "every": 1, "unit": "days" }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "repeat-in-minutes", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 30, "unit": "minutes" }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "months-without-month-day", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 1, "unit": "months" }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "month-day-on-days-unit", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 1, "unit": "days", "monthDay": 15 }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "weekdays-on-days-unit", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 1, "unit": "days", "weekdays": [1] }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "weekday-zero", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "UTC" }, "reminders": [], "repeat": { "every": 1, "unit": "weeks", "weekdays": [0, 3] }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "due-local-with-seconds", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00:00", "tz": "UTC" }, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "due-unknown-zone", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "Mars/Olympus" }, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "radius-too-big", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 100, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "deleted-at-on-active", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": "2026-10-01T08:00:00.000Z" } },
    { "name": "deleted-without-deleted-at", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "deleted", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "unknown-field", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null, "fillStyle": "#fff" } },
    { "name": "category-id-with-slash", "value": { "id": "t1", "title": "A", "description": "", "categoryId": "a/b", "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "created-at-not-iso", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "yesterday", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } },
    { "name": "missing-repeat-field", "value": { "id": "t1", "title": "A", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null } }
  ]
}
```

`contract/fixtures/categories.json`:

```json
{
  "valid": [
    { "name": "basic", "value": { "id": "k3j9x0abc", "name": "Дом", "color": "#da3833", "order": 1 } },
    { "name": "fractional-order", "value": { "id": "c2", "name": "Work", "color": "#86a49c", "order": 1.5 } }
  ],
  "invalid": [
    { "name": "colour-outside-palette", "value": { "id": "c1", "name": "Home", "color": "#123456", "order": 1 } },
    { "name": "blank-name", "value": { "id": "c1", "name": " ", "color": "#da3833", "order": 1 } },
    { "name": "order-as-string", "value": { "id": "c1", "name": "Home", "color": "#da3833", "order": "1" } },
    { "name": "missing-id", "value": { "name": "Home", "color": "#da3833", "order": 1 } },
    { "name": "unknown-field", "value": { "id": "c1", "name": "Home", "color": "#da3833", "order": 1, "userId": "u1" } }
  ]
}
```

`contract/fixtures/settings.json`:

```json
{
  "valid": [
    { "name": "defaults", "value": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } } },
    { "name": "customised", "value": { "themeMode": "dark", "design": "aurora", "language": "uk", "mainView": "list", "labelFontSize": 20, "bubbleBackground": false, "showCategoriesPanel": true, "showInstructions": false, "bubbleFilter": { "categoryIds": ["c1", "c2"], "showUncategorized": false, "plannedOnly": true }, "listFilter": { "categoryIds": [], "showUncategorized": true }, "listSort": { "by": "category", "order": "asc" } } }
  ],
  "invalid": [
    { "name": "unknown-theme", "value": { "themeMode": "blue", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } } },
    { "name": "font-too-small", "value": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 7, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } } },
    { "name": "legacy-sort-field", "value": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "tag", "order": "desc" } } },
    { "name": "bubble-filter-missing-field", "value": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } } },
    { "name": "language-ru", "value": { "themeMode": "system", "design": "classic", "language": "ru", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } } },
    { "name": "device-local-key", "value": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" }, "fabPosition": { "x": 1, "y": 2 } } }
  ]
}
```

- [ ] **Step 3: Написать падающий тест `src/contract/validate.test.js`**

```js
import { describe, it, expect } from 'vitest';
import tasks from '../../contract/fixtures/tasks.json';
import categories from '../../contract/fixtures/categories.json';
import settings from '../../contract/fixtures/settings.json';
import { validateTask, validateCategory, validateSettings } from './validate';
import { createDefaultSettings } from './schema';

describe('validateTask (contract fixtures)', () => {
    it.each(tasks.valid)('accepts $name', ({ value }) => {
        expect(validateTask(value)).toEqual([]);
    });

    it.each(tasks.invalid)('rejects $name', ({ value }) => {
        expect(validateTask(value)).not.toEqual([]);
    });

    it('rejects non-objects', () => {
        expect(validateTask(null)).not.toEqual([]);
        expect(validateTask([])).not.toEqual([]);
    });
});

describe('validateCategory (contract fixtures)', () => {
    it.each(categories.valid)('accepts $name', ({ value }) => {
        expect(validateCategory(value)).toEqual([]);
    });

    it.each(categories.invalid)('rejects $name', ({ value }) => {
        expect(validateCategory(value)).not.toEqual([]);
    });
});

describe('validateSettings (contract fixtures)', () => {
    it.each(settings.valid)('accepts $name', ({ value }) => {
        expect(validateSettings(value)).toEqual([]);
    });

    it.each(settings.invalid)('rejects $name', ({ value }) => {
        expect(validateSettings(value)).not.toEqual([]);
    });

    it('accepts freshly created defaults', () => {
        expect(validateSettings(createDefaultSettings('uk-UA'))).toEqual([]);
        expect(createDefaultSettings('uk-UA').language).toBe('uk');
        expect(createDefaultSettings(undefined).language).toBe('en');
    });
});
```

- [ ] **Step 4: Убедиться, что тест падает**

Run: `npx vitest run src/contract/validate.test.js`
Expected: FAIL — `Failed to resolve import "./validate" from "src/contract/validate.test.js"`.

- [ ] **Step 5: Написать `src/contract/schema.js`**

```js
/**
 * Data contract v2 — shared constants and defaults.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md (section 3).
 */
import palette from '../../contract/palette.json';

export const SCHEMA_VERSION = 2;

/** The 20 category colours; a category's colour must be one of these. */
export const PALETTE = Object.freeze([...palette]);

export const TASK_STATUSES = Object.freeze(['active', 'done', 'deleted']);
export const REPEAT_UNITS = Object.freeze(['hours', 'days', 'weeks', 'months']);
export const THEME_MODES = Object.freeze(['light', 'dark', 'system']);
export const DESIGNS = Object.freeze(['classic', 'modern', 'aurora', 'brutalist', 'clay']);
export const LANGUAGES = Object.freeze(['en', 'uk']);
export const MAIN_VIEWS = Object.freeze(['bubbles', 'list']);
export const LIST_SORT_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'title', 'category']);
export const SORT_ORDERS = Object.freeze(['asc', 'desc']);

export const LIMITS = Object.freeze({
    idMaxLength: 128,
    titleMaxLength: 1000,
    descriptionMaxLength: 100000,
    categoryNameMaxLength: 100,
    maxReminders: 10,
    reminderStepMinutes: 60,
    reminderMaxMinutes: 524160,
    repeatEveryMax: 999,
    radiusMin: 30,
    radiusMax: 80,
    fontSizeMin: 8,
    fontSizeMax: 20,
});

export const DEFAULT_RADIUS = 45;

/** "uk*" -> "uk", anything else -> "en". */
export const normalizeLanguage = (tag) => (typeof tag === 'string' && tag.toLowerCase().startsWith('uk') ? 'uk' : 'en');

/** Fresh default settings object (spec 3.5); language comes from the device. */
export const createDefaultSettings = (deviceLanguage) => ({
    themeMode: 'system',
    design: 'classic',
    language: normalizeLanguage(deviceLanguage),
    mainView: 'bubbles',
    labelFontSize: 8,
    bubbleBackground: true,
    showCategoriesPanel: false,
    showInstructions: true,
    bubbleFilter: { categoryIds: null, showUncategorized: true, plannedOnly: false },
    listFilter: { categoryIds: null, showUncategorized: true },
    listSort: { by: 'updatedAt', order: 'desc' },
});

export const SETTINGS_KEYS = Object.freeze(Object.keys(createDefaultSettings('en')));
```

- [ ] **Step 6: Написать `src/contract/validate.js`**

```js
/**
 * Validation of plain (backup-form) v2 records: timestamps are ISO strings, ids are fields.
 * Each validator returns a list of error strings; an empty list means the record is valid.
 * Spec: docs/superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md (sections 3 and 10).
 */
import {
    PALETTE, TASK_STATUSES, REPEAT_UNITS, THEME_MODES, DESIGNS, LANGUAGES,
    MAIN_VIEWS, LIST_SORT_FIELDS, SORT_ORDERS, LIMITS, SETTINGS_KEYS,
} from './schema';
import { parseLocal, isValidTimeZone } from './time';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const TASK_KEYS = ['id', 'title', 'description', 'categoryId', 'status', 'due', 'reminders', 'repeat',
    'radius', 'pulseMuted', 'createdAt', 'updatedAt', 'deletedAt'];

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isIsoTimestamp = (v) => typeof v === 'string' && ISO_RE.test(v) && Number.isFinite(Date.parse(v));
const isIntIn = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const unknownKeys = (obj, allowed) => Object.keys(obj).filter((k) => !allowed.includes(k));
const isStrictlyAscending = (list) => list.every((v, i) => i === 0 || v > list[i - 1]);
const trimmedLengthIn = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

/** Firestore-safe document id: 1..128 chars, no "/". */
export const isValidId = (v) => typeof v === 'string' && v.length > 0 && v.length <= LIMITS.idMaxLength && !v.includes('/');

const isIdListOrNull = (v) => v === null || (Array.isArray(v) && v.every(isValidId));

const validateDue = (due, errors) => {
    if (due === null) return;
    if (!isPlainObject(due) || unknownKeys(due, ['local', 'tz']).length > 0) {
        errors.push('due: invalid shape');
        return;
    }
    if (!parseLocal(due.local)) errors.push('due.local: invalid');
    if (!isValidTimeZone(due.tz)) errors.push('due.tz: invalid');
};

const validateReminders = (reminders, errors) => {
    const ok = Array.isArray(reminders)
        && reminders.length <= LIMITS.maxReminders
        && reminders.every((m) => isIntIn(m, LIMITS.reminderStepMinutes, LIMITS.reminderMaxMinutes)
            && m % LIMITS.reminderStepMinutes === 0)
        && isStrictlyAscending(reminders);
    if (!ok) errors.push('reminders: invalid');
};

const validateRepeat = (repeat, errors) => {
    if (repeat === null) return;
    if (!isPlainObject(repeat) || unknownKeys(repeat, ['every', 'unit', 'weekdays', 'monthDay']).length > 0) {
        errors.push('repeat: invalid shape');
        return;
    }
    if (!isIntIn(repeat.every, 1, LIMITS.repeatEveryMax)) errors.push('repeat.every: invalid');
    if (!REPEAT_UNITS.includes(repeat.unit)) errors.push('repeat.unit: invalid');
    if ('weekdays' in repeat) {
        const ok = repeat.unit === 'weeks'
            && Array.isArray(repeat.weekdays)
            && repeat.weekdays.every((d) => isIntIn(d, 1, 7))
            && isStrictlyAscending(repeat.weekdays);
        if (!ok) errors.push('repeat.weekdays: invalid');
    }
    if (repeat.unit === 'months') {
        if (!isIntIn(repeat.monthDay, 1, 31)) errors.push('repeat.monthDay: required for months');
    } else if ('monthDay' in repeat) {
        errors.push('repeat.monthDay: only for months');
    }
};

export const validateTask = (task) => {
    if (!isPlainObject(task)) return ['task: not an object'];
    const errors = unknownKeys(task, TASK_KEYS).map((k) => `${k}: unknown field`);
    if (!isValidId(task.id)) errors.push('id: invalid');
    if (!trimmedLengthIn(task.title, LIMITS.titleMaxLength)) errors.push('title: invalid');
    if (typeof task.description !== 'string' || task.description.length > LIMITS.descriptionMaxLength) {
        errors.push('description: invalid');
    }
    if (task.categoryId !== null && !isValidId(task.categoryId)) errors.push('categoryId: invalid');
    if (!TASK_STATUSES.includes(task.status)) errors.push('status: invalid');
    validateDue(task.due, errors);
    validateReminders(task.reminders, errors);
    validateRepeat(task.repeat, errors);
    if (task.due === null && Array.isArray(task.reminders) && task.reminders.length > 0) {
        errors.push('reminders: require due');
    }
    if (task.due === null && task.repeat !== null) errors.push('repeat: requires due');
    if (!isIntIn(task.radius, LIMITS.radiusMin, LIMITS.radiusMax)) errors.push('radius: invalid');
    if (typeof task.pulseMuted !== 'boolean') errors.push('pulseMuted: invalid');
    if (!isIsoTimestamp(task.createdAt)) errors.push('createdAt: invalid');
    if (!isIsoTimestamp(task.updatedAt)) errors.push('updatedAt: invalid');
    const deletedOk = task.status === 'deleted' ? isIsoTimestamp(task.deletedAt) : task.deletedAt === null;
    if (!deletedOk) errors.push('deletedAt: invalid');
    return errors;
};

export const validateCategory = (category) => {
    if (!isPlainObject(category)) return ['category: not an object'];
    const errors = unknownKeys(category, ['id', 'name', 'color', 'order']).map((k) => `${k}: unknown field`);
    if (!isValidId(category.id)) errors.push('id: invalid');
    if (!trimmedLengthIn(category.name, LIMITS.categoryNameMaxLength)) errors.push('name: invalid');
    if (!PALETTE.includes(category.color)) errors.push('color: not in palette');
    if (typeof category.order !== 'number' || !Number.isFinite(category.order)) errors.push('order: invalid');
    return errors;
};

export const validateSettings = (settings) => {
    if (!isPlainObject(settings)) return ['settings: not an object'];
    const errors = unknownKeys(settings, SETTINGS_KEYS).map((k) => `${k}: unknown field`);
    const s = settings;
    if (!THEME_MODES.includes(s.themeMode)) errors.push('themeMode: invalid');
    if (!DESIGNS.includes(s.design)) errors.push('design: invalid');
    if (!LANGUAGES.includes(s.language)) errors.push('language: invalid');
    if (!MAIN_VIEWS.includes(s.mainView)) errors.push('mainView: invalid');
    if (!isIntIn(s.labelFontSize, LIMITS.fontSizeMin, LIMITS.fontSizeMax)) errors.push('labelFontSize: invalid');
    ['bubbleBackground', 'showCategoriesPanel', 'showInstructions'].forEach((key) => {
        if (typeof s[key] !== 'boolean') errors.push(`${key}: invalid`);
    });
    const bf = s.bubbleFilter;
    if (!isPlainObject(bf) || unknownKeys(bf, ['categoryIds', 'showUncategorized', 'plannedOnly']).length > 0
        || !isIdListOrNull(bf.categoryIds) || typeof bf.showUncategorized !== 'boolean'
        || typeof bf.plannedOnly !== 'boolean') {
        errors.push('bubbleFilter: invalid');
    }
    const lf = s.listFilter;
    if (!isPlainObject(lf) || unknownKeys(lf, ['categoryIds', 'showUncategorized']).length > 0
        || !isIdListOrNull(lf.categoryIds) || typeof lf.showUncategorized !== 'boolean') {
        errors.push('listFilter: invalid');
    }
    const ls = s.listSort;
    if (!isPlainObject(ls) || unknownKeys(ls, ['by', 'order']).length > 0
        || !LIST_SORT_FIELDS.includes(ls.by) || !SORT_ORDERS.includes(ls.order)) {
        errors.push('listSort: invalid');
    }
    return errors;
};
```

- [ ] **Step 7: Убедиться, что тест проходит**

Run: `npx vitest run src/contract/validate.test.js`
Expected: PASS — `Tests  44 passed (44)`.

- [ ] **Step 8: Перевести `src/hooks/tagColors.js` на общую палитру**

Заменить блок

```js
// My palette
export const COLOR_PALETTE = [
    '#da3833', '#ee603c', '#fd8b2b', '#e9be00', '#b7be00',
    '#7db44e', '#46a549', '#00a47a', '#34c09d', '#007771',
    '#00a5cf', '#0089b5', '#005ea4', '#6179cf', '#434d82',
    '#b14dd1', '#c04097', '#f25e6a', '#4d697e', '#86a49c'
];
```

на

```js
import { PALETTE } from '../contract/schema';

// Category palette is shared with the Android app: contract/palette.json.
export const COLOR_PALETTE = PALETTE;
```

Блок стоит сразу после комментария в начале файла, поэтому `import` окажется наверху, перед остальным кодом. Остальные функции файла не меняются.

- [ ] **Step 9: Убедиться, что старые тесты палитры проходят**

Run: `npx vitest run src/hooks/__tests__/tagColors.test.js src/contract/validate.test.js`
Expected: PASS, оба файла зелёные.

- [ ] **Step 10: Проверить линтером**

Run: `npm run lint`
Expected: без ошибок.

- [ ] **Step 11: Commit**

```bash
git add contract/palette.json contract/fixtures/tasks.json contract/fixtures/categories.json contract/fixtures/settings.json src/contract/schema.js src/contract/validate.js src/contract/validate.test.js src/hooks/tagColors.js
git commit -F - <<'EOF'
feat(contract): add v2 schema constants and record validation

The category palette moves to contract/palette.json so the web and the
Android app share one list.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Перевод записей v1 → v2

**Files:**
- Create: `contract/fixtures/migration-v1.json`
- Create: `src/contract/migrateV1.js`
- Test: `src/contract/migrateV1.test.js`

**Interfaces:**
- Consumes: `schema.js` и `validate.isValidId` (задача 4), `time.js` (задача 1), `markdown.js` (задача 3), `LS` из `src/utils/storageKeys.js` (уже есть).
- Produces (`src/contract/migrateV1.js`) — их использует подплан 0.6 (перенос и импорт старых бэкапов):
  - `mapTaskV1(v1, ctx): { task: plainTask | null, notes: string[] }`, где `ctx = { now: Date, timeZone: string, language: 'en' | 'uk', categoryIds: Set<string> }`. Коды пометок (отсортированы): `invalid-record`, `title-defaulted`, `title-truncated`, `status-postpone`, `due-dropped`, `reminder-dropped`, `reminders-rounded`, `reminders-truncated`, `repeat-rounded`, `repeat-dropped`, `formatting-lost`, `description-truncated`, `timestamp-fixed`;
  - `mapCategoriesV1(tags): { categories: plainCategory[], notes: { id: string | null, code }[] }`; коды: `invalid-record`, `color-changed`, `category-dropped`, `name-defaulted`, `name-truncated`;
  - `settingsFromLocalStorage(getItem: (key) => string | null, deviceLanguage: string): settings`.

- [ ] **Step 1: Создать примеры `contract/fixtures/migration-v1.json`**

```json
{
  "context": { "now": "2026-10-14T12:00:00.000Z", "timeZone": "Europe/Berlin", "language": "uk", "categoryIds": ["c1", "c2"] },
  "tasks": [
    {
      "name": "minute-reminders-and-repeat-are-rounded-to-hours",
      "v1": { "id": "a1", "title": " Pay bills ", "description": "line1\nline2", "useRichText": false, "tagId": "c1", "status": "active", "dueDate": "2026-10-15T09:00:00", "tz": "Europe/Kyiv", "notifications": ["15m", "1d", { "type": "custom", "value": 90, "unit": "minutes" }], "recurrence": { "every": 30, "unit": "minutes" }, "radius": 50, "overduePulseSuppressed": true, "overdueSticky": true, "overdueAt": "2026-10-13T09:00:00.000Z", "fillStyle": "rgba(0,0,0,0.1)", "strokeStyle": "#da3833", "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-10T19:30:00.000Z", "deletedAt": null },
      "expected": { "id": "a1", "title": "Pay bills", "description": "line1\\\nline2", "categoryId": "c1", "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "Europe/Kyiv" }, "reminders": [60, 120, 1440], "repeat": { "every": 1, "unit": "hours" }, "radius": 50, "pulseMuted": true, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-10T19:30:00.000Z", "deletedAt": null },
      "notes": ["reminders-rounded", "repeat-rounded"]
    },
    {
      "name": "rich-text-weekdays-postpone-and-defaults",
      "v1": { "id": "a2", "title": "", "description": "<p><strong>Read</strong> book</p>", "useRichText": true, "tagId": "missing", "status": "postpone", "dueDate": "2026-10-14T18:30:00", "notifications": [], "recurrence": { "every": 1, "unit": "weeks", "weekDays": [0, 3] }, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" },
      "expected": { "id": "a2", "title": "Без назви", "description": "**Read** book", "categoryId": null, "status": "active", "due": { "local": "2026-10-14T18:30", "tz": "Europe/Berlin" }, "reminders": [], "repeat": { "every": 1, "unit": "weeks", "weekdays": [3, 7] }, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null },
      "notes": ["status-postpone", "title-defaulted"]
    },
    {
      "name": "monthly-repeat-gets-month-day",
      "v1": { "id": "a3", "title": "Rent", "status": "done", "dueDate": "2026-01-31T09:00:00", "tz": "Europe/Berlin", "notifications": ["1h"], "recurrence": { "every": 1, "unit": "months" }, "radius": 45, "createdAt": "2026-01-01T08:00:00.000Z", "updatedAt": "2026-01-31T10:00:00.000Z" },
      "expected": { "id": "a3", "title": "Rent", "description": "", "categoryId": null, "status": "done", "due": { "local": "2026-01-31T09:00", "tz": "Europe/Berlin" }, "reminders": [60], "repeat": { "every": 1, "unit": "months", "monthDay": 31 }, "radius": 45, "pulseMuted": false, "createdAt": "2026-01-01T08:00:00.000Z", "updatedAt": "2026-01-31T10:00:00.000Z", "deletedAt": null },
      "notes": []
    },
    {
      "name": "deleted-without-due-drops-reminders-and-repeat",
      "v1": { "id": "a4", "title": "Trash", "status": "deleted", "dueDate": null, "notifications": ["1h"], "recurrence": { "every": 1, "unit": "days" }, "createdAt": "2026-08-01T08:00:00.000Z", "updatedAt": "2026-10-12T10:00:00.000Z", "deletedAt": "2026-10-12T10:00:00.000Z" },
      "expected": { "id": "a4", "title": "Trash", "description": "", "categoryId": null, "status": "deleted", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-08-01T08:00:00.000Z", "updatedAt": "2026-10-12T10:00:00.000Z", "deletedAt": "2026-10-12T10:00:00.000Z" },
      "notes": []
    },
    {
      "name": "due-with-offset-is-converted-to-local",
      "v1": { "id": "a5", "title": "Call", "tagId": "c2", "status": "active", "dueDate": "2026-10-15T07:00:00.000Z", "tz": "Europe/Berlin", "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" },
      "expected": { "id": "a5", "title": "Call", "description": "", "categoryId": "c2", "status": "active", "due": { "local": "2026-10-15T09:00", "tz": "Europe/Berlin" }, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null },
      "notes": []
    },
    {
      "name": "lossy-html-and-bad-timestamps",
      "v1": { "id": "a6", "title": "Notes", "description": "<p><u>under</u> text</p>", "useRichText": true, "status": "active", "createdAt": "2027-01-01T00:00:00.000Z", "updatedAt": "garbage" },
      "expected": { "id": "a6", "title": "Notes", "description": "under text", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-14T12:00:00.000Z", "updatedAt": "2026-10-14T12:00:00.000Z", "deletedAt": null },
      "notes": ["formatting-lost", "timestamp-fixed"]
    },
    {
      "name": "unparseable-due-is-dropped",
      "v1": { "id": "a7", "title": "X", "status": "active", "dueDate": "not a date", "notifications": ["1h"], "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" },
      "expected": { "id": "a7", "title": "X", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 45, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null },
      "notes": ["due-dropped"]
    },
    {
      "name": "radius-is-clamped",
      "v1": { "id": "a8", "title": "Big", "status": "active", "radius": 120, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z" },
      "expected": { "id": "a8", "title": "Big", "description": "", "categoryId": null, "status": "active", "due": null, "reminders": [], "repeat": null, "radius": 80, "pulseMuted": false, "createdAt": "2026-10-01T08:00:00.000Z", "updatedAt": "2026-10-01T08:00:00.000Z", "deletedAt": null },
      "notes": []
    },
    {
      "name": "record-without-id-is-skipped",
      "v1": { "title": "No id" },
      "expected": null,
      "notes": ["invalid-record"]
    }
  ],
  "categories": {
    "v1": [
      { "id": "c1", "name": " Home ", "color": "#da3833" },
      { "id": "c2", "name": "Work", "color": "#DA3833" },
      { "id": "c3", "name": "Fun", "color": "#ee603c" },
      { "id": "c4", "name": "Misc", "color": "#123456" },
      { "name": "no id", "color": "#fd8b2b" }
    ],
    "expected": [
      { "id": "c1", "name": "Home", "color": "#da3833", "order": 1 },
      { "id": "c2", "name": "Work", "color": "#fd8b2b", "order": 2 },
      { "id": "c3", "name": "Fun", "color": "#ee603c", "order": 3 },
      { "id": "c4", "name": "Misc", "color": "#e9be00", "order": 4 }
    ],
    "notes": [
      { "id": null, "code": "invalid-record" },
      { "id": "c2", "code": "color-changed" },
      { "id": "c4", "code": "color-changed" }
    ]
  },
  "settings": [
    {
      "name": "empty-storage-uses-defaults-and-device-language",
      "localStorage": {},
      "deviceLanguage": "uk-UA",
      "expected": { "themeMode": "system", "design": "classic", "language": "uk", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } }
    },
    {
      "name": "legacy-values-are-mapped",
      "localStorage": { "app-theme-mode": "\"dark\"", "app-design": "aurora", "i18nextLng": "ru", "bubbles-main-view": "tasks", "bubbles-font-size": "12", "bubbles-background-enabled": "false", "bubbles-categories-panel-enabled": "true", "bubbles-show-instructions": "false", "bubbles-filter-tags": "[\"c1\",\"c2\"]", "bubbles-show-no-tag": "false", "bubbles-planned-tasks-only": "true", "bubbles-list-filter-tags": "[]", "bubbles-list-show-no-tag": "true", "bubbles-list-sort-by": "tag", "bubbles-list-sort-order": "asc" },
      "deviceLanguage": "en-US",
      "expected": { "themeMode": "dark", "design": "aurora", "language": "en", "mainView": "list", "labelFontSize": 12, "bubbleBackground": false, "showCategoriesPanel": true, "showInstructions": false, "bubbleFilter": { "categoryIds": ["c1", "c2"], "showUncategorized": false, "plannedOnly": true }, "listFilter": { "categoryIds": [], "showUncategorized": true }, "listSort": { "by": "category", "order": "asc" } }
    },
    {
      "name": "garbage-values-fall-back-to-defaults",
      "localStorage": { "app-theme-mode": "blue", "app-design": "neon", "bubbles-font-size": "99", "bubbles-filter-tags": "not json", "bubbles-list-sort-by": "priority", "bubbles-list-sort-order": "up" },
      "deviceLanguage": "de-DE",
      "expected": { "themeMode": "system", "design": "classic", "language": "en", "mainView": "bubbles", "labelFontSize": 8, "bubbleBackground": true, "showCategoriesPanel": false, "showInstructions": true, "bubbleFilter": { "categoryIds": null, "showUncategorized": true, "plannedOnly": false }, "listFilter": { "categoryIds": null, "showUncategorized": true }, "listSort": { "by": "updatedAt", "order": "desc" } }
    }
  ]
}
```

- [ ] **Step 2: Написать падающий тест `src/contract/migrateV1.test.js`**

```js
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import fixtures from '../../contract/fixtures/migration-v1.json';
import { mapTaskV1, mapCategoriesV1, settingsFromLocalStorage } from './migrateV1';
import { validateTask, validateCategory, validateSettings } from './validate';

const ctx = {
    now: new Date(fixtures.context.now),
    timeZone: fixtures.context.timeZone,
    language: fixtures.context.language,
    categoryIds: new Set(fixtures.context.categoryIds),
};

describe('mapTaskV1 (contract fixtures)', () => {
    it.each(fixtures.tasks)('$name', ({ v1, expected, notes }) => {
        expect(mapTaskV1(v1, ctx)).toEqual({ task: expected, notes });
        if (expected) expect(validateTask(expected)).toEqual([]);
    });

    it('produces English placeholder titles for English users', () => {
        const { task } = mapTaskV1({ id: 'x', title: '  ' }, { ...ctx, language: 'en' });
        expect(task.title).toBe('Untitled');
    });

    it('keeps timestamps stored as Firestore Timestamp objects', () => {
        const stamp = { toDate: () => new Date('2026-10-01T08:00:00.000Z') };
        const { task, notes } = mapTaskV1({ id: 'x', title: 'T', createdAt: stamp, updatedAt: stamp }, ctx);
        expect(task.createdAt).toBe('2026-10-01T08:00:00.000Z');
        expect(task.updatedAt).toBe('2026-10-01T08:00:00.000Z');
        expect(notes).toEqual([]);
    });
});

describe('mapCategoriesV1 (contract fixtures)', () => {
    it('keeps ids and order and fixes colours', () => {
        const result = mapCategoriesV1(fixtures.categories.v1);
        expect(result).toEqual({ categories: fixtures.categories.expected, notes: fixtures.categories.notes });
        result.categories.forEach((category) => expect(validateCategory(category)).toEqual([]));
    });

    it('returns nothing for a missing array', () => {
        expect(mapCategoriesV1(undefined)).toEqual({ categories: [], notes: [] });
    });

    it('drops categories beyond the 20 palette colours instead of inventing a colour', () => {
        const tags = Array.from({ length: 21 }, (_, i) => ({ id: `t${i}`, name: `N${i}`, color: '#000000' }));
        const { categories, notes } = mapCategoriesV1(tags);
        expect(categories).toHaveLength(20);
        expect(new Set(categories.map((c) => c.color)).size).toBe(20);
        expect(notes).toContainEqual({ id: 't20', code: 'category-dropped' });
    });
});

describe('settingsFromLocalStorage (contract fixtures)', () => {
    it.each(fixtures.settings)('$name', ({ localStorage: stored, deviceLanguage, expected }) => {
        const getItem = (key) => (Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null);
        const result = settingsFromLocalStorage(getItem, deviceLanguage);
        expect(result).toEqual(expected);
        expect(validateSettings(result)).toEqual([]);
    });

    it('falls back to defaults when storage access throws', () => {
        const getItem = () => {
            throw new Error('SecurityError');
        };
        const result = settingsFromLocalStorage(getItem, 'uk');
        expect(result.language).toBe('uk');
        expect(validateSettings(result)).toEqual([]);
    });
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npx vitest run src/contract/migrateV1.test.js`
Expected: FAIL — `Failed to resolve import "./migrateV1" from "src/contract/migrateV1.test.js"`.

- [ ] **Step 4: Написать `src/contract/migrateV1.js`**

```js
/**
 * v1 -> v2 mapping (spec section 9.2). Used by the one-time migration and by importing v1 backups.
 * Every mapper is pure: the caller supplies `now`, the fallback zone and the UI language.
 */
import { DEFAULT_RADIUS, LIMITS, PALETTE, THEME_MODES, DESIGNS, LIST_SORT_FIELDS, SORT_ORDERS,
    createDefaultSettings, normalizeLanguage } from './schema';
import { parseLocal, isValidTimeZone, toLocal } from './time';
import { htmlToMarkdown, plainTextToMarkdown } from './markdown';
import { isValidId } from './validate';
import { LS } from '../utils/storageKeys';

const PRESET_MINUTES = { '5m': 5, '10m': 10, '15m': 15, '1h': 60, '1d': 1440 };
const UNIT_MINUTES = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
const NAIVE_LOCAL_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2}(\.\d+)?)?$/;
const UNTITLED = { en: 'Untitled', uk: 'Без назви' };

const reminderMinutes = (n) => {
    if (typeof n === 'string') return PRESET_MINUTES[n] ?? NaN;
    if (typeof n === 'number') return n;
    if (n && typeof n === 'object') {
        if (n.type === 'custom') return Number(n.value) * (UNIT_MINUTES[n.unit] ?? NaN);
        if ('minutesBefore' in n) return Number(n.minutesBefore);
    }
    return NaN;
};

const mapReminders = (list, notes) => {
    const minutesSet = new Set();
    (Array.isArray(list) ? list : []).forEach((n) => {
        const minutes = reminderMinutes(n);
        if (!Number.isFinite(minutes) || minutes <= 0) {
            notes.add('reminder-dropped');
            return;
        }
        const rounded = Math.min(LIMITS.reminderMaxMinutes,
            Math.max(LIMITS.reminderStepMinutes, Math.ceil(minutes / LIMITS.reminderStepMinutes) * LIMITS.reminderStepMinutes));
        if (rounded !== minutes) notes.add('reminders-rounded');
        minutesSet.add(rounded);
    });
    const sorted = [...minutesSet].sort((a, b) => a - b);
    if (sorted.length > LIMITS.maxReminders) notes.add('reminders-truncated');
    return sorted.slice(0, LIMITS.maxReminders);
};

const mapDue = (dueDate, tz, ctx, notes) => {
    if (dueDate === null || dueDate === undefined || dueDate === '') return null;
    const zone = isValidTimeZone(tz) ? tz : ctx.timeZone;
    if (typeof dueDate === 'string') {
        const naive = NAIVE_LOCAL_RE.exec(dueDate);
        if (naive && parseLocal(naive[1])) return { local: naive[1], tz: zone };
        const instant = new Date(dueDate);
        if (Number.isFinite(instant.getTime())) return { local: toLocal(instant, zone), tz: zone };
    }
    notes.add('due-dropped');
    return null;
};

const mapRepeat = (recurrence, due, notes) => {
    if (!due || !recurrence || typeof recurrence !== 'object') return null;
    let every = Math.max(1, Math.floor(Number(recurrence.every) || 1));
    let unit = recurrence.unit;
    if (unit === 'minutes') {
        every = Math.ceil(every / 60);
        unit = 'hours';
        notes.add('repeat-rounded');
    }
    if (!['hours', 'days', 'weeks', 'months'].includes(unit)) {
        notes.add('repeat-dropped');
        return null;
    }
    const repeat = { every: Math.min(every, LIMITS.repeatEveryMax), unit };
    if (unit === 'weeks' && Array.isArray(recurrence.weekDays)) {
        const days = [...new Set(recurrence.weekDays
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
            .map((d) => (d === 0 ? 7 : d)))].sort((a, b) => a - b);
        if (days.length > 0) repeat.weekdays = days;
    }
    if (unit === 'months') repeat.monthDay = parseLocal(due.local).day;
    return repeat;
};

// Accepts ISO strings and Firestore Timestamp-like objects ({ toDate() }).
const timestampMs = (value) => {
    if (typeof value === 'string') return Date.parse(value);
    if (value && typeof value.toDate === 'function') return value.toDate().getTime();
    return NaN;
};

const isoOrNow = (value, ctx, notes) => {
    const ms = timestampMs(value);
    if (Number.isFinite(ms) && ms <= ctx.now.getTime()) return new Date(ms).toISOString();
    notes.add('timestamp-fixed');
    return ctx.now.toISOString();
};

const mapDescription = (v1, notes) => {
    if (typeof v1.description !== 'string' || v1.description === '') return '';
    let description;
    if (v1.useRichText === true) {
        const converted = htmlToMarkdown(v1.description);
        if (converted.lossy) notes.add('formatting-lost');
        description = converted.markdown;
    } else {
        description = plainTextToMarkdown(v1.description);
    }
    if (description.length > LIMITS.descriptionMaxLength) {
        notes.add('description-truncated');
        return description.slice(0, LIMITS.descriptionMaxLength);
    }
    return description;
};

/**
 * Maps one v1 task record. ctx = { now: Date, timeZone: string, language: 'en'|'uk', categoryIds: Set<string> }.
 * Returns { task: v2 plain task | null, notes: string[] (sorted note codes) }.
 */
export const mapTaskV1 = (v1, ctx) => {
    const id = v1 && v1.id !== undefined && v1.id !== null ? String(v1.id) : '';
    if (!isValidId(id)) return { task: null, notes: ['invalid-record'] };
    const notes = new Set();

    let title = typeof v1.title === 'string' ? v1.title.trim() : '';
    if (!title) {
        title = UNTITLED[ctx.language] || UNTITLED.en;
        notes.add('title-defaulted');
    }
    if (title.length > LIMITS.titleMaxLength) {
        title = title.slice(0, LIMITS.titleMaxLength);
        notes.add('title-truncated');
    }

    let status = v1.status;
    if (status === 'postpone') {
        status = 'active';
        notes.add('status-postpone');
    }
    if (!['active', 'done', 'deleted'].includes(status)) status = 'active';

    const due = mapDue(v1.dueDate, v1.tz, ctx, notes);
    const radius = Number(v1.radius);
    const task = {
        id,
        title,
        description: mapDescription(v1, notes),
        categoryId: typeof v1.tagId === 'string' && ctx.categoryIds.has(v1.tagId) ? v1.tagId : null,
        status,
        due,
        reminders: due ? mapReminders(v1.notifications, notes) : [],
        repeat: mapRepeat(v1.recurrence, due, notes),
        radius: Number.isFinite(radius) && radius > 0
            ? Math.min(LIMITS.radiusMax, Math.max(LIMITS.radiusMin, Math.round(radius)))
            : DEFAULT_RADIUS,
        pulseMuted: v1.overduePulseSuppressed === true,
        createdAt: isoOrNow(v1.createdAt, ctx, notes),
        updatedAt: isoOrNow(v1.updatedAt, ctx, notes),
        deletedAt: status === 'deleted' ? isoOrNow(v1.deletedAt, ctx, notes) : null,
    };
    return { task, notes: [...notes].sort() };
};

/**
 * Maps the v1 tags array. Keeps ids and order; a colour outside the palette or already taken
 * is replaced by the first free palette colour. Returns { categories, notes: [{ id, code }] }.
 */
export const mapCategoriesV1 = (tags) => {
    const records = [];
    const notes = [];
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
        const id = tag && tag.id !== undefined && tag.id !== null ? String(tag.id) : '';
        if (!isValidId(id) || records.some((r) => r.id === id)) {
            notes.push({ id: id || null, code: 'invalid-record' });
            return;
        }
        records.push({
            id,
            name: typeof tag.name === 'string' ? tag.name.trim() : '',
            color: typeof tag.color === 'string' ? tag.color.toLowerCase() : null,
        });
    });

    const used = new Set();
    records.forEach((r) => {
        if (PALETTE.includes(r.color) && !used.has(r.color)) used.add(r.color);
        else r.color = null;
    });

    const categories = [];
    records.forEach((r) => {
        let color = r.color;
        if (color === null) {
            color = PALETTE.find((c) => !used.has(c));
            if (!color) {
                notes.push({ id: r.id, code: 'category-dropped' });
                return;
            }
            used.add(color);
            notes.push({ id: r.id, code: 'color-changed' });
        }
        let name = r.name;
        if (!name) {
            name = 'Category';
            notes.push({ id: r.id, code: 'name-defaulted' });
        }
        if (name.length > LIMITS.categoryNameMaxLength) {
            name = name.slice(0, LIMITS.categoryNameMaxLength);
            notes.push({ id: r.id, code: 'name-truncated' });
        }
        categories.push({ id: r.id, name, color, order: categories.length + 1 });
    });
    return { categories, notes };
};

// localStorage can throw (blocked storage, private mode): treat that as "not stored".
const readRaw = (getItem, key) => {
    try {
        const raw = getItem(key);
        return raw === undefined ? null : raw;
    } catch {
        return null;
    }
};

const readString = (getItem, key) => {
    const raw = readRaw(getItem, key);
    if (raw === null) return null;
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === 'string' ? parsed : raw;
    } catch {
        return raw;
    }
};

const readJson = (getItem, key) => {
    const raw = readRaw(getItem, key);
    if (raw === null) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
};

const readBoolean = (getItem, key, fallback) => {
    const value = readJson(getItem, key);
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return fallback;
};

const readIdList = (getItem, key) => {
    const value = readJson(getItem, key);
    return Array.isArray(value) ? value.filter(isValidId) : null;
};

/** Builds v2 settings from the legacy localStorage keys (spec table 3.5). getItem = localStorage.getItem. */
export const settingsFromLocalStorage = (getItem, deviceLanguage) => {
    const s = createDefaultSettings(deviceLanguage);
    const theme = readString(getItem, LS.THEME_MODE);
    if (THEME_MODES.includes(theme)) s.themeMode = theme;
    const design = readString(getItem, LS.DESIGN);
    if (DESIGNS.includes(design)) s.design = design;
    const language = readString(getItem, LS.I18N_LNG);
    if (language) s.language = normalizeLanguage(language);
    s.mainView = readString(getItem, LS.MAIN_VIEW) === 'tasks' ? 'list' : 'bubbles';
    const fontSize = Number.parseInt(readString(getItem, LS.FONT_SIZE), 10);
    if (Number.isInteger(fontSize) && fontSize >= LIMITS.fontSizeMin && fontSize <= LIMITS.fontSizeMax) {
        s.labelFontSize = fontSize;
    }
    s.bubbleBackground = readBoolean(getItem, LS.BACKGROUND_ENABLED, true);
    s.showCategoriesPanel = readBoolean(getItem, LS.CATEGORIES_PANEL_ENABLED, false);
    s.showInstructions = readBoolean(getItem, LS.SHOW_INSTRUCTIONS, true);
    s.bubbleFilter = {
        categoryIds: readIdList(getItem, LS.FILTER_TAGS),
        showUncategorized: readBoolean(getItem, LS.SHOW_NO_TAG, true),
        plannedOnly: readBoolean(getItem, LS.PLANNED_TASKS_ONLY, false),
    };
    s.listFilter = {
        categoryIds: readIdList(getItem, LS.LIST_FILTER_TAGS),
        showUncategorized: readBoolean(getItem, LS.LIST_SHOW_NO_TAG, true),
    };
    const sortBy = readString(getItem, LS.LIST_SORT_BY);
    const by = sortBy === 'tag' ? 'category' : sortBy;
    const order = readString(getItem, LS.LIST_SORT_ORDER);
    s.listSort = {
        by: LIST_SORT_FIELDS.includes(by) ? by : 'updatedAt',
        order: SORT_ORDERS.includes(order) ? order : 'desc',
    };
    return s;
};
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npx vitest run src/contract/migrateV1.test.js`
Expected: PASS — `Tests  18 passed (18)`.

- [ ] **Step 6: Полная проверка**

Run: `npm run verify`
Expected: все тесты веба и функций проходят (веб — на 122 теста больше, чем до плана), линтер без ошибок.

- [ ] **Step 7: Commit**

```bash
git add contract/fixtures/migration-v1.json src/contract/migrateV1.js src/contract/migrateV1.test.js
git commit -F - <<'EOF'
feat(contract): map v1 tasks, categories and settings to v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
