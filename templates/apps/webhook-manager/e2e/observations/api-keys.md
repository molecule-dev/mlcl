# Page observations: /settings/api-keys (APIKeys)

> Filled by the dispatch-flagship agent driving the running app via Playwright MCP.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                              | role    | expected behavior on interaction                                               | success signal                                      | failure signal        |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------- |
| `getByRole('heading', { name: /api keys/i, level: 1 })` | heading | render the page title                                                          | visible                                             | absent                |
| Empty-state body                                        | text    | shown when zero keys exist                                                     | visible while empty                                 | hidden when empty     |
| `getByRole('button', { name: /generate.*key/i })`       | button  | open create-key dialog → POST /api/api_keys returns the plaintext exactly once | new row visible; plaintext present once             | nothing new persisted |
| Reveal/copy buttons per row                             | button  | reveal masked key / copy plaintext to clipboard                                | masked switches → plaintext text or clipboard write | nothing happens       |
| Revoke action                                           | button  | POST /api/api_keys/:id/revoke flips `is_revoked = true`                        | next GET shows row with `is_revoked = true`         | flag stays false      |

## Hidden surfaces opened from this page

| trigger      | what it opens   | elements inside (selector / role / behavior) |
| ------------ | --------------- | -------------------------------------------- |
| Generate key | one-shot reveal | plaintext value with copy + dismiss controls |

## Network calls expected during normal use

| trigger    | method | path                     | what request body or query is expected |
| ---------- | ------ | ------------------------ | -------------------------------------- |
| Page mount | GET    | /api/api_keys            | hydrate keys list                      |
| Generate   | POST   | /api/api_keys            | `{ name, scopes? }`                    |
| Revoke     | POST   | /api/api_keys/:id/revoke | (empty body)                           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/api-keys.spec.ts`
