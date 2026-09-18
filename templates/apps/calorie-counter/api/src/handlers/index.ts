import { Router } from 'express'

import diaryRouter from './diary.js'
import foodsRouter from './foods.js'
import goalsRouter from './goals.js'
import mealsRouter from './meals.js'
import notificationPreferencesRouter from './notification-preferences.js'
import nutritionRouter from './nutrition.js'
import weightRouter from './weight.js'

const router = Router()

router.use('/foods', foodsRouter)
router.use('/meals', mealsRouter)
router.use('/diary', diaryRouter)
router.use('/goals', goalsRouter)
router.use('/nutrition', nutritionRouter)
router.use('/weight', weightRouter)
router.use('/notification-preferences', notificationPreferencesRouter)

export default router
