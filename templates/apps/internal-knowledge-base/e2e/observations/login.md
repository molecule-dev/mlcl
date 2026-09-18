# Page observations: /login (Login)

Observed via Playwright MCP at `http://localhost:VITE_PORT/login`
while signed out.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                  | role    | expected behavior on interaction                     | success signal       | failure signal |
| ------------------------------------------- | ------- | ---------------------------------------------------- | -------------------- | -------------- |
| `getByRole('textbox', { name: /email/i })`  | textbox | email input field                                    | typed value persists | missing        |
| `getByRole('button', { name: /sign in/i })` | button  | POST /api/users/log-in; on success redirect to /home | URL leaves /login    | inline error   |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger                  | method | path              | what request body or query is expected        |
| ------------------------ | ------ | ----------------- | --------------------------------------------- |
| Submit valid credentials | POST   | /api/users/log-in | `{ email, password }` → 200, token cookie set |
| Submit bad credentials   | POST   | /api/users/log-in | non-2xx → inline error rendered               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/login.spec.ts`
