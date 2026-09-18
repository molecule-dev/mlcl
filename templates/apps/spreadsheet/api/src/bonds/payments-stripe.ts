/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as payments
 * provider 'stripe'. Required by /api/billing/checkout and /api/billing/cancel
 * (see api/src/routes/billing.ts which calls `get<PaymentProvider>('payments',
 * 'stripe')`).
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
