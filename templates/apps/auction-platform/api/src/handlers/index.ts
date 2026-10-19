/**
 * Feature handler aggregator. Every router below is mounted at the prefix on its
 * `router.use('/x', router)` line, and the paths inside it are RELATIVE to that mount:
 * `router.post('/users', …)` in a router mounted at `/users` answers at `/users/users`,
 * not `/users` — declare `router.post('/', …)` there, or change its mount line here.
 * Everything here is served under `/api`: a route the client or a suite calls at
 * `/api/users` is declared as `/users`. Do not add a prefix of your own.
 */
import { Router } from 'express'

import auctions from './auctions.js'
import authResetPassword from './auth-reset-password.js'
import bids from './bids.js'
import checkout from './checkout.js'
import listings from './listings.js'
import me from './me.js'
import myBids from './my-bids.js'
import notifications from './notifications.js'
import seller from './seller.js'
import sellers from './sellers.js'
import watchlist from './watchlist.js'

const router = Router()

router.use('/auctions', auctions)
router.use('/bids', bids)
router.use('/checkout', checkout)
router.use('/listings', listings)
router.use('/me', me)
router.use('/my-bids', myBids)
router.use('/notifications', notifications)
router.use('/seller', seller)
router.use('/sellers', sellers)
router.use('/users', authResetPassword)
router.use('/watchlist', watchlist)

export default router
