# Page observations: /locations (Saved Locations)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                        | role          | expected behavior on interaction                                               | success signal                                          | failure signal                  |
| ------------------------------------------------- | ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------- |
| `input[type="search"]`                            | search input  | client-side filter — type a fragment, only matching cards remain               | non-matching names hidden                               | every card stays visible        |
| `getByRole('button', { name: /add location/i })`  | button        | open the Add-location modal                                                    | modal appears with address+name+default fields          | nothing happens                 |
| `input[placeholder*="Brooklyn"]` (in modal)       | text input    | accepts free-form address that geocodes via Nominatim                          | submit creates location                                 | modal stays open / no row added |
| `input[type="checkbox"]` (in modal)               | checkbox      | toggle "set as default"                                                        | submitted location flips default                        | other defaults remain           |
| `getByRole('button', { name: /save location/i })` | submit button | POST /api/locations + close modal                                              | new card visible in list                                | toast / 4xx                     |
| `LocationCard` star pip                           | button        | flip default — `aria-pressed` toggles + PUT /api/locations/:id is_default=true | star fills + DEFAULT badge moves                        | star unchanged                  |
| `LocationCard` close pip                          | button        | DELETE /api/locations/:id + remove from list (server-confirmed)                | card disappears + GET /api/locations no longer lists it | card stays                      |
| `LocationCard` body link                          | link          | navigate to /location/:id                                                      | URL becomes /location/<uuid>                            | stays on /locations             |

## Hidden surfaces opened from this page

| trigger                                          | what it opens      | elements inside (selector / role / behavior)                                              |
| ------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------- |
| `getByRole('button', { name: /add location/i })` | Add-location modal | address input, optional name input, "Set as default" checkbox, Save button, Cancel button |

## Network calls expected during normal use

| trigger          | method | path               | what request body or query is expected                               |
| ---------------- | ------ | ------------------ | -------------------------------------------------------------------- |
| page load        | GET    | /api/locations     | (returns array of saved locations)                                   |
| Save location    | POST   | /api/locations     | `{ name, address, is_default }` — server geocodes address to lat/lon |
| Default star pip | PUT    | /api/locations/:id | `{ is_default: true }` — handler unsets old defaults                 |
| Close pip        | DELETE | /api/locations/:id | (no body) — handler removes row + reassigns default if needed        |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/locations.spec.ts`
