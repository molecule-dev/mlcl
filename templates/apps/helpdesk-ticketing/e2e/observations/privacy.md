# Page observations: /privacy (Privacy policy)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3240 / API_PORT=4240`. Verified against the rendered DOM
> (`scripts/_walk-helpdesk-ticketing.mjs` snapshot dump).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name     | role          | expected behavior on interaction                            | success signal                        | failure signal      |
| ------------------------------ | ------------- | ----------------------------------------------------------- | ------------------------------------- | ------------------- |
| `getByRole("heading").first()` | heading       | privacy page heading paints                                 | visible                               | absent              |
| policy body content            | main          | long-form policy text renders (≥1KB body length)            | document.body.innerText.length > 1000 | empty / placeholder |
| back link                      | link          | a link returns the user to / or /login                      | navigates away on click               | no link present     |
| `getByRole("link")` count      | list of links | at least one outgoing link (terms / contact / sign in)      | locator('a').count() > 0              | zero links          |
| no role=alert                  | region        | privacy is reachable without throwing the RootErrorBoundary | role=alert count is 0                 | role=alert visible  |

## Hidden surfaces opened from this page

| trigger                                                 | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — primary affordances are visible above the fold) | —             | —                                            |

## Network calls expected during normal use

<!-- Static page; no API calls during normal browsing. -->

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
