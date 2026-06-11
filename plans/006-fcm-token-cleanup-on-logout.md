# Plan 006: Удалять FCM-токен устройства при logout

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/services/authService.js src/firebaseMessaging.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

При выходе из аккаунта FCM-токен устройства остаётся и в браузере, и в Firestore под старым uid. Если на этом же браузере залогинится другой аккаунт, устройство продолжит получать push-уведомления (с заголовками задач!) **обоих** пользователей — приватность нарушена. Нужно при logout удалять документ токена из `user-fcm-tokens/{uid}/tokens/{token}` и инвалидировать сам токен через `deleteToken(messaging)`.

## Current state

- `src/services/authService.js:58-72` — logout не трогает FCM:
  ```js
  export const logoutUser = async () => {
      try {
          const uid = auth.currentUser?.uid;
          await signOut(auth);
          // Clear user-specific localStorage data after sign-out
          if (uid) {
              localStorage.removeItem(`bubbles_${uid}`);
              localStorage.removeItem(`tags_${uid}`);
          }
          return { success: true };
      } catch (error) { ... }
  };
  ```
- `src/firebaseMessaging.js` — токен сохраняется в `user-fcm-tokens/{uid}/tokens/{token}` (строки 75-89); получение токена: `getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready })` (строка 28); есть guard `isSupported()`. Импортируется из `'firebase/messaging'`: `getMessaging, getToken, onMessage, isSupported` — функции `deleteToken` в импортах пока нет.
- Firestore-правила: владелец может удалять свои документы токенов (owner-only) — **важно удалить документ ДО `signOut`**, после выхода правила запретят запись.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Tests (если есть 002) | `CI=true npm run test:ci` | exit 0 |

## Scope

**In scope**: `src/firebaseMessaging.js` (новая экспортируемая функция), `src/services/authService.js` (вызов в `logoutUser`).

**Out of scope**:
- Серверная чистка токенов (`functions/index.js:104-112` уже удаляет невалидные).
- Сценарий «токен сменился, старый документ осиротел» — отметить в Maintenance, не решать.
- UI выхода.

## Git workflow

- Ветка: `advisor/006-fcm-logout`. **Не пушить в `main`** (автодеплой).

## Steps

### Step 1: Функция removeCurrentToken в firebaseMessaging.js

Добавить в импорт `deleteToken` из `'firebase/messaging'` и экспортировать:

```js
export async function removeCurrentToken() {
    try {
        const supported = await isSupported();
        if (!supported) return;
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

        const currentUser = getAuth().currentUser;
        if (!currentUser) return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });
        if (token) {
            const { deleteDoc } = await import('firebase/firestore');
            await deleteDoc(doc(db, 'user-fcm-tokens', currentUser.uid, 'tokens', token));
        }
        await deleteToken(messaging);
    } catch (e) {
        logger.error('[FCM] remove token on logout error:', e);
    }
}
```

Примечание: вместо dynamic import можно добавить `deleteDoc` в статический импорт `'firebase/firestore'` в шапке файла — выбери статический вариант, он соответствует стилю файла.

**Verify**: `npm run build` → exit 0.

### Step 2: Вызов из logoutUser ДО signOut

В `authService.js`:

```js
import { removeCurrentToken } from '../firebaseMessaging';
...
export const logoutUser = async () => {
    try {
        const uid = auth.currentUser?.uid;
        try { await removeCurrentToken(); } catch (e) { /* logout всё равно продолжается */ }
        await signOut(auth);
        ...
```

Удаление токена не должно блокировать выход — поэтому обёрнуто в try/catch.

**Verify**: `npm run build` → exit 0. Проверить отсутствие циклического импорта: `firebaseMessaging.js` не импортирует `authService` (он использует `getAuth()` напрямую — так и оставить).

### Step 3: Ручная проверка (если есть браузерное окружение)

`npm start` → залогиниться, разрешить уведомления → в Firestore-консоли появился документ токена → выйти → документ исчез. Если окружение headless — отметить в отчёте как непроверенное вручную.

### Step 4: Коммит

`git commit -am "Delete FCM token and its Firestore doc on logout"`

## Test plan

Юнит-тест затруднён (firebase/messaging требует браузерного окружения). Гейт: build + ручной сценарий из шага 3. Если план 002 выполнен — `npm run test:ci` не должен сломаться.

## Done criteria

- [ ] `grep -n 'removeCurrentToken' src/firebaseMessaging.js src/services/authService.js` → определение + вызов
- [ ] Вызов стоит **до** `await signOut(auth)`
- [ ] `npm run build` → exit 0
- [ ] `plans/README.md`: строка плана 006 → DONE

## STOP conditions

- Выдержка `logoutUser` не совпала с живым кодом.
- Обнаружишь, что `firebaseMessaging.js` уже импортирует что-то из `authService.js` (риск цикла) — остановись и доложи.

## Maintenance notes

- Осиротевшие документы старых токенов (токен ротировался браузером) серверная чистка удаляет только при ошибке отправки — допустимо; полная инвентаризация токенов — отдельная задача.
- Ревьюеру: убедиться, что ошибка `removeCurrentToken` не прерывает logout (UX важнее чистки).
