# Page observations: /forgot-password (ForgotPassword)

> Captured from the rendered page after navigating to /forgot-password.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role                 | expected behavior on interaction | success signal                  | failure signal      |
| --------------------------------------------- | -------------------- | -------------------------------- | ------------------------------- | ------------------- |
| `#email` (Email)                              | textbox              | accepts an email                 | value persists                  | inline validation   |
| `getByRole('button', { name: /send reset link | email me/i })`       | button                           | POST /api/users/forgot-password | confirmation banner | inline error |
| `getByRole('link', { name: /back to log       | sign in/i })`        | link                             | nav to /login                   | URL becomes /login  | no nav       |
| `getByRole('link', { name: /sign up           | create account/i })` | link                             | nav to /signup                  | URL becomes /signup | no nav       |

## Hidden surfaces opened from this page

| trigger             | what it opens              | elements inside            |
| ------------------- | -------------------------- | -------------------------- |
| Submitting the form | inline confirmation banner | check icon + “We've sent…” |

## Network calls expected during normal use

| trigger     | method | path                       | expected body |
| ----------- | ------ | -------------------------- | ------------- |
| Submit form | POST   | /api/users/forgot-password | { email }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/forgot-password.spec.ts`
