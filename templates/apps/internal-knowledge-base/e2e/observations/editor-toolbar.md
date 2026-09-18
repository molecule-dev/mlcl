# Page observations: /article/:id/edit toolbar (ArticleEditor)

Observed via Playwright MCP at `/article/new/edit?space=:key` while
authenticated. The editor mounts a markdown toolbar above the body
textarea; toolbar buttons inject markdown patterns into the textarea
without saving. Save / Publish lives elsewhere (`articles.spec.ts`).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction                                                                                        | success signal                                         | failure signal                 |
| --------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| `getByRole('button', { name: /^bold$/i })`                | button  | Wraps the current selection (or inserts pattern at caret) with `**`                                                     | textarea value contains `**` markers                   | unchanged textarea             |
| `getByRole('button', { name: /^italic$/i })`              | button  | Wraps selection with `*`                                                                                                | textarea value contains the italic markers             | unchanged                      |
| `getByRole('button', { name: /^bullets$/i })`             | button  | Inserts `- Item` line at the caret position                                                                             | textarea value gains a `- ` prefixed line              | unchanged                      |
| `getByRole('button', { name: /save draft/i })` (no title) | button  | On a brand-new article without a title, must surface an inline `role=alert` validation error and NOT POST /api/articles | `role=alert` visible; no `/api/articles` request fired | silent failure / spurious POST |
| `getByRole('textbox')` (body textarea)                    | textbox | The toolbar buttons mutate this controlled value via setState; typing also updates it                                   | value matches what was typed plus toolbar insertions   | typing lost / not reflected    |

## Hidden surfaces opened from this page

(none — toolbar is inline; no popovers / menus tied to these specific
buttons. Slash-command / link-prompt menus are out of scope for this
spec.)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

(no captureNetwork in editor-toolbar.spec.ts — toolbar tests verify
local textarea state and validation; mutation tests live in
`articles.spec.ts`.)

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/editor-toolbar.spec.ts`
