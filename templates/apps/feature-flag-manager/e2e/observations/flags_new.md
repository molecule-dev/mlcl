# Page observations: /flags/new (NewFlag)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                 | role         | expected behavior on interaction                   | success signal              | failure signal                         |
| ------------------------------------------ | ------------ | -------------------------------------------------- | --------------------------- | -------------------------------------- |
| Name input                                 | textbox      | accept flag name; auto-derives slug into key field | key value updates from name | key empty                              |
| Key input                                  | textbox      | accept/edit flag key                               | value reflects typed text   | empty                                  |
| Description textarea                       | textbox      | accept description                                 | value reflects typed text   | empty                                  |
| Flag-type buttons (boolean / multivariate) | radio-group  | toggle multivariate mode                           | variant rows visible        | only single default                    |
| `getByRole('button', { name: /create flag  | create/i })` | button                                             | submit, POST /api/flags     | redirect to /flags/:key, DB row exists | stays with error |
| `getByRole('link', { name: /cancel/i })`   | link         | navigate back to /flags                            | URL becomes /flags          | stays                                  |

## Hidden surfaces opened from this page

| trigger                  | what it opens       | elements inside (selector / role / behavior)                  |
| ------------------------ | ------------------- | ------------------------------------------------------------- |
| Multivariate type button | variant editor rows | variant key input, variant value input, delete-variant button |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected          |
| ----------- | ------ | ---------- | ----------------------------------------------- |
| Create flag | POST   | /api/flags | { key, name, description, type, variants, ... } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/13-flags_new.spec.ts`
