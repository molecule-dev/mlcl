/**
 * Order merchant authorizer (M6-1) for the course-marketplace.
 *
 * `@molecule/api-resource-order` fails CLOSED on the MERCHANT-only lifecycle
 * ops — `refund`, a `updateStatus` into a merchant state (confirmed/processing/
 * shipped/delivered/refunded), and cancelling an order that has progressed past
 * `pending`. An order row records only the BUYER (`orderRow.userId`), so the
 * package cannot know who the seller is; until the app registers a merchant
 * authorizer every such op returns 403. The BUYER (order owner) may still
 * cancel their OWN order while it is still `pending` — that stays owner-gated
 * inside the package.
 *
 * course-marketplace is a MULTI-SELLER marketplace: each course is owned by the
 * instructor who authored it. Course creation sets `instructor_id` (and the
 * mirror `user_id`) to the creating user's id (see `handlers/catalog.ts`), and
 * every ownership check in the app keys off `course.instructor_id === userId`.
 * There is no platform-wide admin role — the seller IS the course's instructor.
 *
 * So the merchant for an order is the instructor who owns the order's
 * product(s): each `order_items.productId` is a course id, and the caller is a
 * merchant iff they are the instructor (`courses.instructor_id`) who owns EVERY
 * course referenced by the order — a seller may only drive an order whose items
 * are entirely their own courses.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'
import {
  type OrderMerchantAuthorizer,
  setOrderMerchantAuthorizer,
} from '@molecule/api-resource-order'

/** Minimal `order_items` row shape consulted to resolve the order's products. */
interface OrderItemProductRow {
  /** The purchased product — for this app, a course id. */
  productId: string | null
}

/** Minimal `courses` row shape consulted to resolve a course's owning seller. */
interface CourseOwnerRow {
  /** Course id. */
  id: string
  /** The owning instructor's user id (the seller). */
  instructor_id: string
}

/**
 * Seller-ownership predicate: resolves to `true` only when `userId` is the
 * instructor who owns every course referenced by the order's items. Fails
 * closed (returns `false`) when the order has no resolvable products or any
 * referenced course is owned by a different instructor.
 */
export const orderMerchantAuthorizer: OrderMerchantAuthorizer = async (orderRow, userId) => {
  if (!userId) return false

  const items = await findMany<OrderItemProductRow>('order_items', {
    where: [{ field: 'orderId', operator: '=', value: orderRow.id }],
    select: ['productId'],
    limit: 500,
  })

  const courseIds = Array.from(
    new Set(
      items
        .map((item) => item.productId)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  )
  // No resolvable product → no derivable seller. Fail closed.
  if (courseIds.length === 0) return false

  const courses = await findMany<CourseOwnerRow>('courses', {
    where: [{ field: 'id', operator: 'in', value: courseIds }],
    select: ['id', 'instructor_id'],
    limit: 500,
  })

  // Every referenced course must resolve AND be owned by this instructor.
  if (courses.length !== courseIds.length) return false
  return courses.every((course) => course.instructor_id === userId)
}

/**
 * Registers {@link orderMerchantAuthorizer} with `@molecule/api-resource-order`.
 * Called once from `setupBonds()` at startup so the order resource's
 * merchant-only ops are gated by this marketplace's seller-ownership model
 * instead of denying by default.
 */
export function setupOrderMerchantAuthorizer(): void {
  setOrderMerchantAuthorizer(orderMerchantAuthorizer)
}
