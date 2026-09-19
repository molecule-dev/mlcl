import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signupApi, uniqueEmail } from './_helpers.js'

test.describe('/login', () => {
  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill('desk@example.com')
    await expect(page.locator('#email')).toHaveValue('desk@example.com')
  })

  test('password input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.locator('#password').fill('TestPass123!')
    await expect(page.locator('#password')).toHaveValue('TestPass123!')
  })

  test('"Forgot?" link navigates to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('"Create an account" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page.getByRole('link', { name: /Create an account/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" submits credentials, observes POST /api/users/log-in, and lands away from /login', async ({
    browser,
    request,
  }) => {
    const email = uniqueEmail('login')
    const password = 'TestPass123!'
    await signupApi(request, email, password)

    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Sign in/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15_000 })
    })
    expect(page.url()).not.toMatch(/\/login/)
    expect(
      reqs.some((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST'),
      'POST /api/users/log-in must be observed',
    ).toBeTruthy()
    await ctx.close()
  })

  test('brand link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /Switchboard/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(APP_BASE.replace(/[/.]/g, '\\$&') + '/?$'))
  })
})
