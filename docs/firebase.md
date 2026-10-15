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
- `logoutUser()` — выход: сначала удаляет документ этого устройства (`users/{uid}/devices`),
  потом `signOut`;
- `resetPassword(email, languageCode)` — письмо для сброса пароля на языке интерфейса со ссылкой
  «Continue» обратно в приложение;
- `onAuthStateChange(cb)` — подписка на состояние входа.

`src/App.jsx` подписывается на `onAuthStateChanged` и рендерит `AuthForm` для гостя или
`BubblesPage` для вошедшего пользователя. В Firebase Console включите провайдер
**Email/Password** (Authentication → Sign-in method) и добавьте домен прода `pmobile78.github.io`
в Authentication → Settings → **Authorized domains**: без него Firebase отклонит письмо сброса
пароля с `auth/unauthorized-continue-uri` (`localhost` там есть по умолчанию).

## Модель данных Firestore

Все пользовательские данные изолированы по `uid` владельца. В ветке этапа 0 веб работает
только с форматом v2 ([спецификация](superpowers/specs/2026-10-14-stage-0-data-contract-v2-design.md),
раздел 3); код — в `src/services/data/`.

| Путь | Что лежит | Доступ |
|---|---|---|
| `users/{uid}` | `schemaVersion: 2`, `settings` (все настройки интерфейса), `migration` | только владелец; удалить нельзя |
| `users/{uid}/tasks/{taskId}` | задачи | только владелец |
| `users/{uid}/categories/{categoryId}` | категории | только владелец |
| `users/{uid}/devices/{deviceId}` | устройства (id установки Firebase) | только владелец |
| `user-mindmaps/{uid}/{document=**}` | карты mindmap | только владелец |
| `notification-sent/{key}` | ключи дедупликации | только Cloud Functions (admin SDK); в правилах `if false` |
| `user-bubbles`, `user-tags`, `user-fcm-tokens` | данные v1 | владелец только читает: для переноса (0.6) и отката |

Слой данных создаёт документы с `serverTimestamp()` и меняет их только частичными
обновлениями с `updatedAt: serverTimestamp()`; `setDoc` поверх существующего документа правила
отклоняют. В localStorage остаются только позиция кнопки «+», последняя открытая карта и копия
карт mindmap: настройки, задачи и категории живут в Firestore. При первом входе настройки
этого браузера переносятся в `users/{uid}.settings`, и старые ключи удаляются.

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
`demo-to-round` без доступа к настоящей базе) и гоняет тесты из `firestore-tests/`: правила
(`*.rules.test.js`) и слой данных веба (`*.data.test.js`, в том числе синхронизацию холста
между двумя клиентами, #94). Нужны Java 21+
и Firebase CLI 15+. Тесты переводят общие примеры из `contract/fixtures/` в форму Firestore и
проверяют, что правила принимают каждую правильную запись и отклоняют неправильные. Команда входит
в `npm run test:all` и `npm run verify`.

## FCM и устройства

После каждого входа `src/firebaseMessaging.js` (`registerThisDevice`) запрашивает разрешение на
уведомления, получает токен через `getToken` (с VAPID-ключом и регистрацией service worker) и
записывает это устройство в `users/{uid}/devices/{deviceId}`, где `deviceId` — id установки
Firebase (`getId`). Известному устройству обновляется только токен, новое создаётся с
включённым `notificationsEnabled`; без разрешения токен `null`. При выходе документ устройства
удаляется до `signOut`. Язык напоминаний — `settings.language` пользователя, у устройства его
нет. Foreground-сообщения показываются через service worker, чтобы клик открывал нужный URL
(`?taskId=<id>`; старые ссылки `?bubbleId=` тоже открываются). VAPID-ключ берётся из
`config.firebase.vapidKey` (см. [environment.md](environment.md)).

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
FCM, поэтому устройство регистрируется без токена. Ошибка `Installations: Create Installation
request failed … API key not valid` в консоли ожидаема: id установки SDK выдаёт локально, им
устройство и регистрируется.
