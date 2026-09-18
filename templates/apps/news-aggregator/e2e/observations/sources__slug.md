# Page observations: /sources/:slug

> Observed via Playwright at http://localhost:3080/sources/bbc — source
> detail page rendered by `pages/SourceDetail.tsx`. Header with name, bias
> badge, Follow toggle, and a list of stories from this outlet.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                             | role             | expected behavior on interaction | success signal                                  | failure signal                             |
| ------------------------------------------------------ | ---------------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| `getByRole('link', { name: /^Sources$/ })` (back link) | link             | navigates back to /sources       | URL becomes /sources                            | unchanged                                  |
| `getByRole('heading')` (source name)                   | heading          | renders the outlet name          | visible                                         | missing                                    |
| `getByRole('button', { name: /^Follow$                 | ^Following$/ })` | button                           | toggles follow → POST /api/sources/:slug/follow | aria-pressed flips, persists across reload | aria static |
| Story list (StoryListItem) for this source             | link(s)          | each links to /stories/:id       | URL becomes /stories/:id                        | broken                                     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                       | what request body or query is expected |
| ------------ | ------ | -------------------------- | -------------------------------------- |
| Page load    | GET    | /api/sources/by-slug/:slug | source detail with following           |
| Follow click | POST   | /api/sources/:slug/follow  | → { following: bool }                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/04-sources-follow.spec.ts`
