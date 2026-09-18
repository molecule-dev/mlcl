# Page observations: /reset-password (ResetPassword)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page.

## Page state assumed

- [x] Public (no auth required)
- [x] Optionally accepts ?token= and ?email= in URL

## Elements

| selector / accessible name                               | role          | expected behavior on interaction          | success signal                                      | failure signal           |
| -------------------------------------------------------- | ------------- | ----------------------------------------- | --------------------------------------------------- | ------------------------ |
| Email + Token + New password + Confirm password fields   | textbox group | render + accept input                     | values reflect typed/url-param input                | any field missing        |
| URL params (?email + ?token) pre-fill the form           | wiring        | reads ?email + ?token from query string   | both fields pre-filled on load                      | fields blank             |
| Mismatched passwords show inline alert + suppress submit | validation    | role=alert visible, no POST fired         | error visible, network silent                       | POST fires anyway        |
| Submit button (invalid token)                            | button        | POST reset, server rejects, stays on page | reset-related POST fires; URL stays /reset-password | redirects to /pipelines  |
| `getByRole('link', { name: /Back to sign in/i })`        | link          | navigate to /login                        | URL becomes /login                                  | stays on /reset-password |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger     | method | path                      | what request body or query is expected |
| ----------- | ------ | ------------------------- | -------------------------------------- |
| Submit form | POST   | /api/users/reset-password | token + password                       |
| After reset | POST   | /api/users/sessions       | email + password (auto login)          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/reset-password.spec.ts`
