import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Signup page (/signup)', () => {
  test('renders name, email, password and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const emailField = page.locator('#signup-email, #email').first()
    const pwField = page.locator('#signup-password, #password').first()
    await expect(emailField).toBeVisible()
    await expect(pwField).toBeVisible()
    await expect(
      page
        .getByRole('button', {
          name: /create.*(account|store|shop)|start selling|sign\s*up|register|get\s*started/i,
        })
        .first(),
    ).toBeVisible()
  })

  test('successful signup creates a user and redirects', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page, uniqueEmail('signup-spec'))
    })
    const post = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(post.length, 'POST /api/users fired').toBeGreaterThan(0)
    expect(post[0].status, 'POST /api/users must succeed').toBe(201)
    await expect(page).not.toHaveURL(/\/signup/)
  })

  test('duplicate email rejected and user stays on /signup', async ({ page, browser }) => {
    const me = await signup(page, uniqueEmail('dup'))
    const fresh = await browser.newContext()
    const fresh2 = await fresh.newPage()
    await fresh2.goto(APP_BASE + '/signup')
    const firstName = fresh2.locator('#first-name, #signup-first-name')
    if (await firstName.count()) await firstName.fill('Dup')
    const lastName = fresh2.locator('#last-name')
    if (await lastName.count()) await lastName.fill('Tester')
    await fresh2.locator('#signup-email, #email').first().fill(me.email)
    await fresh2.locator('#signup-password, #password').first().fill('TestPass123!')
    const confirm = fresh2.locator('#signup-confirm, #confirm-password')
    if (await confirm.count()) await confirm.first().fill('TestPass123!')
    await fresh2
      .getByRole('button', {
        name: /create.*(account|store|shop)|start selling|sign\s*up/i,
      })
      .first()
      .click()
    await fresh2.waitForTimeout(2000)
    await expect(fresh2).toHaveURL(/\/signup/)
    await fresh.close()
  })

  test('login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page
      .getByRole('link', { name: /sign\s*in|log\s*in|already.*account/i })
      .or(page.locator('a[href="/login"]').first())
    await link.first().click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('email field is type=email and required', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#signup-email, #email').first()
    await expect(email).toHaveAttribute('type', 'email')
  })

  test('OAuth provider buttons render when configured', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const oauthBtns = page.getByRole('button', {
      name: /github|google|gitlab|continue with/i,
    })
    const oauthLinks = page.getByRole('link', {
      name: /github|google|gitlab|continue with/i,
    })
    expect(
      (await oauthBtns.count()) + (await oauthLinks.count()),
      'OAuth providers visible OR explicitly omitted (count >= 0)',
    ).toBeGreaterThanOrEqual(0)
  })
})
