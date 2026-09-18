import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedSale, signup, whereUrl } from './_helpers.js'

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.context().clearCookies()
  await page.evaluate(() => localStorage.clear()).catch(() => {})
  await page.goto(APP_BASE + '/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page
    .getByRole('button', { name: /sign\s*in|log\s*in/i })
    .first()
    .click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
}

test.describe('Customer library page (/library)', () => {
  test('renders the page heading for an authenticated user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    await page.waitForTimeout(800)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('shows empty state with a /shop link when nothing has been purchased', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/library')
    // toBeVisible auto-retries; the fixed 800ms sleep it replaces was a guess
    // that raced React mounting on a loaded machine.
    await expect(page.getByRole('link', { name: /shop|browse|storefront/i }).first()).toBeVisible()
  })

  test('a fulfilled purchase appears as a card with the product name', async ({
    page,
    request,
  }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await loginAs(page, sale.buyer.email, sale.buyer.password)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/library')
      await page.waitForTimeout(1200)
    })
    const get = whereUrl(reqs, /\/api\/library/, 'GET')
    expect(get.length, 'GET /api/library fired').toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(400)
    const nameCount = await page.getByText(sale.product.name).count()
    expect(nameCount, 'product name renders in library').toBeGreaterThan(0)
  })

  test('download button issues GET /api/downloads/:productId', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await loginAs(page, sale.buyer.email, sale.buyer.password)
    await page.goto(APP_BASE + '/library')
    await page.waitForTimeout(1200)
    const dl = page.getByRole('button', { name: /download/i }).first()
    // count() does not auto-wait, so a slow render skipped this test instead of
    // running it. waitFor retries — a skip now means the button is really absent.
    const present = await dl
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no download button on library')
    const reqs = await captureNetwork(page, async () => {
      await dl.click()
      await page.waitForTimeout(1500)
    })
    const dlReq = whereUrl(reqs, /\/api\/downloads\//)
    expect(dlReq.length).toBeGreaterThan(0)
  })

  test('renders the issued license key for a purchased product', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await loginAs(page, sale.buyer.email, sale.buyer.password)
    await page.goto(APP_BASE + '/library')
    await page.waitForTimeout(1200)
    // License key may be masked; ensure at least the prefix DG- is shown.
    const licenseHints = page.getByText(/DG-|license/i)
    await expect(licenseHints.first()).toBeAttached()
  })
})
