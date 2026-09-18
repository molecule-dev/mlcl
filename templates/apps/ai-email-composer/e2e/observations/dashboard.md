# Page observations: /dashboard (Dashboard)

> Filled from a live Playwright walk against the smoke-app on
> `VITE_PORT=3090 / API_PORT=4090`. Each row was verified against the
> rendered DOM (`scripts/_walk-ai-email-composer.mjs` snapshot dump in
> `.observe/ai-email-composer/dashboard.html`).

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name               | role   | expected behavior on interaction                                                     | success signal                                                      | failure signal                        |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------- |
| `[data-mol-id="dashboard-page"]`         | region | dashboard root container renders after auth and the hero+KPIs paint                  | element visible                                                     | absent / loader stuck                 |
| `[data-mol-id="dashboard-compose-cta"]`  | link   | Compose CTA navigates to `/compose`                                                  | URL becomes `/compose`; href attribute is `/compose`                | stays on `/dashboard`                 |
| `[data-mol-id="dashboard-recent-empty"]` | text   | "Recent sends" empty-state row visible for a fresh user, disappears after first send | visible before first send; absent after one POST `/drafts/:id/send` | persists after a real send (stale UI) |

## Hidden surfaces opened from this page

| trigger                                | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------- | ------------- | -------------------------------------------- |
| (none — sidebar nav is always visible) | —             | —                                            |

## Network calls expected during normal use

| trigger | method | path             | what request body or query is expected |
| ------- | ------ | ---------------- | -------------------------------------- |
| mount   | GET    | /api/drafts      | (none)                                 |
| mount   | GET    | /api/sent-emails | (none)                                 |
| mount   | GET    | /api/templates   | (none)                                 |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
