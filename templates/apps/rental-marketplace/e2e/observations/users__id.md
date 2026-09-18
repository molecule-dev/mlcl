# Page observations: /users/:id (Profile)

Public host/profile page — gradient hero with photo + Superhost badge,
three stats (trips hosted / reviews / rating), about + verifications
sidebar, and the host's listings grid.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`; the route is
      inside AuthGuard. Use a host id pulled from /api/listings.)

## Elements

| selector / accessible name                                                               | role    | expected behavior on interaction                         | success signal                        | failure signal       |
| ---------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------- | ------------------------------------- | -------------------- |
| Listing tile in the host's listings grid `page.locator('a[href^="/listings/"]').first()` | link    | navigate to /listings/:id for one of the host's listings | listing detail page renders           | no navigation        |
| Host name heading `getByRole('heading', { level: 1 })`                                   | heading | shows host's name                                        | matches /api/hosts/:id payload's name | wrong name           |
| Stats grid (3 stats)                                                                     | text    | populated from /api/hosts/:id stats                      | numbers > 0 for seeded hosts          | shows 0/—            |
| Superhost badge (when is_superhost=true)                                                 | text    | shows "Superhost" pill                                   | visible for seeded superhosts         | hidden when expected |

## Hidden surfaces opened from this page

(none — flat profile page)

## Network calls expected during normal use

| trigger       | method | path                    | what request body or query is expected |
| ------------- | ------ | ----------------------- | -------------------------------------- |
| initial mount | GET    | /api/hosts/:id          | 200 with profile + stats               |
| initial mount | GET    | /api/hosts/:id/listings | 200 with active listings               |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/users__id.spec.ts`
