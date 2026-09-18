# Page observations: /login (Login)

Source: live walk against http://localhost:3070/login while writing
e2e/login.spec.ts. Every row corresponds to an element with a
passing test asserting its real behavior.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role    | expected behavior on interaction  | success signal                                | failure signal               |
| -------------------------------------------------- | ------- | --------------------------------- | --------------------------------------------- | ---------------------------- |
| `[data-mol-id="login-form"] input#login-email`     | textbox | accepts email, required field     | value persists in DOM, form passes validation | empty value blocks submit    |
| `[data-mol-id="login-form"] input#login-password`  | textbox | accepts password, type="password" | value masked, form passes validation          | empty blocks submit          |
| `[data-mol-id="login-form"] button[type="submit"]` | button  | POSTs /api/users/log-in           | redirect away from /login on success          | inline error stays on /login |
| `getByRole('link', { name: /forgot/i })`           | link    | navigates to /forgot-password     | URL becomes /forgot-password                  | URL unchanged                |
| `getByRole('link', { name: /create.*account/i })`  | link    | navigates to /signup              | URL becomes /signup                           | URL unchanged                |

## Hidden surfaces opened from this page

| trigger                     | what it opens | elements inside (selector / role / behavior) |
| --------------------------- | ------------- | -------------------------------------------- |
| (none — login page is flat) | —             | —                                            |

## Network calls expected during normal use

| trigger                 | method | path              | what request body or query is expected       |
| ----------------------- | ------ | ----------------- | -------------------------------------------- |
| submit with bad creds   | POST   | /api/users/log-in | { email, password } → 4xx with error message |
| submit with valid creds | POST   | /api/users/log-in | { email, password } → 2xx with accessToken   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
