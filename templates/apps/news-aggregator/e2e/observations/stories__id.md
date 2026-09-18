# Page observations: /stories/:id

> Observed via Playwright at http://localhost:3080/stories/{uuid} — story
> detail page rendered by `pages/StoryDetail.tsx`. Shows headline, body,
> "How each outlet framed it" coverage list, Save / Saved toggle, and a
> link out to the original article URL.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role         | expected behavior on interaction           | success signal          | failure signal                                     |
| --------------------------------------------------- | ------------ | ------------------------------------------ | ----------------------- | -------------------------------------------------- |
| `getByRole('link', { name: /^home$                  | ^back$/i })` | link                                       | navigates back to /home | URL becomes /home                                  | unchanged                                               |
| `getByRole('heading')` (story headline)             | heading      | renders the headline                       | visible                 | missing                                            |
| `getByText(/excerpt                                 | body         | summary/i)` (story body)                   | text                    | renders the story body / excerpt                   | visible                                                 | empty       |
| `getByRole('button', { name: /^Save$                | ^Saved$      | bookmark/i })`                             | button                  | toggles bookmark → POST /api/bookmarks (or DELETE) | aria-pressed flips, GET /api/bookmarks lists this story | aria static |
| Coverage list (per-source framing rows)             | region       | renders each outlet's headline + bias chip | visible                 | empty                                              |
| `getByRole('link')` for "Read on {source}" outbound | link         | external link with target=_blank           | renders, opens new tab  | broken                                             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path               | what request body or query is expected           |
| ------------ | ------ | ------------------ | ------------------------------------------------ |
| Page load    | GET    | /api/stories/:id   | full story payload + coverage[]                  |
| Save click   | POST   | /api/bookmarks     | { resourceType: 'article', resourceId: storyId } |
| Unsave click | DELETE | /api/bookmarks/:id | (no body)                                        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/02-home-and-stories.spec.ts` (save toggle persists) + `e2e/05-saved-page.spec.ts` (read-after-write)
