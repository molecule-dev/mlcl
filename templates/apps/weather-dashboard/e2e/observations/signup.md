# Page observations: /signup

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                    | role             | expected behavior on interaction                                                    | success signal          | failure signal              |
| --------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------- | ----------------------- | --------------------------- |
| `input[type="email"]`                         | email input      | accept new email                                                                    | value typed             | invalid email rejected      |
| `input[type="password"]`                      | password input   | accept the new password (min length enforced server-side)                           | value typed             | rejected                    |
| `input[type="text"]` (Name)                   | text input       | optional display name                                                               | value typed             | unchanged                   |
| `getByRole('button', { name: /sign\s*up/i })` | submit           | POST /api/users with `{ email, password, name }`; on success navigate to /dashboard | URL becomes /dashboard  | stays on /signup with error |
| `getByRole('link', { name: /(log\s*in         | sign\s*in)/i })` | link                                                                                | navigate back to /login | URL becomes /login          | unchanged |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | flat form                                    |

## Network calls expected during normal use

| trigger                  | method | path       | what request body or query is expected                                    |
| ------------------------ | ------ | ---------- | ------------------------------------------------------------------------- |
| Submit (new email)       | POST   | /api/users | `{ email, password, name }` — server returns 2xx + accessToken on success |
| Submit (duplicate email) | POST   | /api/users | server returns 4xx — page must NOT navigate to /dashboard                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/signup.spec.ts`
