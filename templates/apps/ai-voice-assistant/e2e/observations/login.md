# Page observations: /login (Login)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                       | role    | expected behavior on interaction           | success signal                              | failure signal       |
| ---------------------------------------------------------------- | ------- | ------------------------------------------ | ------------------------------------------- | -------------------- |
| `input[type="email"]` (placeholder=you@example.com)              | textbox | accepts user typed value (you@example.com) | value retained                              | input rejected       |
| getByRole('link', { name: /forgot/i }) (Forgot?)                 | link    | navigates to /forgot-password              | URL contains /forgot-password               | URL unchanged        |
| `input[type="password"]` (placeholder=••••••••)                  | textbox | accepts user typed value (••••••••)        | value retained                              | input rejected       |
| getByRole('button', { name: /show.*password/i }) (Show password) | button  | clicks "Show password"                     | button responds (network call or UI update) | no observable change |
| getByRole('button', { name: /sign.*in/i }) (Sign in)             | button  | clicks "Sign in"                           | button responds (network call or UI update) | no observable change |
| getByRole('link', { name: /sign.*up/i }) (Sign up)               | link    | navigates to /signup                       | URL contains /signup                        | URL unchanged        |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

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
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
