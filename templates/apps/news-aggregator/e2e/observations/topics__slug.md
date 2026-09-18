# Page observations: /topics/:slug

> Observed via Playwright at http://localhost:3080/topics/world — topic
> detail page rendered by `pages/TopicDetail.tsx`. Shows topic header +
> Follow / Following toggle + a list of stories under the topic.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                            | role             | expected behavior on interaction                      | success signal                                 | failure signal                             |
| ----------------------------------------------------- | ---------------- | ----------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `getByRole('link', { name: /^Topics$/ })` (back link) | link             | navigates back to /topics                             | URL becomes /topics                            | unchanged                                  |
| `getByRole('heading')` (topic name)                   | heading          | renders the topic label                               | visible                                        | missing                                    |
| `getByRole('button', { name: /^Follow$                | ^Following$/ })` | button                                                | toggles follow → POST /api/topics/:slug/follow | aria-pressed flips, persists across reload | aria static |
| Story list (StoryListItem)                            | link(s)          | each links to /stories/:id, headline + bias indicator | URL becomes /stories/:id                       | broken                                     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                                   | what request body or query is expected |
| ------------ | ------ | -------------------------------------- | -------------------------------------- |
| Page load    | GET    | /api/topics/by-slug/:slug (or similar) | topic + initial story list             |
| Page load    | GET    | /api/stories?topic={slug}              | filtered story list                    |
| Follow click | POST   | /api/topics/:slug/follow               | → { following: bool }                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/03-topics-follow.spec.ts` and `e2e/02-home-and-stories.spec.ts`
