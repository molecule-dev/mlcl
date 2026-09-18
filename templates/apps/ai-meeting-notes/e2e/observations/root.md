# Page observations: / (Landing)

> Public marketing page rendered for unauthenticated visitors. Hero +
> feature trio + final CTA. Captured anonymously via Playwright walk.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role                      | expected behavior on interaction        | success signal        | failure signal                 |
| ---------------------------------------------------------- | ------------------------- | --------------------------------------- | --------------------- | ------------------------------ |
| `getByRole('link', { name: /^Sign in$/i })`                | link                      | nav to /login                           | URL becomes `/login`  | stays on `/`                   |
| `getByRole('link', { name: /try free                       | get started/i }).first()` | link                                    | nav to /signup        | URL becomes `/signup`          | stays on `/`     |
| `getByRole('link', { name: /start free trial/i })`         | link                      | nav to /signup (hero CTA)               | URL becomes `/signup` | stays on `/`                   |
| `getByRole('link', { name: /watch.*tour/i })`              | link                      | nav to /login (90-second tour fallback) | URL becomes `/login`  | 404                            |
| `getByRole('heading', { name: /capture every meeting/i })` | heading                   | top-of-page hero copy renders           | `h1` visible          | hero missing                   |
| `getByText(/12k                                            | 900\+                     | 4\.9/i)`                                | static stat block     | stat copy visible in hero list | numbers rendered | empty list |

## Hidden surfaces opened from this page

| trigger                           | what it opens | elements inside |
| --------------------------------- | ------------- | --------------- |
| (none — landing is fully visible) | —             | —               |

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
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
