/**
 * /signup — create-account page.
 *
 * Asserts: submit POSTs /api/users/ and lands on /library; mismatched
 * passwords are gated client-side (no POST fires + alert visible);
 * "Sign in" link routes to /login.
 *
 * captureNetwork() is used to confirm the POST behaviour on both
 * the happy and mismatch paths.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('matching-passwords submit POSTs /api/users/ and navigates to /library', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    const email = uniqueEmail('signup-spec')
    const password = 'TestPass123!'
    await page.locator('input#name').fill('Signup Spec')
    await page.locator('input#email').fill(email)
    await page.locator('input#password').fill(password)
    await page.locator('input#confirm').fill(password)
    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="signup-submit"]').click()
      await page.waitForURL(/\/library/, { timeout: 15_000 })
    })
    const post = calls.find(
      (c) => c.method === 'POST' && /\/api\/users\/?(?!login|forgot|reset)$/.test(c.url),
    )
    expect(post, 'expected POST /api/users/ on signup submit').toBeDefined()
    expect([200, 201]).toContain(post!.status)
  })

  test('mismatched passwords block the POST and surface an inline alert', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input#name').fill('Mismatch')
    await page.locator('input#email').fill(uniqueEmail('mismatch-spec'))
    await page.locator('input#password').fill('PasswordA1!')
    await page.locator('input#confirm').fill('PasswordB2!')

    const calls = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="signup-submit"]').click()
      await page.waitForTimeout(500)
    })
    const signupPost = calls.find((c) => c.method === 'POST' && /\/api\/users\/?$/.test(c.url))
    expect(signupPost, 'mismatched submit must NOT POST /api/users/').toBeUndefined()
    await expect(page.getByText(/Passwords don.+t match/i)).toBeVisible()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await page.waitForURL(/\/login/)
  })
})
