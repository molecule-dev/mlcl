/**
 * /signup — landing form, validation, success path, footer/copyright.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAccessToken, uniqueEmail } from './_helpers.js'

test.describe('signup page', () => {
  test('renders the signup form with email + password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.locator('input#signup-email, input[type="email"]').first()).toBeVisible()
    await expect(
      page.locator('input#signup-password, input[type="password"]').first(),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create\s*account|sign\s*up/i }).first(),
    ).toBeVisible()
  })

  test('signup with valid credentials lands off /signup and persists token', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    // Wait for the form to mount before counting. count() is a one-shot read
    // with no auto-waiting, so it can run against a still-empty React root,
    // return 0, and silently skip the fill below — the form then will not
    // submit and the failure surfaces as a missing request, not a missing field.
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
    const email = uniqueEmail('signup-good')
    const nameInput = page.locator('input[type="text"]').first()
    if (await nameInput.count()) await nameInput.fill('Signup Tester')
    await page.locator('input[type="email"]').first().fill(email)
    const pwInputs = page.locator('input[type="password"]')
    const pwCount = await pwInputs.count()
    for (let i = 0; i < pwCount; i++) {
      await pwInputs.nth(i).fill('TestPass123!')
    }

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /create\s*account|sign\s*up/i })
        .first()
        .click()
      await expect(page).not.toHaveURL(/\/signup/, { timeout: 20000 })
    })

    const created = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(created?.status, 'POST /api/users should succeed').toBeLessThan(400)

    const token = await getAccessToken(page)
    expect(token, 'JWT bearer should be present after signup').toBeTruthy()
  })

  test('footer copyright resolves placeholders (no raw {{tagline}}/{{company}})', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/signup')
    // One-shot innerText() sampled a pre-paint (empty) body — see privacy.spec.ts.
    // The year must literally appear in the footer; asserting that first also
    // waits for the render, so the placeholder check below sees the real DOM.
    const body = page.locator('body')
    await expect(body).toContainText(/\d{4}/)
    expect(await body.innerText()).not.toMatch(/\{\{\s*(company|tagline|year)\s*\}\}/i)
  })

  test('"Sign in" link points to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const link = page.locator('a[href="/login"]').first()
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/login')
  })

  test('full-name input accepts text', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    const nameInput = page.locator('input[type="text"]').first()
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Spec Tester Persona')
    await expect(nameInput).toHaveValue('Spec Tester Persona')
  })
})
