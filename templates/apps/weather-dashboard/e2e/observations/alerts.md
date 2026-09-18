# Page observations: /alerts (Weather Alerts)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                          | role     | expected behavior on interaction                                               | success signal                       | failure signal               |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------- |
| `getByRole('heading', { name: /weather alerts/i })` | heading  | render page title                                                              | visible                              | absent                       |
| `main` (Active alerts section)                      | section  | render seeded alerts; if none, render the green "All clear" empty state        | shows alerts or empty-state copy     | section missing              |
| `AlertBanner` row (per alert)                       | listitem | render an alert card with title + body + dismiss button                        | card visible                         | dismiss-only stub            |
| `AlertBanner` "Dismiss" button                      | button   | POST /api/alerts/:id/dismiss + remove from list (read-after-write through GET) | banner disappears + GET hides it     | banner stays                 |
| `getByRole('button', { name: /severe wind/i })`     | toggle   | togglePref → PUT /api/alerts/preferences/:locationId, flips kinds[]            | aria-pressed flips + payload updates | aria-pressed unchanged / 4xx |
| `getByRole('button', { name: /flooding/i })`        | toggle   | same pattern as above                                                          | aria-pressed flips                   | unchanged                    |
| `getByRole('button', { name: /air quality/i })`     | toggle   | toggles air key in kinds[]                                                     | aria-pressed flips                   | unchanged                    |
| `getByRole('button', { name: /heat & cold/i })`     | toggle   | toggles heat key in kinds[]                                                    | aria-pressed flips                   | unchanged                    |
| `getByRole('button', { name: /winter storms/i })`   | toggle   | toggles winter key in kinds[]                                                  | aria-pressed flips                   | unchanged                    |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | alerts is flat — toggles + banners only      |

## Network calls expected during normal use

| trigger                  | method | path                                | what request body or query is expected                                |
| ------------------------ | ------ | ----------------------------------- | --------------------------------------------------------------------- |
| page load                | GET    | /api/alerts                         | (returns active, undismissed alerts across all owned locations)       |
| page load                | GET    | /api/locations/default              | (used to find the default location for subscriptions)                 |
| page load (with default) | GET    | /api/alerts/preferences/:locationId | (returns saved kinds[] + channels[])                                  |
| Toggle subscription      | PUT    | /api/alerts/preferences/:locationId | `{ enabled, kinds, channels }` — round-trips through GET on next load |
| Dismiss banner           | POST   | /api/alerts/:id/dismiss             | (no body) — server-side `dismissed_alerts` row added                  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/alerts.spec.ts`
