import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('Signup', () => {
  test('redirects to /dashboard and persists user identity', async ({ page }) => {
    const email = uniqueEmail('signup')
    const { accessToken, userId } = await signup(page, email)
    await expect(page).toHaveURL(/\/dashboard/)
    expect(accessToken).toBeTruthy()
    expect(userId).toBeTruthy()

    const me = await page.request.get(
      `${APP_BASE.replace(/:\d+/, ':' + (process.env.API_PORT || '4280'))}/api/users/me`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    )
    expect(me.status()).toBe(200)
    const body = await me.json()
    expect(body?.props?.email ?? body?.user?.email).toBe(email)
  })

  test('blocks duplicate email', async ({ page }) => {
    const email = uniqueEmail('dup')
    await signup(page, email)
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#signup-name').fill('Test User')
    await page.locator('input#signup-email').fill(email)
    await page.locator('input#signup-password').fill('TestPass!1234')
    // The duplicate POST 403s by design; the page surfaces it inline (role=alert).
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.locator('form button[type="submit"]').click()
    await expect(page.getByRole('alert')).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/signup/)
  })
})
