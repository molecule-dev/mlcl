# Page observations: /dashboard (Dashboard)

> Filled from a Playwright MCP walk of the live app. Auth-required;
> the AuthGuard redirects anonymous visitors to `/login`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                     | role    | expected behavior on interaction                                                    | success signal                | failure signal                         |
| -------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------- |
| `getByRole('heading', { name: /Welcome back to the booth/i })` | heading | page hero h1 ("Welcome back to the booth")                                          | visible                       | missing                                |
| `getByRole('link', { name: /new project/i })`                  | link    | top-right CTA → `/projects` (where the create modal is opened)                      | URL becomes `/projects`       | stays on `/dashboard`                  |
| `getByText(/Studio overview/i)`                                | text    | eyebrow above h1                                                                    | visible                       | missing                                |
| `getByRole('heading', { name: /Recent projects/i })`           | heading | section heading for projects list                                                   | visible                       | missing                                |
| `getByRole('link', { name: /view all/i }).first()`             | link    | "View all" → `/projects`                                                            | URL = `/projects`             | stays on `/dashboard`                  |
| `getByRole('heading', { name: /Sample library highlights/i })` | heading | section heading for samples                                                         | visible                       | missing                                |
| `getByRole('link', { name: /browse the library/i })`           | link    | → `/samples`                                                                        | URL = `/samples`              | stays on `/dashboard`                  |
| empty-state cta                                                | link    | "Create your first project" link visible only when no projects exist; → `/projects` | URL = `/projects`             | empty-state misses CTA on fresh signup |
| anonymous `/dashboard`                                         | n/a     | `AuthGuard` redirects to `/login`                                                   | URL becomes `/login` (or `/`) | dashboard renders to anonymous         |

## Hidden surfaces opened from this page

| trigger                    | what it opens                                              | elements inside (selector / role / behavior) |
| -------------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| (none on dashboard itself) | sidebar/header live in `FugueLayout` and walked separately | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path            | what request body or query is expected |
| ------------ | ------ | --------------- | -------------------------------------- |
| initial load | GET    | `/api/projects` | owner-scoped projects list             |
| initial load | GET    | `/api/samples`  | sample library list (own + public)     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened (none on dashboard itself)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
