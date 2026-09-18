import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('Forgot-password page (/forgot-password)', () => {
  test('Snagr brand link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: 'Snagr' }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('Email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel('Email address').fill('reset@example.com')
    await expect(page.getByLabel('Email address')).toHaveValue('reset@example.com')
  })

  test('Submit fires POST /api/users/forgot-password', async ({ page }) => {
    const email = uniqueEmail('forgot-spec')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.getByLabel('Email address').fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await page.waitForTimeout(1500)
    })
    const calls = reqs.filter(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(calls.length, 'POST /api/users/forgot-password fired').toBeGreaterThan(0)
    // Backend deliberately returns 200 for both known and unknown emails to avoid leaking
    // whether the email is registered (anti-enumeration). Accept 2xx.
    expect(
      calls.some((r) => r.status >= 200 && r.status < 300),
      'forgot-password returned 2xx',
    ).toBe(true)
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
