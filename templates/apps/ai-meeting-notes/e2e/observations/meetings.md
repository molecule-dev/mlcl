# Page observations: /meetings (Meetings)

> Authenticated. Lists every meeting the caller owns, sorted by
> recorded_at desc. Each row links to /meetings/:id.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                         | role        | expected behavior on interaction  | success signal                   | failure signal         |
| -------------------------------------------------- | ----------- | --------------------------------- | -------------------------------- | ---------------------- |
| `getByRole('heading', { name: /^meetings$/i })`    | heading     | identifies the page               | h1 visible                       | empty page             |
| `getByRole('link', { name: /record meeting/i })`   | link        | nav to /record                    | URL becomes `/record`            | stays on `/meetings`   |
| `getByText(/no meetings yet/i)`                    | empty state | shown when zero rows are returned | text visible on fresh signup     | empty list shown wrong |
| `page.locator('ul a[href*="/meetings/"]').first()` | link        | each row links to detail          | clicking goes to `/meetings/:id` | dead row               |
| `page.locator('[data-mol-id="nav-record"]')`       | sidebar nav | sidebar shell rendered            | element visible                  | layout broken          |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path          | what request body or query is expected                        |
| --------- | ------ | ------------- | ------------------------------------------------------------- |
| Page load | GET    | /api/meetings | enriched meeting list with action_count, transcription_status |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/12-meetings.spec.ts`
