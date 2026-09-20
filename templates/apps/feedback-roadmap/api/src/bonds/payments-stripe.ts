/**
 * PaymentsStripe bond setup
 *
 * Wires @molecule/api-payments-stripe to the bond registry as payments
 * provider 'stripe'. Required for /api/billing/checkout (real Stripe
 * Checkout sessions) and /api/users/payment-notification/stripe
 * (post-checkout subscription verification).
 */

import { bond } from '@molecule/api-bond'
import { paymentProvider } from '@molecule/api-payments-stripe'

export function setupPaymentsStripe(): void {
  bond('payments', 'stripe', paymentProvider)
}
