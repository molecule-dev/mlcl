# Page observations: /radar (Live Radar)

> Filled by the dispatch-flagship agent on a freshly-scaffolded
> smoke-app served from VITE_PORT=3000 / API_PORT=4000.

## Page state assumed

- [x] Authenticated (sign up first via `signup(page)`)

## Elements

| selector / accessible name                                       | role       | expected behavior on interaction                         | success signal                             | failure signal            |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------------------- | ------------------------------------------ | ------------------------- |
| `getByRole('button', { name: /^Precipitation$/i })`              | layer chip | flip activeLayer to precipitation, update legend chip    | `aria-pressed=true`, layer label updates   | aria-pressed unchanged    |
| `getByRole('button', { name: /^Temperature$/i })`                | layer chip | flip activeLayer to temperature                          | aria-pressed=true                          | unchanged                 |
| `getByRole('button', { name: /^Wind$/i })`                       | layer chip | flip activeLayer to wind                                 | aria-pressed=true                          | unchanged                 |
| `getByRole('button', { name: /^Satellite$/i })`                  | layer chip | flip activeLayer to satellite                            | aria-pressed=true                          | unchanged                 |
| `iframe[title*="Radar"]` (with default)                          | iframe     | OpenStreetMap embed centred on lat/lon, marker at coords | iframe `src` includes `marker=<lat>,<lon>` | iframe absent / src empty |
| `getByRole('link', { name: /open larger map/i })`                | link       | external link to openstreetmap.org with mlat=/mlon=      | href matches `openstreetmap.org/?mlat=`    | href absent / wrong host  |
| `getByRole('link', { name: /manage locations/i })` (empty state) | link       | navigate to /locations to add a default                  | URL becomes /locations                     | stays on /radar           |

## Hidden surfaces opened from this page

| trigger | what it opens | elements inside (selector / role / behavior) |
| ------- | ------------- | -------------------------------------------- |
| (none)  | —             | radar is flat — chips and external link only |

## Network calls expected during normal use

| trigger   | method | path                   | what request body or query is expected                   |
| --------- | ------ | ---------------------- | -------------------------------------------------------- |
| page load | GET    | /api/locations/default | (returns the default location with lat/lon for centring) |

## Coverage check (final pass)

- [x] I navigated, snapshotted, listed, then re-navigated and re-listed
- [x] One full re-pass added nothing new
- [x] Every menu/modal/tab/accordion was opened and its contents observed
- [x] Every form has every field documented (name + type + validation)
- [x] Every link href / route destination is documented
- [x] Every dynamic element (loading/empty/error/populated states) is observed
- [x] All elements above have a corresponding test in `e2e/radar.spec.ts`
