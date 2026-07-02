# Деплой и версионирование

Фронтенд деплоится на **GitHub Pages** через GitHub Actions **вручную** — кнопкой
«Run workflow» (триггер `workflow_dispatch`). Пуш и PR в `main`/`master` **ничего не
запускают** (ни тестов, ни деплоя): тесты и линт выполняются только внутри деплой-флоу.
Cloud Functions деплоятся отдельно и вручную —
см. [notifications.md → Эксплуатация](notifications.md#эксплуатация).

Workflows: [`.github/workflows/deploy-prod.yml`](../.github/workflows/deploy-prod.yml)
(деплой) вызывает переиспользуемый [`.github/workflows/test.yml`](../.github/workflows/test.yml)
(тесты + линт). Прод: <https://pmobile78.github.io/to-round-react>.

## Однократная настройка

### 1. GitHub Secrets

**Settings → Secrets and variables → Actions → New repository secret.** Добавьте 8 секретов
(значения берутся из конфигурации Firebase, см. [environment.md](environment.md)):

| Secret | Источник |
|---|---|
| `FIREBASE_API_KEY` | Web API key |
| `FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | ID проекта |
| `FIREBASE_STORAGE_BUCKET` | `<project>.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `FIREBASE_APP_ID` | App ID |
| `FIREBASE_MEASUREMENT_ID` | Measurement ID (Analytics) |
| `FIREBASE_VAPID_KEY` | Web Push certificate (VAPID) |

> Это GitHub Secrets, а не файл в репозитории. Из них workflow на лету собирает
> `.env.production`. Не коммитьте реальные значения в документацию или код.

### 2. Включить GitHub Pages

**Settings → Pages → Source: `GitHub Actions`.** Деплой идёт через Pages API
(артефакт), **отдельная ветка `gh-pages` не создаётся**.

## Как работает деплой

Workflow `Deploy Prod` (`.github/workflows/deploy-prod.yml`, только `workflow_dispatch`)
состоит из двух джобов: `test` (вызывает переиспользуемый workflow) и `build-and-deploy`.

### Джоб `test` → переиспользуемый `test.yml`

`deploy-prod.yml` вызывает `uses: ./.github/workflows/test.yml` — переиспользуемый workflow
(`on: workflow_call`) с **двумя параллельными** job (`ubuntu-latest`); в графе Actions они
видны как `test / test` и `test / lint`:

- **`test`** — Checkout + Node 22 (кеш npm) + `npm ci --legacy-peer-deps` (+ зависимости
  `functions/`) → **`npm test`** и **`npm run test:functions --if-present`**.
- **`lint`** — Checkout + Node 22 + `npm ci --legacy-peer-deps` → **`npm run lint`** (eslint).

Оба job read-only (`permissions: contents: read`) и GitHub Pages не трогают.

### Джоб `build-and-deploy` — `needs: test`

Стартует, только если `test` (оба параллельных job) зелёный, т.е. линт и тесты — обязательный
барьер перед выкладкой:

1. **Checkout** + **Setup Node.js 22** + **Install**.
2. **Bump version** — `npm run version:${{ inputs.version_bump }}` (уровень выбирается при запуске:
   `patch` / `minor` / `major`, по умолчанию `patch`), новая версия пишется в output шага.
3. **Commit version bump** — коммит `package.json` с `[skip ci]` и push.
4. **Create `.env.production`** — из GitHub Secrets + `REACT_APP_NAME=To-Round`,
   `REACT_APP_VERSION=<bumped>`, `REACT_APP_ENVIRONMENT=production`.
5. **Build** — `npm run build` (внутри сам генерирует service worker).
6. **Setup Pages → Upload artifact** (`./build`) **→ Deploy**.

### Как запустить деплой

**Actions → workflow «Deploy Prod» → Run workflow → ветка `main` → уровень версии → Run.**
Из терминала: `gh workflow run "Deploy Prod" --ref main -f version_bump=patch`.

> ⚠️ Запускать **только с ветки `main`** (поле «Use workflow from»): окружение `github-pages`
> protection rule разрешает деплой лишь с `main`/`master`; с другой ветки запуск будет отклонён.

## Версионирование

Версия в `package.json` — **единственный источник истины**, схема — [SemVer](https://semver.org/lang/ru/):

- **MAJOR** — несовместимые изменения;
- **MINOR** — новая функциональность с обратной совместимостью;
- **PATCH** — исправления.

При ручном деплое CI инкрементит версию на выбранный при запуске уровень
(`patch`/`minor`/`major`, по умолчанию `patch`) и коммитит результат с `[skip ci]`,
чтобы не зациклить сборку. Версия пробрасывается в приложение через `REACT_APP_VERSION`
(доступна как `config.app.version`).

Локально:

```bash
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

Уровень инкремента при деплое выбирается в форме «Run workflow» (input `version_bump`).
Скрипт инкремента — `scripts/version-bump.js`.

## Ручной деплой (альтернатива)

В `package.json` есть скрипт `npm run deploy` (`gh-pages -d build`) — он собирает проект
и пушит `build/` в ветку `gh-pages` через пакет `gh-pages`. Это **отдельный** путь, не
используемый основным workflow; нужен он только для ручной публикации в обход Actions.

## Устранение неполадок

- **`Missing required Firebase configuration`** — не добавлены/не совпадают имена GitHub Secrets.
- **`ERESOLVE` при установке** — конфликт peer-зависимостей; workflow уже ставит с
  `--legacy-peer-deps`, локально используйте тот же флаг.
- **Service worker не сгенерировался** — проверьте шаг `Generate Service Worker` в логах Actions.
- **На пуш/PR ничего не запускается** — так и задумано: push/PR-триггеры убраны; тесты, линт
  и деплой идут только через ручной `Run workflow` («Deploy Prod»).
- **`Branch ... is not allowed to deploy to github-pages`** — workflow запущен не с `main`/`master`.
  Перезапустите «Run workflow», выбрав ветку `main`.
- **Деплой не запустился вручную** — в **Settings → Pages** источник должен быть `GitHub Actions`;
  смотрите вкладку **Actions**.
