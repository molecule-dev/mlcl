import { createDefaultAuthClientWithFetchClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL, authConfig } from '../config.js'

export const { authClient, setupAuthDefault } = createDefaultAuthClientWithFetchClient(authConfig, {
  baseURL: API_BASE_URL,
  withCredentials: true,
})
