# Plan 014: Общие date/time-утилиты в src + фикс парсера offset-пресетов

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/pages/BubblesPage.js src/hooks/useMatterEngine.js src/utils/`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: 002 (тесты — основной gate этого плана)
- **Category**: tech-debt
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Логика парсинга «наивных» локальных дат (`"YYYY-MM-DDTHH:mm:ss"`) и оффсетов уведомлений продублирована: клиентская копия живёт внутри `BubblesPage.js`, серверная — в `functions/index.js` (с TZDate). Внутри src копии расходятся с сервером уже сейчас: клиентский `getOffsetMs` не понимает строковый пресет недель `'Nw'` (вернёт 0 → уведомление «за 2 недели» клиентски трактуется как «в момент дедлайна»), тогда как серверный парсер понимает `[mhdw]`. Цель: единый модуль `src/utils/dateTime.js` + юнит-тесты. Серверную копию НЕ трогаем (functions — отдельный Node-пакет, CRA не может импортировать вне `src/`; честный общий пакет — отдельное решение).

## Current state

- `src/pages/BubblesPage.js:112-131` — клиентский `parseLocalDateTime(dateString)` (без tz):
  ```js
  const parseLocalDateTime = (dateString) => {
      if (!dateString) return null;
      try {
          if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
              return new Date(dateString);
          }
          const [datePart, timePart] = dateString.split('T');
          if (!datePart || !timePart) return new Date(dateString);
          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes, seconds);
      } catch (_) { return null; }
  };
  ```
  Рядом должен быть `formatLocalDateTime` (используется в обработчике правки, строка 944) и `getUserTimeZone` (строка 969) — найди их грепом и включи в инвентаризацию.
- `BubblesPage.js:2032-2049` — клиентский `getOffsetMs(notification)`: строковые пресеты только `m|h|d` (нет `w`), объектная форма `{type:'custom', value, unit}` понимает weeks.
- Серверный аналог: `functions/index.js:131-155` — `parseLocalDateTime(dateString, tz)` с TZDate; отличие в детекте ISO-строк: сервер использует `(dateString.match(/-/g) || []).length > 2`, клиент — `dateString.includes('-', 10)`. Серверные правила — образец (但 без TZDate в src — пока tz клиенту не нужен, см. Maintenance).
- Потребители в src: `BubblesPage.js` (многочисленно), `useMatterEngine.js` (использует `parseLocalDateTime` в live-sync колбэке — проверь, передаётся ли он параметром хука или импортируется).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0, новые тесты в выводе |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**:
- `src/utils/dateTime.js` (создать), `src/utils/dateTime.test.js` (создать)
- `src/pages/BubblesPage.js`, `src/hooks/useMatterEngine.js` (замена локальных копий на импорт)

**Out of scope**:
- `functions/index.js` и functions-пакет целиком (общий npm-пакет — отдельное решение, не в этом плане).
- Изменение поведения parse/format (кроме фикса `'Nw'` в getOffsetMs — он и есть цель).
- TZDate на клиенте.

## Git workflow

- Ветка: `advisor/014-datetime-utils`. **Не пушить в `main`**.

## Steps

### Step 1: Инвентаризация

`grep -n 'parseLocalDateTime\|formatLocalDateTime\|getOffsetMs\|getUserTimeZone' src/ -r` — выписать все определения и потребителей. Ожидание: определения только в `BubblesPage.js`; потребители — `BubblesPage.js` и (через параметры или импорт) `useMatterEngine.js`. Несовпадение — STOP.

### Step 2: Создать src/utils/dateTime.js

Перенести `parseLocalDateTime`, `formatLocalDateTime`, `getUserTimeZone`, `getOffsetMs` **байт-в-байт по поведению**, с одним изменением: в `getOffsetMs` добавить ветку
```js
if (notification.endsWith('w')) return parseInt(notification) * 7 * 24 * 60 * 60 * 1000;
```
рядом с `m|h|d`. Экспортировать все четыре функции.

**Verify**: `CI=true npm run build` → exit 0.

### Step 3: Тесты (до переключения потребителей)

`src/utils/dateTime.test.js`:
- `parseLocalDateTime`: наивная строка → локальное время; строка с `Z` → UTC; пустая → null; мусор → null или Date(мусор) — зафиксировать фактическое поведение;
- `getOffsetMs`: `'10m'`, `'2h'`, `'3d'`, `'2w'` (новая ветка → 1209600000), `{type:'custom', value:2, unit:'weeks'}`, неизвестная строка → 0;
- `formatLocalDateTime`: round-trip с parseLocalDateTime.

**Verify**: `CI=true npm run test:ci` → exit 0.

### Step 4: Переключить потребителей

Удалить локальные определения из `BubblesPage.js`, импортировать из `../utils/dateTime`. Если `useMatterEngine` получал функции параметрами — можно оставить параметры (меньше правок) или импортировать напрямую; выбрать вариант с меньшим диффом.

**Verify**: `grep -n 'const parseLocalDateTime\|function getOffsetMs' src/pages/BubblesPage.js` → пусто; `CI=true npm run build` → exit 0.

### Step 5: Коммит

`git commit -am "Extract shared dateTime utils, fix weeks preset in getOffsetMs"`

## Test plan

См. шаг 3 — это основной deliverable плана наряду с дедупликацией. Образец: тест из plans/002.

## Done criteria

- [ ] `src/utils/dateTime.js` — 4 экспортируемые функции; тесты к ним зелёные
- [ ] В `BubblesPage.js` нет локальных определений этих функций
- [ ] `getOffsetMs('2w')` покрыт тестом и равен 1209600000
- [ ] `CI=true npm run build` и `npm run test:ci` → exit 0
- [ ] `plans/README.md`: строка плана 014 → DONE

## STOP conditions

- Шаг 1 нашёл вторые/третьи определения с ДРУГИМ поведением — перечисли и STOP (молча выбирать «победителя» нельзя).
- Существующие вызовы `getOffsetMs` где-то полагаются на «строка с w → 0» (маловероятно, но проверь потребителей перед фиксом).

## Maintenance notes

- Сервер (`functions/index.js:131-155`) остаётся источником истины по tz-логике; при изменении формата дат менять оба места — пометка об этом уже есть смыслом этого плана. Следующий шаг при желании — общий пакет или копируемый файл с тестом на идентичность.
- Клиентский parseLocalDateTime игнорирует `bubble.tz`: для пользователя, сменившего таймзону после создания задачи, клиент покажет время «по цифрам», сервер пошлёт по зоне создания. Низкий приоритет, зафиксировано здесь.
