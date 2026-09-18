# Page observations: /agents (Agents)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                                                                    | role   | expected behavior on interaction                          | success signal                                            | failure signal       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| getByRole('button', { name: /addnew.*persona/i }) (addNew persona)                                                                            | button | clicks "addNew persona"                                   | button responds (network call or UI update)               | no observable change |
| getByRole('link', { name: /upuntitled.*personano.*voi/i }) (UPUntitled personaNo voice setYou are a thoughtful, voice-native thinking partne) | link   | navigates to /agents/a5b7ece9-0366-4515-b778-40942df404f3 | URL contains /agents/a5b7ece9-0366-4515-b778-40942df404f3 | URL unchanged        |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path        | what request body or query is expected |
| -------------- | ------ | ----------- | -------------------------------------- |
| initial render | GET    | /api/agents | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/agents.spec.ts`
