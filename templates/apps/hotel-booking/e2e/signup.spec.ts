import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('first name input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#firstName').fill('Auberge')
    await expect(page.locator('#firstName')).toHaveValue('Auberge')
  })

  test('last name input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#lastName').fill('Tester')
    await expect(page.locator('#lastName')).toHaveValue('Tester')
  })

  test('email input accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#email').fill('walker@example.com')
    await expect(page.locator('#email')).toHaveValue('walker@example.com')
  })

  test('password and confirm-password inputs accept values', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('TestPass123!')
    await expect(page.locator('#password')).toHaveValue('TestPass123!')
    await expect(page.locator('#confirmPassword')).toHaveValue('TestPass123!')
  })

  test('mismatched passwords surface a "Passwords don\'t match." error', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('#firstName').fill('Walk')
    await page.locator('#lastName').fill('Tester')
    await page.locator('#email').fill(uniqueEmail('mm'))
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('Different456!')
    await page.getByRole('button', { name: /Create account/i }).click()
    await expect(page.getByText(/Passwords don't match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Create account" submits POST /api/users and redirects away from /signup', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup')
    await page.locator('#firstName').fill('Walk')
    await page.locator('#lastName').fill('Tester')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill('TestPass123!')
    await page.locator('#confirmPassword').fill('TestPass123!')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15_000 })
    })
    expect(page.url()).not.toMatch(/\/signup/)
    expect(
      reqs.some((r) => r.url.endsWith('/api/users') && r.method === 'POST' && r.status === 201),
      'POST /api/users (201) must be observed',
    ).toBeTruthy()
  })

  test('"Sign in" footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /Sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
