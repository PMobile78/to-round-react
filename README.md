# To-Round

Интерактивный менеджер задач: задачи живут как «пузырьки» на физическом холсте,
с дедлайнами, напоминаниями, повторами и push-уведомлениями. Фронтенд на React,
данные и уведомления — на Firebase.

**Прод:** <https://pmobile78.github.io/to-round-react>

## Возможности

- **Холст с физикой** (Matter.js) — задачи как пузырьки, перетаскивание, пульсация по сроку.
- **Rich-text описания** (TipTap), безопасный рендер через DOMPurify.
- **Теги / категории**, фильтры и поиск по задачам.
- **Дедлайны, напоминания и повторы** — `dueDate`, «Remind me», «Repeat every».
- **Push-уведомления** (FCM) — reminder заранее и overdue по сроку, через Cloud Functions.
- **Mind maps** (@xyflow/react + mind-elixir).
- **i18n** — English и Українська; тёмная/светлая тема.
- **Синхронизация** между устройствами через Firebase Auth (email/пароль) + Firestore.

## Стек

React (CRA / react-scripts) · Firebase (Auth, Firestore, Cloud Functions Gen2, FCM) ·
Matter.js · MUI v5 · TipTap · i18next · date-fns · DOMPurify ·
@xyflow/react + mind-elixir + dagre (mind maps).

## Быстрый старт

Требуется Node 18+ (CI собирает на Node 18; Cloud Functions — на Node 22).

```bash
npm ci --legacy-peer-deps      # из-за peer-конфликтов всегда с этим флагом
cp .env.example .env           # затем заполните Firebase-конфигурацию
npm start                      # генерирует service worker и поднимает dev-сервер
```

Приложение откроется на <http://localhost:3000>. Где взять значения для `.env` —
см. [docs/environment.md](docs/environment.md) и [docs/firebase.md](docs/firebase.md).

## Структура проекта

```
src/
  App.js                 # корень: слушатель Firebase Auth → AuthForm | BubblesPage
  firebase.js            # инициализация Firebase SDK (конфиг из utils/config.js)
  firebaseMessaging.js   # FCM: запрос разрешения, токен, foreground-обработчик
  i18n.js                # инициализация i18next (en + uk)
  pages/                 # BubblesPage.js (главный экран), MindMapPage.js
  services/              # authService, firestoreService, mindmapService
  hooks/                 # useMatterEngine, useBubbleFilters, useThemeMode, …
  components/            # диалоги, drawer-ы, редакторы, селекторы
  locales/en|uk/         # translation.json
  utils/                 # config, logger, storage, physicsUtils, reorderArray
scripts/                 # generate-sw.js, version-bump.js
functions/               # Cloud Functions Gen2 (планировщик уведомлений)
public/                  # index.html, сгенерированный sw.js, иконки, манифест
```

## Документация

| Документ | О чём |
|---|---|
| [docs/environment.md](docs/environment.md) | Переменные окружения и локальная конфигурация |
| [docs/firebase.md](docs/firebase.md) | Архитектура Firebase: Auth, модель данных Firestore, правила |
| [docs/notifications.md](docs/notifications.md) | Дедлайны, напоминания, повторы и push-уведомления (клиент + сервер) |
| [docs/deployment.md](docs/deployment.md) | Деплой на GitHub Pages и управление версиями |
| [docs/i18n.md](docs/i18n.md) | Интернационализация (i18next) |
| [docs/favicon.md](docs/favicon.md) | Иконки и web-манифест |

Указания для агентов (Claude Code) — в [CLAUDE.md](CLAUDE.md).

## Деплой

Пуш в `main`/`master` запускает GitHub Actions, который собирает приложение и
публикует его на GitHub Pages. Подробности и список GitHub Secrets —
в [docs/deployment.md](docs/deployment.md).

## Тесты

```bash
npm test                          # тесты фронтенда (react-scripts)
node functions/test-next-notify.js  # unit-тесты чистых функций планировщика
```

## Лицензия

MIT.
