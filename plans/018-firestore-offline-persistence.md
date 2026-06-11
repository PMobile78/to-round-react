# Plan 018: Включить offline-персистентность Firestore для PWA

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/firebase.js`
> При несовпадении выдержки «Current state» с живым кодом — STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED (меняет поведение кэширования данных во всём приложении)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

Приложение — устанавливаемая PWA (manifest + service worker), но Firestore работает только онлайн: без сети установленное приложение показывает пустоту. Firebase SDK умеет персистентный локальный кэш (IndexedDB) из коробки — чтение работает офлайн, записи буферизуются и досылаются при появлении сети. Включение — конфигурация в одном файле. Это самый дешёвый шаг к «настоящему» PWA-опыту на мобиле.

## Current state

`src/firebase.js` (33 строки, файл целиком прочитан):

```js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
...
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
```

- Версия firebase: 11.9.1 (modular SDK; API `initializeFirestore` + `persistentLocalCache` доступен).
- `grep -rn 'enablePersistence|persistentLocalCache|initializeFirestore' src/` → пусто (не включено).
- Приложение уже терпимо к старым данным: подписки `onSnapshot` (`firestoreService.js:326-353`) доставят актуальное при появлении сети.
- Есть собственные localStorage-fallback'и в `firestoreService.js` — они останутся (не конфликтуют: срабатывают только при исключениях).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Tests | `CI=true npm run test:ci` | exit 0 |

## Scope

**In scope**: `src/firebase.js`.

**Out of scope**:
- Offline-кэширование статики через service worker (`scripts/generate-sw.js`) — отдельная тема.
- Конфликт-резолюшн прикладного уровня, индикатор «офлайн» в UI (отметить как follow-up).
- `firestoreService.js` и его localStorage-fallback'и.

## Git workflow

- Ветка: `advisor/018-offline-persistence`. **Не пушить в `main`**.

## Steps

### Step 1: Переключить инициализацию Firestore

В `src/firebase.js`:

```js
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
...
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
```

(`getFirestore` из импорта убрать, если больше не используется.) `persistentMultipleTabManager` важен: приложение реально открывают в нескольких вкладках, single-tab режим вызовет ошибки эксклюзивного владения.

**Verify**: `npm run build` → exit 0; `CI=true npm run test:ci` → exit 0.

### Step 2: Ручная проверка офлайна

`npm start` → залогиниться, дождаться задач → DevTools → Network → Offline → перезагрузить страницу: задачи отображаются из кэша (auth-сессия Firebase тоже персистентна по умолчанию). Создать задачу офлайн → вернуть сеть → задача появилась в Firestore-консоли. Открыть приложение во второй вкладке одновременно — ошибок в консоли нет.

Если окружение headless — отметить шаг как непроверенный и понизить уверенность в отчёте.

### Step 3: Коммит

`git commit -am "Enable Firestore persistent local cache (multi-tab) for offline PWA"`

## Test plan

Гейт: build + существующие тесты + ручной сценарий шага 2 (ключевой). Автотестов офлайн-кэша не пишем.

## Done criteria

- [ ] `grep -n 'persistentLocalCache' src/firebase.js` → 1 совпадение; `getFirestore(app)` больше не используется
- [ ] `npm run build` и `CI=true npm run test:ci` → exit 0
- [ ] Ручной офлайн-сценарий пройден (или явно отмечен невозможным)
- [ ] `plans/README.md`: строка плана 018 → DONE

## STOP conditions

- Установленная версия firebase < 10 (API другой) — проверь `node -p "require('./node_modules/firebase/package.json').version"`.
- В консоли при двух вкладках ошибки persistence — не глуши их, доложи.
- Какой-то код в `src/` вызывает `getFirestore(...)` напрямую помимо `firebase.js` (грep перед правкой: `grep -rn 'getFirestore' src/`) — сначала перечисли такие места.

## Maintenance notes

- Follow-up кандидаты: индикатор офлайн-режима в UI; кэширование app-shell в sw.js (сейчас SW только для FCM).
- Поведение write-конфликтов: last-write-wins на уровне полей — для одного пользователя приемлемо; при появлении шаринга пересмотреть.
- Ревьюеру: убедиться, что localStorage-fallback'и в `firestoreService.js` не задеты — с включённым кэшем они будут срабатывать ещё реже, это ок.
