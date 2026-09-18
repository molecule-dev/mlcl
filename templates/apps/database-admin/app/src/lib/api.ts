/**
 * Thin convenience wrappers around the molecule app-http client.
 *
 * The underlying client returns `HttpResponse<T>` ({ data, status, ... }).
 * Most call-sites only care about `.data`, so these helpers let pages write
 * `await api.get<T>(...)` instead of `(await http.get<T>(...)).data`.
 *
 * Callers that need the full response (status code, headers) should use
 * `useHttpClient()` directly.
 */
import type { HttpClient } from '@molecule/app-http'

type AnyClient = HttpClient

export async function apiGet<T = unknown>(http: AnyClient, url: string): Promise<T> {
  const res = await http.get<T>(url)
  return res.data
}

export async function apiPost<T = unknown, B = unknown>(
  http: AnyClient,
  url: string,
  body?: B,
): Promise<T> {
  const res = await http.post<T>(url, body)
  return res.data
}

export async function apiPut<T = unknown, B = unknown>(
  http: AnyClient,
  url: string,
  body?: B,
): Promise<T> {
  const res = await http.put<T>(url, body)
  return res.data
}

export async function apiPatch<T = unknown, B = unknown>(
  http: AnyClient,
  url: string,
  body?: B,
): Promise<T> {
  const res = await http.patch<T>(url, body)
  return res.data
}

export async function apiDelete<T = unknown>(http: AnyClient, url: string): Promise<T> {
  const res = await http.delete<T>(url)
  return res.data
}
