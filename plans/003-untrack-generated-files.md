# Plan 003: Убрать `.env.production` и `public/sw.js` из git-отслеживания

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- .gitignore`
> Затем `git ls-files | grep -E '^\.env\.production$|^public/sw\.js$'` — если
> вывод пуст, план уже выполнен кем-то другим: пометь его DONE и остановись.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/19
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

Оба файла перечислены в `.gitignore` (`public/sw.js` — строка 9, `.env.production` — строка 17), но уже были добавлены в индекс раньше, а gitignore не действует на отслеживаемые файлы. CI генерирует оба файла заново из GitHub Secrets на каждый деплой (`deploy.yml`, шаги «Create .env.production» и «Generate Service Worker»), то есть в репозитории лежат устаревшие копии с Firebase-конфигурацией и VAPID-ключом. Утечки секретов как таковой нет — web-ключи Firebase публичны по дизайну и ротация не требуется, — но это нарушает политику проекта (CLAUDE.md: «do not commit real credentials») и провоцирует конфликт при каждом локальном `npm start` (который перегенерирует `sw.js`).

## Current state

- `git ls-files` содержит `.env.production` и `public/sw.js`.
- `.gitignore:9` → `public/sw.js`; `.gitignore:17` → `.env.production` — менять gitignore не нужно.
- `scripts/generate-sw.js` генерирует `public/sw.js` из env-переменных; вызывается из `npm start` и `npm run build` автоматически.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Проверка отслеживания | `git ls-files \| grep -E '^\.env\.production$\|^public/sw\.js$'` | до: 2 строки; после: пусто |
| Сборка | `npm run build` | exit 0 |

## Scope

**In scope**: только git-индекс (команда `git rm --cached`). Содержимое файлов на диске не менять и не удалять.

**Out of scope**:
- Переписывание git-истории (filter-repo/BFG) — не требуется, ключи публичны по дизайну.
- `.env.example` — он namеренно отслеживается.
- Любые изменения `.gitignore`, `scripts/generate-sw.js`, workflow.

## Git workflow

- Ветка: `advisor/003-untrack-generated`. **Не пушить в `main`** (автодеплой).

## Steps

### Step 1: Убрать из индекса, оставив файлы на диске

```
git rm --cached .env.production public/sw.js
git commit -m "Stop tracking generated .env.production and public/sw.js"
```

**Verify**: `git ls-files | grep -E '^\.env\.production$|^public/sw\.js$'` → пусто; `ls .env.production public/sw.js` → оба файла существуют на диске.

### Step 2: Убедиться, что сборка не зависит от отслеживаемости

`npm run build` (предварительно `npm ci --legacy-peer-deps`, если node_modules нет).

**Verify**: exit 0; `public/sw.js` перегенерирован (mtime обновился).

## Test plan

Не требуется — изменение не касается кода. Проверка: build зелёный, `git status` показывает оба файла как untracked+ignored (то есть не показывает их вовсе).

## Done criteria

- [ ] `git ls-files | grep -E '^\.env\.production$|^public/sw\.js$'` → пусто
- [ ] Оба файла существуют на диске
- [ ] `npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 003 → DONE

## STOP conditions

- `git rm --cached` сообщает, что файла нет в индексе (план уже выполнен) — пометь DONE, доложи.
- Обнаружишь в `.env.production` что-то кроме `REACT_APP_FIREBASE_*` / `REACT_APP_NAME|VERSION|ENVIRONMENT` (например, приватные ключи серверных сервисов) — остановись и доложи: тогда нужна ротация и, возможно, чистка истории.

## Maintenance notes

- После merge у других клонов файлы исчезнут из индекса, но останутся в рабочих копиях — это ожидаемо.
- Ревьюеру: диff должен состоять ровно из двух удалений в индексе, ноль изменений содержимого.
