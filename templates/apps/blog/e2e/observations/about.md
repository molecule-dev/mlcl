# Page observations: /about (About)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/about. Anonymous-readable.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                    | role      | expected behavior on interaction | success signal        | failure signal   |
| ------------------------------------------------------------- | --------- | -------------------------------- | --------------------- | ---------------- |
| `getByRole('heading', { name: 'About WriteFlow', level: 1 })` | heading   | renders page title               | h1 visible            | not found        |
| `getByTestId('about-intro')` (data-mol-id)                    | paragraph | shows mission statement          | non-empty body text   | empty / missing  |
| `getByTestId('about-mission')`                                | paragraph | shows mission body               | non-empty body text   | empty / missing  |
| `getByTestId('about-features')`                               | list      | shows 4 product features         | 4 list items rendered | fewer than 4     |
| `getByTestId('about-contact')`                                | paragraph | shows contact CTA                | non-empty body text   | empty / missing  |
| `getByRole('link', { name: /WriteFlow/i })` (header logo)     | link      | navigates to /                   | URL becomes /         | URL stays /about |
| `getByRole('link', { name: 'Get started' })` (header)         | link      | navigates to /signup             | URL contains /signup  | URL stays        |
| `getByRole('link', { name: 'Privacy' })` (footer)             | link      | navigates to /privacy            | URL = /privacy        | URL stays /about |
| `getByRole('link', { name: 'Terms' })` (footer)               | link      | navigates to /terms              | URL = /terms          | URL stays /about |
| `getByRole('link', { name: 'Help' })` (footer)                | link      | navigates to /help               | URL = /help           | URL stays /about |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path                       | what request body or query is expected |
| --------- | ------ | -------------------------- | -------------------------------------- |
| page load | GET    | /about (SPA route, no API) | none — static page; no /api fetches    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/about.spec.ts`
