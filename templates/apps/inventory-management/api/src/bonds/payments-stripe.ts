/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as
 * payments provider 'stripe'. The pricing/checkout routes look the
 * provider up via `get('payments', 'stripe')`, so this bond MUST be
 * present whenever the inventory-management billing tiers are wired.
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
