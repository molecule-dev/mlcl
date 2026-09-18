/**
 * GeolocationNominatim bond setup
 *
 * Wires @molecule/api-geolocation-nominatim to @molecule/api-geolocation
 */

import { setProvider } from '@molecule/api-geolocation'
import { provider } from '@molecule/api-geolocation-nominatim'

export function setupGeolocationNominatim(): void {
  setProvider(provider)
}
