# Page observations: /analytics (Analytics)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Verified against
> `.observe/ai-email-composer/analytics.html`.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name       | role   | expected behavior on interaction                        | success signal                | failure signal |
| -------------------------------- | ------ | ------------------------------------------------------- | ----------------------------- | -------------- |
| `[data-mol-id="analytics-page"]` | region | analytics shell renders                                 | element visible               | absent         |
| `[data-mol-id="kpi-openRate"]`   | region | open-rate KPI tile renders an integer percentage 0–100  | tile visible with numeric `%` | empty          |
| `[data-mol-id="kpi-replyRate"]`  | region | reply-rate KPI tile renders an integer percentage 0–100 | tile visible with numeric `%` | empty          |

## Hidden surfaces opened from this page

| trigger                                          | what it opens | elements inside (selector / role / behavior) |
| ------------------------------------------------ | ------------- | -------------------------------------------- |
| (none — chart sections render inline; no modals) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path                               | what request body or query is expected         |
| ------- | ------ | ---------------------------------- | ---------------------------------------------- |
| mount   | GET    | /api/sent-emails/analytics/summary | (none — derived from sent_emails for the user) |
| mount   | GET    | /api/sent-emails                   | (none)                                         |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/analytics.spec.ts`
