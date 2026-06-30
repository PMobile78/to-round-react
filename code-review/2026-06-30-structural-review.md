# 🔬 Thermo-Nuclear Code Review — `to-round-react`

**Дата:** 2026-06-30
**Охват:** вся кодовая база (~18.7k строк), 6 параллельных ревью-агентов по кластерам + личная верификация флагманских файлов и всех «громких» находок по `file:line`.
**Фокус навыка:** качество реализации, структурная простота, абстракции, здоровье кодовой базы. Сортировка — по структурной важности (code-judo вперёд), а не по числу замечаний.

---

## ⚖️ Вердикт: НЕ APPROVE в текущем виде

Не из-за «не работает» — работает. А потому что сработали два пресумптивных блокера из критериев навыка:

1. файл остаётся **>1000 строк** (`BubblesPage.jsx` = 1136);
2. декомпозиция **сохранила/добавила** побочную сложность там, где виден чистый code-judo, удаляющий её.

Направление рефакторинга верное, но **выбранный инструмент декомпозиции (ref-мосты) — неправильный, и его надо заменить, пока он не расползся дальше.**

---

## 🔴 BLOCKER 1 — Паттерн `pageDeps`/`DepsRef`: декомпозиция недоделана и породила новый слой случайной сложности

**Главная находка ревью.** `BubblesPage.jsx` «похудел» с ~3000 до 1136 строк, но строки уехали в хуки, а **оркестрация осталась здесь и обросла духовой лентой** — пятью изменяемыми ref-мостами:

`BubblesPage.jsx:67` (`crudDepsRef`), `:106` (`tagPageDepsRef`), `:136` (`filterPageDepsRef`), `:162` (`listFilterPageDepsRef`), `:179` (`importExportPageDepsRef`) — каждый переприсваивается **на каждый рендер** (`crudDepsRef.current = {...}` на `:323`, `:273`, `:507`, `:515`, `:523`), а хуки читают `pageDeps.current` в момент вызова (`useTags.js:91,143`, `useBubbleFilters.js:299`, `useListFilters.js:153,166`, `useBubbleImportExport.js:23`).

**Почему это структурный регресс, а не нейтральный приём:** хуки разрезаны *по фичам* (tags, filters, crud, notifications), но **все они работают над одним общим состоянием `bubbles`/`tags`** — поэтому независимыми быть не могут. Возникли циклы (`useTags ↔ useBubbleFilters`), и ref-мост — это пластырь поверх них. Цена: data-flow React обойдён, повсюду риск устаревших замыканий, «свежесть» приходится поддерживать руками, а комментарии на 30+ строк (`:61-66`, `:101-105`, `:133-135`...) честно документируют, насколько неочевиден стал порядок инициализации. Это ровно «рефактор, который перекладывает сложность, а не удаляет её».

> **Code-judo:** ввести **один владелец** доменного состояния — `bubbles` + `tags` + производные селекторы — в виде контекста (`BubblesStoreProvider`) или редьюсера. Фичевые хуки потребляют его через `useContext`, а не через мост, прокинутый сквозь страницу. Это **удаляет все 5 ref-мостов разом**, разрывает циклы по-настоящему (общий источник истины вместо взаимных ссылок) и снимает «эффект бога» с `BubblesPage`.

## 🔴 BLOCKER 2 — `BubblesPage.jsx` всё ещё >1000 строк; `BubblesDialogs` — труба на ~130 пропсов

Связано с Blocker 1. `BubblesDialogs` (`BubblesPage.jsx:979-1110`) получает **~130 индивидуальных пропсов** и просто раздаёт их ~10 диалогам — это identity/pass-through абстракция, добавляющая индирекцию без ясности (стандарт навыка #4). Плюс `BubblesPage` напрямую держит ~20 `useState` для тумблеров диалогов/UI (`:185-224`), а 50-строчный IIFE `editDialogShowStopPulsing` (`:768-817`) с `try/catch → return false` живёт прямо в теле компонента.

> **Code-judo:** после Blocker 1 диалоги читают состояние из стора/контекста — список из 130 пропсов **исчезает**, `BubblesDialogs` перестаёт быть трубой. Тумблеры диалогов свернуть в `useDialogsState` (редьюсер). `editDialogShowStopPulsing` вынести в чистую тестируемую `utils/notifications.js` (рядом с уже переехавшим туда `isOverdue`).

---

## 🟠 MAJOR 3 — Канонические, протестированные хелперы обойдены дублированием (стандарт #6)

Три случая, где **уже есть** каноничный helper, но код пишет свой:

1. **`getOffsetMs` (`utils/dateTime.js:79-104`, с тестами) переписан инлайн** в `BubblesPage.jsx:786-804` — и **уже разошёлся**: инлайн-версия принимает любой объект `{value,unit}`, а канон требует `type==='custom'`. Это буквально иллюстрация вреда дублирования. → Удалить IIFE-парсинг, звать `getOffsetMs(notif)`. (Серверная копия в `functions/index.js:228,241` — отдельный рантайм, но та же доменная логика; вынести в общий модуль или хотя бы продублировать осознанно с комментарием.)

2. **`utils/storage.js` (`lsGet`/`lsSet`, JSON-safe + try/catch) почти не используется** — ~90 прямых `localStorage.*` с магическими строками-ключами: `useBubbleFilters.js` (**36!**), `BubblesPage.jsx` (14), `useListFilters.js` (12), `firestoreService.js` (8), `useThemeMode.js` (7). → Прогнать всё через `lsGet/lsSet` + реестр ключей (`storageKeys.js`). 36 вызовов в одном хуке — сам по себе смелл.

3. **Рекраска пузырей размазана по ~14 точкам в 3 файлах**: `body.render.fillStyle = getBubbleFillStyle(...)` в `useTags.js:167-168`, `useBubbleNotifications.js:177,188,213,216,237,240,247`, `BubblesPage.jsx:406,459-464,619` — включая **хардкод `rgba(255,0,0,0.5)`** для overdue (нарушение конвенции темы). → Извлечь `applyBubbleFill(bubble, tag, { overdue })` — единая точка раскраски.

## 🟠 MAJOR 4 — 5 файлов дизайнов: рукописные структурно-идентичные объекты темы

Подтверждено: `classic/modern/clay/aurora/brutalist` (~1249 строк суммарно) содержат **ключ-в-ключ одинаковую** структуру (`palette/components/custom/{bubble,buttonStyles,outlinedButtonStyles,headerStrip,backdrop,dialogPaper,canvasBackground}`; четыре из пяти — идентичный набор `MuiButton/Chip/CssBaseline/Dialog/Drawer/Fab/Link/OutlinedInput/Paper`). **Фабрики нет** — `theme/designs/index.js` лишь маппит id→модуль.

> **Code-judo:** один `buildDesign(palette, tokens)` + по таблице значений на дизайн. Бо́льшая часть ~1250 строк схлопывается; новый дизайн = таблица значений, а не копипаста объекта темы. Самое крупное удаление строк в проекте.

## 🟠 MAJOR 5 — Дублирование UI-компонентов, удаляемое через композицию

- **`CreateBubbleDialog` + `EditBubbleDialog`** — обёртки вокруг одного `BubbleDialogForm` с идентичным каркасом Dialog. → Один `BubbleDialog mode="create|edit"`; edit-кнопки (Delete/MarkAsDone/StopPulsing) под условием. Удаляет ~целый файл.
- **Список категорий рендерится трижды** — `TasksCategoriesPanel.jsx`, `TasksCategoriesDialog.jsx`, `MobileCategorySelector.jsx` (~70% общей логики «иконка+имя+счётчик+onSelect»). → Извлечь `CategoryList` (чистый рендер), три контейнера лишь оборачивают.
- **`TaskList.jsx` (737 строк)** мешает фильтрацию/сортировку/рендер; матрица экшн-кнопок продублирована по 4 статус-блокам (`:614-727`, Edit/Restore/Delete с вариациями). → `TaskActionButtons` + декларативная `ACTION_MATRIX[status]`; вынести фильтр/сорт в хук. Снять ~115 строк.
- **`FilterMenu` ≈ `TaskFilterDrawer`** — почти одинаковые чекбоксы тегов. → Общий `TagFilterCheckboxes`.

## 🟠 MAJOR 6 — Хардкод цветов в обход конвенции темы (прямое нарушение CLAUDE.md)

36+ литералов в `TaskList.jsx`, 85+ в `TasksCategoriesPanel.jsx`, плюс `LanguageSelector.jsx`/`ThemeToggle.jsx` (свой `getThemeColors()` с `#3B7DED`/`white`), `useBubbleNotifications.js` (`rgba(255,0,0,0.5)`). CLAUDE.md прямо требует: все цвета — из темы. → `useStatusColors()` поверх `theme.palette.success/error/warning`; убрать `themeMode`-пропсы в пользу `useTheme()`.

## 🟠 MAJOR 7 — `RichTextEditor.jsx` (555) смешивает три ответственности

Plain-textarea режим, настройка TipTap (`useEditor`), переключение режима и три форматтера (`stripHtml/plainToRichHtml/essayToHtml`) — в одном файле. → Вынести `PlainTextArea`, `createExtensions()` (через `useMemo` по `placeholder`, иначе редактор пересоздаётся), форматтеры в `utils/richTextFormatters.js`; внешний компонент — чистый диспетчер режима.

## 🟠 MAJOR 8 — Dual-schema (субколлекция + legacy `bubbles[]`) тянется через клиент и сервер

Подтверждённый мёртвый-ish код: в `firestoreService.js` — тройная fallback-цепочка загрузки (`:120-155`), даунгрейд listener'а на legacy-документ (`:393-420`), молчаливый `catch(_){}` миграции (`:140`). На сервере — записи в legacy-массив (`functions/index.js:397-405,416-424`). Согласно CLAUDE.md и истории проекта массив `bubbles[]` сервером уже не читается.

> **Code-judo (с калибровкой):** «нарушение атомарности», на которое указал один из агентов, в **актуальной** ветке — это лишь косметический `updatedAt`-тач родителя (`:394,:413`), не массив; так что это не data-integrity блокер. Реальная ценность — **удалить legacy-ветки целиком** после подтверждения, что не осталось legacy-юзеров (через `collectionGroup('bubbles')`): тогда `updateBubbleDueDate`/`updateBubbleFields` схлопываются до одной записи в субдокумент, а клиентская загрузка/подписка упрощается до одного источника. Молчаливые `catch` — логировать.

---

## 🟡 Корректность/робастность (ниже структурных, но реальные)

- **`useBubbleImportExport.js:35-39`** — неатомарные последовательные записи (`await saveTags` → `await saveBubbles`, независимы), при падении второй — рассинхрон + `window.location.reload()` покажет неконсистентное состояние; `catch` только логирует. → `Promise.all` + откат стейта. *(подтверждено)*
- **`useMatterEngine.js:418`** — `parseInt(shadowColor.substring(1,3),16)` предполагает `#RRGGBB`; на не-hex → `rgba(NaN,...)`. Латентно (цвет из конфигов дизайна), но хрупко. → Прогнать через валидируемый color-util.
- **`liveEditRef` (`BubblesPage.jsx:93-98`) + стейл-замыкания в mount-эффекте Matter** — симптом неправильных зависимостей эффекта; растворяется при переезде на стор (Blocker 1).
- **Mindmap: шов движков** (`MindElixirEngine` 77 строк vs `ReactFlowEngine` 251) с непрозрачным `engineData` per-engine — абстракция притворяется, что движки взаимозаменяемы. Либо честно зафиксировать различие схем на границе, либо схлопнуть. *(средняя уверенность)*
- **Notification dedup-then-send** (`functions/index.js:441,473`) и **tz клиент/сервер** (`dateTime.js` без `tz` vs сервер с `TZDate`) — осознанные трейд-оффы (at-most-once; tz сохраняется при записи). Не баги, но стоит **задокументировать инвариант** и добавить guard на «browser-tz ≠ saved-tz». *(не утверждается как дефект — save-путь не дотрассирован до конца)*

---

## ✅ Что здоровое (по-честному)

- **Cron корректен** — `* * * * *` и `0 * * * *`, дрейфа `every`-vs-crontab нет.
- **`HtmlRenderer.jsx`** — DOMPurify с allowlist, единственная точка рендера HTML; соблюдается.
- **Auth-listener cleanup** и FCM-инициализация корректны.
- **Чистая логика хорошо вынесена в тестируемые утилиты** (`dateTime`, `bubbleJson`, `bubbleVisibility`, `physicsUtils`, `designs`, фильтры) — это правильный слой; именно поэтому дублирование `getOffsetMs` так обидно.
- **Намерение** декомпозиции `BubblesPage` верное — претензия только к *технике* (ref-мосты вместо стора).

---

## 🎯 Рекомендованный порядок (по убыванию рычага)

1. **Blocker 1+2 вместе** — стор/контекст для `bubbles`+`tags`; удаляет 5 ref-мостов и 130-пропсовую трубу `BubblesDialogs`. Делать **до** наращивания новой логики.
2. **Major 3** — прогнать через `getOffsetMs` / `storage` / `applyBubbleFill` (дёшево, высокий эффект, убирает дрейф).
3. **Major 4** — фабрика дизайнов (крупнейшее удаление строк).
4. **Major 5-7** — дедупликация UI + цвета темы + распил `RichTextEditor`/`TaskList`.
5. **Major 8** — удалить legacy dual-schema после проверки миграции.
6. **🟡** — точечные фиксы робастности.

---

## Приложение — метрики на момент ревью

| Файл | Строк |
|---|---|
| `src/pages/BubblesPage.jsx` | 1136 |
| `src/components/TaskList.jsx` | 737 |
| `src/hooks/useMatterEngine.js` | 581 |
| `functions/index.js` | 569 |
| `src/components/RichTextEditor.jsx` | 555 |
| `src/services/firestoreService.js` | 441 |
| `src/hooks/useBubbleCrud.js` | 421 |
| `src/components/BubblesDialogs.jsx` | 409 |
| `src/components/TasksCategoriesPanel.jsx` | 400 |
| 5 файлов `theme/designs/*` | ~1249 суммарно |

Итого по `src` + `functions` + `scripts`: ~18 666 строк.
