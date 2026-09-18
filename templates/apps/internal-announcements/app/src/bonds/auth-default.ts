/**
 * Default auth bond setup
 *
 * Uses the built-in createJWTAuthClient from @molecule/app-auth.
 *
 * Also configures the global HTTP client with the API_BASE_URL prefix,
 * cross-origin credentials, and a request interceptor that injects the JWT
 * bearer token from the auth client. Without this, every authenticated
 * /api/* call from `useHttpClient()` would be sent anonymously and the
 * API auth middleware would 401.
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
