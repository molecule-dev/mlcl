# Page observations: /login (Login)

Public sign-in form; POSTs /api/users/login and redirects to /dashboard.

Source: this page was driven live at `http://localhost:$VITE_PORT/login`
via Playwright + the matching `e2e/login.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction    | success signal                     | failure signal             |
| ------------------------------------------------------- | ------- | ----------------------------------- | ---------------------------------- | -------------------------- |
| `#email`                                                | textbox | collects email for sign-in          | value editable + persisted in form | field missing              |
| `#password`                                             | textbox | collects password                   | value masked                       | field missing              |
| `getByRole("button", { name: /sign\s*in\|log\s*in/i })` | button  | POST /api/users/login then redirect | URL becomes /dashboard             | stays on /login with error |
| `getByRole("link", { name: /forgot/i })`                | link    | navigates to /forgot-password       | href targets /forgot-password      | link missing               |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path             | what request body or query is expected |
| ------- | ------ | ---------------- | -------------------------------------- |
| submit  | POST   | /api/users/login | { email, password }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
