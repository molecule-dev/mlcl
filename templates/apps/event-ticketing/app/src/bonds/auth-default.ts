import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { authConfig } from '../config.js'

// `WithFetchClient` (not `WithHttpSync`): the bonded http client must carry
// `baseURL: '/api'` so molecule hooks that pass UNPREFIXED paths — the
// checkout-return `useVerifyPaymentReturn()` posts `/users/:id/verify-payment/
// :provider` — land on the API instead of the SPA fallback (which answered
// 404 and silently dropped every confirmed purchase). Pages in this app pass
// `/api/...`-prefixed paths explicitly; the bonded client detects the existing
// prefix and does not double it.
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: '/api',
  withCredentials: true,
})
