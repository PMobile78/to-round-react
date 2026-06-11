# Plan 016: Поиск по описанию — искать в тексте, а не в сыром HTML

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/hooks/useSearch.js src/components/TaskList.js src/utils/`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 002 (тесты как gate)
- **Category**: bug (UX)
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Описания задач хранятся как HTML (TipTap). Поиск делает `description.toLowerCase().includes(query)` по сырому HTML: запрос «span», «strong» или «http» находит все rich-text задачи, а текст, разорванный тегами (`фо<em>о</em>бар`), наоборот не находится. Нужно искать по извлечённому тексту.

## Current state

- `src/hooks/useSearch.js:36` (внутри `defaultSearchFunction`):
  ```js
  const descriptionMatch = (item.description || '').toLowerCase().includes(lowerQuery);
  ```
- `src/components/TaskList.js:249` — дублированная логика подсчёта:
  ```js
  const descriptionMatch = (bubble.title || '') ... // строка 248: title
  const descriptionMatch = (bubble.description || '').toLowerCase().includes(query);
  ```
  (точная форма — в файле, район 243-255; есть и основная фильтрация списка где-то выше — найди грепом `descriptionMatch` все вхождения в файле).
- Конвенция проекта: весь HTML-рендеринг через DOMPurify (`HtmlRenderer.js`); для извлечения текста рендерить ничего не нужно — достаточно DOM-парсинга без вставки в документ.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build | `CI=true npm run build` | exit 0 |

## Scope

**In scope**: `src/utils/stripHtml.js` (создать) + тест, `src/hooks/useSearch.js`, `src/components/TaskList.js`.

**Out of scope**: подсветка совпадений, поиск по mind maps, изменение поиска по title/tag.

## Git workflow

- Ветка: `advisor/016-search-strip-html`. **Не пушить в `main`**.

## Steps

### Step 1: Утилита stripHtml с кэшем

`src/utils/stripHtml.js`:

```js
// Извлекает плоский текст из HTML-описания. Кэш по строке-источнику:
// описания меняются редко, а поиск дёргает функцию на каждый ввод.
const cache = new Map();
const MAX_CACHE = 2000;

export const stripHtml = (html) => {
    if (!html) return '';
    if (!/[<&]/.test(html)) return html; // plain text — без парсинга
    const hit = cache.get(html);
    if (hit !== undefined) return hit;
    const docEl = new DOMParser().parseFromString(html, 'text/html');
    const text = (docEl.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(html, text);
    return text;
};
```

(DOMParser не исполняет скрипты — безопасно; в jsdom-окружении Jest доступен.)

**Verify**: build зелёный.

### Step 2: Тест

`src/utils/stripHtml.test.js`: `<p>привет <strong>мир</strong></p>` → `привет мир`; разорванный тегами текст `фо<em>о</em>бар` → содержит `фообар`; plain text проходит как есть; `''`/`null` → `''`; «span» НЕ находится в `<span>текст</span>`.

**Verify**: `CI=true npm run test:ci` → exit 0.

### Step 3: Применить в обоих местах поиска

- `useSearch.js:36` → `const descriptionMatch = stripHtml(item.description || '').toLowerCase().includes(lowerQuery);`
- `TaskList.js` — `grep -n 'description || ' src/components/TaskList.js`, заменить КАЖДОЕ вхождение паттерна includes-по-description на `stripHtml(...)`-вариант (их минимум одно на строке ~249; вероятно, есть второе в основной фильтрации списка).

**Verify**: `grep -n "description || '').toLowerCase().includes" src/hooks/useSearch.js src/components/TaskList.js` → пусто; build → exit 0.

### Step 4: Ручная проверка и коммит

`npm start`: создать rich-text задачу с жирным словом; поиск «span» её НЕ находит; поиск слова из описания — находит; счётчик результатов в списке согласуется с выдачей. Коммит: `git commit -am "Search task descriptions by extracted text, not raw HTML"`.

## Test plan

Шаг 2 + ручная проверка шага 4. Образец тестов: `src/utils/*.test.js` из plans/002.

## Done criteria

- [ ] `stripHtml` существует, покрыт тестами (≥4 кейса)
- [ ] Оба места поиска используют stripHtml; старый паттерн не грепается
- [ ] `CI=true npm run test:ci` и `npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 016 → DONE

## STOP conditions

- В `TaskList.js` поиск по description встречается >3 раз или сплетён с другой логикой — перечисли вхождения и STOP.
- Поиск стал заметно лагать на вводе (кэш не помогает) — STOP с измерением.

## Maintenance notes

- Тот же `stripHtml` пригодится для превью описаний и для будущего полнотекстового поиска.
- Ревьюеру: проверить, что кэш не растёт неограниченно (clear на 2000 — грубый, но достаточный механизм).
