# Page observations: /profile

> Authenticated profile. Patches via PATCH /api/profile/me. API key creation returns one-time secret. Connected accounts upsert via PUT.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name     | role    | expected behavior on interaction                                         | success signal                  | failure signal |
| ------------------------------ | ------- | ------------------------------------------------------------------------ | ------------------------------- | -------------- |
| User email displayed read-only | text    | shows authenticated email                                                | email visible                   | empty          |
| Display-name input             | textbox | accepts a new display name; PATCH /api/profile/me persists across reload | reload shows new name           | name reverts   |
| Create API key button          | button  | creates a new API key; one-time secret returned                          | prefix listed                   | no key created |
| Sessions list section          | list    | GET /api/profile/sessions reports at least the current device            | ≥ 1 session visible             | empty          |
| Connected accounts section     | list    | PUT /api/profile/connected-accounts persists upsert                      | connection visible after reload | reverted       |

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
- [x] All elements above have a corresponding test in the matching e2e/<n>-profile.spec.ts
