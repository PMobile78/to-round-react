# Plan 001: Исправить нарушение Rules of Hooks в HtmlRenderer и включить ESLint

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/components/HtmlRenderer.jsx package.json src/pages/BubblesPage.jsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0bcd99f`, 2026-06-11
- **Issue**: https://github.com/PMobile78/to-round-react/issues/17
- **Reconciled**: 2026-06-13 — пути src обновлены под переименование `.js`→`.jsx` (HEAD `c7be9d6`); excerpts сверять через drift-check выше.

## Why this matters

`HtmlRenderer` вызывает `useMemo` **после** условного `return null`. Если у смонтированного компонента проп `html` сменится с непустого на пустой (пользователь стёр описание задачи), React бросит «Rendered fewer hooks than expected», и приложение упадёт в белый экран — error boundary в проекте нет. Класс таких ошибок не ловится, потому что в проекте вообще нет конфигурации ESLint (ни `eslintConfig` в `package.json`, ни `.eslintrc*`), хотя `react-scripts` 5 включает ESLint-плагин из коробки — его достаточно активировать.

## Current state

- `src/components/HtmlRenderer.jsx` — единственное место с `dangerouslySetInnerHTML`; рендерит описание задачи через DOMPurify. Файл — 81 строка, экспорт `React.memo(HtmlRenderer)`.

Строки 11–26 сегодня (early return ДО хука):

```js
const HtmlRenderer = ({
    html,
    themeMode = 'light',
    isMobile = false,
    sx = {}
}) => {
    if (!html || html.trim() === '') {
        return null;
    }

    const sanitized = useMemo(() => DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a', 'img', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
        ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
        ALLOW_DATA_ATTR: false,
    }), [html]);
```

- `package.json` — нет ключа `eslintConfig` (проверено).
- **Известный второй нарушитель Rules of Hooks**: `src/pages/BubblesPage.jsx:1557` — `const TextOverlay = useCallback(() => { const [positions, setPositions] = useState([]); ... })` — компонент, создаваемый внутри `useCallback`, с хуками внутри колбэка. Его чинит отдельный план (`plans/013-textoverlay-component.md`); в этом плане его только глушим точечным disable, чтобы включение ESLint не сломало CI-сборку (GitHub Actions выставляет `CI=true`, а CRA при `CI=true` превращает ESLint-ошибки в ошибки сборки).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm ci --legacy-peer-deps` | exit 0 |
| Build (как в CI) | `CI=true npm run build` | exit 0, «Compiled successfully» или только warnings |
| Build (локально) | `npm run build` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/components/HtmlRenderer.jsx`
- `package.json` (только добавление ключа `eslintConfig`)
- `src/pages/BubblesPage.jsx` (только inline eslint-disable у строки 1557 и, при необходимости, у других **error**-уровневых нарушений — см. шаг 3)

**Out of scope**:
- Исправление любых ESLint-**warning'ов** по всему проекту — не трогать, их сотни не нужно чинить сейчас.
- Рефакторинг `TextOverlay` — это `plans/013`.
- Любые изменения логики sanitize-конфига DOMPurify.

## Git workflow

- Ветка: `advisor/001-eslint-htmlrenderer` от `main`.
- **Не пушить в `main`** — пуш в `main` запускает автодеплой на GitHub Pages (`.github/workflows/deploy.yml`).
- Стиль коммитов в репо — короткие императивные фразы («Changed some dialogs and pages»).

## Steps

### Step 1: Перенести early return после useMemo

В `src/components/HtmlRenderer.jsx` перенести блок

```js
    if (!html || html.trim() === '') {
        return null;
    }
```

так, чтобы он стоял **после** объявления `const sanitized = useMemo(...)` (т.е. между `useMemo` и `return (<Box ...>)`). Сам `useMemo` менять не нужно: `DOMPurify.sanitize('')` на пустой строке безопасен.

**Verify**: `node -e "const s=require('fs').readFileSync('src/components/HtmlRenderer.jsx','utf8'); const i=s.indexOf('useMemo'); const j=s.indexOf('return null'); if(i<0||j<0||j<i) {console.error('FAIL: return null must come after useMemo');process.exit(1)} console.log('OK')"` → `OK`

### Step 2: Включить ESLint через eslintConfig

В `package.json` добавить ключ верхнего уровня (рядом с `browserslist`):

```json
"eslintConfig": {
    "extends": ["react-app"]
}
```

Конфиг `react-app` поставляется с `react-scripts` — ничего устанавливать не нужно.

**Verify**: `npx eslint --no-eslintrc -c <(node -p "JSON.stringify(require('./package.json').eslintConfig)") src/components/HtmlRenderer.jsx` — если команда не работает в вашей оболочке, достаточно шага 3 (сборка прогоняет ESLint).

### Step 3: Прогнать CI-сборку и заглушить только pre-existing error-нарушения

Запустить `CI=true npm run build`. CRA упадёт, если где-то есть ESLint-ошибки уровня error (в первую очередь `react-hooks/rules-of-hooks` у `BubblesPage.jsx:1557`). Для **каждой** такой ошибки (ожидается: `TextOverlay`, возможно 1–2 ещё):

- если это `react-hooks/rules-of-hooks` в `BubblesPage.jsx:1557-1558` — добавить над строками с хуками внутри `TextOverlay` комментарий:
  `// eslint-disable-next-line react-hooks/rules-of-hooks -- pre-existing, fixed in plans/013`
- если это другая ошибка в другом файле — добавить аналогичный точечный disable с пометкой `-- pre-existing, see plans/README.md` и перечислить все такие места в финальном отчёте.

Warnings не трогать.

**Verify**: `CI=true npm run build` → exit 0.

### Step 4: Закоммитить

`git add src/components/HtmlRenderer.jsx package.json src/pages/BubblesPage.jsx && git commit -m "Fix Rules of Hooks in HtmlRenderer and enable ESLint"`

**Verify**: `git status --short` → пусто (кроме незатронутых untracked-файлов docs/, plans/).

## Test plan

Автотестов в src/ пока нет (их вводит `plans/002`). Проверка — сборкой:
- `CI=true npm run build` зелёная (ESLint включён, ошибок нет).
- Ручная проверка (опционально): `npm start`, открыть задачу с описанием, стереть описание целиком, сохранить, снова открыть — приложение не падает.

## Done criteria

- [ ] В `HtmlRenderer.jsx` `return null` стоит после `useMemo` (команда из шага 1 печатает `OK`)
- [ ] `package.json` содержит `eslintConfig` с `react-app`
- [ ] `CI=true npm run build` → exit 0
- [ ] Все добавленные eslint-disable имеют пометку `pre-existing`
- [ ] `plans/README.md`: строка плана 001 → DONE

## STOP conditions

- Код в `HtmlRenderer.jsx:11-26` не совпадает с выдержкой выше.
- После шага 3 `CI=true npm run build` падает по причинам, не связанным с ESLint (например, OOM или ошибка зависимостей).
- ESLint-ошибок уровня error оказалось больше 6 — это сигнал, что нужно решение человека (глушить массово нельзя).

## Maintenance notes

- `plans/013` (вынос TextOverlay) обязан удалить добавленный здесь eslint-disable.
- После включения ESLint новые нарушения rules-of-hooks будут ломать CI-сборку — это намеренно.
- Ревьюеру: проверить, что ни один eslint-disable не добавлен к новому (не pre-existing) коду.
