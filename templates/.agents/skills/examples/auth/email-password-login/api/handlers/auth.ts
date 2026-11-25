/**
 * Password-reset mount for an API that manages its own user routes.
 * Mount under `/users`. mlcl already generates this route for custom stacks
 * with the user resource and an email transport.
 */

import { Router } from 'express'

import { createRequestHandler } from '@molecule/api-resource'
import { createRequestHandlerMap } from '@molecule/api-resource-user'

const router = Router()
const { rateLimitAuth, resetPassword } = createRequestHandlerMap(createRequestHandler)

router.post('/reset-password', rateLimitAuth, resetPassword)

export default router
