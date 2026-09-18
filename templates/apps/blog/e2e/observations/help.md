# Page observations: /help (Help & FAQ)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/help. Anonymous-readable.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role      | expected behavior on interaction                              | success signal                                      | failure signal |
| -------------------------------------------------- | --------- | ------------------------------------------------------------- | --------------------------------------------------- | -------------- |
| `getByRole('heading', { name: /Help/, level: 1 })` | heading   | renders page title                                            | h1 visible                                          | not found      |
| `[data-mol-id="help-intro"]`                       | paragraph | shows intro copy                                              | non-empty body                                      | empty          |
| `[data-mol-id="help-faq-list"]`                    | container | renders 5 FAQ sections                                        | 5 children with data-mol-id starting with help-faq- | fewer than 5   |
| `[data-mol-id="help-faq-getting-started"]`         | section   | "publish your first post" FAQ                                 | section visible with question + answer              | missing        |
| `[data-mol-id="help-faq-analytics"]`               | section   | analytics FAQ                                                 | section visible                                     | missing        |
| `[data-mol-id="help-faq-rss"]`                     | section   | RSS feeds FAQ — must mention /api/feed/rss and /api/feed/json | answer text contains both endpoint paths            | missing        |
| `[data-mol-id="help-faq-pricing"]`                 | section   | Pro tier FAQ                                                  | section visible                                     | missing        |
| `[data-mol-id="help-faq-support"]`                 | section   | support contact FAQ                                           | section visible                                     | missing        |
| `getByRole('link', { name: 'Pricing' })` (footer)  | link      | navigates to /pricing (linked from Membership in footer)      | URL = /pricing                                      | URL stays      |

## Hidden surfaces opened from this page

| trigger       | what it opens                     | elements inside                               |
| ------------- | --------------------------------- | --------------------------------------------- |
| (anchor #rss) | scroll-to behaviour for /help#rss | the rss FAQ section becomes the scroll target |

## Network calls expected during normal use

| trigger   | method | path        | what request body or query is expected |
| --------- | ------ | ----------- | -------------------------------------- |
| page load | GET    | /help (SPA) | no /api fetches                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
