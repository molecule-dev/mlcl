# Page observations: /signup (Signup)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                | role    | expected behavior on interaction | success signal                                           | failure signal         |
| --------------------------------------------------------- | ------- | -------------------------------- | -------------------------------------------------------- | ---------------------- |
| `getByRole('button', { name: /^learner$/i })`             | button  | selects learner role             | aria-pressed flips on Learner                            | inert                  |
| `getByRole('button', { name: /^tutor$/i })`               | button  | selects tutor role               | aria-pressed flips + CTA reads "Create my tutor account" | inert                  |
| `getByRole('textbox', { name: /full name/i })`            | textbox | accepts name                     | value typed                                              | rejected               |
| `page.locator('input[type="email"]')`                     | textbox | accepts email                    | value typed                                              | invalid email rejected |
| `page.locator('input[type="password"]')`                  | textbox | accepts password masked          | value typed                                              | rejected               |
| `getByRole('button', { name: /show password/i })`         | button  | toggles visibility               | type flips                                               | unchanged              |
| `page.locator('form button[type="submit"]')`              | button  | POST /api/users                  | redirect off /signup + bearer in localStorage            | 4xx, still on /signup  |
| `getByRole('link', { name: /already have an account/i })` | link    | go to /login                     | URL is /login                                            | nav fails              |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected                  |
| ----------- | ------ | ---------- | ------------------------------------------------------- |
| submit form | POST   | /api/users | { name, email, password } returns { user, accessToken } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
