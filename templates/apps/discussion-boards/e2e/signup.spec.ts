import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/signup (Signup form)', () => {
  test('display name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const name = page.locator('#signup-name')
    await name.fill('Stoa Newcomer')
    await expect(name).toHaveValue('Stoa Newcomer')
  })

  test('email input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const email = page.locator('#signup-email')
    await email.fill('newcomer@example.com')
    await expect(email).toHaveValue('newcomer@example.com')
  })

  test('password input accepts text (min 8)', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const pw = page.locator('#signup-password')
    await pw.fill('TestPass123!')
    await expect(pw).toHaveValue('TestPass123!')
  })

  test('confirm password input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const cp = page.locator('#signup-confirm')
    await cp.fill('TestPass123!')
    await expect(cp).toHaveValue('TestPass123!')
  })

  test('Create account submits POST /api/users and lands the user at /c', async ({ page }) => {
    const email = uniqueEmail('signup-spec')
    const password = 'TestPass123!'
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-name').fill('Signup Spec User')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill(password)
    await page.locator('#signup-confirm').fill(password)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await expect(page).toHaveURL(/\/c$/, { timeout: 15_000 })
    })
    const usersCall = reqs.find((r) => /\/api\/users$/.test(r.url) && r.method === 'POST')
    expect(usersCall, 'POST /api/users must have fired').toBeTruthy()
    expect(usersCall!.status).toBe(201)
  })

  test('Sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page
      .getByRole('link', { name: /Sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('Mismatched passwords block submit and surface an inline error', async ({ page }) => {
    const email = uniqueEmail('signup-mm')
    await page.goto(APP_BASE + '/signup')
    await page.locator('#signup-name').fill('Mismatch User')
    await page.locator('#signup-email').fill(email)
    await page.locator('#signup-password').fill('TestPass123!')
    await page.locator('#signup-confirm').fill('Different123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForTimeout(500)
    })
    // Inline mismatch error visible
    await expect(page.getByText(/Passwords do not match/i)).toBeVisible()
    // No POST /api/users went through
    const usersCall = reqs.find((r) => /\/api\/users$/.test(r.url) && r.method === 'POST')
    expect(usersCall, 'no POST /api/users on mismatch').toBeFalsy()
    // Account was NOT created — confirm by trying to sign in
    const login = await page.request.post(API_BASE + '/users/login', {
      data: { email, password: 'TestPass123!' },
    })
    expect(login.status()).toBeGreaterThanOrEqual(400)
  })
})
