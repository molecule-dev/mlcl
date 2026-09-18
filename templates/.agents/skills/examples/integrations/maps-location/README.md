---
name: maps-location
intent: |
  - "Maps"
  - "Location picker"
  - "Address autocomplete"
  - "Show pins on a map"
  - "Geo / nearby"
keywords:
  [
    map,
    maps,
    marker,
    markers,
    pin,
    pins,
    location,
    address,
    geo,
    gps,
    leaflet,
    openstreetmap,
    osm,
    nominatim,
    mapbox,
    google-maps,
    nearby,
  ]
---

# Maps + location picker (address autocomplete + pins)

**When to copy this example:** the user wants a map UI — address
search, pin display, "near me" filtering.

**Works with NO API keys out of the box:** the map tiles come from
`@molecule/app-maps-leaflet` (Leaflet + OpenStreetMap) and geocoding
from `@molecule/api-geolocation-nominatim` (OSM Nominatim) — both
keyless. Swap in a metered provider (Mapbox / Google) later for
production scale; the handler + component code do not change.

## What you'll install

```bash
cd /workspace
# Client map (tiles + pins) — the feature core + the real Leaflet/OSM provider.
# WITHOUT the -leaflet provider, @molecule/app-maps only draws a grey placeholder.
npm install @molecule/app-maps @molecule/app-maps-leaflet --workspace=app
# Geocoding (address → lat/lng) — core interface + keyless Nominatim provider:
npm install @molecule/api-geolocation @molecule/api-geolocation-nominatim --workspace=api
# Throttle the geocoding proxy (also required by Nominatim's 1 req/sec policy):
npm install @molecule/api-rate-limit @molecule/api-rate-limit-memory --workspace=api
```

## Files in this example

| Path                              | What it does                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `api/handlers/places.ts`          | `POST /places { address }` — proxies to the bonded geocoder via `@molecule/api-geolocation`, returns `{ lat, lng, formatted }`. Server-side (keeps any provider key off the client) and rate-limited per IP so the metered call can't be abused. |
| `app/components/AddressInput.tsx` | Debounced address field. Geocodes typed text via `POST /api/places` and, on selecting the resolved suggestion, emits `{ lat, lng, formatted }` upward.                                                                                           |
| `app/components/MapView.tsx`      | `<MapView pins={[{lat, lng, label}]} />` — wraps the imperative `createMap()` from `@molecule/app-maps` in a ref + effect (provider-agnostic; renders real tiles once the Leaflet provider is bonded).                                           |

## Required env

None for the keyless default (OpenStreetMap tiles + Nominatim geocoding).

Only if you swap the **geocoding** provider for a metered one:

```
# @molecule/api-geolocation-mapbox
MAPBOX_ACCESS_TOKEN=...
# or @molecule/api-geolocation-google
GOOGLE_MAPS_API_KEY=...
```

Leaflet + OSM tiles need no token at all.

## Bond wiring

**Client — the map provider** (app entry, e.g. `app/src/main.tsx`, ONCE):

```typescript
import 'leaflet/dist/leaflet.css' // REQUIRED — without it tiles + markers misposition
import { setProvider } from '@molecule/app-maps'
import { provider } from '@molecule/app-maps-leaflet'

setProvider(provider) // now createMap() renders a real OpenStreetMap map
```

**API — the geocoding provider** (`api/bonds.ts` or `api/index.ts`):

```typescript
import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-nominatim'

setProvider(provider) // keyless; swap for -mapbox / -google for production scale
```

## Anti-patterns

- Do not invent package names like `@molecule/app-google-maps` or
  `@molecule/app-map-mapbox-react`. The registered map feature package
  is `@molecule/app-maps` and its keyless renderer is
  `@molecule/app-maps-leaflet`. Use the registered provider names.
- Do not forget `import 'leaflet/dist/leaflet.css'` once in your app
  entry. Without it the tiles and markers are mispositioned — the #1
  "my Leaflet map looks broken" cause. The map container also needs an
  explicit height (MapView sets 400px); a zero-height parent renders a
  blank map.
- Do not skip bonding a real map provider. `@molecule/app-maps` on its
  own falls back to a grey placeholder panel (it does not throw) — a map
  that never shows tiles usually means `setProvider(provider)` from
  `@molecule/app-maps-leaflet` was never called.
- Do not autocomplete-as-you-type against public Nominatim. Its usage
  policy is max 1 request/second with an identifying User-Agent — debounce
  the client aggressively (AddressInput does) and rate-limit the proxy.
  For heavy typeahead, swap to a metered provider (Mapbox / Google).
- Do not put a metered geocoding secret in client code. Keep geocoding
  server-side behind `POST /api/places` (this example does) so the key —
  when you use one — never ships to the browser.
- Do not leave the geocoding proxy unthrottled. It's reachable without
  auth — a hot typeahead loop or abuse runs up the bill (metered
  providers) or trips the usage policy (Nominatim). Rate-limit per IP
  with `consume()` from `@molecule/api-rate-limit`.
- Do not store user-typed address strings as the source of truth.
  Always geocode + store `(lat, lng, formatted)` so future searches
  work. Note the field is `lng`, not `lon` — that is what `GeoResult`
  from `@molecule/api-geolocation` returns.
- Do not load the map library on every page. Lazy-import the MapView
  component on routes that need it.
- Do not call `geocode()` without first calling `setProvider()` in your
  API bond wiring. The core package throws if no provider is bonded.

## Verify

User types "1600 Amphitheatre" → typeahead suggests Mountain View
address → user clicks → the Leaflet/OSM map renders with a pin → form
receives `{ lat, lng, formatted }`. All with no API keys.
