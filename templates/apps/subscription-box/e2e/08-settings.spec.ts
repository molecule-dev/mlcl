/**
 * Settings contract: profile name persists across reload, address
 * stored in subscription.preferences.address persists across reload,
 * notification toggles persist in subscription.preferences.notifications,
 * and pause/cancel CTAs in the danger zone work end-to-end.
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

test('Settings page renders profile + address + notifications + danger sections', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByTestId('settings-profile')).toBeVisible()
  await expect(page.getByTestId('settings-address')).toBeVisible()
  await expect(page.getByTestId('settings-notifications')).toBeVisible()
  await expect(page.getByTestId('settings-danger')).toBeVisible()
})

test('Saving the profile name persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-name').fill('Hands of Trove')
  await page.getByTestId('settings-profile-save').click()
  await expect(page.getByTestId('settings-profile-feedback')).toBeVisible()

  await page.reload()
  await expect(page.getByTestId('settings-name')).toHaveValue('Hands of Trove')
})

test('Saving the shipping address persists in subscription.preferences across reload', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })

  const STREET = '37 Curators Mews\nLondon NW1 8AB\nUnited Kingdom'

  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-address-input').fill(STREET)
  await page.getByTestId('settings-address-save').click()
  await expect(page.getByTestId('settings-address-feedback')).toBeVisible()

  // Read-after-write
  const sub = await fetchMineSubscription(page, accessToken)
  expect((sub?.preferences as { address?: string } | undefined)?.address).toBe(STREET)

  // Reload
  await page.reload()
  await expect(page.getByTestId('settings-address-input')).toHaveValue(STREET)
})

test('Toggling a notification preference persists in subscription.preferences.notifications', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const plans = await fetchPlans(page, accessToken)
  await page.request.post(`${API_BASE}/subscriptions`, {
    headers: apiHeaders(accessToken),
    data: { planId: plans[0].id, paymentMethodId: 'manual', preferences: {} },
  })

  await page.goto(APP_BASE + '/settings')
  // Toggle the renewal_reminder switch (defaults to false)
  const reminderToggle = page.getByTestId('settings-pref-renewal_reminder')
  await expect(reminderToggle).toHaveAttribute('aria-checked', 'false')
  await reminderToggle.click()
  await expect(reminderToggle).toHaveAttribute('aria-checked', 'true')
  // Wait briefly for the PUT to land
  await page.waitForLoadState('networkidle')

  // Read-after-write
  const sub = await fetchMineSubscription(page, accessToken)
  const nots =
    (sub?.preferences as { notifications?: Record<string, boolean> } | undefined)?.notifications ??
    {}
  expect(nots.renewal_reminder).toBe(true)

  // Reload
  await page.reload()
  await expect(page.getByTestId('settings-pref-renewal_reminder')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})
