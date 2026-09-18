# Page observations: /history (History)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                          | role    | expected behavior on interaction                           | success signal                                             | failure signal       |
| --------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- | ---------------------------------------------------------- | -------------------- |
| `input[placeholder*="Search"]` (placeholder=Search transcripts…)                                    | textbox | accepts user typed value (Search transcripts…)             | value retained                                             | input rejected       |
| getByRole('button', { name: /graphiceqvoice.*only/i }) (graphic_eqVoice only)                       | button  | clicks "graphic_eqVoice only"                              | button responds (network call or UI update)                | no observable change |
| getByRole('link', { name: /new.*conversation947.*pm.*0/i }) (New conversation9:47 PM· 00:00· 2 msg) | link    | navigates to /history/e1226e64-6051-4f9b-a221-bb05e3633525 | URL contains /history/e1226e64-6051-4f9b-a221-bb05e3633525 | URL unchanged        |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial render | GET    | /api/conversations | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/history.spec.ts`
