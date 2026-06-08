# Schedule Cost Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перестать читать все активные задачи каждую минуту — выбирать только задачи, которым пора слать уведомление, через индексируемое поле `nextNotifyAt`.

**Architecture:** В каждый документ задачи пишется `nextNotifyAt` (Firestore `Timestamp`) — момент ближайшего необработанного события. Серверный триггер `onDocumentWritten` поддерживает поле при правках пользователя; scheduled-функция запрашивает `where('nextNotifyAt','<=', now)` и после обработки сдвигает поле вперёд. Стоимость определяется числом срабатываний, а не объёмом базы. Точность остаётся минутной (`every 1 minutes`).

**Tech Stack:** Node 22, firebase-functions v2 (^7.2.5), firebase-admin (^13.10.0), date-fns 4 + @date-fns/tz, Firestore. Тесты — node-скрипты в стиле `functions/test-tz.js`.

**Спецификация:** `docs/superpowers/specs/2026-06-08-schedule-cost-optimization-design.md`

---

## File Structure

- **Modify** `functions/index.js` — добавить `computeNextNotifyAt`, `pickReminderToSend`, `significantChanged`, `updateNextNotifyAt`, `fetchDueBubbles`, `handleReminder`, `handleOverdue`, триггер `maintainNextNotifyAt`; переписать тело `scheduleDueDateNotifications`; добавить `maxInstances`; расширить `exports._test`; удалить осиротевшие `fetchAllUserBubbles` и `shouldTriggerReminderNow`.
- **Create** `functions/test-next-notify.js` — unit-тесты чистых функций (стиль `test-tz.js`).
- **Create** `functions/backfill-next-notify.js` — разовый локальный скрипт заполнения поля.
- **Modify** `firestore.indexes.json` — composite index `status` + `nextNotifyAt` (collection group).

Все вычислительные функции экспортируются в `exports._test`, чтобы их можно было покрыть тестами и переиспользовать в backfill-скрипте.

---

## Task 1: `computeNextNotifyAt` — ядро расчёта

**Files:**
- Modify: `functions/index.js` (добавить функцию рядом с `shouldTriggerReminderNow`, ~строка 203; расширить `exports._test`, строка 513)
- Test: `functions/test-next-notify.js` (создать)

- [ ] **Step 1: Написать падающий тест**

Создать `functions/test-next-notify.js`:

```js
/* eslint-disable no-console */
// Run: TZ=UTC node functions/test-next-notify.js
const { _test } = require('./index.js');
const { computeNextNotifyAt } = _test;

let failed = 0;
const check = (name, actual, expected) => {
    const ok = actual === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};
const iso = (d) => (d ? d.toISOString() : 'null');

// due Kyiv 15:00 == 12:00Z (summer +3); reminders 11:00Z (за 60), 11:50Z (за 10); overdue 12:00Z
const mk = (over) => Object.assign({
    status: 'active',
    dueDate: '2026-06-07T15:00:00',
    tz: 'Europe/Kyiv',
    notifications: [{ minutesBefore: 60 }, { minutesBefore: 10 }]
}, over);

check('next = ближайший будущий reminder',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T10:00:00Z'))), '2026-06-07T11:00:00.000Z');
check('next = второй reminder',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T11:30:00Z'))), '2026-06-07T11:50:00.000Z');
check('next = overdue moment',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T11:55:00Z'))), '2026-06-07T12:00:00.000Z');
check('просрочено, overdue не отправлен → fromTime',
    iso(computeNextNotifyAt(mk(), new Date('2026-06-07T12:30:00Z'))), '2026-06-07T12:30:00.000Z');
check('просрочено, overdueSticky → null',
    computeNextNotifyAt(mk({ overdueSticky: true }), new Date('2026-06-07T12:30:00Z')), null);
check('просрочено, suppressed → null',
    computeNextNotifyAt(mk({ overduePulseSuppressed: true }), new Date('2026-06-07T12:30:00Z')), null);
check('recurrence, просрочено → fromTime',
    iso(computeNextNotifyAt(mk({ recurrence: { every: 1, unit: 'days' } }), new Date('2026-06-07T12:30:00Z'))), '2026-06-07T12:30:00.000Z');
check('status != active → null',
    computeNextNotifyAt(mk({ status: 'done' }), new Date('2026-06-07T10:00:00Z')), null);
check('нет dueDate → null',
    computeNextNotifyAt(mk({ dueDate: null }), new Date('2026-06-07T10:00:00Z')), null);
check('нет notifications → overdue moment (due)',
    iso(computeNextNotifyAt(mk({ notifications: [] }), new Date('2026-06-07T10:00:00Z'))), '2026-06-07T12:00:00.000Z');

process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: FAIL/ошибка — `computeNextNotifyAt is not a function` (ещё не экспортирована).

- [ ] **Step 3: Реализовать `computeNextNotifyAt`**

В `functions/index.js` добавить после `shouldTriggerReminderNow` (перед `computeMinutesBefore`):

```js
// Абсолютный момент (Date) ближайшего необработанного события задачи, строго после fromTime.
// Если будущих событий нет: для активной просроченной (overdue ещё не слался) или
// повторяющейся задачи — вернуть fromTime (немедленная обработка); иначе null.
function computeNextNotifyAt(bubble, fromTime) {
    if (!bubble || bubble.status !== 'active' || !bubble.dueDate) return null;
    const due = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
    if (!due || !Number.isFinite(due.getTime())) return null;

    const fromMs = fromTime.getTime();
    const moments = [];
    if (Array.isArray(bubble.notifications)) {
        for (const notif of bubble.notifications) {
            const mb = computeMinutesBefore(notif);
            if (Number.isFinite(mb)) moments.push(subMinutes(due, mb));
        }
    }
    moments.push(due); // overdue

    let next = null;
    for (const m of moments) {
        if (m.getTime() > fromMs && (next === null || m.getTime() < next.getTime())) next = m;
    }
    if (next) return next;

    const overdueUnsent = isAfter(fromTime, due) && !bubble.overdueSticky;
    if (!bubble.overduePulseSuppressed && (overdueUnsent || bubble.recurrence)) return fromTime;
    return null;
}
```

Расширить экспорт (строка ~513):

```js
exports._test = { parseLocalDateTime, formatLocalDateTime, computeNextDueDate, computeNextFutureDueDate, isBubbleOverdue, computeNextNotifyAt };
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: все строки `PASS`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/test-next-notify.js
git commit -m "feat(functions): add computeNextNotifyAt with unit tests"
```

---

## Task 2: `pickReminderToSend` — выбор напоминания к отправке

Заменяет оконную `shouldTriggerReminderNow`: выбирает самый свежий reminder, чьё время уже наступило (`<= now`), без жёсткого 1-минутного окна — пропуск минуты больше не теряет напоминание.

**Files:**
- Modify: `functions/index.js` (добавить функцию; расширить `exports._test`)
- Test: `functions/test-next-notify.js`

- [ ] **Step 1: Дописать падающие тесты**

В конце `functions/test-next-notify.js`, перед `process.exit(...)`, добавить:

```js
const { pickReminderToSend } = _test;
const pick = (b, now) => pickReminderToSend(b, now);

check('reminder: оба прошли → самый свежий (за 10)',
    pick(mk(), new Date('2026-06-07T11:50:30Z')).minutesBefore, 10);
check('reminder: прошёл только первый (за 60)',
    pick(mk(), new Date('2026-06-07T11:00:30Z')).minutesBefore, 60);
check('reminder: ни один не наступил → null',
    pick(mk(), new Date('2026-06-07T10:00:00Z')), null);
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: FAIL — `pickReminderToSend is not a function` / `Cannot read properties of null`.

- [ ] **Step 3: Реализовать `pickReminderToSend`**

В `functions/index.js` добавить после `computeNextNotifyAt`:

```js
// Самый свежий reminder, чьё время наступило (reminderTime <= now) — или null.
function pickReminderToSend(bubble, now) {
    if (!bubble?.dueDate || !Array.isArray(bubble.notifications)) return null;
    const due = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
    let best = null;
    for (const notif of bubble.notifications) {
        const mb = computeMinutesBefore(notif);
        if (!Number.isFinite(mb)) continue;
        const rt = subMinutes(due, mb);
        if (!isAfter(rt, now) && (!best || isAfter(rt, best.time))) {
            best = { time: rt, minutesBefore: mb };
        }
    }
    return best;
}
```

Расширить экспорт:

```js
exports._test = { parseLocalDateTime, formatLocalDateTime, computeNextDueDate, computeNextFutureDueDate, isBubbleOverdue, computeNextNotifyAt, pickReminderToSend };
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: все `PASS`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/test-next-notify.js
git commit -m "feat(functions): add pickReminderToSend (windowless reminder selection)"
```

---

## Task 3: триггер `maintainNextNotifyAt` + гард от рекурсии

**Files:**
- Modify: `functions/index.js` (импорт `onDocumentWritten`; добавить `significantChanged` и триггер; расширить `exports._test`)
- Test: `functions/test-next-notify.js`

- [ ] **Step 1: Дописать падающие тесты для `significantChanged`**

В конце `functions/test-next-notify.js`, перед `process.exit(...)`:

```js
const { significantChanged } = _test;
const base = { dueDate: '2026-06-07T15:00:00', notifications: [{ minutesBefore: 10 }], status: 'active', recurrence: null };

check('значимые поля не менялись → false',
    significantChanged(base, { ...base }), false);
check('изменился dueDate → true',
    significantChanged(base, { ...base, dueDate: '2026-06-08T15:00:00' }), true);
check('изменился только updatedAt → false',
    significantChanged({ ...base, updatedAt: 1 }, { ...base, updatedAt: 2 }), false);
check('изменился nextNotifyAt → false (не значимое)',
    significantChanged({ ...base, nextNotifyAt: 1 }, { ...base, nextNotifyAt: 2 }), false);
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: FAIL — `significantChanged is not a function`.

- [ ] **Step 3: Реализовать импорт, `significantChanged` и триггер**

В шапке `functions/index.js` после строки с `onSchedule` (строка 3) добавить:

```js
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
```

Добавить рядом с `pickReminderToSend`:

```js
const SIGNIFICANT_FIELDS = ['dueDate', 'notifications', 'status', 'recurrence'];

// Менялись ли поля, влияющие на nextNotifyAt (гард от рекурсии триггера).
function significantChanged(before, after) {
    for (const f of SIGNIFICANT_FIELDS) {
        if (JSON.stringify(before?.[f]) !== JSON.stringify(after?.[f])) return true;
    }
    return false;
}
```

Добавить экспорт триггера (рядом со scheduled-функцией):

```js
// Поддерживает nextNotifyAt при создании/редактировании задачи пользователем.
exports.maintainNextNotifyAt = onDocumentWritten({
    document: 'user-bubbles/{uid}/bubbles/{bubbleId}',
    region: 'europe-west1',
    maxInstances: 10
}, async (event) => {
    const after = event.data?.after;
    if (!after || !after.exists) return null; // удаление
    const afterData = after.data() || {};
    const before = event.data?.before?.exists ? event.data.before.data() : null;

    // Реагируем только на изменение значимых полей: наша же запись nextNotifyAt не зациклит триггер.
    if (before && !significantChanged(before, afterData)) return null;

    const next = computeNextNotifyAt(afterData, new Date());
    await after.ref.set({
        nextNotifyAt: next
            ? admin.firestore.Timestamp.fromDate(next)
            : admin.firestore.FieldValue.delete()
    }, { merge: true });
    return null;
});
```

Расширить экспорт `_test`:

```js
exports._test = { parseLocalDateTime, formatLocalDateTime, computeNextDueDate, computeNextFutureDueDate, isBubbleOverdue, computeNextNotifyAt, pickReminderToSend, significantChanged };
```

- [ ] **Step 4: Запустить unit-тесты — убедиться, что проходят**

Run: `TZ=UTC node functions/test-next-notify.js`
Expected: все `PASS`, exit code 0.

- [ ] **Step 5: Проверить триггер в эмуляторе (ручная verify)**

Run: `cd functions && firebase emulators:start --only functions,firestore`
В эмуляторе UI создать документ `user-bubbles/u1/bubbles/b1` с `status:'active'`, будущим `dueDate`, `notifications:[{minutesBefore:10}]`.
Expected: у документа появляется поле `nextNotifyAt`; повторная запись только `nextNotifyAt` **не** вызывает новый цикл (в логах один вызов `maintainNextNotifyAt`, без рекурсии).

- [ ] **Step 6: Commit**

```bash
git add functions/index.js functions/test-next-notify.js
git commit -m "feat(functions): add maintainNextNotifyAt trigger with recursion guard"
```

---

## Task 4: переписать scheduled-функцию (запрос + обработка + сдвиг)

**Files:**
- Modify: `functions/index.js` (заменить `fetchAllUserBubbles` на `fetchDueBubbles`; добавить `updateNextNotifyAt`, `handleReminder`, `handleOverdue`; переписать тело `scheduleDueDateNotifications`; добавить `maxInstances`; удалить `shouldTriggerReminderNow`)

Unit-логика (`computeNextNotifyAt`, `pickReminderToSend`) уже покрыта в Task 1–2. Этот таск — интеграция Firestore-запроса и оркестрация; проверяется прогоном unit-тестов (на регресс) + эмулятором.

- [ ] **Step 1: Заменить `fetchAllUserBubbles` на `fetchDueBubbles`**

Удалить функцию `fetchAllUserBubbles` (строки ~18–43) и вставить:

```js
// Только задачи, которым уже пора (nextNotifyAt <= now), сгруппированные по пользователю.
async function fetchDueBubbles(now) {
    const grouped = new Map();
    const snap = await db.collectionGroup('bubbles')
        .where('status', '==', 'active')
        .where('nextNotifyAt', '<=', admin.firestore.Timestamp.fromDate(now))
        .orderBy('nextNotifyAt')
        .get();
    snap.forEach((d) => {
        const userId = d.ref.parent.parent?.id;
        if (!userId) return;
        const list = grouped.get(userId) || [];
        list.push(Object.assign({ id: d.id }, d.data() || {}));
        grouped.set(userId, list);
    });
    return Array.from(grouped.entries()).map(([userId, bubbles]) => ({ userId, bubbles }));
}
```

- [ ] **Step 2: Добавить `updateNextNotifyAt`, `handleReminder`, `handleOverdue`**

Добавить перед `exports.scheduleDueDateNotifications`:

```js
// Пересчитать и записать nextNotifyAt от актуального (локально обновлённого) состояния задачи.
async function updateNextNotifyAt(userId, bubbleId, bubble, now) {
    const next = computeNextNotifyAt(bubble, now);
    const subDoc = db.collection('user-bubbles').doc(userId).collection('bubbles').doc(String(bubbleId));
    await subDoc.set({
        nextNotifyAt: next
            ? admin.firestore.Timestamp.fromDate(next)
            : admin.firestore.FieldValue.delete()
    }, { merge: true });
}

async function handleReminder(userId, bubble, tokens, now) {
    const rem = pickReminderToSend(bubble, now);
    if (!rem) return;
    const key = buildReminderKey(userId, bubble, rem.minutesBefore);
    if (await wasNotificationSent(key)) return;
    const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
    await sendFcmToUser(userId, {
        data: {
            bubbleId: String(bubble.id || ''),
            type: 'reminder',
            minutesBefore: String(rem.minutesBefore),
            url,
            bubbleTitle: String(bubble.title || '')
        }
    }, tokens);
    await markNotificationSent(key);
}

async function handleOverdue(userId, bubble, tokens, now) {
    // Пользователь остановил пульсацию: повторяющуюся задачу продвигаем на ближайшее будущее и молчим.
    if (bubble.overduePulseSuppressed) {
        if (bubble.recurrence && bubble.dueDate) {
            const currentDue = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
            const nextDue = computeNextFutureDueDate(currentDue, bubble.recurrence, now);
            if (nextDue) {
                await updateBubbleDueDate(userId, bubble.id, nextDue, bubble.tz);
                await updateBubbleFields(userId, bubble.id, { overdueSticky: false, overdueAt: null, overduePulseSuppressed: false });
                bubble.dueDate = formatLocalDateTime(nextDue, bubble.tz) || bubble.dueDate;
                bubble.overdueSticky = false;
                bubble.overdueAt = null;
                bubble.overduePulseSuppressed = false;
            }
        }
        return;
    }

    const key = buildOverdueKey(userId, bubble);
    if (!(await wasNotificationSent(key))) {
        const url = `${HOMEPAGE_URL}/?bubbleId=${encodeURIComponent(String(bubble.id || ''))}`;
        await sendFcmToUser(userId, {
            data: { bubbleId: String(bubble.id || ''), type: 'overdue', url, bubbleTitle: String(bubble.title || '') }
        }, tokens);
        await markNotificationSent(key);
    }
    if (!bubble.overdueSticky) {
        await updateBubbleFields(userId, bubble.id, { overdueSticky: true, overdueAt: new Date().toISOString() });
        bubble.overdueSticky = true;
    }

    // Auto-reschedule повторяющейся задачи на ближайшее будущее вхождение.
    if (bubble.recurrence && bubble.dueDate) {
        const currentDue = parseLocalDateTime(bubble.dueDate, bubble.tz) || new Date(bubble.dueDate);
        const nextDue = computeNextFutureDueDate(currentDue, bubble.recurrence, now);
        if (nextDue) {
            await updateBubbleDueDate(userId, bubble.id, nextDue, bubble.tz);
            bubble.dueDate = formatLocalDateTime(nextDue, bubble.tz) || bubble.dueDate;
        }
    }
}
```

- [ ] **Step 3: Переписать тело `scheduleDueDateNotifications` и добавить `maxInstances`**

Заменить весь `exports.scheduleDueDateNotifications = onSchedule({...}, async (event) => { ... })` (строки ~390–510) на:

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

    const users = await fetchDueBubbles(now);

    await Promise.all(users.map(async ({ userId, bubbles }) => {
        try {
            const tokens = await getUserFcmTokens(userId);
            for (const bubble of bubbles) {
                if (!bubble || bubble.status !== 'active') continue;
                try {
                    if (isBubbleOverdue(bubble)) {
                        await handleOverdue(userId, bubble, tokens, now);
                    } else {
                        await handleReminder(userId, bubble, tokens, now);
                    }
                } catch (e) {
                    console.error('Error processing bubble', userId, bubble.id, e);
                } finally {
                    // Сдвигаем nextNotifyAt всегда — иначе задача читалась бы каждую минуту.
                    await updateNextNotifyAt(userId, bubble.id, bubble, now);
                }
            }
        } catch (e) {
            console.error('Error processing user', userId, e);
        }
    }));

    return null;
});
```

- [ ] **Step 4: Удалить осиротевшую `shouldTriggerReminderNow`**

Удалить функцию `shouldTriggerReminderNow` (строки ~187–203) — её больше никто не вызывает (она не в `exports._test`).

- [ ] **Step 5: Прогнать unit-тесты и линт (регресс)**

Run: `TZ=UTC node functions/test-next-notify.js && TZ=UTC node functions/test-tz.js && cd functions && npm run lint`
Expected: все `PASS`; lint без ошибок (нет ссылок на удалённые `fetchAllUserBubbles` / `shouldTriggerReminderNow`).

- [ ] **Step 6: Проверить полный цикл в эмуляторе (ручная verify)**

Run: `cd functions && firebase emulators:start --only functions,firestore`
Создать активную задачу с `dueDate` через ~2 минуты и `notifications:[{minutesBefore:1}]`.
Expected: scheduled-функция выбирает задачу только когда `nextNotifyAt <= now`; после отправки `nextNotifyAt` сдвигается на overdue-момент, затем (без recurrence) поле удаляется и задача выпадает из выборки. В логах нет повторной обработки той же задачи каждую минуту.

- [ ] **Step 7: Commit**

```bash
git add functions/index.js
git commit -m "refactor(functions): query only due bubbles via nextNotifyAt and shift it after send"
```

---

## Task 5: composite index для запроса

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Добавить index**

В `firestore.indexes.json` заменить `"indexes": []` на:

```json
"indexes": [
    {
        "collectionGroup": "bubbles",
        "queryScope": "COLLECTION_GROUP",
        "fields": [
            { "fieldPath": "status", "order": "ASCENDING" },
            { "fieldPath": "nextNotifyAt", "order": "ASCENDING" }
        ]
    }
],
```

(Существующий блок `"fieldOverrides": [...]` сохранить без изменений.)

- [ ] **Step 2: Задеплоить индекс**

Run: `firebase deploy --only firestore:indexes`
Expected: деплой успешен; в Firebase Console → Firestore → Indexes новый composite index переходит в статус **Enabled** (может занять несколько минут).

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "chore(firestore): add composite index status + nextNotifyAt"
```

---

## Task 6: разовый backfill существующих задач

Активные задачи без `nextNotifyAt` не попадут в range-запрос. Скрипт проставляет поле для всех активных задач. Запускается **один раз** локально с service-account, затем удаляется.

**Files:**
- Create: `functions/backfill-next-notify.js`

- [ ] **Step 1: Создать скрипт**

`functions/backfill-next-notify.js`:

```js
/* eslint-disable no-console */
// Разовый backfill. Запуск:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json TZ=UTC node functions/backfill-next-notify.js
const admin = require('firebase-admin');
// require('./index.js') initializes the Firebase admin app (it calls admin.initializeApp()).
// Do NOT call admin.initializeApp() here too — that throws "default app already exists".
const { _test } = require('./index.js');
const { computeNextNotifyAt } = _test;
const db = admin.firestore();

(async () => {
    const now = new Date();
    const snap = await db.collectionGroup('bubbles').where('status', '==', 'active').get();
    let updated = 0;
    for (const d of snap.docs) {
        const bubble = Object.assign({ id: d.id }, d.data() || {});
        const next = computeNextNotifyAt(bubble, now);
        await d.ref.set({
            nextNotifyAt: next
                ? admin.firestore.Timestamp.fromDate(next)
                : admin.firestore.FieldValue.delete()
        }, { merge: true });
        updated++;
    }
    console.log(`Backfilled ${updated} active bubbles`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Прогнать против эмулятора (verify перед продом)**

Run (в одном терминале): `cd functions && firebase emulators:start --only firestore`
Run (в другом): `FIRESTORE_EMULATOR_HOST=localhost:8080 GOOGLE_CLOUD_PROJECT=demo TZ=UTC node functions/backfill-next-notify.js`
Создать пару активных задач в эмуляторе заранее.
Expected: лог `Backfilled N active bubbles`; у задач появилось корректное `nextNotifyAt` (или поле отсутствует для уже отработанных/без срока).

- [ ] **Step 3: Commit**

```bash
git add functions/backfill-next-notify.js
git commit -m "chore(functions): add one-off nextNotifyAt backfill script"
```

---

## Task 7: Порядок выкатки в прод (критично)

Порядок предотвращает «молчание» задач без поля. **Не** деплоить Task 4 (новый запрос) раньше, чем индекс готов и backfill выполнен.

- [ ] **Step 1: Деплой индекса** — `firebase deploy --only firestore:indexes`; дождаться статуса **Enabled** в Console.
- [ ] **Step 2: Деплой триггера** (после Task 3) — `cd functions && firebase deploy --only functions:maintainNextNotifyAt`. С этого момента все правки задач проставляют `nextNotifyAt`.
- [ ] **Step 3: Backfill** — `GOOGLE_APPLICATION_CREDENTIALS=<sa.json> TZ=UTC node functions/backfill-next-notify.js`. Дождаться лога с числом обновлённых.
- [ ] **Step 4: Деплой scheduled-функции** (после Task 4) — `cd functions && firebase deploy --only functions:scheduleDueDateNotifications`. Теперь она читает только задачи с `nextNotifyAt <= now`.
- [ ] **Step 5: Проверка** — в Firebase Console → Functions → Logs убедиться, что прогоны `scheduleDueDateNotifications` обрабатывают единицы задач (не всю базу); уведомления приходят как раньше.
- [ ] **Step 6: Удалить backfill-скрипт**

```bash
git rm functions/backfill-next-notify.js
git commit -m "chore(functions): remove one-off backfill script after run"
```

---

## Self-Review

**Spec coverage:**
- Поле `nextNotifyAt` → Task 1 (расчёт), Task 4 (запись/сдвиг), Task 6 (backfill). ✓
- `computeNextNotifyAt` (алгоритм, fallback, tz, recurrence, suppressed) → Task 1 + тесты. ✓
- Триггер `onDocumentWritten` + гард рекурсии → Task 3. ✓
- Переписанный запрос + отправка без окна + обязательный сдвиг → Task 2 (`pickReminderToSend`), Task 4. ✓
- Composite index → Task 5. ✓
- Backfill → Task 6. ✓
- `maxInstances=10` на обеих функциях → Task 3 (триггер), Task 4 (scheduled). ✓
- Токены только для пользователей выборки → Task 4 (`getUserFcmTokens` внутри map по `fetchDueBubbles`). ✓
- Legacy мёртв: `fetchAllUserBubbles` удалена (Task 4); legacy-ветки `updateBubble*` оставлены как мёртвый код (per CLAUDE.md), не трогаем. ✓
- Cleanup на `:00` сохранён (Task 4 Step 3). ✓
- Порядок выкатки → Task 7. ✓

**Placeholder scan:** код приведён полностью в каждом шаге; TBD/«handle edge cases» отсутствуют. ✓

**Type/имя consistency:** `computeNextNotifyAt(bubble, fromTime)`, `pickReminderToSend(bubble, now)→{time,minutesBefore}`, `significantChanged(before,after)`, `updateNextNotifyAt(userId,bubbleId,bubble,now)`, `fetchDueBubbles(now)`, `handleReminder/handleOverdue(userId,bubble,tokens,now)` — имена и сигнатуры согласованы между задачами. ✓
