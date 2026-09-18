# Page observations: /help (Help)

> Filled from a live walk via Playwright MCP at /help.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name | role    | expected behavior on interaction | success signal        | failure signal               |
| -------------------------- | ------- | -------------------------------- | --------------------- | ---------------------------- |
| Page heading               | heading | renders the marketing about page | first heading visible | nothing renders              |
| Body copy paragraph(s)     | text    | static prose explaining Nimbus   | visible content       | empty or default placeholder |
| Back-to-home link          | link    | navigate to /                    | URL becomes /         | nav fails                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger   | method | path     | what request body or query is expected |
| --------- | ------ | -------- | -------------------------------------- |
| Page load | GET    | / (HTML) | static page; no API calls expected     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/help.spec.ts`
