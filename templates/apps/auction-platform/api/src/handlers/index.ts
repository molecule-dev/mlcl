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
