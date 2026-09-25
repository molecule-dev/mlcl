import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL, authConfig } from '../config.js'

// WithFetchClient (not plain WithHttpSync): this ALSO bonds the shared
// @molecule/app-http client. Molecule-package hooks pass RELATIVE paths —
// useVerifyPaymentReturn POSTs /users/:id/verify-payment/:provider — and
// without a bonded baseURL that request hit the Vite SPA origin (404), so
// the checkout return page never actually confirmed the purchase. App pages
// that hard-code the `/api` prefix are unaffected: the bonded client never
// double-prefixes. `|| '/api'` covers the same-origin dev shape where
// VITE_API_URL is deliberately empty (config.ts strips a trailing `/api`,
// so API_BASE_URL arrives as '') — the hooks' unprefixed paths still need
// the proxy prefix to land on the API.
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: API_BASE_URL || '/api',
  withCredentials: true,
})
