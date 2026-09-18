/**
 * HttpAxios bond setup
 *
 * Wires @molecule/api-http-axios to @molecule/api-http
 */

import { setClient } from '@molecule/api-http'
import { provider } from '@molecule/api-http-axios'

export function setupHttpAxios(): void {
  setClient(provider)
}
