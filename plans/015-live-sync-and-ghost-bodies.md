# Plan 015: Починить live-обновление открытого диалога и «призрачные» Matter-тела

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/hooks/useMatterEngine.js src/pages/BubblesPage.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP. Если
> выполнен plans/010, форма диалога локальная — учитывай его Maintenance notes.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: 010 (желательно; меняет способ доставки обновлений в форму)
- **Category**: bug
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Эффект инициализации физики в `useMatterEngine` выполняется один раз на маунте (`}, []);` — строка 312), поэтому в колбэке `subscribeToBubblesUpdates` значения `editDialog` и `selectedBubble` навсегда зафиксированы как `false`/`null`:

1. **Мёртвая ветка**: блок «обновить открытый диалог при серверном обновлении» не выполняется никогда. Фактический эффект: когда Cloud Function автоматически переносит просроченную повторяющуюся задачу на новую дату, открытый диалог этой задачи показывает старую дату.
2. **Призрачные тела**: когда snapshot приносит список БЕЗ какой-то задачи (удалена с другого устройства), она исчезает из state, но её Matter-тело остаётся в `engine.world` — на канвасе висит пустой кружок без подписи до перезагрузки.

## Current state

- `src/hooks/useMatterEngine.js:166-258` — подписка внутри mount-эффекта:
  ```js
  const unsubscribeBubbles = subscribeToBubblesUpdates((serverBubbles) => {
      setBubbles(prev => {
          const map = new Map(prev.map(b => [b.id, b]));
          const merged = serverBubbles.map(sb => {
              const ex = map.get(sb.id);
              return ex ? { ...ex, ...sb, body: ex.body } : sb;
          });
          ...
          // If edit dialog is open for a selected bubble, reflect live updates
          if (editDialog && selectedBubble && selectedBubble.id) {   // ← всегда false/null (stale closure)
              const updated = merged.find(b => String(b.id) === String(selectedBubble.id));
              if (updated) {
                  setSelectedBubble(prevSel => (...));
                  if (updated.dueDate) { ... setEditDueDate(d) ... }
                  if (Array.isArray(updated.notifications)) { setEditNotifications(updated.notifications); }
                  setEditRecurrence(updated.recurrence || null);
              }
          }
          return merged;
      });
  });
  ```
- Конец эффекта: `}, []); // Убираем themeMode из зависимостей` (строка 312) — менять deps НЕЛЬЗЯ (пересоздаст мир).
- Тела добавляются в мир эффектами `BubblesPage.js:626-643` и `:664-...` (оба итерируют только текущие `bubbles` — удалённые тела никто не убирает).
- `useMatterEngine` получает из `BubblesPage` параметры (см. сигнатуру хука в начале файла — `editDialog`, `selectedBubble`, сеттеры и пр.; выпиши фактическую сигнатуру).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**: `src/hooks/useMatterEngine.js`, `src/pages/BubblesPage.js` (прокладка refs/колбэка).

**Out of scope**:
- Любые изменения физики/рендера Matter, deps mount-эффекта (`[]` остаётся).
- Конфликт «пользователь печатает, а сервер обновил ту же задачу» — текущее поведение (сервер выигрывает для dueDate/notifications/recurrence) сохранить; title/description пользователя не трогать.

## Git workflow

- Ветка: `advisor/015-live-sync-ghosts`. **Не пушить в `main`**.

## Steps

### Step 1: Призрачные тела — удалять исчезнувшие из мира

В колбэке подписки, внутри `setBubbles(prev => ...)`, перед `return merged;`:

```js
const mergedIds = new Set(merged.map(b => String(b.id)));
prev.forEach(b => {
    if (b.body && !mergedIds.has(String(b.id))) {
        try { World.remove(engine.world, b.body); } catch (_) { }
    }
});
```

(`World` и `engine` доступны в замыкании mount-эффекта — это не stale-данные, объект engine один.)

**Verify**: build зелёный. Ручной тест (две вкладки или Firestore-консоль): удалить документ задачи извне → пузырь исчезает с канваса без перезагрузки.

### Step 2: Live-обновление диалога — через ref вместо stale-замыкания

Минимально-инвазивный путь: `BubblesPage` передаёт в хук ref с актуальными значениями.

В `BubblesPage.js`:
```js
const liveEditRef = useRef({ editDialog: false, selectedBubbleId: null });
useEffect(() => {
    liveEditRef.current = { editDialog, selectedBubbleId: selectedBubble?.id ?? null };
}, [editDialog, selectedBubble]);
```
Передать `liveEditRef` в `useMatterEngine` (добавить в сигнатуру). В колбэке подписки заменить условие:

```js
const { editDialog: liveOpen, selectedBubbleId } = liveEditRef.current;
if (liveOpen && selectedBubbleId != null) {
    const updated = merged.find(b => String(b.id) === String(selectedBubbleId));
    ...
}
```

Тело ветки (обновление `setSelectedBubble`, `setEditDueDate`, `setEditNotifications`, `setEditRecurrence`) оставить как есть — сеттеры стабильны. Если plans/010 выполнен и title/description локальны в диалоге — НЕ пытаться их обновлять (см. Out of scope), достаточно полей даты/уведомлений/recurrence.

**Verify**: `CI=true npm run build` → exit 0. Ручной тест: открыть диалог просроченной повторяющейся задачи, дождаться автопереноса от Cloud Function (или поменять dueDate документа в Firestore-консоли) → дата в открытом диалоге обновилась.

### Step 3: Убрать вводящий в заблуждение комментарий и закоммитить

Комментарий про «stale closure — matches original» (если есть в этом блоке) удалить/обновить. `git commit -am "Fix live dialog sync (stale closure) and remove ghost Matter bodies on remote delete"`.

## Test plan

Юнит-тестов нет (требует Matter+Firestore); гейт — build + два ручных сценария из шагов 1–2. Обязательно выполнить хотя бы сценарий шага 1 (две вкладки достаточно).

## Done criteria

- [ ] В колбэке подписки нет обращений к замкнутым `editDialog`/`selectedBubble` (только через ref)
- [ ] Удаление задачи с другого устройства убирает тело из мира (ручной тест пройден)
- [ ] `CI=true npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 015 → DONE

## STOP conditions

- Сигнатура `useMatterEngine` существенно отличается от ожиданий (например, сеттеры формы уже не передаются после plans/010) и непонятно, куда доставлять обновления — STOP с описанием фактической сигнатуры.
- После шага 1 пузыри начинают исчезать при обычной фильтрации (false positive удаления) — откатить шаг и STOP.

## Maintenance notes

- Это место — кандидат на следующий рефакторинг: вынести merge-логику подписки из mount-эффекта в отдельный колбэк с нормальными зависимостями.
- Ревьюеру: шаг 1 не должен срабатывать на ФИЛЬТРАЦИЮ (фильтры убирают тела отдельным механизмом) — удаление только когда задачи нет в server-списке.
