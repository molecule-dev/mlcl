import type { HttpResponse } from '@molecule/app-http'
import { unwrapSingle } from '@molecule/app-http'

export { unwrapList, unwrapSingle } from '@molecule/app-http'

/**
 * Convenience wrapper: unwrap the body of an HttpResponse into a single
 * resource of `T`, returning `null` when the envelope is empty.
 *
 * Equivalent to `unwrapSingle<T>(res.data)` but handles the common
 * case where pages already have an `HttpResponse<unknown>` in hand.
 */
export function getBody<T>(res: HttpResponse<unknown>): T | null {
  return unwrapSingle<T>(res.data)
}
