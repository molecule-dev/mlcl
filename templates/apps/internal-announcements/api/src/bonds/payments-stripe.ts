/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as payments provider 'stripe'.
 * Required by `routes/billing.ts` which calls `get('payments', 'stripe').updateSubscription`
 * to mint a real Stripe Checkout session for plan upgrades.
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
