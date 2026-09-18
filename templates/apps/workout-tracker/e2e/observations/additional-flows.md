# Page observations: cross-cutting flows (records filter, history CSV, repeat workout, exercise detail, set deletion, dashboard recents, 404)

> Walked via the running app on VITE_PORT=3100 / API_PORT=4100.
> Each section below covers one feature surface that doesn't fit neatly
> into a single page-stem and lives in `11-additional-flows.spec.ts`.

## Page state assumed

- [x] Authenticated for every section except the trailing 404 case which
      is reachable while signed-out.

## Elements

| selector / accessible name                                     | role           | expected behavior on interaction                                                                                                                               | success signal                                               | failure signal                              |
| -------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `/records` filter buttons (`Filter`, `5RM`, `All`)             | button         | clicking a kind narrows the table; "All" restores                                                                                                              | table tbody row count matches the filter                     | counts unchanged or wrong                   |
| `getByTestId('export-csv')` on `/history`                      | button         | issues download of `workout-history-YYYY-MM-DD.csv` containing real numbers (`Date,Workout,Volume,Unit,Duration (min),Sets` header + the actual workout total) | file lands with size > 0 and matching contents               | no `download` event fires, empty file       |
| `getByTestId('repeat-workout')` on `/history/:id`              | button         | POSTs a new workout (clones from source), navigates to `/workout/active`; GET `/api/workouts/active` returns a _different_ id with `status='in_progress'`      | URL becomes `/workout/active` and active row id ≠ source id  | stays on detail page or new id == source id |
| `/exercises/:id` stats triad + recent-sessions table           | region + table | renders `Best est. 1RM` (Epley), `90 × 5` last-session row, ≥1 row in recent sessions                                                                          | all three numbers visible                                    | empty state, NaN, missing card              |
| `/workout/active` set deletion via `getByTestId('delete-set')` | button         | DELETE the set, total volume drops by that set's contribution; persists across reload                                                                          | `total-volume` reflects new total and reload preserves count | total unchanged or set re-appears on reload |
| `/dashboard` recent-workouts list                              | region         | last completed workout's name appears in the recent list immediately after `/workouts/:id/complete`                                                            | name visible                                                 | dashboard empty / outdated                  |
| `/this-route-does-not-exist` 404 page                          | heading + link | renders 404 heading and a "Back to dashboard" link                                                                                                             | both visible                                                 | server error, blank page                    |

## Hidden surfaces opened from this page

| trigger                    | what it opens                   | elements inside                                    |
| -------------------------- | ------------------------------- | -------------------------------------------------- |
| `/records` `Filter` button | filter popover/expanded toolbar | kind buttons (`All`, `1RM`, `5RM`, `Volume`, etc.) |

## Network calls expected during normal use

| trigger               | method         | path                                            | expected body                                                |
| --------------------- | -------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Records filter "All"  | GET            | /api/records                                    | array of records with mixed `kind`                           |
| History CSV export    | GET (download) | (in-page blob; data sourced from /api/workouts) | text/csv with `Date,Workout,Volume,Unit,Duration (min),Sets` |
| Repeat workout        | POST           | /api/workouts                                   | 201, `{ id, status: 'in_progress' }`                         |
| Exercise detail stats | GET            | /api/exercises/:id/sessions (or equivalent)     | recent session rows including the just-logged 90×5           |
| Set deletion          | DELETE         | /api/workouts/:id/sets/:setId                   | 200; subsequent GET shows the set gone                       |
| Dashboard recents     | GET            | /api/workouts?status=completed                  | latest finished workout(s) including the seeded one          |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/11-additional-flows.spec.ts`
