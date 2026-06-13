# Plan 012: Code splitting — ленивый MindMapPage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/App.jsx`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/28
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

Весь код грузится одним бандлом: mind-elixir, @xyflow/react и dagre нужны только на экране mind map, но скачиваются и парсятся при каждом открытии главного экрана (PWA на мобиле!). `React.lazy` для `MindMapPage` выносит эти зависимости в отдельный чанк, который грузится только при заходе на mind map. Это самый дешёвый срез initial load.

## Current state

`src/App.jsx`:
- строка 6: `import MindMapPage from './pages/MindMapPage';`
- строки 66-80 — единственное место рендера:
  ```jsx
  {user ? (
      screen === 'mindmap' ? (
          <MindMapPage
              onBack={() => navigate('main')}
              themeMode={actualTheme}
          />
      ) : (
          <BubblesPage ... />
      )
  ) : ( <AuthForm ... /> )}
  ```
- В App.jsx уже есть загрузочный экран с `<CircularProgress size={60} sx={{ color: 'white' }} />` (строки ~50-58) — используем такой же fallback.
- mind-map зависимости тянутся только из `src/pages/MindMapPage.jsx` и `src/components/mindmap/**` — проверить: `grep -rln "mind-elixir\|@xyflow" src/ | grep -v mindmap | grep -v MindMapPage` → должно быть пусто (если нет — STOP).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Чанки | `ls build/static/js/*.chunk.js \| wc -l` | больше, чем до правки |

## Scope

**In scope**: `src/App.jsx`.

**Out of scope**: lazy для TipTap/Matter.js (нужны на главном экране — бессмысленно), `MindMapPage.jsx` и его компоненты, роутинг.

## Git workflow

- Ветка: `advisor/012-lazy-mindmap`. **Не пушить в `main`**.

## Steps

### Step 1: Зафиксировать размер бандла «до»

`npm run build` и сохранить вывод секции «File sizes after gzip» (CRA печатает её всегда) в отчёт.

### Step 2: React.lazy + Suspense

В `App.jsx`:

```js
const MindMapPage = React.lazy(() => import('./pages/MindMapPage'));
```

(строку 6 удалить; `React` уже импортирован). Рендер обернуть:

```jsx
screen === 'mindmap' ? (
    <React.Suspense fallback={
        <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={60} />
        </Box>
    }>
        <MindMapPage onBack={() => navigate('main')} themeMode={actualTheme} />
    </React.Suspense>
) : ( ... )
```

(Box/CircularProgress уже импортированы в App.jsx для loading-экрана — проверить и переиспользовать его стиль с `background: theme.palette.background.bubbleView`, как в строках 50-58, чтобы не мигало белым.)

**Verify**: `npm run build` → exit 0.

### Step 3: Подтвердить выигрыш

Сравнить «File sizes after gzip» до/после: главный чанк должен похудеть, появиться новый chunk. Записать цифры в отчёт.

**Verify**: главный bundle уменьшился; `grep -rl "mind-elixir" build/static/js/ | head -3` — mind-elixir не в main-чанке (имя main-чанка вида `main.*.js`).

### Step 4: Ручная проверка и коммит

`npm start` → открыть mind map из меню: краткий спиннер → карта работает; назад на пузыри — без регрессий. Коммит: `git commit -am "Lazy-load MindMapPage to split mindmap deps into separate chunk"`.

## Test plan

Не требуется новых тестов; гейт — сравнение чанков (шаг 3) + ручное открытие mind map.

## Done criteria

- [ ] `grep -n "React.lazy" src/App.jsx` → 1 совпадение
- [ ] `npm run build` → exit 0; main-чанк меньше, чем в шаге 1; mind-elixir не в main-чанке
- [ ] `plans/README.md`: строка плана 012 → DONE

## STOP conditions

- mind-map зависимости импортируются откуда-то ещё кроме `src/pages/MindMapPage.jsx` / `src/components/mindmap/**` (грep из Current state непуст).
- После lazy build падает с ошибкой про default export (`MindMapPage` должен быть default-экспортом — проверь).

## Maintenance notes

- Следующие кандидаты на split: TipTap-таблицы (если редактор откроют реже), `AboutDialog`. Не делать без измерений.
- Ревьюеру: проверить фон fallback-экрана (тёмная тема не должна мигать белым).
