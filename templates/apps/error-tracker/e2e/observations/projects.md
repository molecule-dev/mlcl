# Page observations: /projects

> Authenticated projects list. New-project dialog posts to /api/projects.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role    | expected behavior on interaction                               | success signal                       | failure signal       |
| -------------------------------------- | ------- | -------------------------------------------------------------- | ------------------------------------ | -------------------- |
| Project rows from /api/projects-health | list    | renders 2 seeded projects                                      | project names visible                | empty                |
| "New project" button                   | button  | opens the create-project dialog and submits POST /api/projects | created project visible after reload | stays / dialog stuck |
| Project name input (within dialog)     | textbox | accepts the new project name                                   | value reflected                      | submission rejected  |

## Hidden surfaces opened from this page

| trigger             | what it opens         | elements inside            |
| ------------------- | --------------------- | -------------------------- |
| Click "New project" | create-project dialog | name field + submit button |

## Network calls expected during normal use

| trigger            | method | path          | expected body         |
| ------------------ | ------ | ------------- | --------------------- |
| Submit new project | POST   | /api/projects | { name, projectType } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-projects.spec.ts
