# Page observations: /feed (Feed)

> Filled from a live walk via Playwright. Re-walk if any visible element
> changes; do not edit from imagination.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                 | role    | expected behavior on interaction                           | success signal                          | failure signal              |
| ---------------------------------------------------------- | ------- | ---------------------------------------------------------- | --------------------------------------- | --------------------------- |
| `[data-testid="compose-link"]` (New post)                  | link    | navigate to /compose                                       | URL becomes /compose                    | nav fails                   |
| `article` (PostCard tile)                                  | article | render an authored post when feed has results              | at least one article visible after seed | empty state instead         |
| `[data-testid="like-button"]` (Like icon on PostCard)      | button  | POST `/api/posts/:id/like`; optimistic count update        | like_count increments, button toggles   | revert on error             |
| `[data-testid="feed-empty-state"]` (when nothing followed) | region  | shown when /api/feed returns no posts                      | renders empty state copy + CTA links    | hidden when articles render |
| SuggestionsRail Follow button                              | button  | POST `/api/follows/users/:id`; visually marks as Following | button label switches to "Following"    | follow not persisted        |

## Hidden surfaces opened from this page

| trigger       | what it opens          | elements inside (selector / role / behavior) |
| ------------- | ---------------------- | -------------------------------------------- |
| Article click | /posts/:id detail page | full post + comments form                    |

## Network calls expected during normal use

| trigger                 | method | path                   | what request body or query is expected             |
| ----------------------- | ------ | ---------------------- | -------------------------------------------------- |
| Page mount              | GET    | /api/feed              | returns `Post[]` from followed users (or fallback) |
| Page mount              | GET    | /api/feed/suggestions  | returns suggested creators                         |
| Page mount              | GET    | /api/feed/trending     | returns trending hashtags                          |
| Like click              | POST   | /api/posts/:id/like    | returns `{ liked, like_count }`                    |
| Suggestion follow click | POST   | /api/follows/users/:id | returns `{ following }`                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/feed.spec.ts`
