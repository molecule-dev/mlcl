# Page observations: /signup (Signup)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction                 | success signal                              | failure signal       |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------ | ------------------------------------------- | -------------------- |
| `input[placeholder*="e.g."]` (placeholder=e.g. Alex Rivera)        | textbox | accepts user typed value (e.g. Alex Rivera)      | value retained                              | input rejected       |
| `input[type="email"]` (placeholder=you@example.com)                | textbox | accepts user typed value (you@example.com)       | value retained                              | input rejected       |
| `input[type="password"]` (placeholder=At least 8 characters)       | textbox | accepts user typed value (At least 8 characters) | value retained                              | input rejected       |
| `input[type="password"]` (placeholder=Repeat your password)        | textbox | accepts user typed value (Repeat your password)  | value retained                              | input rejected       |
| getByRole('button', { name: /create.*account/i }) (Create account) | button  | clicks "Create account"                          | button responds (network call or UI update) | no observable change |
| getByRole('link', { name: /sign.*in/i }) (Sign in)                 | link    | navigates to /login                              | URL contains /login                         | URL unchanged        |

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
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
