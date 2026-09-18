/**
 * Default HTTP bond setup
 *
 * Wires the molecule HTTP client with an auth-bearer interceptor so every
 * authenticated GET/POST/PATCH/DELETE the page-level code makes against
 * `/api/*` carries the latest JWT from the auth client. Without this
 * bridge, the client has no Authorization header and every request
 * returns 401 even when the user just signed up or logged in. The
 * interceptor reads the latest token from the JWT auth client on every
 * request, so token refreshes are picked up automatically.
 */

import { getClient } from '@molecule/app-http'

import { authClient } from './auth-default.js'

export function setupHttpDefault(): void {
  const client = getClient()
  client.addRequestInterceptor((config) => {
    const token = authClient.getAccessToken?.()
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
    }
    return config
  })
}
