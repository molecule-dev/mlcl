import { createDefaultHttpClient } from '@molecule/app-bonds-default-react'

import { API_BASE_URL } from '../config.js'

export const { httpClient, setupHttpDefault } = createDefaultHttpClient(API_BASE_URL)
