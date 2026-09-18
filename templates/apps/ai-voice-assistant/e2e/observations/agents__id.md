# Page observations: /agents/:id (Agent detail)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                  | role   | expected behavior on interaction | success signal                              | failure signal       |
| --------------------------------------------------------------------------- | ------ | -------------------------------- | ------------------------------------------- | -------------------- |
| getByRole('link', { name: /arrowbackall.*agents/i }) (arrow_backAll agents) | link   | navigates to /agents             | URL contains /agents                        | URL unchanged        |
| `[data-mol-id="agent-voice-alloy"]` (AlloyAlloy)                            | button | clicks "AlloyAlloy"              | button responds (network call or UI update) | no observable change |
| `[data-mol-id="agent-voice-echo"]` (EchoEcho)                               | button | clicks "EchoEcho"                | button responds (network call or UI update) | no observable change |
| `[data-mol-id="agent-voice-fable"]` (FableFable)                            | button | clicks "FableFable"              | button responds (network call or UI update) | no observable change |
| `[data-mol-id="agent-voice-onyx"]` (OnyxOnyx)                               | button | clicks "OnyxOnyx"                | button responds (network call or UI update) | no observable change |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                                             | what request body or query is expected |
| -------------- | ------ | ------------------------------------------------ | -------------------------------------- |
| initial render | GET    | /api/speech/voices                               | returns the page data                  |
| initial render | GET    | /api/agents/a5b7ece9-0366-4515-b778-40942df404f3 | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/agents__id.spec.ts`
