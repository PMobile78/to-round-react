# Implementation Plans

Сгенерировано скиллом improve 2026-06-11 на коммите `0bcd99f`. Выполнять в
порядке таблицы, если зависимости не диктуют иное. Исполнителю: прочитай план
целиком до старта, чти его STOP conditions, по завершении обнови свою строку
**и закрой связанный GitHub issue**.

> **Reconcile 2026-06-13 (HEAD `c7be9d6`):** с момента написания планов весь
> `src/` переименован `.js` → `.jsx` (компоненты, страницы, `App`, `index`);
> `functions/index.js`, `src/services/*`, `src/hooks/*`, `src/utils/*`,
> `scripts/*` остались `.js`. Пути во всех планах обновлены под это
> переименование. **Excerpts «Current state» НЕ перепроверялись построчно** —
> `BubblesPage.jsx` с тех пор изменился (+218 строк: скины оформления,
> change-password), добавлена подсистема `src/theme/designs/`. Поэтому
> `Planned at` оставлен на `0bcd99f`: drift-check в начале каждого плана
> сработает и заставит исполнителя сверить выдержки с живым кодом. Все находки
> на 2026-06-13 перепроверены как актуальные (хук-баг, отсутствие ESLint,
> tracked `.env.production`/`public/sw.js`, write-amplification — на месте).

**Общие правила для всех планов:**
- Установка: `npm ci --legacy-peer-deps` (peer-конфликты — это известно и ожидаемо).
- **Никогда не пушить в `main`** — пуш запускает автодеплой на GitHub Pages.
- Деплой Cloud Functions (`firebase deploy --only functions`) выполняет только владелец.
- Аудит-источник: `docs/code-review-2026-06-10.md` (подробности находок).

## Трекинг готовности

Каждый план = один GitHub issue (см. столбец Issue). По мере исполнения:
1. В строке таблицы ниже меняй **Status**: `TODO` → `IN PROGRESS` → `DONE`.
2. В самом плане блок **Status** уже содержит ссылку на issue; по завершении
   закрывай issue (`gh issue close <N> -c "done in <commit/PR>"`).
3. Зависимые планы стартуют только когда их «Depends on» в статусе `DONE`.

## Execution order & status

| Plan | Issue | Title | Priority | Effort | Depends on | Status |
|------|-------|-------|----------|--------|------------|--------|
| 001 | [#17](https://github.com/PMobile78/to-round-react/issues/17) | ESLint + фикс Rules of Hooks в HtmlRenderer | P1 | S | — | DONE |
| 002 | [#18](https://github.com/PMobile78/to-round-react/issues/18) | База верификации: npm test + тесты functions в CI | P1 | S–M | — | DONE |
| 003 | [#19](https://github.com/PMobile78/to-round-react/issues/19) | Убрать .env.production и public/sw.js из git | P1 | S | — | DONE |
| 004 | [#20](https://github.com/PMobile78/to-round-react/issues/20) | Зафиксировать версии зависимостей (вместо latest) | P2 | S | 002* | DONE |
| 005 | [#21](https://github.com/PMobile78/to-round-react/issues/21) | PUBLIC_URL вместо захардкоженного /to-round-react/ | P2 | S | — | DONE |
| 006 | [#22](https://github.com/PMobile78/to-round-react/issues/22) | Удаление FCM-токена при logout | P1 | S | — | DONE |
| 007 | [#23](https://github.com/PMobile78/to-round-react/issues/23) | Атомарный дедуп уведомлений + точный cron (functions) | P2 | S | — | TODO |
| 008 | [#24](https://github.com/PMobile78/to-round-react/issues/24) | Точечные записи Firestore вместо полной перезаписи | P1 | L | 001, 002 | TODO |
| 009 | [#25](https://github.com/PMobile78/to-round-react/issues/25) | Гонки со stale-состоянием (markAsDone, deleteTag) | P2 | M | 008 | TODO |
| 010 | [#26](https://github.com/PMobile78/to-round-react/issues/26) | Локальный state title/description в диалогах | P2 | M | 008* | TODO |
| 011 | [#27](https://github.com/PMobile78/to-round-react/issues/27) | Общая форма Create/EditBubbleDialog | P3 | L | 010 | TODO |
| 012 | [#28](https://github.com/PMobile78/to-round-react/issues/28) | React.lazy для MindMapPage (code splitting) | P2 | S | — | TODO |
| 013 | [#29](https://github.com/PMobile78/to-round-react/issues/29) | TextOverlay → top-level мемоизированный компонент | P3 | M | 001 | TODO |
| 014 | [#30](https://github.com/PMobile78/to-round-react/issues/30) | Общие date/time-утилиты + фикс пресета 'Nw' | P3 | M | 002 | TODO |
| 015 | [#31](https://github.com/PMobile78/to-round-react/issues/31) | Live-sync открытого диалога + призрачные тела | P3 | M | 010* | TODO |
| 016 | [#32](https://github.com/PMobile78/to-round-react/issues/32) | Поиск по тексту описания, а не по сырому HTML | P3 | S | 002 | TODO |
| 017 | [#33](https://github.com/PMobile78/to-round-react/issues/33) | SPIKE: переполнение пузырями на мобиле (по спеке) | P2 | M | — | TODO |
| 018 | [#34](https://github.com/PMobile78/to-round-react/issues/34) | Offline-персистентность Firestore (PWA) | P2 | S | — | TODO |
| 019 | [#35](https://github.com/PMobile78/to-round-react/issues/35) | DESIGN: связка mind map ↔ задачи | P3 | M | — | TODO |

`*` — мягкая зависимость: можно выполнять и без неё, но порядок из таблицы
уменьшает конфликты (планы правят одни и те же строки `BubblesPage.jsx`).

Status values: TODO | IN PROGRESS | DONE | BLOCKED (одной строкой причина) | REJECTED (одной строкой почему).

## Dependency notes

- **008 после 001 и 002**: самый рискованный рефакторинг идёт только при включённом ESLint и зелёной тестовой базе.
- **009 после 008**: использует функции `updateBubbleFields`/`upsertBubble`, появляющиеся в 008.
- **011 после 010**: объединять диалоги проще, когда горячий form-state уже локален.
- **013 после 001**: план 001 вешает eslint-disable на TextOverlay, план 013 его снимает.
- **Конфликтная зона `BubblesPage.jsx`**: планы 008, 009, 010, 013, 014, 015 правят один файл — выполнять последовательно, не параллельно.
- Планы 003, 005, 006, 007, 012, 016, 017, 018, 019 независимы и могут идти в любой момент.

## Findings considered and rejected

(чтобы не пере-аудировать в следующий раз)

- **«Нет импорта задач (export без import)»** — неверно: импорт есть (`MainMenuDrawer.jsx:151-156`, `handleImportJson` в `BubblesPage.jsx:1966`).
- **«Scheduler читает все активные задачи каждую минуту»** — неверно: оптимизация уже реализована, запрос идёт по индексу `nextNotifyAt` (`functions/index.js:23-27`), триггер `maintainNextNotifyAt` поддерживает поле.
- **«updateBubbleFields в firestoreService без fallback» (src)** — такой функции в `src/services/firestoreService.js` не существует (файл 374 строки); находка субагента сфабрикована. (Одноимённая функция в functions/index.js — другая и в порядке.)
- **Русская локаль неполна** — намеренно: «requested: remove Russian» (`functions/index.js:52`); остаточный мусор (импорт `ru` date-fns-локали в диалогах) чистится попутно в плане 011.
- **Pre-commit hooks / Prettier / editorconfig** — для соло-проекта возни больше, чем пользы; не делаем.
- **Удаление legacy-веток чтения bubbles[] в firestoreService** — требует проверки прод-данных (есть ли пользователи на старой схеме); самая опасная legacy-ветка (запись) удаляется в плане 008, остальное не трогаем.
- **Клиентский parseLocalDateTime игнорирует bubble.tz** — реальный, но низкоприоритетный edge (смена таймзоны пользователем); зафиксирован в Maintenance notes плана 014, отдельный план не нужен.
- **Pulse-эффект перезапускается каждый рендер; дублированные эффекты фильтрации (ревью пп. 15-16)** — валидные перф-находки второго порядка; осознанно не планировались в этот заход, кандидаты на следующий (см. `docs/code-review-2026-06-10.md`).
- **CLAUDE.md утверждает «MUI v5», фактически установлен MUI 7** — доковая мелочь; поправить при выполнении плана 004.
- **Cloud Functions пишут в legacy-массив `bubbles[]`** (повторно проверено 2026-06-13) — не баг: `functions/index.js:388-394,406-413` пишут в subcollection, legacy-массив — только fallback при отсутствии sub-документа.
- **«Полная перезапись bubbles = потеря данных»** (повторно проверено 2026-06-13) — потери нет (`merge:true`); реальная проблема — write-amplification, она и есть план 008.
