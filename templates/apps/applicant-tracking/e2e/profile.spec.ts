import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('profile page', () => {
  test('renders Profile heading and required fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-name"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-role"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-save"]')).toBeVisible()
  })

  test('GET /api/profile + GET /api/profile/recent-hires fire on load', async ({ page }) => {
    await signup(page)
    const requests = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some((r) => r.method === 'GET' && /\/profile\b/.test(r.url) && r.status === 200),
    ).toBeTruthy()
    expect(
      requests.some(
        (r) => r.method === 'GET' && /\/profile\/recent-hires\b/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('Save persists changes — read-after-write reflects new display name', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(1000)
    const newName = `Iris Recruiter ${Date.now()}`
    const newRole = 'Sr. Recruiter'
    await page.locator('[data-mol-id="profile-name"]').fill(newName)
    await page.locator('[data-mol-id="profile-role"]').fill(newRole)
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-save"]').click()
      await page.waitForTimeout(1500)
    })
    expect(
      requests.some(
        (r) => r.method === 'PUT' && /\/profile\b/.test(r.url) && r.status >= 200 && r.status < 300,
      ),
    ).toBeTruthy()
    const after = await authedGet(page, '/profile')
    const data = (after as any).data ?? after
    expect(data.display_name).toBe(newName)
    expect(data.role).toBe(newRole)
  })

  test('Public-profile checkbox toggles and persists via PUT', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(1000)
    const before = await authedGet(page, '/profile')
    const beforeData = (before as any).data ?? before
    const beforePublic = !!(beforeData.public_profile ?? true)
    const checkbox = page.getByRole('checkbox').first()
    if (beforePublic) await checkbox.uncheck()
    else await checkbox.check()
    await page.locator('[data-mol-id="profile-save"]').click()
    await page.waitForTimeout(1500)
    const after = await authedGet(page, '/profile')
    const afterData = (after as any).data ?? after
    expect(!!afterData.public_profile).toBe(!beforePublic)
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
