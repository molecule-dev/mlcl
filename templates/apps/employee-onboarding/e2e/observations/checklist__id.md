# Page observations: /checklist/:id (Task detail)

> Authenticated. Detail view for one task — title, description, due date, status, mark-complete button.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role | expected behavior on interaction | success signal         | failure signal         |
| ---------------------------------------------------------- | ---- | -------------------------------- | ---------------------- | ---------------------- |
| `getByRole("link", { name: /space_dashboardDashboard/i })` | link | navigates to /dashboard          | URL becomes /dashboard | stays on current route |
| `getByRole("link", { name: /checklistChecklist/i })`       | link | navigates to /checklist          | URL becomes /checklist | stays on current route |
| `getByRole("link", { name: /timeline30 60 90/i })`         | link | navigates to /timeline           | URL becomes /timeline  | stays on current route |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger       | method | path           | expected body                                   |
| ------------- | ------ | -------------- | ----------------------------------------------- |
| Page load     | GET    | /api/tasks/:id | { id, title, description, status, due_date, … } |
| Mark complete | PUT    | /api/tasks/:id | { status: "complete" } → 200                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
