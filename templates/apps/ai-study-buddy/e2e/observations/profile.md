# Page observations: /profile (User profile + achievements)

Captured by walking the live profile page (vite=3110, api=4110) after a
fresh `mlcl create`. Auth-protected — sign up first.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role      | expected behavior on interaction                             | success signal                                   | failure signal                       |
| ------------------------------------------------- | --------- | ------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------ |
| `[data-mol-id="page-profile"]`                    | container | top-level wrapper renders for an authed user                 | visible after login                              | redirected to `/login`               |
| `getByRole('heading', { name: /your profile/i })` | heading   | h1 rendered after profile loads                              | visible                                          | missing                              |
| `getByText(/member since/i)`                      | text      | renders the signup year derived from `created_at`            | visible                                          | missing or empty year                |
| `getByText(/active subjects/i)`                   | text      | renders the KPI tile label for active subjects               | visible                                          | missing                              |
| `getByText(/total hours/i)`                       | text      | renders KPI tile label for total study hours                 | visible                                          | missing                              |
| `getByText(/quizzes taken/i)`                     | text      | renders KPI tile label for quiz count                        | visible                                          | missing                              |
| `getByText(/badges earned/i)`                     | text      | renders KPI tile label for badges (`X / Y`)                  | visible                                          | missing                              |
| `getByRole('heading', { name: /achievements/i })` | heading   | h3 introducing the achievement list section                  | visible                                          | missing                              |
| email/name display in profile card                | text      | shows the signed-in user's email or name on the profile card | email or local-part of email visible on the page | neither rendered (data fetch failed) |

## Hidden surfaces opened from this page

| trigger                                                  | what it opens | elements inside (selector / role / behavior) |
| -------------------------------------------------------- | ------------- | -------------------------------------------- |
| (none — flat profile page; no menus or modals open here) | —             | —                                            |

## Network calls expected during normal use

| trigger    | method | path           | what request body or query is expected                         |
| ---------- | ------ | -------------- | -------------------------------------------------------------- |
| page mount | GET    | `/api/profile` | none — Bearer token; returns `{ profile, kpis, achievements }` |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/29-profile.spec.ts`
