# Page observations: / (Landing)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                        | role | expected behavior on interaction | success signal        | failure signal |
| ----------------------------------------------------------------- | ---- | -------------------------------- | --------------------- | -------------- |
| getByRole('link', { name: /sign.*in/i }) (Sign in)                | link | navigates to /login              | URL contains /login   | URL unchanged  |
| getByRole('link', { name: /get.*started/i }) (Get started)        | link | navigates to /signup             | URL contains /signup  | URL unchanged  |
| getByRole('link', { name: /try.*the.*demo/i }) (Try the demo)     | link | navigates to /signup             | URL contains /signup  | URL unchanged  |
| getByRole('link', { name: /get.*started/i }) (Get Started)        | link | navigates to /signup             | URL contains /signup  | URL unchanged  |
| getByRole('link', { name: /upgrade.*to.*pro/i }) (Upgrade to Pro) | link | navigates to /signup             | URL contains /signup  | URL unchanged  |
| getByRole('link', { name: /contact.*sales/i }) (Contact Sales)    | link | navigates to /signup             | URL contains /signup  | URL unchanged  |
| getByRole('link', { name: /privacy/i }) (Privacy)                 | link | navigates to /privacy            | URL contains /privacy | URL unchanged  |
| getByRole('link', { name: /terms/i }) (Terms)                     | link | navigates to /terms              | URL contains /terms   | URL unchanged  |

## Hidden surfaces opened from this page

| trigger                                             | what it opens | elements inside (selector / role / behavior) |
| --------------------------------------------------- | ------------- | -------------------------------------------- |
| (none documented separately — keep flat list above) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
