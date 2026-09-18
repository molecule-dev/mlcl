# Page observations: / (Landing)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction     | success signal      | failure signal       |
| ---------------------------------------------------------------- | ------- | ------------------------------------ | ------------------- | -------------------- |
| `getByRole("heading", { name: /every voice counted/i })`         | heading | render the marketing hero            | visible h1          | absent / blank       |
| `getByRole("link", { name: /start a poll/i }).first()`           | link    | navigate to /signup CTA              | URL becomes /signup | stays on /           |
| `getByRole("link", { name: /sign in/i }).first()`                | link    | navigate to /login                   | URL becomes /login  | stays on /           |
| multiple `getByRole("link", { name: /start a poll\|sign up/i })` | link    | render hero + footer conversion CTAs | ≥2 visible          | only one CTA renders |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path | what request body or query is expected |
| --------- | ------ | ---- | -------------------------------------- |
| page load | GET    | /    | (static html)                          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
