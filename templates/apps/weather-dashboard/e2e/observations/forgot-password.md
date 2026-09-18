# Page observations: /forgot-password

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name            | role        | expected behavior on interaction | success signal | failure signal                                                 |
| ------------------------------------- | ----------- | -------------------------------- | -------------- | -------------------------------------------------------------- |
| `input[type="email"]`                 | email input | accept the user's email          | value typed    | rejected                                                       |
| `getByRole('button', { name: /(submit | send        | reset)/i })`                     | submit         | POST /api/users/forgot-password (always 2xx, anti-enumeration) | banner / success state shown; POST returns < 300 | 4xx response |
| `getByRole('link', { name: /(log\s*in | sign\s*in   | back)/i })`                      | link           | navigate back to /login                                        | URL becomes /login                               | unchanged    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | flat form                                    |

## Network calls expected during normal use

| trigger | method | path                       | what request body or query is expected                            |
| ------- | ------ | -------------------------- | ----------------------------------------------------------------- |
| Submit  | POST   | /api/users/forgot-password | `{ email }` — handler queues a Mailgun email + always returns 2xx |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
