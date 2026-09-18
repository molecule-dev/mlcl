# Page observations: / (Landing)

Public marketing page. Asserts hero copy, CTA links, and unauth nav.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name               | role           | expected behavior on interaction              | success signal                 | failure signal                          |
| ---------------------------------------- | -------------- | --------------------------------------------- | ------------------------------ | --------------------------------------- |
| hero heading "Stillpoint" / hero subhead | heading        | render the marketing hero with the brand name | heading visible above the fold | blank/landing 5xx                       |
| `getByRole("link", { name: /get started  | start free     | sign up/i })`                                 | link                           | navigates to /signup                    | URL becomes /signup, signup form rendered | URL unchanged or 404 |
| `getByRole("link", { name: /^sign in$    | ^log in$/i })` | link                                          | navigates to /login            | URL becomes /login, login form rendered | URL unchanged or 404                      |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside (selector / role / behavior) |
| ------------------ | ------------- | -------------------------------------------- |
| (none — flat page) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path | what request body or query is expected         |
| ------------ | ------ | ---- | ---------------------------------------------- |
| initial load | GET    | /    | 200 with Landing HTML — no /api calls expected |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
