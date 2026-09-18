# Page observations: /bookmarks (Bookmarks)

Observed via Playwright MCP at `/bookmarks` (and the bookmark button on
ArticleView) while authenticated.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role   | expected behavior on interaction                              | success signal            | failure signal |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------- | ------------------------- | -------------- |
| `getByText(/No bookmarks yet/i)`                                | text   | empty state for fresh user                                    | visible message           | no message     |
| `getByRole('button', { name: /^Bookmark$/i })` (on ArticleView) | button | POST /api/bookmarks; flips to "Bookmarked"; survives reload   | "Bookmarked" pill visible | network error  |
| `getByRole('button', { name: /Remove bookmark/i })`             | button | DELETE /api/bookmarks/:id; row disappears + GET returns empty | row removed               | row remains    |

## Hidden surfaces opened from this page

(none)

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |

## Network calls expected during normal use

| trigger         | method | path               | what request body or query is expected         |
| --------------- | ------ | ------------------ | ---------------------------------------------- |
| Page load       | GET    | /api/bookmarks     | 200 with bookmark list (empty for fresh user)  |
| Click Bookmark  | POST   | /api/bookmarks     | `{ resourceType:'article', resourceId }` → 201 |
| Remove bookmark | DELETE | /api/bookmarks/:id | 204 / 200                                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/bookmarks.spec.ts`
