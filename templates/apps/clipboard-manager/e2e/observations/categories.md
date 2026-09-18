# Page observations: /categories (Categories)

Source: live walk via Playwright + e2e/categories.spec.ts. CRUD list
backed by `/api/categories`. Form lets the user pick a name + one of
seven preset icons + one of seven preset colors. Each category row
exposes Edit / Delete buttons.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                                         | role    | expected behavior on interaction               | success signal                                | failure signal              |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------- | --------------------------------------------- | --------------------------- |
| Page heading + initial fetch                                       | heading | renders heading + GET /api/categories on mount | heading visible + 200                         | heading missing or no fetch |
| `New category` button + inline form (name + icon + color swatches) | button  | reveals form with all inputs                   | `#category-name` + icon/color buttons visible | form not revealed           |
| `Create category` submit                                           | button  | POST /api/categories with read-after-write     | row appears in list                           | row missing                 |
| Row `Edit` button → save                                           | button  | PATCH /api/categories/:id                      | API row.name matches new value                | unchanged                   |
| Row `Delete` button                                                | button  | DELETE /api/categories/:id                     | GET /:id returns 404                          | row remains                 |
| Empty-state copy `No categories yet…`                              | text    | shown for new account                          | visible                                       | missing                     |

## Network calls expected during normal use

| trigger      | method | path                | what request body or query is expected |
| ------------ | ------ | ------------------- | -------------------------------------- |
| initial load | GET    | /api/categories     | 200 with array of category rows        |
| create       | POST   | /api/categories     | `{name, icon, color}` → 201            |
| edit         | PATCH  | /api/categories/:id | `{name, icon, color}` → 200            |
| delete       | DELETE | /api/categories/:id | → 204                                  |

## Coverage check (final pass)

- [x] Navigated, snapshotted, listed, then re-navigated
- [x] Form fields documented (name + icon + color + cancel + submit)
- [x] All three CRUD paths tested with read-after-write
- [x] Empty-state observed
- [x] All elements above have a corresponding test in `e2e/categories.spec.ts`
