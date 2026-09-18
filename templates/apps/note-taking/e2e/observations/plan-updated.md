# Page observations: /plan-updated

> Captured live via Playwright MCP at `http://localhost:3070/plan-updated`
> while signed in.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role    | expected behavior on interaction          | success signal                             | failure signal        |
| --------------------------------------------------------------- | ------- | ----------------------------------------- | ------------------------------------------ | --------------------- |
| Sidebar `getByRole('link', { name: 'Verso' })`                  | link    | navigate to `/home`                       | URL is `/home`                             | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Home' })`                   | link    | navigate to `/home`                       | URL is `/home`, home page renders          | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Notes' })`                  | link    | navigate to `/notes`                      | URL is `/notes`                            | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Search' })`                 | link    | navigate to `/search`                     | URL is `/search`                           | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Graph' })`                  | link    | navigate to `/graph`                      | URL is `/graph`                            | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Tags' })`                   | link    | navigate to `/tags`                       | URL is `/tags`                             | URL unchanged         |
| Sidebar `getByRole('link', { name: 'Settings' })`               | link    | navigate to `/settings`                   | URL is `/settings`                         | URL unchanged         |
| Sidebar `getByRole('button', { name: /open user menu/i })`      | button  | open user-menu popover                    | popover with sign-out + plan items appears | nothing happens       |
| `getByRole('heading', { name: /your plan has been updated/i })` | heading | confirms Stripe Checkout return           | visible after a successful checkout return | missing or wrong text |
| `getByRole('heading', { name: /thank you/i })`                  | heading | secondary confirmation                    | visible                                    | missing               |
| `getByRole('link', { name: /return home/i })`                   | link    | navigate back to landing `/` (or `/home`) | URL changes to `/` or `/home`              | URL unchanged         |

## Hidden surfaces opened from this page

| trigger          | what it opens | elements inside (selector / role / behavior)              |
| ---------------- | ------------- | --------------------------------------------------------- |
| User-menu button | popover/menu  | sign-out, profile/settings link; dismiss-on-outside-click |

## Network calls expected during normal use

| trigger                 | method | path                  | what request body or query is expected            |
| ----------------------- | ------ | --------------------- | ------------------------------------------------- |
| initial load            | GET    | `/api/profile/me`     | returns updated user with new tier (post-webhook) |
| initial load (optional) | GET    | `/api/billing/status` | current effective tier reflects new plan          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/plan-updated.spec.ts`
