# Page observations: /documents/:id (Editor)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                               | role    | expected behavior on interaction                                                 | success signal                                                               | failure signal                         |
| -------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| `getByRole('link', { name: /All documents/i })`          | link    | navigates back to `/documents`                                                   | URL becomes `/documents`                                                     | URL unchanged                          |
| `getByRole('link', { name: /^SEO$/i })`                  | link    | navigates to `/documents/<id>/seo`                                               | URL contains `/seo`                                                          | URL unchanged                          |
| `getByRole('button', { name: /^Publish$/i })`            | button  | sets document status to `published` and persists; toast confirms                 | `GET /api/documents/<id>` returns `status: 'published'`; status pill updates | publish failed; status remains `draft` |
| `getByRole('button', { name: /Toggle AI panel/i })`      | button  | toggles `aria-pressed` and shows/hides AI side panel                             | aria-pressed flips; AI panel `Plume Intelligence` h3 appears/disappears      | panel state unchanged                  |
| `getByRole('textbox', { name: /Document body/i })`       | textbox | accepts free text; on blur saves via PUT /api/documents/:id                      | textarea value updated; `GET /api/documents/<id>` returns the typed content  | content not persisted                  |
| `getByRole('button', { name: /^Bold$/i })`               | button  | inserts `**...**` markers into content; persists                                 | content updated with `**`; saved via PUT                                     | content unchanged                      |
| `getByRole('button', { name: /^Italic$/i })`             | button  | inserts `*...*`; persists                                                        | content updated with `*`; saved via PUT                                      | content unchanged                      |
| `getByRole('button', { name: /^Underline$/i })`          | button  | inserts `__...__`; persists                                                      | content updated with `__`; saved via PUT                                     | content unchanged                      |
| `getByRole('button', { name: /Bulleted list/i })`        | button  | inserts `\n- List item`; persists                                                | content contains `- ` line; saved via PUT                                    | content unchanged                      |
| `getByRole('button', { name: /Numbered list/i })`        | button  | inserts `\n1. List item`; persists                                               | content contains `1. `; saved via PUT                                        | content unchanged                      |
| `getByRole('button', { name: /Block quote/i })`          | button  | inserts `\n> Quoted text`; persists                                              | content contains `> `; saved via PUT                                         | content unchanged                      |
| `getByRole('button', { name: /Inline code/i })`          | button  | inserts `\`code\``; persists                                                     | content contains backticks; saved via PUT                                    | content unchanged                      |
| `getByRole('button', { name: /Request a refinement/i })` | button  | calls `/api/generate/rewrite` with current content; populates AI suggestion card | suggestion card visible with non-empty body                                  | no suggestion appears or 5xx           |
| `getByRole('button', { name: /Close AI panel/i })`       | button  | hides the AI panel                                                               | AI panel hidden                                                              | panel still visible                    |

## Hidden surfaces opened from this page

| trigger         | what it opens         | elements inside (selector / role / behavior)                                             |
| --------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Toggle AI panel | AI side panel (right) | "Plume Intelligence" h3, SEO score ring, "Request a refinement" button, suggestions list |

## Network calls expected during normal use

| trigger                    | method | path                  | what request body or query is expected                           |
| -------------------------- | ------ | --------------------- | ---------------------------------------------------------------- |
| Editor mount               | GET    | /api/documents/:id    | returns the document row                                         |
| Body blur after typing     | PUT    | /api/documents/:id    | `{ content: '<typed text>' }` → 200                              |
| Publish click              | PUT    | /api/documents/:id    | `{ status: 'published', content }` → 200                         |
| Request a refinement click | POST   | /api/generate/rewrite | `{ content, instruction, document_id }` → 200 with `{ content }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/documents__id.spec.ts`
