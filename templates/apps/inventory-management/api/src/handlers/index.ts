import { Router } from 'express'

import alerts from './alerts.js'
import dashboard from './dashboard.js'
import notifications from './notifications.js'
import orders from './orders.js'
import products from './products.js'
import reports from './reports.js'
import stock from './stock.js'
import transfers from './transfers.js'
import warehouses from './warehouses.js'

const router = Router()

router.use('/products', products)
router.use('/warehouses', warehouses)
router.use('/stock', stock)
router.use('/transfers', transfers)
router.use('/alerts', alerts)
router.use('/reports', reports)
router.use('/orders', orders)
router.use('/notifications', notifications)
router.use('/dashboard', dashboard)

export default router
