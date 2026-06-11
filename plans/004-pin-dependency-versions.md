# Plan 004: Зафиксировать версии зависимостей вместо `latest`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- package.json package-lock.json`
> При несовпадении «Current state» с живым кодом — STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW–MED
- **Depends on**: 002 (нужен зелёный `npm run test:ci` как gate; если 002 ещё не выполнен — используй `npm run build` как единственный gate)
- **Category**: migration
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Восемь зависимостей указаны как `"latest"`, а `react`/`react-dom` — как `">=16.8.0"`. Пока спасает lockfile с `npm ci`, но любой запуск `npm install` (или потеря lockfile) молча притащит новые major-версии — это и supply-chain-риск, и внезапные breaking changes. Цель: каждый range в `package.json` должен указывать на фактически установленную сегодня версию.

## Current state

`package.json` (фрагменты `dependencies`):

```json
"@emotion/react": "latest",
"@emotion/styled": "latest",
"@mui/icons-material": "latest",
"@mui/material": "latest",
"firebase": "latest",
"i18next": "latest",
"i18next-browser-languagedetector": "latest",
"react": ">=16.8.0",
"react-dom": ">=16.8.0",
"react-i18next": "latest",
```

Фактически установленные версии (проверено по `node_modules/*/package.json` на момент написания плана):

| Пакет | Установлено |
|---|---|
| @emotion/react | 11.14.0 |
| @emotion/styled | 11.14.0 |
| @mui/icons-material | 7.1.2 |
| @mui/material | 7.1.2 |
| firebase | 11.9.1 |
| i18next | 25.2.1 |
| i18next-browser-languagedetector | 8.2.0 |
| react | 19.1.0 |
| react-dom | 19.1.0 |
| react-i18next | 15.5.3 |

Блок `peerDependencies` (`react: ">=16.8.0"`) — рудимент от «компонентного» прошлого пакета; не трогать (см. Out of scope).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Текущая версия пакета | `node -p "require('./node_modules/<pkg>/package.json').version"` | версия из таблицы |
| Sync lockfile | `npm install --legacy-peer-deps` | exit 0 |
| Чистая установка | `npm ci --legacy-peer-deps` | exit 0 |
| Build | `npm run build` | exit 0 |
| Tests (если есть 002) | `CI=true npm run test:ci` | exit 0 |

## Scope

**In scope**: `package.json` (только секция `dependencies`), `package-lock.json` (только следствие `npm install`).

**Out of scope**:
- Обновление какого-либо пакета на новую версию — план фиксирует то, что уже стоит, не апгрейдит.
- `peerDependencies`, `devDependencies`, `functions/package.json`.
- Удаление странных зависимостей (`baseline-browser-mapping`, `caniuse-lite` в dependencies) — заметить, не трогать.

## Git workflow

- Ветка: `advisor/004-pin-versions`. **Не пушить в `main`** (автодеплой).

## Steps

### Step 1: Перепроверить фактические версии

Для каждого пакета из таблицы выполнить `node -p "require('./node_modules/<pkg>/package.json').version"`. Если значение отличается от таблицы — использовать фактическое (таблица могла устареть), зафиксировать отличия в отчёте.

**Verify**: получены 10 версий, ни одна команда не упала.

### Step 2: Заменить ranges в package.json

Каждое `"latest"` и оба `">=16.8.0"` в `dependencies` заменить на caret фактической версии, например `"firebase": "^11.9.1"`, `"react": "^19.1.0"`.

**Verify**: `grep -c '"latest"' package.json` → `0`; `grep -c '">=16.8.0"' package.json` → `1` (остался только peerDependencies-блок).

### Step 3: Синхронизировать lockfile и проверить чистую установку

```
npm install --legacy-peer-deps
git diff --stat package-lock.json
rm -rf node_modules
npm ci --legacy-peer-deps
```

Диф lockfile должен быть небольшим (обновление ranges, без смены resolved-версий основных пакетов).

**Verify**: `npm ci --legacy-peer-deps` → exit 0; `node -p "require('./node_modules/react/package.json').version"` → та же версия, что в шаге 1.

### Step 4: Gate и коммит

`npm run build` → exit 0 (плюс `CI=true npm run test:ci`, если план 002 выполнен). Затем `git add package.json package-lock.json && git commit -m "Pin dependency versions instead of latest"`.

## Test plan

Регрессию ловит сборка + существующие тесты: версии не меняются, меняются только декларации. Новых тестов не требуется.

## Done criteria

- [ ] В `dependencies` нет `"latest"` и `">=16.8.0"`
- [ ] `npm ci --legacy-peer-deps` → exit 0
- [ ] Установленные версии до и после совпадают (react, firebase, @mui/material)
- [ ] `npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 004 → DONE

## STOP conditions

- После шага 3 resolved-версия какого-либо пакета из таблицы **изменилась** — lockfile был рассинхронизирован; остановись и доложи, какую версию притянуло.
- `npm install --legacy-peer-deps` падает с peer-конфликтом, которого не было раньше.

## Maintenance notes

- CLAUDE.md упоминает «MUI v5», фактически стоит MUI 7 — стоит поправить документацию (вне scope, отметить в отчёте).
- Будущие обновления зависимостей теперь делаются явно (`npm install pkg@x`), что и было целью.
- Ревьюеру: убедиться, что diff `package-lock.json` не содержит смены версий, только метаданные range.
