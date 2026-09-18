/**
 * AppRoutingReactRouter bond setup
 *
 * Wires @molecule/app-routing-react-router to @molecule/app-routing
 */

import { setRouter } from '@molecule/app-routing'
import { provider } from '@molecule/app-routing-react-router'

export function setupAppRoutingReactRouter(): void {
  setRouter(provider)
}
