# Page observations: /workflows (list)

> Authenticated workflow list. Lists every workflow_row owned by the user
> with its name, trigger_type, enabled state, run/success/failure counts.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role      | expected behavior on interaction | success signal         | failure signal                                 |
| ------------------------------------------- | --------- | -------------------------------- | ---------------------- | ---------------------------------------------- |
| `getByRole("heading", { level: 1 })`        | heading   | page heading visible             | visible                | empty                                          |
| `getByRole("link", { name: /new             | create    | add/i })`                        | link                   | navigates to /workflows/new or template picker | URL changes | stays |
| `[data-mol-id="workflows-search"]`          | searchbox | filters the list by name         | rows narrow            | unchanged                                      |
| `getByRole("link", { name: /templates/i })` | link      | navigates to /templates          | URL becomes /templates | stays                                          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path           | expected body                                           |
| --------- | ------ | -------------- | ------------------------------------------------------- |
| page load | GET    | /api/workflows | [ { id, name, trigger_type, enabled, run_count, ... } ] |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/05-workflows.spec.ts`
