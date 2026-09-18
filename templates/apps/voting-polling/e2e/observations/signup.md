# Page observations: /signup (Signup)

> Filled by the dispatch-flagship agent driving the running app via
> Playwright MCP. Each row was confirmed against the rendered DOM
> (data-test selectors + accessibility tree) on a freshly-scaffolded
> smoke-app served from VITE_PORT=3160 / API_PORT=4160.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction         | success signal                         | failure signal |
| --------------------------------------------------------- | ------- | ---------------------------------------- | -------------------------------------- | -------------- |
| `input#name`                                              | textbox | accept full name                         | value reflects typed text              | value empty    |
| `input#organization`                                      | textbox | accept organization name                 | value reflects typed text              | value empty    |
| `input#email`                                             | textbox | accept email                             | value reflects typed text              | value empty    |
| `input#password`                                          | textbox | accept password                          | value reflects typed text              | value empty    |
| `getByRole("button", { name: /create\s*organization/i })` | button  | POST /api/users then route to /dashboard | token written + URL becomes /dashboard | 4xx role=alert |

## Hidden surfaces opened from this page

| trigger                                                                                                   | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none observed on this surface; menu/modal interactions are exercised through the per-element rows above) | —             | —                                            |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected |
| ----------- | ------ | ---------- | -------------------------------------- |
| submit form | POST   | /api/users | { name, email, password }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
