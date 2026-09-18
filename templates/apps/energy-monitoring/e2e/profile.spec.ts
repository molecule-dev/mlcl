import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMe, signup } from './_helpers.js'

test.describe('Profile /profile', () => {
  test('loads householdSize/goalKwhPerMonth from /api/me', async ({ page }) => {
    const { accessToken } = await signup(page)
    const me = await getMe(page, accessToken)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('#profile-household-size')).toHaveValue(String(me.householdSize))
    await expect(page.locator('#profile-goal-kwh')).toHaveValue(String(me.goalKwhPerMonth))
  })

  test('save persists across reload AND in /api/me (read-after-write)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    await page.locator('#profile-household-size').fill('7')
    await page.locator('#profile-goal-kwh').fill('1234')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-form"] button[type="submit"]').first().click()
      await expect(page.locator('[data-mol-id="profile-saved"]')).toBeVisible({ timeout: 10000 })
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/me(\?|$)/.test(r.url))
    expect(patch, 'expected PATCH /api/me').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)

    const after = await getMe(page, accessToken)
    expect(after.householdSize).toBe(7)
    expect(after.goalKwhPerMonth).toBe(1234)

    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('#profile-household-size')).toHaveValue('7')
    await expect(page.locator('#profile-goal-kwh')).toHaveValue('1234')
  })

  test('invalid household size shows an error and does NOT call /api/me', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})

    await page.locator('#profile-household-size').fill('0')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-form"] button[type="submit"]').first().click()
      await page.waitForTimeout(800)
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/me/.test(r.url))
    expect(patch, 'PATCH /api/me should NOT be called for invalid input').toBeUndefined()
    await expect(page.locator('[data-mol-id="profile-error"]')).toBeVisible()
  })

  test('signed-in identity (email) appears on the hero', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    await expect(page.locator('main, [data-mol-id="profile-page"]').first()).toContainText(email)
  })
})
