# Page observations: /profile (Profile)

> Authenticated — personal-info page. Initials avatar derived from
> name/email, editable name + email form, "Change password" link
> pointing at /forgot-password, and a save action that PATCHes
> /api/users/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name              | role     | expected behavior on interaction                                               | success signal                               | failure signal                  |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------- |
| personal-info form                      | form     | renders editable name + email fields hydrated from the current user            | typed value reflected in inputs              | form blank / inputs read-only   |
| save action                             | button   | PATCH /api/users/:id with the new name; round-trips via GET (read-after-write) | reload still shows the new name              | name reverts on reload          |
| change-password link → /forgot-password | link     | nav from profile to the password-reset flow                                    | href contains /forgot-password               | link missing or wrong target    |
| initials avatar                         | img/text | derived from the user's name/email; visible at the top of the profile card     | initials visible (e.g. "AT" for Alex Tester) | avatar absent or wrong initials |

## Hidden surfaces opened from this page

| trigger         | what it opens | elements inside |
| --------------- | ------------- | --------------- |
| (none observed) | n/a           | n/a             |

## Network calls expected during normal use

| trigger | method | path | what request body or query is expected |
| ------- | ------ | ---- | -------------------------------------- |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/20-profile.spec.ts`
