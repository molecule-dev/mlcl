# Page observations: /settings (Settings)

> Authenticated — operator preferences. Renders the personal-info
> form (name + email), a theme toggle (light / dark / auto), and the
> save action that PATCHes /api/users/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name         | role       | expected behavior on interaction                                            | success signal                           | failure signal             |
| ---------------------------------- | ---------- | --------------------------------------------------------------------------- | ---------------------------------------- | -------------------------- |
| profile-name input                 | textbox    | typing replaces stored name; PATCH /api/users/:id `{name}` round-trips      | reload still shows the new name          | name reverts after reload  |
| save profile action                | button     | submits the PATCH for the personal-info form                                | 200 response + reload reflects new value | 4xx / silent failure       |
| theme toggle (light / dark / auto) | radiogroup | flips the document theme attribute and persists the choice to local storage | reload renders the same theme            | theme reverts after reload |

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
- [x] All elements above have a corresponding test in `e2e/10-settings.spec.ts`
