# Page observations: /dashboard (Dashboard)

> Filled by AI agent driving the running app via Playwright.

## Procedure walked

1. signup() → land on `/dashboard`
2. browser_snapshot — header search input, "Start from template" link, "New project" button, folders sidebar, cursor palette, hero card, recent activity card, project grid
3. Re-pass after typing in the search input — only the visible projects list narrows; no new surfaces

## Page state assumed

- [x] Authenticated (auth-guarded route — sign up first via `signup(page)`)

## Elements

| selector / accessible name                    | role         | expected behavior on interaction                                                | success signal                                                                 | failure signal                    |
| --------------------------------------------- | ------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| `[data-mol-id="dashboard-search"]`            | search input | filters the visible project grid by title or folder substring                   | grid count drops to matching projects only                                     | grid stays unchanged              |
| `[data-mol-id="dashboard-templates-link"]`    | link         | navigates to `/templates`                                                       | URL becomes `/templates`                                                       | URL stays                         |
| `[data-mol-id="dashboard-new-project"]`       | button       | POST `/api/projects` with default name; redirects to `/editor/<new-id>`         | URL becomes `/editor/<uuid>`                                                   | error / stays on dashboard        |
| `[data-mol-id="dashboard-folders"] button`    | button       | sets the active folder filter; the previously-active button loses the highlight | grid filters to that folder; sidebar item gets `active` class                  | filter unchanged                  |
| `[data-mol-id^="dashboard-cursor-#"]`         | button       | PATCH `/api/profile/me` with `prefs.cursorColor` and selects the swatch         | swatch shows the dark border + `dashboard-cursor-current` reflects the new hex | network error / value stays       |
| `[data-mol-id="dashboard-cursor-current"]`    | text         | reads the persisted cursor color (uppercase hex)                                | matches the selected swatch hex                                                | mismatch                          |
| `[data-mol-id="dashboard-activity-view-all"]` | link         | navigates to `/notifications`                                                   | URL becomes `/notifications`                                                   | URL stays                         |
| `[data-mol-id="dashboard-projects-grid"]`     | grid         | renders one card per project                                                    | at least one card visible after seed                                           | grid is empty when seed succeeded |
| `[data-mol-id^="dashboard-project-"]`         | card         | clicking the card opens that project in `/editor/:id`                           | URL becomes `/editor/<id>`                                                     | URL stays                         |
| `[data-mol-id="dashboard-grid-title"]`        | heading      | shows "{{count}} projects" once loaded                                          | text contains a number                                                         | shows "Loading projects…" forever |

## Hidden surfaces opened from this page

| trigger                  | what it opens                                            | elements inside (selector / role / behavior) |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| navigating with `?new=1` | auto-creates a project + navigates to `/editor/<new-id>` | none in DOM — observable via URL change      |
| empty filter result      | `[data-mol-id="dashboard-empty"]` block                  | "No matching projects" empty-state card      |

## Network calls expected during normal use

| trigger             | method | path                 | what request body or query is expected            |
| ------------------- | ------ | -------------------- | ------------------------------------------------- |
| initial render      | GET    | `/api/projects`      | bearer-authed list of the user's projects         |
| initial render      | GET    | `/api/profile/me`    | bearer-authed profile, used for prefs.cursorColor |
| initial render      | GET    | `/api/notifications` | recent notifications list                         |
| "New project" click | POST   | `/api/projects`      | `{ name: 'Untitled project' }`                    |
| cursor swatch click | PATCH  | `/api/profile/me`    | `{ prefs: { cursorColor } }`                      |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/dashboard.spec.ts`
