/**
 * Dashboard contract: a freshly-signed-up user lands on /dashboard,
 * sees the no-subscription onboarding view with real seeded plans
 * (Curator / Collector / Connoisseur), and clicking a plan navigates
 * to /boxes/:id where :id is a real DB plan.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, fetchPlans, signup } from './_helpers.js'

test('signup → /dashboard renders the no-subscription onboarding view', async ({ page }) => {
  await signup(page)
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByTestId('dashboard-onboarding')).toBeVisible()
})

test('dashboard onboarding lists the three seeded plans', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.waitForLoadState('networkidle')

  const plans = await fetchPlans(page, accessToken)
  expect(plans.length, 'at least three seeded plans').toBeGreaterThanOrEqual(3)

  // Each visible plan card shows the plan name and price.
  for (const plan of plans) {
    const card = page.getByTestId(`dashboard-plan-${plan.slug ?? plan.id}`)
    await expect(card).toBeVisible()
    await expect(card).toContainText(plan.name)
  }
})

test('clicking a dashboard plan card navigates to /boxes/:id (real plan id)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const plan = plans[0]
  await page.goto(APP_BASE + '/dashboard')
  await page.getByTestId(`dashboard-plan-${plan.slug ?? plan.id}`).click()
  await expect(page).toHaveURL(new RegExp(`/boxes/${plan.id}`))
})

test('dashboard "Browse all editions" CTA goes to /boxes', async ({ page }) => {
  await signup(page)
  await page.getByTestId('dashboard-onboarding-browse').click()
  await expect(page).toHaveURL(/\/boxes$/)
})
