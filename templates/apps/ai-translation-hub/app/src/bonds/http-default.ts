/**
 * Default HTTP bond setup
 *
 * Wires a fetch-based client with the app's API base URL plus an
 * interceptor that adds the auth bearer token from the JWT auth client.
 *
 * The baseURL convention matches the rest of the molecule.dev flagships:
 * `VITE_API_URL` already includes the `/api` prefix (e.g.
 * `http://localhost:4080/api`) and falls back to the same-origin
 * proxied `/api` path. All page-level calls therefore use bare resource
 * paths like `http.get('/projects')` and resolve to `/api/projects`.
 */

import { createFetchClient, setClient } from '@molecule/app-http'

import { authClient } from './auth-default.js'

export function setupHttpDefault(): void {
  const baseURL =
    ((import.meta.env?.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '') || '/api'
  const client = createFetchClient({ baseURL, withCredentials: true })

  client.addRequestInterceptor((config) => {
    const token = authClient.getAccessToken?.()
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` }
    }
    return config
  })

  setClient(client)
}
