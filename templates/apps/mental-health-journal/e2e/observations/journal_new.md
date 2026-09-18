# Page observations: /journal/new (EntryComposer)

> Filled by AI agent driving the live mental-health-journal smoke-app via
> `scripts/observe-page.mjs --auth` (Playwright).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role    | expected behavior on interaction                    | success signal                          | failure signal  |
| ----------------------------------------------------------------- | ------- | --------------------------------------------------- | --------------------------------------- | --------------- |
| `getByRole('heading', { level: 1, name: /Today.s reflection/i })` | heading | renders composer title                              | visible                                 | not rendered    |
| `getByRole('link', { name: /Back to journal/i })`                 | link    | navigates to /journal                               | URL /journal                            | 4xx/5xx         |
| `getByRole('button', { name: /^Radiant$/ })`                      | button  | selects mood radiant                                | aria-pressed=true                       | not selected    |
| `getByRole('button', { name: /^Good$/ })`                         | button  | selects mood good (default)                         | aria-pressed=true                       | not selected    |
| `getByRole('button', { name: /^Struggling$/ })`                   | button  | selects mood struggling                             | aria-pressed=true                       | not selected    |
| `getByPlaceholder(/Give this reflection a name/i)`                | textbox | accepts title input                                 | typed value appears                     | rejected        |
| `getByPlaceholder(/Write whatever feels honest/i)`                | textbox | accepts entry body                                  | typed value appears, word count updates | rejected        |
| `getByPlaceholder(/Add a tag and press enter/i)`                  | textbox | adds tag chip on Enter                              | new chip appears                        | nothing happens |
| `getByRole('button', { name: /Save reflection/i })`               | button  | POST /api/journal/entries; redirect to /journal/:id | URL /journal/:id (uuid)                 | toast error     |
| `getByRole('link', { name: /See all prompts/i })`                 | link    | navigates to /prompts                               | URL /prompts                            | 4xx/5xx         |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger                           | method | path                 | what request body or query is expected   |
| --------------------------------- | ------ | -------------------- | ---------------------------------------- |
| Click "Save reflection" with body | POST   | /api/journal/entries | `{ mood, title?, body, tags?, prompt? }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/journal_new.spec.ts`
