/**
 * ServicePayment bond setup
 *
 * Registers the plan + paymentRecord services from @molecule/api-resource-payment
 * on the bond registry. The verify-payment checkout-return route resolves plans
 * (and binds payment records first-claim-wins) through these bonds; without them
 * the route cannot map a verified Stripe price back to this app's tier ladder.
 */

export { setupServicePayment } from '@molecule/api-bonds-default-express'
