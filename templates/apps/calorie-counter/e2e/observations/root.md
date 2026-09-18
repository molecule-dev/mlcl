# Page observations: / (Landing)

Source: live walk via Playwright + e2e/root.spec.ts. Each row maps to
an element exercised by a passing test that asserts on the real outcome
(network call, navigation, or DOM state change).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                        | role                  | expected behavior on interaction                       | success signal             | failure signal          |
| ------------------------------------------------- | --------------------- | ------------------------------------------------------ | -------------------------- | ----------------------- |
| `getByRole("link", { name: /start free            | sign up/i }).first()` | link                                                   | navigates to /signup       | URL becomes /signup     | navigation fails |
| `getByRole("link", { name: /sign in/i }).first()` | link                  | navigates to /login                                    | URL becomes /login         | navigation fails        |
| Nosh wordmark in nav                              | link                  | self-link to / — clicking keeps URL on /               | URL stays /                | navigation fails or 404 |
| feature card grid                                 | list                  | three feature cards visible (Macros, Barcode, Recipes) | three cards visible in DOM | cards missing           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger                                                       | method | path | what request body or query is expected |
| ------------------------------------------------------------- | ------ | ---- | -------------------------------------- |
| _(none — fully static page; no backend interaction expected)_ |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
