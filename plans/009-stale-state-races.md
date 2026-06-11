# Plan 009: Устранить гонки со stale-состоянием (markAsDone, deleteTag)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/pages/BubblesPage.js src/services/firestoreService.js`
> Этот план писался ДО выполнения plans/008 — его шаги предполагают, что 008
> уже выполнен. Если `grep -n 'upsertBubble' src/services/firestoreService.js`
> пуст — выполни сначала plans/008.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 008
- **Category**: bug
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Два обработчика читают состояние из устаревших замыканий и затем перетирают свежие данные:

1. **`handleMarkAsDone`** — `markBubbleAsDone(selectedBubble.id, bubbles)` вызывается из колбэка анимации лопания (~250 мс после клика) со старым массивом `bubbles`; результат целиком кладётся в `setBubbles(updatedBubbles)`. Любое изменение, прилетевшее за время анимации (snapshot с сервера, автоперенос повторяющейся задачи), молча перетирается.
2. **`handleDeleteTag`** — таймер на 7 секунд захватывает `tags` замыканием; по срабатыванию `tags.filter(...)` работает по устаревшему списку и `saveTagsToFirestore(updatedTags)` перезатирает изменения тегов, сделанные за эти 7 секунд (вторая вкладка, другое удаление).

## Current state

- `src/pages/BubblesPage.js:1015` — `const handleMarkAsDone = async () => {`; внутри колбэка анимации (строки 1092-1098):
  ```js
  Matter.World.remove(engineRef.current.world, body);
  Matter.World.remove(engineRef.current.world, splashParticles);
  // Обновляем статус в Firestore
  markBubbleAsDone(selectedBubble.id, bubbles).then(updatedBubbles => {
      setBubbles(updatedBubbles);
  });
  ```
  и синхронная ветка без анимации (строки 1104-1106) с тем же паттерном.
- `src/services/firestoreService.js:188-225` — `updateBubbleStatus(bubbleId, newStatus, bubblesData)`: строит объект `fields` (status, updatedAt, deletedAt-логика; для DONE дополнительно `dueDate:null, notifications:[], recurrence:null, overdueSticky:false, overdueAt:null, overduePulseSuppressed:false`), пишет `updateDoc`, возвращает `bubblesData.map(...)` — то есть РЕЗУЛЬТАТ зависит от переданного (возможно устаревшего) массива.
- `BubblesPage.js:1219-1251` — таймер удаления тега:
  ```js
  const timer = setTimeout(() => {
      ...
      const updatedTags = tags.filter(tag => tag.id !== tagId);   // stale tags!
      setTags(updatedTags);
      saveTagsToFirestore(updatedTags);
      ...
  }, 7000);
  ```
- `markBubbleAsDone` (`firestoreService.js:267-269`) — обёртка над `updateBubbleStatus`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**: `src/pages/BubblesPage.js` (обработчики `handleMarkAsDone`, `handleDeleteTag`), `src/services/firestoreService.js` (рефакторинг `updateBubbleStatus` на две части).

**Out of scope**:
- Аналогичный live-sync в `useMatterEngine.js` — это `plans/015`.
- Конфликт-резолюшн между вкладками на уровне Firestore (transactions) — превышает потребность.
- Изменение UX (7-секундная отмена удаления тега остаётся).

## Git workflow

- Ветка: `advisor/009-stale-races`. **Не пушить в `main`**.

## Steps

### Step 1: Разделить updateBubbleStatus на «вычислить поля» и «записать»

В `firestoreService.js` извлечь чистую функцию (и экспортировать её для тестов):

```js
export const buildStatusFields = (bubble, newStatus) => {
    const fields = { status: newStatus, updatedAt: new Date().toISOString() };
    if (newStatus === BUBBLE_STATUS.DELETED) {
        fields.deletedAt = new Date().toISOString();
    } else if (bubble.status === BUBBLE_STATUS.DELETED && newStatus !== BUBBLE_STATUS.DELETED) {
        fields.deletedAt = null;
    }
    if (newStatus === BUBBLE_STATUS.DONE) {
        Object.assign(fields, { dueDate: null, notifications: [], recurrence: null,
            overdueSticky: false, overdueAt: null, overduePulseSuppressed: false });
    }
    return fields;
};
```

`updateBubbleStatus` переписать через неё (поведение и сигнатура прежние — другие вызовы не трогаем).

**Verify**: `CI=true npm run test:ci` и build → exit 0.

### Step 2: handleMarkAsDone — функциональный merge вместо замены массива

В обоих местах (колбэк анимации и ветка без анимации):

```js
const fields = buildStatusFields(selectedBubble, BUBBLE_STATUS.DONE);
updateBubbleFields(selectedBubble.id, fields)
    .then(() => {
        setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
    })
    .catch(e => logger.error('Error marking bubble as done:', e));
```

(`updateBubbleFields` появился в plans/008.) Свежие изменения других задач больше не перетираются: меняется только одна задача поверх `prev`.

**Verify**: build зелёный; ручная проверка — отметить задачу выполненной, пузырь лопается, задача в списке Done.

### Step 3: handleDeleteTag — свежие tags через ref

Рядом с состоянием тегов завести ref и синхронизировать:

```js
const tagsRef = useRef(tags);
useEffect(() => { tagsRef.current = tags; }, [tags]);
```

В колбэке таймера заменить `tags.filter(...)` на `tagsRef.current.filter(...)`. Обновление пузырей в том же таймере оставить как сделано в plans/008 (функциональный `setBubbles` + точечные `updateBubbleFields`).

**Verify**: build зелёный; `grep -n 'tagsRef' src/pages/BubblesPage.js` → объявление + использование в таймере.

### Step 4: Тест на buildStatusFields и коммит

Добавить `src/services/buildStatusFields.test.js` (см. Test plan), прогнать всё, закоммитить: `git commit -am "Fix stale-state races in markAsDone and deleteTag"`.

## Test plan

Новый файл `src/services/buildStatusFields.test.js` (импортирует только чистую функцию — firebase-импорты файла сервиса при этом подтянутся; если `src/firebase.js` падает в Jest без env — замокать модуль: `jest.mock('../firebase', () => ({ db: {} }))` в начале теста). Кейсы:
- DONE: очищает dueDate/notifications/recurrence/overdue-поля;
- DELETED: ставит `deletedAt`;
- восстановление из DELETED в ACTIVE: `deletedAt: null`;
- обычный переход: только status+updatedAt.

Образец стиля: `src/utils/*.test.js` из plans/002.

**Verify**: `CI=true npm run test:ci` → exit 0, новые тесты в выводе.

## Done criteria

- [ ] `grep -n 'markBubbleAsDone' src/pages/BubblesPage.js` → пусто (заменён точечным путём)
- [ ] В таймере deleteTag нет обращения к замкнутому `tags` (только `tagsRef.current`)
- [ ] Новые тесты `buildStatusFields` проходят
- [ ] `CI=true npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 009 → DONE

## STOP conditions

- plans/008 не выполнен (`upsertBubble`/`updateBubbleFields` отсутствуют).
- Выдержки не совпали; в частности, если `handleMarkAsDone` уже переписан.
- Jest не может импортировать сервис даже с моком firebase — доложи, не выноси функцию в отдельный файл без согласования.

## Maintenance notes

- `markBubbleAsDone`/`markBubbleAsDeleted`/`restoreBubble` в сервисе могут остаться для других вызовов — проверь грепом; если вызовов не осталось, отметь в отчёте (удаление — отдельное решение).
- Ревьюеру: в шаге 2 порядок «запись → setState» намеренный (UI не врёт об успехе); анимация уже убрала тело из мира до записи — при ошибке записи пузырь исчезнет до перезагрузки, это осознанный компромисс (как и раньше).
