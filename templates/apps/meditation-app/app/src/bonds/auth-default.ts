/**
 * Default auth bond setup
 *
 * Uses the built-in createJWTAuthClient from @molecule/app-auth.
 * Swap to a different auth provider by replacing this bond.
 *
 * Also wires the global http client (used by useHttpClient()) to the
 * `/api` base URL and forwards the JWT bearer token from the auth client
 * on every request — same pattern as ai-content-moderator. This lets
 * pages call `http.get('/sessions')` and have it routed to `/api/sessions`
 * with the auth header already attached.
 */

import { createJWTAuthClient, setClient as setAuthClient } from '@molecule/app-auth'
import { createFetchClient, setClient as setHttpClient } from '@molecule/app-http'

import { API_BASE_URL, authConfig } from '../config.js'

export const authClient = createJWTAuthClient(authConfig)

export function setupAuthDefault(): void {
  setAuthClient(authClient)

  const httpClient = createFetchClient({
    baseURL: API_BASE_URL,
    withCredentials: true,
  })
  httpClient.addRequestInterceptor((config) => {
    const token = authClient.getAccessToken()
    if (token) {
      config.headers = {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${token}`,
      }
    }
    return config
  })
  setHttpClient(httpClient)
}
