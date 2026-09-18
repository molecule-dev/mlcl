/**
 * Customize contract: a subscriber can exclude items from their next
 * box, the change persists in subscription.preferences.excludedItems
 * (read-after-write), and reload preserves the excluded selection.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  fetchMineSubscription,
  fetchPlans,
  signup,
} from './_helpers.js'

test('Customize page rejects users without an active subscription', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/customize')
  await expect(page.getByTestId('customize-no-sub')).toBeVisible()
})

test('Excluding an item via Customize UI persists in DB and survives reload', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  // Find a plan with at least 1 swap allowed
  const plan = plans.find((p) => p.max_customizations > 0 && p.included_items.length > 0)
  expect(plan, 'at least one plan with customization').toBeTruthy()

  const subRes = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plan!.id, paymentMethodId: 'manual', preferences: {} },
  })
  expect(subRes.status()).toBe(201)

  await page.goto(APP_BASE + '/customize')
  await expect(page.getByTestId('customize-items')).toBeVisible()

  // Exclude the first item
  const firstItemId = `${plan!.id}-item-0`
  await page.getByTestId(`customize-swap-${firstItemId}`).click()
  await page.getByTestId('customize-save').click()
  await expect(page.getByTestId('customize-feedback')).toBeVisible()

  // Read-after-write: subscription.preferences.excludedItems contains the toggled id
  const sub = await fetchMineSubscription(page, accessToken)
  const excluded =
    (sub?.preferences as { excludedItems?: string[] } | undefined)?.excludedItems ?? []
  expect(excluded).toContain(firstItemId)

  // Reload survives
  await page.reload()
  await expect(page.getByTestId('customize-items')).toBeVisible()
  await expect(page.getByTestId(`customize-swap-${firstItemId}`)).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('Customize disables further swaps once max_customizations is reached', async ({ page }) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  // Use Curator (max_customizations = 1)
  const plan = plans.find((p) => p.max_customizations === 1 && p.included_items.length >= 2)
  expect(plan, 'at least one plan with max_customizations=1').toBeTruthy()

  const subRes = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plan!.id, paymentMethodId: 'manual', preferences: {} },
  })
  expect(subRes.status()).toBe(201)

  await page.goto(APP_BASE + '/customize')
  await expect(page.getByTestId('customize-items')).toBeVisible()

  // Exclude first item — second item's swap button should now be disabled
  await page.getByTestId(`customize-swap-${plan!.id}-item-0`).click()
  await expect(page.getByTestId(`customize-swap-${plan!.id}-item-1`)).toBeDisabled()
})

test('Customize page shows tiers and a "Switch to this tier" CTA per non-current plan', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  const plan = plans[0]
  const subRes = await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plan.id, paymentMethodId: 'manual', preferences: {} },
  })
  expect(subRes.status()).toBe(201)

  await page.goto(APP_BASE + '/customize')
  for (const p of plans) {
    await expect(page.getByTestId(`customize-tier-${p.slug ?? p.id}`)).toBeVisible()
  }
  // Current plan's switch button is disabled
  await expect(page.getByTestId(`customize-switch-${plan.slug ?? plan.id}`)).toBeDisabled()
  // Other plans' switch buttons are enabled
  for (const p of plans.slice(1)) {
    await expect(page.getByTestId(`customize-switch-${p.slug ?? p.id}`)).toBeEnabled()
  }
})
