# Деплой и версионирование

Фронтенд автоматически деплоится на **GitHub Pages** через GitHub Actions при пуше
в `main`/`master`. Cloud Functions деплоятся отдельно и вручную —
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

При каждом пуше/PR в `main`/`master` запускается job `build-and-deploy` (`ubuntu-latest`):

1. **Checkout** репозитория.
2. **Setup Node.js 18** с кешем npm.
3. **Install** — `npm ci --legacy-peer-deps --prefer-offline --no-audit`.
4. **Bump version** — `npm run version:patch`, новая версия пишется в output шага.
5. **Commit version bump** — коммит `package.json` с `[skip ci]` и push *(только для `main`/`master`)*.
6. **Create `.env.production`** — из GitHub Secrets + `REACT_APP_NAME=To-Round`,
   `REACT_APP_VERSION=<bumped>`, `REACT_APP_ENVIRONMENT=production`.
7. **Generate Service Worker** — `npm run generate-sw`.
8. **Build** — `npm run build`.
9. **Setup Pages → Upload artifact** (`./build`) **→ Deploy** *(деплой только для `main`/`master`)*.

Пуш-реквесты проходят шаги сборки, но не коммитят версию и не деплоят.

## Версионирование

Версия в `package.json` — **единственный источник истины**, схема — [SemVer](https://semver.org/lang/ru/):

- **MAJOR** — несовместимые изменения;
- **MINOR** — новая функциональность с обратной совместимостью;
- **PATCH** — исправления.

При каждом деплое CI инкрементит **patch** (шаг 4) и коммитит результат с `[skip ci]`,
чтобы не зациклить сборку. Версия пробрасывается в приложение через `REACT_APP_VERSION`
(доступна как `config.app.version`).

Локально:

```bash
npm run version:patch   # 1.0.0 → 1.0.1
npm run version:minor   # 1.0.0 → 1.1.0
npm run version:major   # 1.0.0 → 2.0.0
```

Чтобы CI инкрементил не patch, замените `npm run version:patch` в `deploy.yml`.
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
- **Деплой не запустился** — ветка должна быть `main`/`master`; в **Settings → Pages**
  источник — `GitHub Actions`; смотрите вкладку **Actions**.
