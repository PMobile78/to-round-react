# Firebase

To-Round использует Firebase как бэкенд: **Auth** (email/пароль), **Firestore**
(клиентский SDK), **Cloud Functions Gen2** (планировщик уведомлений) и **FCM** (push).

Где взять и как задать конфигурацию — см. [environment.md](environment.md).
Логика уведомлений — в [notifications.md](notifications.md).

## Конфигурация

Конфиг читается **из переменных окружения**, а не хардкодится. `src/utils/config.js`
собирает их в объект, `src/firebase.js` валидирует и инициализирует SDK:

```javascript
// src/firebase.js
import { config, validateConfig } from './utils/config';
if (!validateConfig()) {
  throw new Error('Invalid Firebase configuration. Please check your environment variables.');
}
const app = initializeApp({ /* config.firebase.* */ });
export const db = getFirestore(app);
export const auth = getAuth(app);
```

> Не вписывайте ключи прямо в `src/firebase.js` — конфигурация приходит через `.env`.

## Аутентификация

Метод входа — **email + пароль**. Обёртки в `src/services/authService.js`:

- `createUser(email, password, displayName?)` — регистрация (+ `updateProfile` для имени);
- `loginUser(email, password)` — вход;
- `logoutUser()` — выход (чистит локальные данные пользователя);
- `resetPassword(email, languageCode)` — письмо для сброса пароля на языке интерфейса со ссылкой
  «Continue» обратно в приложение;
- `onAuthStateChange(cb)` — подписка на состояние входа.

`src/App.jsx` подписывается на `onAuthStateChanged` и рендерит `AuthForm` для гостя или
`BubblesPage` для вошедшего пользователя. В Firebase Console включите провайдер
**Email/Password** (Authentication → Sign-in method) и добавьте домен прода `pmobile78.github.io`
в Authentication → Settings → **Authorized domains**: без него Firebase отклонит письмо сброса
пароля с `auth/unauthorized-continue-uri` (`localhost` там есть по умолчанию).

## Модель данных Firestore

Все пользовательские данные изолированы по `uid` владельца.

| Коллекция | Доступ |
|---|---|
| `user-bubbles/{uid}/bubbles/{bubbleId}` | только владелец — **актуальная схема** (субколлекция) |
| `user-bubbles/{uid}`, поле `bubbles[]` | только владелец — **legacy-массив**, серверная логика его не использует |
| `user-tags/{uid}` | только владелец |
| `user-mindmaps/{uid}/{document=**}` | только владелец |
| `user-fcm-tokens/{uid}/tokens/{tokenId}` | только владелец |
| `notification-sent/{key}` | только Cloud Functions (admin SDK); в правилах `if false` |

Серверный планировщик читает задачи **только из субколлекции** (индексный запрос по
collection group) — внутрь legacy-массива `bubbles[]` индексные запросы невозможны, и
серверная логика на него не рассчитывает.

## Правила безопасности

Правила — в [`firestore.rules`](../firestore.rules), путь к ним прописан в
[`firebase.json`](../firebase.json) (`firestore.rules`). Держите их синхронными.

В ветке этапа 0 правила уже описывают формат данных v2
([спецификация](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md), раздел 7);
в прод они выходят вместе с переездом данных:

- `users/{uid}` и подколлекции `tasks`, `categories`, `devices` — только владелец, с проверкой
  формата каждого документа: набор полей, типы, допустимые значения, `schemaVersion == 2`;
- при создании время не может быть из будущего; при каждом изменении `updatedAt` ставит сервер
  (`serverTimestamp()`), а `createdAt` не меняется;
- служебные поля задачи `overdueAt` и `nextNotifyAt` клиенту менять нельзя — их пишет Cloud Functions;
- документ пользователя удалить нельзя;
- старые коллекции `user-bubbles`, `user-tags`, `user-fcm-tokens` — только чтение: они нужны для
  переноса и отката;
- `user-mindmaps` — владелец читает и пишет, как раньше;
- `notification-sent` и все остальные пути закрыты.

> ⚠️ Пока не прошёл переезд (подплан 0.7), из ветки `stage-0-data-contract-v2` не запускайте
> `firebase deploy`: прод-веб v1 пишет в `user-bubbles`, `user-tags` и `user-fcm-tokens`, а эти
> правила закрывают их для записи — изменения перестанут сохраняться. Срочные правки прод-функций
> и индексов деплоятся из `main`. Технически деплой из ветки блокирует
> `scripts/stage0-deploy-guard.js` (predeploy-хук в `firebase.json`); подплан 0.7 его удаляет.

> ⚠️ Не используйте `allow read, write: if true` — это открывает базу всему интернету.
> Коллекция `notification-sent` закрыта для клиента полностью: к ней обращается только
> Cloud Functions через admin SDK, который правила обходит.

### Тесты правил

`npm run test:rules` поднимает эмулятор Firestore (`firebase emulators:exec`, порт 8180, проект
`demo-to-round` без доступа к настоящей базе) и гоняет тесты из `firestore-tests/`. Нужны Java 21+
и Firebase CLI 15+. Тесты переводят общие примеры из `contract/fixtures/` в форму Firestore и
проверяют, что правила принимают каждую правильную запись и отклоняют неправильные. Команда входит
в `npm run test:all` и `npm run verify`.

## FCM (push-токены)

`src/firebaseMessaging.js` запрашивает разрешение на уведомления, получает токен через
`getToken` (с VAPID-ключом и регистрацией service worker) и сохраняет его в
`user-fcm-tokens/{uid}`. Foreground-сообщения показываются через service worker, чтобы
клик открывал нужный URL. VAPID-ключ берётся из `config.firebase.vapidKey`
(см. [environment.md](environment.md)).

## Cloud Functions

Серверная часть (планировщик напоминаний и просрочки, триггер поддержки `nextNotifyAt`,
дедупликация, composite index) описана отдельно — см. [notifications.md](notifications.md).

## Локальный эмулятор

```bash
firebase emulators:start --only functions,firestore
```

Для Firestore-эмулятора нужна Java 21+; порт — 8180 (задан в `firebase.json`). Эмулятор использует те же `firestore.rules` и
`firestore.indexes.json`. Нюансы запуска функций в эмуляторе —
в [notifications.md → Локальный эмулятор](notifications.md#локальный-эмулятор).

### Веб на эмуляторе

```bash
npm run start:emulator
```

Поднимает эмуляторы Auth (порт 9099) и Firestore (8180) для проекта `demo-to-round` и запускает
dev-сервер в режиме `emulator`: Vite берёт `.env.emulator` (демо-значения, в git), а
`src/firebase.js` при `REACT_APP_FIREBASE_EMULATORS=true` подключает SDK к эмуляторам вместо
настоящего проекта. Аккаунт заводится прямо в форме входа и живёт только в эмуляторе; данные
пропадают при остановке (Ctrl+C). Push-уведомления на эмуляторе не работают: у демо-проекта нет
FCM, поэтому устройство регистрируется без токена.
