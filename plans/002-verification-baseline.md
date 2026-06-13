# Plan 002: Создать базу верификации — рабочий `npm test` и тесты functions в CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- package.json .github/workflows/deploy.yml functions/test-next-notify.js src/utils/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/18
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

В `src/` нет ни одного тест-файла: `CI=true npx react-scripts test --watchAll=false` завершается ошибкой «No tests found». Единственные тесты проекта — `functions/test-next-notify.js` (самописный runner на голом Node, 17 проверок чистых функций планировщика) — запускаются только вручную и не входят в CI. Это значит: (а) нет ни одной команды, которой можно проверить «проект жив», (б) деплой уведомленческой логики не гейтится её же тестами. Этот план — пререквизит для рискованного рефакторинга в `plans/008`.

## Current state

- `package.json` — `"test": "react-scripts test"` (Jest в watch-режиме); тест-файлов в `src/` нет; devDependencies: только `dotenv`, `gh-pages` (нет @testing-library — поэтому пишем тест на чистый модуль без рендеринга).
- `functions/test-next-notify.js:1-4`:
  ```js
  /* eslint-disable no-console */
  // Run: TZ=UTC node functions/test-next-notify.js
  const { _test } = require('./index.js');
  const { computeNextNotifyAt } = _test;
  ```
  Завершается `process.exit(failed ? 1 : 0)` — пригоден для CI как есть. **Важно**: `functions/index.js` при require инициализирует `firebase-admin` — если из-за этого скрипт падает вне эмулятора, см. STOP conditions (на момент написания плана скрипт работал — комментарий в файле это подтверждает).
- `.github/workflows/deploy.yml` — шаги: Checkout → Setup Node 18 → npm ci → Bump version → Create .env.production → Generate SW → Build → Deploy. Шага тестов нет. В функциях свои зависимости (`functions/package.json`), workflow их не ставит.
- `src/utils/` — кандидаты на первый юнит-тест: маленькие чистые модули (`reorderArray.js`, `physicsUtils.js`). Перед выбором открой файл и убедись, что он **не импортирует** `../firebase` (firebase.js бросает исключение без env-переменных).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (root) | `npm ci --legacy-peer-deps` | exit 0 |
| Install (functions) | `cd functions && npm ci` | exit 0 |
| Jest однократно | `CI=true npx react-scripts test --watchAll=false` | exit 0 после шага 1 |
| Тесты functions | `cd functions && TZ=UTC node test-next-notify.js` | exit 0, 17×PASS |

## Scope

**In scope**:
- `src/utils/<выбранный модуль>.test.js` (создать)
- `package.json` (добавить scripts `test:ci`, `test:functions`)
- `.github/workflows/deploy.yml` (добавить шаги тестов)

**Out of scope**:
- Установка @testing-library / рендер-тесты компонентов — не сейчас.
- Любые изменения в `functions/index.js` или `functions/test-next-notify.js`.
- Изменение шагов deploy/build в workflow (только добавление тестовых шагов перед Build).

## Git workflow

- Ветка: `advisor/002-verification-baseline`. **Не пушить в `main`** (пуш в main = автодеплой).

## Steps

### Step 1: Первый юнит-тест в src/

Открыть `src/utils/reorderArray.js`. Если это чистая функция без импорта firebase — написать `src/utils/reorderArray.test.js` с 2–4 проверками фактического поведения (прочитай реализацию и протестируй то, что она реально делает: перенос элемента, граничные индексы, пустой массив). Если модуль непригоден — взять `src/utils/physicsUtils.js` по тем же правилам. Формат — обычный Jest (`describe`/`test`/`expect`), runner уже встроен в react-scripts.

**Verify**: `CI=true npx react-scripts test --watchAll=false` → exit 0, `Tests: N passed`.

### Step 2: npm-скрипты

В `package.json` в `scripts` добавить:

```json
"test:ci": "react-scripts test --watchAll=false",
"test:functions": "cd functions && TZ=UTC node test-next-notify.js"
```

**Verify**: `CI=true npm run test:ci` → exit 0; `npm run test:functions` → exit 0 и все строки `PASS`.

### Step 3: Тесты в CI перед сборкой

В `.github/workflows/deploy.yml` после шага «Install dependencies» и **до** «Bump version» добавить:

```yaml
    - name: Install functions dependencies
      run: cd functions && npm ci

    - name: Run tests
      run: |
        npm run test:ci
        npm run test:functions
```

(В Actions `CI=true` выставлен автоматически.)

**Verify**: `npx js-yaml .github/workflows/deploy.yml > /dev/null && echo OK` → `OK` (если `js-yaml` недоступен: `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/deploy.yml'));print('OK')"`).

### Step 4: Коммит

`git add src/utils/*.test.js package.json .github/workflows/deploy.yml && git commit -m "Add test baseline: first unit test, test scripts, CI test step"`

## Test plan

Этот план сам и есть тестовая инфраструктура. Новые тесты: `src/utils/<module>.test.js` — happy path + 1–2 граничных случая. Образца в репо нет — это первый Jest-тест; стиль `functions/test-next-notify.js` (компактные проверки с понятными именами) — хороший ориентир по духу.

## Done criteria

- [ ] `CI=true npm run test:ci` → exit 0, ≥2 теста проходят
- [ ] `npm run test:functions` → exit 0, 17 PASS
- [ ] В `deploy.yml` шаг Run tests стоит до Bump version/Build
- [ ] `git status --short` — изменены только in-scope файлы
- [ ] `plans/README.md`: строка плана 002 → DONE

## STOP conditions

- `npm run test:functions` падает на require `firebase-admin` (инициализация требует креды) — остановись и доложи: тогда тесты functions нельзя включать в CI без рефакторинга экспорта `_test`, это отдельное решение.
- Оба кандидата в `src/utils/` импортируют firebase или несут side effects — доложи, не выдумывай другой модуль.
- Тест, написанный по фактическому поведению модуля, выявил баг в нём — доложи баг, не чини модуль.

## Maintenance notes

- Все последующие планы используют `npm run test:ci` + `npm run test:functions` как verification gate.
- Когда появятся компонентные тесты — добавить @testing-library в devDependencies (отдельным решением, тут намеренно без новых зависимостей).
- Ревьюеру: проверить, что CI-шаг стоит до bump version — иначе красный прогон всё равно инкрементирует версию.
