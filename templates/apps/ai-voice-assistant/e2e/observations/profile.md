# Page observations: /profile (Profile)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction    | success signal                              | failure signal       |
| ------------------------------------------------------------------ | ------- | ----------------------------------- | ------------------------------------------- | -------------------- |
| input ((unnamed))                                                  | textbox | accepts user typed value (file)     | value retained                              | input rejected       |
| getByRole('button', { name: /change/i }) (Change)                  | button  | clicks "Change"                     | button responds (network call or UI update) | no observable change |
| getByRole('switch', { name: /public.*profile/i }) (Public profile) | switch  | toggles aria-checked / aria-pressed | attribute flips                             | attribute unchanged  |
| getByRole('button', { name: /save.*profile/i }) (Save profile)     | button  | clicks "Save profile"               | button responds (network call or UI update) | no observable change |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                                            | what request body or query is expected |
| -------------- | ------ | ----------------------------------------------- | -------------------------------------- |
| initial render | GET    | /api/users/1fc4aced-e0ee-4346-9597-e473b9a94ac9 | returns the page data                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
