# Cron-тайминг scheduled-функции: `every N minutes` vs `*/N * * * *`

Контекст: Cloud Function `scheduleDueDateNotifications` (`functions/index.js`) запускается по
расписанию `onSchedule`. Сейчас стоит `schedule: 'every 1 minutes'`. При переходе на более
редкий запуск (раз в 5 минут и т.п.) важно понимать разницу двух форматов расписания —
от неё зависит и предсказуемость времени, и корректность cleanup-логики.

`onSchedule` принимает **оба** формата: App Engine-синтаксис (`every 5 minutes`) и
unix-cron (`*/5 * * * *`). Ведут они себя по-разному.

## 1. `every 5 minutes` — App Engine-синтаксис (как сейчас `every 1 minutes`)

Это «end-time interval». Из документации App Engine cron:

> Defines the time between the "end time" of a job and when the next job starts… The Cron
> service runs jobs in this type of interval throughout the 24 hour day, **starting one
> interval after the job creation/update time**, and waits for the specified interval between
> each job.
> Example: For the `every 5 minutes` schedule… if one instance completes at 02:01, then the
> next job waits 5 minutes and starts again at **02:06**.

Следствие: отсчёт идёт **от момента деплоя и от конца предыдущего запуска**, а не от стенных
часов. Время «плавающее» и **не кратное 5**: например `13:03 → 13:08 → 13:13…`, а после
редеплоя сдвинется на новый набор минут.

## 2. `*/5 * * * *` — unix-cron (формат Cloud Scheduler)

Поле минут в unix-cron — «how far past the top of the hour». `*/5` = минуты 0,5,10,…,55,
**привязанные к началу часа**. Срабатывает **строго кратно 5**: `13:00 → 13:05 → 13:10…`,
независимо от времени деплоя.

Оговорка: «кратно 5» — про *минуту*. Секунда запуска может плавать на пару секунд —
Cloud Scheduler не гарантирует ровно `:00` секунд, но минута будет правильной.

## Почему это важно в нашем коде

Cleanup завязан на конкретную минуту часа:

```js
// functions/index.js (~строка 397)
if (now.getMinutes() === 0) {
    await cleanupOldNotificationSent();
}
```

- С `*/5 * * * *` минута `:00` гарантированно попадает раз в час → cleanup работает.
- С `every 5 minutes` расписание плавает и может встать на `:03, :08, :13…` — тогда
  `getMinutes() === 0` **не сработает никогда**, коллекция `notification-sent` будет расти
  бесконечно (лишнее хранение + чтения при будущих cleanup). Скрытый баг при наивном
  переходе на «раз в 5 минут».

## Вывод

Если переходим на запуск реже минуты — использовать **`*/5 * * * *`** (unix-cron):
предсказуемое кратное время и работающий cleanup. Формат `every 5 minutes` для этого
не использовать.

## Источники
- Cloud Scheduler — Cron job format: https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules
- App Engine — Scheduling jobs with cron.yaml: https://cloud.google.com/appengine/docs/legacy/standard/python/config/cronref
