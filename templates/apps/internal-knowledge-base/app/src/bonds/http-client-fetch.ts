/**
 * HTTP client bond — wires a fetch-based client with the API base URL
 * configured. Without this, `useHttpClient()` returns a fallback client
 * with no baseURL, so paths like `/users/me` 404 instead of resolving
 * to `/api/users/me`.
 */

import { createFetchClient, setClient } from '@molecule/app-http'

import { API_BASE_URL } from '../config.js'

export const httpClient = createFetchClient({ baseURL: API_BASE_URL })

export function setupHttpClientFetch(): void {
  setClient(httpClient)
}
