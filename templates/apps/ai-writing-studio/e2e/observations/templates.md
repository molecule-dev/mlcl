# Page observations: /templates (Templates)

> Filled by AI agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                        | role    | expected behavior on interaction                                                    | success signal                                                                                        | failure signal                                         |
| ----------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `getByRole('heading', { name: /^Templates$/i, level: 1 })`                                                        | heading | page title renders                                                                  | h1 visible                                                                                            | h1 missing                                             |
| `getByRole('button', { name: /^all$/i })` (filter chip)                                                           | button  | sets active category to "all"                                                       | `aria-pressed=true`; all templates visible                                                            | aria-pressed unchanged                                 |
| `getByRole('button', { name: /(newsletter\|essay\|marketing\|review\|interview\|changelog\|general)/i }).first()` | button  | filters cards to the chosen category                                                | `aria-pressed=true`; cards filtered                                                                   | aria-pressed unchanged                                 |
| `template card link` (`getByRole('link', { name: /.+/ }).filter({ hasText: /(.+)/ })` first card)                 | link    | navigates to `/documents/new?template=<id>` then redirects to `/documents/<new-id>` | URL becomes `/documents/<uuid>`; new doc instantiated from template body in `GET /api/documents/<id>` | URL stuck on `/documents/new` or template body missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger             | method | path                           | what request body or query is expected                         |
| ------------------- | ------ | ------------------------------ | -------------------------------------------------------------- |
| initial render      | GET    | /api/templates                 | returns array of system templates seeded on first render       |
| template card click | POST   | /api/templates/:id/instantiate | empty body → 201 with `{ id }` and the template's body content |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/templates.spec.ts`
