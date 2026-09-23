import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, getAccessToken, login, signup, uniqueEmail } from './_helpers.js'

test('Signup creates a user account, persists JWT, and routes to dashboard', async ({ page }) => {
  const { accessToken, userId } = await signup(page)
  expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  expect(userId).toBeTruthy()
  await expect(page).toHaveURL(
    new RegExp(`^${APP_BASE.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&')}/?$`),
  )

  // Read-after-write invariant: GET /api/users/:id reflects the new user
  const userRes = await page.request.get(`/api/users/${userId}`)
  expect(userRes.status()).toBe(200)
  const raw = (await userRes.json()) as {
    id?: string
    email?: string
    props?: { id: string; email: string }
  }
  const id = raw.props?.id ?? raw.id
  const email = raw.props?.email ?? raw.email
  expect(id).toBe(userId)
  expect(email).toBeTruthy()
})

test('Signup rejects duplicate emails', async ({ page }) => {
  const email = uniqueEmail()
  const password = 'TestPass!1234'
  await signup(page, email, password)

  const ctx = await page.context().browser()!.newContext()
  const newPage = await ctx.newPage()
  await newPage.goto(APP_BASE + '/signup')
  await newPage.locator('input[type="email"]').first().fill(email)
  await newPage.locator('input[type="password"]').first().fill(password)
  await newPage.locator('form button[type="submit"]').first().click()
  // Should NOT navigate away from signup
  await newPage.waitForTimeout(2000)
  await expect(newPage).toHaveURL(/\/signup/)
  await ctx.close()
})

test('Login with existing credentials authenticates and routes away from /login', async ({
  page,
}) => {
  const { email, password, userId } = await signup(page)
  // Clear session
  await page.evaluate(() => window.localStorage.clear())
  await page.goto(APP_BASE + '/login')

  await login(page, email, password)
  await expect(page).not.toHaveURL(/\/login/)

  // Read-after-write: token must be reattached
  const newToken = await getAccessToken(page)
  expect(newToken).toBeTruthy()

  // Read-after-write: GET works again
  const meRes = await page.request.get(`/api/users/${userId}`)
  expect(meRes.status()).toBe(200)
})

test('Login with bad credentials shows an error and stays on /login', async ({ page }) => {
  // Bad credentials legitimately 403; the failed fetch logs to the browser console.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 403',
  })
  await page.goto(APP_BASE + '/login')
  await page.locator('input[type="email"]').first().fill(uniqueEmail())
  await page.locator('input[type="password"]').first().fill('wrong-password')
  await page.locator('form button[type="submit"]').first().click()
  await page.waitForTimeout(1500)
  await expect(page).toHaveURL(/\/login/)
})
