import { createDefaultHttpClientWithAuthBearer } from '@molecule/app-bonds-default-react'

import { authClient } from './auth-default.js'

export const { httpClient, setupHttpDefault } = createDefaultHttpClientWithAuthBearer({
  baseURL: '/api',
  stripApiPrefix: true,
  getToken: () => authClient.getAccessToken?.() ?? null,
})
