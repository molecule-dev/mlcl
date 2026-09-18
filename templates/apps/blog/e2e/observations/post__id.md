# Page observations: /post/:id (Public post detail)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/post/<seeded-id>. Public read; clap/bookmark/comment require auth.

## Page state assumed

- [x] Public (no auth required) — but reaction buttons require auth

## Elements

| selector / accessible name                        | role        | expected behavior on interaction                           | success signal                              | failure signal       |
| ------------------------------------------------- | ----------- | ---------------------------------------------------------- | ------------------------------------------- | -------------------- |
| `getByRole('heading', { level: 1 })` (post title) | heading     | renders post.title from /api/posts/:id                     | text matches seeded title                   | error / dash         |
| `[data-mol-id="post-loading"]`                    | text        | shown during initial fetch                                 | disappears after networkidle                | persists             |
| `[data-mol-id="post-error"]` (role=alert)         | alert       | shown when fetch returns 404 / 500                         | visible on missing post                     | hidden on happy path |
| article body container (PostDetailArticleBody)    | region      | renders post.content as markdown/HTML                      | non-empty                                   | empty                |
| `[data-mol-id="post-cover-image"]` (img)          | image       | shows post.cover_image_url if set                          | src reflects seeded cover URL               | broken / placeholder |
| `[data-mol-id="button-clap"]`                     | button      | POST /api/interactions { type:'clap', postId } when authed | clap counter increments, button highlighted | unchanged            |
| `[data-mol-id="button-bookmark"]`                 | button      | POST /api/bookmarks { resourceType:'post', resourceId }    | bookmark in /api/bookmarks/mine             | unchanged            |
| `[data-mol-id="button-comment"]`                  | button      | navigates to /comments?postId=<id>                         | URL contains /comments?postId               | unchanged            |
| AuthorBioCard                                     | region      | renders author name/handle                                 | visible                                     | missing              |
| RelatedPostsSection                               | region      | renders related posts list                                 | visible (or empty-state)                    | broken               |
| ReadingProgressBar (top of viewport)              | progressbar | reflects scroll position                                   | width changes on scroll                     | static               |
| PostDetailTopNavBar logo link                     | link        | navigates back to /                                        | URL becomes /                               | unchanged            |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger           | method | path                                     | what request body or query is expected               |
| ----------------- | ------ | ---------------------------------------- | ---------------------------------------------------- |
| page load         | GET    | /api/posts/:id                           | full post payload                                    |
| page load         | POST   | /api/posts/:id/views                     | (optional ping that bumps view counter)              |
| clap              | POST   | /api/interactions OR /api/posts/:id/clap | { type: 'clap' }                                     |
| bookmark          | POST   | /api/bookmarks                           | { resourceType:'post', resourceId }                  |
| read interactions | GET    | /api/posts/:id/interactions              | returns claps/clapped/bookmarked/comment_count/views |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/post__id.spec.ts`
