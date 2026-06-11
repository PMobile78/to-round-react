# Plan 005: Заменить захардкоженный базовый путь `/to-round-react/` на `PUBLIC_URL`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/pages/BubblesPage.js src/index.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Приложение хостится на GitHub Pages под `/to-round-react/` (поле `homepage` в `package.json`), и три места захардкодили этот префикс. В локальной разработке (`npm start` на `/`) звук лопания и иконка отдают 404, а service worker вообще не регистрируется — значит, локально не работают FCM и deep links. CRA подставляет правильный префикс автоматически через `process.env.PUBLIC_URL` (пустая строка в dev, `/to-round-react` в build).

## Current state

1. `src/pages/BubblesPage.js:1023`:
   ```js
   const popAudio = new window.Audio('/to-round-react/pop.mp3');
   ```
2. `src/pages/BubblesPage.js:2089`:
   ```jsx
   <img
       src="/to-round-react/bubbles.png"
   ```
3. `src/index.js:32`:
   ```js
   const swPath = '/to-round-react/sw.js';
   navigator.serviceWorker.register(swPath).then(...)
   ```

Файлы `pop.mp3`, `bubbles.png`, `sw.js` лежат в `public/` (sw.js генерируется `npm run generate-sw`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Поиск остатков | `grep -rn "'/to-round-react/" src/` | пусто после правки |
| Build | `npm run build` | exit 0 |
| Префикс в бандле | `grep -rl "to-round-react/pop.mp3" build/static/js/ \| head -1` | непусто (PUBLIC_URL подставился) |

## Scope

**In scope**: `src/pages/BubblesPage.js` (две строки), `src/index.js` (одна строка).

**Out of scope**:
- `HOMEPAGE_URL` в `functions/index.js` — серверная константа, ей PUBLIC_URL недоступен.
- `homepage` в `package.json`, `scripts/generate-sw.js`, содержимое `public/`.

## Git workflow

- Ветка: `advisor/005-public-url`. **Не пушить в `main`** (автодеплой).

## Steps

### Step 1: Заменить три вхождения

- `BubblesPage.js:1023` → `new window.Audio(`${process.env.PUBLIC_URL}/pop.mp3`)`
- `BubblesPage.js:2089` → `src={`${process.env.PUBLIC_URL}/bubbles.png`}`
- `index.js:32` → `const swPath = `${process.env.PUBLIC_URL}/sw.js`;`

**Verify**: `grep -rn "'/to-round-react/" src/` → пусто; `grep -rn 'PUBLIC_URL' src/ | wc -l` → ≥3.

### Step 2: Проверить прод-сборку

`npm run build`, затем убедиться, что префикс попал в бандл:

**Verify**: `grep -rl "to-round-react/pop.mp3" build/static/js/` → хотя бы один файл; `grep -o 'to-round-react/sw.js' build/static/js/*.js | head -1` → найдено.

### Step 3: Проверить dev-режим (ручная, по возможности)

`npm start`, в браузере на `http://localhost:3000`: консоль не содержит 404 на `pop.mp3`/`bubbles.png`; `navigator.serviceWorker.getRegistrations()` в DevTools возвращает регистрацию. Если окружение headless — пропустить и отметить в отчёте.

### Step 4: Коммит

`git commit -am "Use PUBLIC_URL instead of hardcoded /to-round-react/ paths"`

## Test plan

Автотест не требуется (статические пути); гейт — шаг 2 (префикс в прод-бандле) и грep-проверки.

## Done criteria

- [ ] `grep -rn "'/to-round-react/" src/` → пусто
- [ ] `npm run build` → exit 0, в бандле есть `to-round-react/pop.mp3` и `to-round-react/sw.js`
- [ ] `plans/README.md`: строка плана 005 → DONE

## STOP conditions

- Выдержки не совпали (номера строк сместились — найди те же литералы грепом; если литералов больше трёх, доложи полный список перед правкой).
- После build в бандле нет `to-round-react/`-префикса у этих путей — значит PUBLIC_URL не подставился; не подгоняй вручную, доложи.

## Maintenance notes

- Новые ссылки на ассеты из `public/` всегда строить через `process.env.PUBLIC_URL`.
- Ревьюеру: проверить, что шаблонные строки в JSX корректно обёрнуты в `{}`.
