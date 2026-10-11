import { useEffect, useRef } from 'react'

import {
  type Coordinates,
  createMap,
  type MapInstance,
  type MarkerConfig,
} from '@molecule/app-maps'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * A pin to drop on the map. `lat`/`lng` match the `Coordinates` shape from
 * `@molecule/app-maps` — the field is `lng`, NOT `lon`.
 */
export type Pin = { lat: number; lng: number; label?: string }

/**
 * Renders a map with the given pins using the bonded map provider from
 * `@molecule/app-maps`.
 *
 * `createMap()` is imperative — it takes a container element and returns a
 * `MapInstance` — so this component wraps it in a ref + effect. Two gotchas the
 * package documents:
 *
 * - The container MUST have an explicit height, or the map renders invisible
 *   (it fills 100% of its parent, and a zero-height parent is the classic
 *   blank-map trap). `height` defaults to 400px here.
 * - If no real provider is bonded (`setProvider(...)` / `bond('maps', ...)`),
 *   the package falls back to a grey placeholder panel instead of throwing.
 *   Wire a real `MapProvider` in your app bonds to show actual tiles.
 */
export function MapView({ pins, height = 400 }: { pins: Pin[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // The latest pins for the effect body below: the effect is keyed on the pins'
  // CONTENT (see `pinsKey`), and a ref read keeps the body on the newest array
  // without re-running when only the array's IDENTITY changed.
  const pinsRef = useRef(pins)
  pinsRef.current = pins
  /**
   * The pins' content, as the effect's dependency.
   *
   * Keyed on the array itself, the effect re-ran on every parent render that
   * passed a fresh array — `<MapView pins={[{ lat, lng }]} />`, the usage this
   * slice's README documents, is a new array each render. The cleanup called
   * `map.destroy()` and the body built a new map: the reader's pan and zoom were
   * thrown away and every tile was re-requested, on any unrelated state change
   * in the parent (a keystroke in a sibling field, a poll, a toast). The
   * CONTENT is what actually invalidates a map.
   */
  const pinsKey = JSON.stringify(pins)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const pins = pinsRef.current
    let map: MapInstance | undefined
    let cancelled = false

    const center: Coordinates = pins.length
      ? { lat: pins[0].lat, lng: pins[0].lng }
      : { lat: 0, lng: 0 }

    // createMap() may return the instance synchronously or as a promise
    // depending on the provider — normalize with Promise.resolve(). It may also
    // THROW synchronously (a provider rejecting a bad container, a style, or an
    // element that already holds a map), so the call is deferred into the chain
    // rather than evaluated as `Promise.resolve`'s ARGUMENT: there the throw
    // escaped the effect and the rejection handler below was dead code for
    // exactly the failure it was written for — React surfaced the exception out
    // of the passive effect (an error boundary, or a blank panel with nothing
    // logged) instead of the logged, blank-panel failure.
    void Promise.resolve()
      .then(() => createMap({ container, center, zoom: pins.length ? 12 : 1 }))
      .then(
        (instance) => {
          if (cancelled) {
            instance.destroy()
            return
          }
          map = instance
          pins.forEach((pin, i) => {
            const marker: MarkerConfig = {
              id: `pin-${i}`,
              position: { lat: pin.lat, lng: pin.lng },
              title: pin.label,
            }
            map?.addMarker(marker)
          })
        },
        (error: unknown) => {
          // A createMap that REJECTS or THROWS must not vanish as an unhandled
          // rejection or escape the effect — the container would just stay blank
          // with nothing to diagnose.
          console.error('map failed to initialize', error)
        },
      )

    return () => {
      cancelled = true
      map?.destroy()
    }
  }, [pinsKey])

  return (
    <div
      ref={containerRef}
      data-mol-id="map-view"
      className={cm.cn(cm.card({}))}
      style={{ height, width: '100%', overflow: 'hidden' }}
    />
  )
}

export default MapView
