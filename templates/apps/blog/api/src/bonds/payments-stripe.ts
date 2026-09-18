/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as
 * payments provider 'stripe'. The blog billing routes
 * (`api/src/routes/billing.ts`) and the resource-user webhook handler
 * both look the provider up by name.
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
