/**
 * Local unwrap helpers that accept either a raw response body or a full
 * `HttpResponse` envelope. `useHttpClient().get()` returns `HttpResponse<T>`
 * (i.e. `{ data, status, headers, config }`) — the food-delivery pages
 * pass that whole object straight to `unwrapList(res)`, expecting the
 * helper to dig through BOTH envelopes (`HttpResponse.data` and the
 * `{ data: [...] }` API envelope). The shared `@molecule/app-http`
 * `unwrapList` only unwraps one layer, so we wrap it here.
 */

import { unwrapList as baseUnwrapList, unwrapSingle as baseUnwrapSingle } from '@molecule/app-http'

/** If `res` looks like an `HttpResponse`, return its `.data`; otherwise return it as-is. */
function peelHttpResponse(res: unknown): unknown {
  if (
    res &&
    typeof res === 'object' &&
    'data' in res &&
    'status' in res &&
    typeof (res as { status: unknown }).status === 'number'
  ) {
    return (res as { data: unknown }).data
  }
  return res
}

export function unwrapList<T>(res: unknown): T[] {
  return baseUnwrapList<T>(peelHttpResponse(res))
}

export function unwrapSingle<T>(res: unknown): T | null {
  return baseUnwrapSingle<T>(peelHttpResponse(res))
}
