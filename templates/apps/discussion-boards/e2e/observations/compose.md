# Page observations: /compose (Compose)

> Authenticated thread-composer. Loads `/api/categories` for the
> category chooser, then POSTs `/api/threads` to create the thread
> and navigates to `/t/:slug`. Markdown preview is client-only.

## Page state assumed

- [x] Authenticated

## Elements

| selector / accessible name                         | role     | expected behavior on interaction                    | success signal                                              | failure signal               |
| -------------------------------------------------- | -------- | --------------------------------------------------- | ----------------------------------------------------------- | ---------------------------- |
| `page.locator('#compose-title')`                   | input    | accepts thread title (max 140)                      | character counter updates                                   | input ignores typing         |
| `page.locator('#compose-body')`                    | textarea | accepts markdown body                               | textarea value updates, word-counter increments             | input ignores typing         |
| category chip "Philosophy & Ethics"                | button   | selects the category                                | active styling moves to the chip                            | click is no-op               |
| `getByRole('button', { name: /^Write$/i })`        | button   | flips back to write mode                            | textarea visible                                            | preview stays                |
| `getByRole('button', { name: /^Preview$/i })`      | button   | flips into rendered-markdown preview                | preview html visible                                        | textarea remains             |
| `getByRole('button', { name: /Cancel/i })`         | button   | navigates back via history                          | url is `/c` (or referrer)                                   | stays on /compose            |
| `getByRole('button', { name: /Publish thread/i })` | button   | POST /api/threads → navigate to /t/:slug            | url matches `/t/...` AND new thread visible in /api/threads | stays on /compose with error |
| empty submit                                       | n/a      | disabled until both fields have non-whitespace text | button disabled                                             | POST fires with empty body   |

## Network calls expected during normal use

| trigger       | method | path              | what request body or query is expected                        |
| ------------- | ------ | ----------------- | ------------------------------------------------------------- |
| route load    | GET    | `/api/categories` | 200 with seeded categories                                    |
| Publish click | POST   | `/api/threads`    | `{ title, body, categoryId }` returns 201 with `{ id, slug }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/compose.spec.ts`
