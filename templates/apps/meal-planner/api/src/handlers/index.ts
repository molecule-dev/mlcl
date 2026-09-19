import { Router } from 'express'

import groceryListRouter from './grocery-list.js'
import mealPlanRouter from './meal-plan.js'
import pantryRouter from './pantry.js'
import recipesRouter from './recipes.js'

const router = Router()

router.use('/recipes', recipesRouter)
router.use('/meal-plan', mealPlanRouter)
router.use('/grocery-list', groceryListRouter)
router.use('/pantry', pantryRouter)

export default router
