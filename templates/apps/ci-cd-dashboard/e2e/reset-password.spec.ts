import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders email + token + new pw + confirm pw + submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByLabel(/Reset token/i)).toBeVisible()
    await expect(page.getByLabel(/^New password$/i)).toBeVisible()
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Reset password/i })).toBeVisible()
  })

  test('pre-fills email + token from URL params', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=joe%40x.com&token=ABC123')
    await expect(page.getByLabel(/^Email$/i)).toHaveValue('joe@x.com')
    await expect(page.getByLabel(/Reset token/i)).toHaveValue('ABC123')
  })

  test('mismatched passwords show inline error and do not submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=joe%40x.com&token=ABC123')
    await page.getByLabel(/^New password$/i).fill('Pass1234!')
    await page.getByLabel(/Confirm password/i).fill('Different!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForTimeout(800)
    })
    const post = whereUrl(reqs, /\/api\/users\/reset-password/, 'POST')
    expect(post.length, 'should NOT POST when passwords mismatch').toBe(0)
    await expect(page.locator('[role="alert"]').first()).toBeVisible()
  })

  test('invalid token submits but stays on /reset-password (server rejects)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=nobody%40x.com&token=invalid-token')
    await page.getByLabel(/^New password$/i).fill('TestPass123!')
    await page.getByLabel(/Confirm password/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      await page.waitForTimeout(2500)
    })
    // The reset-password POST endpoint can vary across deploys — accept any POST
    // whose path contains "password" + "reset" or "confirm". The behavioural
    // invariant that matters is: invalid token must NOT redirect into the app.
    const post = reqs.filter(
      (r) =>
        r.method === 'POST' &&
        (/password.*reset|reset.*password|password.*confirm/i.test(r.url) ||
          /\/api\/users\/sessions/i.test(r.url)),
    )
    expect(post.length, 'a reset-related POST fired').toBeGreaterThan(0)
    await page.waitForTimeout(500)
    // Critical: invalid token must never redirect into the app
    await expect(page).not.toHaveURL(/\/pipelines/)
  })

  test('Back to sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
