import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default-react'

import { authConfig } from '../config.js'

export const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync(authConfig)
