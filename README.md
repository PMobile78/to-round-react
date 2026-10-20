# ToDo-Round

Интерактивный менеджер задач: задачи живут как «пузырьки» на физическом холсте,
с дедлайнами, напоминаниями, повторами и push-уведомлениями. Фронтенд на React,
данные и уведомления — на Firebase.

**Прод:** <https://pmobile78.github.io/to-round-react>

## Возможности

- **Холст с физикой** (Matter.js) — задачи как пузырьки, перетаскивание, пульсация по сроку.
- **Описания в Markdown** — визуальный редактор TipTap: жирный, курсив, списки, чек-листы, ссылки.
- **Теги / категории**, фильтры и поиск по задачам.
- **Сроки, напоминания и повторы** — срок во времени устройства, напоминания за часы, дни или
  недели, повтор каждые N часов, дней, недель или месяцев; «Готово» переносит повторяющуюся задачу
  на следующий раз, «Завершить серию» закрывает её.
- **Push-уведомления** (FCM) — reminder заранее и overdue по сроку, через Cloud Functions;
  на каждом устройстве — переключатель «Напоминания на этом устройстве».
- **Резервная копия** — экспорт всех данных в файл и импорт (файлы новой и старой версии) из
  главного меню; при первом входе новой версии данные старой переносятся с предпросмотром.
- **Mind maps** (@xyflow/react + mind-elixir).
- **i18n** — English и Українська; тёмная/светлая тема.
- **Синхронизация** между устройствами через Firebase Auth (email/пароль) + Firestore.

## Стек

React (Vite 8) · Firebase (Auth, Firestore, Cloud Functions Gen2, FCM) ·
Matter.js · MUI v7 · TipTap + @tiptap/markdown · i18next · date-fns · DOMPurify ·
@xyflow/react + mind-elixir + dagre (mind maps).

## Быстрый старт

Требуется Node 24.12+ (этого требует Firebase JS SDK 13; CI собирает на Node 24; Cloud Functions — на Node 22).

```bash
npm ci --legacy-peer-deps      # из-за peer-конфликтов всегда с этим флагом
cp .env.example .env           # затем заполните Firebase-конфигурацию
npm start                      # генерирует service worker и поднимает dev-сервер
```

Приложение откроется на <http://localhost:3000>. Где взять значения для `.env` —
см. [docs/environment.md](docs/environment.md) и [docs/firebase.md](docs/firebase.md).

## Структура проекта

```
index.html              # корневая точка входа Vite
src/
  index.jsx              # точка входа React DOM
  App.jsx                # корень: слушатель Firebase Auth → AuthForm | BubblesPage
  firebase.js            # инициализация Firebase SDK (конфиг из utils/config.js)
  firebaseMessaging.js   # FCM: разрешение, токен, это устройство в users/{uid}/devices
  i18n.js                # инициализация i18next (en + uk)
  pages/                 # BubblesPage.jsx (главный экран), MindMapPage.jsx
  services/              # authService, mindmapService, data/ (слой данных v2: users/{uid}/…)
  state/                 # хранилища интерфейса и настроек пользователя
  hooks/                 # useMatterEngine, useBubbleFilters, useThemeMode, …
  components/            # React-компоненты (.jsx): диалоги, drawer-ы, редакторы, селекторы
  locales/en|uk/         # translation.json
  utils/                 # config, logger, storage, physicsUtils, reorderArray
scripts/                 # generate-sw.js, version-bump.js
functions/               # Cloud Functions Gen2 (планировщик уведомлений)
public/                  # сгенерированный sw.js, иконки, манифест
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

Деплой запускается только вручную: **Actions → Deploy Prod → Run workflow**
(`workflow_dispatch`). Пуши и PR в `main`/`master` не запускают ни тесты, ни деплой.
Подробности и список GitHub Secrets — в [docs/deployment.md](docs/deployment.md).

## Тесты

```bash
npm test                          # тесты фронтенда (vitest)
npm run test:functions             # unit-тесты чистых функций планировщика
```

## Лицензия

MIT.
