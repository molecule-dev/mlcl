# Page observations: /templates/:id (Template detail)

> Authenticated. Detail page for a single template. Renders the
> template name (h1), description, "Use template" CTA (POST
> /api/templates/:id/instantiate → /board/:id), "Delete template"
> button (DELETE /api/templates/:id; non-system only), and a back link
> to /templates.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                                                   | role      | expected behavior on interaction                                                  | success signal                                                     | failure signal              |
| -------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------- |
| name + description + use + back (h1 / text / `template-detail-use` / `template-detail-back`) | composite | core detail-page contract — all four visible on a freshly-seeded template         | h1 + body text visible, use enabled, back visible                  | any one missing / empty     |
| `[data-mol-id="template-detail-use"]`                                                        | button    | POST /api/templates/:id/instantiate; 2xx returns `{ id }`; navigate to /board/:id | URL becomes /board/:id with snapshot's elements seeded             | stays on /templates/:id     |
| `[data-mol-id="template-detail-delete"]`                                                     | button    | DELETE /api/templates/:id (non-system only); on 2xx routes back to /templates     | template missing from GET /templates afterward + URL is /templates | template still listed / 4xx |
| `[data-mol-id="template-detail-back"]`                                                       | link      | nav back to /templates                                                            | URL becomes /templates                                             | stays on /templates/:id     |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger      | method | path                           | what request body or query is expected |
| ------------ | ------ | ------------------------------ | -------------------------------------- |
| page load    | GET    | /api/templates/:id             | 200 returns the template row           |
| Use template | POST   | /api/templates/:id/instantiate | 2xx returns `{ id }` for the new board |
| Delete       | DELETE | /api/templates/:id             | 204 (or 403/404 for system templates)  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/templates__id.spec.ts`
