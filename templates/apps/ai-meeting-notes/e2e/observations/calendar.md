# Page observations: /calendar (Calendar)

> Authenticated. Month grid (42 buttons) + an "Upcoming" sidebar.
> Calendar events that already have a meeting_id link to /meetings/:id;
> events without one render plain text.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                      | role        | expected behavior on interaction                             | success signal                           | failure signal       |
| --------------------------------------------------------------- | ----------- | ------------------------------------------------------------ | ---------------------------------------- | -------------------- |
| `getByRole('heading', { name: /calendar/i })`                   | heading     | identifies the page                                          | h1 visible                               | empty page           |
| `getByRole('button', { name: /‹                                 | prev/i })`  | button                                                       | step the visible month back one month    | header label updates | no change |
| `getByRole('button', { name: /›                                 | next/i })`  | button                                                       | step the visible month forward one month | header label updates | no change |
| `page.locator('[data-mol-id="calendar-event-list"]')`           | list        | sidebar of upcoming events                                   | list visible                             | empty layout         |
| `page.locator('[data-mol-id^="calendar-event-link-"]').first()` | link        | each meeting-linked event navigates to /meetings/:meeting_id | URL becomes `/meetings/<id>`             | dead text            |
| `page.locator('[data-mol-id="nav-calendar"]')`                  | sidebar nav | sidebar shell rendered                                       | element visible                          | layout broken        |

## Hidden surfaces opened from this page

| trigger                   | what it opens                    | elements inside                 |
| ------------------------- | -------------------------------- | ------------------------------- |
| Click any day cell button | day-detail drawer in the sidebar | event list filtered to that day |

## Network calls expected during normal use

| trigger   | method | path                 | what request body or query is expected                            |
| --------- | ------ | -------------------- | ----------------------------------------------------------------- |
| Page load | GET    | /api/calendar_events | enriched events with date/time/duration_min/speaker_id/meeting_id |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/14-calendar.spec.ts`
