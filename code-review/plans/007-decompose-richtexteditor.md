# Plan 007: Decompose RichTextEditor.jsx into editor, plain-text, and formatter modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the status row in
> `code-review/plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 996a2ce..HEAD -- src/components/RichTextEditor.jsx`
> On mismatch with the excerpts, STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (isolated to the RichText cluster)
- **Category**: tech-debt
- **Planned at**: commit `996a2ce`, 2026-06-30

## Why this matters

`RichTextEditor.jsx` is 555 lines holding three unrelated concerns: pure HTML/text formatter helpers, the TipTap editor lifecycle, and the plain-textarea fallback mode plus the mode toggle. Mixed together they're hard to test and to reason about, and the TipTap extension list is rebuilt on every render. Splitting the pure helpers out (so they can be unit-tested) and isolating the editor and plain-text modes makes the outer component a thin dispatcher.

## Current state

Pure helpers (no React) currently inline at the top of the file — these should move to a utils module and gain tests:

```js
// src/components/RichTextEditor.jsx:38-67
function htmlToPlainText(html) { /* DOMParser-based strip, handles '<p></p>'/'<p><br></p>' as empty */ }
function escapeHtmlPlain(s) { /* &,<,>," escaping */ }
function plainToRichHtml(value) { /* wraps plain text in <p>…<br>…</p> unless already markup */ }
```

The TipTap config + inner component:

```js
// src/components/RichTextEditor.jsx:73-113
function createExtensions(placeholder) { return [ StarterKit, Placeholder.configure({placeholder}), TextAlign..., Underline, TextStyle, Color, Highlight..., TaskList, TaskItem..., Link..., Image..., Table..., TableRow, TableHeader, TableCell, CodeBlock, Blockquote, HorizontalRule ]; }

// src/components/RichTextEditor.jsx:119-156
function TipTapRichEditor({ value, onChange, placeholder, isMobile, themeMode, t }) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;                  // ref bridge to avoid editor re-init on onChange change
  const editor = useEditor({
    extensions: createExtensions(placeholder),     // rebuilt every render (not memoized)
    content: '',
    onUpdate: ({ editor }) => { onChangeRef.current(editor.getHTML()); },
    editorProps: { attributes: { class:'...', style:{ /* hardcoded #fff/#000/#333 by themeMode */ } } },
  }, [isMobile, themeMode, placeholder]);
  React.useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value); }, [editor, value]);
  // + a caret-color global-style effect
}
```

The outer `RichTextEditor` (further down, ~lines 456-504 per the file) switches between `TipTapRichEditor` and a plain `<textarea>` based on a `useRichText` toggle.

### Conventions

- 4-space indentation; functional components; default export for the main component.
- Pure helpers go to `src/utils/` with a sibling `*.test.js` (pattern: `src/utils/dateTime.test.js`).
- HTML rendering elsewhere goes through `HtmlRenderer.jsx`/DOMPurify — this editor produces HTML; do not weaken sanitization at the render sites.

## Commands you will need

| Purpose   | Command                                          | Expected on success |
|-----------|--------------------------------------------------|---------------------|
| Install   | `npm ci --legacy-peer-deps`                      | exit 0              |
| New test  | `npx vitest run src/utils/richTextFormatters.test.js` | all pass        |
| Tests     | `npm test`                                        | all pass            |
| Lint      | `npm run lint`                                    | exit 0              |
| Build     | `npm run build`                                   | exit 0 (once, at end) |

## Scope

**In scope**:
- `src/utils/richTextFormatters.js` (create — `htmlToPlainText`, `escapeHtmlPlain`, `plainToRichHtml`)
- `src/utils/richTextFormatters.test.js` (create)
- `src/components/RichTextEditor.jsx` (slim down)
- `src/components/PlainTextEditor.jsx` (create — the textarea mode)
- `src/components/TipTapRichEditor.jsx` (create — move the inner editor + `createExtensions`)

**Out of scope**:
- `RichTextToolbar.jsx` — leave as-is (it already guards `!editor`).
- The hardcoded `#fff/#000/#333` editor colors — note them but keep equivalent; deep theme-routing of the editor surface is a separate concern (mention in maintenance, don't expand scope).
- Behavior of save/load of rich content.

## Git workflow

- Branch: `advisor/007-decompose-richtext`
- Conventional commits (`refactor(richtext): extract formatters and editor modules`).
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Extract pure formatters + test them

Move `htmlToPlainText`, `escapeHtmlPlain`, `plainToRichHtml` to `src/utils/richTextFormatters.js` (export each). Import them back into `RichTextEditor.jsx`. Add `src/utils/richTextFormatters.test.js`: `htmlToPlainText('<p></p>')===''`, strips tags, decodes entities; `plainToRichHtml('hi')==='<p>hi</p>'`, leaves existing markup untouched, escapes `<`/`&`; `escapeHtmlPlain('<a>&"')` → escaped.

**Verify**: `npx vitest run src/utils/richTextFormatters.test.js` → all pass.

### Step 2: Extract `TipTapRichEditor` into its own file

Move `createExtensions` and `TipTapRichEditor` to `src/components/TipTapRichEditor.jsx`. Memoize the extensions: `const extensions = React.useMemo(() => createExtensions(placeholder), [placeholder]);` and pass `extensions` to `useEditor` so they aren't rebuilt every render. Keep the existing `useEditor` dependency array behavior otherwise.

**Verify**: `npm run lint` → exit 0.

### Step 3: Extract `PlainTextEditor`

Move the plain `<textarea>` branch into `src/components/PlainTextEditor.jsx` (props: `value, onChange, placeholder, isMobile, themeMode, t`). 

**Verify**: `npm run lint` → exit 0.

### Step 4: Slim the outer component to a dispatcher

`RichTextEditor.jsx` now: read the `useRichText` toggle and render `<TipTapRichEditor/>` or `<PlainTextEditor/>`, wiring the toggle UI. Target: the file is materially smaller and contains no TipTap extension list and no formatter bodies.

**Verify**: `wc -l src/components/RichTextEditor.jsx` → well under 555 (target ~150 or less). `npm run lint` → exit 0.

### Step 5: Full verification

**Verify**: `npm test` → all pass. `npm run build` → exit 0.

## Test plan

- New unit tests for the three formatters (Step 1) — this is the main testability win.
- If a component testing setup exists, add a render test that the dispatcher shows the textarea when rich mode is off and the ProseMirror editor when on. Otherwise rely on lint/build + manual smoke.
- Manual smoke (report results): open the create/edit bubble dialog, toggle rich text on/off, type, save, reopen — content round-trips.
- Verification: `npm test` → all pass.

## Done criteria

- [ ] `src/utils/richTextFormatters.js` + test exist and pass
- [ ] `createExtensions`/`TipTapRichEditor` live in `TipTapRichEditor.jsx`; extensions are memoized
- [ ] Plain mode lives in `PlainTextEditor.jsx`
- [ ] `wc -l src/components/RichTextEditor.jsx` < 300 (ideally ~150)
- [ ] `npm test` exits 0, `npm run lint` exits 0, `npm run build` exits 0
- [ ] No files outside scope modified
- [ ] `code-review/plans/README.md` status row updated

## STOP conditions

Stop and report if:
- Memoizing the extensions changes editor behavior (cursor jumps, lost selection) — revert that one change and report.
- The `useEditor` dependency array (`[isMobile, themeMode, placeholder]`) is load-bearing in a way that breaks when the file is split (e.g. the editor must re-create on theme change) — preserve current behavior and report.
- Content stops round-tripping after the split — STOP, do not ship.
- Any verification fails twice after a reasonable fix.

## Maintenance notes

- The editor surface still hardcodes `#fff/#000/#333` by `themeMode`; a follow-up could route these through the theme (left out here to keep the split behavior-preserving). Note for the backlog.
- The `onChangeRef` ref bridge is retained as-is; if TipTap's `useEditor` later supports a stable `onUpdate`, it can be removed.
- Reviewer: confirm formatter tests actually assert output (not just truthiness).
