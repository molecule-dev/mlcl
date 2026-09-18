# Page observations: /history/:id (History detail)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                  | role   | expected behavior on interaction    | success signal                              | failure signal       |
| ------------------------------------------------------------------------------------------- | ------ | ----------------------------------- | ------------------------------------------- | -------------------- |
| getByRole('link', { name: /arrowbackback.*to.*history/i }) (arrow_backBack to history)      | link   | navigates to /history               | URL contains /history                       | URL unchanged        |
| getByRole('button', { name: /play.*playback/i }) (Play playback)                            | button | clicks "Play playback"              | button responds (network call or UI update) | no observable change |
| getByRole('button', { name: /set.*playback.*speed.*to.*1/i }) (Set playback speed to 1×)    | button | clicks "Set playback speed to 1×"   | button responds (network call or UI update) | no observable change |
| getByRole('button', { name: /set.*playback.*speed.*to.*15/i }) (Set playback speed to 1.5×) | button | clicks "Set playback speed to 1.5×" | button responds (network call or UI update) | no observable change |
| getByRole('button', { name: /set.*playback.*speed.*to.*2/i }) (Set playback speed to 2×)    | button | clicks "Set playback speed to 2×"   | button responds (network call or UI update) | no observable change |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                                                    | what request body or query is expected |
| -------------- | ------ | ------------------------------------------------------- | -------------------------------------- |
| initial render | GET    | /api/conversations/e1226e64-6051-4f9b-a221-bb05e3633525 | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/history__id.spec.ts`
