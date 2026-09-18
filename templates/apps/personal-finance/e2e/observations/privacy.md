# Page observations: /privacy (Privacy)

> Walked via Playwright on a fresh smoke-app at http://localhost:3010/privacy.
> Static legal page rendered by @molecule/app-legal-pages-react PrivacyPage.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction            | success signal                  | failure signal         |
| -------------------------------------------- | ------- | ------------------------------------------- | ------------------------------- | ---------------------- |
| `getByRole('heading', { name: /privacy/i })` | heading | renders the page title                      | heading visible                 | nothing rendered / 404 |
| `getByText(/Emerald Ledger collects only/i)` | text    | renders the Ledger-specific intro paragraph | intro visible (not boilerplate) | placeholder text shown |
| `getByText(/financial data/i)`               | text    | mentions financial data scope               | text visible                    | text missing           |
| `getByText(/sell or share/i)`                | text    | data-handling commitment line               | text visible                    | text missing           |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
