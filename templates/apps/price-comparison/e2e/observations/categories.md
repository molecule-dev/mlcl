# Page observations: /categories (Categories)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name          | role      | expected behavior on interaction       | success signal            | failure signal |
| ----------------------------------- | --------- | -------------------------------------- | ------------------------- | -------------- |
| `[data-test=categories-page]` shell | container | page wrapper                           | rendered                  | not visible    |
| `[data-test=categories-grid]` grid  | grid      | renders one tile per active category   | ≥3 tiles after seed       | empty          |
| category tile link                  | link      | navigates to `/search?category=<name>` | URL contains `?category=` | dead link      |
| product count chip                  | label     | shows count from API                   | matches API count         | mismatch       |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path                          | what request body or query is expected |
| --------- | ------ | ----------------------------- | -------------------------------------- |
| page load | GET    | /api/products/meta/categories | none                                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/categories.spec.ts`
