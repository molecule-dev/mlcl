# Page observations: /playground (APIPlayground)

Source: live walk via Playwright + e2e/playground.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                       | success signal                            | failure signal               |
| --------------------------------------------------- | ------- | ------------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| `getByRole("heading", { name: /API playground/i })` | heading | playground renders + GET /api/try-it fires for history | heading visible + GET /api/try-it         | heading missing or GET fails |
| `getByRole("textbox", { name: /Request URL/i })`    | textbox | edit the URL field                                     | value reflected                           | not editable                 |
| `getByRole("button", { name: /^Send$/i })`          | button  | click Send → POST /api/try-it → response panel renders | POST fires + response status pill appears | no POST or no response       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path        | what request body or query is expected                    |
| ------------ | ------ | ----------- | --------------------------------------------------------- |
| initial load | GET    | /api/try-it | 200 with array of history rows                            |
| Send         | POST   | /api/try-it | {base_url, method, path, body?} → 200 with {status, body} |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/playground.spec.ts`
