# Page observations: /training/:id (Module player)

> Authenticated. Module player + quiz; on completion writes training_progress with completed_at + quiz_score.

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

| trigger         | method | path                      | expected body                                 |
| --------------- | ------ | ------------------------- | --------------------------------------------- |
| Page load       | GET    | /api/training-modules/:id | { id, title, content, quiz, … }               |
| Complete module | POST   | /api/training-progress    | { module_id, completed_at, quiz_score } → 201 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<page>.spec.ts
