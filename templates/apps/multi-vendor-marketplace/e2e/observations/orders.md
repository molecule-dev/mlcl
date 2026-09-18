# Page observations: orders

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction | success signal        | failure signal |
| ------------------------------------------- | ------- | -------------------------------- | --------------------- | -------------- |
| `getByRole("heading", { level: 1 })`        | heading | render orders heading            | visible               | missing        |
| `getByRole("button", { name: /^all$/i })`   | button  | switch filter to all             | all filter active     | no change      |
| `getByRole("button", { name: /shipped/i })` | button  | switch filter to shipped         | shipped filter active | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path        | what request body or query is expected |
| -------------- | ------ | ----------- | -------------------------------------- |
| Initial render | GET    | /api/orders | no body                                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/orders.spec.ts`
