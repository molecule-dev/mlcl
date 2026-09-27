/**
 * FlightsAmadeus bond setup
 *
 * Wires @molecule/api-flights-amadeus to @molecule/api-flights when
 * AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are set. Without them no flights
 * provider is bonded and `lib/flights.ts` searches the seeded inventory
 * instead, so a fresh scaffold works before any vendor key exists.
 */

import { setProvider } from '@molecule/api-flights'
import { provider } from '@molecule/api-flights-amadeus'
import { logger } from '@molecule/api-logger'

export function setupFlightsAmadeus(): void {
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    setProvider(provider)
    return
  }
  logger.info(
    'flights: AMADEUS_CLIENT_ID/AMADEUS_CLIENT_SECRET not set; using the seeded inventory',
  )
}
