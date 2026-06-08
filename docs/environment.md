# Переменные окружения

Как настроить конфигурацию приложения для локальной разработки и сборки.
Откуда брать значения Firebase — см. [firebase.md](firebase.md); как они попадают
в прод-сборку через GitHub Secrets — см. [deployment.md](deployment.md).

## Файлы конфигурации

| Файл | Назначение | В git |
|---|---|---|
| `.env` | Локальная разработка | нет (в `.gitignore`) |
| `.env.production` | Прод-сборка; в CI создаётся из GitHub Secrets | нет |
| `.env.example` | Шаблон с заглушками для новых разработчиков | да |

## Быстрый старт

```bash
cp .env.example .env   # заполните реальными значениями
npm start
```

## Переменные

Все переменные фронтенда должны иметь префикс `REACT_APP_` — иначе CRA их не пробросит.

### Firebase

| Переменная | Обязательна | Назначение |
|---|---|---|
| `REACT_APP_FIREBASE_API_KEY` | да | Web API key проекта |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | да | Домен аутентификации |
| `REACT_APP_FIREBASE_PROJECT_ID` | да | ID проекта |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | да | Storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | да | Sender ID для FCM |
| `REACT_APP_FIREBASE_APP_ID` | да | ID веб-приложения |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | нет | Google Analytics (опционально) |
| `REACT_APP_FIREBASE_VAPID_KEY` | нет* | Ключ для web-push (FCM) |

\* `validateConfig` не требует `vapidKey`, но без него **не работают push-уведомления** —
`getToken` в `src/firebaseMessaging.js` использует именно его.

### Приложение

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `REACT_APP_NAME` | `To-Round` | Имя приложения |
| `REACT_APP_VERSION` | версия из `package.json` | Версия (в проде проставляется CI) |
| `REACT_APP_ENVIRONMENT` | `development` | Имя окружения |

## Как получить значения Firebase

1. Откройте [Firebase Console](https://console.firebase.google.com/) → ваш проект.
2. **Project Settings** (⚙️) → раздел **Your apps** → веб-приложение → блок **SDK setup and configuration**.
3. Перенесите поля конфигурации в соответствующие `REACT_APP_FIREBASE_*`.

**VAPID key** (для push): **Project Settings** → вкладка **Cloud Messaging** →
**Web configuration** → **Web Push certificates** → пара ключей.

## Конфигурация и валидация в коде

Переменные собираются в один объект в `src/utils/config.js`:

```javascript
import { config, validateConfig } from './utils/config';
config.firebase.apiKey   // и т.д.
config.app.name          // 'To-Round' по умолчанию
```

При старте `src/firebase.js` вызывает `validateConfig()`; если отсутствует любой из
обязательных ключей (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
`messagingSenderId`, `appId`), приложение падает с понятной ошибкой в консоли.

## Service worker

`public/sw.js` **генерируется** из переменных окружения скриптом
`scripts/generate-sw.js`. Он встроен в `npm start` и `npm run build`, отдельно его
можно прогнать через `npm run generate-sw`. Не редактируйте `public/sw.js` вручную —
изменения перезапишутся при следующей сборке.

## Безопасность

- `.env`-файлы не коммитятся (`.gitignore`).
- Любая переменная `REACT_APP_*` **попадает в браузерный бандл** — это нормально для
  web-конфигурации Firebase (она и так публична), но не кладите туда настоящие секреты.
- Серверные секреты держите в Cloud Functions, а не во фронтенде.
