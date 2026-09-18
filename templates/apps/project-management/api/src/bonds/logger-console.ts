/**
 * Console logger bond — explicit bonding for reference parity with production wiring.
 */

import { setLogger } from '@molecule/api-logger'
import { provider as consoleLogger } from '@molecule/api-logger-console'

export function setupLoggerConsole(): void {
  setLogger(consoleLogger)
}
