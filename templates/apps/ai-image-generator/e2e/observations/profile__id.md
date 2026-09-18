# Page observations: /profile/:id (profile__id)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.
> Each row corresponds to a real DOM element observed in the rendered page,
> not derived from source-code reading.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role    | expected behavior on interaction | success signal                                          | failure signal  |
| --------------------------------------------------- | ------- | -------------------------------- | ------------------------------------------------------- | --------------- |
| `getByRole("heading", { level: 1 })` (display name) | heading | render creator display name      | visible non-empty heading                               | absent          |
| `getByRole("button", { name: /Follow/i })`          | button  | POST /api/profile/:id/follow     | request issued, button text flips to Unfollow/Following | no network call |
| `getByRole("heading", { name: /Public works/i })`   | heading | render public works section      | visible                                                 | absent          |
| `getByText(/@/)`                                    | text    | show user handle                 | visible @-prefixed handle                               | absent          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | (none)        | (none)                                       |

## Network calls expected during normal use

| trigger   | method | path         | what request body or query is expected |
| --------- | ------ | ------------ | -------------------------------------- |
| page load | GET    | /api/profile | (by id segment)                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile__id.spec.ts`
