# Page observations: / (Landing)

Source for these rows: I drove the live app at http://localhost:3070/
via Playwright + e2e/root.spec.ts. Every row below corresponds to an
element in the page that has at least one passing test that exercises
its real outcome (navigation, content visibility, in-page anchor).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                             | role    | expected behavior on interaction            | success signal                                  | failure signal                            |
| -------------------------------------------------------------------------------------- | ------- | ------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| `getByRole('link', { name: /sign in/i })`                                              | link    | navigates to /login                         | URL becomes /login, email input is visible      | URL unchanged or 404                      |
| `getByRole('link', { name: /(start trial\|request access\|create.*account)/i })` first | link    | navigates to /signup                        | URL becomes /signup                             | URL unchanged                             |
| `getByRole('link', { name: /create.*account/i })` last                                 | link    | navigates to /signup from footer            | URL becomes /signup                             | URL unchanged                             |
| `getByRole('link', { name: /^features$/i })`                                           | link    | scrolls to in-page #features anchor         | URL still ends with `/`, no navigation away     | URL changes to /features (would be wrong) |
| hero h1                                                                                | heading | renders the brand value prop on first paint | h1 visible, no console errors during navigation | h1 missing or page errors in console      |

## Hidden surfaces opened from this page

| trigger                       | what it opens | elements inside (selector / role / behavior) |
| ----------------------------- | ------------- | -------------------------------------------- |
| (none — landing page is flat) | —             | —                                            |

## Network calls expected during normal use

| trigger                         | method | path           | what request body or query is expected |
| ------------------------------- | ------ | -------------- | -------------------------------------- |
| initial page load               | GET    | / (HTML shell) | none (static)                          |
| (no API calls — public landing) | —      | —              | —                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
