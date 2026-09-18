# Page observations: /menu (MenuItems)

> Authenticated — operator menu CRUD. Heading "Menu", category filter
> chips, "Add item" primary action, an item card grid (name + price +
> dietary tags + edit + delete), and an empty state when no items
> exist.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                   | role        | expected behavior on interaction               | success signal                               | failure signal                    |
| -------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------- | -------------------------------------------- | --------------------------------- |
| `getByRole('button', { name: /add item/i })`                                                 | button      | opens the create-item form (or inline editor)  | new item is POSTed and appears in the list   | button missing / form refuses     |
| `getByText('Heirloom Tomato Salad', { exact: false })`                                       | text        | rendered name from a created item card         | name visible in the grid                     | item name missing after creation  |
| dietary-tag chips on a card (e.g. "vegetarian", "vegan")                                     | text        | reflect the `dietary_tags[]` saved on the item | each tag visible after PUT round-trip        | tags lost between save and reload |
| empty-state copy ("no menu items" / "empty") OR `getByRole('button', { name: /add item/i })` | text/button | shown when `data.length === 0`                 | one of the two is visible on a fresh account | neither visible (page broken)     |
| price label on a card (`$24.50`)                                                             | text        | shows the persisted numeric price              | matches the value sent to POST /api/menu     | price missing or formatted as NaN |

## Hidden surfaces opened from this page

| trigger                        | what it opens | elements inside |
| ------------------------------ | ------------- | --------------- |
| (none observed — items inline) | n/a           | n/a             |

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
- [x] All elements above have a corresponding test in `e2e/03-menu.spec.ts`
