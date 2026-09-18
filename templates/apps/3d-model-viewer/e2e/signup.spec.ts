import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup (Signup)', () => {
  test('First-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#firstName').fill('Test')
    await expect(page.locator('input#firstName')).toHaveValue('Test')
  })

  test('Last-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#lastName').fill('User')
    await expect(page.locator('input#lastName')).toHaveValue('User')
  })

  test('Email input accepts a typed address', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup-typed')
    await page.locator('input#email').fill(email)
    await expect(page.locator('input#email')).toHaveValue(email)
  })

  test('Submit creates a user and navigates away from /signup', async ({ page }) => {
    const email = uniqueEmail('signup-page')
    await page.goto(APP_BASE + '/signup')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#firstName').fill('Test')
      await page.locator('input#lastName').fill('User')
      await page.locator('input#email').fill(email)
      await page.locator('input#password').fill('TestPass123!')
      await page.locator('input#confirmPassword').fill('TestPass123!')
      await page
        .getByRole('button', { name: /create\s*account/i })
        .first()
        .click()
      await page.waitForURL((u) => !u.pathname.includes('/signup'), { timeout: 15_000 })
    })
    const post = reqs.find((r) => /\/api\/users(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/users fired').toBeTruthy()
    expect(post!.status, 'signup 2xx').toBeLessThan(300)
  })
})
