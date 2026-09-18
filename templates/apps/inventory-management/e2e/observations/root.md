# Page observations: / (Root)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role    | expected behavior on interaction | success signal      | failure signal |
| --------------------------------------------- | ------- | -------------------------------- | ------------------- | -------------- |
| `getByRole("heading", { level: 1 })`          | heading | renders the hero tagline         | visible             | missing        |
| `a[href="/signup"]` (header CTA "Start free") | link    | navigates to /signup             | URL becomes /signup | no navigation  |
| `a[href="/login"]` (header CTA "Sign in")     | link    | navigates to /login              | URL becomes /login  | no navigation  |
| feature card "SKU truth across every site"    | article | renders feature copy             | visible             | missing        |
| feature card "Scan-first floor flow"          | article | renders feature copy             | visible             | missing        |
| proof metric "128"                            | text    | renders proof number             | visible             | missing        |
| proof metric "42M"                            | text    | renders proof number             | visible             | missing        |
| KPI demo card "Low-stock SKUs"                | card    | renders demo KPI                 | visible             | missing        |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger        | method | path          | what request body or query is expected |
| -------------- | ------ | ------------- | -------------------------------------- |
| initial render | GET    | /api/users/me | no body — auth verification            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
