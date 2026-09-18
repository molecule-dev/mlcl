# Page observations: /vault/:id (ItemDetail)

> Filled from a live walk via Playwright MCP at /vault/:id. Re-walk if any
> visible element changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name             | role         | expected behavior on interaction  | success signal                                            | failure signal                           |
| -------------------------------------- | ------------ | --------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `getByText(<itemName>)`                | text         | render item name + decoded fields | name + username visible                                   | blank or 404                             |
| `getByRole('button', { name: /reveal   | show/i })`   | button                            | toggle the password visibility                            | real password text visible               | still masked             |
| `getByRole('button', { name: /favorite | star/i })`   | button                            | POST /api/items/:id/favorite; persists across reload      | is_favorite=true on subsequent GET       | no API call / state lost |
| `getByRole('button', { name: /trash    | delete/i })` | button                            | POST /api/items/:id/trash; removes from active vault list | item gone from /vault, present in /trash | item still listed        |
| `getByRole('link', { name: /back/i })` | link         | navigate back to /vault           | URL becomes /vault                                        | nav fails                                |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | —                                            |

## Network calls expected during normal use

| trigger        | method | path                    | what request body or query is expected     |
| -------------- | ------ | ----------------------- | ------------------------------------------ |
| page mount     | GET    | /api/items/:id          | returns single item record                 |
| Favorite click | POST   | /api/items/:id/favorite | flips is_favorite for the row; returns 200 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching spec
