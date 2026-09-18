/**
 * Boxes catalog contract: /boxes lists every active subscription_plans
 * row, the search filters live, and box-detail loads the same plan
 * data via /api/plans/:id.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, fetchPlans, signup } from './_helpers.js'

test('/boxes renders one card per seeded plan', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.goto(APP_BASE + '/boxes')
  await expect(page.getByTestId('boxes-grid')).toBeVisible()
  for (const plan of plans) {
    await expect(page.getByTestId(`box-card-${plan.slug ?? plan.id}`)).toBeVisible()
  }
})

test('/boxes search input filters down to the matching plan', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const target = plans[0]
  await page.goto(APP_BASE + '/boxes')
  await expect(page.getByTestId('boxes-grid')).toBeVisible()
  await page.getByTestId('boxes-search').fill(target.name)
  await expect(page.getByTestId(`box-card-${target.slug ?? target.id}`)).toBeVisible()
  for (const other of plans.slice(1)) {
    await expect(page.getByTestId(`box-card-${other.slug ?? other.id}`)).toHaveCount(0)
  }
})

test('/boxes filter "available" hides current plan once subscribed', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const planNoStripe = plans.find((p) => !p.stripe_price_id) ?? plans[0]
  // Local subscribe (manual paymentMethodId means no Stripe call)
  const sub = await page.request.post(
    `http://localhost:${process.env.API_PORT ?? '4090'}/api/subscriptions`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      data: { planId: planNoStripe.id, paymentMethodId: 'manual', preferences: {} },
    },
  )
  expect(sub.status(), await sub.text()).toBe(201)

  await page.goto(APP_BASE + '/boxes')
  await page.getByTestId('boxes-filter-subscribed').click()
  await expect(page.getByTestId(`box-card-${planNoStripe.slug ?? planNoStripe.id}`)).toBeVisible()
  await page.getByTestId('boxes-filter-available').click()
  await expect(page.getByTestId(`box-card-${planNoStripe.slug ?? planNoStripe.id}`)).toHaveCount(0)
})

test('/boxes/:id renders the plan detail (name, price, items)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const plan = plans[0]
  await page.goto(APP_BASE + `/boxes/${plan.id}`)
  await expect(page.getByTestId('box-detail')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: plan.name })).toBeVisible()
  if (plan.included_items.length > 0) {
    await expect(page.getByTestId('box-detail-items')).toBeVisible()
  }
})

test('/boxes/:id for an unknown id renders the missing state', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/boxes/00000000-0000-0000-0000-000000000000')
  await expect(page.getByTestId('box-detail-missing')).toBeVisible()
})
