# Page observations: / (Landing)

> Captured anonymously — public marketing landing for Clarion (AI data analyst).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal         | failure signal |
| --------------------------------------------------- | ------- | -------------------------------- | ---------------------- | -------------- |
| `getByRole('heading', { level: 1 }).first()`        | heading | renders the hero headline        | visible                | missing        |
| `getByRole('link', { name: /try free/i }).first()`  | link    | nav to /signup                   | URL becomes `/signup`  | stays on `/`   |
| `getByRole('link', { name: /^sign in$/i }).first()` | link    | nav to /login                    | URL becomes `/login`   | stays on `/`   |
| `getByRole('link', { name: /pricing/i }).first()`   | link    | nav to /pricing                  | URL becomes `/pricing` | stays on `/`   |

## Hidden surfaces opened from this page

| trigger                                | what it opens | elements inside |
| -------------------------------------- | ------------- | --------------- |
| (none — landing page is fully visible) | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                                         | expected body |
| --------- | ------ | -------------------------------------------- | ------------- |
| Page load | GET    | (none — static marketing page, no API calls) | —             |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/01-root.spec.ts`
