# Page observations: /decks/:id/present (Presenter)

> Captured live via Playwright on the running smoke-app at
> `http://localhost:3190${stem === 'root' ? '/' : '/' + stem.replace(/__/g, '/')}`

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role     | expected behavior on interaction                | success signal                 | failure signal    |
| ------------------------------------------- | -------- | ----------------------------------------------- | ------------------------------ | ----------------- |
| `getByTestId("present-slide")`              | region   | first slide is rendered after data loads        | visible                        | never appears     |
| `getByTestId("next-slide")`                 | button   | advance the active rail item                    | present-rail-1 becomes active  | unchanged         |
| ArrowRight / ArrowLeft                      | keyboard | advance / retreat the rail selection            | rail index changes             | no change         |
| `getByTestId("present-rail-N")`             | button   | jump directly to slide N                        | rail-N becomes active          | unchanged         |
| `getByTestId("fullscreen-btn")`             | button   | toggles fullscreen; aria-pressed reflects state | starts unpressed               | missing or stuck  |
| empty deck → `getByTestId("present-empty")` | text     | shown when the deck has no slides yet           | visible                        | crashes / missing |
| "Exit presenter" link                       | link     | returns to /decks/:id/edit                      | URL becomes /decks/<uuid>/edit | broken            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                            | what request body or query is expected |
| ------------ | ------ | ------------------------------- | -------------------------------------- |
| initial load | GET    | /api/slides?presentationId=<id> | slide list to render                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/decks__id_present.spec.ts`
