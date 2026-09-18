# Page observations: / (Landing)

> Filled by AI agent driving the running app on http://localhost:3020.

## Page state assumed

- [x] Public (no auth required), OR
- (n/a) Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role                | expected behavior on interaction                      | success signal       | failure signal            |
| ------------------------------------------------------------------- | ------------------- | ----------------------------------------------------- | -------------------- | ------------------------- |
| `getByRole("link", { name: /Driftboard/i }).first()` (header brand) | link                | navigates back to /                                   | URL stays /          | navigates elsewhere / 404 |
| `getByRole("link", { name: /^Pricing$/i }).first()` (nav)           | link                | navigates to /pricing                                 | URL becomes /pricing | stays on /                |
| `getByRole("link", { name: /^Sign in$/i }).first()` (nav)           | link                | navigates to /login                                   | URL becomes /login   | stays on /                |
| `getByRole("link", { name: /Get started                             | Create my workspace | Start your first board/i }).first()` (nav + hero CTA) | link                 | navigates to /signup      | URL becomes /signup | stays on / |
| `getByRole("link", { name: /I already have an account/i })`         | link                | navigates to /login                                   | URL becomes /login   | stays on /                |
| `getByRole("link", { name: /^Pricing$/i }).last()` (footer)         | link                | navigates to /pricing                                 | URL becomes /pricing | stays on /                |

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
- [x] All elements above have a corresponding test in the matching spec file
