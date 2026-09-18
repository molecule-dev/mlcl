# Page observations: /settings (Settings)

> Filled by AI agent driving the running app on http://localhost:3020 with
> a just-signed-up user.

## Page state assumed

- (n/a) Public (no auth required), OR
- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name            | role    | expected behavior on interaction               | success signal                              | failure signal            |
| ------------------------------------- | ------- | ---------------------------------------------- | ------------------------------------------- | ------------------------- |
| `getByTestId("settings-profile")`     | section | profile card with name + email                 | visible card                                | card missing              |
| `getByTestId("settings-email")`       | text    | renders the user's real email                  | text == signup email                        | shows blank / wrong email |
| `getByTestId("settings-name")`        | text    | renders the user's display name (or "Not set") | matches user.name from signup               | shows blank when name set |
| `getByTestId("settings-plan")`        | section | plan card with current plan + Manage CTA       | visible card                                | card missing              |
| `getByTestId("settings-plan-key")`    | text    | shows current plan key (e.g. "free")           | text matches /api/billing/status .planKey   | shows wrong plan / blank  |
| `getByTestId("settings-manage-plan")` | link    | navigates to /pricing                          | href="/pricing"; clicking lands on /pricing | wrong href / 404          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger        | method | path                | what request body or query is expected               |
| -------------- | ------ | ------------------- | ---------------------------------------------------- |
| load /settings | GET    | /api/billing/status | response: { planKey, planExpiresAt, planAutoRenews } |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec file
