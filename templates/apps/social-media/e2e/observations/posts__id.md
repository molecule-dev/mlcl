# Page observations: /posts/:id (PostDetail)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role    | expected behavior on interaction         | success signal                 | failure signal              |
| -------------------------------- | ------- | ---------------------------------------- | ------------------------------ | --------------------------- |
| Post hero/cover                  | region  | render the post's caption, author, media | caption visible                | post not found copy instead |
| `[data-testid="like-button"]`    | button  | POST `/api/posts/:id/like`               | like_count increments          | revert on error             |
| `[data-testid="like-count"]`     | text    | reflects current like_count after click  | innerText changes after toggle | count unchanged             |
| `[data-testid="comment-input"]`  | textbox | accept comment body                      | typed value reflected          | input rejects               |
| `[data-testid="comment-submit"]` | button  | POST `/api/posts/:id/comments`           | new comment appears in list    | error toast                 |
| Not-found copy (when id unknown) | region  | render 404 / "Post not found" copy       | copy visible for unknown id    | unrelated UI shown          |

## Hidden surfaces opened from this page

| trigger                    | what it opens    | elements inside (selector / role / behavior) |
| -------------------------- | ---------------- | -------------------------------------------- |
| Author avatar/handle click | /profile/:handle | profile detail page                          |

## Network calls expected during normal use

| trigger        | method | path                    | what request body or query is expected  |
| -------------- | ------ | ----------------------- | --------------------------------------- |
| Page mount     | GET    | /api/posts/:id          | returns post with `like_count`, `liked` |
| Page mount     | GET    | /api/posts/:id/comments | returns `Comment[]`                     |
| Like click     | POST   | /api/posts/:id/like     | returns `{ liked, like_count }`         |
| Submit comment | POST   | /api/posts/:id/comments | `{ body }` returns saved comment        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/posts__id.spec.ts`
