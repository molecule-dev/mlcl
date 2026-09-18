# Page observations: / (Landing)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                 | role       | expected behavior on interaction    | success signal          | failure signal  |
| ---------------------------------------------------------- | ---------- | ----------------------------------- | ----------------------- | --------------- |
| `nav` brand mark                                           | navigation | identify the app and link back to / | `nav` visible at top    | nav missing     |
| `nav a[href="/login"]` (Sign in)                           | link       | navigate to /login                  | URL becomes /login      | nav fails       |
| `nav a[href="/pricing"]` (Pricing)                         | link       | navigate to /pricing                | URL becomes /pricing    | nav fails       |
| `a[href="/signup"]` (hero CTA)                             | link       | navigate to /signup                 | URL becomes /signup     | nav fails       |
| Feature blocks (Stories / Creators / Realtime / Community) | region     | render the four feature cards       | all four titles visible | section missing |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

(static landing page; no API calls)

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
