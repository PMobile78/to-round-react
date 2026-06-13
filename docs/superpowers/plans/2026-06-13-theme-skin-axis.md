# Theme/Skin Axis ("Appearance") — Implementation Plan

## Context

Сейчас облик приложения зашит как единственный (после редизайна — «modern minimal»). Пользователь хочет **выбор оформления**: помимо существующей оси светлая/тёмная — вторую, ортогональную ось `design` (скин), переключаемую в отдельном окне «Оформление», совмещающем режим (свет/тьма/системная) и выбор скина.

Скины этого плана (лэйаут не меняется — это именно скины поверх текущего экрана-пузырей):
- **Classic** — прежний облик (Roboto, `#3B7DED`, резкие формы) — восстанавливается из git.
- **Modern** — текущий редизайн (Inter, `#2f6bdb`, мягкий) — уже в коде, становится одним из вариантов.
- **Aurora Glass** — тёмное стекло, неон, анимированный фон, свечение пузырей.
- **Neo-Brutalist** — толстые рамки, жёсткие офсет-тени, сетка-точки, кричащие цвета.
- **Clay Pastel** — неоморфные пастельные пузыри, мягкие тени.

Результат: одно переключение `design` меняет всё через объект MUI-темы (идиоматичный для MUI способ). Дашборд design-3 и Swiss-сплит — **вне охвата** (это другие лэйауты, не скины).

Ветка: продолжаем на `redesign/modern-minimal` (она несёт скин Modern). **Не пушить в `main`** (push = деплой).

## Architecture

Две ортогональные оси: `themeMode` (light/dark/system — есть) × `design` (5 скинов — новое). `useThemeMode` управляет обеими; `createAppTheme(mode, design)` возвращает MUI-тему для комбинации.

Ключевой принцип: **дизайн-специфику, сейчас захардкоженную в коде по `themeMode`, переносим в `theme.custom`-токены**, и код читает их через `useTheme()`. Тогда переключатель `design` «течёт» всюду через тему.

**`theme.custom` контракт** (каждый скин заполняет для текущего mode):
```
custom: {
  design: 'modern',
  bubble: {
    strokeWidth, highlightStrokeWidth, defaultStroke,
    fill: { tagAlpha, defaultFill },        // заливка (через withAlpha)
    effect: 'none'|'glow'|'hardShadow'|'clay',  // доп. отрисовка на canvas
    effectParams,                            // цвет/смещение/блюр для afterRender
    label: { weight, color, shadow },
  },
  canvasBackground,                          // строка под текущий mode
  headerStrip: { show, sx },
  backdrop: 'none'|'aurora'|'dots',          // декоративный слой
  buttonStyles, outlinedButtonStyles, dialogPaper,  // для хелперов BubblesPage
}
```

**Реестр скинов**: новая папка `src/theme/designs/` — по модулю на скин (`classic.js`, `modern.js`, `aurora.js`, `brutalist.js`, `clay.js`) + `index.js` (список + метаданные: id, label-key, превью-цвета). Каждый модуль экспортирует функцию `(mode) => ({ palette, typography, shape, shadows, components, custom })`. `useThemeMode` импортирует реестр; `createAppTheme(mode, design)` берёт нужный модуль и собирает `createTheme(...)`.

**Декоративные слои** (анимированные «авроры», сетка-точки) — компонент `<DesignBackdrop>` за canvas, выбор по `theme.custom.backdrop`; CSS-кейфреймы в новом стайлшите. (Живой backdrop-blur самих пузырей на canvas невозможен — Aurora использует свечение-аппроксимацию.)

**Эффекты пузырей сверх fill/stroke** (свечение, жёсткая тень, clay-градиент) — хук `afterRender` на Matter-рендере, читает `theme.custom.bubble.effect` и рисует через Canvas 2D (`shadowBlur`/`shadowColor`/градиенты).

**Шрифты** через `@fontsource`: Inter (есть), Sora (aurora), Space Grotesk + Archivo (brutalist), Nunito (clay).

**Окно «Оформление»** — новый `AppearanceDialog` (сегмент режима свет/тьма/системная + карточки скинов с мини-превью). Открывается из `MainMenuDrawer` (пункт «Оформление», заменяет встроенный ряд `ThemeToggle`). `useThemeMode` получает `setThemeMode` (прямой выбор режима) и `setDesign`. Пропсы тянутся `App → BubblesPage → MainMenuDrawer → AppearanceDialog` по образцу `onOpenFontSettingsDialog` + `getDialogPaperStyles`. `AuthForm` (до логина) сохраняет простой `ThemeToggle`.

## Tasks (фазово; каждый скин — отдельная задача, чтобы был ревьюабелен/шиппабелен)

**Task 1 — Инфраструктура темы.** Рефактор `useThemeMode.js`: добавить состояние `design` (+ персист `localStorage 'app-design'`), `setThemeMode`, `setDesign`, экспорт реестра `designs`; `createAppTheme(mode, design)`. Создать `src/theme/designs/{index,classic,modern}.js`. Modern = текущие значения темы. Classic = восстановить из git: тема — состояние `src/hooks/useThemeMode.js` на коммите `09dd4d8`; код-значения — из состояния BubblesPage/useMatterEngine до коммитов `3a92690`/`ce36a0b`. Каркас `theme.custom` для обоих. Verify: `npm run build`, тема меняется при ручной смене `design` в localStorage.

**Task 2 — Перевод код-точек на `theme.custom`.** В `BubblesPage.jsx` (`getBubbleFillStyle` ~387, `getButtonStyles`/`getOutlinedButtonStyles`/`getDialogPaperStyles` ~351–401, canvas-фон эффект ~466–477, полоса хедера ~2061, `renderBubbleText` ~1601–1668, инструкции-оверлей ~2447) и `useMatterEngine.js` (~67–69, ~124–126) — читать значения из `theme.custom.*` вместо хардкода. `AuthForm.jsx` — карточка/кнопки из `theme.custom`/палитры. Verify: переключение Classic↔Modern реально меняет обводки/фон/полосу хедера/подписи.

**Task 3 — AppearanceDialog + меню.** Новый `src/components/AppearanceDialog.jsx` (паттерн `FontSettingsDialog`: `Dialog` + `getDialogPaperStyles` + `DialogTitle` с close). Контролы: режим (свет/тьма/системная) + сетка карточек-скинов с мини-превью (цвета из реестра). `MainMenuDrawer.jsx`: пункт «Оформление» → `onOpenAppearanceDialog`; состояние диалога и проп `getDialogPaperStyles` — в `BubblesPage` (как для FontSettings). `useThemeMode`/`App.jsx` пробрасывают `design,setDesign,themeMode,setThemeMode`. i18n-ключи. Verify: окно открывается, выбор режима и скина применяется и сохраняется после reload.

**Task 4 — Инфра декора и canvas-эффектов.** `src/components/DesignBackdrop.jsx` (рендерит слой по `theme.custom.backdrop`) + `src/styles/design-backdrops.css` (кейфреймы; импорт в `index.jsx`). Хук `afterRender` в `useMatterEngine.js`, читающий `theme.custom.bubble.effect` (пока `none`). Verify: build; для Modern/Classic поведение не изменилось.

**Task 5 — Aurora Glass.** `aurora.js` (тёмная палитра `#0b0e1a`, стекло, неон; Sora+Inter; `backdrop:'aurora'`, `effect:'glow'`, header-strip glass). Аврора-слой в `DesignBackdrop` + кейфреймы. Свечение пузырей в `afterRender` (`shadowBlur`+цвет акцента). Шрифт Sora в `@fontsource`. Светлый вариант — облегчённое стекло. Verify: скрин свет/тьма/мобайл.

**Task 6 — Neo-Brutalist.** `brutalist.js` (бумага `#f5f0e6`/чёрный, яркие; Space Grotesk+Archivo; `backdrop:'dots'`, `effect:'hardShadow'`, толстые рамки и `5px 5px 0` в overrides, радиусы малые). Сетка-точки в `DesignBackdrop`. Жёсткая офсет-тень пузырей в `afterRender`. Тёмный вариант — инверсия бумага/чернила. Verify: скрин свет/тьма/мобайл.

**Task 7 — Clay Pastel.** `clay.js` (пастель `#f3eefb`; Nunito; `backdrop:'none'`, `effect:'clay'`, мягкие/inset-тени в overrides, крупные радиусы). Clay-градиент+мягкая тень пузырей в `afterRender`. Тёмный вариант — приглушённая пастель. Verify: скрин свет/тьма/мобайл.

**Task 8 — i18n + финальная проверка.** Ключи скинов/диалога в `src/locales/en/*` и `uk/*`. `npm test`, `npm run build`. Визуально через chrome-devtools: все 5 скинов × свет/тьма × десктоп+мобайл; персист после reload; светло/тёмный тумблер не сломан; canvas (обводка/заливка/эффект), полоса хедера, бэкдропы корректны.

## Critical files

- `src/hooks/useThemeMode.js` — оси mode×design, `createAppTheme(mode,design)`, сеттеры, реестр.
- `src/theme/designs/{index,classic,modern,aurora,brutalist,clay}.js` — **новое**, реестр + модули скинов.
- `src/components/AppearanceDialog.jsx` — **новое**, окно «Оформление».
- `src/components/DesignBackdrop.jsx` + `src/styles/design-backdrops.css` — **новое**, декор-слои.
- `src/pages/BubblesPage.jsx` — хелперы ~351–401, canvas-эффект ~466–477, полоса хедера ~2061, `renderBubbleText` ~1601–1668, оверлей ~2447, состояние+рендер AppearanceDialog/DesignBackdrop.
- `src/hooks/useMatterEngine.js` — фон ~67–69, обводка ~124–126, новый `afterRender`.
- `src/components/MainMenuDrawer.jsx` — пункт «Оформление».
- `src/components/AuthForm.jsx` — карточка/кнопки из темы.
- `src/App.jsx` — проброс `design/setDesign/themeMode/setThemeMode`.
- `src/index.jsx`, `package.json` — импорты шрифтов `@fontsource`.
- `src/locales/en/*`, `src/locales/uk/*` — i18n.

## Reuse (существующее)

- Паттерн диалога: `FontSettingsDialog.jsx` + `getDialogPaperStyles` (BubblesPage ~377) + проброс `onOpenFontSettingsDialog` в `MainMenuDrawer`.
- Логика режима: `ThemeToggle.jsx`.
- Заливка пузырей: `withAlpha` (`src/utils/colorUtils.js`).
- Персист темы: паттерн `localStorage` в `useThemeMode.js`.
- Источник Modern — текущая ветка; источник Classic — git `09dd4d8` (тема) и состояние до `3a92690`/`ce36a0b` (код-значения).

## Verification

1. `npm test -- --run` и `npm run build` — зелёные.
2. `npm start`, через chrome-devtools на запущенном приложении: для каждого скина × {light,dark} × {desktop 1280, mobile 390} — скрин; проверить шрифт (computed font-family), палитру, обводку/заливку/эффект пузырей на canvas, наличие/отсутствие полосы хедера, бэкдроп.
3. Окно «Оформление»: смена режима и скина применяется мгновенно и сохраняется после reload (localStorage `app-theme-mode` + `app-design`).
4. Регрессии: светло/тёмный тумблер работает во всех скинах; диалоги/панели/AuthForm наследуют скин; физика/драг/поиск не затронуты.

## Notes / risks

- Backdrop-blur самих пузырей на canvas недостижим → Aurora использует свечение.
- 5 скинов × 2 режима — большой QA-объём; задачи 5–7 независимы и шиппятся по одной.
- Дизайн-токены в `theme.custom` дублируют часть палитры (как сейчас `getDialogPaperStyles`) — допустимо ради автономности хелперов.
