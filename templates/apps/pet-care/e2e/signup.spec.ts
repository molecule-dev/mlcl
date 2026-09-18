import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders name + email + password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]').first()).toBeVisible()
  })

  test('submitting valid signup POSTs /api/auth/signup and lands on /dashboard', async ({
    page,
  }) => {
    const email = uniqueEmail('signup')
    await page.goto(APP_BASE + '/signup')
    await page.locator('#name').fill('New User')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\b/.test(r.url))
    expect(post, 'POST /api/users (signup) observed').toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
  })

  test('signup with empty email stays on /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#password').fill('TestPass123!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/signup/)
  })

  test('#name input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('#name')
    await name.fill('My Pretty Name')
    await expect(name).toHaveValue('My Pretty Name')
  })
})
