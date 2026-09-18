import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const calculateSchema = z.object({
  home_price: z.number().positive(),
  down_payment_percent: z.number().min(0).max(100).optional().default(20),
  interest_rate: z.number().min(0).max(30),
  loan_term_years: z.number().int().min(1).max(50).optional().default(30),
  property_tax_rate: z.number().min(0).optional().default(1.1),
  insurance_annual: z.number().min(0).optional().default(1200),
})

// ---------------------------------------------------------------------------
// POST /calculate — Calculate mortgage
// ---------------------------------------------------------------------------

router.post('/calculate', validateBody(calculateSchema), async (req: Request, res: Response) => {
  try {
    const {
      home_price,
      down_payment_percent,
      interest_rate,
      loan_term_years,
      property_tax_rate,
      insurance_annual,
    } = req.body as z.infer<typeof calculateSchema>

    const principal = home_price * (1 - down_payment_percent / 100)
    const monthlyRate = interest_rate / 100 / 12
    const numPayments = loan_term_years * 12

    const monthlyMortgage =
      monthlyRate > 0
        ? (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
        : principal / numPayments

    const monthlyTax = (home_price * property_tax_rate) / 100 / 12
    const monthlyInsurance = insurance_annual / 12
    const totalMonthly = monthlyMortgage + monthlyTax + monthlyInsurance
    const totalCost = totalMonthly * numPayments

    res.json({
      monthly_payment: Math.round(totalMonthly * 100) / 100,
      principal_and_interest: Math.round(monthlyMortgage * 100) / 100,
      property_tax: Math.round(monthlyTax * 100) / 100,
      insurance: Math.round(monthlyInsurance * 100) / 100,
      down_payment: Math.round((home_price * down_payment_percent) / 100),
      loan_amount: Math.round(principal),
      total_cost: Math.round(totalCost * 100) / 100,
    })
  } catch (error) {
    logger.error('mortgage.calculate', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
