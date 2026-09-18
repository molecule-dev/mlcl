# Page observations: /editor/:id (editor__id)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role          | expected behavior on interaction                  | success signal    | failure signal  |
| ------------------------------------------------------- | ------------- | ------------------------------------------------- | ----------------- | --------------- |
| `getByRole("heading", { name: /^Editor$/i, level: 1 })` | heading       | render Editor heading                             | visible           | absent          |
| `getByRole("button", { name: /Save version/i })`        | button        | POST /api/generations/:id/variations or save edit | request issued    | no network call |
| `getByRole("button", { name: /^Inpaint$/i })`           | button (tool) | select inpaint tool                               | aria-pressed=true | no toggle       |
| `getByRole("button", { name: /^Outpaint$/i })`          | button (tool) | select outpaint tool                              | aria-pressed=true | no toggle       |
| `getByRole("button", { name: /^Erase$/i })`             | button (tool) | select erase tool                                 | aria-pressed=true | no toggle       |
| `getByRole("button", { name: /^Crop$/i })`              | button (tool) | select crop tool                                  | aria-pressed=true | no toggle       |
| `getByRole("button", { name: /Add layer/i })`           | button        | append a new layer to the layer list              | list grows by 1   | list unchanged  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path             | what request body or query is expected |
| --------- | ------ | ---------------- | -------------------------------------- |
| page load | GET    | /api/generations | (by id segment)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/editor__id.spec.ts`
