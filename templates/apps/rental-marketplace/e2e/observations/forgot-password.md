# Page observations: /forgot-password (Forgot Password)

Single-input form that POSTs to `/api/forgot_password` (note: handler
mounted at `/api/forgot_password` per `routes/index.ts`). Server responds
200 even on unknown email (anti-enumeration) but actually queues a
Mailgun delivery when the user exists.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                     | role            | expected behavior on interaction   | success signal                                        | failure signal             |
| ---------------------------------------------- | --------------- | ---------------------------------- | ----------------------------------------------------- | -------------------------- |
| `getByRole('textbox', { name: /email/i })`     | input           | type email address                 | input accepts text; required + type=email             | empty submit blocked       |
| `getByRole('button', { name: /send             | submit          | reset/i })`                        | button                                                | submit recovery request    | POST returns 200, success message shown, button shows pending state then resets | error banner |
| `getByRole('link', { name: /back               | sign\s*in/i })` | link                               | navigate back to /login                               | URL becomes /login         | no navigation                                                                   |
| Heading "Reset your password"                  | heading         | rendered when route is open        | heading text visible on first paint                   | missing                    |
| Success card "Check your email" (after submit) | text            | revealed after a successful submit | mark_email_read icon + body copy with the email shown | success card never appears |

## Hidden surfaces opened from this page

(none)

## Network calls expected during normal use

| trigger | method | path                 | what request body or query is expected           |
| ------- | ------ | -------------------- | ------------------------------------------------ |
| submit  | POST   | /api/forgot_password | { email } → 200 (no error even on unknown email) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
