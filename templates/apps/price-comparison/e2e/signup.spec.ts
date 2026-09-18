import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('display name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#name').fill('Avery Sift')
    await expect(page.locator('#name')).toHaveValue('Avery Sift')
  })

  test('email input accepts email', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#email').fill('avery@example.com')
    await expect(page.locator('#email')).toHaveValue('avery@example.com')
  })

  test('password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#password').fill('TestPass123!')
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  })

  test('mismatched confirm password blocks submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#name').fill('Avery')
    await page.locator('#email').fill(uniqueEmail('mismatch'))
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirm').fill('Different456!')
    await page
      .getByRole('button', { name: /create.*account/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('valid signup creates account and persists JWT', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      const { accessToken } = await signup(page, uniqueEmail('signup-ok'))
      expect(accessToken).toBeTruthy()
    })
    const post = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'POST /api/users created user').toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
  })

  test('"Sign in" footer link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
