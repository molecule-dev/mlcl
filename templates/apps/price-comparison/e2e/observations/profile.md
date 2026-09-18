# Page observations: /profile (Profile)

> Filled by the dispatch-flagship agent driving the running app via Playwright.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                      | role      | expected behavior on interaction          | success signal                       | failure signal    |
| ----------------------------------------------- | --------- | ----------------------------------------- | ------------------------------------ | ----------------- |
| `[data-test=profile-page]` shell                | container | page wrapper                              | rendered                             | empty             |
| `[data-test=profile-display-name]` name heading | heading   | shows useAuth().user.name                 | name displayed                       | empty/missing     |
| `[data-test=profile-savings]` lifetime savings  | text      | sum across watchlist (list - best)        | dollars rendered                     | mismatch          |
| `[data-test=profile-share]` share button        | button    | navigator.share or clipboard write        | `Link copied` / native share         | nothing happens   |
| `[data-test=profile-achievements]` grid         | grid      | 4 milestone cards                         | 4 visible (some earned/some pending) | empty             |
| `[data-test=profile-watches-grid]` watch grid   | grid      | up to 6 watched cards from /api/watchlist | ≥1 after add                         | empty when seeded |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path           | what request body or query is expected |
| --------- | ------ | -------------- | -------------------------------------- |
| page load | GET    | /api/watchlist | auth header only                       |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
