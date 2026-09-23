import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL, authConfig } from '../config.js'

// WithFetchClient (not plain WithHttpSync): this ALSO bonds the shared
// @molecule/app-http client. Its baseURL must be '/api' even though page
// code passes '/api/...'-prefixed paths explicitly: molecule-package hooks
// pass RELATIVE paths — the checkout-return `useVerifyPaymentReturn()` POSTs
// `/users/:id/verify-payment/:provider` — and without a bonded baseURL that
// request hit the Vite SPA origin (404), silently dropping every confirmed
// purchase. The bonded client detects an existing '/api' prefix and does not
// double it, and an absolute VITE_API_URL still wins when provided.
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: API_BASE_URL || '/api',
  withCredentials: true,
})
