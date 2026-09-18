# Page observations: / (Landing)

> Public landing page for Engram. No auth required.

## Page state assumed

- [x] Public (no auth required)
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role      | expected behavior on interaction         | success signal                | failure signal       |
| --------------------------------------------------- | --------- | ---------------------------------------- | ----------------------------- | -------------------- |
| `getByRole('link', { name: /sign\s*in/i }).first()` | link      | navigates to /login                      | URL becomes /login            | stays on /           |
| `getByRole('link', { name: /get\s*started           | sign\s*up | create\s*account/i }).first()`           | link                          | navigates to /signup | URL becomes /signup | stays on / |
| `getByRole('heading', { level: 1 })`                | heading   | renders Engram brand headline            | h1 text present and non-empty | h1 missing or empty  |
| `getByText(/engram/i).first()`                      | text      | brand name visible somewhere on the page | text node visible             | text missing         |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

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
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
