import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL, authConfig } from '../config.js'

// The fetch-client variant bonds an http client whose baseURL is `/api`, so
// molecule packages that call authed endpoints with bare paths (e.g.
// `useVerifyPaymentReturn` posting `/users/:id/verify-payment/:provider`)
// reach the API instead of the SPA fallback — without it those calls 404 on
// the app origin and a checkout return never grants the paid plan.
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: API_BASE_URL,
  withCredentials: true,
})
