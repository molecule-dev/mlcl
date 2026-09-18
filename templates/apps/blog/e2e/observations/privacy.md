# Page observations: /privacy (Privacy policy)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/privacy. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                             | role      | expected behavior on interaction | success signal     | failure signal |
| ------------------------------------------------------ | --------- | -------------------------------- | ------------------ | -------------- |
| `[data-mol-id="page-privacy"]`                         | main      | wraps the privacy page           | visible            | missing        |
| `getByRole('heading', { level: 1, name: /privacy/i })` | heading   | renders page title               | visible            | missing        |
| `[data-mol-id="privacy-effective"]`                    | paragraph | last-updated date                | visible, non-empty | missing        |
| `[data-mol-id="privacy-sections"]`                     | container | wraps 5 sub-sections             | visible            | missing        |
| `[data-mol-id="privacy-collect"]`                      | section   | "What we collect" body           | non-empty          | missing        |
| `[data-mol-id="privacy-use"]`                          | section   | "How we use your data" body      | non-empty          | missing        |
| `[data-mol-id="privacy-cookies"]`                      | section   | cookies / tracking body          | non-empty          | missing        |
| `[data-mol-id="privacy-rights"]`                       | section   | "Your rights" body               | non-empty          | missing        |
| `[data-mol-id="privacy-updates"]`                      | section   | policy-updates body              | non-empty          | missing        |
| Header logo link                                       | link      | navigates to /                   | URL becomes /      | unchanged      |
| Footer Terms / Help / About links                      | link      | navigate to /terms /help /about  | URLs change        | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected |
| --------- | ------ | -------------------- | -------------------------------------- |
| page load | GET    | /privacy (SPA route) | no /api fetches                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
