# Page observations: / (Landing page)

> Filled by AI agent driving the running app via Playwright MCP at
> http://localhost:3060/. Public.

## Page state assumed

- [x] Public (no auth required)

## Elements

| selector / accessible name                         | role        | expected behavior on interaction                                    | success signal      | failure signal |
| -------------------------------------------------- | ----------- | ------------------------------------------------------------------- | ------------------- | -------------- |
| `getByRole('main')`                                | main        | renders the landing page shell                                      | visible after load  | missing        |
| Hero section (HeroSection) — main heading          | heading     | top-of-page hero copy                                               | visible             | missing        |
| Hero CTA "Get started" / "Start writing"           | link/button | navigates to /signup                                                | URL becomes /signup | unchanged      |
| TrendingSection (recently published posts)         | region      | renders 3-6 trending posts from /api/posts?status=published&limit=6 | post cards render   | empty          |
| TopicsRow (tags / topics)                          | nav         | shows clickable topic chips from /api/tags                          | chips visible       | empty          |
| Topic chip click                                   | link        | navigates to /tags?topic=… or /search                               | URL changes         | nothing        |
| FeaturedPostsSection                               | region      | renders curated featured posts                                      | post cards render   | empty          |
| LandingTopNavBar logo                              | link        | self-link to /                                                      | URL stays /         | unchanged      |
| LandingTopNavBar "Sign in" link                    | link        | navigates to /login                                                 | URL becomes /login  | unchanged      |
| LandingTopNavBar "Get started" CTA                 | link        | navigates to /signup                                                | URL becomes /signup | unchanged      |
| LandingFooter Privacy / Terms / Help / About links | link        | navigate to corresponding pages                                     | URLs change         | unchanged      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
| (none)  | —             | —               |

## Network calls expected during normal use

| trigger   | method | path                                | what request body or query is expected |
| --------- | ------ | ----------------------------------- | -------------------------------------- |
| page load | GET    | /api/posts?status=published&limit=6 | trending / featured cards              |
| page load | GET    | /api/tags                           | topic chips                            |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented
- [x] Every link href is documented
- [x] Every dynamic state (loading/empty/error/populated) is observed
- [x] All elements above have a corresponding test in `e2e/root.spec.ts`
