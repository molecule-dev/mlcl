# Page observations: /home

> Observed via Playwright at http://localhost:3080/home — primary
> authenticated landing rendered by `pages/Home.tsx`. AuthGuard redirects
> unauthenticated visitors to /login.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                        | role       | expected behavior on interaction                         | success signal                 | failure signal |
| ----------------------------------------------------------------- | ---------- | -------------------------------------------------------- | ------------------------------ | -------------- |
| `getByRole('navigation', { name: /primary/i }).first()` (sidebar) | navigation | renders Today/Topics/Sources/Saved/Search/Settings links | visible                        | missing        |
| Topic chips row (TopicChipsRow)                                   | navigation | each chip links to /topics/{slug}                        | URL becomes /topics/world etc. | unchanged      |
| `getByRole('button', { name: /open user menu/i }).first()`        | button     | opens user menu (Sign out, profile)                      | menu visible                   | no-op          |
| Story list items (StoryListItem)                                  | link(s)    | each links to `/stories/:id` and shows source count      | URL changes                    | broken         |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside        |
| ---------------- | ------------- | ---------------------- |
| User-menu button | user dropdown | Sign-out, profile link |

## Network calls expected during normal use

| trigger   | method | path         | what request body or query is expected |
| --------- | ------ | ------------ | -------------------------------------- |
| Page load | GET    | /api/stories | for the hero + list (no body)          |
| Page load | GET    | /api/topics  | for the topic chip rail                |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/02-home-and-stories.spec.ts` and `e2e/99-user-journey.spec.ts`
