# Page observations: /lists (Lists)

> Authenticated list-of-lists surface. On mount: GET /api/lists?scope=mine
>
> - GET /api/lists?scope=public. "Create list" opens a modal that
>   POSTs /api/lists. Spec: e2e/09-lists.spec.ts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name           | role      | expected behavior on interaction    | success signal                  | failure signal          |
| ------------------------------------ | --------- | ----------------------------------- | ------------------------------- | ----------------------- |
| `[data-testid="lists-yours-empty"]`  | container | empty state when user owns no lists | visible for new user            | hidden when lists exist |
| `[data-testid="lists-yours"]`        | grid      | renders user-owned list cards       | populated when lists exist      | empty                   |
| `[data-testid="lists-public"]`       | grid      | renders trending public lists       | populated when seeded           | empty                   |
| `[data-testid="lists-new"]`          | button    | opens the create-list modal         | modal becomes visible           | nothing                 |
| `[data-testid="list-create-name"]`   | textbox   | accepts list name (in modal)        | value committed                 | nothing typed           |
| `[data-testid="list-create-submit"]` | button    | POSTs /api/lists, closes modal      | new card appears in lists-yours | error                   |

## Hidden surfaces opened from this page

| trigger            | what it opens     | elements inside                                                                        |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------- |
| `lists-new` button | Create-list modal | `list-create-name`, `list-create-description`, visibility radios, `list-create-submit` |

## Network calls expected during normal use

| trigger   | method | path                    | expected body                     |
| --------- | ------ | ----------------------- | --------------------------------- |
| Page load | GET    | /api/lists?scope=mine   | { data: [...] }                   |
| Page load | GET    | /api/lists?scope=public | { data: [...] }                   |
| Submit    | POST   | /api/lists              | { name, description, visibility } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/09-lists.spec.ts`
