/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as payments
 * provider 'stripe'. Required by the /api/users/:id/verify-payment/:provider
 * checkout-return route (the /plan-updated page calls it to grant the paid
 * plan). Without this bond the route 500s on every call instead of answering
 * with the actionable "STRIPE_SECRET_KEY not set" 503.
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
