/**
 * Order merchant-authorizer wiring (M6-1).
 *
 * `@molecule/api-resource-order` FAILS CLOSED on merchant lifecycle ops — refund,
 * a merchant-state `updateStatus` (confirmed/processing/shipped/delivered/refunded),
 * and cancelling an already-progressed (non-`pending`) order. Until an app
 * registers a merchant authorizer, every such op returns 403 (secure by default).
 * An order row records only the BUYER (`userId`), so the package cannot know who
 * the seller is — this app MUST supply that knowledge.
 *
 * This store is a Gumroad-style creator marketplace: there is NO admin role. A
 * user is the MERCHANT/seller for an order when they are the CREATOR of (one of)
 * the order's products — the exact `products.creator_id` ownership the products,
 * sales, analytics, and licenses handlers already enforce seller-side. The buyer
 * (the order owner) is NEVER the merchant; the buyer's only self-service
 * lifecycle action is cancelling their own still-`pending` order (handled by the
 * package's owner check).
 *
 * @module
 */

import { findMany } from '@molecule/api-database'
import { type OrderRow, setOrderMerchantAuthorizer } from '@molecule/api-resource-order'

/** Subset of an `order_items` row needed to resolve the product. */
interface OrderItemRow {
  /** The product purchased in this line. */
  productId: string
}

/** Subset of a `products` row needed to resolve seller ownership. */
interface ProductRow {
  /** The user who created (and therefore sells) this product. */
  creator_id: string | null
}

/**
 * Registers this store's order merchant authorizer: a caller may drive an order's
 * merchant lifecycle (refund / ship / deliver / cancel-progressed) only when they
 * created at least one of the order's products. Call once at startup.
 */
export function setupResourceOrder(): void {
  setOrderMerchantAuthorizer(async (orderRow: OrderRow, userId: string): Promise<boolean> => {
    if (!userId) {
      return false
    }
    const items = await findMany<OrderItemRow>('order_items', {
      where: [{ field: 'orderId', operator: '=', value: orderRow.id }],
    })
    const productIds = items.map((item) => item.productId).filter(Boolean)
    if (productIds.length === 0) {
      return false
    }
    const products = await findMany<ProductRow>('products', {
      where: [{ field: 'id', operator: 'in', value: productIds }],
    })
    return products.some((product) => product.creator_id === userId)
  })
}
