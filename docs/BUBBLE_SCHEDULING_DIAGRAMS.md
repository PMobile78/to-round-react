# Due date, Remind me, Repeat every — диаграммы (Mermaid)

Текстовое описание полей, поведения клиента и Cloud Function: **[BUBBLE_SCHEDULING.md](./BUBBLE_SCHEDULING.md)**.

Ниже — только схемы. Как поля задачи связаны между собой и как их обрабатывают клиент (`BubblesPage.js`) и облачный планировщик (`functions/index.js`: `scheduleDueDateNotifications`).

## 1. Модель данных и ось времени

```mermaid
flowchart TB
  subgraph storage["Данные задачи (Firestore / состояние пузыря)"]
    due["dueDate — дедлайн (якорь во времени)"]
    notif["notifications — Remind me<br/>список смещений «за сколько до due»"]
    rep["recurrence — Repeat every<br/>every, unit, опционально weekDays"]
  end

  subgraph clientPulse["Клиент: пульсация на холсте (BubblesPage)"]
    due --> tRem["targetTime = due − offset(notif)<br/>offset из строки 5m/1h/1d или custom value+unit"]
    tRem --> win["Если now ∈ [targetTime, due) — пульс «напоминание»<br/>приоритетнее пульса по просрочке"]
    due --> tOver["Если now ≥ due и пульс не подавлен — пульс «просрочка»<br/>(overdueSticky, sticky ref, overduePulseSuppressed и т.д.)"]
    rep --> editor["Пока открыт редактор этой задачи и есть recurrence —<br/>пульс на холсте отключается"]
  end

  subgraph serverRep["Repeat: когда сдвигается due"]
    rep --> onlyOver["Сдвиг dueDate на следующий раз<br/>выполняется на сервере только после факта просрочки<br/>(см. диаграмму 2)"]
    onlyOver --> newDue["Новый dueDate → новые окна Remind me и новый цикл"]
  end
```

## 2. Планировщик раз в минуту (FCM + просрочка + repeat)

```mermaid
flowchart TD
  start(["scheduleDueDateNotifications<br/>каждую 1 минуту"]) --> loop["Для каждого active-пузыря с dueDate"]

  loop --> rem{"Попадает ли now в окно напоминания?<br/>due − minutesBefore … +1 мин<br/>(shouldTriggerReminderNow)"}

  rem -->|да| rKey["Ключ дедупликации:<br/>reminder:userId:bubbleId:minutesBefore:dueDate"]
  rKey --> rSent{"Уже отправляли?"}
  rSent -->|нет| fcmR["FCM type: reminder"]
  fcmR --> markR["Запись в notification-sent"]
  markR --> nextB(["continue — просрочку<br/>в эту минуту не считаем"])
  rSent -->|да| nextB

  rem -->|нет| ovd{"isBubbleOverdue<br/>now > due?"}

  ovd -->|нет| skip["Ничего для этого пузыря"]
  ovd -->|да| oKey["Ключ: overdue:userId:bubbleId:dueDate"]
  oKey --> oSent{"Уже отправляли overdue?"}
  oSent -->|нет| fcmO["FCM type: overdue"]
  fcmO --> markO["Запись в notification-sent"]
  markO --> stick["Если ещё нет overdueSticky →<br/>overdueSticky: true, overdueAt"]
  oSent -->|да| stickMaybe["Поля просрочки могут уже быть выставлены"]
  stick --> recur
  stickMaybe --> recur

  recur{"recurrence задан?"}
  recur -->|да| calc["computeNextDueDate текущего due<br/>(minutes/hours/days/weeks/months,<br/>недели + weekDays)"]
  calc --> save["updateBubbleDueDate → новый dueDate в Firestore"]
  save --> stickyKeep["При необходимости сохраняется overdueSticky<br/>до действия пользователя / смены даты"]
  recur -->|нет| endNode(["Конец ветки пузыря"])

  stickyKeep --> endNode
  nextB --> loopTail["Следующий пузырь"]
  skip --> loopTail

  subgraph pri["Важно о порядке"]
    direction LR
    P1["Сначала проверяются Remind me"]
    P2["Только если окно напоминания не сработало —<br/>рассматривается просрочка и repeat"]
  end
```
