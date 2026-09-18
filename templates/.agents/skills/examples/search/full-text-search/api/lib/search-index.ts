import { findMany } from '@molecule/api-database'
import { bulkIndex, deleteDocument, index } from '@molecule/api-search'

/**
 * The INDEX side of search. `handlers/search.ts` only QUERIES — nothing is findable
 * until you ALSO index your rows here. Search returning zero results almost always
 * means the index is empty, not that the query is wrong. Two things are required:
 *
 *   1. Keep the index in sync on writes — call `indexProduct()` after every
 *      create()/updateById() and `removeProduct()` after every deleteById().
 *   2. Backfill once — call `backfillProducts()` at startup (AFTER `setupBonds()`
 *      wires the search bond) so rows that already existed become searchable.
 *
 * The `document` fields you index are exactly what `search()` returns (the handler
 * flattens `hit.document` → `title`/`excerpt`), so index the fields the UI shows +
 * anything you filter on. This file is a TEMPLATE: `products`/`ProductRow`/the field
 * mapping are placeholders — point them at your app's real table, index name, and
 * fields (mirror the index names the search handler allows).
 */

const INDEX = 'products' // must match an index name the search handler queries

type ProductRow = { id: string; title: string; description?: string | null; price?: number | null }

/** The document shape stored in the index — index only what you search/show/filter on. */
const toDocument = (p: ProductRow): Record<string, unknown> => ({
  title: p.title,
  excerpt: (p.description ?? '').slice(0, 160),
  price: p.price ?? 0,
})

/** Index (create or update) one product. Call after `create()` / `updateById()`. */
export async function indexProduct(p: ProductRow): Promise<void> {
  await index(INDEX, p.id, toDocument(p))
}

/**
 * Remove a product from the index. Call after `deleteById()`. The remove function is
 * `deleteDocument(indexName, id)` — there is NO `removeFromIndex()`.
 */
export async function removeProduct(id: string): Promise<void> {
  await deleteDocument(INDEX, id)
}

/** Backfill every existing product into the index. Call ONCE at startup, after `setupBonds()`. */
export async function backfillProducts(): Promise<void> {
  const rows = await findMany<ProductRow>('products', { limit: 10_000 })
  await bulkIndex(
    INDEX,
    rows.map((p) => ({ id: p.id, document: toDocument(p) })),
  )
}
