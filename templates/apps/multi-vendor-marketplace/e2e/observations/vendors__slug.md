# Page observations: vendors__slug

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                 | role    | expected behavior on interaction    | success signal       | failure signal |
| ------------------------------------------ | ------- | ----------------------------------- | -------------------- | -------------- |
| `getByRole("heading", { level: 1 })`       | heading | render vendor name                  | visible              | missing        |
| `getByTestId("vendor-storefront-follow")`  | button  | toggle follow state in localStorage | aria-pressed changes | unchanged      |
| `getByTestId("vendor-storefront-message")` | link    | open mailto message link            | href starts mailto:  | no mailto      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path            | what request body or query is expected |
| -------------- | ------ | --------------- | -------------------------------------- |
| Initial render | GET    | /api/storefront | vendor slug from URL                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/vendors__slug.spec.ts`
