# Page observations: /topics

> Observed via Playwright at http://localhost:3080/topics — authenticated
> topics index rendered by `pages/Topics.tsx`. Lists every topic, with
> Follow / Following toggle.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                   | role             | expected behavior on interaction | success signal                      | failure signal                                    |
| -------------------------------------------- | ---------------- | -------------------------------- | ----------------------------------- | ------------------------------------------------- |
| `getByRole('heading', { name: /topics        | browse/i })`     | heading                          | renders the page title              | visible                                           | missing                    |
| Topic card `getByRole('link', { name: /world | business         | tech/i })`                       | link                                | navigates to /topics/{slug}                       | URL becomes /topics/{slug} | unchanged |
| `getByRole('button', { name: /^Follow$       | ^Following$/ })` | button                           | toggles follow state for that topic | aria-pressed flips, POST /api/topics/:slug/follow | aria stays the same        |
| Sidebar `Today` link                         | link             | navigates back to /home          | URL becomes /home                   | unchanged                                         |

## Hidden surfaces opened from this page

| trigger            | what it opens | elements inside |
| ------------------ | ------------- | --------------- |
| (none — flat grid) | —             | —               |

## Network calls expected during normal use

| trigger      | method | path                     | what request body or query is expected        |
| ------------ | ------ | ------------------------ | --------------------------------------------- |
| Page load    | GET    | /api/topics              | full topic list with following=bool per topic |
| Follow click | POST   | /api/topics/:slug/follow | { } (auth from JWT) → { following: bool }     |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/03-topics-follow.spec.ts` and `e2e/99-user-journey.spec.ts`
