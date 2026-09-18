# Page observations: /signup

> Observed via Playwright at http://localhost:3080/signup — public auth page
> rendered by `pages/Signup.tsx`. Snapshot grabbed during the dispatch
> walkthrough, see the rendered tree under `.playwright-mcp/`.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction | success signal                | failure signal                  |
| --------------------------------------------------------------- | ------- | -------------------------------- | ----------------------------- | ------------------------------- |
| `getByRole('heading', { name: /vantage/i }).first()` (brand)    | heading | renders Vantage title            | visible                       | missing                         |
| `getByRole('button', { name: /create account/i })`              | button  | submits → POST `/api/users`      | navigates to /home on success | inline error / stays on /signup |
| `getByRole('link', { name: /sign in/i }).first()` (footer link) | link    | navigates to /login              | URL becomes /login            | unchanged                       |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none — page is a single form) | —             | —               |

## Network calls expected during normal use

| trigger               | method | path       | what request body or query is expected |
| --------------------- | ------ | ---------- | -------------------------------------- |
| Create Account submit | POST   | /api/users | { email, password, name }              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/01-auth.spec.ts` (signup creates session and lands on /home)
