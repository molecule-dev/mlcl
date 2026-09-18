# Page observations: /templates/:id

> Authenticated template detail. Shows the template's name/description/
> steps and an Install button.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role       | expected behavior on interaction | success signal                                                   | failure signal                     |
| ------------------------------------- | ---------- | -------------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `getByRole("heading", { level: 1 })`  | heading    | shows template name              | visible                                                          | empty                              |
| `getByRole("button", { name: /install | use/i })`  | button                           | POST /api/templates/:id/install + navigate to new /workflows/:id | URL changes to /workflows/<new id> | stays |
| `getByRole("link", { name: /templates | back/i })` | link                             | back to /templates                                               | URL becomes /templates             | stays |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger       | method | path                       | expected body                          |
| ------------- | ------ | -------------------------- | -------------------------------------- |
| page load     | GET    | /api/templates/:id         | { id, name, description, steps:[...] } |
| install click | POST   | /api/templates/:id/install | new workflow row 201                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-templatedetail.spec.ts`
