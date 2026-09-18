# Page observations: /u/:username (UserProfile)

> Authenticated user profile page. Loads `/api/users/by-username/:username`.
> Renders an avatar/header card with badges + stats and a "Recent
> threads" list (ThreadRow components). Includes a Follow toggle.

## Page state assumed

- [x] Authenticated; tested by signing up a user and visiting their own
      profile via the username returned by the signup hook.

## Elements

| selector / accessible name                   | role    | expected behavior on interaction                   | success signal                               | failure signal              |
| -------------------------------------------- | ------- | -------------------------------------------------- | -------------------------------------------- | --------------------------- |
| header heading                               | heading | renders the user's display name                    | display_name visible (no Helena placeholder) | empty/placeholder           |
| `getByText(/Joined .+/)`                     | text    | renders the joined date                            | text visible                                 | shows raw `{{date}}`        |
| `getByText(/Reputation/i)`                   | text    | reputation stat label                              | label rendered                               | missing                     |
| `getByText(/Posts/i).first()`                | text    | post count stat                                    | label rendered                               | missing                     |
| `getByText(/Threads/i).first()`              | text    | thread count stat                                  | label rendered                               | missing                     |
| `getByText(/Solutions/i)`                    | text    | solutions stat                                     | label rendered                               | missing                     |
| `getByText(/Followers/i)`                    | text    | followers stat                                     | label rendered                               | missing                     |
| `getByRole('button', { name: /Follow/i })`   | button  | toggles aria-pressed (currently client-only state) | aria-pressed flips                           | no UI change                |
| `getByRole('link', { name: /Browse all/i })` | link    | navigates to /c                                    | url `/c` after click                         | navigation no-op            |
| 404 case (`/u/__nope__`)                     | n/a     | renders "User not found"                           | text visible                                 | renders shell with no error |

## Network calls expected during normal use

| trigger    | method | path                               | what request body or query is expected |
| ---------- | ------ | ---------------------------------- | -------------------------------------- |
| route load | GET    | `/api/users/by-username/:username` | 200 with `{ data: { … } }` or 404      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/u__username.spec.ts`
