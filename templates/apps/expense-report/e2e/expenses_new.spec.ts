import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/expenses/new page', () => {
  test('Recoup brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('link', { name: /recoup/i }).first()).toBeVisible()
  })

  test('Sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('Sidebar Expenses link routes to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/expenses"]').first().click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Sidebar Reports link routes to /reports', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('aside a[href="/reports"], nav a[href="/reports"]').first().click()
    await page.waitForURL(/\/reports($|\?|\/)/, { timeout: 5000 })
  })

  test('Sidebar Report Library link routes to /reports/list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/reports/list"]').first().click()
    await page.waitForURL('**/reports/list', { timeout: 5000 })
  })

  test('Sidebar Approvals link routes to /approvals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/approvals"]').first().click()
    await page.waitForURL('**/approvals', { timeout: 5000 })
  })

  test('Activity link routes to /notifications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/notifications"]').first().click()
    await page.waitForURL('**/notifications', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('Open user menu opens a menu with sign out', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const menu = page.getByRole('button', { name: /open user menu|account|profile/i }).first()
    await menu.click()
    await expect(page.getByRole('button', { name: /sign\s*out|log\s*out/i }).first()).toBeVisible({
      timeout: 4000,
    })
  })

  test('Merchant textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const merchant = page.locator('#merchant')
    await merchant.fill('Lufthansa')
    expect(await merchant.inputValue()).toBe('Lufthansa')
  })

  test('Date textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const date = page.locator('#date')
    await date.fill('2026-05-08')
    expect(await date.inputValue()).toBe('2026-05-08')
  })

  test('Meals category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^meals$/i })
      .first()
      .click()
  })

  test('Travel category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^travel$/i })
      .first()
      .click()
  })

  test('Lodging category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^lodging$/i })
      .first()
      .click()
  })

  test('Transport category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^transport$/i })
      .first()
      .click()
  })

  test('Supplies category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^supplies$/i })
      .first()
      .click()
  })

  test('Software category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^software$/i })
      .first()
      .click()
  })

  test('Client meals category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /client meals/i })
      .first()
      .click()
  })

  test('Other category button selects the category', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^other$/i })
      .first()
      .click()
  })

  test('Notes textbox accepts user input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    const notes = page.locator('#description, textarea[id="description"]').first()
    await notes.fill('Lunch with client')
    expect(await notes.inputValue()).toBe('Lunch with client')
  })

  test('Drop receipt control is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.locator('input[type="file"]').first()).toBeAttached()
  })

  test('Cancel button routes back to /expenses', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page
      .getByRole('button', { name: /^cancel$/i })
      .first()
      .click()
    await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 5000 })
  })

  test('Receipt upload via /api/receipts returns a public URL the form can attach', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // 1x1 transparent PNG (real bytes — exercises image-sharp resize + S3 upload)
    const tinyPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    const res = await page.request.post('/api/receipts', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        image_base64: tinyPng,
        mime_type: 'image/png',
        filename: 'receipt-spec.png',
      },
      failOnStatusCode: false,
    })
    expect(res.status()).toBeLessThan(400)
    const body = (await res.json()) as { url?: string; location?: string; id?: string }
    expect(body.url || body.location, 'public URL returned').toBeTruthy()
  })

  test('Save expense posts to /api/expenses and routes to /expenses', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/expenses/new')
      // Settle first. The auth hook persists the JWT in a microtask after React
      // routes (see signup() in _helpers), and the remount that follows resets
      // the form's useState — the merchant field typed before it came back
      // empty, so Save had nothing to submit and the page never navigated.
      await page.waitForLoadState('networkidle')
      await expect(page.locator('#merchant')).toBeVisible()
      await page.locator('#merchant').fill('Spec Cafe')
      await page.locator('#amount').fill('14.25')
      await page.locator('#date').fill(new Date().toISOString().slice(0, 10))
      // Prove the values survived; a silent reset is what made this look like a
      // routing failure rather than an empty form.
      await expect(page.locator('#merchant')).toHaveValue('Spec Cafe')
      await page
        .getByRole('button', { name: /save expense/i })
        .first()
        .click()
      await page.waitForURL(/\/expenses(?!\/new)/, { timeout: 10000 })
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/expenses(\?|$)/.test(r.url))
    expect(post, 'POST /api/expenses').toBeTruthy()
    expect(post?.status).toBeLessThan(400)
  })

  test('About Recoup link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('link', { name: /about\s*recoup/i }).first()).toBeVisible()
  })

  test('Privacy Policy footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('button', { name: /privacy/i }).first()).toBeVisible()
  })

  test('Terms of Service footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('button', { name: /terms/i }).first()).toBeVisible()
  })

  test('Language footer button is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
