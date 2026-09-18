# Page observations: /portfolio (holdings list + add modal)

> Filled by AI agent driving the running app via Playwright MCP.
> Maps to `e2e/portfolio.spec.ts`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role          | expected behavior on interaction                                                                                | success signal                                                              | failure signal                   |
| ------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| `getByRole('link', { name: /Bitcoin/ })` + tbody allocation cells   | links + cells | seeded portfolio renders with at least one allocation percentage > 0                                            | BTC link visible AND `\d+\.\d+%` appears in some cell                       | empty rows / 0% allocations      |
| `getByTestId('portfolio-add-holding')` → modal `portfolio-add-form` | button + form | opens modal; POST `/api/portfolio` with `{symbol, amount, cost_basis_usd}` adds new row; persists across reload | new symbol visible in table AND in GET `/api/portfolio` AND survives reload | modal stays open / row not in DB |
| POST `/api/portfolio` with already-held symbol                      | endpoint      | folds amount into existing position (no 500, no duplicate row)                                                  | response < 400 AND afterAmount > beforeAmount on GET `/api/portfolio`       | 500 OR duplicate symbol row      |

## Hidden surfaces opened from this page

| trigger                                 | what it opens                                            | elements inside (selector / role / behavior)                                                       |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `[data-testid="portfolio-add-holding"]` | "Add holding" modal `[data-testid="portfolio-add-form"]` | symbol text input, amount number input, cost-basis number input, save button (POST /api/portfolio) |

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
- [x] All elements above have a corresponding test in `e2e/portfolio.spec.ts`
