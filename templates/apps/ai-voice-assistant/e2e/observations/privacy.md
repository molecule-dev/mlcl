# Page observations: /privacy (Privacy)

> Filled from live `browser_snapshot` against the running app.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                            | role    | expected behavior on interaction               | success signal      | failure signal  |
| ----------------------------------------------------- | ------- | ---------------------------------------------- | ------------------- | --------------- |
| getByRole('heading', { name: /privacy policy/i })     | heading | renders hero h1                                | visible on /privacy | heading missing |
| getByText(/last updated/i)                            | text    | renders the last-updated stamp under the title | text visible        | absent          |
| getByRole('heading', { name: /what we collect/i })    | heading | section subheading rendered                    | visible on /privacy | heading missing |
| getByRole('heading', { name: /subprocessors/i })      | heading | section subheading rendered                    | visible on /privacy | heading missing |
| getByRole('heading', { name: /deleting your data/i }) | heading | section subheading rendered                    | visible on /privacy | heading missing |
| getByRole('link', { name: /back to home/i })          | link    | navigates to /                                 | URL becomes /       | URL unchanged   |

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
- [x] All elements above have a corresponding test in `e2e/privacy.spec.ts`
