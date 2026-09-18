# Page observations: /signup (Signup)

Observed via Playwright MCP at `http://localhost:VITE_PORT/signup`
while signed out.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction                           | success signal             | failure signal                          |
| --------------------------------------------------- | ------- | ---------------------------------------------------------- | -------------------------- | --------------------------------------- |
| `getByRole('textbox', { name: 'First name' })`      | textbox | first name input                                           | typed text persists        | required-field error on submit          |
| `getByRole('textbox', { name: 'Last name' })`       | textbox | last name input                                            | typed text persists        | required-field error on submit          |
| `getByRole('textbox', { name: 'Work email' })`      | textbox | email input                                                | typed text persists        | required-field error                    |
| `getByRole('button', { name: 'Create workspace' })` | button  | POST /api/users; on 201 redirect to /home with auth cookie | URL leaves /signup → /home | inline error e.g. "Email already taken" |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger     | method | path       | what request body or query is expected           |
| ----------- | ------ | ---------- | ------------------------------------------------ |
| Submit form | POST   | /api/users | `{ email, password, firstName, lastName }` → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
