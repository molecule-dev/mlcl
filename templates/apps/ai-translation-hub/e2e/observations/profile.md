# Page observations: /profile (Profile)

> Walked via Playwright on a fresh smoke-app at http://localhost:3130/profile.
> Headings observed: 1: Workspace member, 2: Workspace member, 3: Active language pairs.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                  | role | expected behavior on interaction | success signal         | failure signal |
| ------------------------------------------- | ---- | -------------------------------- | ---------------------- | -------------- |
| `getByRole('link', { name: /Rendition/i })` | a    | navigates to /dashboard          | URL becomes /dashboard | no change      |
| `[data-mol-id="nav-projects"]`              | a    | navigates to /projects           | URL becomes /projects  | no change      |
| `[data-mol-id="nav-glossary"]`              | a    | navigates to /glossary           | URL becomes /glossary  | no change      |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside |
| ------- | ------------- | --------------- |

## Network calls expected during normal use

| trigger   | method | path            | expected body |
| --------- | ------ | --------------- | ------------- |
| Page load | GET    | /api/projects   | response 200  |
| Page load | GET    | /api/segments   | response 200  |
| Page load | GET    | /api/users/:id/ | response 200  |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/profile.spec.ts`
