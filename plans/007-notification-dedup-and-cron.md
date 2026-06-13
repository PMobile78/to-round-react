# Plan 007: Атомарный дедуп уведомлений и точный cron в Cloud Functions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- functions/index.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (002 даёт удобный gate `npm run test:functions`)
- **Category**: bug
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/23
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

Две проблемы в `functions/index.js`:
1. **Дубли уведомлений.** Дедуп — это check-then-set без транзакции (`wasNotificationSent` → отправка → `markNotificationSent`). `onSchedule` каждую минуту с `maxInstances: 10` допускает наложение прогонов: два параллельных прогона оба видят «не отправлено» и шлют одно и то же уведомление дважды. Лечится атомарным «захватом» ключа через `create()` (падает, если документ уже есть).
2. **Cleanup может не срабатывать.** Часовая чистка коллекции `notification-sent` гейтится `now.getMinutes() === 0`, а расписание `every 1 minutes` — это interval-based schedule, который дрейфует по секундам и может перескакивать нулевую минуту. Crontab-форма `* * * * *` запускается в точные минуты.

## Current state

- `functions/index.js:249-258`:
  ```js
  async function wasNotificationSent(key) {
      const ref = db.collection('notification-sent').doc(key);
      const snap = await ref.get();
      return snap.exists;
  }

  async function markNotificationSent(key) {
      const ref = db.collection('notification-sent').doc(key);
      await ref.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  ```
- Использования: `handleReminder` (`functions/index.js:435-451`):
  ```js
  const key = buildReminderKey(userId, bubble, rem.minutesBefore);
  if (await wasNotificationSent(key)) return;
  ...
  await sendFcmToUser(userId, {...}, tokens);
  await markNotificationSent(key);
  ```
  и `handleOverdue` (`functions/index.js:471-478`):
  ```js
  const key = buildOverdueKey(userId, bubble);
  if (!(await wasNotificationSent(key))) {
      ...
      await sendFcmToUser(userId, {...}, tokens);
      await markNotificationSent(key);
  }
  ```
- `functions/index.js:518-530`:
  ```js
  exports.scheduleDueDateNotifications = onSchedule({
      schedule: 'every 1 minutes',
      region: 'europe-west1',
      maxInstances: 10
  }, async () => {
      const now = new Date();

      if (now.getMinutes() === 0) {
          try { await cleanupOldNotificationSent(); }
          catch (e) { console.error('cleanupOldNotificationSent error', e); }
      }
  ```
- Тесты: `functions/test-next-notify.js` покрывает только чистые функции (`computeNextNotifyAt` и др.) — этих функций не касается.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install functions deps | `cd functions && npm ci` | exit 0 |
| Тесты functions | `cd functions && TZ=UTC node test-next-notify.js` | exit 0, все PASS |
| Lint functions | `cd functions && npm run lint` | exit 0 (если eslint-конфиг в functions есть; если падает с «no config» — пропустить, отметить) |
| Синтаксис | `node --check functions/index.js` | exit 0 |

## Scope

**In scope**: `functions/index.js` (функции дедупа, два call-site, строка schedule).

**Out of scope**:
- Деплой функций (`firebase deploy`) — НЕ выполнять; деплоит владелец.
- `cleanupOldNotificationSent` внутренности, ключи `buildReminderKey`/`buildOverdueKey`.
- `maintainNextNotifyAt`, клиентский код.

## Git workflow

- Ветка: `advisor/007-notification-dedup`. **Не пушить в `main`** (автодеплой фронта; функции деплоятся отдельно владельцем).

## Steps

### Step 1: Атомарный захват ключа

Заменить пару `wasNotificationSent`/`markNotificationSent` одной функцией:

```js
// Атомарный дедуп: create() падает, если ключ уже существует.
// true → ключ захвачен этим прогоном, можно отправлять; false → уже отправлено/отправляется.
async function claimNotificationKey(key) {
    const ref = db.collection('notification-sent').doc(key);
    try {
        await ref.create({ sentAt: admin.firestore.FieldValue.serverTimestamp() });
        return true;
    } catch (e) {
        if (e && (e.code === 6 || String(e.code).toUpperCase().includes('ALREADY_EXISTS'))) return false;
        throw e;
    }
}
```

(gRPC-код 6 = ALREADY_EXISTS в Admin SDK.)

**Verify**: `node --check functions/index.js` → exit 0.

### Step 2: Переключить call-sites на «захватил → отправил»

В `handleReminder`:
```js
const key = buildReminderKey(userId, bubble, rem.minutesBefore);
if (!(await claimNotificationKey(key))) return;
const url = ...;
await sendFcmToUser(...);
```
(строку `await markNotificationSent(key);` удалить).

В `handleOverdue` — аналогично:
```js
const key = buildOverdueKey(userId, bubble);
if (await claimNotificationKey(key)) {
    const url = ...;
    await sendFcmToUser(...);
}
```

Семантика осознанно меняется: ключ захватывается **до** отправки. Если отправка после захвата упала, уведомление потеряется (раньше был шанс ретрая, но и шанс дубля). Для напоминалок потеря хуже дубля? Нет: владелец проекта принял компромисс «лучше недослать, чем слать дважды»; ошибка отправки логируется в `sendFcmToUser` (`functions/index.js:105`).

Удалить теперь неиспользуемые `wasNotificationSent` и `markNotificationSent`.

**Verify**: `grep -n 'wasNotificationSent\|markNotificationSent' functions/index.js` → пусто; `grep -c 'claimNotificationKey' functions/index.js` → `3` (определение + 2 вызова); `node --check functions/index.js` → exit 0.

### Step 3: Crontab-расписание

`schedule: 'every 1 minutes'` → `schedule: '* * * * *'`. Гейт `now.getMinutes() === 0` оставить как есть — с точным cron он надёжен.

**Verify**: `grep -n "schedule: '\* \* \* \* \*'" functions/index.js` → 1 совпадение.

### Step 4: Тесты и коммит

`cd functions && TZ=UTC node test-next-notify.js` → все PASS. Затем `git add functions/index.js && git commit -m "Atomic notification dedup via create() and exact cron schedule"`.

## Test plan

Существующие тесты чистых функций должны остаться зелёными (этот код они не покрывают, но require всего index.js поймает синтаксические ошибки). Юнит-тест `claimNotificationKey` требует эмулятора Firestore — вне scope, отметить в отчёте.

## Done criteria

- [ ] `claimNotificationKey` определён, оба call-site используют его, старые функции удалены
- [ ] `schedule: '* * * * *'`
- [ ] `node --check functions/index.js` → exit 0
- [ ] `cd functions && TZ=UTC node test-next-notify.js` → exit 0
- [ ] `plans/README.md`: строка плана 007 → DONE; в отчёте напомнить владельцу про деплой функций

## STOP conditions

- Выдержки call-site'ов не совпали с живым кодом.
- В `functions/index.js` обнаружились другие вызовы `wasNotificationSent`/`markNotificationSent`, кроме двух описанных.

## Maintenance notes

- **Деплой**: изменения вступят в силу только после `firebase deploy --only functions` владельцем.
- Если когда-нибудь понадобится ретрай неудачных отправок — захваченный ключ нужно будет удалять при ошибке отправки (осознанно не сделано сейчас).
- Ревьюеру: проверить обработку кода ошибки ALREADY_EXISTS (числовой 6 и строковый вариант).
