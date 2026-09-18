import { createDefaultHttpClientWithAuthBearer } from '@molecule/app-bonds-default-react'

import { authClient } from './auth-default.js'

export const { httpClient, setupHttpDefault } = createDefaultHttpClientWithAuthBearer({
  baseURL: (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api',
  withCredentials: true,
  stripApiPrefix: true,
  getToken: () => authClient.getAccessToken?.() ?? null,
})
