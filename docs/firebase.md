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
- `resetPassword(email)` — письмо для сброса пароля;
- `onAuthStateChange(cb)` — подписка на состояние входа.

`src/App.js` подписывается на `onAuthStateChanged` и рендерит `AuthForm` для гостя или
`BubblesPage` для вошедшего пользователя. В Firebase Console включите провайдер
**Email/Password** (Authentication → Sign-in method).

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

Модель — **доступ только владельцу + запрет по умолчанию**:

```
match /user-bubbles/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
// аналогично user-tags, user-mindmaps, user-fcm-tokens

match /notification-sent/{document=**} { allow read, write: if false; }
match /{document=**} { allow read, write: if false; }  // default deny
```

> ⚠️ Не используйте `allow read, write: if true` — это открывает базу всему интернету.
> Коллекция `notification-sent` закрыта для клиента полностью: к ней обращается только
> Cloud Functions через admin SDK, который правила обходит.

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

Для Firestore-эмулятора нужна Java. Эмулятор использует те же `firestore.rules` и
`firestore.indexes.json`. Нюансы запуска функций в эмуляторе —
в [notifications.md → Локальный эмулятор](notifications.md#локальный-эмулятор).
