# Page observations: /terms (Terms of service)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/terms. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                           | role      | expected behavior on interaction  | success signal     | failure signal |
| ---------------------------------------------------- | --------- | --------------------------------- | ------------------ | -------------- |
| `[data-mol-id="page-terms"]`                         | main      | wraps the terms page              | visible            | missing        |
| `getByRole('heading', { level: 1, name: /terms/i })` | heading   | renders page title                | visible            | missing        |
| `[data-mol-id="terms-effective"]`                    | paragraph | last-updated date                 | visible, non-empty | missing        |
| `[data-mol-id="terms-sections"]`                     | container | wraps 6 sub-sections              | visible            | missing        |
| `[data-mol-id="terms-eligibility"]`                  | section   | "Eligibility" body                | non-empty          | missing        |
| `[data-mol-id="terms-content"]`                      | section   | "Your content" body               | non-empty          | missing        |
| `[data-mol-id="terms-conduct"]`                      | section   | "Acceptable use" body             | non-empty          | missing        |
| `[data-mol-id="terms-billing"]`                      | section   | "Billing" body                    | non-empty          | missing        |
| `[data-mol-id="terms-termination"]`                  | section   | "Termination" body                | non-empty          | missing        |
| `[data-mol-id="terms-changes"]`                      | section   | "Changes to these terms" body     | non-empty          | missing        |
| Header logo link                                     | link      | navigates to /                    | URL becomes /      | unchanged      |
| Footer Privacy / Help / About links                  | link      | navigate to /privacy /help /about | URLs change        | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path               | what request body or query is expected |
| --------- | ------ | ------------------ | -------------------------------------- |
| page load | GET    | /terms (SPA route) | no /api fetches                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
