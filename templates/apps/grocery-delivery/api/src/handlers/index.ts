import { Router } from 'express'

import cart from './cart.js'
import deliverySlots from './delivery-slots.js'
import lists from './lists.js'
import orders from './orders.js'
import products from './products.js'

const router = Router()

router.use('/products', products)
router.use('/cart', cart)
router.use('/orders', orders)
router.use('/delivery-slots', deliverySlots)
router.use('/lists', lists)

export default router
