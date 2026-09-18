# Page observations: /privacy

> Filled from a Playwright MCP walk of the live app at `http://localhost:3070/privacy`.
> Renders without auth — three real paragraphs covering data scope, retention,
> and privacy-contact email.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role      | expected behavior on interaction | success signal | failure signal                   |
| ------------------------------------------------------------------- | --------- | -------------------------------- | -------------- | -------------------------------- |
| `getByRole('heading', { name: /^Privacy$/ })`                       | heading   | renders page heading             | h1 visible     | missing                          |
| `getByText(/Refract stores only the data needed/)`                  | paragraph | data-scope paragraph             | text visible   | placeholder or empty             |
| `getByText(/Review history, custom rules, and webhook audit logs/)` | paragraph | retention paragraph              | text visible   | placeholder or empty             |
| `getByText(/privacy@example.com/)`                                  | paragraph | contact paragraph with email     | email visible  | placeholder or empty             |
| `page.evaluate(() => document.querySelectorAll('p').length)`        | n/a       | three real paragraphs            | count >= 3     | "Lorem ipsum" / fewer paragraphs |

## Hidden surfaces opened from this page

| trigger | what it opens                           | elements inside (selector / role / behavior) |
| ------- | --------------------------------------- | -------------------------------------------- |
| (none)  | privacy page has no interactive surface | n/a                                          |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
