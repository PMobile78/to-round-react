# Как работают push-уведомления (scheduled notifications)

Справочник по тому, **как система уведомлений устроена в проде сейчас**. Про то, *почему*
так спроектировано и *как* реализовывали, см. [спецификацию](superpowers/specs/2026-06-08-schedule-cost-optimization-design.md)
и [план](superpowers/plans/2026-06-08-schedule-cost-optimization.md).

Весь серверный код — в `functions/index.js`.

## Что делает система

Отправляет пользователям FCM-уведомления по задачам (bubbles):
- **reminder** — заранее, за `minutesBefore` до срока (`dueDate`), для каждого элемента `bubble.notifications`;
- **overdue** — когда срок прошёл; для повторяющихся задач (`recurrence`) срок автоматически
  переносится на следующее вхождение.

## Ключевая идея: поле `nextNotifyAt`

Раньше scheduled-функция каждую минуту читала **все** активные задачи всех пользователей —
дорого по Firestore reads и растёт линейно с базой. Теперь в каждом документе задачи хранится

> **`nextNotifyAt`** (Firestore `Timestamp`, UTC) — момент **ближайшего необработанного
> события** по задаче (ближайший из reminder-времён и самого `dueDate`).

и функция запрашивает только те задачи, которым уже пора:

```js
db.collectionGroup('bubbles')
  .where('status', '==', 'active')
  .where('nextNotifyAt', '<=', Timestamp.fromDate(now))
  .orderBy('nextNotifyAt')
```

Стоимость теперь зависит от числа реально срабатывающих уведомлений, а не от размера базы.

## Компоненты

### 1. Поле `nextNotifyAt` и его поддержка
Три источника держат поле в актуальном состоянии:
- **Триггер `maintainNextNotifyAt`** — при создании/правке задачи пользователем.
- **Scheduled-функция** — сдвигает поле вперёд после обработки события (в `finally`).
- **Backfill-скрипт** — разово проставляет поле существующим задачам (см. «Эксплуатация»).

Если будущих событий нет, поле удаляется (`FieldValue.delete()`), и задача выпадает из запроса
(range-фильтр `<=` не возвращает документы без поля).

### 2. `computeNextNotifyAt(bubble, fromTime)`
Чистая функция (есть в `exports._test`, покрыта `functions/test-next-notify.js`). Логика:
- собирает «триггерные моменты»: для каждого `notif` → `dueDate − minutesBefore`; плюс `dueDate` (overdue);
- возвращает **минимальный момент строго позже `fromTime`**;
- если будущих нет — возвращает `fromTime` (немедленная обработка), когда задача просрочена и
  overdue ещё не слался (`!overdueSticky`) **или** есть `recurrence`, и при этом не `overduePulseSuppressed`;
- иначе `null`.

`dueDate` хранится как локальная строка `YYYY-MM-DDTHH:mm:ss` + `bubble.tz` (IANA-зона) и
переводится в абсолютный момент через `parseLocalDateTime` (tz-aware, `TZDate`). `nextNotifyAt`
всегда в UTC.

### 3. Триггер `maintainNextNotifyAt`
`onDocumentWritten` на `user-bubbles/{uid}/bubbles/{bubbleId}`, регион `europe-west1`,
`maxInstances: 10`.
- На удаление документа — выходит.
- **Гард от рекурсии:** `significantChanged(before, after)` сравнивает только
  `['dueDate','notifications','status','recurrence']`. Запись самого `nextNotifyAt` (не значимое
  поле) не вызывает повторный пересчёт → нет бесконечного цикла.
- Иначе пишет `computeNextNotifyAt(after, now)` (или удаляет поле).

### 4. Scheduled-функция `scheduleDueDateNotifications`
`onSchedule` `every 1 minutes`, регион `europe-west1`, `maxInstances: 10`. Каждый прогон:
1. на минуте `:00` каждого часа — `cleanupOldNotificationSent()` (чистит `notification-sent` старше 7 дней);
2. `fetchDueBubbles(now)` — индексный запрос только due-задач, группировка по пользователю;
3. токены FCM читаются **только** для пользователей из выборки (`getUserFcmTokens`);
4. для каждой задачи: `isBubbleOverdue` → `handleOverdue`, иначе `handleReminder`;
5. в `finally` — **всегда** `updateNextNotifyAt(...)`, иначе задача читалась бы каждую минуту.

- `handleReminder` — выбирает свежий наступивший reminder (`pickReminderToSend`, без жёсткого
  окна — пропуск минуты не теряет напоминание), шлёт, дедуп по `notification-sent`.
- `handleOverdue` — шлёт overdue (дедуп), ставит `overdueSticky`; для `recurrence` переносит
  `dueDate` на ближайшее будущее (`computeNextFutureDueDate`); обновляет поля задачи **и локальную
  копию** `bubble`, чтобы финальный `updateNextNotifyAt` считал от свежего состояния.

### 5. Дедупликация
Коллекция `notification-sent` (доступна только admin SDK). Ключи:
`reminder:{uid}:{bubbleId}:{minutesBefore}:{dueDate}` и `overdue:{uid}:{bubbleId}:{dueDate}`.
Записи старше 7 дней чистятся ежечасно.

### 6. Composite index
`firestore.indexes.json`: collection group `bubbles`, поля `status ASC, nextNotifyAt ASC`
(`COLLECTION_GROUP`). Порядок полей обязателен: equality (`status`) перед range/order (`nextNotifyAt`).

## Жизненный цикл задачи (пример)

`dueDate = 15:00`, напоминания за 60 и 10 минут, без recurrence:

| Прогон | Действие | Новый `nextNotifyAt` |
|---|---|---|
| 14:00 | reminder «за 60» | 14:50 |
| 14:50 | reminder «за 10» | 15:00 |
| 15:00 | overdue | поле удалено |

С `recurrence`: на шаге overdue `dueDate` переносится на следующий цикл → `nextNotifyAt`
указывает на reminder/overdue нового вхождения.

## Эксплуатация

### Деплой (порядок критичен)
Функции и индексы деплоятся **вручную** (`firebase deploy`), отдельно от фронтенда (фронт — CI на
GitHub Pages из `main`). Порядок:

1. `firebase deploy --only firestore:indexes` — дождаться статуса **Enabled** (Console → Firestore → Indexes).
2. `firebase deploy --only functions:maintainNextNotifyAt` — первый Gen2-деплой может упасть на
   «Permission denied … Eventarc Service Agent»; это пропагация прав, повторить через ~5 минут.
3. **Backfill** (см. ниже) — проставить `nextNotifyAt` существующим задачам.
4. `firebase deploy --only functions:scheduleDueDateNotifications`.

> ⚠️ Нельзя деплоить scheduled-функцию (шаг 4) раньше backfill (шаг 3): задачи без поля выпадут
> из запроса и уведомления замолчат, пока поле не появится.

### Backfill
Скрипт разовый и удалён из репо после первого прогона (есть в git-истории, коммит `2082a66`).
Нужен при первичном вводе поля или если оно массово рассинхронизировалось. Суть:

```js
const admin = require('firebase-admin');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const { _test } = require('./index.js'); // инициализирует admin app; reuse computeNextNotifyAt
const { computeNextNotifyAt } = _test;
const db = admin.firestore();
(async () => {
    const now = new Date();
    const snap = await db.collectionGroup('bubbles').where('status', '==', 'active').get();
    for (const d of snap.docs) {
        const bubble = Object.assign({ id: d.id }, d.data() || {});
        const next = computeNextNotifyAt(bubble, now);
        await d.ref.set({ nextNotifyAt: next ? Timestamp.fromDate(next) : FieldValue.delete() }, { merge: true });
    }
    process.exit(0);
})();
```

Запуск (нужны Application Default Credentials — например, ключ сервис-аккаунта, т.к. `gcloud`
может быть не установлен; **без** `FIRESTORE_EMULATOR_HOST`, иначе запишет в эмулятор):

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json TZ=UTC GOOGLE_CLOUD_PROJECT=todo-flutter-fb8bf node functions/backfill-next-notify.js
```
Ключ сервис-аккаунта — секрет: хранить вне репо, удалить после.

### Диагностика
`firebase functions:log --only scheduleDueDateNotifications` — чистые прогоны = пустые info-строки
раз в минуту (функция логирует только ошибки через `console.error`).

- **Уведомления молчат** → проверить: у активных задач есть `nextNotifyAt`? индекс **Enabled**?
  триггер `maintainNextNotifyAt` задеплоен? (новые задачи без триггера поле не получат).
- **`FAILED_PRECONDITION ... requires an index`** → индекс ещё строится или не задеплоен.
- **Просроченные за время «дыры»** уведомления не теряются: их `nextNotifyAt <= now`, попадут в
  выборку и отправятся с задержкой (дедуп не даст задвоить).

### Локальный эмулятор
`firebase emulators:start --only functions,firestore` (нужна Java для Firestore-эмулятора):
- **Триггер** `maintainNextNotifyAt` работает — можно проверять проставление/пересчёт поля.
- **Scheduled-функция по расписанию НЕ запускается** без pubsub-эмулятора (`onSchedule` требует
  Cloud Scheduler/Pub-Sub); для полного прогона нужен pubsub-эмулятор + ручной trigger.

## Нюансы и подводные камни

- **Timestamp/FieldValue импортируются модульно:** `const { Timestamp, FieldValue } =
  require('firebase-admin/firestore')`. Через `admin.firestore.Timestamp` в Functions-эмуляторе
  получается `undefined` (эмулятор патчит `firebase-admin`). Модульный импорт работает и в
  эмуляторе, и в проде.
- **Существующий код** (`updateBubbleDueDate`/`updateBubbleFields`/`markNotificationSent`) ещё
  использует `admin.firestore.FieldValue.serverTimestamp()` — в проде это работает, но в
  эмуляторе упадёт так же; при тестировании scheduled-функции в эмуляторе эти места тоже надо
  перевести на модульный импорт.
- **Расписание `every 1 minutes`** (App Engine-синтаксис). Cleanup завязан на `now.getMinutes() === 0`;
  при переходе на «реже минуты» использовать `*/N * * * *` (unix-cron), а не `every N minutes` —
  см. [cron-таймминг](cron-schedule-timing.md).
- **Legacy-схема мертва:** все задачи в субколлекции `user-bubbles/{uid}/bubbles/{bubbleId}`;
  индексные запросы по полям внутри старого массива `bubbles[]` невозможны, и серверная логика на
  него больше не рассчитывает.

## Ключевые файлы
- `functions/index.js` — вся логика (триггер, scheduled-функция, чистые функции).
- `functions/test-next-notify.js` — unit-тесты (`computeNextNotifyAt`, `pickReminderToSend`, `significantChanged`).
- `firestore.indexes.json` — composite index.
