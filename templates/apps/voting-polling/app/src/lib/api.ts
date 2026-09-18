/**
 * Per-app API helpers shared by every page in voting-polling.
 *
 * `unwrap` deals with handlers that return `{ data: T }` envelopes
 * (validateBody / billing / voters list) vs handlers that return the
 * row directly (polls list, notifications, results).
 *
 * @module
 */

export interface HasData<T> {
  data: T
}

export function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as object)) {
    return (res as HasData<T>).data
  }
  return res as T
}

export interface ApiError {
  status: number
  message: string
}

export async function tryRequest<T>(
  fn: () => Promise<{ data: T; status: number } | T>,
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const res = (await fn()) as { data: T; status: number } | T
    if (
      res &&
      typeof res === 'object' &&
      'data' in (res as object) &&
      'status' in (res as object)
    ) {
      const r = res as { data: T; status: number }
      return { data: unwrap<T>(r.data) ?? r.data, error: null }
    }
    return { data: res as T, error: null }
  } catch (err) {
    const status = (err as { response?: { status?: number } }).response?.status ?? 500
    const message =
      (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
      (err as Error).message ??
      'Request failed'
    return { data: null, error: { status, message } }
  }
}
