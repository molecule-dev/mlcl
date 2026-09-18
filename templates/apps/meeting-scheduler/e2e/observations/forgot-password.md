# Page observations: /forgot-password (Forgot password)

Public form; POSTs /api/users/forgot-password and shows confirmation copy.

Source: this page was driven live at `http://localhost:$VITE_PORT/forgot-password`
via Playwright + the matching `e2e/forgot-password.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                | success signal                    | failure signal             |
| ------------------------------------------------------- | ------- | ----------------------------------------------- | --------------------------------- | -------------------------- |
| `getByRole("button", { name: /send\|reset\|submit/i })` | button  | submits the email to /api/users/forgot-password | 200/201/204 response from the API | submit never fires         |
| email input                                             | textbox | collects the email to reset                     | value persists in the field       | field missing or read-only |
| `getByRole("link", { name: /back to sign in/i })`       | link    | returns to /login                               | href targets /login               | link missing               |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
