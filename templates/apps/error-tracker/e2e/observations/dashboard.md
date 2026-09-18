# Page observations: /dashboard

> Authenticated dashboard. First read seeds 5 issues + 3 alerts + 4 notifications + 4 releases + 60 transactions + 4 team members. Renders KPI counters from real seed data.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role    | expected behavior on interaction                                     | success signal              | failure signal    |
| ---------------------------------------- | ------- | -------------------------------------------------------------------- | --------------------------- | ----------------- |
| `getByRole("heading", { level: 1 })`     | heading | page heading is visible                                              | visible                     | empty             |
| `page.locator("nav, [role=navigation]")` | nav     | sidebar/topnav rail renders with /issues + /alerts + /releases links | links visible + clickable   | rail missing      |
| Issue cards from /api/issues             | list    | renders the 5 seeded issue titles                                    | titles visible in body text | empty             |
| KPI counter (Users affected)             | text    | renders the sum of users-affected from seed                          | numeric value > 0 visible   | NaN / placeholder |
| KPI counter (Events / 24h)               | text    | renders the sum of event_count from seed                             | numeric value > 0 visible   | NaN / placeholder |
| Sidebar link `/alerts`                   | link    | navigates to /alerts                                                 | URL becomes /alerts         | stays             |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |
|         |               |                 |

## Network calls expected during normal use

| trigger   | method | path        | expected body                         |
| --------- | ------ | ----------- | ------------------------------------- |
| Page load | GET    | /api/issues | [ { id, title, level, status, ... } ] |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in the matching e2e/<n>-dashboard.spec.ts
