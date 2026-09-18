# Page observations: / (Landing)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                       | role    | expected behavior on interaction | success signal     | failure signal  |
| -------------------------------------------------------------------------------- | ------- | -------------------------------- | ------------------ | --------------- |
| `getByRole('link', { name: 'Plume' })` (top nav brand)                           | link    | scrolls to top                   | URL stays at `/`   | broken link     |
| `getByRole('link', { name: /^Sign in$/i })` (top nav)                            | link    | navigates to /login              | URL is `/login`    | URL unchanged   |
| `getByRole('link', { name: /Start writing/i })` (top nav CTA)                    | link    | navigates to /signup             | URL is `/signup`   | URL unchanged   |
| `getByRole('link', { name: /Start your free trial/i })` (hero CTA)               | link    | navigates to /signup             | URL is `/signup`   | URL unchanged   |
| `getByRole('link', { name: /See it in action/i })` (hero secondary)              | link    | navigates to /login              | URL is `/login`    | URL unchanged   |
| `getByRole('link', { name: /Start with this plan/i }).first()` (Starter pricing) | link    | navigates to /signup             | URL is `/signup`   | URL unchanged   |
| `getByRole('link', { name: /Privacy/i })` (footer)                               | link    | navigates to /privacy            | URL is `/privacy`  | URL unchanged   |
| `getByRole('link', { name: /Terms/i })` (footer)                                 | link    | navigates to /terms              | URL is `/terms`    | URL unchanged   |
| `getByRole('heading', { name: /Intelligence meets eloquence/i })`                | heading | renders hero title               | heading is visible | heading missing |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside (selector / role / behavior) |
| --------------- | ------------- | -------------------------------------------- |
| (none observed) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

<!-- no network calls observed during normal use -->

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
