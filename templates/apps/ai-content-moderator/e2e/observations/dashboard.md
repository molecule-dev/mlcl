# Page observations: /dashboard (Dashboard)

Source: live walk via Playwright + e2e/dashboard.spec.ts. Each row
maps to an element exercised by a passing test that asserts on the
real outcome (network call, navigation, KPI rendering).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                    | role             | expected behavior on interaction                                                       | success signal                                               | failure signal             |
| ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| `getByRole('heading', { name: /overview/i, level: 1 })` + Recent items header | heading          | initial load fires summary/volume/recent GETs and the page renders the dashboard shell | three real GETs visible in network capture, headings visible | 4xx responses, empty shell |
| KPI labels: Queue volume / Approved / Rejected / Total reviewed               | text labels      | KPI cards render labels (with values for empty state)                                  | all 4 labels visible                                         | one or more missing        |
| `getByRole('link', { name: /manage queue/i })`                                | link             | navigates to /queue                                                                    | URL becomes /queue, queue heading visible                    | URL unchanged              |
| `getByRole('link', { name: /view report\|edit rules/i })`                     | link group       | view-report → /analytics; edit-rules → /rules                                          | both URLs reached                                            | navigation fails           |
| `getByText(/Recent items/i)` (after seeding)                                  | section + reload | a seeded preview row appears on dashboard reload                                       | preview text visible                                         | row missing                |
| stats summary read-after-write                                                | network          | seeding two items bumps `/api/moderation/stats/summary` `queued`+`total`               | summary.queued ≥ 2                                           | summary unchanged          |

## Hidden surfaces opened from this page

| trigger                         | what it opens | elements inside (selector / role / behavior) |
| ------------------------------- | ------------- | -------------------------------------------- |
| (none — single page, no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger      | method | path                          | what request body or query is expected                                      |
| ------------ | ------ | ----------------------------- | --------------------------------------------------------------------------- |
| initial load | GET    | /api/moderation/stats/summary | 200 with {queued, in_review, decided, escalated, total, approved, rejected} |
| initial load | GET    | /api/moderation/stats/volume  | 200 with {series:[{date,label,value,height}], max}                          |
| initial load | GET    | /api/moderation/stats/recent  | 200 with array of latest flagged_content rows                               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
