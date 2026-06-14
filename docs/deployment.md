# Деплой и версионирование

Фронтенд деплоится на **GitHub Pages** через GitHub Actions **вручную** — кнопкой
«Run workflow» (триггер `workflow_dispatch`). Пуш и PR в `main`/`master` деплой **не**
запускают, а только прогоняют тесты. Cloud Functions деплоятся отдельно и вручную —
см. [notifications.md → Эксплуатация](notifications.md#эксплуатация).

Workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
Прод: <https://pmobile78.github.io/to-round-react>.

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

Workflow `CI & Deploy` состоит из **двух** job (`ubuntu-latest`):

### Job `test` — на пуш/PR в `main`/`master` и при ручном запуске

1. **Checkout** + **Setup Node.js 22** с кешем npm.
2. **Install** — `npm ci --legacy-peer-deps --prefer-offline --no-audit` (+ зависимости `functions/`).
3. **Run tests** — `npm test` и `npm run test:functions --if-present`.

Этот job **не трогает GitHub Pages**, поэтому пуши и PR не дёргают защищённое окружение
`github-pages` и не падают на его protection rule.

### Job `deploy` — только ручной запуск (`workflow_dispatch`)

Запускается с условием `needs: test` (тесты должны пройти) и `if: github.event_name == 'workflow_dispatch'`:

1. **Checkout** + **Setup Node.js 22** + **Install**.
2. **Bump version** — `npm run version:${{ inputs.version_bump }}` (уровень выбирается при запуске:
   `patch` / `minor` / `major`, по умолчанию `patch`), новая версия пишется в output шага.
3. **Commit version bump** — коммит `package.json` с `[skip ci]` и push.
4. **Create `.env.production`** — из GitHub Secrets + `REACT_APP_NAME=To-Round`,
   `REACT_APP_VERSION=<bumped>`, `REACT_APP_ENVIRONMENT=production`.
5. **Build** — `npm run build` (внутри сам генерирует service worker).
6. **Setup Pages → Upload artifact** (`./build`) **→ Deploy**.

### Как запустить деплой

**Actions → workflow «CI & Deploy» → Run workflow → ветка `main` → уровень версии → Run.**
Из терминала: `gh workflow run "CI & Deploy" --ref main -f version_bump=patch`.

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
- **Деплой не запускается на пуш** — так и задумано: деплой только ручной (`Run workflow`).
  На пуш/PR работает лишь job `test`.
- **`Branch ... is not allowed to deploy to github-pages`** — workflow запущен не с `main`/`master`.
  Перезапустите «Run workflow», выбрав ветку `main`.
- **Деплой не запустился вручную** — в **Settings → Pages** источник должен быть `GitHub Actions`;
  смотрите вкладку **Actions**.
