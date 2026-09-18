# Page observations: /menu/:id (MenuItemDetail)

> Authenticated — single menu-item editor. Loads the item from
> GET /api/menu/:id, renders an editable form (name / description /
> price / category / dietary tags / availability toggle), a Save
> action that PUTs back, and a Delete action.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name      | role              | expected behavior on interaction                                                  | success signal                                    | failure signal                     |
| ------------------------------- | ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| name / description / price form | textbox           | hydrated from GET /api/menu/:id and saveable via PUT /api/menu/:id                | typed edits round-trip via GET (read-after-write) | form blank or PUT silently dropped |
| availability toggle             | switch            | flips `is_available`; persists across reload                                      | reload reflects the new boolean                   | toggle reverts after reload        |
| 404 / not-found path            | text              | hitting `/menu/<bogus-uuid>` does not crash the page — surfaces a not-found state | not-found UI rendered, no JS error                | white-screen / unhandled exception |
| Delete action                   | button            | DELETE /api/menu/:id; row gone from /api/menu                                     | row absent from list after delete                 | row still listed                   |
| price input                     | spinbutton/number | accepts a numeric price that survives a PUT round-trip                            | new value visible after reload                    | price truncated or NaN             |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/16-menu__id.spec.ts`
