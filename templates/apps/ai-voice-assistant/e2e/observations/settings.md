# Page observations: /settings (Settings)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role   | expected behavior on interaction | success signal                              | failure signal       |
| --------------------------------------------------- | ------ | -------------------------------- | ------------------------------------------- | -------------------- |
| `[data-mol-id="settings-voice-alloy"]` (Alloycheck) | button | clicks "Alloycheck"              | button responds (network call or UI update) | no observable change |
| `[data-mol-id="settings-voice-echo"]` (Echo)        | button | clicks "Echo"                    | button responds (network call or UI update) | no observable change |
| `[data-mol-id="settings-voice-fable"]` (Fable)      | button | clicks "Fable"                   | button responds (network call or UI update) | no observable change |
| `[data-mol-id="settings-voice-onyx"]` (Onyx)        | button | clicks "Onyx"                    | button responds (network call or UI update) | no observable change |
| `[data-mol-id="settings-voice-nova"]` (Nova)        | button | clicks "Nova"                    | button responds (network call or UI update) | no observable change |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path               | what request body or query is expected |
| -------------- | ------ | ------------------ | -------------------------------------- |
| initial render | GET    | /api/speech/voices | returns the page data                  |
| initial render | GET    | /api/preferences   | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/settings.spec.ts`
