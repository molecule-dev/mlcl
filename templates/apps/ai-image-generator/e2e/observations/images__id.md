# Page observations: /images/:id (images__id)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                | success signal                               | failure signal  |
| -------------------------------------------------------------- | ------- | ----------------------------------------------- | -------------------------------------------- | --------------- |
| `getByRole("heading", { name: /^Image$/i, level: 1 })`         | heading | render Image detail heading                     | visible                                      | absent          |
| `getByRole("link", { name: /Open in editor/i })` (top bar)     | link    | navigate to /editor/:id                         | URL becomes /editor/UUID                     | stays           |
| `getByRole("button", { name: /Download/i })`                   | button  | download original image                         | GET request to image URL OR download trigger | no action       |
| `getByRole("button", { name: /Upscale/i })`                    | button  | POST /api/generations/:id/variations (upscale)  | request issued                               | no network call |
| `getByRole("link", { name: /Open editor/i })` (action toolbar) | link    | navigate to /editor/:id                         | URL becomes /editor/UUID                     | stays           |
| `getByRole("button", { name: /Variations/i })`                 | button  | POST /api/generations/:id/variations            | request issued                               | no network call |
| `getByRole("button", { name: /Share/i })`                      | button  | PUT /api/gallery/:id/visibility (toggle public) | request issued                               | no network call |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger          | method | path                            | what request body or query is expected |
| ---------------- | ------ | ------------------------------- | -------------------------------------- |
| page load        | GET    | /api/generations                | (by id segment)                        |
| Variations click | POST   | /api/generations/:id/variations | {}                                     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/images__id.spec.ts`
