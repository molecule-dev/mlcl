import type { OrderMerchantAuthorizer } from '@molecule/api-resource-order'

import { isStoreAdmin } from './middleware/require-admin.js'

/**
 * Merchant authorizer for the order resource.
 *
 * `@molecule/api-resource-order` fails closed on every merchant lifecycle
 * operation (refund, a merchant-state status change, or cancelling an
 * already-progressed order) until the app declares who the MERCHANT is — the
 * order row records only the BUYER (`userId`), so the package cannot know who
 * the seller is. An online store is a SINGLE-merchant app: the merchant is the
 * store operator (`role === 'admin'` or an `ADMIN_EMAILS` owner), so any store
 * admin may drive any order's lifecycle, and a buyer never can. The order row
 * itself is irrelevant to that decision, hence it is ignored here.
 */
export const storeOrderMerchantAuthorizer: OrderMerchantAuthorizer = (_orderRow, userId) =>
  isStoreAdmin(userId)
