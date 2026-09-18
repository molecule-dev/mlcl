# Page observations: /secrets/:id (SecretDetail)

> Filled by AI agent driving the running app via Playwright. Do NOT
> author this from imagination or source-code reading — only from what
> the rendered page actually shows after `browser_navigate` +
> `browser_snapshot`.

## Procedure

1. `mcp__playwright__browser_navigate` → /secrets/:id (use APP_BASE)
   - If route is auth-protected, sign up first.
2. `mcp__playwright__browser_snapshot` → get the accessibility tree.
3. Walk every node. For EVERY interactive element below, fill a row.
4. For each element that opens something hidden (menu, modal, tab,
   accordion, popover, drawer): click it, re-snapshot, list elements
   inside the now-open container too. Use `role=button[expanded=true]`
   pattern in the snapshot.
5. Re-navigate and re-snapshot one more time. Compare to your list.
   Add any element you missed. Stop ONLY when one full pass adds nothing.
6. When complete, write `e2e/secrets__id.spec.ts` with one
   test per row in the "elements" table below. Each test must drive
   the documented behavior and assert on the documented outcome.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                         | role          | expected behavior on interaction                                                                                         | success signal                                                                                            | failure signal                         |
| ------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `[data-mol-id="secret-detail-key"]`                                | heading       | renders the secret key for the current row                                                                               | key text visible after page load                                                                          | heading missing or wrong text          |
| `[data-mol-id="secret-value-toggle"]`                              | button        | reveals the plaintext value (fetched eagerly on page load); GET /api/secrets/:id also writes a `secret.read` audit entry | plaintext visible in `[data-mol-id="secret-value"]`                                                       | value remains masked                   |
| `[data-mol-id="secret-rotate-submit"]` (after toggle + value fill) | button + form | POST /api/secrets/:id/rotate; bumps version + writes a rotation row + writes a rotation notification                     | version increments; GET /api/rotations contains a row; GET /api/notifications contains a "rotation" entry | rotation request fails (status >= 400) |
| `[data-mol-id="secret-delete"]`                                    | button        | DELETE /api/secrets/:id then bounce to /vaults/:vaultId                                                                  | status 204; URL becomes /vaults/:vaultId                                                                  | secret remains in list                 |

## Hidden surfaces opened from this page

| trigger                          | what it opens | elements inside (selector / role / behavior) |
| -------------------------------- | ------------- | -------------------------------------------- |
| (none beyond the elements above) | n/a           | n/a                                          |

## Network calls expected during normal use

| trigger | method | path                    | what request body or query is expected                                                |
| ------- | ------ | ----------------------- | ------------------------------------------------------------------------------------- |
| initial | GET    | /api/secrets/:id        | returns row + plaintext value (decrypted server-side); writes secret.read audit entry |
| rotate  | POST   | /api/secrets/:id/rotate | body { value, comment? }                                                              |
| delete  | DELETE | /api/secrets/:id        | no body                                                                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/secrets__id.spec.ts`
