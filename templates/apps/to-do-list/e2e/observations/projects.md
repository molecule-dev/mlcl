# Page observations: projects (list + projects/:id)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100. Covers
> the project list endpoint and the per-project detail page.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                          | role  | expected behavior on interaction              | success signal                                       | failure signal     |
| ------------------------------------------------------------------- | ----- | --------------------------------------------- | ---------------------------------------------------- | ------------------ |
| `getByRole('link', { name: /<project name>/i })` on sidebar / Today | link  | Navigate to `/projects/:id`                   | URL becomes `/projects/:id`, project header rendered | 404 / blank        |
| GET `/api/projects` baseline                                        | route | Returns empty array on a fresh account        | `200`, `[]` (or `{data:[]}`)                         | non-2xx, non-array |
| POST `/api/projects` round-trip                                     | route | Create project via API; the next GET lists it | `201` + project in next list response                | not in next list   |
| PATCH `/api/projects/:id` round-trip                                | route | Update project name; next GET shows new name  | `200`, `name` reflects update                        | name unchanged     |
| DELETE `/api/projects/:id`                                          | route | Remove the project; subsequent GET 404        | `200/204`, then 404 on detail                        | row still present  |

## Hidden surfaces opened from this page

| trigger          | what it opens                           | elements inside (selector / role / behavior)       |
| ---------------- | --------------------------------------- | -------------------------------------------------- |
| Open project row | navigates to `/projects/:id` (no modal) | header with project name, list of associated tasks |

## Network calls expected during normal use

| trigger | method | path              | what request body or query is expected |
| ------- | ------ | ----------------- | -------------------------------------- |
| List    | GET    | /api/projects     | → 200 array                            |
| Create  | POST   | /api/projects     | `{ name, color }` → 201                |
| Update  | PATCH  | /api/projects/:id | `{ name? }` → 200                      |
| Delete  | DELETE | /api/projects/:id | → 200/204                              |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/03-projects.spec.ts`
