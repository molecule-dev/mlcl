import { findMany } from '@molecule/api-database'

/**
 * Vendors can be `active`, `pending`, or `suspended`. A suspended (or not-yet-approved `pending`)
 * vendor must not have their products publicly served or purchasable — but the product catalog,
 * search, cart, and checkout only ever filtered `products.status = 'active'` and never joined the
 * owning vendor's status, so a suspended vendor kept selling. These helpers close that gap.
 *
 * @module
 */

/**
 * Returns the IDs of vendors that are currently active. Product-listing queries push
 * `{ field: 'vendor_id', operator: 'in', value: activeVendorIds() }` into their `where` so a
 * suspended/pending vendor's products drop out of the catalog and search.
 */
export async function activeVendorIds(): Promise<string[]> {
  const vendors = await findMany<{ id: string }>('vendors', {
    where: [{ field: 'status', operator: '=', value: 'active' }],
  })
  return vendors.map((v) => String(v.id))
}

/**
 * True when a product's owning vendor is active (or the product has no vendor). Used by the
 * single-product paths (detail, cart-add, checkout) that already load the vendor, to reject a
 * suspended vendor's product with a 404.
 */
export function vendorIsActive(
  productVendorId: unknown,
  vendor: { status?: unknown } | null | undefined,
): boolean {
  if (!productVendorId) return true
  return vendor?.status === 'active'
}
