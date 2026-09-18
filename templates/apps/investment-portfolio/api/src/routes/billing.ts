import { createBillingRouter } from '@molecule/api-bonds-default-express'

import {
  getPricingTiers,
  type InvestmentPortfolioLimits,
  investmentPortfolioPlanKeys,
} from '../tiers.js'

export default createBillingRouter<InvestmentPortfolioLimits>({
  getPricingTiers,
  planKeys: investmentPortfolioPlanKeys,
})
