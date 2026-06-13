# Change Password Dialog — Design Spec

## Context

Сейчас в `src/services/authService.js` есть только `resetPassword` (email-ссылка через `sendPasswordResetEmail`). Нет смены пароля **внутри приложения** для залогиненного пользователя (email/password). Эта спека описывает визуальный и функциональный дизайн окна «Сменить пароль». Связанная задача — GitHub issue #9.

Провайдер — Firebase Auth (email/password). `updatePassword` требует свежей сессии, поэтому перед сменой обязательна реаутентификация (`reauthenticateWithCredential`). Firebase ограничивает только минимум 6 символов; индикатор силы — исключительно советующий.

## Goals / Non-goals

**В охвате:**
- Окно `ChangePasswordDialog` для смены пароля залогиненного пользователя.
- Сервисный метод `changePassword(currentPassword, newPassword)` с реаутентификацией.
- Пункт входа «Сменить пароль» в `MainMenuDrawer`.
- i18n (en/uk).

**Вне охвата:**
- Сброс пароля по email (уже есть — `resetPassword`).
- Смена пароля для OAuth-провайдеров (приложение использует email/password).
- Общий механизм snackbar/toast (в проекте отсутствует и не вводится ради этой формы).
- Политика сложности пароля сверх Firebase-минимума (индикатор не блокирует сохранение).

## UX Design

Окно — MUI `Dialog` по паттерну `FontSettingsDialog`/`AppearanceDialog`:
- `maxWidth="sm"`, `fullWidth`, `fullScreen` на маленьком экране;
- `PaperProps.sx` = `{ borderRadius, ...getDialogPaperStyles() }` — фон/скин из темы, без хардкода;
- `DialogTitle` с текстом «Сменить пароль» (`color: 'text.primary'`) и `IconButton` с `CloseOutlined`.

### Состояние 1 — форма

Три поля (`TextField type="password"`), сверху вниз:
1. **Текущий пароль** — с кнопкой-глазом (показать/скрыть).
2. **Новый пароль** — с кнопкой-глазом; под полем **индикатор силы**: одна полоса (`LinearProgress` или Box-полоса) + ярлык «Слабый / Средний / Сильный». Цвета берутся из палитры темы (error / warning / success), чтобы корректно отображаться во всех скинах. Индикатор только информирует — не блокирует.
3. **Повторите новый пароль** — с проверкой совпадения.

`DialogActions`: «Отмена» (закрывает окно) и «Сохранить» (primary).

### Валидация (живая, вариант B)

- Проверки запускаются после первого касания (blur/изменение) каждого поля, не на пустой нетронутой форме.
- Клиентские правила:
  - новый пароль ≥ 6 символов;
  - новый пароль ≠ текущему;
  - повтор совпадает с новым.
- Кнопка **«Сохранить» неактивна**, пока форма невалидна (все три правила выполнены + поля непустые).
- Ошибки — красный `helperText` под соответствующим полем + `error`-рамка.

### Серверные ошибки

- `auth/wrong-password` (неверный текущий) → `helperText` под полем «Текущий пароль».
- `auth/requires-recent-login`, `auth/network-request-failed`, прочее → строка-алерт (`Alert severity="error"` или окрашенный `Typography`) над `DialogActions`.

### Состояние 2 — загрузка

При нажатии «Сохранить»: спиннер (`CircularProgress`) внутри кнопки, кнопка и поля `disabled` на время запроса (реаутентификация + `updatePassword`).

### Состояние 3 — успех

Тело окна заменяется экраном успеха: крупная зелёная галочка (`CheckCircleOutline`, цвет `success.main`), заголовок «Пароль изменён», подпись «Используйте новый пароль при следующем входе», кнопка **«Готово»** (закрывает окно). Без snackbar и без автозакрытия — закрытие по клику.

При закрытии окна (крестик/Отмена/Готово) внутреннее состояние формы сбрасывается.

## Architecture

### Сервис — `src/services/authService.js`

Новый метод:

```js
export const changePassword = async (currentPassword, newPassword) => {
  // EmailAuthProvider.credential(user.email, currentPassword)
  // await reauthenticateWithCredential(user, credential)
  // await updatePassword(user, newPassword)
  // return { success, error } через mapFirebaseError
};
```

- Импортировать `EmailAuthProvider`, `reauthenticateWithCredential`, `updatePassword` из `firebase/auth`.
- Возврат в общем стиле: `{ success: true }` или `{ success: false, error }`.
- Дополнить `firebaseErrorMessages` ключом `auth/requires-recent-login` (`auth/wrong-password`, `auth/weak-password` уже есть).

### Компонент — `src/components/ChangePasswordDialog.jsx`

Пропсы (по образцу `FontSettingsDialog`):
`open`, `onClose`, `isSmallScreen`, `isMobile`, `getDialogPaperStyles`.

Внутреннее состояние: значения трёх полей, флаги «touched» для каждого, флаги видимости (show/hide) для текущего и нового, `phase` (`'form' | 'loading' | 'success'`), серверная ошибка.

Сила пароля — чистая функция (длина + наличие цифр/букв/регистра → 0–3 → ярлык/цвет). Держать локально в файле компонента (один потребитель — YAGNI).

### Точка входа — `src/components/MainMenuDrawer.jsx`

Пункт «Сменить пароль» → проп `onOpenChangePasswordDialog`. Состояние диалога (`open`) и проп `getDialogPaperStyles` живут в `BubblesPage` — как для `FontSettingsDialog`/`AppearanceDialog`.

### i18n — `src/locales/en/*`, `src/locales/uk/*`

Ключи: заголовок, лейблы трёх полей, ярлыки силы (Слабый/Средний/Сильный), тексты ошибок (несовпадение, мин. длина, новый = текущему, неверный текущий, общая ошибка), экран успеха (заголовок + подпись), кнопки (Отмена/Сохранить/Готово), пункт меню.

## Data Flow

1. Пользователь открывает окно из `MainMenuDrawer`.
2. Вводит поля → живая клиентская валидация управляет состоянием «Сохранить».
3. «Сохранить» → `phase='loading'` → `changePassword(...)`.
4. Успех → `phase='success'` (экран с галочкой). Ошибка → `phase='form'` + сообщение под полем/в алерте.
5. «Готово»/крестик/Отмена → `onClose`, сброс состояния.

## Error Handling

| Ситуация | Сообщение | Куда |
|---|---|---|
| Повтор ≠ новый | «Пароли не совпадают» | helperText (повтор) |
| Новый < 6 | «Минимум 6 символов» | helperText (новый) |
| Новый = текущему | «Новый пароль совпадает с текущим» | helperText (новый) |
| `auth/wrong-password` | «Неверный текущий пароль» | helperText (текущий) |
| `auth/requires-recent-login` | «Войдите заново и повторите» | алерт над кнопками |
| сеть / прочее | общая ошибка | алерт над кнопками |

## Testing

- Юнит: функция оценки силы пароля (граничные случаи длины/состава).
- Юнит/интеграция сервиса: `changePassword` мокает Firebase — успех; `wrong-password`; `requires-recent-login`.
- Компонент (по возможности): кнопка «Сохранить» неактивна при невалидной форме; helperText появляется после касания; переход к экрану успеха.
- Визуально (chrome-devtools): форма/загрузка/успех × light/dark × desktop/mobile; цвета индикатора и ошибок корректны в разных скинах.

## Critical files

- `src/services/authService.js` — `changePassword`, доп. error-ключ.
- `src/components/ChangePasswordDialog.jsx` — **новое**, окно.
- `src/components/MainMenuDrawer.jsx` — пункт меню.
- `src/pages/BubblesPage.jsx` — состояние диалога + рендер.
- `src/locales/en/*`, `src/locales/uk/*` — i18n.

## Reuse

- Паттерн диалога: `FontSettingsDialog.jsx` + `getDialogPaperStyles` (`BubblesPage` ~377) + проброс `onOpen...` в `MainMenuDrawer`.
- Маппинг ошибок: `mapFirebaseError` / `firebaseErrorMessages` в `authService.js`.
- Стилевая дисциплина темы (CLAUDE.md): фон из `getDialogPaperStyles`, текст заголовка `text.primary`, цвета из палитры.
