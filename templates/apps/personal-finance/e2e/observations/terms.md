# Page observations: /terms (Terms)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/terms.
> Static legal page rendered by @molecule/app-legal-pages-react TermsPage.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction            | success signal                  | failure signal         |
| ------------------------------------------------------- | ------- | ------------------------------------------- | ------------------------------- | ---------------------- |
| `getByRole('heading', { name: /terms/i })`              | heading | renders the page title                      | heading visible                 | nothing rendered / 404 |
| `getByText(/These terms cover use of Emerald Ledger/i)` | text    | renders the Ledger-specific intro paragraph | intro visible (not boilerplate) | placeholder text shown |
| `getByText(/Free, Pro, and Team/i)`                     | text    | mentions the supported subscription tiers   | text visible                    | text missing           |
| `getByText(/sole owner of the financial records/i)`     | text    | data-ownership commitment line              | text visible                    | text missing           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
