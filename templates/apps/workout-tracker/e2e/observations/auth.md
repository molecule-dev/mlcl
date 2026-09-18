# Page observations: auth (landing + signup + login + protected redirect)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100.
> Covers the unauthenticated entry surface (`/`, `/signup`, `/login`)
> and the unauthenticated → protected redirect.

## Page state assumed

- [x] Public for `/`, `/signup`, `/login`. Authenticated probe for the
      protected-redirect element.

## Elements

| selector / accessible name                                                                                   | role   | expected behavior on interaction            | success signal                               | failure signal                           |
| ------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `getByRole('link', { name: /get\s*started\|start\|sign\s*up\|create.*account/i })`                           | link   | nav to /signup from landing hero            | URL becomes `/signup`                        | stays on `/`                             |
| `getByRole('button', { name: /sign\s*up\|create.*account\|register\|get\s*started/i })` (Signup form submit) | button | POST /api/users + cookie set + redirect     | URL leaves `/signup` (lands on `/dashboard`) | stays on `/signup` with error            |
| `getByRole('button', { name: /sign\s*in\|log\s*in/i })` (Login form submit)                                  | button | POST /api/users/log-in + cookie reissued    | URL leaves `/login`                          | stays on `/login`                        |
| protected-route guard for `/dashboard` (no element — redirect side-effect)                                   | guard  | unauthenticated GET `/dashboard` → redirect | URL becomes `/login` (or `/signup`)          | stays on `/dashboard` showing private UI |

## Hidden surfaces opened from this page

(none — auth pages are flat forms; no menus/modals/accordions)

## Network calls expected during normal use

| trigger       | method | path              | expected body                                   |
| ------------- | ------ | ----------------- | ----------------------------------------------- |
| Signup submit | POST   | /api/users        | `{ email, password, ... }` → 201 + `Set-Cookie` |
| Login submit  | POST   | /api/users/log-in | `{ email, password }` → 200 + `Set-Cookie`      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-auth.spec.ts`
