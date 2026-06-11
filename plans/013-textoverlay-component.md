# Plan 013: Вынести TextOverlay в настоящий мемоизированный компонент

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0bcd99f..HEAD -- src/pages/BubblesPage.js`
> При несовпадении выдержек «Current state» с живым кодом — STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001 (там на этот код повешен eslint-disable, который этот план удаляет)
- **Category**: perf
- **Planned at**: commit `0bcd99f`, 2026-06-11

## Why this matters

`TextOverlay` (подписи поверх пузырей) определён как `const TextOverlay = useCallback(() => {...}, [deps])` **внутри рендера** `BubblesPage`. Это компонент с хуками, создаваемый через useCallback, — двойная проблема: (1) формальное нарушение Rules of Hooks (хуки внутри колбэка); (2) при каждом изменении зависимостей создаётся **новый тип компонента**, и React размонтирует/смонтирует всё поддерево заново, сбрасывая внутренний state и rAF-цикл. Вынос в обычный top-level компонент с `React.memo` убирает remount'ы и легализует хуки.

## Current state

- `src/pages/BubblesPage.js:1557-1683` — определение:
  ```js
  const TextOverlay = useCallback(() => {
      const [positions, setPositions] = useState([]);
      const bubblesRef = useRef(bubbles);
      const filteredBubblesRef = useRef([]);
      ...
      useEffect(() => {
          if (!engineRef.current) return undefined;
          const updatePositions = () => { ...rAF-цикл, setPositions... };
          let rafId = requestAnimationFrame(updatePositions);
          return () => cancelAnimationFrame(rafId);
      }, []);
      const renderBubbleText = useCallback((bubble) => { ... }, [...]);
      return ( ...абсолютно позиционированные подписи... );
  }, [bubbles, getFilteredBubbles, foundBubblesIds, /* открой файл — допиши фактический список deps */]);
  ```
  Точный список зависимостей и JSX смотри в живом файле — выше только скелет.
- Использование: `BubblesPage.js:2492` — `<TextOverlay key={textOverlayKey} />`.
- `BubblesPage.js:497-501` — костыль принудительного remount при смене темы:
  ```js
  const [textOverlayKey, setTextOverlayKey] = useState(0);
  useEffect(() => {
      setTextOverlayKey(prev => prev + 1);
  }, [/* тема */]);
  ```
- После plans/001 на хуках внутри стоит `// eslint-disable-next-line react-hooks/rules-of-hooks -- pre-existing, fixed in plans/013`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `CI=true npm run test:ci` | exit 0 |
| Build (ESLint!) | `CI=true npm run build` | exit 0 |

## Scope

**In scope**: `src/components/TextOverlay.js` (создать), `src/pages/BubblesPage.js` (удалить определение, заменить использование, передать props).

**Out of scope**:
- Оптимизация pulse-эффекта (`BubblesPage.js:~1866`, ресет rAF на каждом рендере) — известная смежная проблема, НЕ трогать (отмечена в docs/code-review-2026-06-10.md, п. 15).
- Изменение визуала подписей.

## Git workflow

- Ветка: `advisor/013-textoverlay`. **Не пушить в `main`**.

## Steps

### Step 1: Инвентаризация замыканий

Выписать всё, что тело `TextOverlay` берёт из замыкания `BubblesPage` (минимум: `bubbles`, `getFilteredBubbles`, `foundBubblesIds`, `engineRef`, тема/`themeMode`, возможно `tags`, `debouncedBubblesSearchQuery`). Это будущие props.

### Step 2: Создать src/components/TextOverlay.js

Top-level компонент: тело перенести как есть, замыкания → props; `export default React.memo(TextOverlay)`. Конвенция файла-образца: `src/components/HtmlRenderer.js` (функциональный компонент + `React.memo` + default export). rAF-эффект так и остаётся `[]`-зависимым: он читает данные через refs, которые обновляются отдельным эффектом — этот паттерн сохранить, но refs теперь обновляются из props.

**Verify**: `CI=true npm run build` → exit 0 (компонент ещё не подключён — допустимо).

### Step 3: Подключить и удалить старое

В `BubblesPage.js`: удалить определение 1557-1683 (включая eslint-disable из plans/001), импортировать новый компонент, в JSX:

```jsx
<TextOverlay
    bubbles={bubbles}
    filteredBubbles={getFilteredBubbles}
    foundBubblesIds={foundBubblesIds}
    engineRef={engineRef}
    themeMode={themeMode}
    ...остальное из шага 1
/>
```

Костыль `textOverlayKey` (497-501, и `key=` на 2492) удалить: тема теперь прокидывается пропсом, обычный ререндер обновит цвета. Если выяснится, что внутри есть theme-зависимые значения, читаемые только при маунте, — перенести их в рендер-фазу компонента.

**Verify**: `grep -n 'textOverlayKey\|useCallback(() => {' src/pages/BubblesPage.js | grep -i textoverlay` → пусто; `grep -n 'rules-of-hooks' src/pages/BubblesPage.js` → пусто; `CI=true npm run build` → exit 0 (ESLint подтверждает легальность хуков).

### Step 4: Ручная проверка и коммит

`npm start`: подписи следуют за пузырями при движении; поиск приглушает ненайденные; смена темы меняет цвет текста; ввод текста в диалоге НЕ дёргает оверлей (проверить React DevTools Profiler по возможности). Коммит: `git commit -am "Extract TextOverlay into memoized top-level component"`.

## Test plan

Компонентных тестов нет; гейт — ESLint (rules-of-hooks теперь зелёный без disable) + build + ручной сценарий шага 4.

## Done criteria

- [ ] `src/components/TextOverlay.js` существует, `React.memo`, default export
- [ ] В `BubblesPage.js` нет inline-определения TextOverlay, нет `textOverlayKey`, нет eslint-disable rules-of-hooks
- [ ] `CI=true npm run build` → exit 0
- [ ] Ручной сценарий пройден
- [ ] `plans/README.md`: строка плана 013 → DONE

## STOP conditions

- Тело TextOverlay использует из замыкания функции, которые сами пересоздаются каждый рендер и используются в deps эффектов (кроме перечисленных) — выпиши их и STOP: возможно, сначала нужна стабилизация этих функций.
- После выноса подписи перестают обновляться при движении пузырей (rAF-цикл умер) — два честных подхода к фиксу, потом STOP.

## Maintenance notes

- Смежный перф-долг в том же районе: pulse-эффект `BubblesPage.js:~1866` перезапускается каждый рендер (см. ревью п. 15) — кандидат на следующий план.
- Ревьюеру: главное — отсутствие remount'ов (state `positions` не сбрасывается) и теметика без key-костыля.
