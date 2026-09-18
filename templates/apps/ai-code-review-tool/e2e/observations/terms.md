# Page observations: /terms

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/terms`.
> Renders without auth — three real paragraphs, no placeholder filler.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                   | role      | expected behavior on interaction             | success signal                  | failure signal                           |
| ------------------------------------------------------------ | --------- | -------------------------------------------- | ------------------------------- | ---------------------------------------- |
| `getByRole('heading', { name: /Terms of Service/ })`         | heading   | renders page heading                         | h1 visible                      | missing                                  |
| `getByText(/By using Refract you agree/)`                    | paragraph | first body paragraph (responsibility clause) | non-empty text matching pattern | placeholder or empty                     |
| `getByText(/scan repositories you do not own/)`              | paragraph | second paragraph (acceptable-use clause)     | non-empty text matching pattern | placeholder or empty                     |
| `getByText(/legal@example.com/)`                             | paragraph | third paragraph (contact email)              | email visible                   | placeholder or empty                     |
| `page.evaluate(() => document.querySelectorAll('p').length)` | n/a       | three real paragraphs                        | count >= 3                      | "Lorem ipsum" / "TBD" / fewer paragraphs |

## Hidden surfaces opened from this page

| trigger | what it opens                         | elements inside (selector / role / behavior) |
| ------- | ------------------------------------- | -------------------------------------------- |
| (none)  | terms page has no interactive surface | n/a                                          |

## Network calls expected during normal use

| trigger      | method | path   | what request body or query is expected |
| ------------ | ------ | ------ | -------------------------------------- |
| initial load | (none) | (none) | static page; zero `/api/*` traffic     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed (none)
- [x] Every form has every field documented (no forms)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/terms.spec.ts`
