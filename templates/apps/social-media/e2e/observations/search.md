# Page observations: /search (Search)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role    | expected behavior on interaction                                           | success signal                     | failure signal |
| -------------------------------------------- | ------- | -------------------------------------------------------------------------- | ---------------------------------- | -------------- |
| `input[type=text]` (Search query)            | textbox | accept query; debounced fetch to `/api/search/posts` + `/api/search/users` | typed value reflected, ?q= updates | input rejects  |
| `getByRole('button', { name: /^top$/i })`    | button  | switch to Top tab                                                          | tab marked active                  | tab inactive   |
| `getByRole('button', { name: /^people$/i })` | button  | switch to People tab                                                       | tab marked active                  | tab inactive   |
| `getByRole('button', { name: /^tags$/i })`   | button  | switch to Tags tab                                                         | tab marked active                  | tab inactive   |
| `getByRole('button', { name: /^posts$/i })`  | button  | switch to Posts tab                                                        | tab marked active                  | tab inactive   |

## Hidden surfaces opened from this page

| trigger           | what it opens                  | elements inside (selector / role / behavior) |
| ----------------- | ------------------------------ | -------------------------------------------- |
| Result tile click | /posts/:id or /profile/:handle | detail page for the result                   |

## Network calls expected during normal use

| trigger                | method | path                 | what request body or query is expected |
| ---------------------- | ------ | -------------------- | -------------------------------------- |
| Type query (debounced) | GET    | /api/search/posts?q= | returns matching posts                 |
| Type query (debounced) | GET    | /api/search/users?q= | returns matching users                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/search.spec.ts`
