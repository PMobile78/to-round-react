# Аудит проекта interactive-bubbles: безопасность, проблемы кода, рефакторинг

## Контекст

Полный аудит npm-пакета `interactive-bubbles` (v0.0.36, репозиторий `to-round-react`) по трём направлениям: **безопасность**, **баги/риски**, **рефакторинг**. Результат — отчёт с находками и план правок; реализация выполняется отдельным шагом после согласования.

Стек: React (CRA/react-scripts), Firebase (Auth + Firestore клиент + Cloud Functions Gen2 + FCM), Matter.js, MUI, TipTap, i18next. Деплой — GitHub Pages. Архитектура: клиент напрямую читает/пишет Firestore по путям `user-bubbles/{uid}`, `user-tags/{uid}`, `user-fcm-tokens/{uid}` — изоляция между пользователями целиком держится на правилах Firestore.

---

## Часть 1. Безопасность

### S1 ✅ [ВЫСОКИЙ] Правила Firestore отсутствуют в репозитории
- `firebase.json` (строки 1–16) описывает только `functions` и `hosting`. Нет ни `firestore.rules`, ни секции `"firestore"` в `firebase.json`.
- Вся модель доступа клиентская. Если правила в Firebase Console разрешающие (`allow read, write: if true` или истёкший test-mode), **любой пользователь читает и перезаписывает чужие задачи, теги и FCM-токены**.
- **Исправление:** проверить актуальные правила в Firebase Console; добавить `firestore.rules` с моделью «владелец только своих документов»; добавить секцию `"firestore": { "rules": "firestore.rules" }` в `firebase.json`.

```
firestore.rules (минимальный шаблон):
  match /user-bubbles/{uid}/{document=**}  { allow r/w: if request.auth.uid == uid; }
  match /user-tags/{uid}                   { allow r/w: if request.auth.uid == uid; }
  match /user-fcm-tokens/{uid}/{document=**} { allow r/w: if request.auth.uid == uid; }
```

### S2 ✅ [СРЕДНИЙ] Stored XSS через `dangerouslySetInnerHTML` без санитизации
- `src/components/HtmlRenderer.js:62` рендерит `__html: html` напрямую — DOMPurify в проекте отсутствует.
- HTML от TipTap сохраняется в Firestore и рендерится обратно. Изолированно это self-XSS, но:
  - В связке со S1 (слабые правила) → полноценный stored XSS.
  - Через `handleImportJson` (`BubblesPage.js:2332`) — импорт произвольного JSON без валидации полей.
  - Кнопка вставки картинки через `prompt()` в `RichTextEditor.js` и ссылки без валидации схемы (`javascript:` в href).
- **Исправление:** добавить `dompurify`; в `HtmlRenderer.js` заменить `{ __html: html }` на `{ __html: DOMPurify.sanitize(html, { ALLOWED_TAGS: [...], ALLOWED_ATTR: [...] }) }`; в TipTap Link/Image extension ограничить схемы URL.

### S3 ✅ [НИЗКИЙ / гигиена] `.env.production` и `public/sw.js` закоммичены
- `.gitignore` содержит `.env.production.local`, но **не** `.env.production`.
- `public/sw.js` — сборочный артефакт (`scripts/generate-sw.js`), но отслеживается git.
- Важно: ключи в `.env.production` (Firebase web-config + VAPID) публичны по природе — реальной утечки нет, ротация не требуется. Задача — гигиена репозитория.
- **Исправление:** добавить `.env.production` и `public/sw.js` в `.gitignore`; проверить, что в `.env.production` нет приватных значений.

### S4 ✅ [НИЗКИЙ] Сырые сообщения об ошибках Firebase в UI
- `src/services/authService.js:25,37,48,59`: `return { success: false, error: error.message }` — внутренние коды Firebase попадают в UI через `AuthForm.js`.
- **Исправление:** маппить коды ошибок Firebase на локализованные строки (i18next).

### S5 ✅ [НИЗКИЙ] Anonymous-фолбэк в localStorage
- `src/services/firestoreService.js:102,127,182,209,324,345`: `getCurrentUser()?.uid || 'anonymous'` — данные записываются под ключ `bubbles_anonymous` / `tags_anonymous`.
- На общем устройстве это смешивает данные разных пользователей; при logout данные не очищаются.
- **Исправление:** не писать в фолбэк-ключ при отсутствии пользователя; очищать `bubbles_<uid>` / `tags_<uid>` при logout.

---

## Часть 2. Баги и риски

### C1 ✅ [БАГ] Утечка слушателя в `subscribeToBubblesUpdates`
- `src/services/firestoreService.js:352–381`: error-колбэк `onSnapshot` создаёт `unsubLegacy` и делает `return unsubLegacy` — но Firebase SDK **игнорирует** возвращаемое значение из error-колбэка. Внешний вызывающий код получил `unsubscribe`, который уже закрыт; legacy-слушатель живёт вечно.

```
Текущий поток:
  onSnapshot(col, onNext, onError)   ← возвращает unsubscribeA
    onError вызван → unsubLegacy = onSnapshot(legacyRef, ...)
                   → unsubscribeA()       ← закрывает подписку A
                   → return unsubLegacy   ← Firebase игнорирует
  caller.unsubscribe → вызывает unsubscribeA (уже мёртва)
                     → unsubLegacy никогда не вызывается → утечка

Исправление:
  let currentUnsub = null;
  currentUnsub = onSnapshot(col, onNext, (err) => {
      currentUnsub?.();
      currentUnsub = onSnapshot(legacyRef, ...);
  });
  return () => currentUnsub?.();
```

### C2 ✅ [Дублирование / риск потери полей] Тройная сериализация пузыря
- `src/services/firestoreService.js:63–81`, `104–122`, `128–146`: одинаковый набор полей bubble повторяется три раза (нормализованная запись, legacy-фолбэк, localStorage-фолбэк). Новое поле легко забыть в одной из копий → молчаливая потеря данных.
- **Исправление:** вынести `serializeBubble(bubble)` в `firestoreService.js`; использовать во всех трёх местах.

### C3 ✅ [Мелкий / неэффективность] Лишний `find` в `sendFcmToUser`
- `functions/index.js:99–102`: цикл `for (const { id, token } of tokens)` делает `tokens.find(t => t.token === token)` ради `language`, хотя `language` есть в самом элементе.
- **Исправление:** `for (const { id, token, language } of tokens)` — убрать `find`.

### C4 ✅ [Масштабируемость / стоимость] Cloud Function читает все пузыри каждую минуту
- `functions/index.js:17–20,352–356`: `scheduleDueDateNotifications` каждую минуту вызывает `db.collectionGroup('bubbles').get()` — сканирует всю коллекцию. Коллекция `notification-sent` растёт без TTL/очистки.
- **Исправление:** добавить фильтр `where('dueDate', '>=', ...).where('dueDate', '<=', ...)` при чтении; добавить периодическую очистку `notification-sent` (записи старше N дней).

### C5 ✅ [Качество] 68 `console.*` в `src` в продакшене (35 — в BubblesPage)
- Логи включают данные пользователя и ошибки. Попадают в консоль в проде.
- **Исправление:** лёгкая обёртка `src/utils/logger.js`, отключающая все уровни кроме `error` при `REACT_APP_ENVIRONMENT === 'production'`.

### C6 ✅ [Риск] `handleImportJson` без валидации полей + жёсткий reload
- `src/pages/BubblesPage.js:2332–2348`: проверяется только `Array.isArray`, поля пузырей не валидируются — вектор для S2. Завершается `window.location.reload()`.
- **Исправление:** добавить whitelist-валидацию полей (`id`, `title`, `description`, `radius`, `status`, …); заменить `window.location.reload()` на обновление состояния React.

### C7 ✅ [Риск стейл-замыканий] 3 подавления `eslint` exhaustive-deps
- `src/pages/BubblesPage.js:2277,2363,2383` — потенциальные устаревшие замыкания в `useEffect`/`useCallback`.
- **Исправление:** проверить каждое точечно; добавить зависимости или перенести в `useRef`.

---

## Часть 3. Рефакторинг

### R1 ✅ God-component `BubblesPage.js` (3228 строк)
Главный технический долг. Компонент держит физику, фильтры, категории, диалоги, drag FAB, deep-link, импорт/экспорт, поиск, синхронизацию. Разбить по хукам:

| Хук | Что забирает |
|-----|-------------|
| `useMatterEngine` | инициализация/cleanup движка и рендера (один огромный `useEffect`) |
| `useDraggableFab` | `fabPosition`, pointer-обработчики, persist в localStorage |
| `useBubbleFilters` | фильтры/категории/счётчики, `setFilterTags` + `localStorage.setItem` |

Диалоги create/edit/notifications — частично уже компоненты; довести до конца.

### R2 ✅ `RichTextEditor.js` (896 строк)
- Вынести тулбар в `RichTextToolbar`.
- Кастомный drag-resize — в хук `useEditorResize`.
- Конфиг extension-ов — в константу вне компонента.

### R3 ✅ Хелпер persisted-localStorage
- По всему `BubblesPage.js` повторяется `localStorage.getItem/setItem` + `JSON.parse` в try/catch.
- Ввести `src/utils/storage.js` с `lsGet(key, fallback)` / `lsSet(key, value)`.

### R4 ✅ `serializeBubble` в firestoreService
- Устраняет C2; снижает риск потери новых полей.

### R5 ✅ Централизованный логгер
- `src/utils/logger.js` — реализует C5.

---

## Рекомендуемый порядок выполнения

```
Шаг 1 (безопасность)
  S1 → firestore.rules + firebase.json
  S2 → dompurify в HtmlRenderer + TipTap URL-валидация
  S3 → .gitignore для .env.production и public/sw.js
  S4 → маппинг ошибок Firebase
  S5 → убрать anonymous-фолбэк, очистка при logout

Шаг 2 (баги)
  C1 → исправить утечку слушателя
  C2 + R4 → serializeBubble
  C6 → валидация импорта
  C3 → убрать лишний find

Шаг 3 (качество)
  C5 + R5 → logger.js
  C7 → проверить eslint-disable
  R3 → storage.js

Шаг 4 (рефакторинг)
  R1 → декомпозиция BubblesPage по хукам
  R2 → RichTextEditor

Шаг 5 (масштабируемость)
  C4 → оптимизация Cloud Function + TTL
```

---

## Критичные файлы

| Файл | Находки |
|------|---------|
| `firebase.json` | S1 |
| `firestore.rules` (новый) | S1 |
| `.gitignore` | S3 |
| `.env.production` | S3 |
| `public/sw.js` | S3 |
| `src/components/HtmlRenderer.js:62` | S2 |
| `src/components/RichTextEditor.js` | S2, R2 |
| `src/services/authService.js:25,37,48,59` | S4 |
| `src/services/firestoreService.js:63–146,352–381` | C1, C2, S5 |
| `src/pages/BubblesPage.js:2277,2332,2363,2383` | C6, C7, R1 |
| `functions/index.js:17–20,99–102,240–241,352–356` | C3, C4 |

---

## Верификация

- **S1:** написать эмуляторные тесты (`firebase emulators:exec`) — чужой `uid` не может читать/писать; `npm run build` без ошибок.
- **S2:** юнит-тест `HtmlRenderer` с `<img src=x onerror=alert(1)>` и `<a href="javascript:...">` — после санитизации опасные атрибуты/схемы удалены.
- **C1:** мок `onSnapshot` — после вызова внешнего unsubscribe legacy-слушатель не получает события.
- **C2:** добавить поле в `serializeBubble` один раз, убедиться что оно попадает во все три пути сохранения.
- **Регрессия:** `npm test`; ручной прогон — создание/редактирование/удаление пузыря, фильтры, импорт/экспорт, уведомления. UI и физика работают как прежде.
- Каждый шаг — атомарный коммит, независимо проверяемый.
