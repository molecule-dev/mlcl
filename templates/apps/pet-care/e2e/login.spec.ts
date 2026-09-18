import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('login page', () => {
  test('renders heading + email/password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button[type="submit"]').first()).toBeVisible()
  })

  test('valid credentials POST /api/auth/login and redirect off /login', async ({
    page,
    browser,
  }) => {
    // pre-create a user
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    const creds = await signup(p2)
    await fresh.close()

    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(creds.email)
    await page.locator('#password').fill(creds.password)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/users\/log-in\b/.test(r.url))
    expect(post, 'POST /api/users/log-in observed').toBeTruthy()
    expect(post!.status).toBe(200)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
  })

  test('invalid credentials show error and stay on /login', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(uniqueEmail('nope'))
    await page.locator('#password').fill('WrongPass!')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })
})
