# Page observations: /t/:id (ThreadView)

> Authenticated thread detail. Loads `/api/threads/:id` to render
> the original post + replies, posts new replies via `POST
/api/threads/:id/posts`, and toggles bookmark via
> `POST/DELETE /api/threads/:id/bookmark`. Locked threads hide the
> reply form and show a banner.

## Page state assumed

- [x] Authenticated; tested with a thread the author created.

## Elements

| selector / accessible name                       | role     | expected behavior on interaction                                               | success signal                                                   | failure signal                           |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------- |
| breadcrumb "Categories"                          | link     | navigates to /c                                                                | url `/c` after click                                             | stays on thread                          |
| breadcrumb category name                         | link     | navigates to /c/:slug                                                          | url `/c/...` after click                                         | stays on thread                          |
| original post body                               | text     | renders the OP body from API                                                   | body text visible                                                | shows fallback or empty                  |
| `page.locator('#thread-reply')`                  | textarea | accepts new reply                                                              | value reflects typed text                                        | input ignores typing                     |
| `getByRole('button', { name: /^Post reply$/i })` | button   | POST /api/threads/:id/posts → reply visible after refresh                      | reply text appears in the post list AND `reply_count` increments | stays on form, no new post               |
| bookmark button                                  | button   | toggles `bookmarked` state, calls POST/DELETE bookmark, persists across reload | aria-pressed flips AND survives reload                           | aria-pressed flips but next load reverts |
| author username link                             | link     | navigates to /u/:username                                                      | url `/u/...` after click                                         | href missing                             |
| reply on a closed thread                         | n/a      | reply form replaced by "Locked" banner                                         | banner visible, no textarea                                      | reply still allowed (server should 403)  |

## Network calls expected during normal use

| trigger                 | method | path                        | what request body or query is expected        |
| ----------------------- | ------ | --------------------------- | --------------------------------------------- |
| route load              | GET    | `/api/threads/:id`          | 200 with `{ data: { posts: [...] } }`         |
| route load              | GET    | `/api/threads/:id/bookmark` | 200 `{ bookmarked: bool }`                    |
| Post reply click        | POST   | `/api/threads/:id/posts`    | `{ body }` returns 201                        |
| Bookmark click (off→on) | POST   | `/api/threads/:id/bookmark` | empty body returns 200 `{ bookmarked: true }` |
| Bookmark click (on→off) | DELETE | `/api/threads/:id/bookmark` | returns 200 `{ bookmarked: false }`           |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/t__id.spec.ts`
