/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 */
import { Router } from 'express'

import generator from './generator.js'
import items from './items.js'
import passwordHistory from './password-history.js'
import recoveryKeys from './recovery-keys.js'
import security from './security.js'
import shares from './shares.js'
import twoFactor from './two-factor.js'
import vaults from './vaults.js'

const router = Router()

router.use('/vaults', vaults)
router.use('/items', items)
router.use('/generator', generator)
router.use('/shares', shares)
router.use('/security', security)
router.use('/two-factor', twoFactor)
router.use('/recovery-keys', recoveryKeys)
router.use('/password-history', passwordHistory)

export default router
