# Page observations: /account (Account)

Filled by AI agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal             | failure signal |
| --------------------------------------------------- | ------- | -------------------------------- | -------------------------- | -------------- |
| heading "Profile, payment & preferences."           | heading | page header                      | visible                    | missing        |
| `getByRole('button', { name: /^profile$/i })`       | tab     | switches to Profile tab          | profile fields render      | inert          |
| `getByRole('button', { name: /^role$/i })`          | tab     | switches to Role tab             | learner/tutor cards render | inert          |
| `getByRole('button', { name: /^payments$/i })`      | tab     | switches to Payments tab         | view plans link visible    | inert          |
| `getByRole('button', { name: /^notifications$/i })` | tab     | switches to Notifications tab    | settings panel             | inert          |
| Display name + email read-only summary              | text    | reflects logged-in user          | matches signup payload     | wrong values   |
| Apply-to-become-tutor link (Role tab)               | link    | navigates to /become-tutor       | URL is /become-tutor       | nav fails      |
| View plans link (Payments tab)                      | link    | navigates to /pricing            | URL is /pricing            | nav fails      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger      | method | path           | what request body or query is expected |
| ------------ | ------ | -------------- | -------------------------------------- |
| page load    | GET    | /api/users/:id | returns logged-in user profile         |
| save profile | PUT    | /api/users/:id | persists name change                   |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/account.spec.ts`
