/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as
 * payments provider 'stripe'. The status-page billing routes
 * (`api/src/routes/billing.ts`) and the resource-user
 * payment-notification handler both look the provider up by name.
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
