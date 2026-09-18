# Page observations: / (Landing)

> Filled from a live walk via Playwright MCP at /.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction       | success signal                   | failure signal |
| --------------------------------------------------- | ------- | -------------------------------------- | -------------------------------- | -------------- |
| Brand heading "Nimbus"                              | heading | render top of fold                     | visible                          | not visible    |
| `getByRole('link', { name: /get started/i })`       | link    | navigate to /signup                    | URL becomes /signup              | nav fails      |
| `getByRole('link', { name: /log in/i })`            | link    | navigate to /login                     | URL becomes /login               | nav fails      |
| `getByRole('link', { name: /pricing/i })` (anchor)  | link    | scroll to #pricing or stay on /        | hash navigation, page stays on / | hard nav off / |
| `getByRole('link', { name: /features/i })` (anchor) | link    | scroll to #features or stay on /       | hash navigation, page stays on / | hard nav off / |
| About-Nimbus footer link                            | link    | external nav to molecule.dev marketing | href contains molecule.dev       | dead link      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger           | method | path | what request body or query is expected |
| ----------------- | ------ | ---- | -------------------------------------- |
| Initial page load | GET    | /    | static HTML                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
