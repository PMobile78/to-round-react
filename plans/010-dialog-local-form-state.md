# Plan 010: Перенести state полей title/description внутрь диалогов задач

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/pages/BubblesPage.js src/components/CreateBubbleDialog.js src/components/EditBubbleDialog.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP. Если
> plans/008 уже выполнен, call-site'ы сохранения выглядят иначе, чем в
> выдержках, — ориентируйся на живой код, цель шага не меняется.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 008 (желательно — меньше конфликтов в тех же строках; формально можно и без него)
- **Category**: perf
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

`title` и `description` редактируемой задачи живут в state 2900-строчного `BubblesPage` (`src/pages/BubblesPage.js:249-250`). **Каждое нажатие клавиши** в поле заголовка или rich-text-редакторе ре-рендерит всю страницу: списки, панели категорий, инлайн-вычисления вроде `showStopPulsing` (IIFE в JSX, `BubblesPage.js:2636-2644`) и подсчёты категорий. Это главный источник тормозов при вводе. Лечение: поля формы становятся локальным state диалогов; родитель получает значения один раз — при сохранении.

## Current state

- `BubblesPage.js:249-250`:
  ```js
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  ```
- Оба диалога — управляемые пропсами «глупые» компоненты:
  - `src/components/CreateBubbleDialog.js:32-55` — props включают `title, setTitle, description, setDescription, ...`
  - `src/components/EditBubbleDialog.js:32-60` — те же `title, setTitle, description, setDescription`, плюс edit-поля.
- Заполнение формы при открытии edit-диалога: эффект `BubblesPage.js:~1900-1914` (по `editDialog, selectedBubble` ставит `setEditBubbleSize`, `setEditRecurrence`, `setUseRichTextEdit`; title/description ставятся в клик-хендлере `useMatterEngine.js:277-282` через `setTitle(clickedBubble.title)`).
- Сохранение: обработчики читают `title`/`description` из state страницы (создание — район `BubblesPage.js:860-890`; правка — `BubblesPage.js:941-982`, поля `title, description` в объекте задачи на строках 962-963).
- Сбросы: после сохранения/закрытия — `setTitle(''); setDescription('');` (несколько мест, например 987-988, 1113-1114).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**: `src/pages/BubblesPage.js`, `src/components/CreateBubbleDialog.js`, `src/components/EditBubbleDialog.js`.

**Out of scope**:
- Остальные поля формы (dueDate, notifications, recurrence, размер, тег) — переносятся ТОЛЬКО title/description (горячий путь клавиатуры). Перенос остальных — возможный follow-up.
- `RichTextEditor.js` внутренности.
- Объединение двух диалогов — это `plans/011`.

## Git workflow

- Ветка: `advisor/010-dialog-form-state`. **Не пушить в `main`**.

## Steps

### Step 1: EditBubbleDialog — локальный state с инициализацией при открытии

В `EditBubbleDialog.js`: убрать из props `title, setTitle, description, setDescription`; добавить props `initialTitle`, `initialDescription`, и расширить колбэк сохранения. Внутри:

```js
const [title, setTitle] = React.useState(initialTitle || '');
const [description, setDescription] = React.useState(initialDescription || '');
React.useEffect(() => {
    if (open) {
        setTitle(initialTitle || '');
        setDescription(initialDescription || '');
    }
}, [open, initialTitle, initialDescription]);
```

JSX внутри диалога уже использует `title/setTitle/description/setDescription` — имена сохранены, правки JSX минимальны. Кнопка сохранения должна вызывать `onSave({ title, description })` (найди текущий проп сохранения — вероятно `handleSaveEdit`/`onSave` — и передай значения аргументом).

**Verify**: `CI=true npm run build` → exit 0.

### Step 2: CreateBubbleDialog — аналогично

Локальные `title/description`, сброс в `''` при `open === true` (создание всегда начинается с пустой формы), `onCreate({ title, description })` при подтверждении.

**Verify**: build → exit 0.

### Step 3: BubblesPage — убрать горячий state, принять значения из колбэков

1. Обработчик сохранения правки получает `({ title, description })` параметром и использует их вместо state (строки 962-963 объекта задачи).
2. Обработчик создания — аналогично.
3. Передать в `EditBubbleDialog` `initialTitle={selectedBubble?.title || ''}`, `initialDescription={selectedBubble?.description || ''}`.
4. Удалить `const [title, setTitle] = useState('')` и `description` (строки 249-250) и ВСЕ обращения: `grep -n '\bsetTitle\|\bsetDescription\b' src/pages/BubblesPage.js src/hooks/useMatterEngine.js` — каждое вхождение либо удалить, либо заменить. Известные места: клик-хендлер в `useMatterEngine.js:278-279` (передаётся как параметр хука — убрать из параметров и вызова), сбросы после закрытия диалогов, deep-link открытие (`BubblesPage.js:~2020`).

Внимание: `useMatterEngine` принимает `setTitle`/`setDescription` как аргументы — сигнатуру хука и вызов синхронизировать.

**Verify**: `grep -cn 'setTitle\|setDescription' src/pages/BubblesPage.js src/hooks/useMatterEngine.js` → 0; `CI=true npm run build` → exit 0 (ESLint поймает забытые ссылки).

### Step 4: Ручная проверка и коммит

`npm start`: создать задачу с заголовком и описанием; открыть существующую — поля предзаполнены; править и сохранить; открыть другую задачу — нет «протечки» текста между задачами; быстрый набор текста не подлагивает (списки не перерисовываются — проверить React DevTools Profiler при возможности). Коммит: `git commit -am "Move title/description form state into bubble dialogs"`.

## Test plan

Компонентных тестов нет (нет @testing-library — см. plans/002). Гейт: build с ESLint + грепы + ручной сценарий шага 4. Регрессия, которую важно проверить руками: live-обновление открытого диалога (plans/015) ещё больше не работает — поведение не должно ухудшиться.

## Done criteria

- [ ] В `BubblesPage.js` нет state `title`/`description`
- [ ] Оба диалога держат title/description локально, наружу отдают только при save
- [ ] `CI=true npm run build` → exit 0
- [ ] Ручной сценарий шага 4 пройден (или отмечен невозможным в headless)
- [ ] `plans/README.md`: строка плана 010 → DONE

## STOP conditions

- Обнаружится, что `title`/`description` читаются где-то ещё, кроме диалогов и обработчиков сохранения (например, в TextOverlay или списках) — STOP, перечисли места.
- `useMatterEngine` использует `setTitle`/`setDescription` не только в клик-хендлере.
- После правки build падает по ESLint в файлах вне scope.

## Maintenance notes

- Следующий шаг той же стратегии — перенос dueDate/notifications/recurrence (упростит plans/011).
- Ревьюеру: проверить инициализацию при повторном открытии того же пузыря (useEffect по `open`) и отсутствие «протечки» формы между задачами.
- `plans/015` (live-обновление открытого диалога) после этого плана должен обновлять initialTitle/initialDescription — координация отмечена там.
