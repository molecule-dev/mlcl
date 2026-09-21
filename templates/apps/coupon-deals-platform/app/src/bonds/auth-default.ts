import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL, authConfig } from '../config.js'

/**
 * WithFetchClient variant: bonds a fetch http client with `baseURL: '/api'`
 * (so molecule-package calls with UNPREFIXED paths — e.g.
 * `useVerifyPaymentReturn`'s `POST /users/:id/verify-payment/:provider` —
 * resolve against the API through the vite/dev proxy instead of the SPA
 * catch-all) AND keeps its bearer token in sync with auth events. Plain
 * `createDefaultAuthClient` did neither: the checkout-return verification
 * 404'd against the dev server and the paid plan was never granted.
 */
export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: API_BASE_URL,
  withCredentials: true,
})
