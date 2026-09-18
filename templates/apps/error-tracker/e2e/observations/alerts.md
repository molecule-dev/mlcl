# Page observations: /alerts

> Authenticated alert rules. Pause via PUT, delete via DELETE, detail at /alerts/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role                 | expected behavior on interaction             | success signal              | failure signal  |
| ------------------------------------------------------- | -------------------- | -------------------------------------------- | --------------------------- | --------------- |
| Rule rows from /api/alerts                              | list                 | renders 3 seeded rules                       | rule names visible          | empty           |
| "New alert" button → POST /api/alerts                   | button               | creates a rule; appears in list after reload | rule visible                | no rule created |
| Pause action → PUT /api/alerts/:id { status: "paused" } | button               | persists status=paused                       | subsequent GET shows paused | still active    |
| Delete action → DELETE /api/alerts/:id                  | button (destructive) | removes the rule from /api/alerts            | rule absent                 | still present   |
| Rule row link to /alerts/:id                            | link                 | navigates to AlertDetail page                | URL becomes /alerts/[id]    | stays           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger | method | path | expected body |
| ------- | ------ | ---- | ------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-alerts.spec.ts
