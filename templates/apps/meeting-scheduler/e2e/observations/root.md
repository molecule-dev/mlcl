# Page observations: / (Landing)

Public landing page; verified live by driving the rendered DOM at $APP_BASE/.

Source: this page was driven live at `http://localhost:$VITE_PORT/`
via Playwright + the matching `e2e/root.spec.ts`. Every row below
corresponds to an element with at least one passing test that exercises
its real outcome (network call, DB invariant, navigation, content visibility).

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                                                      | role    | expected behavior on interaction       | success signal                    | failure signal              |
| ------------------------------------------------------------------------------- | ------- | -------------------------------------- | --------------------------------- | --------------------------- |
| `getByRole("link", { name: /Meridian/i })` in `<nav>`                           | link    | navigates to the brand home            | navbar Meridian link is visible   | link missing or 404         |
| `getByRole("link", { name: /Create your booking link/i })`                      | link    | sends visitor to /signup               | href ends in /signup              | link absent or wrong target |
| `getByRole("link", { name: /See pricing/i })`                                   | link    | sends visitor to /pricing              | href ends in /pricing             | link absent or wrong target |
| `getByRole("link", { name: /Start scheduling/i })`                              | link    | CTA — navigates to /signup             | URL becomes /signup               | no navigation or 404        |
| `getByRole("heading", { name: /availability\|booking links\|calendar sync/i })` | heading | feature cards describe the value props | all three feature headings render | feature heading missing     |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — page surfaces are flat) | —             | —                                            |

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
