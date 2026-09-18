# Page observations: /privacy (Privacy)

> Captured anonymously — static legal page, no API calls.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                          | role    | expected behavior on interaction    | success signal  | failure signal      |
| ------------------------------------------------------------------- | ------- | ----------------------------------- | --------------- | ------------------- |
| `getByRole('link', { name: /back to snagr/i })`                     | link    | nav to / (back to landing)          | URL becomes `/` | stays on `/privacy` |
| `getByRole('heading', { name: /privacy policy/i, level: 1 })`       | heading | renders the page title              | visible         | missing             |
| `getByRole('heading', { name: /what we collect/i, level: 2 })`      | heading | renders the data-collection section | visible         | missing             |
| `getByRole('heading', { name: /how we use your data/i, level: 2 })` | heading | renders the data-use section        | visible         | missing             |
| `getByRole('heading', { name: /your controls/i, level: 2 })`        | heading | renders the user-controls section   | visible         | missing             |

## Hidden surfaces opened from this page

| trigger                    | what it opens | elements inside |
| -------------------------- | ------------- | --------------- |
| (none — static legal page) | —             | —               |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
