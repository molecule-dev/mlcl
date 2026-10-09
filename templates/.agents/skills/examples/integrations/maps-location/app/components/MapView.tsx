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

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let map: MapInstance | undefined
    let cancelled = false

    const center: Coordinates = pins.length
      ? { lat: pins[0].lat, lng: pins[0].lng }
      : { lat: 0, lng: 0 }

    // createMap() may return the instance synchronously or as a promise
    // depending on the provider — normalize with Promise.resolve().
    void Promise.resolve(createMap({ container, center, zoom: pins.length ? 12 : 1 })).then(
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
    )

    return () => {
      cancelled = true
      map?.destroy()
    }
  }, [pins])

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
