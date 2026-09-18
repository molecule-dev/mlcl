import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, login, signup } from './_helpers.js'

test('login → home', async ({ page, browser }) => {
  // Create a user in a fresh context so this test is independent.
  const ctx = await browser.newContext()
  const p1 = await ctx.newPage()
  const { email, password } = await signup(p1)
  await ctx.close()

  const reqs = await captureNetwork(page, async () => {
    await login(page, email, password)
  })
  await expect(page).toHaveURL(/\/home/)

  const logIn = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
  expect(logIn, 'POST /api/users/log-in must have happened').toBeTruthy()
  expect(logIn!.status).toBeLessThan(300)

  // Session survives a reload.
  await page.reload()
  await expect(page).toHaveURL(/\/home/)
})

test('login with bad credentials surfaces an error', async ({ page }) => {
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill('nobody@example.com')
  await page.locator('input[type="password"]').first().fill('wrongPass!')
  await page
    .getByRole('button', { name: /sign in/i })
    .first()
    .click()
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/login/)
})
