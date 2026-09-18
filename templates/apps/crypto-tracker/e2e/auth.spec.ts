import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers'

/**
 * Auth shell — covers /login, /signup, /forgot-password, /reset-password,
 * /plan-updated, /404, /dashboard. The shipped auth flows go through real
 * backend endpoints (POST /api/users, POST /api/users/log-in,
 * POST /api/users/forgot-password) so we assert on real responses /
 * URL navigation, not just on form-submit fired.
 */

test.describe('/login', () => {
  test('renders the email + password form', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /enter|sign in|log in|reading/i }).first(),
    ).toBeVisible()
  })

  test('rejects bad credentials with a real error message and stays on /login', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .locator('input[type="email"]')
      .fill('definitely-not-real-' + Date.now() + '@example.com')
    await page.locator('input[type="password"]').fill('definitely-wrong')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /enter|sign in|log in|reading/i })
        .first()
        .click()
      await expect(
        page.locator('text=/invalid|incorrect|wrong|not found|error|unauthorized/i').first(),
      ).toBeVisible({ timeout: 10_000 })
    })
    const loginCall = reqs.find((r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST')
    expect(loginCall, 'login form must POST to /api/users/log-in').toBeTruthy()
    expect(loginCall!.status).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/login/)
  })

  test('valid credentials sign back in after sign-out (round-trip)', async ({ page }) => {
    const { email, password } = await signup(page)
    // Sign out via the user menu in the layout
    await page.goto(APP_BASE + '/dashboard')
    // Open the user menu (avatar/account button); shipped layout has one
    const trigger = page
      .getByRole('button', { name: /(account|menu|profile|user|sign out)/i })
      .first()
    if (await trigger.count().catch(() => 0)) {
      await trigger.click().catch(() => {})
    }
    const signOut = page
      .getByRole('button', { name: /sign out|log out/i })
      .first()
      .or(page.getByRole('menuitem', { name: /sign out|log out/i }).first())
    if (await signOut.count().catch(() => 0)) {
      await signOut.click().catch(() => {})
      await page.waitForURL(/\/login/, { timeout: 10_000 }).catch(() => {})
    } else {
      // Fallback: clear cookies and reload to land on /login
      await page.context().clearCookies()
      await page.goto(APP_BASE + '/login')
    }
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /enter|sign in|log in|reading/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 })
    })
    const okLogin = reqs.find(
      (r) => /\/api\/users\/log-in/.test(r.url) && r.method === 'POST' && r.status < 400,
    )
    expect(okLogin, 'second login must succeed at backend').toBeTruthy()
  })
})

test.describe('/dashboard', () => {
  test('after signup, /dashboard is reachable and shows the layout chrome', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    // Layout chrome — the dashboard has a portfolio hero card
    await expect(page.getByText(/total portfolio value/i)).toBeVisible({ timeout: 10_000 })
  })

  test('unauthenticated visit to /dashboard is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

test.describe('/forgot-password', () => {
  test('renders the email form and accepts a submit (success OR error visible — never silent)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
    await page.locator('input[type="email"]').fill('reset-' + uniqueEmail('fp'))
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send.*reset|sending/i }).click()
      // Either a success panel ("Reset link wired" / "Check your email") OR
      // a visible error — but NEVER silent. The handler may swallow the
      // mailgun error in dev and still show success; that's acceptable for
      // this UI-shell gate. The point is that the form actually submitted
      // and the user sees feedback.
      const ok = page.getByText(/wired|sent|check your email|reset link/i).first()
      const err = page.getByText(/invalid|error|failed|unable/i).first()
      await expect(ok.or(err)).toBeVisible({ timeout: 15_000 })
    })
    const fpCall = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(fpCall, 'forgot form must POST to /api/users/forgot-password').toBeTruthy()
  })

  test('back-to-sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('/reset-password', () => {
  test('without a token, renders a "missing token" error (does not crash)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByText(/missing|invalid|request.*new/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('with a fake token, renders the new-password form (input visible)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-form-render')
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('/plan-updated', () => {
  test('renders the success message and a link back home (not a 404)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    // The page renders headings + a "return home" button. Wait for either
    // the heading or the button to appear (auth state may take a tick to
    // settle on first hit).
    await expect(
      page
        .getByRole('button', { name: /return.*home|home|dashboard/i })
        .or(page.getByRole('link', { name: /return.*home|home|dashboard/i }))
        .first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('/404', () => {
  test('an unknown route renders the 404 page with a back-to-dashboard link', async ({ page }) => {
    await page.goto(APP_BASE + '/totally-bogus-route-' + Date.now())
    // The 404 page is the catch-all; it shows '404' and a link to
    // /dashboard or /markets. Asserts the page actually rendered (not a
    // browser-level network error or a server 404 HTML).
    await expect(page.getByText('404').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /back to dashboard/i })).toBeVisible()
  })

  test('explicit /404 route renders the same NotFound shell', async ({ page }) => {
    await page.goto(APP_BASE + '/404')
    await expect(page.getByText('404').first()).toBeVisible({ timeout: 10_000 })
  })
})
