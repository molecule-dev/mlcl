# Page observations: /comments (Comments moderation)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/comments. Auth-required.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                  | role      | expected behavior on interaction        | success signal                                  | failure signal         |
| --------------------------------------------------------------------------- | --------- | --------------------------------------- | ----------------------------------------------- | ---------------------- |
| `[data-mol-id="comments-filter-all"]`                                       | button    | sets status filter to all               | aria-pressed=true, GET /api/comments?status=all | network not refired    |
| `[data-mol-id="comments-filter-pending"]`                                   | button    | sets status filter to pending           | aria-pressed=true, GET ?status=pending          | not refired            |
| `[data-mol-id="comments-filter-approved"]`                                  | button    | sets status filter to approved          | aria-pressed=true, GET ?status=approved         | not refired            |
| `[data-mol-id="comments-filter-spam"]`                                      | button    | sets status filter to spam              | aria-pressed=true, GET ?status=spam             | not refired            |
| `[data-mol-id="comments-list"]`                                             | list      | renders fetched comments                | li[data-mol-id^="comment-"] visible             | error or empty         |
| `[data-mol-id="comments-create-form"]` (visible only when ?postId=… in URL) | form      | post a new comment to the focused post  | POST /api/comments returns the new row          | 4xx                    |
| `[data-mol-id="comments-create-body"]`                                      | textarea  | writes the comment body                 | accepts text input                              | not editable           |
| `[data-mol-id="comments-create-submit"]`                                    | button    | submits the new comment                 | new li appears in list                          | error toast            |
| `[data-mol-id^="comment-"][data-mol-id$="-approve"]`                        | button    | PATCH /api/comments/:id status=approved | refetches list, comment shows status approved   | status remains pending |
| `[data-mol-id^="comment-"][data-mol-id$="-spam"]`                           | button    | PATCH /api/comments/:id status=spam     | refetches list, comment shows status spam       | status unchanged       |
| `[data-mol-id^="comment-"][data-mol-id$="-delete"]`                         | button    | DELETE /api/comments/:id                | comment removed from list                       | still visible          |
| `[data-mol-id="comments-empty-state"]`                                      | paragraph | empty-state when comments.length===0    | visible on empty list                           | hidden when populated  |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger                    | method | path                   | what request body or query is expected                       |
| -------------------------- | ------ | ---------------------- | ------------------------------------------------------------ |
| page load + filter changes | GET    | /api/comments?status=… | optional resourceType=post & resourceId=:id when ?postId set |
| approve click              | PATCH  | /api/comments/:id      | { status: 'approved' }                                       |
| spam click                 | PATCH  | /api/comments/:id      | { status: 'spam' }                                           |
| delete click               | DELETE | /api/comments/:id      | no body                                                      |
| post comment               | POST   | /api/comments          | { body, resourceType:'post', resourceId }                    |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/comments.spec.ts`
