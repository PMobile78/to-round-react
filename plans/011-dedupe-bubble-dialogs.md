# Plan 011: Извлечь общую форму из CreateBubbleDialog и EditBubbleDialog

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/components/CreateBubbleDialog.js src/components/EditBubbleDialog.js`
> План предполагает выполненный plans/010 (title/description уже локальные).
> Если нет — выполни сначала 010.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: 010
- **Category**: tech-debt
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

`CreateBubbleDialog.js` (~279 строк) и `EditBubbleDialog.js` (~336 строк) — близнецы: одинаковые импорты (включая один и тот же список MUI-компонентов и date-fns-локалей), одинаковая структура Dialog → Title/Description → DateTimePicker → уведомления (AddNotification) → RepeatSettings → выбор тега → слайдер размера. Разница: edit добавляет кнопки Delete/Done/Stop pulsing и префиксы пропсов (`dueDate` vs `editDueDate`). Каждый багфикс формы (локаль пикера, валидация уведомлений) приходится делать дважды, и версии уже расходятся.

## Current state

- `CreateBubbleDialog.js:32-55+` — props: `open, onClose, t, isSmallScreen, isMobile, themeMode, getDialogPaperStyles, dueDate, setDueDate, isOverdue, notifDialogOpen, setNotifDialogOpen, notifValue, setNotifValue, createNotifications, setCreateNotifications, handleDeleteCreateNotification, tags, ...` (открой файл и выпиши полный список — он длиннее выдержки).
- `EditBubbleDialog.js:32-60+` — те же по смыслу props с префиксом edit: `editDueDate, setEditDueDate, editNotifications, setEditNotifications, handleDeleteNotification, selectedTagId, setSelectedTagId, editBubbleSize, setEditBubbleSize, handleDeleteBubble, ...`.
- Оба импортируют `ru` из date-fns-локалей (строка 24), хотя локаль `ru` из приложения удалена (`functions/index.js:52`: «requested: remove Russian») — при объединении ru-ветку выбора локали удалить, ru-импорт убрать.
- Конвенции: стили диалогов через `getDialogPaperStyles()` из пропсов; фон заголовков НЕ задавать (наследуется от Paper) — см. CLAUDE.md.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**:
- `src/components/BubbleDialogForm.js` (создать)
- `src/components/CreateBubbleDialog.js`, `src/components/EditBubbleDialog.js` (переписать поверх формы)
- `src/pages/BubblesPage.js` — только если потребуется переименовать передаваемые пропсы (минимально!)

**Out of scope**:
- Изменение видимого UI/UX (диалоги должны выглядеть и вести себя как раньше).
- Перенос остальных полей в локальный state (отметить как follow-up, если будет мешать).
- `AddNotification.js`, `RepeatSettings.js`, `RichTextEditor.js`.

## Git workflow

- Ветка: `advisor/011-dedupe-dialogs`. **Не пушить в `main`**. Коммит после каждого шага — рефакторинг крупный.

## Steps

### Step 1: Инвентаризация различий

Открыть оба файла целиком, составить таблицу «блок JSX → одинаковый/различается чем». Зафиксировать её в сообщении коммита или комментарии PR. Если различий по существу больше, чем «кнопки действий + источники значений» (например, разная логика валидации дат), — STOP и доложить таблицу.

### Step 2: Создать BubbleDialogForm

`src/components/BubbleDialogForm.js` — общий контент формы БЕЗ обёртки Dialog (Dialog, заголовок и DialogActions остаются в обёртках): поля title/description (локальные, из plans/010 — перенести сюда), DateTimePicker с выбором локали (en/uk; ru-ветку не переносить), уведомления, RepeatSettings, выбор тега, слайдер размера. Значения и сеттеры «небыстрых» полей — через props без префиксов (`dueDate, setDueDate, notifications, setNotifications, ...`).

**Verify**: `CI=true npm run build` → exit 0 (форма ещё не используется — допустимы unused-warning'и, не error).

### Step 3: Переключить EditBubbleDialog на форму

Edit-обёртка: Dialog + заголовок + `<BubbleDialogForm {...} />` + DialogActions с Delete/Done/Stop pulsing/Save. Маппинг префиксованных пропсов (`editDueDate` → `dueDate`) делать в обёртке, чтобы `BubblesPage.js` не менять.

**Verify**: build зелёный; ручная проверка edit-диалога (все поля, все кнопки).

### Step 4: Переключить CreateBubbleDialog на форму

Аналогично, DialogActions с Create/Cancel.

**Verify**: build зелёный; ручная проверка создания.

### Step 5: Удалить мёртвый код и коммит

Из обоих диалогов удалить продублированный JSX и неиспользуемые импорты (в т.ч. `ru` локаль). `grep -n "locale/ru" src/components/*.js` → пусто.

**Verify**: `CI=true npm run build` → exit 0; суммарный объём двух диалогов заметно меньше (ориентир: каждый ≤150 строк).

## Test plan

Компонентных тестов нет; гейт — build + обязательный ручной прогон обоих диалогов: создание со всеми полями; правка каждого поля; удаление; mark as done; stop pulsing (на просроченной повторяющейся задаче); смена языка приложения → локаль пикера меняется en/uk.

## Done criteria

- [ ] `BubbleDialogForm.js` существует и используется обоими диалогами
- [ ] `grep -n "locale/ru" src/components/` → пусто
- [ ] `CI=true npm run build` → exit 0
- [ ] Ручной прогон из Test plan выполнен без регрессий
- [ ] `plans/README.md`: строка плана 011 → DONE

## STOP conditions

- Шаг 1 выявил расхождения по существу (разная бизнес-логика, а не разные кнопки).
- Для объединения требуется менять `BubblesPage.js` больше, чем на переименование пары пропсов.
- plans/010 не выполнен.

## Maintenance notes

- Дальше можно перенести в форму и остальной state (dueDate и т.д.) — тогда `BubblesPage` отдаёт только `initialValues`/`onSave`.
- Ревьюеру: смотреть скриншоты до/после; этот рефакторинг не должен менять пиксели.
