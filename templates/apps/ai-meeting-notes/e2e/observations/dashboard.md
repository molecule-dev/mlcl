# Page observations: /dashboard (Dashboard)

> Authenticated. Renders the meeting feed with stats, a Record CTA, and
> a card per meeting. Empty state shown when the user has no meetings.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                              | role           | expected behavior on interaction      | success signal               | failure signal      |
| ----------------------------------------------------------------------- | -------------- | ------------------------------------- | ---------------------------- | ------------------- |
| `getByRole('heading', { name: /welcome back/i })`                       | heading        | top-of-page identifier                | h1 visible                   | empty               |
| `getByText(/your meeting feed/i)`                                       | static eyebrow | renders the eyebrow above heading     | text visible                 | text missing        |
| `getByRole('link', { name: /record meeting/i })`                        | link           | nav to /record (hero CTA)             | URL becomes `/record`        | stays here          |
| `getByRole('link', { name: /view calendar/i })`                         | link           | nav to /calendar                      | URL becomes `/calendar`      | stays here          |
| `getByRole('heading', { name: /recent meetings/i })`                    | heading        | section header                        | h2 visible                   | section missing     |
| `page.locator('.material-symbols-outlined', { hasText: /^mic_none$/ })` | icon           | empty-state mic icon when no meetings | icon visible on fresh signup | section missing     |
| `getByRole('link', { name: /start recording/i })`                       | link           | empty-state CTA → /record             | URL becomes `/record`        | empty-state missing |
| `page.locator('[data-mol-id="nav-dashboard"]')`                         | sidebar nav    | sidebar shell rendered                | element visible              | layout broken       |

## Hidden surfaces opened from this page

| trigger                           | what it opens    | elements inside                             |
| --------------------------------- | ---------------- | ------------------------------------------- |
| Account button (top nav listener) | account dropdown | "Sign out" button, profile / settings links |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected                              |
| --------- | ------ | ------------- | ------------------------------------------------------------------- |
| Page load | GET    | /api/meetings | enriched meeting list (action_count, attendee_initials, ai_summary) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/10-dashboard.spec.ts`
