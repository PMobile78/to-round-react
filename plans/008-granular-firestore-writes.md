# Plan 008: Точечные записи Firestore вместо полной перезаписи всех задач

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/services/firestoreService.js src/pages/BubblesPage.jsx src/hooks/useMatterEngine.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: 001 (ESLint ловит ошибки), 002 (verification baseline)
- **Category**: perf + bug
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/24
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

`saveBubblesToFirestore` на **каждое** действие пользователя (создание задачи, сохранение правки, удаление тега, переключение rich-text, остановка пульсации) читает ВСЕ документы задач и batch-пишет ВСЕ задачи. При N задач одно действие стоит N reads + N writes + N срабатываний серверного триггера `maintainNextNotifyAt`. Хуже: `writeBatch` ограничен 500 операциями — при ~499+ задачах `commit()` упадёт целиком и код свалится в legacy-fallback, который запишет весь массив в родительский документ (лимит 1 MiB) — путь к потере данных. Дополнительно, почти все вызовы сделаны **внутри** setState-апдейтеров — в `<React.StrictMode>` апдейтеры в dev выполняются дважды → двойные записи. Правильный точечный паттерн уже есть в этом же файле (`updateBubbleStatus`).

## Current state

### Сервис

- `src/services/firestoreService.js:69-122` — `saveBubblesToFirestore(bubblesData)`: `getDocs` всей подколлекции → `writeBatch` со `set(..., {merge:true})` каждой задачи + delete отсутствующих + touch родителя; в `catch` — legacy-запись всего массива в родительский док, затем localStorage.
- `firestoreService.js:188-225` — **образец точечной операции** `updateBubbleStatus`: строит `fields`, делает `await updateDoc(doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId)), fields)`, возвращает обновлённый массив.
- `firestoreService.js:43-63` — `serializeBubble(bubble)`: единственный сериализатор (id, radius, title, description, fillStyle/strokeStyle из body.render, tagId, status, createdAt/updatedAt, deletedAt, dueDate, tz, notifications, recurrence, overdueSticky, overdueAt, overduePulseSuppressed, useRichText).
- `firestoreService.js:234-264` — `cleanupOldDeletedBubbles(bubblesData)`: фильтрует deleted старше 30 дней и при изменениях вызывает `saveBubblesToFirestore(filteredBubbles)` (полная перезапись ради удаления пары доков).

### Вызовы saveBubblesToFirestore (все, проверено грепом)

1. **Создание** — `src/pages/BubblesPage.jsx:882-886`:
   ```js
   setBubbles(prev => {
       const updatedBubbles = [...prev, newBubble];
       saveBubblesToFirestore(updatedBubbles);
       return updatedBubbles;
   });
   ```
2. **Сохранение правки** — `BubblesPage.jsx:941-982` (внутри `setBubbles(prev => prev.map(...))`, side effect на строке 980). Обновлённый объект строится из `selectedBubble` + form-state (`title`, `description`, `selectedTagId`, `editBubbleSize`, `newBody`, `editDueDate`, `editNotifications`, `editRecurrence`, перерасчёт overdue-полей).
3. **Удаление тега из задач** — `BubblesPage.jsx:1231-1243` (внутри `setBubbles`, по таймеру 7 с; обнуляет `tagId` у затронутых).
4. **Переключение rich-text** — `BubblesPage.jsx:1921-1925` (внутри `setBubbles`).
5. **Импорт JSON** — `BubblesPage.jsx:1979` (`await saveBubblesToFirestore(importedBubbles)`) — **легитимная** массовая операция, остаётся.
6. **Остановка пульсации** — `BubblesPage.jsx:2623-2627` (внутри `setBubbles`; меняет `overduePulseSuppressed/overdueSticky/overdueAt/updatedAt` одной задачи).
7. **Стартовый cleanup** — `firestoreService.js:255` из `cleanupOldDeletedBubbles`, вызываемого в `useMatterEngine.js` (~строка 100) при загрузке.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm ci --legacy-peer-deps` | exit 0 |
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build (с ESLint) | `CI=true npm run build` | exit 0 |
| Остатки вызовов | `grep -rn 'saveBubblesToFirestore' src/` | см. Done criteria |

## Scope

**In scope**:
- `src/services/firestoreService.js`
- `src/pages/BubblesPage.jsx` (только перечисленные call-site'ы)

**Out of scope**:
- `useMatterEngine.js` — вызов `cleanupOldDeletedBubbles` остаётся как есть (меняется его внутренность в сервисе).
- Гонки со stale-замыканиями (`handleDeleteTag` таймер, `handleMarkAsDone`) — это `plans/009`; здесь сохраняем текущую семантику чтения состояния, меняем только способ записи.
- Legacy-ветки **чтения** (`loadBubblesFromFirestore`, fallback в `subscribeToBubblesUpdates`) — не трогать.
- `saveTagsToFirestore`, mind maps, functions/.

## Git workflow

- Ветка: `advisor/008-granular-writes`. **Не пушить в `main`** (автодеплой). Коммит на каждый шаг.

## Steps

### Step 1: Новые точечные функции в firestoreService.js

Рядом с `updateBubbleStatus` добавить и экспортировать (используя существующие импорты `setDoc`, `updateDoc`, `deleteDoc`, `doc`):

```js
// Точечный upsert одной задачи (создание и полное сохранение правки)
export const upsertBubble = async (bubble) => {
    const userId = getUserDocumentId();
    const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubble.id));
    await setDoc(ref, serializeBubble(bubble), { merge: true });
};

// Точечное обновление полей одной задачи
export const updateBubbleFields = async (bubbleId, fields) => {
    const userId = getUserDocumentId();
    const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId));
    await updateDoc(ref, fields);
};

// Точечное удаление документа задачи
export const deleteBubbleDoc = async (bubbleId) => {
    const userId = getUserDocumentId();
    const ref = doc(db, BUBBLES_COLLECTION, userId, BUBBLES_SUBCOLLECTION, String(bubbleId));
    await deleteDoc(ref);
};
```

Обработка ошибок: пробрасывать (как в `updateBubbleStatus`); на call-site'ах ловить через `.catch(e => logger.error(...))`, чтобы UI не падал.

**Verify**: `CI=true npm run build` → exit 0.

### Step 2: Создание задачи (call-site 1)

`BubblesPage.jsx:882-886` переписать — side effect наружу, точечная запись:

```js
setBubbles(prev => [...prev, newBubble]);
upsertBubble(newBubble).catch(e => logger.error('Error saving new bubble:', e));
```

(`newBubble` уже полностью построен выше по коду — состояние для записи не нужно брать из апдейтера.)

**Verify**: `CI=true npm run build` → exit 0; в dev (`npm start`) создание задачи добавляет ровно один документ (если есть доступ к Firestore-консоли).

### Step 3: Сохранение правки (call-site 2)

В обработчике сохранения (район `BubblesPage.jsx:915-985`): обновлённый объект задачи сегодня строится внутри `prev.map(...)`. Вынести построение наружу: собрать `updatedBubble` из `selectedBubble` и form-state теми же выражениями (строки 944-976 — перенести вычисления `newDueDate`, `shouldDisablePulsing`, `dateChanged` и сам объект до setState), затем:

```js
setBubbles(prev => prev.map(b => (b.id === selectedBubble.id ? updatedBubble : b)));
upsertBubble(updatedBubble).catch(e => logger.error('Error saving bubble edit:', e));
```

Поведение (включая `manuallyStoppedPulsingRef.current.delete(...)` при `dateChanged`) сохранить 1:1.

**Verify**: build зелёный; ручная проверка — правка заголовка сохраняется и переживает перезагрузку.

### Step 4: Переключение rich-text (call-site 4) и остановка пульсации (call-site 6)

Оба меняют несколько полей одной задачи → `updateBubbleFields`:

- `handleToggleEditUseRichText` (`BubblesPage.jsx:1916-1926`):
  ```js
  const fields = { useRichText: !!enabled, updatedAt: new Date().toISOString() };
  setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? { ...b, ...fields } : b));
  updateBubbleFields(selectedBubble.id, fields).catch(e => logger.error('Error toggling rich text:', e));
  ```
- Остановка пульсации (`BubblesPage.jsx:2614-2627`): объект `updatedBubble` уже строится до setState — оставить, но вместо `saveBubblesToFirestore(updated)` внутри апдейтера:
  ```js
  setBubbles(prev => prev.map(b => b.id === selectedBubble.id ? updatedBubble : b));
  updateBubbleFields(selectedBubble.id, {
      overduePulseSuppressed: true, overdueSticky: false, overdueAt: null, updatedAt: updatedBubble.updatedAt
  }).catch(e => logger.error('Error stopping pulsing:', e));
  ```

**Verify**: `grep -n 'saveBubblesToFirestore' src/pages/BubblesPage.jsx` → остались только call-site 3 (deleteTag) и 5 (import).

### Step 5: Удаление тега из задач (call-site 3)

В таймере `handleDeleteTag` (`BubblesPage.jsx:1231-1243`): side effect наружу, точечные записи по затронутым задачам:

```js
const affectedIds = [];
setBubbles(prev => prev.map(bubble => {
    if (bubble.tagId === tagId) {
        affectedIds.push(bubble.id);
        bubble.body.render.strokeStyle = '#B0B0B0';
        bubble.body.render.fillStyle = getBubbleFillStyle(null);
        return { ...bubble, tagId: null };
    }
    return bubble;
}));
affectedIds.forEach(id =>
    updateBubbleFields(id, { tagId: null }).catch(e => logger.error('Error clearing tag from bubble:', e))
);
```

Известное ограничение: в StrictMode (dev) апдейтер выполнится дважды и `affectedIds` может задвоиться — сделать `affectedIds` через `Set` и конвертировать в массив перед forEach. (Полное решение гонки таймера — `plans/009`.)

**Verify**: build зелёный; `grep -n 'saveBubblesToFirestore' src/pages/BubblesPage.jsx` → ровно 1 вхождение (import, строка ~1979).

### Step 6: cleanup без полной перезаписи

В `firestoreService.js:234-264` (`cleanupOldDeletedBubbles`): вместо `await saveBubblesToFirestore(filteredBubbles)` удалять только отфильтрованные документы:

```js
if (filteredBubbles.length < bubblesData.length) {
    const removed = bubblesData.filter(b => !filteredBubbles.includes(b));
    await Promise.all(removed.map(b => deleteBubbleDoc(b.id).catch(e => logger.error('Cleanup delete failed:', e))));
    return filteredBubbles;
}
```

**Verify**: build зелёный.

### Step 7: Обезвредить legacy-fallback записи

В `saveBubblesToFirestore` (теперь вызывается только импортом и одноразовой миграцией в `loadBubblesFromFirestore:142`) удалить **legacy-ветку записи массива в родительский док** (строки 108-113: `setDoc(bubblesRef, { bubbles: ... })`), оставив в catch только localStorage-fallback. Причина: эта ветка срабатывает на ЛЮБУЮ ошибку (включая переполнение батча) и пишет данные в схему, которую сервер не читает, — тихая потеря.

**Verify**: `grep -n 'bubbles: bubblesForStorage' src/services/firestoreService.js` → пусто; build зелёный.

### Step 8: Полная верификация и коммит

- `CI=true npm run test:ci` → exit 0
- `CI=true npm run build` → exit 0
- Ручной прогон (если возможен): создать задачу → править → переключить rich-text → удалить тег → перезагрузить страницу: всё на месте.

## Test plan

- Новые тесты: `src/services/firestoreService.test.js` не пишем (требует эмулятора Firestore) — фиксируем поведение «что вызывается» нельзя без моков firebase; вместо этого гейт — грепы Done criteria + build + ручной сценарий. Отметить в отчёте как осознанный пробел.
- Существующие: `npm run test:ci`, `npm run test:functions` зелёные.

## Done criteria

- [ ] `grep -rn 'saveBubblesToFirestore' src/` → ровно 3 вхождения: определение в `firestoreService.js`, вызов миграции в `loadBubblesFromFirestore`, вызов импорта в `BubblesPage.jsx`
- [ ] `grep -c 'upsertBubble\|updateBubbleFields\|deleteBubbleDoc' src/services/firestoreService.js` → ≥3 (определения)
- [ ] Внутри всех `setBubbles(prev => ...)` в `BubblesPage.jsx` нет вызовов функций сервиса: `grep -n 'saveBubblesToFirestore\|upsertBubble\|updateBubbleFields' src/pages/BubblesPage.jsx` — ни одно вхождение не находится внутри колбэка `setBubbles` (проверить глазами все совпадения)
- [ ] Legacy-ветка записи массива удалена
- [ ] `CI=true npm run build` и `CI=true npm run test:ci` → exit 0
- [ ] `plans/README.md`: строка плана 008 → DONE

## STOP conditions

- Любая выдержка «Current state» не совпадает с живым кодом (особенно номера строк call-site'ов — сперва найди их грепом заново, при расхождении структуры — STOP).
- Обнаружишь call-site `saveBubblesToFirestore`, не перечисленный в списке из 7 пунктов.
- Окажется, что какой-то call-site реально нуждается в данных, доступных только внутри апдейтера (нельзя вынести построение наружу без изменения семантики) — STOP с описанием.
- Шаг 7: обнаружишь код, который ЧИТАЕТ legacy-массив после записи fallback'ом (зависимость от него) — STOP.

## Maintenance notes

- После этого плана `plans/009` упрощает оставшиеся гонки (`handleDeleteTag` таймер, `handleMarkAsDone`).
- Любая новая мутация задач — только через `upsertBubble`/`updateBubbleFields`/`updateBubbleStatus`; `saveBubblesToFirestore` — только для импорта/миграции.
- Ревьюеру: главное — что ни один setState-апдейтер не содержит side effects, и что семантика правки задачи (overdue-поля, `manuallyStoppedPulsingRef`) не изменилась.
- Стоимость: одно действие пользователя теперь 0 reads + 1-2 writes вместо N+N.
